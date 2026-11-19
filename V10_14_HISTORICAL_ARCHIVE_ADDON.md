# Employee Hub V10.14 — 120-day archive add-on

This is an additive archive-copy feature for Employee Hub V10.13. It adds a manager-gated **Sync & Archive Now** control in Settings. Records dated more than 120 days ago are copied in batches of up to 200 into `Employee Hub Historical Archive`; duplicate archive keys are skipped. `Employee Hub Archive History` records each successful batch. Search the archive tab using Google Sheets Find or filters.

## Install carefully
1. Back up the existing Employee Hub HTML and bound Apps Script project.
2. Add the new `archiveEmployeeHubRecords(request)` function from the updated `employee_hub_google_sheets_v5.gs` to the existing bound project. Keep all existing functions and routes.
3. Replace/update the existing `Index.html` with the supplied additive V10.14 file, preserving the rest of the project files.
4. Deploy an updated version of the existing Apps Script web app, retaining its existing access restrictions.
5. Open Settings as an authorized manager, preview, then use Sync & Archive Now.
6. Check `Employee Hub Historical Archive` and `Employee Hub Archive History`.

## Safety boundary
This first release is copy-only: no original records are removed, hidden, or excluded from payroll calculations. The old 90-day audit pruning is disabled for future saves, and the Apps Script Audit Trail writer now appends without pruning. This preserves historical records but does not yet reduce the size of the browser's complete working dataset. A later archive-aware reporting refactor is required before safely moving attendance/payroll/task history out of the active data model.
