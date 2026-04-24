# Admin Panel Specification – Radio Control Dashboard

## IMPORTANT

* This panel controls backend state only
* It does NOT stream audio
* It sends commands to backend APIs

---

## 🎯 Goal

Build a React-based admin panel to control radio:

---

## 🧱 Tech Stack

* React
* Axios
* Socket.io-client

---

## 🌍 Config

```
REACT_APP_API_URL=http://localhost:5000
```

---

## 🎛️ Features

### Dashboard

* Show current mode
* Show active speaker
* Show current song

---

### Mode Control

Switch between:

* Music
* Speaker

---

### Speaker Management

* Set current speaker
* Input speaker name

---

### Song Management

* Add song (title + URL)
* View song queue

---

### Song Upload (Azure Blob Storage)

* Upload song file directly from admin panel
* File is stored in Azure Blob Storage via backend
* After upload, blob URL is returned and auto-populated into song form

#### Upload Flow

1. Admin selects audio file via file input
2. Admin clicks "Upload" button
3. Frontend sends `POST /api/admin/upload` with `FormData` (field: `file`)
4. Backend uploads to Azure Blob Storage, returns `{ message, url }`
5. Returned `url` is auto-populated into the song form's URL field
6. Admin optionally edits title (defaults to filename without extension)
7. Admin submits song via existing `POST /api/admin/song` or `POST /api/admin/song/queue`

---

## 📄 Pages

### Dashboard Page

* Current status
* Mode toggle

---

### Queue Page

* List songs
* Add song

---

## 🧩 Components

* ModeToggle
* SpeakerForm
* SongForm
* QueueList
* UploadSong — file input + upload button, integrates with SongForm

---

## 🔌 API Integration

### POST /api/admin/mode

### POST /api/admin/speaker

### POST /api/admin/song

### POST /api/admin/song/queue

### DELETE /api/admin/song/:id

### POST /api/admin/speaker/queue

### POST /api/admin/song/select

### POST /api/admin/speaker/select

### POST /api/admin/upload — multipart/form-data, field: `file`

### GET /api/radio/status

### GET /api/radio/queue

---

## 🔄 WebSocket

* Listen to "status-update"
* Update dashboard in real-time

---

## 🎨 UI Requirements

* Mobile-friendly (important)
* Simple controls
* Fast interactions

---

## 🚀 Deliverables

Claude should generate:

* Full React admin app
* Pages and components
* API integration
* WebSocket support
* Clean UI

---
