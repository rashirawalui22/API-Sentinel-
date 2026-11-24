const axios = require('axios');
const { validatePublicUrl } = require('./safeUrl');
const { Monitor, Check, Incident } = require('./models');
const { sendStateAlert } = require('./alertService');

async function runCheck(monitor, options = {}) {
  const validateUrl = options.validateUrl || validatePublicUrl;
  const request = options.request || axios.request;
  const url = await validateUrl(monitor.url);
  const started = Date.now();
  let statusCode = 0;
  let errorMessage = '';
  let success = false;
  try {
    const response = await request({
      url: url.toString(),
      method: monitor.method,
      timeout: 10000,
      maxRedirects: 2,
      validateStatus: () => true,
    });
    statusCode = response.status;
    success = response.status >= 200 && response.status < 400;
  } catch (error) {
    errorMessage = error.code || error.message;
  }
  const responseTime = Date.now() - started;
  const wasDown = monitor.status === 'down';
  monitor.status = success ? 'operational' : 'down';
  monitor.responseTime = responseTime;
  monitor.lastCheckedAt = new Date();
  monitor.consecutiveFailures = success ? 0 : (monitor.consecutiveFailures || 0) + 1;

  if (options.saveMonitor) {
    await options.saveMonitor(monitor);
  } else if (monitor.save) {
    await monitor.save();
  }

  const checkData = { monitor: monitor._id, statusCode, responseTime, success, error: errorMessage, createdAt: new Date() };
  if (options.recordCheck) {
    await options.recordCheck(checkData);
  } else {
    await Check.create(checkData);
  }

  if (!success && !wasDown) {
    const incident = {
      monitor: monitor._id,
      type: statusCode ? 'http_error' : 'downtime',
      startedAt: new Date(),
      statusCode,
      message: errorMessage || `HTTP ${statusCode}`,
    };
    if (options.recordIncident) {
      await options.recordIncident(incident);
    } else {
      await Incident.create(incident);
    }
    if (!options.skipAlerts) {
      await sendStateAlert(monitor, 'down').catch((error) => console.error(`Alert email failed: ${error.message}`));
    }
  }
  if (success && wasDown) {
    if (options.recordRecovery) {
      await options.recordRecovery(monitor._id);
    } else {
      await Incident.updateMany(
        { monitor: monitor._id, recoveredAt: { $exists: false } },
        { $set: { recoveredAt: new Date() } },
      );
    }
    if (!options.skipAlerts) {
      await sendStateAlert(monitor, 'operational').catch((error) => console.error(`Alert email failed: ${error.message}`));
    }
  }
  return monitor;
}

module.exports = { runCheck };
