EMPLOYEE HUB V10.15 — NETLIFY DASHBOARD + OWNER AUTHORIZATION REPAIR
===================================================================

PLEASE READ THIS FIRST
----------------------
The earlier Netlify add-on connected only the Owner Authorization screen.
The dashboard itself still called google.script.run, which a normal static
Netlify page does not provide. This repair adds the missing server-side API
connection for the dashboard and corrects a malformed printSlip script block
that was preventing the main dashboard JavaScript from loading correctly.

WHAT THE REPAIR CONNECTS
------------------------
- Owner computer status and registration (existing owner-device endpoint)
- Cloud revision check
- Save cloud snapshot
- Load cloud snapshot
- 120-day archive batches (copies only; does not delete original records)
- Task evidence upload to the existing private Drive folder
- Change Owner Authorization Password
- List and revoke authorized computers

Task evidence keeps the existing 10 MB photo and 20 MB video limits. Netlify
uploads are sent in smaller chunks so a large video is not one oversized
Netlify Function request. Existing Apps Script-hosted google.script.run mode
is preserved in the separate employee_hub_...html file.

FILES ADDED / UPDATED
---------------------
- netlify/functions/employee-hub-api.js: new allowlisted dashboard API proxy.
- netlify/functions/owner-device-auth.js: owner password is verified by Apps
  Script, avoiding a stale second copy of the password in Netlify variables.
- APPS_SCRIPT_UPDATED_Code.gs: complete Apps Script backend with the new
  Netlify API dispatcher and chunked Drive evidence handlers.
- Index.html: Netlify compatibility shim, cloud revision refresh after device
  authorization, and repaired dashboard script structure.
- employee_hub_black_gold_mission_control_v10_6_rewards_payslip.html:
  repaired script structure; native Apps Script bridge remains intact.
- netlify.toml: keeps publish directory "." and functions directory
  "netlify/functions".
- Tests and all previous guides/manuals are retained.

NETLIFY ENVIRONMENT VARIABLES
-----------------------------
In the Employee Hub Netlify site, keep these variables:

1. HUB_APPS_SCRIPT_URL
   The deployed Employee Hub Apps Script Web App URL ending in /exec.

2. HUB_BRIDGE_SECRET
   The existing long random shared secret. It must match the Apps Script
   Script Property HUB_NETLIFY_BRIDGE_SECRET exactly.

3. OWNER_PASSWORD
   This variable may remain if it already exists, but this updated package no
   longer reads it. Apps Script now checks the Owner Authorization Password
   against the existing server-side password hash. Do not delete or change
   this variable as part of this repair; it is simply no longer required.

Do not paste the bridge secret into HTML, send it in chat, or share it with
employees. Do not send passwords or secret values to ChatGPT.

APPS SCRIPT SCRIPT PROPERTY
---------------------------
Open the Employee Hub spreadsheet, then Extensions > Apps Script.

1. Open Project Settings (gear icon).
2. Find Script Properties.
3. Check that HUB_NETLIFY_BRIDGE_SECRET exists.
4. Its value must be exactly the same as the Netlify HUB_BRIDGE_SECRET value.
5. If it is missing, add it. If it exists, do not change it unless the two
   values do not match.
6. Save.

Do NOT change HUB_OWNER_DEVICE_PASSWORD_HASH. Do NOT reset the spreadsheet.
Do NOT create a new spreadsheet.

UPDATE THE EXISTING APPS SCRIPT CODE
------------------------------------
The file to use is APPS_SCRIPT_UPDATED_Code.gs in this ZIP.

1. Open the existing bound Apps Script project.
2. Open the existing Code.gs file.
3. Before changing it, press Ctrl+A, Ctrl+C, paste the text into Notepad, and
   save a backup copy on your computer.
4. Open APPS_SCRIPT_UPDATED_Code.gs from this ZIP.
5. Copy its complete contents.
6. Return to the existing Code.gs file, select its contents, and paste the
   updated code.
7. Click Save.

This backend is based on the latest uploaded Employee Hub ZIP. It retains the
existing snapshot, payroll, archive, evidence, device registry, and export
functions. If you have made additional Apps Script changes after uploading
that ZIP, stop and compare those changes before replacing Code.gs.

DEPLOY A NEW APPS SCRIPT VERSION
--------------------------------
1. In Apps Script, click Deploy > Manage deployments.
2. Find the existing Web App deployment and click its pencil (Edit) icon.
3. Under Version, choose New version.
4. Keep the current deployment access settings unchanged for this first test.
5. Click Deploy.
6. Confirm HUB_APPS_SCRIPT_URL in Netlify still points to the correct /exec
   URL for this bound Employee Hub spreadsheet.

The existing owner-device status request already reached Apps Script in the
previous deployment, so do not change access settings unnecessarily. If the
new API receives a Google sign-in page, HTTP 401, or HTTP 403, stop and report
the visible error before changing access settings.

DEPLOY THE COMPLETE NETLIFY PACKAGE
-----------------------------------
1. Extract the ZIP on your computer.
2. Upload the complete contents to the connected GitHub repository, keeping
   Index.html, netlify.toml, and the netlify folder at the repository root.
3. Do not upload only Index.html. Netlify must also receive both function files.
4. Wait for Netlify to finish a successful production deploy.
5. In Netlify > Functions, confirm these functions are deployed:
   - owner-device-auth
   - employee-hub-api

SAFE TEST ORDER
---------------
1. Open the Netlify Employee Hub website and refresh the page.
2. If asked, authorize this computer using your existing Owner Authorization
   Password. The password is checked by Apps Script.
3. Once the dashboard appears, try a normal navigation tab or refresh button.
4. Open Settings > Google Sheets real-time sync > Sync now.
5. Confirm the Google Sheets Sync Events tab shows a successful write.
6. Make a JSON backup before using Load cloud data. That action intentionally
   replaces the local browser data with the latest cloud snapshot.
7. Test task evidence with a small photo first. Confirm it appears in the
   configured private Drive folder and in the task.
8. Only then test a larger video.
9. For archiving, click Preview eligible records first. Sync & Archive copies
   eligible records to Employee Hub Historical Archive; original dashboard
   records are not deleted by this feature.

IF THE DASHBOARD STILL DOES NOT WORK
------------------------------------
Please send only the visible error message and, if possible, a screenshot of
it. Do not send passwords, bridge secrets, device tokens, employee PINs, or
private payroll data.

PRESERVATION
------------
This source repair does not ask you to delete spreadsheet tabs, clear rows,
create a new spreadsheet, reset employee PINs, or remove dashboard features.
It keeps the original files and adds the missing Netlify connection. No live
Netlify site or live Google Sheet was changed by creating this ZIP.
