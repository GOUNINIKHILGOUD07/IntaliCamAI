import express from 'express';
import Camera from '../models/Camera.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all cameras
router.get('/', verifyToken, async (req, res) => {
  try {
    const cameras = await Camera.find().sort({ createdAt: -1 });
    res.json(cameras);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new camera
router.post('/add-camera', verifyToken, async (req, res) => {
  try {
    const { name, location, sourceUrl } = req.body;
    
    const camera = new Camera({
      name,
      location,
      sourceUrl,
      status: 'offline' // default status
    });

    await camera.save();
    res.status(201).json(camera);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a camera
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const camera = await Camera.findByIdAndDelete(req.params.id);
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json({ message: 'Camera deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update camera status (used by AI service to report status)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const camera = await Camera.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json(camera);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
