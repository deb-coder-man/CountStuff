from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
import io, base64
from ultralytics import YOLO
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


model = YOLO("yolo11l.pt") 

@app.post("/count")
async def count_people(file: UploadFile = File(...), conf: float = 0.20):
    img_bytes = await file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    # run inference
    results = model.predict(
        img, 
        conf=conf, 
        classes=[0],  # only "person"
        max_det=3000,
        iou=0.6,
        imgsz=1280,
        ) 
    boxes = results[0].boxes
    count = 0 if boxes is None else boxes.shape[0]

    # make an annotated preview (optional)
    annotated = results[0].plot()  # numpy BGR
    # convert to JPEG base64 for quick transport
    from cv2 import imencode, cvtColor, COLOR_BGR2RGB
    ok, buf = imencode(".jpg", annotated)
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8") if ok else None

    return JSONResponse({
        "count": int(count),
        "confidence_threshold": conf,
        "preview_jpeg_base64": b64,
    })