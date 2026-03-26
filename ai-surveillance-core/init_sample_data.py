from database import SessionLocal, init_db
import models
from config import settings

def main():
    print("Pre-populating one sample camera with zones…")
    init_db()
    db = SessionLocal()
    
    # Check if we already have it
    if db.query(models.Camera).first():
        print("Camera already exists.")
        return

    sample_cam = models.Camera(
        name="Front Entrance",
        location="Main Building",
        rtsp_url="0", # uses local webcam for easy testing
        zones={
            "restricted": [
                [(10, 10), (300, 10), (300, 300), (10, 300)] # top-left quadrant
            ],
            "dangerous": [
                [(400, 400), (600, 400), (600, 600), (400, 600)] # bottom-right
            ]
        }
    )
    
    db.add(sample_cam)
    db.commit()
    print(f"Sample camera added (ID: {sample_cam.id}) with zones.")
    db.close()

if __name__ == "__main__":
    main()
