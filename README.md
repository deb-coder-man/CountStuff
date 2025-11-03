# CountStuff

CountStuff is a small full-stack app that counts people (or other objects) in a photo.

- Frontend: React + Vite UI for uploading/taking photos and showing results.
- Backend: FastAPI service running an Ultralytics YOLO model to detect people and return a count plus an annotated preview image.

This README explains what the project does, how to run it locally in development, and notes about deploying the backend to Render and the frontend to Vercel.

---

## What the project does

- Lets the user upload or capture a photo from their device.
- Sends the image to the backend `/count` endpoint which runs a YOLO model and returns:
  - `count`: number of detected people
  - `preview_jpeg_base64`: optional annotated preview as a base64 JPEG
- The frontend displays the count and the preview image.

Core files
- `frontend/` — React + Vite application (UI)
- `backend/app.py` — FastAPI application that loads a YOLO model and exposes `/count`
- `backend/models/requirements.txt` — Python requirements for the backend

Important: the backend expects a YOLO model file to be available to the process. `backend/app.py` currently loads `yolo11l.pt` (see source). If you prefer a smaller model for CPU usage, update the model filename accordingly (for example `yolov8n.pt`) and place it in the backend folder.

---

## Development (local)

Prerequisites
- Node.js (16+) and npm/yarn for the frontend
- Python 3.10+ for the backend
- pip and virtualenv (recommended)

1) Backend

```bash
# create a virtual env and install
python -m venv .venv
source .venv/bin/activate
pip install -r backend/models/requirements.txt

# run the backend (development)
# from repository root
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

Notes
- The FastAPI app enables CORS for typical local dev origins (see `backend/app.py`). If you run the frontend on a different port, add it to `allow_origins`.
- The YOLO model file must be present and compatible with the installed `ultralytics` package.

2) Frontend

```bash
cd frontend
npm install
npm run dev
```

- By default Vite will serve the frontend on http://localhost:5173 . The frontend (dev) expects the backend to be available at `http://localhost:8000` for the `/count` POST.

---

## Deploying

Backend (Render)
- Create a new Render Web Service connected to this repository.
- Use the runtime `Python 3` and set the start command to something like:

```
uvicorn backend.app:app --host 0.0.0.0 --port $PORT
```

- Add a build/run step to install dependencies, for example `pip install -r backend/models/requirements.txt`.
- Upload the model file (e.g. `yolo11l.pt`) to the instance (or add it to the repository) — be mindful of file size limits. If the model is large you can host it on an object storage and download it during deploy/startup.

Frontend (Vercel)
- Connect the `frontend/` directory as a project in Vercel.
- Framework preset: Other (Vite) or detect automatically.
- Build command: `npm run build`
- Output directory: `dist`
- You can set an environment variable such as `VITE_API_BASE` to point to your Render backend URL and update the frontend to use that variable when making requests.

Notes about hosting
- GPU vs CPU: large YOLO models are resource-hungry. If you plan to deploy a large model on Render make sure the instance has the appropriate RAM/CPU/GPU (or use a managed inference endpoint).
- If you can't include the model in the repo (size), add a startup script that downloads it from an object store (S3, GCS) during the build or at runtime.

---

## Configuration and environment

- Frontend: consider using Vite env variables for the API base URL
  - Example: create `frontend/.env` with `VITE_API_BASE=http://localhost:8000`
  - Use `import.meta.env.VITE_API_BASE` in the frontend to build requests.
- Backend: Render sets `$PORT` automatically; the FastAPI app should bind to that port in production.

## Troubleshooting

- Error: browser blocks requests to http://0.0.0.0 — browsers disallow 0.0.0.0 as a request target; use `localhost` or an actual host/domain.
- If CORS errors appear, add the frontend origin to `allow_origins` in `backend/app.py` or enable a more permissive policy during testing.
- If the YOLO model fails to load, verify the model path and `ultralytics` version compatibility.

---

If you'd like, I can also:
- Add a `.env.example` for both frontend and backend
- Add deployment scripts for Render and Vercel (CI / GitHub Actions)
- Add a small checklist for production readiness (monitoring, rate-limiting, model warming)

License: MIT
## Development Instruction
cd into backend fodler and run pip install -r requirements.txt
Then cd into backend folder and run python3 -m uvicorn app:app --reload --host 0.0.0.0 --port 8000 
cd into frontend folder and run npm run dev# CountStuff
