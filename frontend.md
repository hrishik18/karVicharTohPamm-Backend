# Frontend Specification – KVTP (Listener + Admin)

## IMPORTANT

* Do NOT handle audio streaming logic
* Use stream URL from backend (preferred) or environment (fallback)
* Focus on UI + playback
* Do NOT autoplay audio — require user interaction
* Admin and public logic are strictly separated (different folders, different components)

---

## 🎯 Goal

Build a single React app where:

* **Listeners** can listen to live radio, see current speaker/song, and receive real-time updates
* **Admins** can log in, control mode, manage song/speaker queues, upload songs, and see live status

---

## 🏷️ Branding

* **App Name:** KVTP
* **Tagline:** "Listen. Reflect. Evolve."

---

## 🧱 Tech Stack

* React (CRA — existing project, do NOT migrate to Vite)
* React Router DOM (route-based access control)
* Axios
* Socket.io-client
* Tailwind CSS

---

## 🌍 Config

```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STREAM_URL=http://<caster-host>:<port>/R5a6I
```

### Stream URL Strategy

1. **Prefer** `streamUrl` from backend (`GET /api/radio/status` response or `status-update` WebSocket event)
2. **Fallback** to `process.env.REACT_APP_STREAM_URL` if backend doesn't provide one

---

## 🎨 Theme

* **Dark theme**
* Background: `#0f172a`
* Text: `#ffffff`
* Accent: `#22c55e`
* Mobile-first, clean, minimal

---

## 🎵 Features

### Audio Player

* HTML5 `<audio>` element
* Do NOT autoplay on load
* Show large "Tap to Listen" play button
* Start audio only after user interaction
* Play / Pause toggle
* Show buffering/loading state

### Now Playing

Display:

* Mode (music / speaker)
* Current speaker name (when mode = speaker)
* Current song title (when mode = music)

### Real-Time Updates

* Connect via Socket.io to backend
* Listen to `status-update` event
* Update UI instantly on state change

### StatusBanner

Show BOTH:

* WebSocket connection status (connected / reconnecting / disconnected)
* Stream state (live / offline)

### Error Handling

* Auto-reconnect WebSocket on disconnect
* Show temporary UI indicators: "Reconnecting…" / "Connection lost"

---

## 📄 Pages & Routing

```
/               → Listener app (public, no auth)
/admin/login    → Admin login page
/admin          → Admin dashboard (JWT protected)
```

### Home Page (`/`) — Public

* StatusBanner (top)
* Audio player
* Now playing section

### Admin Login (`/admin/login`)

* Email + Password form
* Uses `POST /api/auth/login`
* Stores JWT in localStorage
* Redirects to `/admin` on success

### Admin Dashboard (`/admin`) — Protected

**Layout:** 2-column on desktop (controls left, queues right). Stacked on mobile.

**Left column:**
* Live Control (go live / stop live toggle with speaker name)
* Now Playing live preview
* Upload Song (simple file picker → Azure Blob)

**Right column:**
* Song Playlist — add form + playlist list with expandable actions per item:
  - ▲ Move Up / ▼ Move Down (reorder)
  - ✏️ Edit (inline edit title/url/duration)
  - ▶ Play (select from playlist)
  - 🗑 Remove
* Logout button (header)

---

## 🔐 Authentication

* Uses existing backend JWT auth (`POST /api/auth/login`)
* JWT stored in `localStorage`
* Sent as `Authorization: Bearer <token>` on all admin API calls
* No registration page — admin users created manually
* Protected route component wraps `/admin` — redirects to `/admin/login` if no token

---

## 🧩 Components

### Public (`src/public/`)

* `Home` — listener page with all state management
* `AudioPlayer` — stream playback with play/pause, loading state, auto-retry
* `NowPlaying` — current mode, speaker, or song display
* `StatusBanner` — connection + stream status indicators

### Admin (`src/admin/`)

* `Login` — email/password login form
* `Dashboard` — main admin page with all controls + live preview
* `ProtectedRoute` — JWT guard wrapper
* `api.js` — admin API helper (axios instance with auth interceptor)
* `auth.js` — token get/set/remove utilities

### Admin Components (`src/admin/components/`)

* `LiveControl` — go live (speaker name + button) / stop live toggle
* `NowPlayingAdmin` — current state display (mode badge + title/name)
* `SongQueue` — add song (title+URL+duration), playlist list with expandable per-item actions (move up/down, edit, play, remove)
* `UploadSection` — file picker + upload to Azure Blob, shows uploaded URL

---

## 🔌 API Integration

### Public (no auth)

| Method | Endpoint | Used By |
|---|---|---|
| GET | `/api/radio/status` | Listener + Admin |
| GET | `/api/radio/playlist` | Listener + Admin |
| GET | `/api/radio/current` | Listener |

### Auth

| Method | Endpoint | Used By |
|---|---|---|
| POST | `/api/auth/login` | Admin Login |

### Admin (JWT required)

| Method | Endpoint | Used By |
|---|---|---|
| POST | `/api/admin/live` | LiveControl (Go Live) |
| POST | `/api/admin/live/stop` | LiveControl (Stop Live) |
| POST | `/api/admin/song` | SongQueue (Play Now) |
| POST | `/api/admin/song/playlist` | SongQueue (Add to Playlist) |
| DELETE | `/api/admin/song/:id` | SongQueue (Remove) |
| PATCH | `/api/admin/song/:id` | SongQueue (Edit properties) |
| POST | `/api/admin/song/reorder` | SongQueue (Move Up/Down) |
| POST | `/api/admin/song/play` | SongQueue (Play from Playlist) |
| POST | `/api/admin/upload` | UploadSection |

### GET /api/radio/status

Fetch initial radio state + stream URL on app load.

Response shape:
```json
{
  "mode": "music",
  "currentSpeaker": null,
  "currentTrack": { "id": "...", "title": "...", "url": "..." },
  "streamUrl": "http://<caster-host>:<port>/R5a6I"
}
```

---

## 🔄 WebSocket

Connect to backend (`REACT_APP_API_URL`) via Socket.io.

Listen for:
```
status-update
playlist-update
```

Payload shape (same as GET /api/radio/status):
```json
{
  "mode": "music",
  "currentSpeaker": null,
  "currentTrack": { "id": "...", "title": "...", "url": "..." },
  "streamUrl": "http://<caster-host>:<port>/R5a6I"
}
```

---

## 📱 PWA Support

* Installable as PWA (Add to Home Screen)
* Configured `manifest.json` with app name + theme
* Service worker for offline shell

---

## ⚠️ Constraints

* Do NOT implement audio streaming logic
* Do NOT show song/speaker queue in listener app (only current playing)
* Do NOT autoplay — require user tap
* Do NOT mix admin and public logic in same components
* Use existing CRA project (do NOT scaffold new app)
* Admin routes protected by JWT; public routes open
* Keep admin simple (MVP — no drag-and-drop, no complex animations)

---

## 📦 Deliverables

* Complete React app inside existing CRA project
* Route-based access: `/` (public), `/admin/login`, `/admin` (protected), `/debug`
* Public components: Home, AudioPlayer, NowPlaying, StatusBanner (`src/public/`)
* Admin components: Login, Dashboard, LiveControl, NowPlayingAdmin, SongQueue, UploadSection (`src/admin/`)
* Auth: JWT login, token storage, protected route, axios interceptor
* API integration for all backend endpoints
* WebSocket integration in both listener and admin (live updates)
* Tailwind CSS setup + dark theme styling
* PWA setup (manifest.json, service worker)
* README with run instructions

---

## 📁 Project Structure

```
src/
  public/
    Home.js             — Listener page (API + WebSocket + layout)
    AudioPlayer.js      — Stream playback with play/pause + auto-retry
    NowPlaying.js       — Current mode/speaker/song display
    StatusBanner.js     — Connection + stream status
  admin/
    Login.js            — Admin login page
    Dashboard.js        — Admin dashboard (all controls + live preview)
    ProtectedRoute.js   — JWT route guard
    api.js              — Axios instance with auth interceptor
    auth.js             — Token utilities (get/set/remove)
    components/
      LiveControl.js    — Go Live / Stop Live toggle
      NowPlayingAdmin.js — Live state preview
      SongQueue.js      — Song playlist management
      UploadSection.js  — File upload to Azure Blob
  debug/
    DebugPage.js        — Diagnostics (API status, WS, audio test, env, logs)
  App.js                — Router setup
  index.js              — Entry point + PWA registration
  index.css             — Tailwind directives
```

---
