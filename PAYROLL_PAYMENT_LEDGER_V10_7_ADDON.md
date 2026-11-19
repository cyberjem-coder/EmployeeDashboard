# Employee Hub V10.7 — Additive Payroll Payment Ledger

This add-on extends Employee Hub V10.6 without removing any existing tabs, controls, payroll formulas, rewards, payslip logic, attendance features, local-storage key, or Apps Script integrations. All original 144 HTML element IDs and 110 JavaScript function names were retained in the updated application.

## Manager payment interface
- Located inside the existing Payroll Central page and protected by the existing Payroll PIN gate.
- Select an employee and current payroll period; the calculated net salary is shown read-only.
- Save a due date and record multiple payment installments with amount, date, method, reference, manager name, and notes.
- Overpayments require confirmation.
- A payment can be reversed once; the original entry remains and the reversal stores the reason and manager.
- The existing payroll calculation and payslip figures are not changed.

## Employee self-service
The existing employee PIN flow in My Rewards also reveals only that employee's payroll period, net pay, paid amount, remaining balance, due date, and payment status. Locking the rewards view also locks payment history.

## Persistence
Payment ledger entries and payroll snapshots are included in the existing Employee Hub snapshot. Google Apps Script creates additive `Payroll Period Snapshots`, `Payroll Payments`, and `Payroll Status` tabs. The pre-existing `Payroll Summary` tab and its schema are retained.

See `PAYROLL_INTEGRATION_SETUP.md` for the separate read-only Food Cost export deployment and Netlify setup.
