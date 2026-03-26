"""
face_recognition_module.py — Optional face recognition integration.
Handles alerts: Unknown Person, Known Person, Blacklisted Person, Missing Person Found.

Requires: pip install insightface onnxruntime
Set FACE_RECOGNITION_ENABLED=true in .env to activate.
"""
import os
import numpy as np

import config

_ENABLED = config.FACE_RECOGNITION_ENABLED

if _ENABLED:
    try:
        import insightface
        from insightface.app import FaceAnalysis
        _app = FaceAnalysis(providers=['CPUExecutionProvider'])
        _app.prepare(ctx_id=0, det_size=(640, 640))
        print("[FaceRec] InsightFace initialised.")
    except ImportError:
        print("[FaceRec] insightface not installed — disabling face recognition.")
        _ENABLED = False
else:
    print("[FaceRec] Face recognition disabled (set FACE_RECOGNITION_ENABLED=true to enable).")

# ── Face database ─────────────────────────────────────────────────────────────
_known_db:      list[tuple[str, np.ndarray]] = []  # [(name, embedding), ...]
_blacklist_db:  list[tuple[str, np.ndarray]] = []
_missing_db:    list[tuple[str, np.ndarray]] = []

MATCH_THRESHOLD = 0.45   # cosine similarity threshold

def load_faces():
    """Load known / blacklist / missing face embeddings from disk."""
    if not _ENABLED:
        return
    _known_db.clear()
    _blacklist_db.clear()
    _missing_db.clear()
    _load_dir(config.KNOWN_FACES_DIR,      _known_db)
    _load_dir(config.BLACKLIST_FACES_DIR,  _blacklist_db)
    print(f"[FaceRec] Loaded {len(_known_db)} known | {len(_blacklist_db)} blacklisted faces.")

def _load_dir(directory: str, db: list):
    if not os.path.isdir(directory):
        return
    for fname in os.listdir(directory):
        if not fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue
        name = os.path.splitext(fname)[0]
        path = os.path.join(directory, fname)
        try:
            import cv2
            img = cv2.imread(path)
            faces = _app.get(img)
            if faces:
                db.append((name, faces[0].embedding))
        except Exception as e:
            print(f"[FaceRec] Failed to load {fname}: {e}")

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))

def _match(embedding: np.ndarray, db: list) -> tuple[str | None, float]:
    best_name, best_score = None, 0.0
    for name, ref in db:
        score = _cosine_similarity(embedding, ref)
        if score > best_score:
            best_name, best_score = name, score
    if best_score >= MATCH_THRESHOLD:
        return best_name, best_score
    return None, best_score


# ── Public API ────────────────────────────────────────────────────────────────
def analyse_persons(frame, dispatcher):
    """
    Run face recognition on frame and fire appropriate alerts.
    Called from main.py after the YOLO inference step.

    Alerts fired:
        15. Unknown Person Detected
        16. Known Person Identified
        17. Blacklisted Person Detected
        18. Missing Person Found
    """
    if not _ENABLED:
        return

    faces = _app.get(frame)
    for face in faces:
        emb = face.embedding

        # Check blacklist first (highest priority)
        bl_name, bl_score = _match(emb, _blacklist_db)
        if bl_name:
            dispatcher.send(
                "Blacklisted Person Detected", "critical", frame,
                f"Match: {bl_name} ({bl_score:.0%})"
            )
            continue

        # Check known persons
        kn_name, kn_score = _match(emb, _known_db)
        if kn_name:
            # Check if they appear in missing list
            mp_name, mp_score = _match(emb, _missing_db)
            if mp_name:
                dispatcher.send(
                    "Missing Person Found", "critical", frame,
                    f"Match: {mp_name} ({mp_score:.0%})"
                )
            else:
                dispatcher.send(
                    "Known Person Identified", "low", frame,
                    f"Identified: {kn_name} ({kn_score:.0%})"
                )
        else:
            dispatcher.send(
                "Unknown Person Detected", "medium", frame,
                "No match in known database"
            )

# Auto-load on import
if _ENABLED:
    load_faces()
