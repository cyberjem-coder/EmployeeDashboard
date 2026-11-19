const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../netlify/functions/employee-hub-api.js');
const ownerAuth = require('../netlify/functions/owner-device-auth.js');

test('Netlify dashboard API forwards approved operations using server-side bridge secret', async () => {
  const oldUrl = process.env.HUB_APPS_SCRIPT_URL;
  const oldSecret = process.env.HUB_BRIDGE_SECRET;
  const oldFetch = global.fetch;
  process.env.HUB_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.HUB_BRIDGE_SECRET = 'test-secret-not-for-browser';
  let sent;
  global.fetch = async (url, options) => {
    sent = { url, options, payload: JSON.parse(options.body) };
    return new Response(JSON.stringify({ ok: true, result: { revision: 12 } }), { status: 200 });
  };
  try {
    const response = await api.handler({
      httpMethod: 'POST',
      body: JSON.stringify({ method: 'getHubRevision', args: ['device-12345678901234567890', 'a'.repeat(64)] })
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true, result: { revision: 12 } });
    assert.equal(sent.payload.action, 'netlifyHubApi');
    assert.equal(sent.payload.method, 'getHubRevision');
    assert.equal(sent.payload.bridgeSecret, 'test-secret-not-for-browser');
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.HUB_APPS_SCRIPT_URL; else process.env.HUB_APPS_SCRIPT_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.HUB_BRIDGE_SECRET; else process.env.HUB_BRIDGE_SECRET = oldSecret;
  }
});


test('Owner Authorization password is checked by Apps Script, not a stale Netlify password variable', async () => {
  const oldUrl = process.env.HUB_APPS_SCRIPT_URL;
  const oldSecret = process.env.HUB_BRIDGE_SECRET;
  const oldPassword = process.env.OWNER_PASSWORD;
  const oldFetch = global.fetch;
  process.env.HUB_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.HUB_BRIDGE_SECRET = 'test-secret';
  delete process.env.OWNER_PASSWORD;
  let forwarded;
  global.fetch = async (_url, options) => {
    forwarded = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, authorized: true }), { status: 200 });
  };
  try {
    const response = await ownerAuth.handler({
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'register', deviceId: 'device-12345678901234567890', deviceToken: 'b'.repeat(64), password: 'a-long-owner-password', label: 'Test PC' })
    });
    assert.equal(response.statusCode, 200);
    assert.equal(forwarded.action, 'netlifyDeviceRegister');
    assert.equal(forwarded.password, 'a-long-owner-password');
    assert.equal(forwarded.bridgeSecret, 'test-secret');
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.HUB_APPS_SCRIPT_URL; else process.env.HUB_APPS_SCRIPT_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.HUB_BRIDGE_SECRET; else process.env.HUB_BRIDGE_SECRET = oldSecret;
    if (oldPassword === undefined) delete process.env.OWNER_PASSWORD; else process.env.OWNER_PASSWORD = oldPassword;
  }
});

test('Netlify dashboard API rejects unknown methods before contacting Apps Script', async () => {
  const oldUrl = process.env.HUB_APPS_SCRIPT_URL;
  const oldSecret = process.env.HUB_BRIDGE_SECRET;
  const oldFetch = global.fetch;
  process.env.HUB_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.HUB_BRIDGE_SECRET = 'test-secret';
  let called = false;
  global.fetch = async () => { called = true; throw new Error('should not be called'); };
  try {
    const response = await api.handler({ httpMethod: 'POST', body: JSON.stringify({ method: 'deleteAllData', args: [] }) });
    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).ok, false);
    assert.equal(called, false);
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.HUB_APPS_SCRIPT_URL; else process.env.HUB_APPS_SCRIPT_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.HUB_BRIDGE_SECRET; else process.env.HUB_BRIDGE_SECRET = oldSecret;
  }
});


test('Apps Script routes the Netlify dashboard bridge before the general snapshot lock', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'APPS_SCRIPT_UPDATED_Code.gs'), 'utf8');
  const route = code.indexOf("bridgePayload.action === 'netlifyHubApi'");
  const lock = code.indexOf('const lock = LockService.getScriptLock();', code.indexOf('function doPost(e)'));
  assert(route >= 0 && lock > route, 'dashboard API bridge is routed before the snapshot lock');
  for (const method of ['getHubRevision','getHubSnapshot','saveHubSnapshot','archiveEmployeeHubRecords','startTaskEvidenceUpload','appendTaskEvidenceUploadChunk','finishTaskEvidenceUpload','setHubOwnerDevicePassword','listHubDevices','revokeHubDevice']) {
    assert(code.includes(method + ':'), `Apps Script allowlist includes ${method}`);
  }
});

test('Netlify entry and Apps Script HTML preserve their separate bridge modes', () => {
  for (const file of ['Index.html', 'employee_hub_black_gold_mission_control_v10_6_rewards_payslip.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(html, /V10\.12 ADDITIVE TASK PHOTO & VIDEO EVIDENCE MODULE/);
    if (file === 'Index.html') {
      assert.match(html, /V10\.15 ADDITIVE NETLIFY COMPATIBILITY BRIDGE/);
      assert.match(html, /function startDeviceAuthorization\(/);
      assert.match(html, /function hubRefreshCloudRevision\(/);
    } else {
      assert.match(html, /google\.script\.run\.withSuccessHandler/);
    }
    assert.match(html, /function printSlip\(\).*?w\.document\.close\(\)/s);
  }
});
