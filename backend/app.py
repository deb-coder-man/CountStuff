from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io, base64
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware
import logging
import numpy as np

logger = logging.getLogger("countstuff")

app = FastAPI()

# In prod, list your exact origins; during debugging * is ok (with allow_credentials=False).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://count-stuff.vercel.app", "http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None

@app.on_event("startup")
def load_model_on_startup():
    global model
    try:
        model = YOLO("yolo11l.pt")  # consider yolo11s/11n on CPU-limited instances
        logger.info("YOLO model loaded successfully")
    except Exception as e:
        model = None
        logger.exception("Failed to load YOLO model on startup: %s", e)

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/count")
async def count_people(file: UploadFile = File(...), conf: float = 0.20):
    try:
        if model is None:
            return JSONResponse({"error": "model not loaded"}, status_code=503)

        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        results = model.predict(
            img,
            conf=conf,
            classes=[0],   # only "person"
            max_det=3000,
            iou=0.6,
            imgsz=1280,
        )

        boxes = results[0].boxes
        count = 0 if boxes is None else boxes.shape[0]

        # Build annotated preview WITHOUT OpenCV
        annotated_bgr = results[0].plot()                 # numpy array in BGR
        annotated_rgb = annotated_bgr[:, :, ::-1]         # BGR -> RGB via slicing
        pil_img = Image.fromarray(annotated_rgb)          # to Pillow image
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return JSONResponse({
            "count": int(count),
            "confidence_threshold": conf,
            "preview_jpeg_base64": b64,
        })

    except Exception as e:
        logger.exception("Error in /count: %s", e)
        # Make sure the browser gets a JSON error (and CORS headers via middleware)
        return JSONResponse({"error": "internal_error", "details": str(e)}, status_code=500)
