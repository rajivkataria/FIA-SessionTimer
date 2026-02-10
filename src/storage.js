import { state, STORAGE_KEY, GROUPS_KEY } from "./state.js";

export function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    idx: state.idx,
    running: false,
    startMs: 0,
    mute: state.mute,
    autoAdvance: state.autoAdvance,
    presenterMode: state.presenterMode,
    viewerMode: state.viewerMode,
    sessionTitle: state.sessionTitle,
    sessionElapsedSec: state.sessionElapsedSec,
    speakers: state.speakers
  }));
}

export function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const s = JSON.parse(raw);
    state.idx = s.idx || 0;
    state.mute = !!s.mute;
    state.autoAdvance = (s.autoAdvance !== undefined) ? !!s.autoAdvance : true;
    state.presenterMode = !!s.presenterMode;
    state.viewerMode = !!s.viewerMode;
    state.sessionTitle = s.sessionTitle || "";
    state.sessionElapsedSec = s.sessionElapsedSec || 0;
    if(Array.isArray(s.speakers)){
      state.speakers = s.speakers.map(sp => ({
        ...sp,
        elapsedSec: sp.elapsedSec || 0,
        note: sp.note || ""
      }));
    }
  }catch{}
}

export function loadGroups(){
  try{
    const raw = localStorage.getItem(GROUPS_KEY);
    if(!raw){ state.groups = []; return; }
    const parsed = JSON.parse(raw);
    state.groups = Array.isArray(parsed) ? parsed : [];
  }catch{
    state.groups = [];
  }
}

export function saveGroups(){
  localStorage.setItem(GROUPS_KEY, JSON.stringify(state.groups));
}
