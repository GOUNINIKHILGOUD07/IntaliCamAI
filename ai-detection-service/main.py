import cv2
from ultralytics import YOLO
import requests
import time
import os
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

API_URL = os.getenv("API_URL", "http://localhost:5000/api")
CAMERA_ID = os.getenv("CAMERA_ID", "dummy_camera_id")

# Load YOLOv8 model (downloads yolov8n.pt if not exists)
print("Loading YOLO model...")
model = YOLO("yolov8n.pt")
print("Model loaded.")

# Target classes to trigger alerts (COCO classes: 0 is person, etc.)
# 0: person, 43: knife (just examples)
THREAT_CLASSES = [0] 

# Cooldown to avoid spamming the API (seconds)
ALERT_COOLDOWN = 10 
last_alert_time = 0

def send_alert(detection_type, threat_level):
    global last_alert_time
    current_time = time.time()
    
    if current_time - last_alert_time < ALERT_COOLDOWN:
        return # Skip if too soon
        
    payload = {
        "cameraId": CAMERA_ID,
        "detectionType": detection_type,
        "threatLevel": threat_level
    }
    
    try:
        response = requests.post(f"{API_URL}/alerts", json=payload)
        if response.status_code == 201:
            print(f"Alert sent successfully: {detection_type} ({threat_level})")
            last_alert_time = current_time
        else:
            print(f"Failed to send alert: {response.text}")
    except Exception as e:
        print(f"Error sending alert: {e}")

def main():
    # Attempt to open default webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("Starting video feed...")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame.")
            break

        # Run inference
        results = model.track(frame, persist=True, verbose=False)
        
        threat_detected = False
        detected_objects = []

        # Process results
        if results[0].boxes:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                # If detected object is in our threat list and confidence > 50%
                if cls_id in THREAT_CLASSES and conf > 0.5:
                    threat_detected = True
                    detected_objects.append(model.names[cls_id])
                    
                    # Draw bounding box (red for threat)
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(frame, f"{model.names[cls_id]} {conf:.2f}", (x1, y1 - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        if threat_detected:
            # Aggregate what was found
            detection_str = ", ".join(set(detected_objects))
            send_alert(detection_str, "high")

        # Show the frame
        cv2.imshow("Smart Surveillance AI", frame)

        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
