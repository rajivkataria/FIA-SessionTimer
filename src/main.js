import { state } from "./state.js";
import { load, loadGroups } from "./storage.js";
import { render, toast } from "./ui.js";
import { setAutoAdvanceHandler } from "./timer.js";
import {
  applyPreset,
  addSpeaker,
  removeSpeaker,
  move,
  editMins,
  toggleStart,
  nextSpeaker,
  extendOne,
  resetAll,
  toggleMute,
  toggleAutoAdvance,
  togglePresenterMode,
  toggleViewerMode,
  exportCSV,
  copySummary,
  jump,
  editNote,
  updateSessionTitle,
  saveCurrentGroup,
  loadSelectedGroup,
  autoAdvanceNext,
  renderGroupsUI
} from "./exports.js";
import { newNameInput } from "./dom.js";

function applyViewerModeFromUrl(){
  try{
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if(view && (view === "1" || view.toLowerCase() === "viewer")){
      state.viewerMode = true;
      state.presenterMode = false;
    }
  }catch{}
}

// Keyboard shortcuts – ignore when typing
function setupKeyboard(){
  document.addEventListener("keydown", (e) => {
    if(e.metaKey || e.ctrlKey || e.altKey) return;

    const active = document.activeElement;
    const tag = active && active.tagName;
    const isTyping =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      (active && active.isContentEditable);

    if(isTyping) return;

    const k = e.key.toLowerCase();

    if(k === " "){
      e.preventDefault();
      toggleStart();
    } else if(k === "n"){
      nextSpeaker();
    } else if(k === "+"){
      extendOne();
    } else if(k === "r"){
      resetAll();
    } else if(k === "m"){
      toggleMute();
    } else if(k === "v"){
      toggleViewerMode();
    } else if(k >= "1" && k <= "9"){
      const idx = parseInt(k, 10) - 1;
      if(idx < state.speakers.length) jump(idx);
    }
  });
}

function setupAddSpeakerEnter(){
  if(!newNameInput) return;
  newNameInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      addSpeaker();
    }
  });
}

// Initialize
setAutoAdvanceHandler(autoAdvanceNext);
loadGroups();
load();
applyViewerModeFromUrl();
renderGroupsUI();
render();
if(!state.speakers.length) applyPreset(4);
setupKeyboard();
setupAddSpeakerEnter();

// expose for inline handlers
window.applyPreset = applyPreset;
window.addSpeaker = addSpeaker;
window.removeSpeaker = removeSpeaker;
window.move = move;
window.editMins = editMins;
window.toggleStart = toggleStart;
window.nextSpeaker = nextSpeaker;
window.extendOne = extendOne;
window.resetAll = resetAll;
window.toggleMute = toggleMute;
window.toggleAutoAdvance = toggleAutoAdvance;
window.togglePresenterMode = togglePresenterMode;
window.toggleViewerMode = toggleViewerMode;
window.exportCSV = exportCSV;
window.copySummary = copySummary;
window.jump = jump;
window.editNote = editNote;
window.updateSessionTitle = updateSessionTitle;
window.saveCurrentGroup = saveCurrentGroup;
window.loadSelectedGroup = loadSelectedGroup;

window.toast = toast;
