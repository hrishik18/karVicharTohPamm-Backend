# KarVicharTohPamm — API & Data Contract

> **⚠️ COPILOT NOTE: Read this file BEFORE making any changes to frontend or backend.**
> This is the single source of truth for API contracts, data shapes, and expected behavior.
> Any code change must stay aligned with this contract. If this contract needs updating, update it first, then update the code.

---

## 1. Authentication

### POST `/api/auth/register`
- **Auth:** None
- **Request:**
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response `201`:**
  ```json
  { "success": true, "token": "string (JWT)" }
  ```
- **Error `400`:**
  ```json
  { "success": false, "error": "string" }
  ```

### POST `/api/auth/login`
- **Auth:** None
- **Request:**
  ```json
  { "email": "string", "password": "string" }
  ```
- **Response `200`:**
  ```json
  { "success": true, "token": "string (JWT)" }
  ```
- **Error `401`:**
  ```json
  { "success": false, "message": "Invalid credentials" }
  ```

### JWT Details
- **Signing secret:** `process.env.JWT_SECRET`
- **Expiry:** `36500d` (100 years — effectively never expires)
- **Payload:** `{ id: <MongoDB ObjectId> }`
- **Header format:** `Authorization: Bearer <token>`

---

## 2. Public Endpoints (No Auth)

### GET `/api/health`
- **Response `200`:**
  ```json
  { "status": "ok" }
  ```

### GET `/api/stream/status`
- **Response `200`:**
  ```json
  { "isLive": "boolean", "streamUrl": "string" }
  ```
- **Behavior:** Returns `isLive: true` only on Sundays 8 AM–11 AM UTC.

### GET `/api/radio/status`
- **Response `200`:**
  ```json
  {
    "mode": "music" | "speaker",
    "currentSpeaker": "true | null",
    "currentTrack": "Track | null",
    "startTime": "number (unix seconds) | null",
    "streamUrl": "string"
  }
  ```

### GET `/api/radio/playlist`
- **Response `200`:**
  ```json
  [
    {
      "id": "string (MongoDB ObjectId)",
      "title": "string",
      "url": "string (Azure blob URL)",
      "duration": "number (seconds) | null",
      "order": "number (1-based display order)"
    }
  ]
  ```

### GET `/api/radio/current`
- **Response `200`:**
  ```json
  {
    "track": "Track | null",
    "startTime": "number (unix seconds) | null"
  }
  ```

---

## 3. Admin Endpoints (JWT Protected)

All routes below require `Authorization: Bearer <token>` header.
On missing/invalid token: **`401`** `{ "message": "Not authorized, no token" }` or `{ "message": "Not authorized, token failed" }`.

### POST `/api/admin/live`
Go live with a speaker. Sets `currentSpeaker: true` (boolean flag, not a name).
- **Request:** (empty body — no `name` field needed)
- **Response `200`:**
  ```json
  {
    "mode": "speaker",
    "currentSpeaker": true,
    "currentTrack": null,
    "startTime": null,
    "streamUrl": "string"
  }
  ```

### POST `/api/admin/live/stop`
Stop live speaker, return to music mode.
- **Request:** (empty)
- **Response `200`:**
  ```json
  {
    "mode": "music",
    "currentSpeaker": null,
    "currentTrack": null,
    "startTime": null,
    "streamUrl": "string"
  }
  ```

### POST `/api/admin/song`
Set the current playing song (ephemeral — does not persist to playlist).
- **Request:**
  ```json
  { "title": "string", "url": "string", "duration": "number | null" }
  ```
- **Response `200`:**
  ```json
  {
    "mode": "music",
    "currentTrack": { "id": "string (uuid)", "title": "string", "url": "string", "duration": "number | null" },
    "startTime": "number (unix seconds)",
    "streamUrl": "string"
  }
  ```

### POST `/api/admin/song/playlist`
Add a song to the persistent playlist.
- **Request:**
  ```json
  { "title": "string", "url": "string", "duration": "number | null" }
  ```
- **Response `201`:**
  ```json
  { "id": "string", "title": "string", "url": "string", "duration": "number | null", "order": "number (0-based position)" }
  ```
- **Limit:** Max 100 songs in playlist.

### DELETE `/api/admin/song/:id`
Remove a song from the playlist.
- **Response `200`:**
  ```json
  { "message": "Song removed" }
  ```
- **Side effect:** If the removed song was currently playing, the backend auto-advances to the next song in the queue (or stops if empty). Emits `status-update` and `playlist-update`.

### PATCH `/api/admin/song/:id`
Edit a song in the playlist.
- **Request:** (partial update — any subset of fields)
  ```json
  { "title?": "string", "url?": "string", "duration?": "number | null" }
  ```
- **Response `200`:**
  ```json
  { "id": "string", "title": "string", "url": "string", "duration": "number | null", "order": "number (0-based position)" }
  ```

### POST `/api/admin/song/play`
Play a specific song from the playlist.
- **Request:**
  ```json
  { "id": "string" }
  ```
- **Response `200`:**
  ```json
  {
    "mode": "music",
    "currentTrack": { "id": "string", "title": "string", "url": "string", "duration": "number | null" },
    "startTime": "number (unix seconds)",
    "streamUrl": "string"
  }
  ```

### POST `/api/admin/song/reorder`
Move a song up or down in the playlist.
- **Request:**
  ```json
  { "id": "string", "direction": "up" | "down" }
  ```
- **Response `200`:** Updated playlist array
  ```json
  [
    { "id": "string", "title": "string", "url": "string", "duration": "number | null", "order": "number (0-based position)" }
  ]
  ```
- **Side effect:** If the reordered song ends up at **position 0** (top of queue), and it's different from the current track, it starts playing immediately. A `status-update` socket event is emitted alongside the `playlist-update`.

### POST `/api/admin/song/move`
Move a song directly to a specific index in the playlist (atomic, single broadcast).
- **Request:**
  ```json
  { "id": "string", "toIndex": "number (0-based target position)" }
  ```
- **Response `200`:** Updated playlist array
  ```json
  [
    { "id": "string", "title": "string", "url": "string", "duration": "number | null", "order": "number (0-based position)" }
  ]
  ```
- **Side effect:** If the song ends up at **position 0** (top of queue), it starts playing immediately. If the song was at position 0 and moved away, the new position-0 song starts playing. A `status-update` socket event is emitted alongside the `playlist-update`.

### POST `/api/admin/song/bulk-remove`
Remove multiple songs from the playlist at once.
- **Request:**
  ```json
  { "ids": ["string"] }
  ```
- **Response `200`:**
  ```json
  { "message": "N song(s) removed" }
  ```
- **Side effect:** If the currently playing song is among the removed IDs, playback stops and `status-update` is emitted. A `playlist-update` socket event is emitted.

### POST `/api/admin/song/shuffle`
Randomly shuffle the order of all songs in the playlist.
- **Request:** *(empty body)*
- **Response `200`:** Updated playlist array
  ```json
  [
    { "id": "string", "title": "string", "url": "string", "duration": "number | null", "order": "number (0-based position)" }
  ]
  ```
- **Side effect:** `playlist-update` socket event is emitted.
- **Current playback rule:** In music mode, shuffle also updates the current playing song to the new **position 0** track after the shuffle completes. A `status-update` socket event is emitted so clients move the live banner to that new top track.

### POST `/api/admin/upload`
Upload audio files to Azure Blob Storage (up to 10 files at once).
- **Content-Type:** `multipart/form-data`
- **Field name:** `files` (array)
- **Max files:** 10
- **Allowed MIME types:** `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`, `audio/webm`
- **Max file size:** 100 MB per file
- **Response `200`:**
  ```json
  {
    "message": "Upload successful",
    "results": [
      { "originalName": "string", "url": "string (Azure blob URL)" }
    ]
  }
  ```
- **Error `400`:** `{ "message": "No files provided" }` or MIME/size/count error
- **Error `500`:** `{ "message": "error details" }`

---

## 4. Data Models

### User
| Field    | Type   | Required | Notes                         |
|----------|--------|----------|-------------------------------|
| email    | String | Yes      | Unique                        |
| password | String | Yes      | Hashed with bcrypt (salt: 10) |

**Methods:** `matchPassword(entered)` → `boolean`

### Song
| Field     | Type   | Required | Default | Notes                    |
|-----------|--------|----------|---------|--------------------------|
| title     | String | Yes      | —       |                          |
| url       | String | Yes      | —       | Azure blob URL           |
| duration  | Number | No       | null    | In seconds               |
| order     | Number | No       | 0       | Playlist position        |
| createdAt | Date   | Auto     | —       | Mongoose timestamps      |
| updatedAt | Date   | Auto     | —       | Mongoose timestamps      |

### Track (in-memory, not persisted)
```json
{
  "id": "string",
  "title": "string",
  "url": "string",
  "duration": "number | null"
}
```

### Radio State (persisted to MongoDB via `RadioState` model)
In-memory state is the primary source during runtime, but it is **persisted to MongoDB** on every change so it survives server restarts and Azure App Service sleep cycles.

| Field           | Type              | Notes                                   |
|-----------------|-------------------|-----------------------------------------|
| mode            | `"music"` or `"speaker"` | Current playback mode            |
| currentTrackId  | String or null    | MongoDB `_id` of the playing song       |
| startTime       | Number or null    | Unix seconds when the track started     |

On server boot, `initPlayback()` restores the last persisted state from MongoDB. If the persisted song has expired (elapsed > duration), it auto-advances to the next song.

```json
{
  "mode": "music" | "speaker",
  "currentSpeaker": "string | null",
  "currentTrack": "Track | null",
  "startTime": "number (unix seconds) | null"
}
```

---

## 5. Socket.IO Events

### Server → Client

| Event              | Payload                                                  | Triggered By                                      |
|--------------------|----------------------------------------------------------|---------------------------------------------------|
| `status-update`    | `{ mode, currentSpeaker, currentTrack, startTime, streamUrl }` | On connection + any state change (live/stop/play) |
| `playlist-update`  | `Song[]` (full playlist array)                          | Song added/removed/reordered/edited               |

### Client → Server

| Event         | Payload                            | Behavior                                                        |
|---------------|------------------------------------|-----------------------------------------------------------------|
| `song-ended`  | `{ id: "string (song id)" }`      | Notifies backend that a song finished. Backend rotates queue and plays next. |

Clients emit `song-ended` when the HTML5 `<audio>` `ended` event fires. Only the first client to report for a given track triggers the advance.

### Socket Config
- **Namespace:** `/` (default)
- **CORS origins:** Same as `CORS_ORIGINS` env var
- **Transports:** WebSocket + polling fallback

---

## 6. Frontend Auth Flow

1. User enters email/password on `/admin/login`
2. Frontend calls `POST /api/auth/login`
3. On success, JWT stored in `localStorage` as key `karvichar_token`
4. All subsequent API calls attach `Authorization: Bearer <token>` via axios interceptor
5. On 401 response, token is removed and user redirected to `/admin/login`
6. `isAuthenticated()` checks `!!localStorage.getItem('karvichar_token')`

---

## 7. Frontend Upload Flow

1. Admin selects audio file in `UploadSection`
2. Frontend calls `POST /api/admin/upload` with `FormData` (field: `file`)
3. Backend multer validates MIME type + file size
4. Backend uploads file buffer to Azure Blob Storage
5. Backend returns `{ message, url }` with the blob URL
6. Frontend extracts audio duration from the file client-side
7. Frontend derives title from filename
8. Frontend calls `POST /api/admin/song/playlist` with `{ title, url, duration }`
9. Song appears in playlist via `playlist-update` socket event

---

## 8. Environment Variables

### Backend (`karVicharTohPamm-Backend/.env`)
| Variable                          | Required | Default                                      |
|-----------------------------------|----------|----------------------------------------------|
| `PORT`                            | No       | `5000`                                       |
| `NODE_ENV`                        | No       | —                                            |
| `MONGO_URI`                       | Yes      | —                                            |
| `MONGO_URI_DEV`                   | No       | —                                            |
| `JWT_SECRET`                      | Yes      | —                                            |
| `STREAM_URL`                      | Yes      | —                                            |
| `CASTER_HOST`                     | No       | —                                            |
| `CASTER_PORT`                     | No       | —                                            |
| `CASTER_MOUNT`                    | No       | —                                            |
| `CASTER_PASSWORD`                 | No       | —                                            |
| `CORS_ORIGINS`                    | No       | `http://localhost:3000,http://localhost:5173` |
| `AZURE_STORAGE_CONNECTION_STRING` | Yes      | —                                            |
| `AZURE_CONTAINER_NAME`            | No       | `songs`                                      |

### Frontend (`karVichartohPamm/.env`)
| Variable               | Required | Default                 |
|------------------------|----------|-------------------------|
| `REACT_APP_API_URL`    | No       | `http://localhost:5000` |
| `REACT_APP_STREAM_URL` | No       | —                       |

---

## 9. Middleware Stack

| Middleware       | Scope                          | Behavior                                               |
|------------------|--------------------------------|--------------------------------------------------------|
| **CORS**         | Global                         | Allows origins from `CORS_ORIGINS` env                 |
| **express.json** | Global                         | Parses JSON request bodies                             |
| **JWT protect**  | All `/api/admin/*` routes      | Validates Bearer token, attaches `req.user`            |
| **Multer**       | `POST /api/admin/upload` only  | Memory storage, 10 MB limit, audio MIME filter         |

---

## 10. Continuous Playback & Queue Rotation

### Behavior
- Songs play **continuously** in playlist order. When a song ends, the next song in the queue starts automatically.
- When a song finishes, it is **moved to the end of the queue** (last position). This creates an infinite loop through the playlist.
- The backend is the **single source of truth** for which song is playing. Frontends do not independently advance — they notify the backend.

### Socket Event: `song-ended` (Client → Server)
- **Payload:** `{ "id": "string (song id that just ended)" }`
- **Behavior:** The backend:
  1. Moves the ended song to the last position in the playlist (highest order)
  2. Plays the next song in the queue (now the first song in the updated playlist)
  3. Emits `status-update` with the new current track
  4. Emits `playlist-update` with the rotated playlist
- **Guard:** Only the **first** client to send `song-ended` for a given track triggers the advance. Subsequent duplicates for the same track are ignored.

### Auto-Advance Flow
1. Backend sets `currentTrack` and `startTime`, emits `status-update`
2. All listeners play the track with sync offset
3. When the `<audio>` `ended` event fires, the listener emits `song-ended` via socket
4. Backend rotates the queue: moves ended song to last, plays the next song
5. All listeners receive `status-update` with the new track and `playlist-update` with rotated order
6. Repeat from step 2

### Edge Cases
- If the playlist has only 1 song, it replays (moved to end = still only song = plays again)
- If the playlist is empty, no track plays (`currentTrack: null`)
- In `speaker` mode, `song-ended` events are ignored
- Backend timer fallback: if no client sends `song-ended` within `duration + 5` seconds, the backend auto-advances (handles case where all listeners disconnect)

### Auto-Resume on Server Boot (Persistent State)
- Radio state (`mode`, `currentTrackId`, `startTime`) is **persisted to MongoDB** on every state change via the `RadioState` singleton document.
- On startup, `initPlayback()` restores the last persisted state from MongoDB — not a random pick.
- If the persisted song's elapsed time exceeds its duration (server was down longer than the song), it **auto-advances** to the next song in the queue.
- If the persisted song was deleted while the server was down, playback falls back to the first song in the queue.
- If there is no persisted state (first boot), the first song in the playlist starts from the beginning.
- This ensures continuity across Azure App Service sleep/wake cycles, deploys, and process restarts.

---

## 11. Frontend Routes

| Path            | Component         | Auth Required |
|-----------------|-------------------|---------------|
| `/`             | Home (Listener)   | No            |
| `/admin/login`  | Login             | No            |
| `/admin`        | Dashboard         | Yes           |
| `/debug`        | DebugPage         | No            |
