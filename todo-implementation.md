# TODO: Implementation Backlog

> **Key rules (from general spec):**
> - Speaker is a **live toggle** — no speaker name, just live on/off
> - When speaker goes live, music **stops**; when speaker stops, music **resumes**
> - Backend manages state & metadata only — no audio processing
> - Streaming via Caster.fm
> - **Continuous playback**: songs play as a queue; when a song ends it moves to the last position and the next song plays automatically

---

## Backend

### 1. POST /api/admin/song/reorder — Move Song in Queue
Move a song to a new position in the playlist queue.

**Body:**
```json
{ "id": "uuid", "direction": "up" | "down" }
```

**Response:** Updated playlist array (same format as `GET /api/radio/playlist`)

**Behavior:**
- `"up"` = swap with previous item (index - 1); no-op if already first
- `"down"` = swap with next item (index + 1); no-op if already last
- Broadcasts `playlist-update` after reorder

### 2. Speaker is a Live Toggle (No Name)
- `POST /api/admin/live` takes no body — switches to speaker mode
- `currentSpeaker` is set to `true` (boolean flag, no name string)
- No speaker name input, no speaker queue

### 3. Music Stops on Live Mode / Resumes on Stop
- When `POST /api/admin/live` is called: `mode: "speaker"`, `currentTrack: null`, auto-advance timer cleared
- Broadcast `status-update` so all listeners know music has stopped
- When `POST /api/admin/live/stop` is called: `mode: "music"`, `currentSpeaker: null`
- Frontend auto-selects first playlist track when mode returns to music

### 4. Continuous Playback Queue Rotation
- When a song ends, client emits `song-ended` via WebSocket with `{ id }`
- Backend `advanceToNextSong`: moves ended song to last position, plays next song in queue
- Auto-advance timer fallback (duration + 5s grace) in case no client reports
- Duplicate-advance guard prevents race conditions from multiple clients

### Backend Status

| # | Feature | Endpoint / Area | Status |
|---|---------|-----------------|--------|
| 1 | Reorder songs | POST /api/admin/song/reorder | DONE |
| 2 | Speaker live toggle (no name) | POST /api/admin/live | DONE |
| 3 | Music stops on live / resumes | POST /api/admin/live + /live/stop | DONE |
| 4 | Continuous playback queue rotation | advanceToNextSong + song-ended socket | DONE |

---

## Frontend

### 4. Right-Side Queue Panel (Admin Dashboard Layout Redesign)
- Desktop: 2-column layout — controls on left, queues on right
- Mobile: stacked (queues below controls)
- Queue panel shows Song Queue only (no speaker queue)

### 5. Queue Item Actions (on click/select)
When a song in the queue is selected, show action buttons:
- **▲ Move Up** — reorder up (calls `POST /api/admin/song/reorder`)
- **▼ Move Down** — reorder down
- **✏️ Edit** — inline edit title/url/duration (calls `PATCH /api/admin/song/:id`)
- **▶ Play** — select and play (existing `POST /api/admin/song/play`)
- **🗑 Remove** — delete from queue (existing `DELETE /api/admin/song/:id`)

### 6. Move Up/Down Buttons in SongQueue
- Reorder buttons per song (calls `POST /api/admin/song/reorder`)

### 7. Remove Speaker Name UI
- No speaker name input in "Go Live" controls — just a toggle button
- Live state shows "Speaker is Live" (no name displayed)
- NowPlaying/NowPlayingAdmin show "Speaker Live" badge instead of speaker name

### 8. Listener UI: Speaker Live State
- When `mode: "speaker"`, NowPlaying shows "Speaker is Live" with purple badge
- Music playback stops automatically (stream switches to live audio via Caster.fm)
- When speaker stops, frontend auto-selects first playlist track

### 9. Continuous Playback on Listener
- When a song ends, listener emits `song-ended` via WebSocket
- Backend advances queue; new `status-update` pushes next track to all listeners
- Auto-select first playlist track as fallback when no `currentTrack` is set

### Frontend Status

| # | Feature | Component | Status |
|---|---------|-----------|--------|
| 4 | Right-side queue panel | Dashboard layout | DONE |
| 5 | Queue item expand/actions | SongQueue UI | DONE |
| 6 | Move Up/Down buttons | SongQueue UI | DONE |
| 7 | Remove speaker name UI | LiveControl / NowPlaying | DONE |
| 8 | Listener live speaker state | NowPlaying / AudioPlayer | DONE |
| 9 | Continuous playback on listener | Home.js / socket | DONE |

---

## New Features — Backlog

### 10. WhatsApp Contact Button (Listener Page)
**Priority:** High  
**Component:** `Home.js` footer area  
**Details:**
- Floating or footer "Contact Us" button with WhatsApp icon
- Opens `https://wa.me/917559360210?text=Jai%20Prabhu` in new tab
- Styled as a green WhatsApp-branded pill button
- Always visible on listener page (fixed bottom-right or in footer)

### 11. Debug Page Enhancements
**Priority:** Medium  
**Component:** `DebugPage.js`  
**Details:**
- **Connected Listeners Count** — show real-time listener count via socket event (needs backend `GET /api/radio/listeners` or socket broadcast)
- **Response Latency** — measure and display API response time for health/status/playlist calls (e.g. "Health: 45ms")
- **Uptime Badge** — show how long the server has been running (backend needs `process.uptime()` in health response)
- **Current Playlist Summary** — show song titles instead of raw JSON, with position numbers and "now playing" highlight
- **Visual Refresh** — tabbed layout (Overview | API | WebSocket | Audio | Logs) instead of one long scroll, colored section headers, collapsible JSON blocks
- **Quick Actions** — "Copy status JSON" button, "Copy socket ID" button
- **Auto-refresh toggle** — periodic auto-refresh every N seconds for health/status

### 12. Listener Count (Real-Time)
**Priority:** High  
**Component:** `StatusBanner.js` (listener) + `Dashboard.js` header (admin)  
**Backend:** Socket.io `connection`/`disconnect` event counter  
**Details:**
- Backend tracks connected socket count, broadcasts `listener-count` event on change
- Listener page: StatusBanner shows "🔊 12 listening" next to connection dot
- Admin dashboard: header shows live listener count badge
- Debug page: shows count in overview section

### 13. Playlist View for Listeners (Read-Only)
**Priority:** Medium  
**Component:** New `PlaylistPanel.js` on `Home.js`  
**Details:**
- Collapsible "Up Next" section below NowPlaying card
- Shows upcoming songs with titles (no URLs/admin actions)
- Highlights currently playing song
- Real-time updates via existing `playlist-update` socket event
- Swipe-up to expand on mobile

### 14. Song Progress Bar
**Priority:** Medium  
**Component:** `AudioPlayer.js`  
**Details:**
- Thin progress bar below the play button showing elapsed/remaining time
- Uses `startTime` + `duration` from backend to show synced progress
- Displays `mm:ss / mm:ss` text
- No seeking (server-controlled playback position)
- Hidden in stream/speaker mode

### 15. PWA Install Prompt (Mobile)
**Priority:** Medium  
**Component:** `Home.js` or new `InstallBanner.js`  
**Details:**
- `manifest.json` already exists; add proper icons, theme color, display: standalone
- Service worker for offline shell caching (app shell loads even offline, shows "No connection" state)
- "Add to Home Screen" banner for first-time mobile visitors
- App icon & splash screen for installed PWA experience

### 16. Toast Notification System
**Priority:** Low  
**Component:** New `Toast.js` shared component  
**Details:**
- Replace inline error/success messages with a toast stack (bottom-center or top-right)
- Auto-dismiss after 3–5 seconds
- Types: success (green), error (red), info (blue)
- Used in: Dashboard (upload success, errors), UploadSection, SongQueue actions

### 17. Admin: Bulk Actions on Playlist
**Priority:** Low  
**Component:** `SongQueue.js`  
**Details:**
- "Select All" checkbox to select multiple songs
- "Remove Selected" bulk delete
- "Shuffle Playlist" button to randomize order
- "Clear Playlist" with confirmation modal

### 18. Dark/Light Theme Toggle
**Priority:** Low  
**Component:** Global (CSS variables + toggle in header)  
**Details:**
- Currently dark-only; add a light theme option
- Store preference in localStorage
- Toggle button in both listener and admin headers
- Tailwind dark mode class strategy

### 19. About / Info Page
**Priority:** Low  
**Component:** New route `/about`  
**Details:**
- Brief description of KarVichar TohPamm
- Schedule information (if there's a regular broadcast schedule)
- WhatsApp contact link (same as #10)
- Social media links (if any)
- Credits / team info

### 20. Admin: Song Search / Filter
**Priority:** Low  
**Component:** `SongQueue.js`  
**Details:**
- Search bar above playlist to filter songs by title
- Useful when playlist grows beyond 30–50 songs
- Client-side filtering (no backend change needed)

### 21. Email Contact Button (Listener Page)
**Priority:** High  
**Component:** `Home.js` footer area (next to WhatsApp button)  
**Details:**
- Floating "Email Us" button styled as a branded pill (blue/orange theme)
- Opens `mailto:karvichartohpamm@gmail.com?subject=Jai%20Prabhu` on click
- Positioned alongside the existing WhatsApp button (bottom-right cluster)
- Always visible on listener page (fixed position)
- Email icon (envelope SVG) + "Email Us" label

### 22. Deploy to KarVicharTohPamm / KVTP Website
**Priority:** High  
**Area:** Infrastructure / DevOps  
**Details:**
- Migrate / deploy the application on the official karvichartohpamm / kvtp website domain for better bandwidth and security
- **Action required:** Get hosting, domain, and infrastructure details from Ankit Bhai
- Potential tasks (pending details from Ankit Bhai):
  - Custom domain setup (DNS, SSL/TLS certificate)
  - Hosting provider migration or integration
  - CDN / bandwidth improvements
  - Security hardening (HTTPS enforcement, CORS, rate limiting)
- Update CI/CD workflows to target new deployment destination once details are confirmed

### 23. Marquee Scroll for Long Song Titles
**Priority:** High  
**Component:** `NowPlaying.js`  
**Details:**
- Long bhajan names get truncated abruptly with `truncate`
- Add a CSS marquee/scroll animation for titles that overflow
- Only animate when the text is wider than the container
- Smooth, slow scroll that loops — easy to read

### 24. Play/Pause Button Color Rethink
**Priority:** High  
**Component:** `AudioPlayer.js`  
**Details:**
- Currently: green (play) → red (pause). Red implies "error/stop" — confusing
- Change pause state to a muted/dark color (e.g. `bg-gray-700` or `bg-white/15`)
- Reserve red for destructive actions only
- Keep green for the play state ("go" metaphor)

### 25. Thicker Progress Bar
**Priority:** High  
**Component:** `AudioPlayer.js` → `SongProgressBar`  
**Details:**
- Current `h-1` (4px) bar is hard to see on mobile
- Bump to `h-1.5` (6px) for better visibility
- No functional change, visual-only

### 26. Fade Transition on Song Change
**Priority:** Medium  
**Component:** `NowPlaying.js`  
**Details:**
- When a new song starts, nothing visually signals the transition
- Add a subtle fade/slide animation on title change
- CSS `transition` or `key`-based re-mount with animation

### 27. Show Song Title When Paused
**Priority:** Medium  
**Component:** `AudioPlayer.js`  
**Details:**
- "Tap to Listen" is generic — doesn't tell the user what they'll hear
- When paused with a track loaded, show song title instead
- Keep "Tap to Listen" only when there's truly nothing loaded

### 28. WhatsApp Button Overlap Fix
**Priority:** Medium  
**Component:** `Home.js`  
**Details:**
- Fixed bottom-right WhatsApp button can overlap NowPlaying card or footer on small viewports
- Add bottom padding to the page content to account for the button height
- Or make the button smaller / icon-only on very small screens

### 29. Loading Skeleton on First Load
**Priority:** Low  
**Component:** `Home.js`  
**Details:**
- Flash of "No track available" before the API responds on first load
- Add a subtle skeleton/placeholder for NowPlaying and AudioPlayer while fetching
- Replace with real content once status + playlist resolve

### 30. Multi-Upload Hint in Upload Section
**Priority:** High  
**Component:** `UploadSection.js`  
**Details:**
- Admin may not know the upload input supports selecting multiple files at once (up to 10)
- Add a small helper text below the file input: "You can select up to 10 files at once"
- When files are selected, show count: "3 of 10 slots used"
- Style as muted gray hint text (`text-xs text-gray-500`)
- Also mention accepted formats (e.g. "MP3, WAV, OGG")

### 31. Admin Panel Help / Instruction Icon
**Priority:** High  
**Component:** `Dashboard.js` header area  
**Details:**
- Add a small ℹ️ / ❓ icon button in the admin dashboard header (top-right, near logout)
- Clicking it opens a modal or slide-over panel listing admin panel capabilities:
  - **Upload Songs** — select up to 10 audio files at once, they're added to the playlist automatically
  - **Song Queue** — reorder (move up/down), edit title, play, or remove songs
  - **Go Live** — toggle speaker mode; music pauses and resumes when you stop
  - **Bulk Actions** — select all, remove selected, shuffle, or clear the playlist
  - **Search** — filter songs by title in the queue
- Styled as a clean card/modal with icons per capability
- Dismissible via close button or clicking outside
- Useful for onboarding new admins who aren't familiar with the panel

### 32. App Version Display
**Priority:** Medium  
**Component:** `Home.js` footer + `Dashboard.js` header  
**Details:**
- Maintain a version string (e.g. `1.2.0`) in a single source of truth — `package.json` `version` field
- Inject it at build time via `REACT_APP_VERSION` env var (set in build script or `craco.config.js`)
- **Listener page:** Show version in footer — `v1.2.0` in small muted text next to copyright
- **Admin dashboard:** Show version badge in header area — subtle pill next to "KVTP Admin" title
- **"What's New" changelog:** Optional tooltip or small expandable section listing recent changes (hardcoded array of `{ version, date, changes[] }`)
- Bump version in `package.json` on each release
- No backend changes needed — purely a frontend/build concern

### 33. Responsive Design Audit & Fixes
**Priority:** High  
**Component:** Global (all pages)  
**Details:**
- Audit all pages (Home, Admin Dashboard, Debug) across breakpoints: mobile (320–480px), tablet (768px), desktop (1024px+)
- Fix layout overflow, text truncation, and touch-target sizing issues on small screens
- Ensure admin dashboard 2-column layout collapses cleanly on tablet/mobile
- Song queue items, upload section, and live controls should be fully usable on narrow viewports
- Test on actual devices (iOS Safari, Android Chrome) — not just browser DevTools
- Fix any horizontal scroll caused by fixed-width elements or padding overflow
- Ensure tap targets are at least 44×44px per mobile accessibility guidelines

### 34. Background Image / Gradient for Listener Page
**Priority:** Medium  
**Component:** `Home.js` / `index.css`  
**Details:**
- Add a subtle background image or gradient to the listener page for a more polished radio-station feel
- Options: soft radial gradient, blurred abstract image, or a branded pattern
- Must work in both dark and light themes (use CSS variables or theme-aware classes)
- Keep it low-contrast so text and controls remain readable
- Use `background-attachment: fixed` for a parallax-like effect on scroll
- Optimize image assets (WebP, compressed) to avoid slowing page load
- Consider a subtle animated gradient for extra polish (CSS `@keyframes` on `background-position`)

---

### New Features Status

| # | Feature | Area | Priority | Status |
|---|---------|------|----------|--------|
| 10 | WhatsApp contact button | Listener footer | High | DONE |
| 11 | Debug page enhancements | Debug page | Medium | DONE |
| 12 | Listener count (real-time) | Backend + Frontend | High | BACKLOG |
| 13 | Playlist view for listeners | Listener page | Medium | BACKLOG |
| 14 | Song progress bar | AudioPlayer | Medium | DONE |
| 15 | PWA install prompt | Home / manifest | Medium | DONE |
| 16 | Toast notification system | Shared component | Low | DONE |
| 17 | Bulk playlist actions | Admin SongQueue | Low | DONE |
| 18 | Dark/Light theme toggle | Global | Low | DONE |
| 19 | About / Info page | New route | Low | TODO |
| 20 | Song search / filter | Admin SongQueue | Low | DONE |
| 21 | Email contact button | Listener footer | High | DONE |
| 22 | Deploy to KVTP website | Infrastructure | High | BACKLOG |
| 23 | Marquee scroll for long titles | NowPlaying | High | DONE |
| 24 | Play/pause button color rethink | AudioPlayer | High | DONE |
| 25 | Thicker progress bar | AudioPlayer | High | DONE |
| 26 | Fade transition on song change | NowPlaying | Medium | DONE |
| 27 | Show song title when paused | AudioPlayer | Medium | DONE |
| 28 | WhatsApp button overlap fix | Home.js | Medium | DONE |
| 29 | Loading skeleton on first load | Home.js | Low | DONE |
| 30 | Multi-upload hint | UploadSection | High | DONE |
| 31 | Admin panel help / instruction icon | Dashboard header | High | DONE |
| 32 | App version display | Footer + Header | Medium | DONE |
| 33 | Responsive design audit & fixes | Global | High | TODO |
| 34 | Background image/gradient | Listener page | Medium | TODO |

---

### Backlog (Deferred)

| # | Feature | Area | Priority | Notes |
|---|---------|------|----------|-------|
| 12 | Listener count (real-time) | Backend + Frontend | High | Needs backend socket counter |
| 13 | Playlist view for listeners | Listener page | Medium | Read-only "Up Next" panel |
| 22 | Deploy to KVTP website | Infrastructure | High | Waiting on Ankit Bhai for hosting/domain details |
