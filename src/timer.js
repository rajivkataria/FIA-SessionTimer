import { state, current } from "./state.js";
import { logEvent } from "./log.js";
import { beep } from "./audio.js";
import { banner, drawNow } from "./ui.js";

let rafId = 0;
let fired5 = false, fired1 = false, fired0 = false;
let onAutoAdvance = null;

export function setAutoAdvanceHandler(fn){
  onAutoAdvance = fn;
}

export function resetCues(){ fired5 = fired1 = fired0 = false; }

export function accumulateElapsed(){
  if(!state.running) return;
  const s = current();
  if(!s) return;
  const now = performance.now();
  const delta = (now - state.startMs) / 1000;
  s.remainingSec = Math.max(0, s.remainingSec - delta);
  s.elapsedSec = (s.elapsedSec || 0) + delta;
  state.sessionElapsedSec += delta;
  state.startMs = now;
}

function cue5(){ logEvent("Cue: 5 minutes left"); banner("5 minutes left"); beep(880, 0.10); }
function cue1(){ logEvent("Cue: 1 minute left"); banner("1 minute left"); beep(880, 0.10); setTimeout(()=>beep(880, 0.10), 150); }
function cue0(){
  logEvent("Cue: Time — please wrap");
  banner("Time — please wrap", true);
  beep(700, 0.12); setTimeout(()=>beep(600, 0.12), 140); setTimeout(()=>beep(500, 0.12), 280);
}

export function cueSwap(){
  banner("Swap speakers now", true);
  beep(920, 0.12); setTimeout(()=>beep(720, 0.12), 140);
}

export function startTick(){
  rafId = requestAnimationFrame(tick);
}

export function stopTick(){
  cancelAnimationFrame(rafId);
}

function tick(){
  const s = current();
  if(!state.running || !s){ stopTick(); return; }

  const now = performance.now();
  const delta = (now - state.startMs) / 1000;
  s.remainingSec = Math.max(0, s.remainingSec - delta);
  s.elapsedSec = (s.elapsedSec || 0) + delta;
  state.sessionElapsedSec += delta;
  state.startMs = now;

  const t = s.remainingSec;
  if(!fired5 && t <= 5*60){ fired5 = true; cue5(); }
  if(!fired1 && t <= 60){ fired1 = true; cue1(); }
  if(!fired0 && t <= 0){ fired0 = true; cue0(); }

  if(state.autoAdvance && t <= -2.2){
    resetCues();
    if(onAutoAdvance) onAutoAdvance();
    logEvent("Auto-advance");
  }

  drawNow();
  rafId = requestAnimationFrame(tick);
}
