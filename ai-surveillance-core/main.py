import uvicorn
from api import app
from config import settings

if __name__ == "__main__":
    print("=" * 60)
    print(f"  {settings.APP_NAME}")
    print(f"  Status: Starting on Port {settings.PORT}…")
    print(f"  Model : {settings.YOLO_MODEL}")
    print("=" * 60)
    
    # Run FastAPI using Uvicorn
    # In production, use workers=N or gunicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT, log_level="info")
