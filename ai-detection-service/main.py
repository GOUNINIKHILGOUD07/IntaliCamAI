"""
main.py — IntalicamAI Surveillance Detection Service
Entry point: opens RTSP/webcam stream, runs YOLO, feeds AlertEngine.

Usage:
    python main.py                          # uses .env settings
    RTSP_URL=rtsp://... python main.py      # override stream
    SHOW_DISPLAY=false python main.py       # headless server mode
"""
import cv2
import time
import sys
import requests
from ultralytics import YOLO

import config
from alert_engine import AlertEngine
from alert_dispatcher import AlertDispatcher
import face_recognition_module   # will no-op if disabled in config


def open_stream(url: str):
    """Open a VideoCapture from 0 (webcam int) or an RTSP/file URL."""
    source = int(url) if url.isdigit() else url
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open stream: {url}")
    return cap


def update_camera_status(status: str):
    """Update camera status (online/offline) in the backend."""
    try:
        url = f"{config.API_URL}/cameras/{config.CAMERA_ID}/status"
        requests.patch(url, json={"status": status}, timeout=5)
        print(f"  Status   : Camera reported as '{status}'")
    except Exception as e:
        print(f"  Warning  : Could not report status to backend: {e}")


def main():
    print("=" * 60)
    print("  IntalicamAI — AI Surveillance Detection Service")
    print("=" * 60)
    print(f"  Stream   : {config.RTSP_URL}")
    print(f"  Camera   : {config.CAMERA_NAME}  ({config.CAMERA_ID})")
    print(f"  Backend  : {config.API_URL}")
    print(f"  Model    : {config.YOLO_MODEL}")
    print(f"  Display  : {config.SHOW_DISPLAY}")
    print("=" * 60)

    # ── Load YOLO ─────────────────────────────────────────────────────
    print("\nLoading YOLO model …")
    model = YOLO(config.YOLO_MODEL)
    print("Model ready.\n")

    # ── Init subsystems ───────────────────────────────────────────────
    dispatcher = AlertDispatcher()
    engine     = AlertEngine(dispatcher)

    # ── Open stream (retry loop) ──────────────────────────────────────
    while True:
        try:
            cap = open_stream(config.RTSP_URL)
            update_camera_status("online")
            break
        except RuntimeError as e:
            print(f"Stream error: {e}  Retrying in 5s …")
            update_camera_status("offline")
            time.sleep(5)

    print("Streaming started. Press 'q' to quit.\n")
    fps_time = time.time()
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Stream lost — attempting reconnect …")
            update_camera_status("offline")
            cap.release()
            time.sleep(3)
            try:
                cap = open_stream(config.RTSP_URL)
                update_camera_status("online")
            except RuntimeError:
                continue
            continue

        frame_count += 1

        # ── YOLO inference ────────────────────────────────────────────
        # Track all relevant classes in one pass (person + objects)
        tracked_classes = [config.PERSON_CLASS] + list(config.OBJECT_CLASSES.keys())
        results = model.track(
            frame,
            persist=True,
            verbose=False,
            classes=tracked_classes,
        )

        # ── Alert Engine ──────────────────────────────────────────────
        annotated = engine.process(frame, results)

        # ── Face Recognition (optional) ───────────────────────────────
        face_recognition_module.analyse_persons(frame, dispatcher)

        # ── FPS overlay ───────────────────────────────────────────────
        elapsed = time.time() - fps_time
        if elapsed > 0:
            fps = frame_count / elapsed
            cv2.putText(annotated, f"FPS: {fps:.1f}", (annotated.shape[1] - 80, 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 180, 80), 1)

        # ── Display ───────────────────────────────────────────────────
        if config.SHOW_DISPLAY:
            cv2.imshow("IntalicamAI — Surveillance Monitor", annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("User quit.")
                break

    cap.release()
    update_camera_status("offline")
    if config.SHOW_DISPLAY:
        cv2.destroyAllWindows()
    print("Detection service stopped.")


if __name__ == "__main__":
    main()
