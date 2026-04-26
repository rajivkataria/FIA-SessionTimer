const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const path    = require("path");
const cors    = require("cors");
const fs      = require("fs");
const multer  = require("multer");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

/* ---- SONGS ---- */

const songsDir = path.join(__dirname, "songs");
if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir);
app.use("/songs", express.static(songsDir));

const storage = multer.diskStorage({
    destination: songsDir,
    filename: (req, file, cb) => cb(null, req.params.type + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

let globalSongs = { intro: null, closing: null };
["intro", "closing"].forEach((t) => {
    const mp3 = path.join(songsDir, t + ".mp3");
    if (fs.existsSync(mp3)) globalSongs[t] = "/songs/" + t + ".mp3";
});

app.get("/songs-info", (_req, res) => res.json(globalSongs));

app.post("/upload-song/:type", upload.single("file"), (req, res) => {
    const { type } = req.params;
    if (!["intro", "closing"].includes(type)) return res.status(400).json({ error: "Invalid type" });
    if (!req.file) return res.status(400).json({ error: "No file" });
    const url = "/songs/" + req.file.filename;
    globalSongs[type] = url;
    io.emit("songs_updated", globalSongs);
    res.json({ url, songs: globalSongs });
});

/* ---- LIVEKIT TOKEN ---- */

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

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

const rooms     = {};
const roomTimers = {};

function createEmptyRoom() {
    return {
        sessionTitle:  "",
        phase:         1,                    // 1–10
        totalSessionMs: 20 * 60 * 1000,     // default 20 min for Phase 8
        sessionActive: false,               // Phase 8 timer running
        speakers:      [],                  // [{ name, remainingMs, totalMs, started, speakingMode }]
        users:         {},                  // { socketId: { id, name, role } }
        activeSpeaker: null,
        lastTick:      null,
    };
}

/* Recalculate per-speaker time for all non-started, non-pass speakers */
function recalculateTimes(room) {
    const consumedMs = room.speakers.reduce((sum, s) => {
        if (!s.started) return sum;
        return sum + Math.max(0, s.totalMs - s.remainingMs);
    }, 0);

    const pool    = Math.max(0, room.totalSessionMs - consumedMs);
    const pending = room.speakers.filter((s) => !s.started && s.speakingMode !== "pass");

    if (pending.length === 0) return;
    const each = Math.floor(pool / pending.length);
    pending.forEach((s) => { s.remainingMs = each; s.totalMs = each; });
}

function publicState(room) {
    return {
        sessionTitle:   room.sessionTitle,
        phase:          room.phase,
        totalSessionMs: room.totalSessionMs,
        sessionActive:  room.sessionActive,
        speakers:       room.speakers.map((s) => ({ ...s })),
        users:          Object.values(room.users).map((u) => ({ name: u.name, role: u.role })),
        activeSpeaker:  room.activeSpeaker,
        songs:          { ...globalSongs },
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
        if (!room.sessionActive || !room.activeSpeaker) return;

        const now     = Date.now();
        const elapsed = now - (room.lastTick || now);
        room.lastTick = now;

        const sp = room.speakers.find((s) => s.name === room.activeSpeaker);
        if (sp) sp.remainingMs = Math.max(-60000, sp.remainingMs - elapsed);

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

        const hasHost   = Object.values(room.users).some((u) => u.role === "host");
        let actualRole  = role;
        if (role === "host" && hasHost) actualRole = "participant";

        room.users[socket.id] = { id: socket.id, name, role: actualRole };

        if (actualRole !== "observer" && !room.speakers.find((s) => s.name === name)) {
            room.speakers.push({ name, remainingMs: 0, totalMs: 0, started: false, speakingMode: null });
            recalculateTimes(room);
        }

        socket.emit("your_info", { role: actualRole, roomId });
        broadcast(roomId);
    });

    /* CONFIGURE SESSION */
    socket.on("configure_session", ({ roomId, config }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        if (config.sessionTitle !== undefined) room.sessionTitle = config.sessionTitle;

        if (config.totalSessionMs > 0) {
            room.totalSessionMs = config.totalSessionMs;
            if (!room.sessionActive) {
                room.speakers.forEach((s) => { s.started = false; });
                recalculateTimes(room);
            }
        }

        broadcast(roomId);
    });

    /* PHASE NAVIGATION */
    socket.on("next_phase", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;
        if (room.phase < 10) room.phase++;
        if (room.phase === 8) recalculateTimes(room);
        broadcast(roomId);
    });

    socket.on("prev_phase", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;
        if (room.phase > 1) room.phase--;
        broadcast(roomId);
    });

    /* SPEAKER TIMER CONTROL (Phase 8, host only) */
    socket.on("start_speaker", ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        const sp = room.speakers.find((s) => s.name === name);
        if (!sp || sp.speakingMode === "pass") return;

        // Mark previously active speaker as started
        if (room.activeSpeaker && room.activeSpeaker !== name) {
            const prev = room.speakers.find((s) => s.name === room.activeSpeaker);
            if (prev) prev.started = true;
        }

        room.activeSpeaker = name;
        room.sessionActive = true;
        sp.started         = true;
        room.lastTick      = Date.now();

        startRoomTimer(roomId);
        broadcast(roomId);
    });

    socket.on("stop_speaker", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;

        if (room.activeSpeaker) {
            const sp = room.speakers.find((s) => s.name === room.activeSpeaker);
            if (sp) sp.started = true;
        }

        room.sessionActive = false;
        room.activeSpeaker = null;
        stopRoomTimer(roomId);
        broadcast(roomId);
    });

    /* SPEAKING MODE */
    socket.on("set_speaking_mode", ({ roomId, name, mode }) => {
        const room = rooms[roomId];
        if (!room) return;
        const sp = room.speakers.find((s) => s.name === name);
        if (!sp) return;
        sp.speakingMode = mode;
        recalculateTimes(room);
        broadcast(roomId);
    });

    /* ADD / REMOVE SPEAKER */
    socket.on("add_speaker", ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;
        if (!room.speakers.find((s) => s.name === name)) {
            room.speakers.push({ name, remainingMs: 0, totalMs: 0, started: false, speakingMode: null });
            recalculateTimes(room);
        }
        broadcast(roomId);
    });

    socket.on("remove_speaker", ({ roomId, name }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;
        room.speakers = room.speakers.filter((s) => s.name !== name);
        if (room.activeSpeaker === name) { room.activeSpeaker = null; room.sessionActive = false; stopRoomTimer(roomId); }
        recalculateTimes(room);
        broadcast(roomId);
    });

    /* GIFT TIME */
    socket.on("gift_time", ({ roomId, name, amountMs }) => {
        const room = rooms[roomId];
        if (!room) return;
        const targetName = name || room.activeSpeaker;
        if (!targetName) return;
        const sp = room.speakers.find((s) => s.name === targetName);
        if (sp) { sp.remainingMs += amountMs || 60000; if (sp.remainingMs > sp.totalMs) sp.totalMs = sp.remainingMs; }
        broadcast(roomId);
    });

    /* RESET SESSION */
    socket.on("reset_session", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.users[socket.id]?.role !== "host") return;
        stopRoomTimer(roomId);

        const newRoom = createEmptyRoom();
        newRoom.users         = { ...room.users };
        newRoom.sessionTitle  = room.sessionTitle;
        newRoom.totalSessionMs = room.totalSessionMs;
        newRoom.phase         = room.phase;

        Object.values(newRoom.users).filter((u) => u.role !== "observer").forEach((u) => {
            newRoom.speakers.push({ name: u.name, remainingMs: 0, totalMs: 0, started: false, speakingMode: null });
        });
        recalculateTimes(newRoom);

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

            room.speakers = room.speakers.filter((s) => s.name !== name);
            if (room.activeSpeaker === name) {
                room.activeSpeaker = null;
                room.sessionActive = false;
                stopRoomTimer(rid);
            }
            recalculateTimes(room);
            broadcast(rid);
        }
    });
});

server.listen(5000, () => console.log("Server running on port 5000"));
