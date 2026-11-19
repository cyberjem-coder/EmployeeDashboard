const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'employee_hub_google_sheets_v5.gs'), 'utf8');
let snapshot = null;
const props = { getProperty: (key) => key === 'FOOD_COST_PAYROLL_SYNC_TOKEN' ? 'test-token-123456789012345678901234567890' : null };
const context = {
  console,
  PropertiesService: { getScriptProperties: () => props },
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (name) => name === 'Hub Snapshot' && snapshot ? {
    getLastRow: () => snapshot ? snapshot.length + 1 : 0,
    getRange: (_r,_c,_nr,_nc) => ({ getValues: () => snapshot.map(x => [x]) })
  } : null }) },
  ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (body) => ({ body, setMimeType: function(){ return this; } }) },
  Utilities: { formatDate: (d,_tz,fmt) => fmt === 'yyyy-MM-dd' ? new Date(d).toISOString().slice(0,10) : new Date(d).toISOString() },
  Session: { getScriptTimeZone: () => 'UTC' },
  LockService: {},
  Date,
  Map, Set, Math, Number, String, Array, JSON, isNaN
};
vm.createContext(context);
vm.runInContext(source, context);
const config = { weekStartDay: 1, biweekAnchor: '2026-01-05', overtimeAfterHours: 8, overtimeMultiplier: 1.25, holidayMultiplier: 2, holidays: [] };
const range = context.payrollRange_('week', new Date(), config);
snapshot = [JSON.stringify({
  employees: [{id:'E-001',name:'Test Employee',classification:'Barista',rate:100,scheduleIn:'09:00',scheduleOut:'17:00'}],
  records: [{id:'A-1',empId:'E-001',date:range.start,in:range.start+'T09:00:00',out:range.start+'T17:00:00',hours:8,late:0}],
  adjustments: [{id:'B-1',empId:'E-001',period:'week',periodStart:range.start,periodEnd:range.end,type:'bonus',amount:50}],
  absences: [],
  payrollPayments: [
    {id:'P-1',empId:'E-001',employeeName:'Test Employee',period:'week',periodStart:range.start,periodEnd:range.end,amount:200,date:range.start,method:'Cash',reference:'REF-1'},
    {id:'R-1',kind:'reversal',empId:'E-001',employeeName:'Test Employee',period:'week',periodStart:range.start,periodEnd:range.end,amount:50,date:range.start,method:'Correction',reference:'REV-1'}
  ],
  payrollPaymentStatuses: [{empId:'E-001',period:'week',periodStart:range.start,periodEnd:range.end,status:'Payment Due',dueDate:range.end}],
  payrollConfig: config, lateRate: 1
})];
const result = JSON.parse(context.foodCostPayrollExport_({token:'test-token-123456789012345678901234567890'}).body);
assert.equal(result.ok, true);
assert.deepEqual(Array.from(new Set(result.payrollSummary.map(x => x.periodType))).sort(), ['biweek','month','week']);
const row = result.payrollSummary.find(x => x.employeeId === 'E-001' && x.periodType === 'week' && x.periodStart === range.start);
assert(row, 'weekly employee payroll summary should be exported');
assert.equal(row.gross, 800);
assert.equal(row.bonus, 50);
assert.equal(row.net, 850);
assert.equal(row.paid, 150, 'reversal must reduce paid amount');
assert.equal(row.outstanding, 700);
assert.equal(row.status, 'Partial');
assert.equal(row.classification, 'Barista');
assert.equal(result.payrollPayments.length, 2);
assert.equal(result.payments.length, 2, 'legacy payment export remains available');
assert(result.periods.length > 0, 'legacy period export remains available');
assert.equal(result.payrollPayments.find(x => x.entryType === 'reversal').amount, -50);
const unauthorized = JSON.parse(context.foodCostPayrollExport_({token:'wrong'}).body);
assert.equal(unauthorized.ok, false);
console.log('Employee Hub V10.13 payroll export tests passed.');
