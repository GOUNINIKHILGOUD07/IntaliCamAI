from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    rtsp_url = Column(String, nullable=False)
    status = Column(String, default="offline") # online, offline, error
    
    # Store JSON representation of polygon points: [[x1,y1], [x2,y2]...]
    # { "restricted": [[(50,50),(350,50)...]], "dangerous": [...] }
    zones = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    alert_type = Column(String, index=True) # Intrusion, Weapon, Loitering...
    severity = Column(String) # Low, Medium, High
    time = Column(DateTime, default=datetime.utcnow)
    track_id = Column(Integer)
    snapshot_path = Column(String)
    
    # Additional context for rules: {"classes": ["person", "gun"], "zone": "Entrance"}
    meta = Column(JSON, default=dict)
    
    status = Column(String, default="PENDING") # PENDING, RESOLVED, DISMISSED
    resolved_at = Column(DateTime)
