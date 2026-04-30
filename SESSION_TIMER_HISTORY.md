# Session Timer Project History

This document summarizes what has been built and changed from the initial request to the current modular version.

## 1) Initial Requirements (Summary)
- Purpose: keep 4–6 person sessions on time with unmissable cues and auto-advance.
- Users: one timekeeper runs it on a shared screen; no logins or data collection.
- Must‑haves:
  - Presets for 4/5/6 speakers with editable minutes
  - Large cues: 5 minutes, 1 minute, Time — please wrap, Swap speakers now
  - Auto-advance, manual Next, +1 minute, Start/Pause/Reset, keyboard shortcuts
  - High contrast UI + optional beep with mute
  - Works offline as a single file
  - Tiny cue log (with timestamps)
- Nice‑to‑haves: gift time, timebank, catch‑up mode, soft/hard wrap, role labels, CSV export
- Accessibility: large, readable text, gentle tone
- Failure handling: overruns, skips, late joins, pause/resume logging
- Privacy: local-only, no PII

## 2) MVP Features Implemented
- Presets for 4/5/6 speakers
- Editable minutes per speaker
- Large countdown display and visible banner cues
- Auto‑advance at Time
- Manual controls: Next, +1 minute, Start/Pause/Reset
- Keyboard shortcuts for key actions
- Optional beeps with mute toggle
- Session log with timestamps
- CSV export of log and speaker summary
- Presenter mode (cleaner view for screen sharing)

## 3) Audience-Friendly Viewer Mode
- Added Viewer mode for participants
- Hides controls and schedule; increases timer size
- Toggle via button or `V` hotkey
- URL flag support: `?view=1` or `?view=viewer`

## 4) Modularization (Scalable Structure)
- Split logic into modules under `src/`:
  - `state.js` (app state + helpers)
  - `storage.js` (localStorage)
  - `audio.js` (beeps + chime packs)
  - `timer.js` (tick loop + cues)
  - `actions.js` (UI actions)
  - `ui.js` (rendering + animation)
  - `log.js` (log + export)
  - `main.js` (bootstraps + event wiring)
- HTML now loads `src/main.js` as an ES module

## 5) Premium UX Additions
- Themes: Studio, Calm, Minimal, High Contrast
- Ambient gradient + subtle texture background
- Distinctive typography for timer and labels
- Speaker change animation (slide/fade)
- Session progress ring (overall time arc)
- Fullscreen button for clean run view
- Chime packs: Classic, Soft, Bright
- Wrap summary banner when cycle completes

## 6) Current Run Instructions
- Start local server:
  - `npm run dev`
  - or `python3 -m http.server 8000`
- Open in browser:
  - `http://localhost:8000/timerFIA.html`

## 7) Files Added/Updated
- `timerFIA.html` (UI + styling + module loader)
- `src/` folder with modular JS
- `README.md` updated for usage and features
- `package.json` with `npm run dev`

## 8) Known Future Enhancements (Not Implemented Yet)
- Gift time with guardrails
- Timebank strip per speaker
- Catch‑up mode with auto‑trim
- Soft/Hard wrap grace period
- Role labels and structured tags
- Export enhancements (JSON)

