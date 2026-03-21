import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

// Load env vars
dotenv.config();

// Route files
import authRoutes from './routes/auth.js';
import cameraRoutes from './routes/cameras.js';
import alertRoutes from './routes/alerts.js';

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Logging
app.use(morgan('dev'));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
        console.error('Database connection failed', error);
        process.exit(1);
    }
};

startServer();
