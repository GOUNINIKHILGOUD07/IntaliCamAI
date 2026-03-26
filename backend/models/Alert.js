import mongoose from 'mongoose';

const ALERT_TYPES = [
  'Person Detected',
  'Multiple People Detected',
  'No Person Detected',
  'Unauthorized Person Detected',
  'Intrusion in Restricted Area',
  'Entry During Off-Hours',
  'Exit Through Restricted Zone',
  'Loitering Detected',
  'Running Detected',
  'Person Following Another Person',
  'Frequent Entry/Exit',
  'Person Fell Down',
  'Violence/Fight Detected',
  'Person in Dangerous Zone',
  'Unknown Person Detected',
  'Known Person Identified',
  'Blacklisted Person Detected',
  'Missing Person Found',
  'Person Carrying Suspicious Object',
  'Object Left Behind',
];

const alertSchema = new mongoose.Schema({
  cameraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: false,   // Allow string IDs from AI service during dev
  },
  cameraName: {
    type: String,
    default: 'Unknown Camera',
  },
  detectionType: {
    type: String,
    required: true,
  },
  threatLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  person: {
    type: String,
    default: 'Unknown',
  },
  details: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
    default: 'PENDING',
  },
  resolvedAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for common query patterns
alertSchema.index({ timestamp: -1 });
alertSchema.index({ cameraId: 1, timestamp: -1 });
alertSchema.index({ threatLevel: 1, status: 1 });
alertSchema.index({ detectionType: 1 });

export default mongoose.model('Alert', alertSchema);
