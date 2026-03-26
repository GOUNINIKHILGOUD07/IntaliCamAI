"""
alert_dispatcher.py — Handles cooldowns, snapshot capture, and HTTP delivery
of alerts from IntalicamAI Detection Service to the Node.js backend.
"""
import os
import time
import base64
import requests
import cv2
from datetime import datetime
from collections import defaultdict

import config


class AlertDispatcher:
    """
    Thread-safe (single-threaded context) alert dispatcher.
    Enforces per-type cooldowns, saves snapshots, and POSTs to the backend.
    """

    # Severity display order for ranking tie-breaks
    _SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    def __init__(self):
        self._last_sent: dict[str, float] = defaultdict(lambda: 0.0)
        os.makedirs(config.SNAPSHOT_DIR, exist_ok=True)

    # ──────────────────────────────────────────────────────────────────
    def send(self, alert_type: str, severity: str, frame, details: str = ""):
        """
        Fire an alert if the per-type cooldown has elapsed.

        Args:
            alert_type: Human-readable alert name (e.g. "Intrusion in Restricted Area")
            severity:   "low" | "medium" | "high" | "critical"
            frame:      Current OpenCV frame (numpy array) for snapshot
            details:    Extra debug string (logged locally only)
        """
        now = time.time()
        cooldown = config.COOLDOWNS.get(alert_type, config.COOLDOWNS["DEFAULT"])

        if now - self._last_sent[alert_type] < cooldown:
            return  # Still within cooldown window

        self._last_sent[alert_type] = now
        snapshot_path = self._save_snapshot(alert_type, frame)
        self._post_alert(alert_type, severity, snapshot_path, details)

    # ──────────────────────────────────────────────────────────────────
    def _save_snapshot(self, alert_type: str, frame) -> str | None:
        if frame is None:
            return None
        safe_name = alert_type.replace(" ", "_").replace("/", "-")
        ts         = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename   = f"{safe_name}_{ts}.jpg"
        path       = os.path.join(config.SNAPSHOT_DIR, filename)
        try:
            cv2.imwrite(path, frame)
            return path
        except Exception as e:
            print(f"[SNAPSHOT] Failed to save: {e}")
            return None

    # ──────────────────────────────────────────────────────────────────
    def _post_alert(self, alert_type: str, severity: str,
                    snapshot_path: str | None, details: str):
        ts = datetime.now().isoformat()
        payload = {
            "cameraId":      config.CAMERA_ID,
            "cameraName":    config.CAMERA_NAME,
            "detectionType": alert_type,
            "threatLevel":   severity,
            "imageUrl":      snapshot_path or "",
            "timestamp":     ts,
            "details":       details,
            "person":        "Unknown",   # Placeholder — extended with face-rec module
        }

        print(f"[{ts}] ALERT ▶ {alert_type} [{severity.upper()}]  {details}")

        try:
            resp = requests.post(
                f"{config.API_URL}/alerts",
                json=payload,
                headers={"x-service-secret": config.SERVICE_SECRET},
                timeout=4,
            )
            if resp.status_code in (200, 201):
                print(f"           ✓ Delivered to backend (HTTP {resp.status_code})")
            else:
                print(f"           ✗ Backend rejected (HTTP {resp.status_code}): {resp.text[:120]}")
        except requests.exceptions.ConnectionError:
            print("           ✗ Backend unreachable — alert logged locally only.")
        except Exception as e:
            print(f"           ✗ Unexpected error: {e}")
