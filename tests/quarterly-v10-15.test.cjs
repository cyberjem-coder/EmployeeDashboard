const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','Index.html'),'utf8');
const a=html.indexOf('/* V10.15 ADDITIVE'),b=html.lastIndexOf('</script>');assert(a>=0&&b>a,'V10.15 module exists');
const els={q15Year:{value:'2026'},q15Quarter:{value:'1'},q15Cycle:{value:'month'}};
function periodRange(type,ref){const d=new Date(ref);let s=new Date(d),e=new Date(d);if(type==='month'){s=new Date(d.getFullYear(),d.getMonth(),1);e=new Date(d.getFullYear(),d.getMonth()+1,0)}return {start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10)}}
const db={employees:[{id:'e1',name:'Staff A'}],payrollPayments:[{date:'2026-02-15',amount:100}],records:[{date:'2026-02-10'}],absences:[]};
const ctx={db,console,Intl,Date,Number,String,Math,JSON,renderPayroll:()=>{},window:{},document:{getElementById:id=>els[id]||null},payPeriod:{value:'month'},periodRange,totals:()=>({gross:100,penalty:5,ded:10,absenceDed:0,bonus:2,net:87,hours:8})};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
const r=ctx.q15Build();assert.equal(r.figures.completePayrollPeriods,3);assert.equal(r.figures.grossCompensation,300);assert.equal(r.figures.latePenalties,15);assert.equal(r.figures.deductionsIncludingUnpaidAbsence,30);assert.equal(r.figures.bonuses,6);assert.equal(r.figures.netPayableForIncludedPeriods,261);assert.equal(r.figures.payrollCashPaymentsRecordedInQuarter,100);assert.equal(r.periods.length,3);assert.equal(r.cycle,'month');
console.log('PASS: Employee Hub quarterly payroll uses complete existing monthly periods and separates payments');
