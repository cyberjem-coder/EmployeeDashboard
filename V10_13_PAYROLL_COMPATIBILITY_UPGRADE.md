# Employee Hub V10.13 — Food Cost payroll compatibility (additive)

This release preserves the Employee Hub V10.12 application, payroll calculations, records, PIN/device security, tasks, evidence, rewards, reviews, and existing integrations. The only application-code change is a read-only compatibility export in the existing Google Apps Script bridge.

## What the export does
- Authenticates the `foodCostPayrollExport` POST action with the existing `FOOD_COST_PAYROLL_SYNC_TOKEN` Script Property.
- Reads the latest saved `Hub Snapshot` and calculates weekly, biweekly, and monthly payroll rows using the existing Employee Hub payroll helpers and configuration.
- Exports employee ID/name/classification, period type and dates, gross, bonus, net, actual payments, reversals, paid amount, outstanding balance, due date, and status.
- Includes a legacy read-only fallback for installations that sync through the existing `Payroll Summary` sheet.
- Does not write to or alter the Employee Hub spreadsheet, snapshot, attendance, payroll records, or calculations during export.
- Does not export private notes, employee PINs, or manager-entered payment notes.

## Configuration
1. Keep the existing Employee Hub Apps Script project and deployment. Do not create a replacement project.
2. Add/update the provided `employee_hub_google_sheets_v5.gs` in the existing Apps Script project, preserving any locally customized code not present in this package.
3. In Apps Script Project Settings → Script Properties, set `FOOD_COST_PAYROLL_SYNC_TOKEN` to a randomly generated secret of at least 32 characters.
4. Deploy a new version of the existing web-app deployment so the existing `/exec` URL remains the source endpoint. Ensure the endpoint can be reached by the Food Cost server while retaining the token check; do not publish the token in browser code or a URL.
5. In Netlify environment variables, configure `EMPLOYEE_PAYROLL_WEBAPP_URL` with the existing Employee Hub `/exec` URL and `EMPLOYEE_PAYROLL_SYNC_TOKEN` with the same secret.
6. Configure `PAYROLL_MANAGER_PASSWORD` and `PAYROLL_MANAGER_SESSION_SECRET` on Netlify. The session secret must be at least 32 characters. Do not put secrets in source files or send them in chat.

Employee Hub remains the payroll source of truth. Food Cost receives a read-only export only.
