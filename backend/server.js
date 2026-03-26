import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

dotenv.config();

// Route files
import authRoutes    from './routes/auth.js';
import cameraRoutes  from './routes/cameras.js';
import alertRoutes   from './routes/alerts.js';

const app        = express();
const httpServer = createServer(app);

// ── Socket.io setup ────────────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible inside route handlers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));  // Allow larger payloads (base64 images)
app.use(cors());
app.use(morgan('dev'));

// Serve snapshot images statically
app.use('/snapshots', express.static('snapshots'));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/alerts',  alertRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    message:   'IntalicamAI backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let dbConnected = false;

// Middleware to block DB-dependent routes if MongoDB is down
app.use('/api/cameras', (req, res, next) => {
  if (!dbConnected) return res.status(503).json({ message: 'Database not connected. Use streaming backend on port 8000 for camera management.' });
  next();
});
app.use('/api/alerts', (req, res, next) => {
  if (!dbConnected && req.method !== 'POST') return res.status(503).json({ message: 'Database not connected.' });
  next();
});

const connectWithRetry = () => {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      dbConnected = true;
      console.log('[DB] MongoDB connected');
    })
    .catch((err) => {
      console.error(`[DB] Connection failed (${err.message}) — retrying in 10s…`);
      setTimeout(connectWithRetry, 10000);
    });
};

httpServer.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  console.log(`[WS]     Socket.io ready`);
  connectWithRetry();  // Connect in background; server is already up
});

