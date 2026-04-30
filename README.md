<<<<<<< HEAD
# Structured Dialogue Platform

Backend (Phase 1) for a real-time structured conversation system designed to manage timed speaking sessions.

## ✅ Current Features

- Room-based real-time architecture
- Host + participant roles
- Server-authoritative timer
- Start / Pause timer
- Switch speakers
- Gift time to current speaker
- Live state synchronization via Socket.IO

## 🛠 Tech Stack

- Node.js
- Express
- Socket.IO
=======
# Session Timer

Single‑page, offline‑capable session timer for 4–6 speakers with clear cues, auto‑advance, themes, and a minimal viewer mode for Zoom sharing.

## Structure
- `timerFIA.html` UI shell and styles
- `src/` modular JS (state, actions, timer, UI, storage)

## Run Locally
Because the app uses ES modules, open it through a local server (not `file://`).

Option A (npm script):
```bash
npm run dev
```

Option B (direct Python):
```bash
python3 -m http.server 8000
```

Then open:
```
http://localhost:8000/timerFIA.html
```

## Viewer Mode
- Toggle in-app: `Viewer: On` or press `V`.
- Or open with a URL flag:
```
http://localhost:8000/timerFIA.html?view=1
```

## Premium Controls
- Themes: Studio, Calm, Minimal, High Contrast
- Chimes: Classic, Soft, Bright
- Fullscreen: `Fullscreen` button for a clean run view

## Notes
- Everything runs locally in the browser. No accounts, no data sent.
- CSV export is available from the toolbar.
>>>>>>> fd8fbd97fa6de1d80001bed38e5617ef64580f47
