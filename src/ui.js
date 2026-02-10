import { state, fmt, escapeHtml, current } from "./state.js";
import { save } from "./storage.js";
import {
  tbody,
  curNameEl,
  curTimeEl,
  bannerEl,
  sessionTitleDisplay,
  sessionTitleInput,
  sessionTimeEl,
  nextLineEl,
  presenterBtn,
  viewerBtn,
  muteBtn,
  autoBtn,
  startBtn
} from "./dom.js";

let dragFromIndex = null;

export function banner(text, warn = false){
  if(!bannerEl) return;
  bannerEl.textContent = text;
  bannerEl.className = "banner show" + (warn ? " warn" : "");
  setTimeout(()=>bannerEl.classList.remove("show"), 3200);
}

export function toast(msg){ banner(msg); }

function editMinsCell(i, mins){
  return `<input type="number" min="1" max="120" value="${mins}" style="width:70px"
          ${state.running ? "disabled" : ""} oninput="editMins(${i}, this.value)"/>`;
}

function setupRowDrag(tr, index){
  tr.draggable = true;
  tr.dataset.index = index;

  tr.addEventListener("dragstart", onRowDragStart);
  tr.addEventListener("dragover", onRowDragOver);
  tr.addEventListener("dragleave", onRowDragLeave);
  tr.addEventListener("drop", onRowDrop);
  tr.addEventListener("dragend", onRowDragEnd);
}

function onRowDragStart(e){
  const tr = e.currentTarget;
  dragFromIndex = Number(tr.dataset.index);
  e.dataTransfer.effectAllowed = "move";
  tr.classList.add("dragging");
}

function onRowDragOver(e){
  e.preventDefault();
  const tr = e.currentTarget;
  if(tr.classList.contains("dragging")) return;
  tr.classList.add("drag-over");
  e.dataTransfer.dropEffect = "move";
}

function onRowDragLeave(e){
  e.currentTarget.classList.remove("drag-over");
}

function onRowDrop(e){
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove("drag-over");
  const to = Number(target.dataset.index);
  if(dragFromIndex === null || isNaN(to)) return;

  const curSpeaker = current();
  const arr = state.speakers;
  const moved = arr.splice(dragFromIndex, 1)[0];
  arr.splice(to, 0, moved);

  state.idx = Math.max(0, arr.indexOf(curSpeaker));
  dragFromIndex = null;
  save();
  render();
}

function onRowDragEnd(){
  dragFromIndex = null;
  if(!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  rows.forEach(r => r.classList.remove("dragging", "drag-over"));
}

export function drawNow(){
  const s = current();
  if(curNameEl) curNameEl.textContent = s ? s.name : "—";
  if(curTimeEl) curTimeEl.textContent = fmt(s ? Math.max(0, s.remainingSec) : 0);
  if(sessionTimeEl) sessionTimeEl.textContent = fmt(state.sessionElapsedSec);

  const total = state.speakers.length;
  let nextIdx = -1;
  if(total > 1){
    nextIdx = (state.idx + 1) % total;
  }
  if(nextLineEl){
    if(nextIdx >= 0 && state.speakers[nextIdx]){
      nextLineEl.textContent = "Next: " + (state.speakers[nextIdx].name || ("Speaker " + (nextIdx+1)));
    } else {
      nextLineEl.textContent = "Next: —";
    }
  }

  if(sessionTitleDisplay){
    sessionTitleDisplay.textContent = state.sessionTitle || "";
  }
  if(sessionTitleInput && sessionTitleInput.value !== state.sessionTitle){
    sessionTitleInput.value = state.sessionTitle;
  }

  if(state.presenterMode){
    document.body.classList.add("presenter");
  } else {
    document.body.classList.remove("presenter");
  }
  if(state.viewerMode){
    document.body.classList.add("viewer");
  } else {
    document.body.classList.remove("viewer");
  }

  if(!tbody) return;
  tbody.innerHTML = "";
  state.speakers.forEach((sp, i) => {
    const tr = document.createElement("tr");
    let cls = "";
    if(i === state.idx) cls = "active";
    if(i === nextIdx && i !== state.idx) cls = (cls ? cls + " " : "") + "next";
    tr.className = cls;

    const remaining = (i === state.idx) ? Math.max(0, sp.remainingSec) : sp.remainingSec;
    const spokenSec = sp.elapsedSec || 0;
    const spoken = fmt(spokenSec);
    const plannedSec = (sp.mins || 0) * 60;
    const ratio = plannedSec ? Math.min(1, spokenSec / plannedSec) : 0;
    const overtimeSec = Math.max(0, spokenSec - plannedSec);
    const overtimeBadge = overtimeSec > 1 ? `<span class="overtime">+${fmt(overtimeSec)}</span>` : "";
    const noteEsc = escapeHtml(sp.note || "");
    const barWidth = Math.min(100, ratio * 100);

    tr.innerHTML = `
      <td><span class="row-handle" title="Drag to reorder">☰</span>${i+1}</td>
      <td>${escapeHtml(sp.name)}</td>
      <td>${editMinsCell(i, sp.mins)}</td>
      <td>${fmt(remaining)}</td>
      <td>
        ${spoken}${overtimeBadge}
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${barWidth}%;"></div>
        </div>
      </td>
      <td><input class="notes-input" type="text" value="${noteEsc}" oninput="editNote(${i}, this.value)" placeholder="Observations, cues…"/></td>
      <td>
        <button onclick="jump(${i})" title="Jump">Go</button>
        <button onclick="move(${i},-1)" title="Up">↑</button>
        <button onclick="move(${i},1)" title="Down">↓</button>
        <button class="warn" onclick="removeSpeaker(${i})" title="Remove">✕</button>
      </td>`;

    setupRowDrag(tr, i);
    tbody.appendChild(tr);
  });
}

export function render(){
  if(startBtn) startBtn.textContent = state.running ? "Pause" : "Start";
  if(muteBtn) muteBtn.textContent = state.mute ? "Unmute" : "Mute";
  if(autoBtn) autoBtn.textContent = "Auto-advance: " + (state.autoAdvance ? "On" : "Off");
  if(presenterBtn) presenterBtn.textContent = "Presenter: " + (state.presenterMode ? "On" : "Off");
  if(viewerBtn) viewerBtn.textContent = "Viewer: " + (state.viewerMode ? "On" : "Off");
  drawNow();
}
