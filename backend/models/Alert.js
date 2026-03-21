import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  cameraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: true
  },
  detectionType: {
    type: String,
    required: true // e.g., 'person', 'weapon'
  },
  threatLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  imageUrl: {
    type: String // Optional: Path to snapshot
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Alert', alertSchema);
