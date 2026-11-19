const ALLOWED_METHODS = new Set([
  'getHubRevision', 'getHubSnapshot', 'saveHubSnapshot',
  'archiveEmployeeHubRecords', 'uploadTaskEvidence',
  'startTaskEvidenceUpload', 'appendTaskEvidenceUploadChunk',
  'finishTaskEvidenceUpload', 'setHubOwnerDevicePassword',
  'listHubDevices', 'revokeHubDevice'
]);

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });
  const appsScriptUrl = process.env.HUB_APPS_SCRIPT_URL;
  const bridgeSecret = process.env.HUB_BRIDGE_SECRET;
  if (!appsScriptUrl || !bridgeSecret) return json(503, { ok: false, error: 'Employee Hub server connection is not configured. Check HUB_APPS_SCRIPT_URL and HUB_BRIDGE_SECRET in Netlify.' });
  let input;
  try { input = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { ok: false, error: 'Invalid request body.' }); }
  const method = String(input.method || '');
  const args = Array.isArray(input.args) ? input.args : [];
  if (!ALLOWED_METHODS.has(method)) return json(400, { ok: false, error: 'Unsupported Employee Hub operation.' });
  // Chunk requests are deliberately small. This also prevents accidentally
  // forwarding an oversized evidence payload through a Netlify function.
  if (Buffer.byteLength(event.body || '', 'utf8') > 5000000) return json(413, { ok: false, error: 'Request is too large for the Netlify API. Evidence uploads must be sent in smaller chunks; if a full snapshot exceeds this limit, report the sync error before retrying.' });
  try {
    const upstream = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'netlifyHubApi', method, args, bridgeSecret }),
      redirect: 'follow'
    });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Apps Script returned an unreadable response. Check the Web App deployment URL and version.'); }
    if (!upstream.ok || result.ok === false) return json(400, { ok: false, error: result.error || 'Apps Script rejected the dashboard operation.' });
    return json(200, { ok: true, result: result.result });
  } catch (error) {
    return json(502, { ok: false, error: error && error.message ? error.message : 'Could not contact the Employee Hub Apps Script server.' });
  }
};
