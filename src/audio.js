import { state } from "./state.js";

let audioCtx;
export function beep(freq=880,dur=0.12,vol=0.06){
  if(state.mute) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type="sine"; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    setTimeout(()=>o.stop(), dur*1000);
  }catch{}
}
