import { state, current, logs } from "./state.js";
import { save, saveGroups } from "./storage.js";
import { logEvent } from "./log.js";
import { beep } from "./audio.js";
import { banner, render, toast } from "./ui.js";
import { accumulateElapsed, resetCues, cueSwap, startTick, stopTick } from "./timer.js";
import {
  preHint,
  logEl,
  newNameInput,
  newMinsInput,
  groupSelect,
  newGroupNameInput
} from "./dom.js";

export function applyPreset(n){
  if(state.running){ toast("Pause to change preset"); return; }
  const minutes = 5;
  state.speakers = Array.from({ length: n }, (_, i) => ({
    name: `Speaker ${i+1}`,
    mins: minutes,
    remainingSec: minutes * 60,
    elapsedSec: 0,
    note: ""
  }));
  state.idx = 0;
  save();
  render();
}

export function addSpeaker(){
  if(state.running){ toast("Pause to add"); return; }
  if(!newNameInput || !newMinsInput) return;
  const name = newNameInput.value.trim();
  const mins = Math.max(1, Math.min(120, parseInt(newMinsInput.value || 5, 10)));
  if(!name) return;
  state.speakers.push({
    name,
    mins,
    remainingSec: mins * 60,
    elapsedSec: 0,
    note: ""
  });
  newNameInput.value = "";
  save();
  render();
}

export function removeSpeaker(i){
  if(state.running){ toast("Pause to remove"); return; }
  state.speakers.splice(i, 1);
  state.idx = Math.min(state.idx, state.speakers.length - 1);
  if(state.idx < 0) state.idx = 0;
  save();
  render();
}

export function move(i, dir){
  if(state.running){ toast("Pause to reorder"); return; }
  const j = i + dir;
  if(j < 0 || j >= state.speakers.length) return;
  const cur = current();
  const tmp = state.speakers[i];
  state.speakers[i] = state.speakers[j];
  state.speakers[j] = tmp;
  save();
  state.idx = Math.max(0, state.speakers.indexOf(cur));
  render();
}

export function editMins(i, val){
  if(state.running){ toast("Pause to edit"); return; }
  const mins = Math.max(1, Math.min(120, parseInt(val || 5, 10)));
  const sp = state.speakers[i];
  sp.mins = mins;
  sp.remainingSec = mins * 60;
  save();
  render();
}

export function editNote(i, val){
  const sp = state.speakers[i];
  sp.note = val;
  save();
}

export function toggleStart(){
  if(!state.speakers.length){ toast("Add speakers first"); return; }
  state.running = !state.running;
  if(state.running){
    state.startMs = performance.now();
    if(preHint) preHint.style.display = "none";
    logEvent("Start");
    startTick();
  } else {
    accumulateElapsed();
    logEvent("Pause");
    save();
    render();
    stopTick();
  }
}

export function nextSpeaker(manual = true){
  accumulateElapsed();
  cueSwap();
  if(manual) logEvent("Next");
  state.idx = (state.idx + 1) % Math.max(1, state.speakers.length);
  resetCues();
  state.startMs = performance.now();
  save();
  render();
}

export function autoAdvanceNext(){
  nextSpeaker(false);
}

export function extendOne(){
  const s = current();
  if(!s) return;
  s.mins += 1;
  s.remainingSec += 60;
  logEvent("+1 minute", "extended");
  banner("Extended +1: " + s.name);
  beep(720, 0.12);
  save();
  render();
}

export function resetAll(){
  state.running = false;
  state.startMs = 0;
  state.idx = 0;
  state.sessionElapsedSec = 0;
  state.speakers.forEach(s => {
    s.remainingSec = s.mins * 60;
    s.elapsedSec = 0;
  });
  logs.length = 0;
  if(logEl) logEl.textContent = "";
  if(preHint) preHint.style.display = "";
  logEvent("Reset", "");
  resetCues();
  save();
  render();
  stopTick();
}

export function toggleMute(){
  state.mute = !state.mute;
  save();
  render();
}

export function toggleAutoAdvance(){
  state.autoAdvance = !state.autoAdvance;
  save();
  render();
}

export function togglePresenterMode(){
  state.presenterMode = !state.presenterMode;
  if(state.presenterMode) state.viewerMode = false;
  save();
  render();
}

export function toggleViewerMode(){
  state.viewerMode = !state.viewerMode;
  if(state.viewerMode) state.presenterMode = false;
  save();
  render();
}

export function updateSessionTitle(val){
  state.sessionTitle = val;
  save();
  render();
}

export function jump(i){
  if(state.running){
    accumulateElapsed();
    resetCues();
    state.idx = i;
    state.startMs = performance.now();
    logEvent("Jump", "to index " + (i + 1));
  } else {
    state.idx = i;
  }
  save();
  render();
}

export function renderGroupsUI(){
  if(!groupSelect) return;
  const currentValue = groupSelect.value;
  groupSelect.innerHTML = `<option value="">(none)</option>`;
  state.groups.forEach((g, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });
  if(currentValue && Number(currentValue) < state.groups.length){
    groupSelect.value = currentValue;
  }
}

export function saveCurrentGroup(){
  if(!newGroupNameInput) return;
  const name = newGroupNameInput.value.trim();
  if(!name){
    banner("Name your group first");
    return;
  }
  if(!state.speakers.length){
    banner("Add speakers before saving a group");
    return;
  }

  const members = state.speakers.map(sp => ({
    name: sp.name,
    mins: sp.mins || 5
  }));

  const existingIdx = state.groups.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
  if(existingIdx >= 0){
    state.groups[existingIdx].members = members;
  } else {
    state.groups.push({ name, members });
  }

  saveGroups();
  renderGroupsUI();
  newGroupNameInput.value = "";
  banner("Group saved");
}

export function loadSelectedGroup(){
  if(!groupSelect) return;
  const idx = Number(groupSelect.value);
  if(isNaN(idx) || idx < 0 || idx >= state.groups.length){
    banner("Choose a group to load");
    return;
  }
  const group = state.groups[idx];
  if(!group || !Array.isArray(group.members) || !group.members.length){
    banner("Group is empty");
    return;
  }
  if(state.running){
    banner("Pause timer before loading a group", true);
    return;
  }

  state.speakers = group.members.map(m => ({
    name: m.name,
    mins: m.mins || 5,
    remainingSec: (m.mins || 5) * 60,
    elapsedSec: 0,
    note: ""
  }));
  state.idx = 0;
  state.sessionElapsedSec = 0;
  logs.length = 0;
  if(logEl) logEl.textContent = "";
  logEvent("Load group", group.name);
  save();
  render();
}
