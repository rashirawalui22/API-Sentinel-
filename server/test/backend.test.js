process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
delete process.env.MONGODB_URI;

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { resetMemoryState, auth, findOwnedMonitor, getOwnedMonitors, memoryMonitors, monitorSchema } = require('../src/index');
const { runCheck } = require('../src/checkService');

function authResult(headers = {}) {
  let status;
  let body;
  let nextCalled = false;
  const req = { headers };
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return this; },
  };
  auth(req, res, () => { nextCalled = true; });
  return { status, body, nextCalled, req };
}

test('authentication rejects missing, invalid, and expired tokens', () => {
  const missing = authResult();
  assert.equal(missing.status, 401);
  assert.equal(missing.body.message, 'Authentication required');

  const invalid = authResult({ authorization: 'Bearer not-a-valid-token' });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.message, 'Invalid or expired token');

  const expiredToken = jwt.sign({ sub: 'memory-user-one' }, process.env.JWT_SECRET, { expiresIn: -1 });
  const expired = authResult({ authorization: `Bearer ${expiredToken}` });
  assert.equal(expired.status, 401);
  assert.equal(expired.body.message, 'Invalid or expired token');

  const token = jwt.sign({ sub: 'memory-user-one' }, process.env.JWT_SECRET);
  const valid = authResult({ authorization: `Bearer ${token}` });
  assert.equal(valid.nextCalled, true);
  assert.equal(valid.status, undefined);
  assert.equal(valid.req.user.sub, 'memory-user-one');
});

test('memory ownership helpers isolate monitors by authenticated user', () => {
  resetMemoryState();
  const firstReq = { user: { sub: 'memory-user-one' } };
  const secondReq = { user: { sub: 'memory-user-two' } };
  memoryMonitors.push({ _id: 'monitor-one', owner: 'memory-user-one', name: 'Private API' });

  assert.equal(getOwnedMonitors(firstReq).length, 1);
  assert.equal(getOwnedMonitors(secondReq).length, 0);
  assert.equal(findOwnedMonitor(firstReq, 'monitor-one')?.owner, 'memory-user-one');
  assert.equal(findOwnedMonitor(secondReq, 'monitor-one'), undefined);
});

test('memory monitor ownership is not trustable through request body', () => {
  resetMemoryState();
  const parsed = monitorSchema.parse({
    name: 'Private API',
    url: 'https://example.com/health',
    method: 'GET',
    interval: 60,
    owner: 'attacker-controlled-user',
  });
  assert.equal('owner' in parsed, false);
});

test('successful health check records status, timing and success', async () => {
  const monitor = {
    _id: 'monitor-success',
    name: 'Success',
    url: 'https://example.com',
    method: 'GET',
    status: 'down',
    responseTime: 0,
  };
  let recordedCheck;
  let savedMonitor;

  const checked = await runCheck(monitor, {
    validateUrl: async (url) => new URL(url),
    request: async (config) => {
      assert.equal(config.timeout, 10000);
      return { status: 204 };
    },
    saveMonitor: async (item) => { savedMonitor = item; },
    recordCheck: async (check) => { recordedCheck = check; },
    recordIncident: async () => assert.fail('No incident expected'),
    recordRecovery: async (id) => assert.equal(id, monitor._id),
    skipAlerts: true,
  });

  assert.equal(checked.status, 'operational');
  assert.equal(savedMonitor.status, 'operational');
  assert.equal(recordedCheck.statusCode, 204);
  assert.equal(recordedCheck.success, true);
});

test('failed health check records failure and downtime without crashing', async () => {
  const monitor = {
    _id: 'monitor-failure',
    name: 'Failure',
    url: 'https://example.com',
    method: 'GET',
    status: 'operational',
    consecutiveFailures: 0,
  };
  let recordedCheck;
  let recordedIncident;

  const checked = await runCheck(monitor, {
    validateUrl: async (url) => new URL(url),
    request: async () => { throw { code: 'ECONNREFUSED', message: 'Connection refused' }; },
    saveMonitor: async (item) => assert.equal(item.status, 'down'),
    recordCheck: async (check) => { recordedCheck = check; },
    recordIncident: async (incident) => { recordedIncident = incident; },
    skipAlerts: true,
  });

  assert.equal(checked.status, 'down');
  assert.equal(checked.consecutiveFailures, 1);
  assert.equal(recordedCheck.statusCode, 0);
  assert.equal(recordedCheck.success, false);
  assert.equal(recordedCheck.error, 'ECONNREFUSED');
  assert.equal(recordedIncident.type, 'downtime');
});
