import express from 'express';
import mongoose from 'mongoose';
import Camera from '../models/Camera.js';
import { verifyToken } from '../middleware/auth.js';
import { getCameras, addCamera, updateCamera, deleteCamera } from '../utils/jsonDb.js';

const router = express.Router();

// Get all cameras
router.get('/', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let cameras;
    if (isDbConnected) {
      cameras = await Camera.find().sort({ createdAt: -1 });
    } else {
      cameras = getCameras().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    res.json(cameras);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new camera
router.post('/add-camera', verifyToken, async (req, res) => {
  try {
    const { name, location, sourceUrl } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;
    
    let camera;
    if (isDbConnected) {
      camera = new Camera({
        name,
        location,
        sourceUrl,
        status: 'offline' // default status
      });
      await camera.save();
    } else {
      camera = addCamera({ name, location, sourceUrl, status: 'offline' });
    }
    res.status(201).json(camera);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a camera
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, location, sourceUrl } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    let camera;
    if (isDbConnected) {
      camera = await Camera.findByIdAndUpdate(
        req.params.id,
        { name, location, sourceUrl },
        { new: true, runValidators: true }
      );
    } else {
      camera = updateCamera(req.params.id, { name, location, sourceUrl });
    }
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json(camera);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a camera
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let deleted = false;
    if (isDbConnected) {
      const camera = await Camera.findByIdAndDelete(req.params.id);
      deleted = !!camera;
    } else {
      deleted = deleteCamera(req.params.id);
    }
    if (!deleted) return res.status(404).json({ message: 'Camera not found' });
    res.json({ message: 'Camera deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update camera status (used by AI service to report status)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    let camera;
    if (isDbConnected) {
      camera = await Camera.findByIdAndUpdate(req.params.id, { status }, { new: true });
    } else {
      camera = updateCamera(req.params.id, { status });
    }
    if (!camera) return res.status(404).json({ message: 'Camera not found' });
    res.json(camera);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
