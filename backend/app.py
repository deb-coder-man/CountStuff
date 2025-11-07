# app.py
import os
import io
import base64
import logging

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# ---- Keep PyTorch/BLAS single-threaded to avoid RAM/CPU spikes on small instances
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import torch  # noqa: E402
torch.set_num_threads(1)

from ultralytics import YOLO  # noqa: E402

# ---- Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("countstuff")

# ---- FastAPI app
app = FastAPI(title="Count Stuff Backend API", version="1.0.0")

# In prod, explicitly list your frontends; avoid "*" once stable.
ALLOWED_ORIGINS = [
    "https://count-stuff.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

# ---- Globals/Config
MODEL_PATH = os.getenv("MODEL_PATH", "yolo11n.pt")  # smaller model for low RAM
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "5"))  # hard limit on image upload size
MAX_SIDE = int(os.getenv("MAX_SIDE", "1280"))         # server-side downscale limit
DEFAULT_CONF = float(os.getenv("DEFAULT_CONF", "0.20"))
DEFAULT_IOU = float(os.getenv("DEFAULT_IOU", "0.60"))
IMGSZ = int(os.getenv("IMGSZ", "960"))                # inference image size
MAX_DET = int(os.getenv("MAX_DET", "500"))            # detection cap
MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")       # "cpu" or "cuda" if available
UVICORN_WORKERS = int(os.getenv("UVICORN_WORKERS", "1"))  # keep 1 to avoid duplicating model in RAM

model = None


@app.on_event("startup")
def load_model_on_startup():
    """Load YOLO model once at startup."""
    global model
    try:
        logger.info(f"Loading model: {MODEL_PATH} (device={MODEL_DEVICE})")
        model = YOLO(MODEL_PATH)
        # NOTE: Ultralytics model uses device automatically; you can force with .to() if needed:
        # model.to(MODEL_DEVICE)
        logger.info("YOLO model loaded successfully")
    except Exception as e:
        model = None
        logger.exception("Failed to load YOLO model on startup: %s", e)


@app.get("/")
async def root():
    return {"status": "ok", "service": "count-stuff", "health_path": "/health"}


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}


def _read_and_validate_image(file_bytes: bytes) -> Image.Image:
    """Open bytes as RGB Pillow image, raising helpful errors."""
    if len(file_bytes) > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValueError(f"file_too_large: limit is {MAX_UPLOAD_MB} MB")

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = img.convert("RGB")
        return img
    except Exception as e:
        raise ValueError(f"invalid_image: {e}") from e


def _downscale_pillow(img: Image.Image, max_side: int) -> Image.Image:
    """Downscale image in-place to keep memory/cpu bounded."""
    # thumbnail preserves aspect ratio, modifies in-place
    img = img.copy()
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


@app.post("/count")
async def count_people(file: UploadFile = File(...), conf: float = DEFAULT_CONF):
    """
    Accepts an image and returns:
      - count: number of detected people
      - confidence_threshold: used conf
      - preview_jpeg_base64: annotated JPEG (base64)
    """
    try:
        if model is None:
            return JSONResponse({"error": "model_not_loaded"}, status_code=503)

        # Read upload into memory (bounded by MAX_UPLOAD_MB)
        img_bytes = await file.read()
        img = _read_and_validate_image(img_bytes)

        # Downscale before inference to reduce RAM and speed up processing
        img = _downscale_pillow(img, MAX_SIDE)

        with torch.inference_mode():
            results = model.predict(
                img,
                conf=conf,
                classes=[0],     # "person" class only
                max_det=MAX_DET,
                iou=DEFAULT_IOU,
                imgsz=IMGSZ,
                verbose=False,
            )

        # Count boxes
        boxes = results[0].boxes
        count = 0 if boxes is None else boxes.shape[0]

        # Create annotated preview
        annotated_bgr = results[0].plot()       # numpy array in BGR
        annotated_rgb = annotated_bgr[:, :, ::-1]  # BGR -> RGB
        pil_img = Image.fromarray(annotated_rgb)

        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=80)  # keep small to reduce response size
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return JSONResponse(
            {
                "count": int(count),
                "confidence_threshold": conf,
                "preview_jpeg_base64": b64,
            }
        )

    except ValueError as ve:
        # Expected, user-correctable errors (too large, invalid image, etc.)
        logger.warning("Client error: %s", ve)
        return JSONResponse({"error": "bad_request", "details": str(ve)}, status_code=400)

    except Exception as e:
        # Unexpected server errors
        logger.exception("Error in /count: %s", e)
        return JSONResponse({"error": "internal_error", "details": str(e)}, status_code=500)


if __name__ == "__main__":
    # Run with a single worker to avoid multiple model copies in RAM
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        workers=UVICORN_WORKERS,
        log_level="info",
    )
