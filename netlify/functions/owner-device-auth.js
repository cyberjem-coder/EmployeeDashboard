exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Method not allowed.' }) };
  const appsScriptUrl = process.env.HUB_APPS_SCRIPT_URL;
  const bridgeSecret = process.env.HUB_BRIDGE_SECRET;
  if (!appsScriptUrl || !bridgeSecret) return { statusCode: 503, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Owner authorization is not configured. Check HUB_APPS_SCRIPT_URL and HUB_BRIDGE_SECRET in Netlify, and HUB_NETLIFY_BRIDGE_SECRET in Apps Script.' }) };
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch (_) { return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid request.' }) }; }
  const action = String(input.action || '');
  if (!['status', 'register'].includes(action)) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Unsupported action.' }) };
  if (!/^[A-Za-z0-9-]{20,80}$/.test(String(input.deviceId || '')) || !/^[a-f0-9]{64}$/i.test(String(input.deviceToken || ''))) return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid computer identity. Refresh the page and try again.' }) };
  const payload = {
    action: action === 'status' ? 'netlifyDeviceStatus' : 'netlifyDeviceRegister',
    deviceId: input.deviceId,
    deviceToken: input.deviceToken,
    label: String(input.label || 'Authorized computer').slice(0, 60),
    bridgeSecret,
    password: action === 'register' ? String(input.password || '') : ''
  };
  try {
    const upstream = await fetch(appsScriptUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow' });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Apps Script returned an unreadable response. Check its Web App deployment.'); }
    if (!upstream.ok || result.ok === false) throw new Error(result.error || 'Apps Script rejected the device request.');
    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 502, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ ok: false, error: error.message || 'Could not contact the authorization server.' }) };
  }
};
