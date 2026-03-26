from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import cv2
import time
import threading

import models
import database
from database import get_db, init_db
from config import settings
from ingestion import stream_manager
from detection import detector
from rules import rules_engine
from alerts import save_alert

app = FastAPI(title=settings.APP_NAME)

# CORS — crucial for React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared in-memory frame buffer for MJPEG streaming
# In a large production system, use Redis or a separate stream server
frame_cache = {}

# ───────────────────────────────────────────────────────────────────────────
# BACKGROUND TASK: Inference Engine
# ───────────────────────────────────────────────────────────────────────────

def background_inference():
    """Continuously runs YOLO on all active camera streams."""
    while True:
        # Get active cameras from the stream manager
        for cam_id, stream in list(stream_manager.streams.items()):
            frame = stream.get_frame()
            if frame is None: continue

            # YOLO track
            results = detector.track(frame)
            
            # Draw detections for preview stream
            annotated_frame = results[0].plot() if results else frame
            
            # Get zones from database (simplified: using cache for performance)
            with SessionLocal() as db:
                camera = db.query(models.Camera).filter(models.Camera.id == cam_id).first()
                zones = camera.zones if camera else {}

            # Process Rules Engine
            detected_alerts = rules_engine.process(cam_id, results, zones)
            
            # Cache frame for MJPEG streaming endpoint
            frame_cache[cam_id] = annotated_frame

            # Handle Alerts persistence
            if detected_alerts:
                # We save alert and use current frame as snapshot evidence
                for alert in detected_alerts:
                    save_alert(cam_id, alert, frame=frame.copy())
            
        time.sleep(0.01) # Yield to other threads

# Startup: Initialize Database and background Inference
@app.on_event("startup")
def startup_event():
    init_db()
    # Start inference background thread
    t = threading.Thread(target=background_inference, daemon=True)
    t.start()

# ───────────────────────────────────────────────────────────────────────────
# API ROUTES: Camera Management
# ───────────────────────────────────────────────────────────────────────────

@app.get("/cameras", response_model=List[dict])
def list_cameras(db: Session = Depends(get_db)):
    cams = db.query(models.Camera).all()
    # Ensure they are active in stream manager
    for cam in cams:
        stream_manager.add_camera(cam.id, cam.rtsp_url)
    return [
       {"id": c.id, "name": c.name, "location": c.location, "rtsp_url": c.rtsp_url, "status": c.status, "zones": c.zones}
       for c in cams
   ]

@app.post("/cameras")
def add_camera(camera_data: dict, db: Session = Depends(get_db)):
    camera = models.Camera(
        name=camera_data["name"],
        location=camera_data.get("location"),
        rtsp_url=camera_data["rtsp_url"],
        zones=camera_data.get("zones", {})
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    # Start ingestion thread
    stream_manager.add_camera(camera.id, camera.rtsp_url)
    return camera

@app.post("/zones/{camera_id}")
def update_zones(camera_id: int, zones: dict, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera: raise HTTPException(404, "Camera not found")
    camera.zones = zones
    db.commit()
    return {"message": "Zones updated"}

@app.get("/alerts")
def get_alerts(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.time.desc()).offset(skip).limit(limit).all()
    return alerts

# ───────────────────────────────────────────────────────────────────────────
# MJPEG STREAMING
# ───────────────────────────────────────────────────────────────────────────

def generate_mjpeg(camera_id: int):
    while True:
        frame = frame_cache.get(camera_id)
        if frame is not None:
            _, encoded = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\n"
                  b"Content-Type: image/jpeg\r\n\r\n" + encoded.tobytes() + b"\r\n")
        else:
            time.sleep(0.5)
        time.sleep(1/settings.STREAM_FPS_LIMIT)

@app.get("/stream/{camera_id}")
def video_stream(camera_id: int):
    # Check if stream exists
    if camera_id not in stream_manager.streams:
        # Load from DB if needed
        return HTTPException(404, "Camera not running")
    return Response(generate_mjpeg(camera_id), media_type="multipart/x-mixed-replace; boundary=frame")

# Health Check
@app.get("/health")
def health():
    return {"status": "healthy", "gpu": torch.cuda.is_available(), "active_cams": list(stream_manager.streams.keys())}
