const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
    console.log("Connected as:", socket.id);

    // JOIN ROOM
    socket.emit("join_room", {
        roomId: "room1",
        name: "HostUser",
        role: "host"
    });

    
    // WAIT 1 SECOND → SET SPEAKERS
    setTimeout(() => {
        console.log("Setting speakers...");
        socket.emit("set_speakers", {
            roomId: "room1",
            speakers: ["Alice", "Bob"]
        });
    }, 1000);

    // WAIT 2 SECONDS → START TIMER
    setTimeout(() => {
        console.log("Starting timer...");
        socket.emit("start_timer", { roomId: "room1" });
    }, 2000);

    // WAIT 5 SECONDS → NEXT SPEAKER
    setTimeout(() => {
        console.log("Switching speaker...");
        socket.emit("next_speaker", { roomId: "room1" });
    }, 5000);
    
    setTimeout(() => {
        console.log("Gifting 60 seconds...");
        socket.emit("gift_time", {
            roomId: "room1",
            amountMs: 60000
        });
    }, 7000);
});

socket.on("state_update", (state) => {
    console.log("----- STATE UPDATE -----");
    console.log("Index:", state.idx);
    console.log("Running:", state.running);
    console.log("Speakers:", state.speakers);
    console.log("------------------------\n");
});