const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};

function createEmptyRoom() {
    return {
        sessionTitle: "",
        running: false,
        startTimestamp: null,
        currentSectionIdx: 0,
        sections: [],
        speakers: [],
        idx: 0,
        users: {}
    };
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", ({ roomId, name, role }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = createEmptyRoom();
        }

        rooms[roomId].users[socket.id] = {
            id: socket.id,
            name,
            role
        };

        io.to(roomId).emit("state_update", rooms[roomId]);
    });
    socket.on("start_timer", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        if (room.running) return;
        room.running = true;
        room.startTimestamp = Date.now();

        io.to(roomId).emit("state_update", room);
    });

    socket.on("pause_timer", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        if (room.running) {
            const elapsed = Date.now() - room.startTimestamp;
            const currentSpeaker = room.speakers[room.idx];

            if (currentSpeaker) {
                currentSpeaker.remainingMs = Math.max(
                    0,
                    currentSpeaker.remainingMs - elapsed
                );
            }

            room.running = false;
            room.startTimestamp = null;
        }

        io.to(roomId).emit("state_update", room);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        for (const roomId in rooms) {
            if (rooms[roomId].users[socket.id]) {
                delete rooms[roomId].users[socket.id];
                io.to(roomId).emit("state_update", rooms[roomId]);
            }
        }
    });
    socket.on("set_speakers", ({ roomId, speakers }) => {
        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        room.speakers = speakers.map(name => ({
            name,
            remainingMs: 5 * 60 * 1000
        }));

        room.idx = 0;

        io.to(roomId).emit("state_update", room);
    });
    socket.on("next_speaker", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        // If running, freeze current speaker time
        if (room.running) {
            const elapsed = Date.now() - room.startTimestamp;
            const currentSpeaker = room.speakers[room.idx];

            if (currentSpeaker) {
                currentSpeaker.remainingMs = Math.max(
                    0,
                    currentSpeaker.remainingMs - elapsed
                );
            }
        }
        if (!room.speakers.length) return;
        // Move to next speaker
        room.idx = (room.idx + 1) % room.speakers.length;

        // Reset timer start if still running
        if (room.running) {
            room.startTimestamp = Date.now();
        }

        io.to(roomId).emit("state_update", room);
    });
    socket.on("gift_time", ({ roomId, amountMs }) => {
        const room = rooms[roomId];
        if (!room) return;

        const giver = room.users[socket.id];
        if (!giver) return;

        if (!room.speakers.length) return;

        const currentSpeaker = room.speakers[room.idx];
        if (!currentSpeaker) return;

        // Default gift = 60 seconds if not provided
        const giftAmount = amountMs || 60000;

        currentSpeaker.remainingMs += giftAmount;

        io.to(roomId).emit("state_update", room);
    });
});

/* ========== Start Server ========== */
server.listen(5000, () => {
    console.log("Server running on port 5000");
});