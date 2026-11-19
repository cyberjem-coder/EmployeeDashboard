/**
 * EMPLOYEE HUB — Google Sheets bridge (Phase 3 — hosted cloud mode + validation)
 *
 * IMPORTANT SECURITY SETUP
 * 1. Create a dedicated Google spreadsheet for Employee Hub.
 * 2. Open Extensions > Apps Script and paste this entire file.
 * 3. In Project Settings > Script Properties, add ALLOWED_EMAILS with a
 *    comma-separated list of authorized HR/payroll Google account emails.
 * 4. Deploy as Web app, Execute as: User accessing the web app; Who has
 *    access: Google account users (or your Workspace domain, if available).
 * 5. Share the spreadsheet only with authorized HR/payroll personnel.
 *
 * Do NOT deploy an unrestricted public endpoint for payroll or private notes.
 * The standalone HTML sends no employee or administrator PINs. It sends a
 * complete snapshot after each local save. Browser no-cors mode cannot read
 * the response, so verify the Sync Events sheet after first deployment.
 * Standalone mode uses one-way POST snapshots. Hosted Apps Script HTML mode adds authenticated,
 * revision-checked cloud snapshot load/save via google.script.run.
 * Payroll adjustments are tied to periodStart/periodEnd to prevent recurring
 * weekly or biweekly adjustments from leaking into later pay periods.
 */

const HUB_SHEETS = [
  'Employees', 'Attendance', 'Private Mood Notes', 'Adjustments',
  'Payroll Summary', 'Absences', 'Audit Trail', 'Sync Events', 'Sync Info'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const email = 'Password-authorized device';

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    if (String(payload.action||'') === 'foodCostPayrollExport') return foodCostPayrollExport_({token:payload.token});
    requireHubDevice_(payload.deviceId,payload.deviceToken);
    if (payload.app !== 'Employee Hub' || !payload.data) throw new Error('Invalid Employee Hub payload.');
    const data = payload.data;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('No active spreadsheet. Bind this script to the target spreadsheet.');

    const employees = Array.isArray(data.employees) ? data.employees : [];
    const records = Array.isArray(data.records) ? data.records : [];
    const adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
    const absences = Array.isArray(data.absences) ? data.absences : [];
    const audit = Array.isArray(data.audit) ? data.audit : [];
    const now = new Date();
    const stamp = now.toISOString();

    // Never accept or write credentials/PINs to the workbook.
    replaceSheet_(ss, 'Employees', [
      ['Employee ID','Name','Classification','Hourly Rate PHP','Schedule In','Schedule Out','Work Performance %','Sales Performance %','Active'],
      ...employees.map(x => [x.id || '', x.name || '', x.classification || '', num_(x.rate), x.scheduleIn || '', x.scheduleOut || '', num_(x.work), num_(x.sales), !!x.active])
    ]);

    replaceSheet_(ss, 'Attendance', [
      ['Record ID','Employee ID','Date','Time In ISO','Time Out ISO','Hours','Late Minutes'],
      ...records.map(x => [x.id || '', x.empId || '', x.date || '', x.in || '', x.out || '', num_(x.hours), num_(x.late)])
    ]);

    const nameById = {};
    employees.forEach(x => nameById[x.id] = x.name || '');
    const noteRows = [['Employee ID','Employee Name','Timestamp ISO','Shift Stage','Mood','Private Note']];
    records.forEach(r => (Array.isArray(r.moods) ? r.moods : []).forEach(m => {
      noteRows.push([r.empId || '', nameById[r.empId] || '', m.at || '', m.stage || '', m.mood || '', m.note || '']);
    }));
    replaceSheet_(ss, 'Private Mood Notes', noteRows);

    replaceSheet_(ss, 'Adjustments', [
      ['Adjustment ID','Employee ID','Type','Amount PHP','Description','Payroll Period','Period Start','Period End','Created At'],
      ...adjustments.map(x => [x.id || '', x.empId || '', x.type || '', num_(x.amount), x.desc || '', x.period || '', x.periodStart || '', x.periodEnd || '', x.createdAt || ''])
    ]);

    replaceSheet_(ss, 'Absences', [
      ['Absence ID','Employee ID','Employee Name','Date','Type','Reason','Created At'],
      ...absences.map(x => [x.id || '', x.empId || '', nameById[x.empId] || '', x.date || '', x.type || '', x.reason || '', x.createdAt || ''])
    ]);

    // Additive Employee Hub task and performance-review exports. Existing tabs remain untouched.
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    replaceSheet_(ss, 'Tasks', [
      ['Task ID','Employee ID','Employee Name','Title','Assigned Date','Due Date','Instructions','Status','Completion Note','Submitted At','Verified At','Verified By','Manager Note','Created At','Evidence Required','Evidence File Count','Evidence File References JSON'],
      ...tasks.map(x => [x.id || '', x.empId || '', nameById[x.empId] || '', x.title || '', x.assignedDate || '', x.dueDate || '', x.instructions || '', x.status || '', x.completionNote || '', x.submittedAt || '', x.verifiedAt || '', x.verifiedBy || '', x.managerNote || '', x.createdAt || '', !!x.evidenceRequired, Array.isArray(x.evidence) ? x.evidence.length : 0, JSON.stringify(Array.isArray(x.evidence) ? x.evidence.map(f=>({id:f.id||'',name:f.name||'',mimeType:f.mimeType||'',url:f.url||'',uploadedAt:f.uploadedAt||''})) : [])])
    ]);

    const performanceReviews = Array.isArray(data.performanceReviews) ? data.performanceReviews : [];
    replaceSheet_(ss, 'Performance Reviews', [
      ['Review ID','Employee ID','Employee Name','Review Date','Work Quality','Productivity','Customer Service','Teamwork & Attitude','Compliance & Discipline','Manager Feedback / Reasons Criteria Not Met','Improvement Actions Next Month','Next-Month Goals / Success Criteria','Created At'],
      ...performanceReviews.map(x => [x.id || '', x.empId || '', nameById[x.empId] || '', x.date || '', num_(x.quality), num_(x.productivity), num_(x.service), num_(x.teamwork), num_(x.compliance), x.feedback || '', x.improvementPlan || '', x.nextMonthGoals || '', x.createdAt || ''])
    ]);

    // Additive Rewards & Recognition export. Existing tabs and payroll calculations are unchanged.
    const rewardRecords = Array.isArray(data.rewardRecords) ? data.rewardRecords : [];
    replaceSheet_(ss, 'Rewards & Recognition', [
      ['Reward ID','Employee ID','Employee Name','Reward Title','Category','Date Awarded / Approved','Status','Description','Reason / Achievement','Payslip Note','Equivalent Value PHP','Created At'],
      ...rewardRecords.map(x => [x.id || '', x.empId || '', nameById[x.empId] || '', x.title || '', x.category || '', x.date || '', x.status || 'Given', x.description || '', x.reason || '', x.payslipNote || '', x.value === null || x.value === undefined ? '' : num_(x.value), x.createdAt || ''])
    ]);

    const cutoff = new Date(now.getTime() - 90 * 86400000);
    const recentAudit = audit.filter(x => x.at);
    appendAuditOnly_(ss, recentAudit, cutoff);

    const payrollRows = [[
      'Period','Period Start','Period End','Employee ID','Employee Name','Hours','Late Minutes',
      'Regular Hours','Overtime Hours','Holiday Hours','Unpaid Absence Days','Absence Deduction PHP','Gross PHP','Late Penalty PHP','Bonus PHP','Other Deductions PHP','Net PHP'
    ]];
    ['week','biweek','month'].forEach(period => {
      const references = [now];
      records.forEach(r => { if (r.date) references.push(new Date(r.date + 'T12:00:00')); });
      absences.forEach(a => { if (a.date) references.push(new Date(a.date + 'T12:00:00')); });
      adjustments.forEach(a => { if (a.period === period && a.periodStart) references.push(new Date(a.periodStart + 'T12:00:00')); });
      const ranges = new Map();
      references.forEach(ref => {
        if (!isNaN(ref.getTime())) {
          const range = payrollRange_(period, ref, data.payrollConfig || {});
          ranges.set(range.start + '|' + range.end, range);
        }
      });
      [...ranges.values()].sort((a,b) => a.start.localeCompare(b.start)).forEach(range => {
        const firstRow = payrollRows.length;
        employees.forEach(emp => {
          const rows = records.filter(r => r.empId === emp.id && r.out && r.date >= range.start && r.date <= range.end);
          const hours = rows.reduce((s,r) => s + num_(r.hours), 0);
          const late = rows.reduce((s,r) => s + num_(r.late), 0);
          const earning = payrollEarnings_(rows, num_(emp.rate), data.payrollConfig || {});
          const gross = earning.gross;
          const employeeAbsences = absences.filter(a => a.empId === emp.id && a.type === 'unpaid' && a.date >= range.start && a.date <= range.end);
          const absenceDeduction = employeeAbsences.length * scheduledShiftHours_(emp) * num_(emp.rate);
          const penalty = late * num_(data.lateRate);
          const adj = adjustments.filter(a => a.empId === emp.id && a.period === period && a.periodStart === range.start && a.periodEnd === range.end);
          const bonus = adj.filter(a => a.type === 'bonus').reduce((s,a) => s + num_(a.amount), 0);
          const deduction = adj.filter(a => a.type === 'deduction').reduce((s,a) => s + num_(a.amount), 0);
          payrollRows.push([period, range.start, range.end, emp.id || '', emp.name || '', hours, late, earning.regularHours, earning.overtimeHours, earning.holidayHours, employeeAbsences.length, absenceDeduction, gross, penalty, bonus, deduction, gross - penalty - deduction - absenceDeduction + bonus]);
        });
        const periodRows = payrollRows.slice(firstRow);
        const totals = periodRows.reduce((a,r) => { for (let i=5;i<=16;i++) a[i] += num_(r[i]); return a; }, Array(17).fill(0));
        payrollRows.push([period, range.start, range.end, 'TOTAL', 'ALL EMPLOYEES', totals[5], totals[6], totals[7], totals[8], totals[9], totals[10], totals[11], totals[12], totals[13], totals[14], totals[15], totals[16]]);
      });
    });
    replaceSheet_(ss, 'Payroll Summary', payrollRows);

    writePayrollIntegrationSheets_(ss, data);

    replaceSheet_(ss, 'Sync Info', [
      ['Last received at','Payload timestamp','Schema version','Authorization method','Late penalty / minute PHP'],
      [stamp, payload.updatedAt || '', payload.schemaVersion || 1, email, num_(data.lateRate)]
    ]);

    if (!payload.cloudRevision) {
      const snapshotSheet = ss.getSheetByName('Hub Snapshot') || ss.insertSheet('Hub Snapshot');
      const currentRevision = snapshotSheet.getLastRow() ? Number(snapshotSheet.getRange(1,2).getValue()) || 0 : 0;
      writeHubSnapshot_(ss, data, currentRevision + 1);
    }
    appendSyncEvent_(ss, [stamp, email, 'SUCCESS', payload.updatedAt || '', records.length, employees.length, recentAudit.length, 'Snapshot sheets refreshed']);
    return json_({ ok: true, updatedAt: stamp, employeeCount: employees.length, recordCount: records.length });
  } catch (err) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) appendSyncEvent_(ss, [new Date().toISOString(), '', 'ERROR', '', '', '', '', String(err)]);
    } catch (_) {}
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }


}

/** Serve the Employee Hub shell. Server data access is separately protected by device credentials.
 * Add the updated HTML file to the Apps Script project as Index.html. */
/* V10.2 ADDITIVE OWNER DEVICE REGISTRY — unlimited registered computers. */
const HUB_DEVICE_SHEET='Authorized Devices';
const HUB_OWNER_PASSWORD_PROP='HUB_OWNER_DEVICE_PASSWORD_HASH';
function hubDeviceSheet_(){const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(HUB_DEVICE_SHEET);if(!sh){sh=ss.insertSheet(HUB_DEVICE_SHEET);sh.appendRow(['Device ID','Token SHA-256','Label','Registered At','Last Seen','Status','Revoked At']);sh.setFrozenRows(1)}return sh}
function hubHashDeviceToken_(t){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(t||''),Utilities.Charset.UTF_8).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('')}
function hubOwnerPasswordHash_(p,s){s=s||Utilities.getUuid();const h=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s+'|'+String(p||''),Utilities.Charset.UTF_8).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');return s+':'+h}
function hubCheckOwnerPassword_(p){const props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(10000);try{const until=Number(props.getProperty('HUB_OWNER_PASSWORD_LOCK_UNTIL')||0);if(Date.now()<until)throw new Error('Too many incorrect Owner Authorization Password attempts. Try again after 15 minutes.');const saved=props.getProperty(HUB_OWNER_PASSWORD_PROP);if(!saved)throw new Error('Owner Authorization Password is not configured. Run the one-time owner setup from the bound Apps Script editor.');const a=saved.split(':'),ok=a.length===2&&hubOwnerPasswordHash_(p,a[0])===saved;if(!ok){const fails=Number(props.getProperty('HUB_OWNER_PASSWORD_FAILS')||0)+1;props.setProperty('HUB_OWNER_PASSWORD_FAILS',String(fails));if(fails>=5){props.setProperty('HUB_OWNER_PASSWORD_LOCK_UNTIL',String(Date.now()+15*60*1000));props.deleteProperty('HUB_OWNER_PASSWORD_FAILS');}throw new Error('Owner Authorization Password is incorrect.');}props.deleteProperty('HUB_OWNER_PASSWORD_FAILS');props.deleteProperty('HUB_OWNER_PASSWORD_LOCK_UNTIL');return true;}finally{lock.releaseLock()}}
function getHubDeviceStatus(id,token){id=String(id||'');if(!id||!token)return {authorized:false,revoked:false};const sh=hubDeviceSheet_(),v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++)if(String(v[i][0])===id){const ok=String(v[i][5])==='ACTIVE'&&String(v[i][1])===hubHashDeviceToken_(token);if(ok)sh.getRange(i+1,5).setValue(new Date().toISOString());return {authorized:ok,revoked:String(v[i][5])==='REVOKED',ownerPasswordConfigured:!!PropertiesService.getScriptProperties().getProperty(HUB_OWNER_PASSWORD_PROP)}}return {authorized:false,revoked:false,ownerPasswordConfigured:!!PropertiesService.getScriptProperties().getProperty(HUB_OWNER_PASSWORD_PROP)}}
function bootstrapHubOwnerDevicePasswordOnce(){const props=PropertiesService.getScriptProperties();if(props.getProperty(HUB_OWNER_PASSWORD_PROP))throw new Error('Owner Authorization Password is already configured. Use Settings to change it.');const ui=SpreadsheetApp.getUi();const response=ui.prompt('Set Owner Authorization Password','Create a strong password of at least 12 characters. This one-time setup runs from the bound Apps Script editor.',ui.ButtonSet.OK_CANCEL);if(response.getSelectedButton()!==ui.Button.OK)return {ok:false,cancelled:true};const p=response.getResponseText();if(p.length<12)throw new Error('Owner Authorization Password must be at least 12 characters.');props.setProperty(HUB_OWNER_PASSWORD_PROP,hubOwnerPasswordHash_(p));appendServerAudit_('Initial owner setup','OWNER DEVICE PASSWORD BOOTSTRAPPED','Initial owner password configured.');return {ok:true}}
function requireHubDevice_(id,token){if(!getHubDeviceStatus(id,token).authorized)throw new Error('Computer is not authorized or was revoked by the owner.');return true}
function registerHubDevice(id,token,label,password){if(!hubCheckOwnerPassword_(password))throw new Error('Owner Authorization Password is incorrect.');id=String(id||'');token=String(token||'');if(!/^[A-Za-z0-9-]{20,80}$/.test(id)||!/^[a-f0-9]{64}$/i.test(token))throw new Error('Invalid device credentials.');const sh=hubDeviceSheet_(),v=sh.getDataRange().getValues(),hash=hubHashDeviceToken_(token);for(let i=1;i<v.length;i++)if(String(v[i][0])===id){sh.getRange(i+1,2,1,6).setValues([[hash,String(label||'Authorized computer').slice(0,60),v[i][3]||new Date().toISOString(),new Date().toISOString(),'ACTIVE','']]);appendServerAudit_('Password-authorized owner','DEVICE REAUTHORIZED',String(label||id));return {ok:true}}sh.appendRow([id,hash,String(label||'Authorized computer').slice(0,60),new Date().toISOString(),new Date().toISOString(),'ACTIVE','']);appendServerAudit_('Password-authorized owner','DEVICE REGISTERED',String(label||id));return {ok:true}}
function listHubDevices(ownerPassword){if(!hubCheckOwnerPassword_(ownerPassword))throw new Error('Owner Authorization Password is incorrect.');return hubDeviceSheet_().getDataRange().getValues().slice(1).map(r=>({deviceId:String(r[0]),label:String(r[2]),registeredAt:String(r[3]||''),lastSeen:String(r[4]||''),status:String(r[5]||'ACTIVE')}))}
function revokeHubDevice(id,ownerPassword){if(!hubCheckOwnerPassword_(ownerPassword))throw new Error('Owner Authorization Password is incorrect.');const sh=hubDeviceSheet_(),v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++)if(String(v[i][0])===String(id)){sh.getRange(i+1,6,1,2).setValues([['REVOKED',new Date().toISOString()]]);appendServerAudit_('Password-authorized owner','DEVICE REVOKED',String(id));return {ok:true}}throw new Error('Device not found.')}
function setHubOwnerDevicePassword(currentPassword,newPassword){if(!hubCheckOwnerPassword_(currentPassword))throw new Error('Current Owner Authorization Password is incorrect.');const p=String(newPassword||'');if(p.length<12)throw new Error('Owner password must be at least 12 characters.');PropertiesService.getScriptProperties().setProperty(HUB_OWNER_PASSWORD_PROP,hubOwnerPasswordHash_(p));appendServerAudit_('Password-authorized owner','OWNER DEVICE PASSWORD CHANGED','Owner device password hash updated.');return {ok:true}}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Employee Hub — Gold & Brown')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}


function foodCostPayrollExport_(params) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('FOOD_COST_PAYROLL_SYNC_TOKEN');
    const supplied = String((params && params.token) || '');
    if (!expected || !supplied || !constantTimeEqual_(expected, supplied)) throw new Error('Unauthorized payroll export request.');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Employee Hub spreadsheet is unavailable.');

    // Read the latest authenticated cloud snapshot when available. This is the
    // same source used by the hosted Employee Hub and avoids depending on the
    // optional Payroll Period Snapshots sheet, which older clients may not fill.
    const snapshot = readHubPayrollSnapshot_(ss);
    let payrollSummary = [], payrollPayments = [], paymentStatuses = [];
    if (snapshot && snapshot.data) {
      const data = snapshot.data;
      const employees = Array.isArray(data.employees) ? data.employees : [];
      const records = Array.isArray(data.records) ? data.records : [];
      const adjustments = Array.isArray(data.adjustments) ? data.adjustments : [];
      const absences = Array.isArray(data.absences) ? data.absences : [];
      const payments = Array.isArray(data.payrollPayments) ? data.payrollPayments : [];
      const statuses = Array.isArray(data.payrollPaymentStatuses) ? data.payrollPaymentStatuses : [];
      const config = data.payrollConfig || {};
      const now = new Date();
      const references = [now];
      records.forEach(r => { if (r.date) references.push(new Date(r.date + 'T12:00:00')); });
      absences.forEach(a => { if (a.date) references.push(new Date(a.date + 'T12:00:00')); });
      adjustments.forEach(a => { if (a.period && a.periodStart) references.push(new Date(a.periodStart + 'T12:00:00')); });
      const rangesByType = new Map();
      ['week','biweek','month'].forEach(type => {
        const ranges = new Map();
        references.forEach(ref => {
          if (!isNaN(ref.getTime())) {
            const range = payrollRange_(type, ref, config);
            ranges.set(range.start + '|' + range.end, range);
          }
        });
        rangesByType.set(type, [...ranges.values()].sort((a,b) => a.start.localeCompare(b.start)));
      });
      const paymentRows = payments.map(p => ({
        id:String(p.id || ''), kind:String(p.kind || 'payment'), employeeId:String(p.empId || ''),
        employeeName:String(p.employeeName || ''), periodType:String(p.period || ''),
        periodStart:String(p.periodStart || ''), periodEnd:String(p.periodEnd || ''),
        date:String(p.date || p.paymentDate || '').slice(0,10), amount:num_(p.amount),
        method:String(p.method || ''), reference:String(p.reference || '')
      }));
      payrollPayments = paymentRows.filter(p => p.id && p.employeeId).map(p => ({
        id:p.id, employeeId:p.employeeId, employeeName:p.employeeName, date:p.date,
        amount:p.kind === 'reversal' ? -Math.abs(p.amount) : p.amount,
        method:p.method, reference:p.reference, periodStart:p.periodStart,
        periodEnd:p.periodEnd, periodType:p.periodType, entryType:p.kind
      }));
      ['week','biweek','month'].forEach(type => {
        (rangesByType.get(type) || []).forEach(range => {
          employees.forEach(emp => {
            const empId = String(emp.id || '');
            const rows = records.filter(r => String(r.empId || '') === empId && r.out && r.date >= range.start && r.date <= range.end);
            const late = rows.reduce((sum,r) => sum + num_(r.late), 0);
            const earning = payrollEarnings_(rows, num_(emp.rate), config);
            const employeeAbsences = absences.filter(a => String(a.empId || '') === empId && a.type === 'unpaid' && a.date >= range.start && a.date <= range.end);
            const absenceDeduction = employeeAbsences.length * scheduledShiftHours_(emp) * num_(emp.rate);
            const penalty = late * num_(data.lateRate);
            const adj = adjustments.filter(a => String(a.empId || '') === empId && a.period === type && a.periodStart === range.start && a.periodEnd === range.end);
            const bonus = adj.filter(a => a.type === 'bonus').reduce((sum,a) => sum + num_(a.amount), 0);
            const deduction = adj.filter(a => a.type === 'deduction').reduce((sum,a) => sum + num_(a.amount), 0);
            const gross = earning.gross;
            const net = gross - penalty - deduction - absenceDeduction + bonus;
            const related = paymentRows.filter(p => p.employeeId === empId && p.periodType === type && p.periodStart === range.start && p.periodEnd === range.end);
            const paid = related.reduce((sum,p) => sum + (p.kind === 'reversal' ? -Math.abs(p.amount) : (p.kind === 'due-date' ? 0 : p.amount)), 0);
            const outstanding = Math.max(0, net - paid);
            const statusRec = statuses.find(x => String(x.empId || '') === empId && x.period === type && x.periodStart === range.start && x.periodEnd === range.end);
            const dueDate = statusRec && statusRec.dueDate ? String(statusRec.dueDate).slice(0,10) : '';
            let status = outstanding <= 0.009 && net >= 0 ? 'Paid' : paid > 0 ? 'Partial' : (statusRec && statusRec.status || 'Awaiting Payment');
            if (outstanding > 0.009 && statusRec && statusRec.status === 'Payment Due' && dueDate && dueDate < dateKey_(now)) status = 'Overdue';
            payrollSummary.push({
              employeeId:empId, employeeName:String(emp.name || ''), classification:String(emp.classification || ''),
              periodType:type, periodStart:range.start, periodEnd:range.end,
              gross:Number(gross.toFixed(2)), bonus:Number(bonus.toFixed(2)), net:Number(net.toFixed(2)),
              paid:Number(paid.toFixed(2)), outstanding:Number(outstanding.toFixed(2)), status, dueDate
            });
            paymentStatuses.push({employeeId:empId, employeeName:String(emp.name || ''), periodType:type,
              periodStart:range.start, periodEnd:range.end, paid:Number(paid.toFixed(2)),
              outstanding:Number(outstanding.toFixed(2)), dueDate, status});
          });
        });
      });
    } else {
      // Backward-compatible fallback for installations using the standalone
      // snapshot POST route rather than the hosted cloud snapshot.
      const summarySh = ss.getSheetByName('Payroll Summary');
      const employeeSh = ss.getSheetByName('Employees');
      const paymentSh = ss.getSheetByName('Payroll Payments');
      if (!summarySh || summarySh.getLastRow() < 2) throw new Error('No current Employee Hub payroll snapshot is available. Save/sync Employee Hub payroll data first.');
      const empById = {};
      if (employeeSh && employeeSh.getLastRow() > 1) {
        const ev = employeeSh.getDataRange().getValues(), eh = ev.shift();
        ev.forEach(r => { const o={}; eh.forEach((h,i)=>o[h]=r[i]); empById[String(o['Employee ID'])]={name:String(o.Name||''),classification:String(o.Classification||'')}; });
      }
      const sv=summarySh.getDataRange().getValues(), sh=sv.shift();
      const summaryRows=sv.filter(r=>r[0] && String(r[3]||'') && !/^TOTAL$/i.test(String(r[3])) && !/^ALL EMPLOYEES$/i.test(String(r[4])));
      const rawPayments=[];
      if(paymentSh && paymentSh.getLastRow()>1){const pv=paymentSh.getDataRange().getValues(),ph=pv.shift();pv.forEach(r=>{const o={};ph.forEach((h,i)=>o[h]=r[i]);rawPayments.push(o);});}
      summaryRows.forEach(r=>{
        const o={}; sh.forEach((h,i)=>o[h]=r[i]);
        const empId=String(o['Employee ID']||''), periodType=String(o.Period||''), periodStart=normalizePayrollDate_(o['Period Start']), periodEnd=normalizePayrollDate_(o['Period End']);
        const related=rawPayments.filter(p=>String(p['Employee ID']||'')===empId && normalizePayrollDate_(p['Period Start'])===periodStart && normalizePayrollDate_(p['Period End'])===periodEnd);
        const paid=related.reduce((sum,p)=>sum+(String(p['Entry Type']||'payment')==='reversal'?-Math.abs(num_(p['Amount PHP'])):(String(p['Entry Type']||'payment')==='due-date'?0:num_(p['Amount PHP']))),0);
        const net=num_(o['Net PHP']), outstanding=Math.max(0,net-paid), emp=empById[empId]||{};
        const status=outstanding<=0.009?'Paid':paid>0?'Partial':'Awaiting Payment';
        payrollSummary.push({employeeId:empId,employeeName:String(o['Employee Name']||''),classification:emp.classification||'',periodType,periodStart,periodEnd,gross:num_(o['Gross PHP']),bonus:num_(o['Bonus PHP']),net,paid,outstanding,status,dueDate:''});
        related.forEach(p=>payrollPayments.push({employeeId:empId,employeeName:String(p['Employee Name']||o['Employee Name']||''),date:normalizePayrollDate_(p['Payment Date']),amount:String(p['Entry Type']||'payment')==='reversal'?-Math.abs(num_(p['Amount PHP'])):num_(p['Amount PHP']),method:String(p.Method||''),reference:String(p.Reference||''),periodStart,periodEnd,periodType,entryType:String(p['Entry Type']||'payment')}));
      });
    }
    const exportedAt = new Date().toISOString();
    // Retain the legacy `payments` and `periods` fields for any existing export
    // consumer while adding the normalized V10.13 contract used by Food Cost.
    const legacyPayments = payrollPayments.map(p => {
      const summary = payrollSummary.find(r => r.employeeId === p.employeeId && r.periodType === p.periodType && r.periodStart === p.periodStart && r.periodEnd === p.periodEnd) || {};
      return {id:p.id||'',kind:p.entryType||'payment',empId:p.employeeId,employeeName:p.employeeName,periodKey:[p.periodType,p.periodStart,p.periodEnd].join('|'),periodStart:p.periodStart,periodEnd:p.periodEnd,gross:num_(summary.gross),netPay:num_(summary.net),amount:num_(p.amount),paymentDate:p.date,paymentDateTime:'',dueDate:'',method:p.method,reference:p.reference,createdAt:'',reversesPaymentId:''};
    });
    const legacyPeriods = payrollSummary.map(r => ({id:[r.employeeId,r.periodType,r.periodStart,r.periodEnd].join('|'),periodKey:[r.periodType,r.periodStart,r.periodEnd].join('|'),periodStart:r.periodStart,periodEnd:r.periodEnd,empId:r.employeeId,employeeName:r.employeeName,gross:r.gross,netPay:r.net,updatedAt:exportedAt}));
    return ContentService.createTextOutput(JSON.stringify({ok:true,exportedAt,payrollSummary,payrollPayments,paymentStatuses,payments:legacyPayments,periods:legacyPeriods})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err.message||err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function readHubPayrollSnapshot_(ss) {
  const sh = ss.getSheetByName('Hub Snapshot');
  if (!sh || sh.getLastRow() < 2) return null;
  const chunks = sh.getRange(2,1,sh.getLastRow()-1,1).getValues().map(r => String(r[0] || ''));
  const raw = chunks.join('');
  if (!raw) return null;
  const data = JSON.parse(raw);
  return data && typeof data === 'object' ? {data} : null;
}

function constantTimeEqual_(a,b){a=String(a);b=String(b);if(a.length!==b.length)return false;let out=0;for(let i=0;i<a.length;i++)out|=a.charCodeAt(i)^b.charCodeAt(i);return out===0;}
function normalizePayrollDate_(v){if(!v)return '';if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');return String(v).slice(0,10);}

function authorizedHubUser_(roles) {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase().trim();
  if (!email) throw new Error('Google account identity is unavailable. Deploy for authenticated Google users or Workspace accounts; do not use public access.');
  const props = PropertiesService.getScriptProperties();
  const rawUsers = String(props.getProperty('HUB_USERS') || '').trim();
  let role = '';
  if (rawUsers) {
    rawUsers.split(',').forEach(entry => {
      const pair = entry.trim().split(':');
      if ((pair[0] || '').toLowerCase().trim() === email) role = (pair[1] || '').toLowerCase().trim();
    });
  } else {
    const allowed = String(props.getProperty('ALLOWED_EMAILS') || '').split(',').map(x => x.toLowerCase().trim()).filter(Boolean);
    if (allowed.includes(email)) role = 'admin';
  }
  if (!role || (roles && !roles.includes(role))) throw new Error('This Google account is not authorized for this Employee Hub action.');
  return {email, role};
}

function getHubRevision(deviceId,deviceToken) {
  requireHubDevice_(deviceId,deviceToken);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hub Snapshot');
  return {revision: sh && sh.getLastRow() ? Number(sh.getRange(1,2).getValue()) || 0 : 0};
}

function getHubSnapshot(deviceId,deviceToken) {
  requireHubDevice_(deviceId,deviceToken);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Hub Snapshot');
    if (!sh || sh.getLastRow() < 2) return {revision:0, data:null};
    const revision = Number(sh.getRange(1,2).getValue()) || 0;
    const chunks = sh.getRange(2,1,sh.getLastRow()-1,1).getValues().map(r=>String(r[0]||''));
    const raw = chunks.join('');
    const stored = raw ? JSON.parse(raw) : null;
    appendServerAudit_('Device '+String(deviceId||''), 'CLOUD SNAPSHOT READ', 'Revision ' + revision);
    return {revision, data:stored};
  } finally { lock.releaseLock(); }
}

function writePayrollIntegrationSheets_(ss, data) {
  const employees = Array.isArray(data.employees) ? data.employees : [];
  const nameById = {}; employees.forEach(x => nameById[x.id] = x.name || '');
    const payrollPayments = Array.isArray(data.payrollPayments) ? data.payrollPayments : [];
    const payrollSnapshots = Array.isArray(data.payrollPeriodSnapshots) ? data.payrollPeriodSnapshots : [];
    replaceSheet_(ss, 'Payroll Period Snapshots', [
      ['Snapshot ID','Payroll Period Key','Period Start','Period End','Employee ID','Employee Name','Gross PHP','Net Pay PHP','Updated At'],
      ...payrollSnapshots.map(x => [x.id||'',x.periodKey||'',x.periodStart||'',x.periodEnd||'',x.empId||'',x.employeeName||nameById[x.empId]||'',num_(x.gross),num_(x.netPay),x.updatedAt||''])
    ]);
    replaceSheet_(ss, 'Payroll Payments', [
      ['Payment ID','Entry Type','Employee ID','Employee Name','Payroll Period Key','Period Start','Period End','Gross PHP','Net Pay PHP','Amount PHP','Payment Date','Payment Date Time ISO','Due Date','Method','Reference','Notes','Manager','Created At','Reverses Payment ID'],
      ...payrollPayments.map(x => [x.id||'',x.kind||'payment',x.empId||'',x.employeeName||nameById[x.empId]||'',x.periodKey||'',x.periodStart||'',x.periodEnd||'',num_(x.gross),num_(x.netPay),num_(x.amount),x.paymentDate||'',x.paymentDateTime||'',x.dueDate||'',x.method||'',x.reference||'',x.notes||'',x.manager||'',x.createdAt||'',x.reversesPaymentId||''])
    ]);
    const statusRows=[['Employee ID','Employee Name','Payroll Period Key','Period Start','Period End','Gross PHP','Net Pay PHP','Paid PHP','Outstanding PHP','Due Date','Status']];
    payrollSnapshots.forEach(x=>{const related=payrollPayments.filter(p=>p.empId===x.empId&&p.periodKey===x.periodKey);const paid=related.reduce((n,p)=>n+(p.kind==='reversal'?-Math.abs(num_(p.amount)):(p.kind==='due-date'?0:num_(p.amount))),0);const dueEntries=related.filter(p=>p.kind==='due-date');const due=dueEntries.length?dueEntries[dueEntries.length-1].dueDate:(related.filter(p=>p.kind==='payment'&&p.dueDate).slice(-1)[0]?.dueDate||'');const outstanding=Math.max(0,num_(x.netPay)-paid);const status=outstanding<=0?'Paid':due?(due<Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd')?'Overdue':'Payment Due'):'Awaiting Payment';statusRows.push([x.empId||'',x.employeeName||'',x.periodKey||'',x.periodStart||'',x.periodEnd||'',num_(x.gross),num_(x.netPay),paid,outstanding,due,status]);});
    replaceSheet_(ss,'Payroll Status',statusRows);


}


function saveHubSnapshot(payload, expectedRevision) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!payload || payload.app !== 'Employee Hub' || !payload.data) throw new Error('Invalid Employee Hub snapshot.');
    requireHubDevice_(payload.deviceId,payload.deviceToken);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('Hub Snapshot') || ss.insertSheet('Hub Snapshot');
    const current = sh.getLastRow() ? Number(sh.getRange(1,2).getValue()) || 0 : 0;
    if (Number(expectedRevision || 0) !== current) throw new Error('Cloud revision conflict. Current server revision is ' + current + '; load cloud data before saving.');
    writeHubSnapshot_(ss, payload.data, current+1);
    writePayrollIntegrationSheets_(ss, payload.data);
    appendServerAudit_('Device '+String(payload.deviceId||''), 'CLOUD SNAPSHOT SAVED', 'Revision ' + (current+1));
    return {ok:true, revision:current+1, savedAt:new Date().toISOString()};
  } finally { lock.releaseLock(); }
}

function writeHubSnapshot_(ss, data, revision) {
  const sh = ss.getSheetByName('Hub Snapshot') || ss.insertSheet('Hub Snapshot');
  const safe = JSON.parse(JSON.stringify(data || {}));
  delete safe.pins; delete safe.sheetUrl;
  safe.absences = Array.isArray(safe.absences) ? safe.absences : [];
  safe.employees = (Array.isArray(safe.employees) ? safe.employees : []).map(e => { const copy = Object.assign({},e); delete copy.pin; return copy; });
  const serialized = JSON.stringify(safe), chunkSize = 40000, chunks = [];
  for (let i=0;i<serialized.length;i+=chunkSize) chunks.push([serialized.slice(i,i+chunkSize)]);
  sh.clearContents();
  sh.getRange(1,1,1,2).setValues([['Snapshot metadata',revision]]);
  if (chunks.length) sh.getRange(2,1,chunks.length,1).setValues(chunks);
  if (ss.getSheets().length > 1) sh.hideSheet();
}

function archiveEmployeeHubRecords(request) {
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const req=request||{}; requireHubDevice_(req.deviceId,req.deviceToken);
    const rows=Array.isArray(req.rows)?req.rows:[];
    if(!rows.length) return {ok:true,archived:0,duplicates:0};
    if(rows.length>200) throw new Error('Archive batches are limited to 200 records.');
    const ss=SpreadsheetApp.getActiveSpreadsheet(); if(!ss) throw new Error('Employee Hub spreadsheet is unavailable.');
    const sh=ss.getSheetByName('Employee Hub Historical Archive')||ss.insertSheet('Employee Hub Historical Archive');
    if(sh.getLastRow()===0){sh.appendRow(['Archive Key','Record Type','Record ID','Record Date','Archived At','Payload JSON']);sh.setFrozenRows(1);sh.getRange(1,1,1,6).setFontWeight('bold');}
    const last=sh.getLastRow(), existing=last>1?sh.getRange(2,1,last-1,1).getValues().flat().map(String):[];
    const seen=new Set(existing), add=[], stamp=new Date().toISOString(); let duplicates=0;
    rows.forEach(r=>{
      const type=String(r.type||''), id=String(r.recordId||'');
      if(!type||!id||!r.payload) throw new Error('Archive record is missing its type, ID, or payload.');
      const key=type+'::'+id;
      if(seen.has(key)){duplicates++;return;}
      seen.add(key); add.push([key,type,id,String(r.recordDate||''),stamp,JSON.stringify(r.payload)]);
    });
    if(add.length) sh.getRange(sh.getLastRow()+1,1,add.length,6).setValues(add);
    const history=ss.getSheetByName('Employee Hub Archive History')||ss.insertSheet('Employee Hub Archive History');
    if(history.getLastRow()===0) history.appendRow(['Archived At','New Records','Duplicates Skipped','Status']);
    history.appendRow([stamp,add.length,duplicates,'SUCCESS']);
    return {ok:true,archived:add.length,duplicates:duplicates,archiveSheet:sh.getName()};
  } finally { lock.releaseLock(); }
}

function appendServerAudit_(email, action, details) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Server Audit') || ss.insertSheet('Server Audit');
  if (sh.getLastRow() === 0) { sh.appendRow(['Timestamp ISO','Google Account','Action','Details']); sh.setFrozenRows(1); }
  sh.appendRow([new Date().toISOString(), email, action, details]);
}

function scheduledShiftHours_(emp) {
  if (!emp || !emp.scheduleIn || !emp.scheduleOut) return 8;
  const a=String(emp.scheduleIn).split(':').map(Number), b=String(emp.scheduleOut).split(':').map(Number);
  let minutes=(b[0]*60+b[1])-(a[0]*60+a[1]); if (minutes<=0) minutes+=1440;
  return Math.max(0,minutes/60);
}

function payrollEarnings_(rows, rate, config) {
  const threshold = Number(config.overtimeAfterHours) > 0 ? Number(config.overtimeAfterHours) : 8;
  const otMult = Number(config.overtimeMultiplier) >= 1 ? Number(config.overtimeMultiplier) : 1.25;
  const holidayMult = Number(config.holidayMultiplier) >= 1 ? Number(config.holidayMultiplier) : 2;
  const holidays = new Set(Array.isArray(config.holidays) ? config.holidays : []);
  let regularHours=0, overtimeHours=0, holidayHours=0, gross=0;
  const byDay = new Map();
  rows.forEach(r => {
    const start = r.in ? new Date(r.in) : null, end = r.out ? new Date(r.out) : null;
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      let cursor = new Date(start);
      while (cursor < end) {
        const next = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()+1);
        const stop = new Date(Math.min(end.getTime(), next.getTime()));
        const key = dateKey_(cursor);
        byDay.set(key, (byDay.get(key) || 0) + (stop-cursor)/3600000);
        cursor = stop;
      }
    } else if (r.date) byDay.set(r.date, (byDay.get(r.date) || 0) + Math.max(0,num_(r.hours)));
  });
  byDay.forEach((h, day) => {
    const reg=Math.min(h,threshold), ot=Math.max(0,h-threshold);
    if (holidays.has(day)) { holidayHours+=h; gross += reg*rate*holidayMult + ot*rate*holidayMult*otMult; }
    else { regularHours+=reg; overtimeHours+=ot; gross += reg*rate + ot*rate*otMult; }
  });
  return {regularHours,overtimeHours,holidayHours,gross};
}

function replaceSheet_(ss, name, values) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if (values.length && values[0].length) {
    sh.getRange(1, 1, values.length, values[0].length).setValues(values);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, values[0].length).setFontWeight('bold');
    sh.autoResizeColumns(1, values[0].length);
  }
}

function appendAuditOnly_(ss, incoming, cutoff) {
  const sh = ss.getSheetByName('Audit Trail') || ss.insertSheet('Audit Trail');
  const values = sh.getDataRange().getValues();
  const headers = ['Audit ID','Timestamp ISO','Action','Details'];
  const existing = values.length > 1 ? values.slice(1) : [];
  const seen = new Set(existing.map(r => String(r[0])));
  const kept = existing.filter(r => r[1] && new Date(r[1]) >= cutoff);
  const keptIds = new Set(kept.map(r => String(r[0])));
  incoming.forEach(x => {
    const id = String(x.id || '');
    if (id && !keptIds.has(id)) kept.push([id, x.at || '', x.action || '', x.detail || '']);
  });
  sh.clearContents();
  const out = [headers].concat(kept);
  sh.getRange(1,1,out.length,4).setValues(out);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,4).setFontWeight('bold');
  sh.autoResizeColumns(1,4);
}

function appendSyncEvent_(ss, row) {
  const sh = ss.getSheetByName('Sync Events') || ss.insertSheet('Sync Events');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Timestamp ISO','Google Account','Status','Payload Timestamp','Attendance Records','Employees','Audit Entries','Message']);
    sh.setFrozenRows(1);
  }
  sh.appendRow(row);
}

function payrollRange_(period, reference, config) {
  const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  let start, end;
  if (period === 'month') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  } else if (period === 'biweek') {
    let anchor = config.biweekAnchor ? new Date(config.biweekAnchor + 'T00:00:00') : new Date('2026-01-05T00:00:00');
    if (isNaN(anchor.getTime())) anchor = new Date('2026-01-05T00:00:00');
    const days = Math.floor((d - anchor) / 86400000);
    const offset = ((days % 14) + 14) % 14;
    start = new Date(d); start.setDate(d.getDate() - offset);
    end = new Date(start); end.setDate(start.getDate() + 13);
  } else {
    const weekStart = Number(config.weekStartDay === 0 ? 0 : 1);
    const offset = (d.getDay() - weekStart + 7) % 7;
    start = new Date(d); start.setDate(d.getDate() - offset);
    end = new Date(start); end.setDate(start.getDate() + 6);
  }
  return { start: dateKey_(start), end: dateKey_(end) };
}

function dateKey_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function num_(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/**
 * V10.12 ADDITIVE TASK PHOTO / VIDEO EVIDENCE STORAGE
 *
 * Setup:
 * 1. Create a shared Google Drive folder owned by the business.
 * 2. Share it with the employee and manager Google accounts that need upload/view access.
 * 3. Set Script Property TASK_EVIDENCE_FOLDER_ID to that folder's ID.
 * 4. Authorize the new Drive scope when saving/deploying this Apps Script version.
 *
 * The folder is intentionally not made public. Drive permissions govern access to files.
 */
function uploadTaskEvidence(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid evidence upload request.');
  requireHubDevice_(payload.deviceId, payload.deviceToken);

  const taskId = String(payload.taskId || '');
  const employeeId = String(payload.employeeId || '');
  const fileName = String(payload.fileName || 'task-evidence').replace(/[\\/:*?"<>|]/g, '_').slice(0, 150);
  const mimeType = String(payload.mimeType || '').toLowerCase();
  const base64 = String(payload.base64 || '');
  const isImage = /^image\/(jpeg|png|webp|gif|heic|heif)$/.test(mimeType);
  const isVideo = /^video\/(mp4|quicktime|webm|3gpp|x-msvideo|mpeg|ogg)$/.test(mimeType);
  if (!taskId || !employeeId) throw new Error('Task and employee references are required.');
  if (!isImage && !isVideo) throw new Error('Only supported photo and video formats are accepted.');
  if (!base64) throw new Error('The uploaded file is empty.');
  const bytes = Utilities.base64Decode(base64);
  const limit = isImage ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
  if (bytes.length > limit) throw new Error('File exceeds the allowed size limit.');
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(taskId) || !/^[A-Za-z0-9_-]{2,100}$/.test(employeeId)) throw new Error('Invalid task or employee reference.');

  const folderId = PropertiesService.getScriptProperties().getProperty('TASK_EVIDENCE_FOLDER_ID');
  if (!folderId) throw new Error('Task evidence folder is not configured. Set Script Property TASK_EVIDENCE_FOLDER_ID to the shared Drive folder ID.');
  const folder = DriveApp.getFolderById(folderId);
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const blob = Utilities.newBlob(bytes, mimeType, stamp + '_' + fileName);
  const file = folder.createFile(blob);
  file.setDescription('Employee Hub task evidence | Task ID: ' + taskId + ' | Employee ID: ' + employeeId + ' | Uploaded: ' + new Date().toISOString());
  const result = {
    ok: true,
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: mimeType,
    url: file.getUrl(),
    uploadedAt: new Date().toISOString()
  };
  appendServerAudit_('Authorized Employee Hub device', 'TASK EVIDENCE FILE UPLOADED', taskId + ' | ' + employeeId + ' | ' + file.getName());
  return result;
}

/**
 * Run once manually from the Apps Script editor as the Drive folder owner if you
 * want Apps Script to create the folder. Then share it with staff and copy its ID
 * into Script Property TASK_EVIDENCE_FOLDER_ID. This helper does not make it public.
 */
function createTaskEvidenceFolderOnce() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('TASK_EVIDENCE_FOLDER_ID');
  if (existing) return {folderId: existing, url: DriveApp.getFolderById(existing).getUrl(), existing: true};
  const folder = DriveApp.createFolder('Employee Hub Task Evidence');
  props.setProperty('TASK_EVIDENCE_FOLDER_ID', folder.getId());
  appendServerAudit_('Apps Script owner', 'TASK EVIDENCE FOLDER CREATED', folder.getId());
  return {folderId: folder.getId(), url: folder.getUrl(), existing: false};
}
