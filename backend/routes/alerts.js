import express from 'express';
import Alert from '../models/Alert.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get recent alerts
router.get('/', verifyToken, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .populate('cameraId', 'name location status')
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get activity history (all alerts with optional filters)
router.get('/history', verifyToken, async (req, res) => {
  try {
    // Basic filtering can be added here
    const alerts = await Alert.find()
      .populate('cameraId', 'name location')
      .sort({ timestamp: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new alert (Called by the AI Python script)
// No verifyToken here as it is an internal service call, but we should add a secret key check in prod
router.post('/', async (req, res) => {
  try {
    const { cameraId, detectionType, threatLevel, imageUrl } = req.body;

    const alert = new Alert({
      cameraId,
      detectionType,
      threatLevel,
      imageUrl
    });

    await alert.save();
    
    // In a real system, we might use WebSockets/Socket.io to push this to the frontend instantly
    
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


export default router;
