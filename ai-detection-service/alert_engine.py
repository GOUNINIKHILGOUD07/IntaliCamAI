"""
alert_engine.py — Core alert logic for IntalicamAI Surveillance System.
Responsible for evaluating per-frame YOLO detections and firing structured alerts.
"""
import cv2
import math
import time
import numpy as np
from datetime import datetime
from collections import defaultdict

import config


class AlertEngine:
    """
    Stateful engine that receives YOLO detection results per frame and
    evaluates all 20 alert conditions before dispatching via AlertDispatcher.
    """

    def __init__(self, dispatcher):
        self.dispatcher = dispatcher

        # Track state per track_id
        self.track_first_seen: dict[int, float] = {}       # id → unix timestamp of first detection
        self.track_positions:  dict[int, list]  = defaultdict(list)  # id → [(cx, cy), ...]
        self.track_last_seen:  dict[int, float] = {}       # id → last frame timestamp
        self.track_entry_log:  dict[int, list]  = defaultdict(list)  # id → list of entry timestamps

        # Scene-level state
        self.last_person_seen_time: float = time.time()
        self.object_birth_times: dict     = {}  # hash(box) → first_seen

        # Violence / fight proximity tracking
        self.violence_candidates: list = []

    # ──────────────────────────────────────────────────────────────────
    # MAIN ENTRY POINT
    # ──────────────────────────────────────────────────────────────────
    def process(self, frame: np.ndarray, results) -> np.ndarray:
        """Analyse one YOLO result frame and fire alerts. Returns annotated frame."""
        now = time.time()
        current_hour = datetime.now().hour

        persons   = []   # List of (track_id, box_xyxy, center, w, h, conf)
        objects   = []   # List of (cls_id, box_xyxy, center)

        # ── Parse detections ──────────────────────────────────────────
        if results[0].boxes is not None:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                w, h   = x2 - x1, y2 - y1

                if cls_id == config.PERSON_CLASS and conf >= config.CONF_PERSON:
                    track_id = int(box.id[0]) if box.id is not None else -1
                    persons.append((track_id, (x1, y1, x2, y2), (cx, cy), w, h, conf))

                elif cls_id in config.OBJECT_CLASSES and conf >= config.CONF_OBJECT:
                    objects.append((cls_id, (x1, y1, x2, y2), (cx, cy)))

        # ── Update tracking state ─────────────────────────────────────
        for tid, bbox, center, w, h, conf in persons:
            if tid == -1:
                continue
            if tid not in self.track_first_seen:
                self.track_first_seen[tid] = now
                self.track_entry_log[tid].append(now)
            self.track_last_seen[tid] = now
            hist = self.track_positions[tid]
            hist.append(center)
            if len(hist) > 60:
                hist.pop(0)

        # ── Alert 1: Person Detected ───────────────────────────────────
        if persons:
            self.last_person_seen_time = now
            self.dispatcher.send(
                "Person Detected", "low", frame,
                f"{len(persons)} person(s) in frame"
            )

        # ── Alert 2: Crowd / Multiple People Detected ──────────────────
        if len(persons) >= config.CROWD_MIN_PERSONS:
            self.dispatcher.send(
                "Multiple People Detected", "medium", frame,
                f"Count: {len(persons)}"
            )

        # ── Alert 3: No Person Detected (Area Empty) ───────────────────
        if not persons:
            idle = now - self.last_person_seen_time
            if idle >= config.AREA_EMPTY_SECONDS:
                self.dispatcher.send(
                    "No Person Detected", "low", frame,
                    f"Area empty for {int(idle)}s"
                )

        # ── Per-person analysis ────────────────────────────────────────
        for tid, bbox, center, w, h, conf in persons:
            x1, y1, x2, y2 = bbox
            duration = now - self.track_first_seen.get(tid, now)
            hist     = self.track_positions[tid]

            # ── Alert 5: Intrusion in Restricted Area ──────────────────
            for poly in config.ZONES.get("restricted", []):
                if _in_zone(center, poly):
                    self.dispatcher.send(
                        "Intrusion in Restricted Area", "critical", frame,
                        f"ID {tid} at {center}"
                    )

            # ── Alert 14: Person in Dangerous Zone ─────────────────────
            for poly in config.ZONES.get("dangerous", []):
                if _in_zone(center, poly):
                    self.dispatcher.send(
                        "Person in Dangerous Zone", "high", frame,
                        f"ID {tid}"
                    )

            # ── Alert 6: Entry During Off-Hours ────────────────────────
            if (current_hour >= config.OFF_HOURS_START or
                    current_hour < config.OFF_HOURS_END):
                self.dispatcher.send(
                    "Entry During Off-Hours", "high", frame,
                    f"Detected at {datetime.now().strftime('%H:%M')}"
                )

            # ── Alert 7: Exit Through Restricted Zone ──────────────────
            for poly in config.ZONES.get("entry_exit", []):
                if _in_zone(center, poly):
                    self.dispatcher.send(
                        "Exit Through Restricted Zone", "medium", frame,
                        f"ID {tid} near exit zone"
                    )

            # ── Alert 8: Loitering ─────────────────────────────────────
            if duration > config.LOITERING_SECONDS:
                self.dispatcher.send(
                    "Loitering Detected", "medium", frame,
                    f"ID {tid} present for {int(duration)}s"
                )

            # ── Alert 9: Running ───────────────────────────────────────
            if len(hist) >= 10:
                dist = math.hypot(
                    hist[-1][0] - hist[-10][0],
                    hist[-1][1] - hist[-10][1]
                )
                if dist > config.RUNNING_PIXEL_DIST:
                    self.dispatcher.send(
                        "Running Detected", "medium", frame,
                        f"ID {tid} speed ~{int(dist)}px/10f"
                    )

            # ── Alert 11: Frequent Entry/Exit ──────────────────────────
            entries = self.track_entry_log.get(tid, [])
            recent  = [t for t in entries if now - t <= config.FREQUENT_ENTRY_WINDOW]
            if len(recent) >= config.FREQUENT_ENTRY_COUNT:
                self.dispatcher.send(
                    "Frequent Entry/Exit", "medium", frame,
                    f"ID {tid}: {len(recent)} entries in {config.FREQUENT_ENTRY_WINDOW}s"
                )

            # ── Alert 12: Fall Detection ───────────────────────────────
            if h > 0 and (w / h) > config.FALL_ASPECT_RATIO:
                self.dispatcher.send(
                    "Person Fell Down", "high", frame,
                    f"ID {tid} aspect ratio {w/h:.2f}"
                )

            # ── Alert 19: Carrying Suspicious Object ───────────────────
            for cls_id, obj_bbox, obj_center in objects:
                ox1, oy1, ox2, oy2 = obj_bbox
                # Check overlap with person bbox
                overlap = not (ox2 < x1 or ox1 > x2 or oy2 < y1 or oy1 > y2)
                if overlap:
                    obj_name = config.OBJECT_CLASSES.get(cls_id, "unknown")
                    self.dispatcher.send(
                        "Person Carrying Suspicious Object", "high", frame,
                        f"ID {tid} with {obj_name}"
                    )

        # ── Alert 10: Person Following Another ────────────────────────
        if len(persons) >= 2:
            for i in range(len(persons)):
                for j in range(i + 1, len(persons)):
                    tid_a, _, ca, _, _, _ = persons[i]
                    tid_b, _, cb, _, _, _ = persons[j]
                    hist_a = self.track_positions[tid_a]
                    hist_b = self.track_positions[tid_b]
                    if len(hist_a) >= 15 and len(hist_b) >= 15:
                        # Check if A is consistently close behind B
                        close_count = sum(
                            1 for pa, pb in zip(hist_a[-15:], hist_b[-15:])
                            if math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < config.FOLLOW_DISTANCE_PX
                        )
                        if close_count >= 10:  # 10/15 frames close together
                            self.dispatcher.send(
                                "Person Following Another Person", "medium", frame,
                                f"ID {tid_a} following ID {tid_b}"
                            )

        # ── Alert 13: Violence / Fight Detection ───────────────────────
        # Heuristic: multiple persons very close with high combined velocity
        if len(persons) >= 2:
            for i in range(len(persons)):
                for j in range(i + 1, len(persons)):
                    _, _, ca, _, _, _ = persons[i]
                    _, _, cb, _, _, _ = persons[j]
                    proximity = math.hypot(ca[0] - cb[0], ca[1] - cb[1])
                    if proximity < 80:  # Very close persons
                        # Check both are moving fast
                        hist_a = self.track_positions[persons[i][0]]
                        hist_b = self.track_positions[persons[j][0]]
                        vel_a = vel_b = 0
                        if len(hist_a) >= 5:
                            vel_a = math.hypot(hist_a[-1][0] - hist_a[-5][0],
                                               hist_a[-1][1] - hist_a[-5][1])
                        if len(hist_b) >= 5:
                            vel_b = math.hypot(hist_b[-1][0] - hist_b[-5][0],
                                               hist_b[-1][1] - hist_b[-5][1])
                        if vel_a > 40 and vel_b > 40:
                            self.dispatcher.send(
                                "Violence/Fight Detected", "critical", frame,
                                f"High proximity & motion detected"
                            )

        # ── Alert 20: Object Left Behind ──────────────────────────────
        now_key = now
        for cls_id, obj_bbox, obj_center in objects:
            key = f"{obj_center[0]//20}_{obj_center[1]//20}"   # Grid-snapped key
            if key not in self.object_birth_times:
                self.object_birth_times[key] = now_key
                # Fire new alert for general object detection
                obj_name = config.OBJECT_CLASSES.get(cls_id, "object")
                self.dispatcher.send(
                    "Object Detected", "low", frame,
                    f"New {obj_name} entered frame at {obj_center}"
                )
            else:
                age = now_key - self.object_birth_times[key]
                person_nearby = any(
                    math.hypot(p[2][0] - obj_center[0], p[2][1] - obj_center[1]) < 120
                    for p in persons
                )
                if age > config.LEFT_BEHIND_SECONDS and not person_nearby:
                    obj_name = config.OBJECT_CLASSES.get(cls_id, "object")
                    self.dispatcher.send(
                        "Object Left Behind", "high", frame,
                        f"{obj_name} alone for {int(age)}s"
                    )

        # Clean stale object-birth entries (older than 2 min without being seen)
        stale_keys = [k for k, t in self.object_birth_times.items() if now - t > 120]
        for k in stale_keys:
            del self.object_birth_times[k]

        # ── Annotate frame ────────────────────────────────────────────
        frame = self._annotate(frame, persons, objects)
        return frame

    # ──────────────────────────────────────────────────────────────────
    # ANNOTATION
    # ──────────────────────────────────────────────────────────────────
    def _annotate(self, frame, persons, objects):
        # Draw zones
        for zone_name, polys in config.ZONES.items():
            color = (0, 0, 255) if zone_name == "restricted" else \
                    (0, 140, 255) if zone_name == "dangerous" else \
                    (255, 200, 0)
            for poly in polys:
                pts = np.array(poly, np.int32).reshape((-1, 1, 2))
                cv2.polylines(frame, [pts], True, color, 2)
                cv2.putText(frame, zone_name.upper(), poly[0],
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        # Draw persons
        for tid, bbox, center, w, h, conf in persons:
            x1, y1, x2, y2 = bbox
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 230, 100), 2)
            label = f"P{tid} {conf:.0%}" if tid != -1 else f"P {conf:.0%}"
            cv2.putText(frame, label, (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 230, 100), 1)
            # Trail
            hist = self.track_positions.get(tid, [])
            for k in range(1, min(len(hist), 20)):
                alpha = k / 20
                c = (int(0 * alpha), int(230 * alpha), int(100 * alpha))
                cv2.line(frame, hist[k - 1], hist[k], c, 1)

        # Draw suspicious objects
        for cls_id, bbox, _ in objects:
            x1, y1, x2, y2 = bbox
            obj_name = config.OBJECT_CLASSES.get(cls_id, "obj")
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 80, 255), 2)
            cv2.putText(frame, obj_name, (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 80, 255), 1)

        # HUD
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.rectangle(frame, (0, 0), (320, 24), (0, 0, 0), -1)
        cv2.putText(frame, f"IntalicamAI | {ts}", (6, 17),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 180, 180), 1)
        cv2.putText(frame, f"CAM: {config.CAMERA_NAME}  |  Persons: {len(persons)}",
                    (6, frame.shape[0] - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (150, 150, 150), 1)
        return frame


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def _in_zone(point: tuple, polygon: list) -> bool:
    """Returns True if point (x, y) is inside the polygon."""
    arr = np.array(polygon, np.int32).reshape((-1, 1, 2))
    return cv2.pointPolygonTest(arr, (float(point[0]), float(point[1])), False) >= 0
