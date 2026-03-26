from database import SessionLocal
from models import Alert
from datetime import datetime
import os
import cv2
from config import settings

def save_alert(camera_id: int, alert_data: dict, frame=None):
    """Save alert to database and export snapshot if frame provided."""
    db = SessionLocal()
    try:
        snapshot_path = None
        if frame is not None:
            now = datetime.now()
            fname = f"cam{camera_id}_{alert_data['type']}_{now.strftime('%Y%m%d_%H%M%S')}.jpg"
            fname = fname.replace(" ", "_")
            snapshot_path = os.path.join(settings.SNAPSHOT_DIR, fname)
            
            # Draw overlay before saving snapshot
            cv2.putText(frame, f"ALERT: {alert_data['type']}", (20, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            
            cv2.imwrite(snapshot_path, frame)

        new_alert = Alert(
            camera_id=camera_id,
            alert_type=alert_data["type"],
            severity=alert_data["severity"],
            time=datetime.utcnow(),
            track_id=alert_data.get("track_id"),
            snapshot_path=snapshot_path,
            meta=alert_data.get("meta", {}),
            status="PENDING"
        )
        
        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)
        print(f"  [ALERT] {alert_data['type']} on Cam {camera_id} (Severity: {alert_data['severity']})")
        return new_alert
    except Exception as e:
        print(f"  [ERROR] Could not save alert: {e}")
        db.rollback()
    finally:
        db.close()
