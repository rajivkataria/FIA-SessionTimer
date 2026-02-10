export const STORAGE_KEY = "session_timer_v4_dragdrop";
export const GROUPS_KEY = "session_timer_groups_v1";

export const state = {
  idx: 0,
  running: false,
  startMs: 0,
  mute: false,
  autoAdvance: true,
  presenterMode: false,
  viewerMode: false,
  sessionTitle: "",
  sessionElapsedSec: 0,
  speakers: [],
  groups: []
};

export const logs = [];

export const pad2 = (n) => String(n).padStart(2, "0");
export const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad2(m)}:${pad2(sec)}`;
};

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));

export const current = () => state.speakers[state.idx];
