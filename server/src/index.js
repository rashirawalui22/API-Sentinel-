require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const zod = require('zod');
const { User, Monitor, Check, Incident } = require('./models');
const { validatePublicUrl } = require('./safeUrl');
const { runCheck } = require('./checkService');

const app = express();
const port = process.env.PORT || 4000;
const mongoConnected = { value: false };
const memoryMonitors = [];

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

const monitorSchema = zod.object({
  name: zod.string().trim().min(1).max(80),
  url: zod.string().url().max(2048),
  method: zod.enum(['GET', 'POST', 'HEAD']).default('GET'),
  interval: zod.coerce.number().refine((value) => [30, 60, 300, 900].includes(value), 'Invalid check interval'),
});

const auth = (req, res, next) => {
  if (!process.env.JWT_SECRET) return res.status(503).json({ message: 'Authentication is not configured' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoConnected.value ? 'connected' : 'memory' }));

app.post('/api/auth/register', async (req, res) => {
  if (!mongoConnected.value) return res.status(503).json({ message: 'Configure MONGODB_URI to enable authentication' });
  const schema = zod.object({ name: zod.string().min(1), email: zod.string().email(), password: zod.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  const exists = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email is already registered' });
  const user = await User.create({ name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12) });
  const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  if (!mongoConnected.value) return res.status(503).json({ message: 'Configure MONGODB_URI to enable authentication' });
  const parsed = zod.object({ email: zod.string().email(), password: zod.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid email or password' });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return res.status(401).json({ message: 'Invalid email or password' });
  const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

app.get('/api/monitors', async (req, res) => {
  if (!mongoConnected.value) return res.json({ monitors: memoryMonitors });
  const monitors = await Monitor.find(req.headers.authorization ? { owner: jwt.verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET).sub } : {});
  res.json({ monitors });
});

app.post('/api/monitors', async (req, res) => {
  const parsed = monitorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  try {
    await validatePublicUrl(parsed.data.url);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  if (!mongoConnected.value) {
    const monitor = { _id: `${Date.now()}`, ...parsed.data, status: 'operational', responseTime: 0, uptime: 100 };
    memoryMonitors.push(monitor);
    return res.status(201).json({ monitor });
  }
  const monitor = await Monitor.create(parsed.data);
  res.status(201).json({ monitor });
});

app.put('/api/monitors/:id', async (req, res) => {
  const parsed = monitorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  try { await validatePublicUrl(parsed.data.url); } catch (error) { return res.status(400).json({ message: error.message }); }
  if (!mongoConnected.value) {
    const index = memoryMonitors.findIndex(monitor => monitor._id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Monitor not found' });
    memoryMonitors[index] = { ...memoryMonitors[index], ...parsed.data };
    return res.json({ monitor: memoryMonitors[index] });
  }
  const monitor = await Monitor.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
  res.json({ monitor });
});

app.delete('/api/monitors/:id', async (req, res) => {
  if (!mongoConnected.value) {
    const index = memoryMonitors.findIndex(monitor => monitor._id === req.params.id);
    if (index < 0) return res.status(404).json({ message: 'Monitor not found' });
    memoryMonitors.splice(index, 1);
    return res.status(204).end();
  }
  const monitor = await Monitor.findByIdAndDelete(req.params.id);
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
  await Check.deleteMany({ monitor: monitor._id });
  await Incident.deleteMany({ monitor: monitor._id });
  res.status(204).end();
});

app.post('/api/monitors/:id/check', async (req, res) => {
  if (!mongoConnected.value) {
    const monitor = memoryMonitors.find(item => item._id === req.params.id);
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
    const started = Date.now();
    try {
      await validatePublicUrl(monitor.url);
      monitor.status = 'operational';
      monitor.responseTime = Date.now() - started;
      res.json({ monitor });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } else {
    const monitor = await Monitor.findById(req.params.id);
    if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
    try { res.json({ monitor: await runCheck(monitor) }); } catch (error) { res.status(400).json({ message: error.message }); }
  }
});

app.get('/api/incidents', async (req, res) => {
  if (!mongoConnected.value) return res.json({ incidents: [] });
  res.json({ incidents: await Incident.find().sort({ startedAt: -1 }).limit(100).populate('monitor', 'name url') });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
      mongoConnected.value = true;
    } catch (error) {
      console.warn(`MongoDB unavailable (${error.message}); using memory mode`);
    }
  }
  cron.schedule('* * * * *', async () => {
    if (!mongoConnected.value) return;
    const due = await Monitor.find({ enabled: true });
    for (const monitor of due) {
      const intervalMs = monitor.interval * 1000;
      if (!monitor.lastCheckedAt || Date.now() - monitor.lastCheckedAt.getTime() >= intervalMs) {
        try { await runCheck(monitor); } catch (error) { console.error(`Check failed for ${monitor.name}: ${error.message}`); }
      }
    }
  });
  app.listen(port, () => console.log(`API Sentinel listening on http://localhost:${port}`));
}

start();
