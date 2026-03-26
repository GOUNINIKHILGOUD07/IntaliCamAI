import time
import numpy as np
import cv2
from typing import List, Dict, Any, Optional
from config import settings

class TrackState:
    """Maintains state for a single tracked object ID."""
    def __init__(self, track_id: int):
        self.track_id = track_id
        self.enter_time = time.time()
        self.last_seen = time.time()
        self.path: List[tuple[int, int]] = []
        self.speed: float = 0.0
        self.is_running: bool = False
        self.owner_id: Optional[int] = None # For abandoned object ownership
        self.loitering_alert_fired: bool = False

    def update(self, center_pt: tuple[int, int]):
        self.last_seen = time.time()
        self.path.append(center_pt)
        if len(self.path) > 10:
            self.path = self.path[-30:] # Keep recent 30 points
            
        # Calculate approximate speed (displacement over recent interval)
        if len(self.path) >= 10:
            p1 = self.path[-1]
            p2 = self.path[-10]
            dist = np.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
            self.speed = dist / 10 # Pixels per frame
            self.is_running = self.speed > (settings.RUNNING_PIXEL_SPEED / 10)

class RulesEngine:
    """Analyzes YOLO track results for rule violations."""
    def __init__(self):
        # Per-camera track states: { camera_id: { track_id: TrackState } }
        self.camera_states: Dict[int, Dict[int, TrackState]] = {}
        
        # Debounce/Cooldown: { camera_id: { alert_type: timestamp } }
        self.cooldowns: Dict[int, Dict[str, float]] = {}

    def _get_center(self, box):
        x1, y1, x2, y2 = box
        return int((x1 + x2) / 2), int((y1 + y2) / 2)

    def _is_in_polygon(self, pt: tuple[int, int], polygon: List[tuple[int, int]]):
        return cv2.pointPolygonTest(np.array(polygon, np.int32), pt, False) >= 0

    def _can_fire_alert(self, camera_id: int, alert_type: str):
        now = time.time()
        if camera_id not in self.cooldowns:
            self.cooldowns[camera_id] = {}
        
        last_fired = self.cooldowns[camera_id].get(alert_type, 0)
        if now - last_fired > settings.ALERT_COOLDOWN_SEC:
            self.cooldowns[camera_id][alert_type] = now
            return True
        return False

    def process(self, camera_id: int, results, zones: Dict[str, List[List[tuple[int, int]]]]):
        alerts = []
        
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {}
            
        if results is None or len(results) == 0:
            return []

        # Fresh tracks this frame
        current_track_ids = set()
        
        r = results[0]
        boxes = r.boxes.xyxy.cpu().numpy()
        classes = r.boxes.cls.cpu().numpy().astype(int)
        confs = r.boxes.conf.cpu().numpy()
        
        # Tracking IDs (optional but usually present in track results)
        track_ids = r.boxes.id.cpu().numpy().astype(int) if r.boxes.id is not None else [None] * len(boxes)

        for box, cls, conf, tid in zip(boxes, classes, confs, track_ids):
            center = self._get_center(box)
            
            # --- Tracking State Update ---
            if tid is not None:
                current_track_ids.add(tid)
                if tid not in self.camera_states[camera_id]:
                    self.camera_states[camera_id][tid] = TrackState(tid)
                state = self.camera_states[camera_id][tid]
                state.update(center)
            else:
                state = None

            # ─── A) ZONE INTRUSION [PERSON] ──────────────────────────
            if cls == settings.CLASS_PERSON:
                for zone_name, polygons in zones.items():
                    # Only 'restricted' or 'dangerous' zones usually trigger alerts
                    if zone_name not in ["restricted", "dangerous"]: continue
                    
                    for poly in polygons:
                        if self._is_in_polygon(center, poly):
                            if self._can_fire_alert(camera_id, f"Intrusion-{zone_name}"):
                                alerts.append({
                                    "type": "Restricted Zone Intrusion" if zone_name == "restricted" else "Danger Zone Entry",
                                    "severity": "High" if zone_name == "restricted" else "Medium",
                                    "track_id": tid,
                                    "meta": {"zone": zone_name, "class": "person"}
                                })

            # ─── B) WEAPON DETECTION ────────────────────────────
            if cls in settings.CLASS_WEAPONS:
                if self._can_fire_alert(camera_id, "Weapon-Detected"):
                    # Find nearest person to 'associate' weapon ownership (simple heuristic)
                    alerts.append({
                        "type": "Weapon Detected",
                        "severity": "High",
                        "track_id": tid,
                        "meta": {"class": str(cls), "confidence": float(conf)}
                    })

            # ─── C) BEHAVIOR: LOITERING [PERSON] ─────────────────
            if cls == settings.CLASS_PERSON and state:
                dwell_time = time.time() - state.enter_time
                if dwell_time > settings.LOITERING_THRESHOLD_SEC and not state.loitering_alert_fired:
                    if self._can_fire_alert(camera_id, "Loitering"):
                        state.loitering_alert_fired = True
                        alerts.append({
                            "type": "Loitering Detected",
                            "severity": "Low",
                            "track_id": tid,
                            "meta": {"time_sec": int(dwell_time)}
                        })

            # ─── D) BEHAVIOR: RUNNING [PERSON] ─────────────────────
            if cls == settings.CLASS_PERSON and state and state.is_running:
                 if self._can_fire_alert(camera_id, "Running"):
                        alerts.append({
                            "type": "Running Detected",
                            "severity": "Medium",
                            "track_id": tid,
                            "meta": {"speed": round(state.speed, 2)}
                        })

        # --- Cleanup stale tracks (not seen in current frame) ---
        stale_ids = [tid for tid in self.camera_states[camera_id] if tid not in current_track_ids]
        for tid in stale_ids:
            # Check for abandoned objects if we wanted that logic here
            # For now, just remove tracking state
            del self.camera_states[camera_id][tid]

        return alerts

# Global singleton
rules_engine = RulesEngine()
