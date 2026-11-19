EMPLOYEE HUB V10.15 — ADDITIVE NETLIFY OWNER AUTHORIZATION BRIDGE

WHAT THIS PATCH DOES
- Replaces the static-hosting block on the existing Owner Security gate with a same-site Netlify Function call.
- Netlify checks OWNER_PASSWORD server-side; it is never sent back to the browser.
- Netlify talks to the existing bound Apps Script backend using a separate shared bridge secret.
- Apps Script initializes the existing salted Owner Password hash on the first successful website authorization, then uses its existing password verifier and five-failure / 15-minute lockout for later attempts.
- Apps Script continues to store device IDs and hashed device tokens in the existing Authorized Devices sheet.
- Existing device credentials, registration records, and revocation status are retained.

IMPORTANT: This is a source package and has NOT been deployed or tested against your live spreadsheet. Do not deploy until the setup below is complete and you have a backup.

NETLIFY BUILD CONFIG
- This repository is deployed from its root. The supplied netlify.toml sets publish="." and functions="netlify/functions".
- Your Netlify screen showed Publish directory: Not set and Functions directory: netlify/functions. The root publish setting matches that current root deployment.

REQUIRED NETLIFY ENVIRONMENT VARIABLES
1. OWNER_PASSWORD = your strong Owner Password (use at least 16 characters).
2. HUB_APPS_SCRIPT_URL = the deployed bound Apps Script Web App URL ending in /exec.
3. HUB_BRIDGE_SECRET = a long random secret, at least 32 characters.

APPS SCRIPT SETUP
- In the bound Employee Dashboard spreadsheet, open Extensions > Apps Script.
- Add the updated employee_hub_google_sheets_v5.gs code to the existing backend file without deleting unrelated project files/functions.
- In Apps Script Project Settings > Script Properties, add HUB_NETLIFY_BRIDGE_SECRET with EXACTLY the same value as Netlify HUB_BRIDGE_SECRET. The Owner Password hash is initialized automatically on the first successful website authorization; you do not need to run the old one-time password setup function for this Netlify flow.
- Keep the existing spreadsheet binding and existing Web App deployment. After updating code, create a new Web App deployment version (or edit the existing deployment) and retain its existing access policy. Do not broaden access to Anyone unless you have reviewed the security implications.
- Put the deployed /exec URL in Netlify HUB_APPS_SCRIPT_URL.

DEPLOY
- Commit the package files to the connected GitHub main branch or upload the package using your normal workflow. Netlify production deploys were shown paused due to exhausted account credits; deployment cannot occur until Netlify permits builds again.
- After deployment, open the Netlify site. The computer authorization gate should call /.netlify/functions/owner-device-auth.
- Enter OWNER_PASSWORD and click AUTHORIZE THIS COMPUTER.

LIMITATIONS / PRESERVATION
- No employee data, Google Sheet rows, payroll formulas, task workflows, archive logic, or existing dashboard sections are modified by creating this package.
- The existing standalone Netlify mode does not provide google.script.run. This patch bridges the Owner Security gate and its device registry only. Apps Script-only cloud snapshot load/revision functions and owner device management screens that directly use google.script.run remain Apps Script-hosted features and are not converted by this patch.
- Do not remove the old Apps Script password functions or existing Authorized Devices sheet. Existing Apps Script-hosted mode remains in the source; this Netlify gate path uses the Netlify environment password.
- Keep OWNER_PASSWORD and HUB_BRIDGE_SECRET private. Never paste either into chat, HTML, GitHub source, or screenshots.

ROLLBACK
- Restore the previous GitHub commit/deploy if a problem occurs. Do not delete spreadsheet sheets or device records.
