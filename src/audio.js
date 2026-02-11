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

export function playCue(type){
  const pack = state.soundPack || "classic";
  if(pack === "soft"){
    if(type === "cue5") beep(620, 0.08, 0.04);
    if(type === "cue1"){ beep(620, 0.08, 0.04); setTimeout(()=>beep(620, 0.08, 0.04), 140); }
    if(type === "time"){ beep(520, 0.10, 0.05); setTimeout(()=>beep(440, 0.10, 0.05), 140); }
    if(type === "swap"){ beep(740, 0.08, 0.05); setTimeout(()=>beep(620, 0.08, 0.05), 140); }
    if(type === "wrap"){ beep(520, 0.12, 0.05); setTimeout(()=>beep(660, 0.12, 0.05), 160); }
    return;
  }
  if(pack === "bright"){
    if(type === "cue5") beep(1020, 0.10, 0.07);
    if(type === "cue1"){ beep(1020, 0.10, 0.07); setTimeout(()=>beep(1200, 0.08, 0.06), 150); }
    if(type === "time"){ beep(980, 0.12, 0.07); setTimeout(()=>beep(840, 0.12, 0.06), 140); setTimeout(()=>beep(720, 0.12, 0.06), 280); }
    if(type === "swap"){ beep(1200, 0.10, 0.07); setTimeout(()=>beep(900, 0.10, 0.06), 140); }
    if(type === "wrap"){ beep(880, 0.12, 0.06); setTimeout(()=>beep(1100, 0.12, 0.06), 160); }
    return;
  }
  // classic
  if(type === "cue5") beep(880, 0.10, 0.06);
  if(type === "cue1"){ beep(880, 0.10, 0.06); setTimeout(()=>beep(880, 0.10, 0.06), 150); }
  if(type === "time"){ beep(700, 0.12, 0.06); setTimeout(()=>beep(600, 0.12, 0.06), 140); setTimeout(()=>beep(500, 0.12, 0.06), 280); }
  if(type === "swap"){ beep(920, 0.12, 0.06); setTimeout(()=>beep(720, 0.12, 0.06), 140); }
  if(type === "wrap"){ beep(700, 0.12, 0.06); setTimeout(()=>beep(900, 0.12, 0.06), 160); }
}
