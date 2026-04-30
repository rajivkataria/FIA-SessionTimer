# Changelog

All notable changes to the Therapy App are recorded here.

---

## [Unreleased] — 2026-04-25

### Added
- Screen sharing: "Share Screen" button visible after joining; screen share swaps into the sharer's existing video tile (blue border) instead of creating a new grid tile
- Join without camera: second "Join without Camera" button in the join modal; requests audio-only and shows avatar placeholder
- Dynamic timer: total session time is divided evenly across speakers; recalculates automatically when participants join late or choose "Pass"
- 10-phase session flow: server tracks current phase (1–10); facilitator sees phase name, placeholder script, and Prev/Next Phase buttons; all clients see the current phase name
- Per-speaker timer controls (Phase 8): host clicks ▶ Start / ⏸ Pause next to each speaker's name instead of a global start/stop; only one speaker's timer runs at a time
- Conversational Menu (Phase 7): each non-observer picks Open Dialogue, One-Way Share, Pass, Venting/Emotional, or Creative/Dramatic; selection stored on server and shown as a colour-coded badge on video tiles during Phase 8; "Pass" speakers are skipped in time calculation
- Song player: play/pause button shown during Phase 1 (intro) and Phase 10 (closing); tied to uploaded MP3 files
- Song admin panel (⚙ host only): upload intro and closing MP3 files via the browser; songs persist on the server and sync to all clients
- Mode badges on video tiles (Phase 8): small colour-coded pill showing each speaker's conversational mode
- Brand redesign: white background, teal (#3ECDB4) primary, coral (#F05A6E) for warnings/overtime, orange (#F7913A) for active speaker highlight

### Changed
- Setup modal "Time per participant" → "Total discussion time (minutes)"; server divides this across all non-pass speakers
- Active speaker is now host-controlled (explicit button) instead of automatic VAD detection
- VAD reporting removed entirely from client and server

### Fixed
- Avatar letter no longer shows on top of a playing video stream
- Screen share no longer creates an extra grid tile; it replaces the video inside the sharer's existing tile and restores camera on stop
- Participant disconnect now cleans up both camera and screen-share tiles
