EMPLOYEE HUB V10.15 — NETLIFY OWNER AUTHORIZATION BRIDGE FIX
=============================================================

WHAT WAS FIXED
--------------
The previous doPost(e) took the Apps Script script lock before routing a
Netlify device-registration request. The Owner Password verifier also takes
that same lock. This could make a correct password fail with a lock timeout.

The updated Apps Script backend now routes Netlify device-bridge requests
before taking the general snapshot lock. Normal Employee Hub snapshot sync
and Food Cost payroll-export handling remain in the existing locked path.

The Netlify Function and Owner Security UI are retained. The UI already
shows the password-entry form after a status-check error.

IMPORTANT: This is a source-level correction. It has NOT been deployed or
tested against your live Netlify site or live Google spreadsheet.

FILES
-----
- Index.html: existing Employee Hub interface, including the Netlify auth UI.
- netlify/functions/owner-device-auth.js: server-side authorization endpoint.
- netlify.toml: publish directory and Netlify Functions directory.
- employee_hub_google_sheets_v5.gs: updated Apps Script backend.
- APPS_SCRIPT_UPDATED_Code.gs: same updated backend, ready to copy into the
  bound Apps Script Code.gs file (includes the editor's default myFunction stub).
- All original manuals, guides, and tests from the uploaded ZIP are retained.

NETLIFY ENVIRONMENT VARIABLES
-----------------------------
Add these THREE variables to the Employee Dashboard Netlify site's environment
variables. Do not send their values to ChatGPT or put them in source files.

1. OWNER_PASSWORD
   Value: EXACTLY the same Owner Authorization Password you already created
   by running bootstrapHubOwnerDevicePasswordOnce() in Apps Script.
   Do not create a different password for Netlify.

2. HUB_APPS_SCRIPT_URL
   Value: the deployed Employee Dashboard Apps Script Web App URL ending in
   /exec. Use the URL for the bound Employee Dashboard spreadsheet project.

3. HUB_BRIDGE_SECRET
   Value: a newly generated random secret with at least 32 characters.
   Keep it private.

APPS SCRIPT SCRIPT PROPERTY
---------------------------
In Apps Script:
1. Open Project Settings (gear icon).
2. Find Script Properties.
3. Add this property:
   Property: HUB_NETLIFY_BRIDGE_SECRET
   Value: the exact same secret used for Netlify HUB_BRIDGE_SECRET.
4. Save the property.

Do NOT add OWNER_PASSWORD or HUB_APPS_SCRIPT_URL as Apps Script Script
Properties. Do NOT share either secret in screenshots or chat.

UPDATE THE EXISTING APPS SCRIPT CODE
------------------------------------
The current Apps Script project has a Code.gs file. Before changing it:
1. Open Code.gs.
2. Press Ctrl+A, then Ctrl+C.
3. Paste the copied original into Notepad and save a backup file.
4. Open APPS_SCRIPT_UPDATED_Code.gs from this ZIP.
5. Copy its complete contents.
6. Return to the bound Employee Dashboard Apps Script Code.gs file, select
   its contents, and paste the updated backend.
7. Click Save.

This updated backend is based on the backend in the uploaded ZIP and retains
its existing employee, attendance, payroll, audit, archive, evidence, and
device-registry functions. If you have made additional code changes since
creating the uploaded ZIP, stop and compare them before replacing Code.gs.

DEPLOY A NEW APPS SCRIPT VERSION
--------------------------------
After saving Code.gs:
1. Click Deploy > Manage deployments.
2. Find the existing Web App deployment.
3. Click its Edit (pencil) icon.
4. For Version, choose New version.
5. Keep the existing Execute as and Who has access settings unchanged.
6. Click Deploy.
7. Use the deployed /exec URL in HUB_APPS_SCRIPT_URL.

Do not change the access setting to Anyone as part of this repair. If the
existing deployment does not allow the Netlify server to reach doPost, we
must diagnose that response before changing access.

NETLIFY DEPLOY
--------------
The supplied netlify.toml sets:
- Publish directory: .
- Functions directory: netlify/functions.

Keep the files at the repository root (the ZIP has no extra enclosing folder).
Update the connected GitHub repository with these files and allow Netlify to
build the production deploy. The Netlify build must show that it bundled
owner-device-auth.js. A skipped/paused build is not a successful deployment.

AFTER DEPLOYMENT
----------------
1. Open the Netlify Employee Dashboard website.
2. Refresh the page.
3. Enter the same Owner Password you created in Apps Script.
4. Enter a computer name such as Main Cashier PC.
5. Click AUTHORIZE THIS COMPUTER.
6. The computer should be registered in the Authorized Devices sheet.

If it still fails, copy only the visible error text. Do not share passwords,
bridge secrets, device tokens, or private credentials.

PRESERVATION / SAFETY
---------------------
- The patch changes the order in which the Netlify bridge is handled in
  doPost(e), preventing the nested script-lock timeout.
- Existing device IDs, token hashes, registration rows, and revocation
  records are not deleted by this code patch.
- No spreadsheet sheets or employee rows are deleted by creating this ZIP.
- No dashboard tabs, employee PINs, tasks, payroll formulas, evidence uploads,
  archive logic, or other dashboard sections are intentionally removed.
- The normal snapshot-sync path and payroll-export path remain in place.
- The original uploaded files are retained in this ZIP, except that the Apps
  Script backend file is updated with the lock-order correction.
- This ZIP does not itself change your live Netlify site or live spreadsheet.
