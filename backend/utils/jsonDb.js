import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const CAMERAS_PATH = path.join(DATA_DIR, 'cameras.json');
const ALERTS_PATH = path.join(DATA_DIR, 'alerts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Helper functions for file operations ────────────────────────────────────
const readJSON = (filePath, defaultValue = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`[JSONDB] Error reading ${filePath}:`, e);
    return defaultValue;
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[JSONDB] Error writing to ${filePath}:`, e);
  }
};

// ── Prepopulate mock cameras if file doesn't exist ──────────────────────────
const getInitialCameras = () => [
  {
    _id: "cam_1",
    id: "cam_1",
    name: "Front Gate Entrance",
    location: "Main Gate",
    sourceUrl: "rtsp://mock-stream-1",
    status: "online",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    _id: "cam_2",
    id: "cam_2",
    name: "Backyard Perimeter",
    location: "Backyard Garden",
    sourceUrl: "rtsp://mock-stream-2",
    status: "online",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    _id: "cam_3",
    id: "cam_3",
    name: "Parking Garage B1",
    location: "Underground Garage",
    sourceUrl: "rtsp://mock-stream-3",
    status: "offline",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    _id: "cam_4",
    id: "cam_4",
    name: "Main Office Lobby",
    location: "Lobby Area",
    sourceUrl: "rtsp://mock-stream-4",
    status: "online",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// ── Prepopulate mock alerts if file doesn't exist ───────────────────────────
const getInitialAlerts = () => [
  {
    _id: "alert_1",
    id: "alert_1",
    cameraId: "cam_1",
    cameraName: "Front Gate Entrance",
    detectionType: "person",
    threatLevel: "medium",
    person: "Unknown Male",
    details: "Loitering near entrance fence",
    confidence: 0.92,
    status: "PENDING",
    imageUrl: "",
    timestamp: new Date(Date.now() - 1800000).toISOString() // 30 mins ago
  },
  {
    _id: "alert_2",
    id: "alert_2",
    cameraId: "cam_2",
    cameraName: "Backyard Perimeter",
    detectionType: "person",
    threatLevel: "high",
    person: "Intruder",
    details: "Unidentified person in restricted backyard zone",
    confidence: 0.96,
    status: "PENDING",
    imageUrl: "",
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    _id: "alert_3",
    id: "alert_3",
    cameraId: "cam_4",
    cameraName: "Main Office Lobby",
    detectionType: "motion",
    threatLevel: "low",
    person: "Staff",
    details: "Regular cleaning crew detected after hours",
    confidence: 0.88,
    status: "RESOLVED",
    imageUrl: "",
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    _id: "alert_4",
    id: "alert_4",
    cameraId: "cam_3",
    cameraName: "Parking Garage B1",
    detectionType: "vehicle",
    threatLevel: "low",
    person: "None",
    details: "Delivery van parked in loading dock",
    confidence: 0.94,
    status: "DISMISSED",
    imageUrl: "",
    timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
  }
];

// Initialize files if they don't exist
readJSON(USERS_PATH, []);
readJSON(CAMERAS_PATH, getInitialCameras());
readJSON(ALERTS_PATH, getInitialAlerts());

// ── User Operations ──────────────────────────────────────────────────────────
export const getUsers = () => readJSON(USERS_PATH, []);
export const saveUsers = (users) => writeJSON(USERS_PATH, users);
export const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(u => u.email === email);
};
export const addUser = (user) => {
  const users = getUsers();
  const newUser = { ...user, _id: Date.now().toString(), id: Date.now().toString() };
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

// ── Camera Operations ────────────────────────────────────────────────────────
export const getCameras = () => readJSON(CAMERAS_PATH, getInitialCameras());
export const saveCameras = (cameras) => writeJSON(CAMERAS_PATH, cameras);
export const addCamera = (cameraData) => {
  const cameras = getCameras();
  const id = "cam_" + Date.now().toString();
  const newCamera = {
    ...cameraData,
    _id: id,
    id: id,
    status: cameraData.status || 'offline',
    createdAt: new Date().toISOString()
  };
  cameras.push(newCamera);
  saveCameras(cameras);
  return newCamera;
};
export const updateCamera = (id, updateData) => {
  const cameras = getCameras();
  const idx = cameras.findIndex(c => c._id === id || c.id === id);
  if (idx === -1) return null;
  cameras[idx] = { ...cameras[idx], ...updateData };
  saveCameras(cameras);
  return cameras[idx];
};
export const deleteCamera = (id) => {
  const cameras = getCameras();
  const idx = cameras.findIndex(c => c._id === id || c.id === id);
  if (idx === -1) return false;
  cameras.splice(idx, 1);
  saveCameras(cameras);
  return true;
};

// ── Alert Operations ─────────────────────────────────────────────────────────
export const getAlerts = () => readJSON(ALERTS_PATH, getInitialAlerts());
export const saveAlerts = (alerts) => writeJSON(ALERTS_PATH, alerts);
export const addAlert = (alertData) => {
  const alerts = getAlerts();
  const id = "alert_" + Date.now().toString();
  const newAlert = {
    ...alertData,
    _id: id,
    id: id,
    status: alertData.status || 'PENDING',
    timestamp: alertData.timestamp || new Date().toISOString()
  };
  alerts.push(newAlert);
  saveAlerts(alerts);
  return newAlert;
};
export const updateAlertStatus = (id, status, extraFields = {}) => {
  const alerts = getAlerts();
  const idx = alerts.findIndex(a => a._id === id || a.id === id);
  if (idx === -1) return null;
  alerts[idx] = { ...alerts[idx], status, ...extraFields };
  saveAlerts(alerts);
  return alerts[idx];
};
export const deleteAlert = (id) => {
  const alerts = getAlerts();
  const idx = alerts.findIndex(a => a._id === id || a.id === id);
  if (idx === -1) return false;
  alerts.splice(idx, 1);
  saveAlerts(alerts);
  return true;
};
