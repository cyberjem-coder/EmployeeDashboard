const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2],'utf8');
const a=html.indexOf('function renderEmployeeAICoach('),b=html.indexOf('\nfunction refreshEmployeeAICoach',a);
assert(a>=0&&b>a,'coach function exists');
const ctx={db:{records:[],performanceReviews:[]},dateKey:()=> '2026-11-13',periodStart:()=> '2026-11-09',esc:s=>String(s??'').replace(/[&<>"\']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),console};
vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);const emp={id:'e1'};
function run(tasks=[],records=[],reviews=[]){ctx.db={records,performanceReviews:reviews};return ctx.renderEmployeeAICoach(emp,tasks)}
let x=run();assert(x.includes('AI SUPERVISOR')&&x.includes('AI MOTIVATOR')&&x.includes('All clear'));
x=run([{empId:'e1',title:'Clean station',dueDate:'2026-11-12',status:'pending'}]);assert(x.includes('past their due date')&&x.includes('first manageable step'));
x=run([{empId:'e1',title:'Stock count',dueDate:'2026-11-13',status:'submitted'}]);assert(x.includes('awaiting manager review'));
x=run([],[{empId:'e1',date:'2026-11-13',in:'2026-11-13T09:00:00Z',out:null,late:5}]);assert(x.includes('shift is currently open')&&x.includes('late arrival'));
x=run([],[],[{empId:'e1',date:'2026-11-10',quality:80,productivity:55,service:90,teamwork:80,compliance:90,improvementPlan:'Practice stock counts'}]);assert(x.includes('productivity')&&x.includes('Practice stock counts'));
x=run([{empId:'e1',title:'Prep',dueDate:'2026-11-13',status:'in_progress'}]);assert(x.includes('1 mission(s) in progress'));
console.log('PASS: 6 AI Supervisor & Motivator behavior tests');
