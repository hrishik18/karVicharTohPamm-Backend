    # Backend Specification – Online Radio Platform

    ## IMPORTANT

    * Do NOT implement audio streaming in backend
    * Use external stream URL from Caster.fm
    * Backend only manages state, control, and metadata
    * Do NOT rewrite existing backend — extend it with a radio module

    ---

    ## 🎯 Goal

    Extend the existing Node.js + MongoDB + JWT backend with a **radio control module** that manages stream state and metadata via in-memory store and WebSocket.

    ---

    ## 🧱 Tech Stack (Existing + New)

    ### Existing (Do Not Remove)
    * Node.js + Express.js
    * MongoDB + Mongoose (User model, auth)
    * JWT Authentication (bcryptjs, jsonwebtoken)
    * dotenv

    ### New Additions
    * Socket.io (WebSocket for real-time state broadcast)
    * cors (configurable CORS)
    * uuid (unique IDs for queue items)
    * @azure/storage-blob (Azure Blob Storage SDK for song uploads)
    * multer (multipart file upload handling, memory storage)

    ---

    ## 🌍 Environment Variables

    ### Existing
    ```
    PORT=5000
    MONGO_URI=<mongodb-connection-string>
    JWT_SECRET=<jwt-secret>
    ```

    ### New (Radio Module)
    ```
    STREAM_URL=http://<caster-host>:<port>/R5a6I
    CASTER_HOST=<host>
    CASTER_PORT=<port>
    CASTER_MOUNT=/R5a6I
    CASTER_PASSWORD=<password>
    CORS_ORIGINS=http://localhost:3000,http://localhost:5173
    ```

    ### New (Azure Blob Storage – Song Upload)
    ```
    AZURE_STORAGE_CONNECTION_STRING=<connection-string>
    AZURE_CONTAINER_NAME=songs
    ```

    ---

    ## 🧠 Radio Module – Core Concept

    The radio module manages (in-memory, no DB):

    * Current mode: `"music"` or `"speaker"`
    * Current speaker name (label for who is speaking live)
    * Current track (title + url + duration)
    * **Start time** — Unix timestamp (seconds) of when the current track began playing (enables sync)
    * Playlist of songs (ordered queue, used for sequential playback on frontend)

    ### Speaker Mode = Live Toggle (NOT a queue)

    Speaker mode means the admin is **live broadcasting their voice** through the phone mic → Caster.fm → all listeners.
    When a speaker goes live, music stops and all listeners hear the speaker's voice through the Caster.fm stream.
    There is NO speaker queue — it's a simple on/off toggle:
    * `POST /api/admin/live` → go live (set speaker name, switch to speaker mode, music stops)
    * `POST /api/admin/live/stop` → stop live (switch back to music mode)

    ### Phase 1: Dynamic Playlist + Optional Sync

    The backend maintains a playlist of songs and a "now playing" state with a `startTime`.
    When admin sets a song (directly or from queue), `startTime` is set to `Math.floor(Date.now() / 1000)`.
    The frontend uses `startTime` to optionally sync playback across listeners by seeking to the correct offset.
    **No streaming server or FFmpeg is required** — each listener plays audio files directly via HTML5 Audio API.
    The playlist auto-advances on the frontend (not backend). Backend only tracks what is "now playing".

    ---

    ## 📦 Data Models (In-Memory)

    ### Radio State

    ```json
    {
    "mode": "music",
    "currentSpeaker": null,
    "currentTrack": null,
    "startTime": null
    }
    ```

    * `startTime` — Unix timestamp (seconds) set when a track starts playing. `null` when no track or in speaker mode.

    ### Song (Queue/Playlist Item)

    ```json
    {
    "id": "uuid",
    "title": "string",
    "url": "string",
    "duration": 210
    }
    ```

    * `duration` — length in seconds. Optional (`null` if not provided). Used by frontend for sync offset calculation and auto-advance.
    * `order` — 1-based position in playlist (computed on read, not stored).

    ### Speaker (Live State — NOT a queue item)

    Speaker is just a label stored in `state.currentSpeaker` (string or null).
    No separate data model — when a speaker goes live, their name is set directly in state.

    ---

    ## 📁 Folder Structure (Radio Module)

    All radio-related files MUST live inside `modules/radio/`. No radio logic outside this folder.
    All upload-related files MUST live inside `modules/upload/`.

    ```
    karVicharTohPamm-Backend/
    modules/
        radio/
        radio.service.js       # In-memory state + queue management + consistency rules
        radio.controller.js    # Request handlers (public + admin)
        radio.routes.js        # Route definitions (public /api/radio/* + admin /api/admin/*)
        upload/
        upload.service.js      # Azure Blob Storage upload logic
        upload.controller.js   # Request handler for file upload
        upload.routes.js       # Route definition (POST /api/admin/upload)
    socket/
        index.js               # Socket.io setup + broadcast helper
    ```

    ---

    ## 🔌 REST APIs

    ### Public Routes (No Auth) — `/api/radio`

    #### GET /api/radio/status

    Returns current radio state + stream URL + start time.

    Response:
    ```json
    {
    "mode": "music",
    "currentSpeaker": null,
    "currentTrack": { "id": "...", "title": "...", "url": "...", "duration": 210 },
    "startTime": 1711020000,
    "streamUrl": "http://<caster-host>:<port>/R5a6I"
    }
    ```

    #### GET /api/radio/playlist

    Returns the full song playlist in order.

    Response:
    ```json
    [
    { "id": "uuid", "title": "...", "url": "...", "duration": 210, "order": 1 },
    { "id": "uuid", "title": "...", "url": "...", "duration": 180, "order": 2 }
    ]
    ```

    #### GET /api/radio/current

    Returns the currently playing track and its start time (used for sync).

    Response:
    ```json
    {
    "track": { "id": "...", "title": "...", "url": "...", "duration": 210 },
    "startTime": 1711020000
    }
    ```

    * `track` is `null` when nothing is playing or in speaker mode.
    * `startTime` is `null` when no track is active.

    ---

    ### Admin Routes (JWT Protected) — `/api/admin`

    #### POST /api/admin/live

    Go live as speaker. Admin speaks through phone mic → encoder → Caster.fm → all listeners.
    Music stops. Switches to speaker mode, clears currentTrack.

    Body:
    ```json
    { "name": "Speaker Name" }
    ```

    #### POST /api/admin/live/stop

    Stop live broadcast. Switches back to music mode, clears currentSpeaker.

    Body: none

    #### POST /api/admin/song

    Set current track directly (switches mode to "music" automatically, clears currentSpeaker).
    Also sets `startTime = Math.floor(Date.now() / 1000)` for sync.

    Body:
    ```json
    { "title": "string", "url": "string", "duration": 210 }
    ```

    * `duration` is optional. If provided, must be a positive number (seconds).

    ---

    ### Playlist Management Routes (JWT Protected) — `/api/admin`

    #### POST /api/admin/song/playlist

    Add a song to the playlist.

    Body:
    ```json
    { "title": "string", "url": "string", "duration": 210 }
    ```

    * `duration` is optional. If provided, must be a positive number (seconds).
    * Queue is capped at 100 songs.

    Response:
    ```json
    { "id": "uuid", "title": "...", "url": "...", "duration": 210 }
    ```

    #### DELETE /api/admin/song/:id

    Remove a song from the queue by its UUID.

    Response:
    ```json
    { "message": "Song removed" }
    ```

    #### PATCH /api/admin/song/:id

    Edit properties of an existing song in the queue. All fields optional — only provided fields are updated.

    Body:
    ```json
    { "title": "new title", "url": "new url", "duration": 180 }
    ```

    Response: Updated song object.
    ```json
    { "id": "uuid", "title": "...", "url": "...", "duration": 180 }
    ```

    Validation:
    * Song must exist in queue (404 if not found)
    * At least one field must be provided (400 if empty)
    * `title` and `url` must be non-empty strings if provided
    * `duration` must be positive number if provided, or `null` to clear

    #### POST /api/admin/song/reorder

    Move a song up or down in the playlist queue.

    Body:
    ```json
    { "id": "uuid", "direction": "up" | "down" }
    ```

    Response: Updated playlist array (same format as `GET /api/radio/playlist`).

    Behavior:
    * `"up"` = swap with previous item; no-op if already first
    * `"down"` = swap with next item; no-op if already last
    * Broadcasts `playlist-update` after reorder

    #### POST /api/admin/song/play

    Pick a song from the playlist to play now. Sets it as currentTrack, switches to music mode, clears currentSpeaker, sets `startTime`.

    Body:
    ```json
    { "id": "uuid" }
    ```

    Response: Updated radio state (includes `startTime`).

    ---

    ### Song Upload Route (JWT Protected) — `/api/admin`

    #### POST /api/admin/upload

    Upload a song file to Azure Blob Storage and return the public blob URL.

    * Uses `multer` with **memory storage** (no temp files on disk)
    * Accepts multipart form-data with field name: `file`
    * Generates a unique blob name using `uuid` + original extension
    * Sets correct `Content-Type` based on uploaded file MIME type
    * Returns the public URL of the uploaded blob

    Request:
    ```
    Content-Type: multipart/form-data
    Field: file (audio file, e.g. .mp3, .wav, .ogg)
    ```

    Response (200):
    ```json
    {
    "message": "Upload successful",
    "url": "https://<storage-account>.blob.core.windows.net/songs/<uuid>.mp3"
    }
    ```

    Error Responses:
    * `400` — No file provided
    * `500` — Azure upload failure

    ---

    ### Upload Module Architecture (`modules/upload/`)

    #### upload.service.js

    Responsible for Azure Blob Storage interaction:

    1. Initialize `BlobServiceClient` from `AZURE_STORAGE_CONNECTION_STRING`
    2. Get container client using `AZURE_CONTAINER_NAME`
    3. Generate unique blob name: `<uuid>.<original-extension>`
    4. Upload file buffer via `blockBlobClient.uploadData()`
    5. Set `blobHTTPHeaders.blobContentType` to the file's MIME type
    6. Return `blockBlobClient.url`

    #### upload.controller.js

    Request handler:
    * Validate `req.file` exists (return 400 if missing)
    * Call `upload.service.uploadToBlob(file)`
    * Return `{ message, url }`
    * Catch and return errors with 500

    #### upload.routes.js

    * Configure multer: `multer({ storage: multer.memoryStorage() })`
    * Mount: `POST /` with `protect` middleware + `multer.single('file')` + controller
    * Mounted in `server.js` as `/api/admin/upload`

    ---

    ### Upload → Song Flow (Admin Panel Integration)

    The intended workflow is:

    1. Admin uploads file via `POST /api/admin/upload` → gets blob URL
    2. Admin calls `POST /api/admin/song` with `{ title, url: blobUrl }` → sets current track
    3. OR admin calls `POST /api/admin/song/playlist` with `{ title, url: blobUrl }` → adds to playlist

    The upload endpoint is decoupled from the radio module — it only returns a URL.
    The radio module does not know or care where the URL comes from.

    ---

    ### Health Check (No Auth)

    #### GET /api/health

    Simple health/readiness endpoint for Azure App Service.

    Response:
    ```json
    { "status": "ok" }
    ```

    ---

    ## 🔄 WebSocket Events

    ### Event: `status-update`

    Emitted to all connected clients whenever mode, speaker, or song changes.

    Payload (MUST include `streamUrl` and `startTime` in every emission):
    ```json
    {
    "mode": "music",
    "currentSpeaker": "...",
    "currentTrack": { "id": "...", "title": "...", "url": "...", "duration": 210 },
    "startTime": 1711020000,
    "streamUrl": "http://<caster-host>:<port>/R5a6I"
    }
    ```

    * `startTime` is set when a track begins. `null` in speaker mode or when nothing is playing.
    * This payload must be consistent across ALL status-update emissions (mode change, speaker change, song change, select from queue).

    ### Event: `playlist-update`

    Emitted to all connected clients whenever a song is added to or removed from the playlist queue.

    Payload:
    ```json
    [
    { "id": "uuid", "title": "...", "url": "...", "duration": 210, "order": 1 },
    { "id": "uuid", "title": "...", "url": "...", "duration": 180, "order": 2 }
    ]
    ```

    This is the same format as `GET /api/radio/playlist`.

    ---

    ## 🧩 Architecture Requirements

    * **Extend, don't rewrite** — existing auth, user model, and routes remain untouched
    * Radio module is fully self-contained under `modules/radio/` (controller, service, routes — NO radio files outside this folder)
    * Upload module is fully self-contained under `modules/upload/` (controller, service, routes — NO upload files outside this folder)
    * Upload module is **decoupled** from radio module — it only returns a URL, radio module consumes URLs regardless of source
    * Socket.io initialized in `socket/index.js`, attached to existing HTTP server
    * Radio admin routes defined in `modules/radio/radio.routes.js` and mounted via `server.js`
    * Upload admin route defined in `modules/upload/upload.routes.js` and mounted via `server.js`
    * CORS configured via environment variable `CORS_ORIGINS`
    * All radio state changes broadcast via WebSocket

    ---

    ## 🔒 State Consistency Rules (Enforced in `radio.service.js`)

    The following invariants MUST be enforced by the service layer:

    1. **Going live** (`POST /live`) → sets `mode = "speaker"`, sets `currentSpeaker`, clears `currentTrack = null` and `startTime = null`
    2. **Stopping live** (`POST /live/stop`) → sets `mode = "music"`, clears `currentSpeaker = null`
    3. **Setting a song** → sets `mode = "music"`, clears `currentSpeaker = null`, sets `startTime = Math.floor(Date.now() / 1000)`
    4. **Mutual exclusivity** → only ONE of `currentSpeaker` or `currentTrack` can be non-null at any time
    5. **Play from playlist** → same rules as setting a song: clears speaker, sets startTime
    6. **Playlist cap** → playlist is capped at 100 songs; reject with error when full

    ---

    ## 🔐 Authentication

    * **Keep existing JWT system** (register/login + protect middleware)
    * Public routes (`/api/radio/*`) — open, no auth
    * Admin routes (`/api/admin/*`) — JWT protected via existing `protect` middleware

    ---

    ## 🎧 Streaming

    * Audio streaming is NOT handled by backend
    * Audio flows: Encoder → Caster.fm → Listeners
    * Backend only serves the `STREAM_URL` and manages metadata

    ---

    ## 🚀 Deployment

    * Backend: Azure App Service (use `GET /api/health` for readiness probe)
    * Frontend/Admin: Static hosting (Vercel / Netlify / Azure Static Web Apps)
    * Streaming: Caster.fm

    ---

    ## ⚠️ Constraints

    * Do NOT implement audio streaming in backend
    * Do NOT remove existing MongoDB or JWT auth
    * Keep admin routes JWT-protected, public routes open
    * Keep in-memory state for radio module (no DB)
    * Maintain clean modular architecture
    * Ensure consistency with existing middleware and error handling patterns
    * Playlist auto-advance is handled by the **frontend only** — backend does NOT auto-advance songs
    * Backend sets `startTime` when a song starts; frontend uses it for optional sync
    * Azure Blob Storage integration must be isolated in `modules/upload/` — do NOT mix with radio logic
    * Upload route must validate file presence before attempting Azure upload

    ---

    ## 📋 Full API Summary

    | Method | Endpoint                    | Auth     | Description                        |
    |--------|------------------------------|----------|------------------------------------| 
    | GET    | /api/health                  | No       | Health check / readiness probe     |
    | GET    | /api/radio/status            | No       | Current radio state + stream URL + startTime |
    | GET    | /api/radio/playlist          | No       | Full song playlist in order        |
    | GET    | /api/radio/current           | No       | Now playing track + startTime (sync) |
    | POST   | /api/admin/live              | JWT      | Go live as speaker (music stops)   |
    | POST   | /api/admin/live/stop         | JWT      | Stop live, back to music mode      |
    | POST   | /api/admin/song              | JWT      | Set current song + startTime       |
    | POST   | /api/admin/song/playlist     | JWT      | Add song to playlist               |
    | DELETE | /api/admin/song/:id          | JWT      | Remove song from playlist          |
    | PATCH  | /api/admin/song/:id          | JWT      | Edit song properties in playlist   |
    | POST   | /api/admin/song/reorder      | JWT      | Move song up/down in playlist      |
    | POST   | /api/admin/song/play         | JWT      | Pick from playlist → play now      |
    | POST   | /api/admin/upload            | JWT      | Upload song file to Azure Blob     |

    ---
