const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','employee_hub_google_sheets_v5.gs'),'utf8');
const sheets={};
function sheet(name){if(!sheets[name])sheets[name]={rows:[],getName(){return name},getLastRow(){return this.rows.length},appendRow(r){this.rows.push(r)},getRange(r,c,n,m){return {getValues:()=>this.rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+m)),setValues:v=>{for(let i=0;i<v.length;i++)this.rows[r-1+i]=v[i]},setFontWeight(){}}},setFrozenRows(){}};return sheets[name]}
const ctx={console,LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheet(n)})}};
vm.createContext(ctx);vm.runInContext(source,ctx);ctx.requireHubDevice_=()=>true;
let a=ctx.archiveEmployeeHubRecords({deviceId:'d',deviceToken:'t',rows:[{type:'records',recordId:'r1',recordDate:'2025-01-01',payload:{id:'r1',hours:8}}]});
assert.equal(a.ok,true);assert.equal(a.archived,1);assert.equal(sheet('Employee Hub Historical Archive').rows.length,2);
let b=ctx.archiveEmployeeHubRecords({deviceId:'d',deviceToken:'t',rows:[{type:'records',recordId:'r1',recordDate:'2025-01-01',payload:{id:'r1',hours:8}}]});
assert.equal(b.archived,0);assert.equal(b.duplicates,1);assert.equal(sheet('Employee Hub Historical Archive').rows.length,2);
console.log('PASS: Employee Hub archive append and duplicate protection');
