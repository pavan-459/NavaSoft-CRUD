# PixelLens

**Self-hosted, open-source AI vision — detect objects in videos and images instantly.**

No API fees. No data sent to third parties. One command to run.

```bash
docker-compose up
```

Open `http://localhost:3000` and start analyzing.

---

## What it does

- Upload a **video** → PixelLens extracts frames at 1 fps and runs YOLOv8 object detection on each frame → get a full timeline of every detected object
- Upload an **image** → detection results appear in seconds with bounding boxes drawn directly on the photo
- All results stored in MongoDB and exportable as JSON
- Real-time progress updates via Socket.IO — no page refresh needed

---

## Why

Cloud video AI APIs (AWS Rekognition Video, Google Video Intelligence) charge per minute and send your footage to their servers. PixelLens runs entirely on your own machine or server — free, private, and customizable.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth | NextAuth.js (JWT, Credentials provider) |
| Real-time | Socket.IO |
| Video processing | FFmpeg via fluent-ffmpeg |
| Object detection | YOLOv8n (Ultralytics) via Flask |
| Database | MongoDB + Mongoose |
| Containerization | Docker + docker-compose |

---

## Quick Start (Docker)

**Prerequisites:** Docker Desktop — [download here](https://www.docker.com/products/docker-desktop/)

```bash
git clone https://github.com/pavan-459/NavaSoft-CRUD.git
cd NavaSoft-CRUD
git checkout product

# Copy env template and set your secret
cp .env.docker.example .env

docker-compose up
```

> First run downloads the YOLOv8n model weights (~6 MB) and PyTorch dependencies (~500 MB). Subsequent starts are fast.

Open **http://localhost:3000**, register an account, and start analyzing.

---

## Manual Setup (without Docker)

**Prerequisites:**

| Tool | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.10+ |
| MongoDB | 6+ |
| FFmpeg | Any recent |

```bash
# 1. Clone
git clone https://github.com/pavan-459/NavaSoft-CRUD.git
cd NavaSoft-CRUD
git checkout product

# 2. Next.js app
cd app
npm install
cp ../.env.local.example .env.local   # edit values
node server.js

# 3. Flask ML server (separate terminal)
cd ml-server
python -m pip install -r requirements.txt
python app.py

# 4. MongoDB
# Mac/Linux: mongod
# Windows: starts automatically as a Windows service
```

---

## Environment Variables

Copy `.env.local.example` to `app/.env.local` and fill in:

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/pixellens` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing | — (required) |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `ML_SERVER_URL` | Flask server URL | `http://localhost:5000` |
| `FFMPEG_PATH` | Full path to ffmpeg binary | Auto-detected from PATH |

---

## Architecture

```
Browser
  │
  │  HTTP + WebSocket
  ▼
┌─────────────────────────────────────────┐
│  Next.js App  (port 3000)               │
│                                         │
│  React UI          API Routes           │
│  - Video tab    /api/videos             │
│  - Image tab    /api/images             │
│                 /api/auth/*             │
│                                         │
│  Socket.IO server (real-time progress)  │
└────────────┬────────────────────────────┘
             │
      ┌──────┴───────┐
      ▼              ▼
┌──────────┐  ┌──────────────────┐
│ MongoDB  │  │  Flask ML Server │
│ port 27017│  │  port 5000       │
│          │  │  POST /detect    │
│ users    │  │  YOLOv8 inference│
│ videos   │  └──────────────────┘
│ images   │
└──────────┘
```

### Video processing pipeline

```
Upload MP4/MOV → save to disk → create DB record (status: pending)
      │
      ▼  (async, non-blocking)
FFmpeg extracts 1 frame/sec → uploads/frames/<id>/frame-0001.png ...
      │  Socket.IO: status "extracting"
      ▼
For each frame:
  base64 encode → POST /detect (Flask) → YOLOv8 → objects[]
      │  Socket.IO: progress { frame, total }
      ▼
Save results to MongoDB → status "completed"
      │  Socket.IO: status "completed" + full results
      ▼
Dashboard renders timeline + bounding boxes + video player
```

### Image pipeline

```
Upload JPEG/PNG/WebP → base64 encode → POST /detect (Flask)
      │  (synchronous — ~1-2s on CPU)
      ▼
YOLOv8 inference → objects[]
      ▼
Save to MongoDB → render photo with bounding box overlay
```

---

## API Reference

### Auth

| Method | Endpoint | Body |
|---|---|---|
| `POST` | `/api/auth/register` | `{ name, email, password }` |
| `POST` | `/api/auth/signin` | NextAuth credentials |

### Videos

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/videos` | List all videos for current user |
| `POST` | `/api/videos` | Upload video (`multipart/form-data`, field: `video`) |
| `GET` | `/api/videos/:id` | Get video status + detection results |
| `GET` | `/api/videos/:id/stream` | Stream video file (HTTP range supported) |
| `DELETE` | `/api/videos/:id` | Delete video + file from disk |

### Images

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/images` | List all images for current user |
| `POST` | `/api/images` | Upload image + run detection synchronously |
| `GET` | `/api/images/:id` | Get image + detection results |
| `GET` | `/api/images/:id/file` | Serve the original image file |
| `DELETE` | `/api/images/:id` | Delete image + file from disk |

### Flask ML Server

| Method | Endpoint | Body | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok" }` |
| `POST` | `/detect` | `{ image: "<base64>" }` | `{ objects: [{ label, confidence, bbox }] }` |

`bbox` format: `[x, y, width, height]` in pixels.

---

## Project Structure

```
NavaSoft-CRUD/
├── app/                              # Next.js full-stack app
│   ├── Dockerfile
│   ├── server.js                     # Custom Node server (Next.js + Socket.IO)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   │   └── register/route.ts
│   │   │   │   ├── videos/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       └── stream/route.ts
│   │   │   │   └── images/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/
│   │   │   │           ├── route.ts
│   │   │   │           └── file/route.ts
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── components/
│   │   │   ├── VideoUpload.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   ├── ResultsViewer.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── ImageResult.tsx
│   │   │   └── Navbar.tsx
│   │   ├── lib/
│   │   │   ├── db.ts
│   │   │   ├── auth.ts
│   │   │   ├── videoProcessor.ts
│   │   │   └── models/
│   │   │       ├── User.ts
│   │   │       ├── Video.ts
│   │   │       └── Image.ts
│   │   └── middleware.ts
│   └── package.json
├── ml-server/                        # Flask + YOLOv8
│   ├── Dockerfile
│   ├── app.py
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## Contributing

Issues and PRs are welcome. The most impactful areas to contribute:

- Support additional model sizes (`yolov8s`, `m`, `l`, `x`) via a UI selector
- Object tracking across video frames (assign consistent IDs to the same object)
- Annotated video export (video file with bounding boxes burned in)
- API key authentication for programmatic access
- Webhook notifications when video processing completes

---

## License

MIT
