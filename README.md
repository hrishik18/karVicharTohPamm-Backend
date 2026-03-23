# KarVichar TohPamm — Backend

Node.js + Express API server for the KarVichar TohPamm online radio platform.

## Features

- **JWT Auth** — Register/login with bcrypt hashing
- **Radio State** — In-memory music/speaker mode with live toggle
- **Persistent Playlist** — MongoDB-backed song queue (max 100) with reorder, edit, add, remove
- **Continuous Playback** — Server-authoritative queue rotation with auto-advance fallback
- **File Upload** — Multi-file upload (max 10) to Azure Blob Storage
- **Real-Time Events** — Socket.io broadcast of status and playlist changes

## Tech Stack

Express, Mongoose, Socket.io, @azure/storage-blob, bcryptjs, jsonwebtoken, multer

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Azure Storage account

### Install & Run

```bash
npm install
npm run dev      # development (nodemon)
npm start        # production
```

Server starts on `http://localhost:5000`.

### Seed Admin

```bash
npm run seed
```

Idempotent — creates admin user only if it doesn't exist.

### Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
JWT_SECRET=<your-secret>
STREAM_URL=<caster-fm-stream-url>
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_CONTAINER_NAME=songs
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
```

## Project Structure

```
├── server.js              # App entry, MongoDB connect, route mounting, Socket.io init
├── config/cors.js         # CORS origins from env
├── middleware/auth.js      # JWT protect middleware
├── models/
│   ├── User.js            # User schema (email, hashed password)
│   └── Song.js            # Song schema (title, url, duration, order)
├── modules/
│   ├── radio/             # Radio routes, controller, service (state + queue logic)
│   └── upload/            # Upload routes, controller, service (Azure Blob)
├── socket/index.js        # Socket.io setup + song-ended listener
├── controllers/           # Auth + stream status handlers
├── routes/                # Auth + stream routes
└── scripts/seed-admin.js  # Admin user seeder
```

### Quick Reference

**Public:** `GET /api/health`, `/api/radio/status`, `/api/radio/playlist`, `/api/radio/current`, `/api/stream/status`

**Admin (JWT):** `POST /api/admin/live`, `/api/admin/live/stop`, `/api/admin/song`, `/api/admin/song/playlist`, `/api/admin/song/play`, `/api/admin/song/reorder`, `/api/admin/upload` | `DELETE /api/admin/song/:id` | `PATCH /api/admin/song/:id`

**Auth:** `POST /api/auth/register`, `/api/auth/login`

## Deployment

Deployed to Azure App Service via GitHub Actions. Post-deploy CI/CD step runs `npm run seed`.
