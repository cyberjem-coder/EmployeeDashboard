# Employee Hub V10.10 — Salary Payment Acknowledgment Add-on

## Added (additive-only)
- Manager panel inside existing Payroll Central for attaching a written explanation and optional short audio recording to an existing payroll payment ledger entry.
- Employee response panel inside the existing Mission Zone, visible for the currently PIN-authenticated employee profile.
- Employee response choices: confirm amount received, dispute amount, or request clarification; optional comment; timestamped response.
- Separate browser storage namespace: `employeeHubSalaryComms_v1`. The module does not mutate `db`, call `saveDB()`, or call `syncNow()`. The existing sync serializer is unchanged.
- Audio is limited to 2 MB per recording to reduce browser storage pressure.

## Important security limitation
This version intentionally skips secure server-side identity verification as requested. Records are stored in browser localStorage on the device and are not protected against a technically knowledgeable person with browser/devtools access. The employee panel relies on the existing client-side employee PIN session. This is not suitable as a legally authoritative or high-security payroll evidence system. Use only on a trusted, access-controlled device. Do not treat an electronic acknowledgment as a waiver of unpaid wages or statutory rights.

## Deployment
1. Back up the current V10.9 package and existing browser data.
2. Deploy the updated `Index.html` using the same hosting method as V10.9.
3. Existing Google Apps Script deployment, spreadsheet mappings, device authorization, and Food Cost integration remain unchanged.
4. Test on a copy/staging environment first. Manager opens Payroll Central, records a payment as usual, then attaches a message to that payment. Employee signs into Mission Zone using the existing PIN and responds to their update.
5. Browser localStorage is device-specific; this add-on does not synchronize across devices. Audio storage can fill browser quota.

## Preservation and scope
No existing features, tabs, formulas, payroll ledger entries, storage keys, Apps Script files, or sync payload code were intentionally removed or rewritten. The new add-on records are separate from the Employee Hub database and Food Cost sync.
