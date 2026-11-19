# Employee Hub V10.15 — Quarterly Payroll Summary (additive)

Adds a quarterly payroll reporting panel inside the existing Payroll Central area. It remains protected by the existing Payroll Central unlock. It does not replace or modify weekly, biweekly, or monthly payroll controls, formulas, adjustments, payment workflows, attendance, tasks, or history.

## Calculation rules
- Uses the existing `periodRange()` and `totals()` functions for the selected payroll cycle.
- Includes only complete payroll periods wholly inside the selected Philippine calendar quarter.
- Lists cross-quarter boundary periods as exclusions; it does not prorate or double-count them.
- Shows gross compensation, late penalties, deductions including unpaid-absence deductions, bonuses, net payable for included periods, attendance hours, and payment ledger cash paid by payment date as separate measures.
- Payment cash is not subtracted from net payable in this summary.
- Saved snapshots are appended to `db.quarterlyPayrollSnapshots`; the regular Employee Hub save/cloud snapshot flow carries this additional field.

## Important limitations
Snapshots are stored in the existing dashboard data store and regular cloud snapshot flow; this is not a separate immutable accounting ledger or an independently tamper-proof archive. Cloud delivery still depends on the existing Apps Script connection being configured and operational. Verify saved quarterly snapshots against payroll source records and keep regular exports/backups.
