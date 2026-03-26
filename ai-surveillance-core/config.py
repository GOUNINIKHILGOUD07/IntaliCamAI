import os
from pydantic_settings import BaseSettings
from typing import List, Dict

class Settings(BaseSettings):
    # API Settings
    APP_NAME: str = "IntaliCam Surveillance Core"
    PORT: int = 8080
    DEBUG: bool = True
    
    # Storage Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./surveillance.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Model Settings
    # Use 'best.pt' for custom weapons/objects if it exists, otherwise yolov8n.pt
    YOLO_MODEL: str = "best.pt" if os.path.exists("best.pt") else "yolov8n.pt"
    INFERENCE_SIZE: int = 640
    CONF_THRESHOLD: float = 0.45
    GPU_INDEX: int = 0 # -1 for CPU
    
    # Detection Classes (COCO defaults mapped to custom requirements)
    # 0: person, 24: backpack, 26: handbag, 28: suitcase, 43: knife (COCO)
    # If using custom 'best.pt', these indices might change!
    CLASS_PERSON: int = 0
    CLASS_WEAPONS: List[int] = [43] # knife; add others for custom model
    CLASS_OBJECTS: List[int] = [24, 25, 26, 28, 39, 41, 56, 62, 63, 67] # bag, backpack, suitcase, bottle, cup, chair, tv, laptop, phone
    
    # Alerting Rules
    LOITERING_THRESHOLD_SEC: int = 30
    RUNNING_PIXEL_SPEED: float = 120.0 # pixel displacement per 10 frames
    ABANDONED_OBJECT_SEC: int = 60
    
    # Alert Cooldowns (per camera-type pair)
    ALERT_COOLDOWN_SEC: int = 15
    
    # Recording/Streaming
    STREAM_FPS_LIMIT: int = 15
    SNAPSHOT_DIR: str = "alerts/snapshots"

    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.SNAPSHOT_DIR, exist_ok=True)
