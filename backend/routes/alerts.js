import express from 'express';
import fs from 'fs';
import path from 'path';
import Alert from '../models/Alert.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/alerts/trends — Hourly trends for dashboard graph ─────────────
router.get('/trends', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Alert.aggregate([
      { $match: { timestamp: { $gte: today } } },
      {
        $group: {
          _id: {
            bucket: { $floor: { $divide: [{ $hour: "$timestamp" }, 2] } },
          },
          activityCount: { $sum: 1 },
          alertCount: {
            $sum: {
              $cond: [{ $in: ["$threatLevel", ["high", "critical"]] }, 1, 0]
            }
          }
        }
      },
      { $sort: { "_id.bucket": 1 } }
    ]);

    const activity = new Array(12).fill(0);
    const alerts = new Array(12).fill(0);

    stats.forEach(s => {
      const b = s._id.bucket;
      if (b >= 0 && b < 12) {
        activity[b] = s.activityCount * 2; // Scaling for visual parity with mock
        alerts[b]   = s.alertCount;
      }
    });

    res.json({ activity, alerts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── Helper: emit real-time event via Socket.io attached to app ─────────────
const emitAlert = (req, alert) => {
  const io = req.app.get('io');
  if (io) {
    console.log(`[WS] Emitting new_alert: ${alert.detectionType}`);
    io.emit('new_alert', alert);
  }
};

// ── GET /api/alerts — Recent alerts (paginated) ────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const page     = parseInt(req.query.page)     || 1;
    const limit    = parseInt(req.query.limit)    || 50;
    const severity = req.query.severity || null;
    const status   = req.query.status   || null;
    const type     = req.query.type     || null;
    const camera   = req.query.camera   || null;
    const from     = req.query.from     || null;
    const to       = req.query.to       || null;

    const filter = {};
    if (severity) filter.threatLevel   = severity;
    if (status)   filter.status        = status;
    if (type)     filter.detectionType = { $regex: type, $options: 'i' };
    if (camera)   filter.cameraName    = { $regex: camera, $options: 'i' };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to)   filter.timestamp.$lte = new Date(to);
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
    ]);

    res.json({
      alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── GET /api/alerts/stats — Summary stats for dashboard ───────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalToday,
      pendingCount,
      criticalToday,
      byType,
      bySeverity,
    ] = await Promise.all([
      Alert.countDocuments({ timestamp: { $gte: today } }),
      Alert.countDocuments({ status: 'PENDING' }),
      Alert.countDocuments({ timestamp: { $gte: today }, threatLevel: 'critical' }),
      Alert.aggregate([
        { $group: { _id: '$detectionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Alert.aggregate([
        { $group: { _id: '$threatLevel', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ totalToday, pendingCount, criticalToday, byType, bySeverity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── GET /api/alerts/history — Full history with pagination ─────────────────
router.get('/history', verifyToken, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 100;
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Alert.countDocuments();
    res.json({ alerts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── POST /api/alerts — Create alert (called by Python AI service) ──────────
router.post('/', async (req, res) => {
  try {
    // Optional internal secret header check
    const secret = req.headers['x-service-secret'];
    if (process.env.SERVICE_SECRET && secret !== process.env.SERVICE_SECRET) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let {
      cameraId,
      cameraName,
      detectionType,
      threatLevel,
      imageUrl,
      person,
      details,
      timestamp,
      confidence,
    } = req.body;

    if (!detectionType || !threatLevel) {
      return res.status(400).json({ message: 'detectionType and threatLevel are required.' });
    }

    // Handle base64 imaging: if imageUrl is a long data string, save to file
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
        const filename = `snap_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const uploadDir = path.join(process.cwd(), 'snapshots');
        
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        fs.writeFileSync(path.join(uploadDir, filename), base64Data, 'base64');
        imageUrl = `snapshots/${filename}`;
      } catch (err) {
        console.error('[BACKEND] Failed to save snapshot:', err);
      }
    }

    const alertData = {
      cameraId:      cameraId   || undefined,
      cameraName:    cameraName || 'Unknown Camera',
      detectionType,
      threatLevel:   threatLevel.toLowerCase(),
      imageUrl:      imageUrl   || '',
      person:        person     || 'Unknown',
      details:       details    || '',
      confidence:    confidence || 1.0,
      timestamp:     timestamp  ? new Date(timestamp) : new Date(),
      status:        'PENDING',
    };

    const alert = new Alert(alertData);
    await alert.save();

    // Push via Socket.io to all connected frontend clients
    emitAlert(req, alert);

    res.status(201).json(alert);
  } catch (error) {
    console.error('[ALERTS] POST error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── PATCH /api/alerts/:id/resolve — Mark alert resolved ───────────────────
router.patch('/:id/resolve', verifyToken, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'RESOLVED', resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── PATCH /api/alerts/:id/dismiss — Dismiss alert ─────────────────────────
router.patch('/:id/dismiss', verifyToken, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'DISMISSED' },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── DELETE /api/alerts/:id — Delete single alert ──────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
