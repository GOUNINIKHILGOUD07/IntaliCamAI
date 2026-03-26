"""
Central configuration for IntalicamAI Detection Service.
Edit this file to tune alert behavior, zones, and API settings.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─── API & Service ─────────────────────────────────────────────────────────────
API_URL        = os.getenv("API_URL", "http://localhost:5000/api")
CAMERA_ID      = os.getenv("CAMERA_ID", "dummy_camera_id")
CAMERA_NAME    = os.getenv("CAMERA_NAME", "Front Gate")
RTSP_URL       = os.getenv("RTSP_URL", "0")  # "0" = webcam, or rtsp://user:pass@ip:port/stream
SERVICE_SECRET = os.getenv("SERVICE_SECRET", "intalicam-internal")  # Shared secret for API auth

# ─── YOLO Model ────────────────────────────────────────────────────────────────
YOLO_MODEL  = os.getenv("YOLO_MODEL", "yolov8n.pt")  # yolov8n.pt / yolov8s.pt / yolov8m.pt
CONF_PERSON = 0.40   # Min confidence to count as a person
CONF_OBJECT = 0.25   # Min confidence for suspicious objects

# COCO class IDs to track
PERSON_CLASS    = 0
OBJECT_CLASSES  = {
    24: "backpack",
    25: "umbrella",
    26: "handbag",
    28: "suitcase",
    39: "bottle",
    41: "cup",
    42: "fork",
    43: "knife",
    44: "spoon",
    45: "bowl",
    56: "chair",
    62: "tv",
    63: "laptop",
    64: "mouse",
    65: "remote",
    66: "keyboard",
    67: "cell phone",
}

# ─── Alert Cooldowns (seconds per alert type) ──────────────────────────────────
COOLDOWNS = {
    "Person Detected":                  15,
    "Multiple People Detected":         20,
    "No Person Detected":               60,
    "Intrusion in Restricted Area":      5,
    "Entry During Off-Hours":           10,
    "Exit Through Restricted Zone":      5,
    "Loitering Detected":               20,
    "Running Detected":                 10,
    "Person Following Another Person":  15,
    "Frequent Entry/Exit":              30,
    "Person Fell Down":                  5,
    "Violence/Fight Detected":           5,
    "Person in Dangerous Zone":          5,
    "Person Carrying Suspicious Object": 10,
    "Object Left Behind":               20,
    "DEFAULT":                          10,
}

# ─── Behavioral Thresholds ─────────────────────────────────────────────────────
LOITERING_SECONDS     = 30    # Seconds a track must be present to trigger loitering
RUNNING_PIXEL_DIST    = 120   # Pixel distance over 10 frames to count as running
CROWD_MIN_PERSONS     = 3     # Person count threshold for crowd alert
AREA_EMPTY_SECONDS    = 60    # Seconds with no person before "Area Empty" fires
FALL_ASPECT_RATIO     = 1.5   # Width/Height ratio to detect a fallen person
FOLLOW_DISTANCE_PX    = 200   # Max pixel distance between tracks for "following"
FREQUENT_ENTRY_COUNT  = 3     # How many times one ID must enter/exit in the window
FREQUENT_ENTRY_WINDOW = 120   # Seconds window for frequent entry tracking
LEFT_BEHIND_SECONDS   = 15    # Seconds an object must be alone before "left behind"

# ─── Time Rules ────────────────────────────────────────────────────────────────
OFF_HOURS_START = 22   # 10 PM
OFF_HOURS_END   = 5    # 5 AM

# ─── Regions of Interest (ROI) ─────────────────────────────────────────────────
# Each value is a list of polygons. Each polygon is a list of (x, y) int tuples.
# Coordinates are in PIXEL space relative to the video frame resolution.
# Adjust these to match your camera layout.
ZONES = {
    "restricted": [
        [(50, 50), (350, 50), (350, 350), (50, 350)]
    ],
}

# ─── Face Recognition (Optional) ───────────────────────────────────────────────
# Set FACE_RECOGNITION_ENABLED=true in .env to enable (requires insightface)
FACE_RECOGNITION_ENABLED = os.getenv("FACE_RECOGNITION_ENABLED", "false").lower() == "true"
KNOWN_FACES_DIR          = os.getenv("KNOWN_FACES_DIR", "known_faces/")
BLACKLIST_FACES_DIR      = os.getenv("BLACKLIST_FACES_DIR", "blacklist_faces/")

# ─── Snapshot Storage ──────────────────────────────────────────────────────────
SNAPSHOT_DIR = os.getenv("SNAPSHOT_DIR", "snapshots/")

# ─── Display ──────────────────────────────────────────────────────────────────
SHOW_DISPLAY = os.getenv("SHOW_DISPLAY", "true").lower() == "true"  # Set false for headless server
