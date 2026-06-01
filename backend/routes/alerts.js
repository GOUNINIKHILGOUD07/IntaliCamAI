import express from 'express';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import { verifyToken } from '../middleware/auth.js';
import { getAlerts, addAlert, updateAlertStatus, deleteAlert } from '../utils/jsonDb.js';

const router = express.Router();

// ── GET /api/alerts/trends — Hourly trends for dashboard graph ─────────────
router.get('/trends', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const activity = new Array(12).fill(0);
    const alerts = new Array(12).fill(0);

    if (isDbConnected) {
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

      stats.forEach(s => {
        const b = s._id.bucket;
        if (b >= 0 && b < 12) {
          activity[b] = s.activityCount * 2; // Scaling for visual parity with mock
          alerts[b]   = s.alertCount;
        }
      });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allAlerts = getAlerts();
      const todayAlerts = allAlerts.filter(a => new Date(a.timestamp) >= today);

      const buckets = {};
      todayAlerts.forEach(a => {
        const hour = new Date(a.timestamp).getHours();
        const bucket = Math.floor(hour / 2);
        if (!buckets[bucket]) {
          buckets[bucket] = { activityCount: 0, alertCount: 0 };
        }
        buckets[bucket].activityCount += 1;
        if (['high', 'critical'].includes((a.threatLevel || '').toLowerCase())) {
          buckets[bucket].alertCount += 1;
        }
      });

      for (let b = 0; b < 12; b++) {
        if (buckets[b]) {
          activity[b] = buckets[b].activityCount * 2;
          alerts[b]   = buckets[b].alertCount;
        }
      }
    }

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

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
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

      return res.json({
        alerts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } else {
      let alerts = getAlerts();

      if (severity) {
        alerts = alerts.filter(a => (a.threatLevel || '').toLowerCase() === severity.toLowerCase());
      }
      if (status) {
        alerts = alerts.filter(a => a.status === status);
      }
      if (type) {
        alerts = alerts.filter(a => (a.detectionType || '').toLowerCase().includes(type.toLowerCase()));
      }
      if (camera) {
        alerts = alerts.filter(a => (a.cameraName || '').toLowerCase().includes(camera.toLowerCase()));
      }
      if (from) {
        const fromDate = new Date(from);
        alerts = alerts.filter(a => new Date(a.timestamp) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        alerts = alerts.filter(a => new Date(a.timestamp) <= toDate);
      }

      alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const total = alerts.length;
      const paginatedAlerts = alerts.slice((page - 1) * limit, page * limit);

      return res.json({
        alerts: paginatedAlerts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── GET /api/alerts/stats — Summary stats for dashboard ───────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
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
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alerts = getAlerts();

      const totalToday = alerts.filter(a => new Date(a.timestamp) >= today).length;
      const pendingCount = alerts.filter(a => a.status === 'PENDING').length;
      const criticalToday = alerts.filter(a => new Date(a.timestamp) >= today && (a.threatLevel || '').toLowerCase() === 'critical').length;

      // Group by type
      const typeMap = {};
      alerts.forEach(a => {
        typeMap[a.detectionType] = (typeMap[a.detectionType] || 0) + 1;
      });
      const byType = Object.keys(typeMap).map(k => ({ _id: k, count: typeMap[k] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Group by severity
      const sevMap = {};
      alerts.forEach(a => {
        sevMap[a.threatLevel] = (sevMap[a.threatLevel] || 0) + 1;
      });
      const bySeverity = Object.keys(sevMap).map(k => ({ _id: k, count: sevMap[k] }));

      res.json({ totalToday, pendingCount, criticalToday, byType, bySeverity });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── GET /api/alerts/history — Full history with pagination ─────────────────
router.get('/history', verifyToken, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 100;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const alerts = await Alert.find()
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      const total = await Alert.countDocuments();
      res.json({ alerts, total, page, pages: Math.ceil(total / limit) });
    } else {
      const alerts = getAlerts().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const total = alerts.length;
      const paginatedAlerts = alerts.slice((page - 1) * limit, page * limit);
      res.json({ alerts: paginatedAlerts, total, page, pages: Math.ceil(total / limit) });
    }
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

    let alert;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      alert = new Alert(alertData);
      await alert.save();
    } else {
      alert = addAlert(alertData);
    }

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
    const isDbConnected = mongoose.connection.readyState === 1;
    let alert;

    if (isDbConnected) {
      alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { status: 'RESOLVED', resolvedAt: new Date() },
        { new: true }
      );
    } else {
      alert = updateAlertStatus(req.params.id, 'RESOLVED', { resolvedAt: new Date().toISOString() });
    }

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── PATCH /api/alerts/:id/dismiss — Dismiss alert ─────────────────────────
router.patch('/:id/dismiss', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let alert;

    if (isDbConnected) {
      alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { status: 'DISMISSED' },
        { new: true }
      );
    } else {
      alert = updateAlertStatus(req.params.id, 'DISMISSED');
    }

    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── DELETE /api/alerts/:id — Delete single alert ──────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let deleted = false;

    if (isDbConnected) {
      const alert = await Alert.findByIdAndDelete(req.params.id);
      deleted = !!alert;
    } else {
      deleted = deleteAlert(req.params.id);
    }

    if (!deleted) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
