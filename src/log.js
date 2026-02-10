import { state, logs, fmt } from "./state.js";
import { logEl } from "./dom.js";
import { banner } from "./ui.js";

export function logEvent(evt, extra=""){
  const ts = new Date().toISOString();
  const name = state.speakers[state.idx]?.name ?? "—";
  const line = `[${ts}] ${evt}${name?` — ${name}`:""}${extra?` (${extra})`:""}`;
  logs.push(line);
  if(logEl) logEl.textContent = logs.slice(-200).join("\n");
}

export function exportCSV(){
  const lines=["timestamp,event,speaker,extra"];
  for(const line of logs){
    const m=line.match(/^\[(.*?)\]\s(.*?)\s—\s(.*?)(?:\s\((.*?)\))?$/) || line.match(/^\[(.*?)\]\s(.*)$/);
    if(m && m.length >= 3){
      const ts=m[1], evt=m[2], sp=m[3]||"", ex=m[4]||"";
      lines.push(`"${ts}","${evt.replace(/"/g,'""')}","${sp.replace(/"/g,'""')}","${ex.replace(/"/g,'""')}"`);
    } else {
      lines.push(`"${line.replace(/"/g,'""')}"`);
    }
  }

  lines.push("");
  lines.push(`session_title,"${(state.sessionTitle||"").replace(/"/g,'""')}"`);
  lines.push(`session_elapsed,"${fmt(state.sessionElapsedSec)}"`);

  lines.push("");
  lines.push("speaker_summary");
  lines.push("name,planned_minutes,spoken_seconds,spoken_formatted,overtime_formatted,note");

  for(const sp of state.speakers){
    const spokenSec = Math.round(sp.elapsedSec || 0);
    const plannedSec = (sp.mins || 0) * 60;
    const overtimeSec = Math.max(0, spokenSec - plannedSec);
    lines.push(
      `"${(sp.name||"").replace(/"/g,'""')}",`+
      `${sp.mins || 0},`+
      `${spokenSec},`+
      `"${fmt(spokenSec)}",`+
      `"${overtimeSec ? fmt(overtimeSec) : ""}",`+
      `"${(sp.note||"").replace(/"/g,'""')}"`
    );
  }

  const blob=new Blob([lines.join("\n")],{type:"text/csv"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="session_log.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function copySummary(){
  const lines = [];
  const title = state.sessionTitle || "Listening Lab Session";
  lines.push(`Session: ${title}`);
  lines.push(`Total time: ${fmt(state.sessionElapsedSec)}`);
  lines.push("");

  state.speakers.forEach((sp, i) => {
    const spokenSec = Math.round(sp.elapsedSec || 0);
    const plannedSec = (sp.mins || 0)*60;
    const overtimeSec = Math.max(0, spokenSec - plannedSec);
    const overText = overtimeSec ? ` (+${fmt(overtimeSec)} over)` : "";
    lines.push(
      `${i+1}. ${sp.name || "Speaker"} — ${fmt(spokenSec)} spoken (planned ${fmt(plannedSec)})${overText}`
    );
    if(sp.note){
      lines.push(`   Note: ${sp.note}`);
    }
    lines.push("");
  });

  const text = lines.join("\n");
  try{
    await navigator.clipboard.writeText(text);
    banner("Summary copied to clipboard");
  }catch{
    banner("Could not access clipboard", true);
  }
}
