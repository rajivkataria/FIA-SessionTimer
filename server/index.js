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
const io = new Server(server, { cors: { origin: "*" } });

const { AccessToken } = require("livekit-server-sdk");

app.get("/get-token", async (req, res) => {
    const { room, username } = req.query;
    const at = new AccessToken(
        "APIxP5LaxVeW5SW",
        "MSNoyoIcoOP9ArC0RUh9Bjab4OUJMKKPkZ4MGfTVbHB",
        { identity: username }
    );
    at.addGrant({ roomJoin: true, room });
    const token = await at.toJwt();
    res.send({ token });
});

/* ---- ROOM STATE ---- */

const rooms = {};
const roomTimers = {};

function createEmptyRoom() {
    return {
        sessionTitle: "",
        sessionActive: false,
        speakers: [],        // [{ name, remainingMs, totalMs }]
        users: {},           // { socketId: { id, name, role } }
        activeSpeaker: null,
        lastTick: null,
        _silenceTimeout: null,
        config: { timePerSpeakerMs: 5 * 60 * 1000 },
    };
}

function publicState(room) {
    return {
        sessionTitle: room.sessionTitle,
        sessionActive: room.sessionActive,
        speakers: room.speakers.map((s) => ({ ...s })),
        users: Object.values(room.users).map((u) => ({ name: u.name, role: u.role })),
        activeSpeaker: room.activeSpeaker,
        config: { ...room.config },
    };
}

function broadcast(roomId) {
    const room = rooms[roomId];
    if (room) io.to(roomId).emit("state_update", publicState(room));
}

/* ---- SERVER-SIDE TIMER ---- */

function startRoomTimer(roomId) {
    if (roomTimers[roomId]) return;
    if (rooms[roomId]) rooms[roomId].lastTick = Date.now();

    roomTimers[roomId] = setInterval(() => {
        const room = rooms[roomId];
        if (!room) { stopRoomTimer(roomId); return; }
        if (!room.sessionActive) return;

        const now = Date.now();
        const elapsed = now - (room.lastTick || now);
        room.lastTick = now;

        if (room.activeSpeaker) {
            const sp = room.speakers.find((s) => s.name === room.activeSpeaker);
            if (sp) sp.remainingMs = Math.max(-60000, sp.remainingMs - elapsed);
        }

        broadcast(roomId);
    }, 200);
}

function stopRoomTimer(roomId) {
    if (roomTimers[roomId]) {
        clearInterval(roomTimers[roomId]);
        delete roomTimers[roomId];
    }
}

/* ---- SOCKET HANDLERS ---- */

io.on("connection", (socket) => {
    console.log("connected:", socket.id);

    /* JOIN ROOM */
    socket.on("join_room", ({ roomId, name, role }) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = createEmptyRoom();
        const room = rooms[roomId];

        // Only one host allowed; subsequent "host" requests become participant
        const hasHost = Object.values(room.users).some((u) => u.role === "host");
        let actualRole = role;
        if (role === "host" && hasHost) actualRole = "participant";

        room.users[socket.id] = { id: socket.id, name, role: actualRole };

        // Auto-add to speaker list (unless observer)
        if (actualRole !== "observer" && !room.speakers.find((s) => s.name === name)) {
            room.speakers.push({
                name,
                remainingMs: room.config.timePerSpeakerMs,
                totalMs: room.config.timePerSpeakerMs,
            });
        }

        socket.emit("your_info", { role: actualRole, roomId });
        broadcast(roomId);
    });

    /* CONFIGURE SESSION (host only) */
    socket.on("configure_session", ({ roomId, config }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        if (config.sessionTitle !== undefined) room.sessionTitle = config.sessionTitle;

        if (config.timePerSpeakerMs > 0) {
            room.config.timePerSpeakerMs = config.timePerSpeakerMs;
            // Apply new time to all speakers only if session hasn't started
            if (!room.sessionActive) {
                room.speakers.forEach((s) => {
                    s.remainingMs = room.config.timePerSpeakerMs;
                    s.totalMs = room.config.timePerSpeakerMs;
                });
            }
        }

        broadcast(roomId);
    });

    /* ADD / REMOVE SPEAKER (host only) */
    socket.on("add_speaker", ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        if (!room.speakers.find((s) => s.name === name)) {
            room.speakers.push({
                name,
                remainingMs: room.config.timePerSpeakerMs,
                totalMs: room.config.timePerSpeakerMs,
            });
        }
        broadcast(roomId);
    });

    socket.on("remove_speaker", ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        room.speakers = room.speakers.filter((s) => s.name !== name);
        if (room.activeSpeaker === name) room.activeSpeaker = null;
        broadcast(roomId);
    });

    /* START / STOP SESSION (host only) */
    socket.on("start_session", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        room.sessionActive = true;
        startRoomTimer(roomId);
        broadcast(roomId);
    });

    socket.on("stop_session", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        room.sessionActive = false;
        room.activeSpeaker = null;
        stopRoomTimer(roomId);
        broadcast(roomId);
    });

    /* VAD REPORT — clients report who is loudest */
    socket.on("vad_report", ({ roomId, speakerName }) => {
        const room = rooms[roomId];
        if (!room || !room.sessionActive) return;

        if (speakerName) {
            // Someone is speaking — cancel silence timeout
            if (room._silenceTimeout) {
                clearTimeout(room._silenceTimeout);
                room._silenceTimeout = null;
            }
            room.activeSpeaker = speakerName;
        } else if (!room._silenceTimeout) {
            // Silence — wait grace period before clearing active speaker
            room._silenceTimeout = setTimeout(() => {
                if (rooms[roomId]) {
                    rooms[roomId].activeSpeaker = null;
                    rooms[roomId]._silenceTimeout = null;
                }
            }, 2500);
        }
    });

    /* GIFT TIME */
    socket.on("gift_time", ({ roomId, name, amountMs }) => {
        const room = rooms[roomId];
        if (!room) return;

        const targetName = name || room.activeSpeaker;
        if (!targetName) return;

        const sp = room.speakers.find((s) => s.name === targetName);
        if (sp) {
            sp.remainingMs += amountMs || 60000;
            if (sp.remainingMs > sp.totalMs) sp.totalMs = sp.remainingMs;
        }
        broadcast(roomId);
    });

    /* RESET SESSION (host only) */
    socket.on("reset_session", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        stopRoomTimer(roomId);
        if (room._silenceTimeout) clearTimeout(room._silenceTimeout);

        const newRoom = createEmptyRoom();
        newRoom.users = { ...room.users };
        newRoom.config = { ...room.config };

        // Re-add current participants as speakers with fresh time
        Object.values(newRoom.users)
            .filter((u) => u.role !== "observer")
            .forEach((u) => {
                newRoom.speakers.push({
                    name: u.name,
                    remainingMs: newRoom.config.timePerSpeakerMs,
                    totalMs: newRoom.config.timePerSpeakerMs,
                });
            });

        rooms[roomId] = newRoom;
        broadcast(roomId);
    });

    /* DISCONNECT */
    socket.on("disconnect", () => {
        console.log("disconnected:", socket.id);
        for (const rid in rooms) {
            const room = rooms[rid];
            if (!room.users[socket.id]) continue;

            const { name } = room.users[socket.id];
            delete room.users[socket.id];

            // Remove from speaker list on disconnect
            room.speakers = room.speakers.filter((s) => s.name !== name);
            if (room.activeSpeaker === name) room.activeSpeaker = null;

            broadcast(rid);
        }
    });
});

/* ---- START SERVER ---- */

server.listen(5000, () => console.log("Server running on port 5000"));
