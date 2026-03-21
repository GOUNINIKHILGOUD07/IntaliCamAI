import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    required: true // Can be a local path, RTSP url, or 0 for webcam
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  }
}, { timestamps: true });

export default mongoose.model('Camera', cameraSchema);
