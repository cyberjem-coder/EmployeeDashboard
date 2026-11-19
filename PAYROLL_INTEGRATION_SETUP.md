# Employee Hub V10.13 ↔ Food Cost Dashboard V29 payroll integration

This is an additive, one-way, read-only integration. Employee Hub remains the source of truth for payroll calculations and payment records. Food Cost imports the exported payroll information; it cannot write back to Employee Hub.

## What the compatible releases add

### Employee Hub V10.13
- Adds a token-protected `foodCostPayrollExport` action to the existing Apps Script bridge.
- Reads the latest saved Employee Hub cloud snapshot and uses the existing payroll calculation helpers for weekly, biweekly, and monthly periods.
- Exports employee ID, name, classification, period type and dates, gross, bonus, net, actual payments, reversals, paid totals, outstanding balances, and status.
- Retains the legacy `payments` and `periods` export fields for compatibility.
- Keeps the export read-only: no Employee Hub sheets, snapshots, attendance, payroll records, or formulas are changed by a Food Cost export request.

### Food Cost V29
- Validates the V10.13 export contract and rejects incomplete or duplicate employee-period data.
- Keeps weekly, biweekly, and monthly periods distinct in department summaries and manager review records.
- Keeps individual payroll details behind the existing server-side payroll-manager session.
- Does not automatically post payroll to expenses or alter existing profit calculations.

## Setup

1. Back up the Employee Hub spreadsheet and both dashboard packages.
2. Keep the existing Employee Hub Apps Script project and existing `Index.html` / dashboard files. Update the existing `employee_hub_google_sheets_v5.gs` bridge using the V10.13 file. If your live script has custom changes not in the package, merge the additive export helper and `doPost` action branch rather than overwriting those custom changes.
3. In Apps Script Project Settings → Script Properties, set `FOOD_COST_PAYROLL_SYNC_TOKEN` to a randomly generated secret of at least 32 characters.
4. Deploy the updated script. Prefer publishing a new version of the existing deployment while retaining its current URL and access settings. If the existing deployment cannot be reached by the Netlify server, create an additional web-app deployment from the same Apps Script project; do not replace or disable the existing Employee Hub deployment. The export action still validates the shared token.
5. In Netlify Site configuration → Environment variables, set:
   - `EMPLOYEE_PAYROLL_WEBAPP_URL` = the Employee Hub Apps Script `/exec` URL used for the export.
   - `EMPLOYEE_PAYROLL_SYNC_TOKEN` = the same secret as `FOOD_COST_PAYROLL_SYNC_TOKEN`.
   - `PAYROLL_MANAGER_PASSWORD` = a strong manager-only password for payroll detail access.
   - `PAYROLL_MANAGER_SESSION_SECRET` = a random secret of at least 32 characters.
6. Deploy the complete `food-cost-dashboard` folder from Food Cost V29, preserving the existing `netlify.toml`, edge password gate, functions, and static assets. Redeploy after setting environment variables.
7. Open Food Cost and use its existing payroll summary / manager payroll detail area. Confirm the summary loads; sign in with the payroll manager password to view individual employee and payment details.

Do not put any secret in HTML, browser storage, source control, a public URL, or chat. The shared token is sent only from the Netlify server to Apps Script. If Apps Script returns a Google sign-in page or an unreadable response, the deployment access settings need review; do not weaken Employee Hub's existing device/PIN controls.

## Data and accounting safeguards

- Employee Hub is the only payroll source of truth.
- Synchronization is Employee Hub → Food Cost only.
- Food Cost does not modify payroll records, payments, attendance, or Employee Hub calculations.
- Weekly, biweekly, and monthly periods are kept separate; do not add alternative payroll bases together.
- Food Cost V29 does not automatically post payroll to expenses or change the existing P&L formulas. Continue using the existing V28 payroll-inclusion verification workflow and avoid counting the same payroll expense twice.
- Individual employee payroll details are available only after the existing server-side payroll-manager session is verified.

## Verification before relying on live data

- Test an employee with no payment, one with a partial payment, and one with a full payment.
- Test a reversal and confirm it reduces the paid total without deleting the original payment record.
- Compare gross, bonus, net, paid, outstanding, and status against Employee Hub for the same employee and exact period type/dates.
- Confirm weekly, biweekly, and monthly periods remain separate.
- Sync twice and confirm the displayed totals remain unchanged when Employee Hub data has not changed.
- Confirm unauthenticated manager-detail requests are rejected.

The included automated tests use synthetic data and validate the export mapping, reversal arithmetic, period separation, and manager access. They are not live Google Apps Script, Netlify, or production payroll tests. Live synchronization begins only after the owner configures the Script Property and Netlify environment variables and deploys both packages.
