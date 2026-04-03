const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const { AccessToken } = require('livekit-server-sdk');

app.get("/get-token", async (req, res) => {

    const { room, username } = req.query;

    const at = new AccessToken(
        "APIxP5LaxVeW5SW",
        "MSNoyoIcoOP9ArC0RUh9Bjab4OUJMKKPkZ4MGfTVbHB",
        { identity: username }
    );

    at.addGrant({
        roomJoin: true,
        room: room
    });
    const token = await at.toJwt();
    res.send({ token });
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

function freezeCurrentSpeaker(room) {
    if (!room.running) return;

    const elapsed = Date.now() - room.startTimestamp;
    const currentSpeaker = room.speakers[room.idx];

    if (currentSpeaker) {
        currentSpeaker.remainingMs = Math.max(
            0,
            currentSpeaker.remainingMs - elapsed
        );
    }

    room.startTimestamp = null;
    room.running = false;
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    /* JOIN ROOM */

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
        const existingHost = Object.values(rooms[roomId].users)
            .find(u => u.role === "host");

        if (role === "host" && existingHost) {
            role = "viewer";
        }
        io.to(roomId).emit("state_update", rooms[roomId]);
    });

    /* SET SPEAKERS */

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

    /* START TIMER */

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

    /* PAUSE TIMER */

    socket.on("pause_timer", ({ roomId }) => {

        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        freezeCurrentSpeaker(room);

        io.to(roomId).emit("state_update", room);
    });

    /* NEXT SPEAKER */

    socket.on("next_speaker", ({ roomId }) => {

        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        if (!room.speakers.length) return;

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

        room.idx = (room.idx + 1) % room.speakers.length;

        if (room.running) {
            room.startTimestamp = Date.now();
        }

        io.to(roomId).emit("state_update", room);
    });

    /* GIFT TIME */

    socket.on("gift_time", ({ roomId, amountMs }) => {

        const room = rooms[roomId];
        if (!room) return;

        const giver = room.users[socket.id];
        if (!giver) return;

        if (!room.speakers.length) return;

        const currentSpeaker = room.speakers[room.idx];
        if (!currentSpeaker) return;

        const giftAmount = amountMs || 60000;

        currentSpeaker.remainingMs += giftAmount;

        io.to(roomId).emit("state_update", room);
    });

    /* RESET SESSION */

    socket.on("reset_session", ({ roomId }) => {

        const room = rooms[roomId];
        if (!room) return;

        const user = room.users[socket.id];
        if (!user || user.role !== "host") return;

        rooms[roomId] = createEmptyRoom();

        io.to(roomId).emit("state_update", rooms[roomId]);
    });

    /* SET SESSION TITLE */

    socket.on("set_session_title", ({ roomId, title }) => {

        const room = rooms[roomId];
        if (!room) return;

        room.sessionTitle = title;

        io.to(roomId).emit("state_update", room);
    });

    /* DISCONNECT */

    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);

        for (const roomId in rooms) {

            if (rooms[roomId].users[socket.id]) {

                delete rooms[roomId].users[socket.id];

                io.to(roomId).emit("state_update", rooms[roomId]);
            }
        }
    });

});

/* START SERVER */

server.listen(5000, () => {
    console.log("Server running on port 5000");
});