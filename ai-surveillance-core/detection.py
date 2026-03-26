from ultralytics import YOLO
import threading
import torch
import time
from config import settings

class Detector:
    """Wrapper around YOLOv8 with support for continuous processing."""
    def __init__(self, model_path: str = settings.YOLO_MODEL):
        self.model = YOLO(model_path)
        self.device = "cuda" if torch.cuda.is_available() and settings.GPU_INDEX >= 0 else "cpu"
        self.model.to(self.device)
        self.classes = [settings.CLASS_PERSON] + settings.CLASS_WEAPONS + settings.CLASS_OBJECTS
        print(f"[INFO] Detector initialized on {self.device} using model: {model_path}")

    def track(self, frame, persist=True):
        """Perform inference with tracking (ByteTrack is default)."""
        # Verbose set to False for production-like performance
        return self.model.track(
            frame, 
            persist=persist, 
            classes=self.classes, 
            conf=settings.CONF_THRESHOLD,
            imgsz=settings.INFERENCE_SIZE,
            verbose=False,
            device=self.device
        )

# Global singleton
detector = Detector()
