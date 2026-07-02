# YOLO-video-object-detection — App

A full-stack web application that lets authenticated users upload videos, automatically extracts frames using FFmpeg, runs YOLOv8 object detection on each frame via a Flask ML server, and streams real-time progress back to the browser using Socket.IO.

---

## Tech Stack

### Frontend + Backend (Monolith)
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Full-stack framework — UI and API routes in one |
| **TypeScript** | Type safety across the entire app |
| **Tailwind CSS** | Utility-first styling |
| **NextAuth.js** | Authentication — JWT sessions, Credentials provider |
| **Socket.IO (client)** | Real-time status updates in the browser |

### Backend / API Layer
| Technology | Purpose |
|---|---|
| **Node.js custom server** | Boots Next.js + attaches Socket.IO on the same port |
| **Socket.IO (server)** | Pushes live processing events to connected clients |
| **Mongoose** | MongoDB ODM — schema definition and queries |
| **Multer** | Multipart file upload handling |
| **fluent-ffmpeg** | Node.js wrapper around FFmpeg for frame extraction |
| **bcryptjs** | Password hashing |
| **axios** | HTTP calls from the server to the Flask ML server |

### ML Server
| Technology | Purpose |
|---|---|
| **Python 3.12** | Runtime |
| **Flask** | Lightweight HTTP server exposing the `/detect` endpoint |
| **Flask-CORS** | Cross-origin requests from the Next.js server |
| **Ultralytics YOLOv8** | Pre-trained object detection model (yolov8n) |
| **Pillow** | Image decoding from base64 |

### Database & Storage
| Technology | Purpose |
|---|---|
| **MongoDB** | Primary database — users and video documents |
| **Local filesystem** | Temporary storage for uploaded videos and extracted frames |

---

## Architecture

```
Browser
  │
  │  HTTP + WebSocket
  ▼
┌─────────────────────────────────────────┐
│  Next.js App  (localhost:3000)          │
│                                         │
│  ┌──────────┐   ┌─────────────────────┐ │
│  │  React   │   │   API Routes        │ │
│  │  Pages   │   │  /api/auth/*        │ │
│  │  + UI    │   │  /api/videos        │ │
│  └──────────┘   │  /api/videos/[id]   │ │
│                 └─────────────────────┘ │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  Socket.IO Server                   │ │
│  │  Emits: status, progress events     │ │
│  └─────────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌─────────────────────┐
│   MongoDB    │  │  Flask ML Server    │
│  (port 27017)│  │  (localhost:5000)   │
│              │  │                     │
│  - users     │  │  POST /detect       │
│  - videos    │  │  YOLOv8 inference   │
└──────────────┘  └─────────────────────┘
```

### Processing Pipeline (after upload)
```
Upload MP4/MOV
      │
      ▼
Save to disk (uploads/<uuid>.mp4)
Create Video document { status: "pending" }
      │
      ▼  (async, non-blocking)
FFmpeg extracts frames at 1 fps
→ uploads/frames/<uuid>/frame-0001.png ...
      │  emit: status "extracting"
      ▼
For each frame:
  Read PNG → base64 → POST /detect (Flask)
  Flask runs YOLOv8 → returns objects[]
  Store result
      │  emit: progress { frame, total }
      ▼
Save all results to MongoDB
Update status → "completed"
Delete temp frames
      │  emit: status "completed"
      ▼
Browser renders timeline + bounding boxes
```

---

## Project Structure

```
navasoft/
├── app/                          # Next.js full-stack application
│   ├── server.js                 # Custom Node server (Next.js + Socket.IO)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── [...nextauth]/route.ts   # NextAuth handler
│   │   │   │   │   └── register/route.ts        # User registration
│   │   │   │   └── videos/
│   │   │   │       ├── route.ts                 # GET list / POST upload
│   │   │   │       └── [id]/
│   │   │   │           ├── route.ts             # GET status+results / DELETE
│   │   │   │           └── stream/route.ts      # GET video file (range requests)
│   │   │   ├── dashboard/page.tsx               # Main app page
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── providers.tsx                    # SessionProvider wrapper
│   │   ├── components/
│   │   │   ├── VideoUpload.tsx                  # Drag-and-drop uploader
│   │   │   ├── ProgressTracker.tsx              # Live Socket.IO status
│   │   │   ├── ResultsViewer.tsx                # Timeline + bounding boxes
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── Navbar.tsx
│   │   ├── lib/
│   │   │   ├── db.ts                            # Mongoose connection singleton
│   │   │   ├── auth.ts                          # NextAuth config
│   │   │   ├── videoProcessor.ts                # FFmpeg + Flask orchestration
│   │   │   └── models/
│   │   │       ├── User.ts
│   │   │       └── Video.ts
│   │   └── middleware.ts                        # Protects /dashboard routes
│   ├── .env.local                               # Environment variables (not committed)
│   └── package.json
└── ml-server/                    # Python Flask + YOLOv8
    ├── app.py
    └── requirements.txt
```

---

## Prerequisites

Make sure the following are installed before running the project:

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| Python | 3.10+ | https://python.org |
| MongoDB | 6+ | https://www.mongodb.com/try/download/community |
| FFmpeg | Any recent | https://ffmpeg.org/download.html |

Verify installations:
```bash
node --version
python --version
ffmpeg -version
mongod --version
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/pavan-459/NavaSoft-CRUD.git
cd NavaSoft-CRUD
```

### 2. Set up the Next.js app

```bash
cd app
npm install
```

Create your environment file:

```bash
cp ../.env.local.example .env.local
```

Open `.env.local` and fill in the values:

```env
MONGODB_URI=mongodb://localhost:27017/navasoft
NEXTAUTH_SECRET=any-random-32-character-string
NEXTAUTH_URL=http://localhost:3000
ML_SERVER_URL=http://localhost:5000

# Optional — only needed if ffmpeg is NOT in your system PATH
# Mac/Linux: run `which ffmpeg` to find the path
# Windows:   run `where ffmpeg` to find the path
# FFMPEG_PATH=/usr/local/bin/ffmpeg
```

> **FFmpeg path:** If `ffmpeg` is already in your system PATH (which is the case after a standard install), you can leave `FFMPEG_PATH` unset and it will be detected automatically.

### 3. Set up the Flask ML server

```bash
cd ml-server
python -m pip install -r requirements.txt
```

> This downloads PyTorch + YOLOv8 (~500 MB). Only needed once.
> The YOLOv8 model weights (`yolov8n.pt`, ~6 MB) download automatically on first run.

---

## Running the Application

You need **3 things running** simultaneously. Open separate terminals for each:

### Terminal 1 — MongoDB
MongoDB runs as a background service on most systems after install.

**Mac/Linux:**
```bash
mongod
```
**Windows:** MongoDB starts automatically as a Windows service after installation.
Verify it's running: `Get-Service -Name MongoDB` (should show `Running`).

### Terminal 2 — Next.js App

```bash
cd app
node server.js
```

You should see:
```
> Ready on http://localhost:3000
```

### Terminal 3 — Flask ML Server

```bash
cd ml-server
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

---

## Using the App

1. Open `http://localhost:3000` in your browser
2. Register a new account at `/register`
3. Log in at `/login`
4. On the dashboard, drag and drop an `.mp4` or `.mov` file (max 100 MB)
5. Watch the live status update: **Queued → Extracting frames → Running YOLO → Completed**
6. Explore the results — timeline, bounding box overlay, detection table
7. Click **Export JSON** to download the full detection data

---

## API Reference

### Auth

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account | No |
| `POST` | `/api/auth/signin` | Sign in (NextAuth) | No |
| `GET` | `/api/auth/signout` | Sign out | Yes |

**Register body:**
```json
{ "name": "John", "email": "john@example.com", "password": "secret123" }
```

### Videos

| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| `GET` | `/api/videos` | List all videos for current user | Yes |
| `POST` | `/api/videos` | Upload a video (multipart/form-data, field: `video`) | Yes |
| `GET` | `/api/videos/:id` | Get status and results for a specific video | Yes |
| `GET` | `/api/videos/:id/stream` | Stream the original video file (supports HTTP range) | Yes |
| `DELETE` | `/api/videos/:id` | Delete a video | Yes |

**Video document shape:**
```json
{
  "uploadId": "uuid-string",
  "originalName": "my-video.mp4",
  "status": "completed",
  "results": [
    {
      "frameIndex": 0,
      "timestamp": 0,
      "objects": [
        { "label": "person", "confidence": 0.91, "bbox": [120, 45, 80, 200] }
      ]
    }
  ]
}
```

### Flask ML Server

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Readiness check |
| `POST` | `/detect` | Run YOLOv8 on a base64 image |

**Detect request:**
```json
{ "image": "<base64-encoded-PNG>" }
```

**Detect response:**
```json
{
  "objects": [
    { "label": "car", "confidence": 0.87, "bbox": [300, 90, 150, 100] }
  ]
}
```

`bbox` format: `[x, y, width, height]` in pixels.

---

## MongoDB Collections

### `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "password": "bcrypt hash",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `videos`
```json
{
  "_id": "ObjectId",
  "uploadId": "string (uuid, unique)",
  "filename": "string",
  "originalName": "string",
  "status": "pending | extracting | detecting | completed | failed",
  "userId": "ObjectId (ref: User)",
  "results": [
    {
      "frameIndex": "number",
      "timestamp": "number (seconds)",
      "objects": [{ "label": "string", "confidence": "number", "bbox": "[x,y,w,h]" }]
    }
  ],
  "error": "string (only on failure)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
