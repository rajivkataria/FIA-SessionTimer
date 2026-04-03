import {connect} from 'livekit-client';
let room;

export async function joinRoom(roomName, username) {

  const token = await fetchToken(roomName, username);

  room = await connect("wss://therapyapp-4n3fl2as.livekit.cloud", token);

  room.on("participantConnected", (p) => {
    console.log("Joined:", p.identity);
  });

  room.on("trackSubscribed", (track, pub, participant) => {
    if (track.kind === "video") {
      const el = track.attach();
      document.body.appendChild(el);
    }
  });
}
async function fetchToken(room, username) {
  const res = await fetch(
    `http://localhost:5000/get-token?room=${room}&username=${username}`
  );
  const data = await res.json();
  return data.token;
}