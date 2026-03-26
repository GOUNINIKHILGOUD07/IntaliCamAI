import cv2
import threading
import time
from typing import Optional, Any
from config import settings

class CameraStream:
    """Threaded camera stream ingestion using OpenCV."""
    def __init__(self, camera_id: int, rtsp_url: str):
        self.camera_id = camera_id
        # Convert to int if it's a webcam index (e.g. '0' -> 0)
        self.source = int(rtsp_url) if rtsp_url.isdigit() else rtsp_url
        self.cap: Optional[cv2.VideoCapture] = None
        self.frame: Optional[Any] = None
        self.is_running = False
        self.status = "offline"
        self.thread: Optional[threading.Thread] = None
        self.fps_limit = settings.STREAM_FPS_LIMIT
        self.lock = threading.Lock()

    def _capture_loop(self):
        retry_delay = 5
        while self.is_running:
            self.cap = cv2.VideoCapture(self.source)
            if not self.cap.isOpened():
                self.status = "error"
                print(f"[ERROR] Camera {self.camera_id}: cannot open source {self.source}")
                time.sleep(retry_delay)
                continue

            self.status = "online"
            while self.is_running:
                ret, frame = self.cap.read()
                if not ret:
                    self.status = "offline"
                    break
                
                # Performance optimization — resize early before inference
                h, w = frame.shape[:2]
                if w > 1280:
                    scale = 1280 / w
                    frame = cv2.resize(frame, (1280, int(h * scale)))

                with self.lock:
                    self.frame = frame
                
                # FPS Throttling
                time.sleep(1 / self.fps_limit)
            
            self.cap.release()
            if self.is_running:
                print(f"[RETRY] Camera {self.camera_id}: reconnecting…")
                time.sleep(retry_delay)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=1)

    def get_frame(self):
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

class StreamManager:
    """Manages multiple CameraStream instances."""
    def __init__(self):
        self.streams: dict[int, CameraStream] = {}

    def add_camera(self, camera_id: int, rtsp_url: str):
        if camera_id not in self.streams:
            stream = CameraStream(camera_id, rtsp_url)
            self.streams[camera_id] = stream
            stream.start()

    def stop_camera(self, camera_id: int):
        if camera_id in self.streams:
            self.streams[camera_id].stop()
            del self.streams[camera_id]

    def stop_all(self):
        for stream in self.streams.values():
            stream.stop()
        self.streams.clear()

# Global singleton
stream_manager = StreamManager()
