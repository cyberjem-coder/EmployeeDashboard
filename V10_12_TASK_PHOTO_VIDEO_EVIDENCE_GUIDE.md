EMPLOYEE HUB V10.12 — PHOTO & VIDEO TASK EVIDENCE (ADDITIVE UPGRADE)

WHAT WAS ADDED
- Managers can optionally mark each newly assigned task as requiring photo/video evidence.
- Employees can attach multiple photos and videos while their assigned task is In Progress.
- Evidence is uploaded to a private Google Drive folder; the task record stores Drive file references, file names, MIME types, and upload timestamps.
- Employees cannot submit a task marked as evidence-required until at least one upload succeeds.
- Managers see an additional Photo / Video Evidence column in the task review table and can open the Drive files before verifying or returning a task.
- Managers are also prevented from approving a task marked evidence-required if no evidence is attached.
- Task evidence metadata and requirement/count/reference fields are included in the existing Tasks export.

PRESERVATION
- This release is additive. Existing HTML entry points, existing employee PIN/password behavior, manager controls, task statuses, task history, approvals/returns, performance scoring, payroll, rewards, sync bridge, and other package files are retained.
- Existing tasks are initialized as evidence-optional and retain their existing state.
- New task evidence is optional by default. Managers explicitly enable the requirement per task.
- No existing Apps Script endpoint or existing sheet export column is removed. Three evidence-related columns are appended to the Tasks export.

GOOGLE DRIVE SETUP (REQUIRED FOR UPLOADS)
1. Open the Google Apps Script project connected to Employee Hub.
2. Add/replace its source with the included updated employee_hub_google_sheets_v5.gs file, preserving any separately customized code not present in the supplied V10.11 package.
3. Save the project. Google may ask you to authorize the new Google Drive access scope.
4. In Apps Script, run createTaskEvidenceFolderOnce() manually as the business/owner account and approve the requested Drive permission.
5. Open the returned folder URL. Share the folder with the employee and manager Google accounts that should upload or review evidence. Give employees the access needed to create files and managers the access needed to view them. Do not enable public link access unless your business explicitly chooses that security trade-off.
6. In Project Settings > Script Properties, verify TASK_EVIDENCE_FOLDER_ID is set to the folder ID returned by the helper.
7. Deploy a new version of the existing Apps Script web app and continue using the authorized Employee Hub URL. Keep the existing device authorization configuration.
8. Test with a non-sensitive sample task and one photo, then one short video. Confirm that both appear in the Drive folder and open for the manager account.

LIMITS AND BEHAVIOR
- Photo formats: JPEG, PNG, WebP, GIF, HEIC, HEIF; maximum 10 MB per file.
- Video formats: MP4, MOV/QuickTime, WebM, 3GPP, AVI, MPEG, OGG; maximum 20 MB per file.
- Uploads require the deployed Apps Script bridge, an authorized device, and a configured Drive folder. Static standalone hosting does not upload evidence to Drive.
- Files are not made public by this code. A manager can open a file only if their Google account has Drive permission to the folder/file.
- Employee identity is still authenticated using the existing local Employee Hub employee session/PIN/password flow. This upgrade does not add a new server-side employee identity provider.
- Evidence files are retained in Drive; deleting a task or clearing browser data does not automatically delete the Drive file.

ROLLBACK
- Keep the original V10.11 ZIP as the rollback copy.
- To roll back, restore the original V10.11 HTML and Apps Script files. Do not delete the Drive evidence folder if uploaded evidence must be retained.
