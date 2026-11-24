const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  alertEmail: { type: String, default: '' },
  alertEnabled: { type: Boolean, default: true },
}, { timestamps: true });

const monitorSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  url: { type: String, required: true, maxlength: 2048 },
  method: { type: String, enum: ['GET', 'POST', 'HEAD'], default: 'GET' },
  interval: { type: Number, enum: [30, 60, 300, 900], default: 60 },
  status: { type: String, enum: ['operational', 'down'], default: 'operational' },
  responseTime: { type: Number, default: 0 },
  lastCheckedAt: Date,
  consecutiveFailures: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

const checkSchema = new mongoose.Schema({
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
  statusCode: Number,
  responseTime: { type: Number, required: true },
  success: { type: Boolean, required: true },
  error: { type: String },
}, { timestamps: true });

const incidentSchema = new mongoose.Schema({
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
  type: { type: String, enum: ['downtime', 'http_error'], required: true },
  startedAt: { type: Date, required: true },
  recoveredAt: Date,
  statusCode: Number,
  message: String,
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Monitor: mongoose.model('Monitor', monitorSchema),
  Check: mongoose.model('Check', checkSchema),
  Incident: mongoose.model('Incident', incidentSchema),
};
