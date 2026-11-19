const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'Index.html','utf8');
const checks=[
 ['login greeting is called only in successful login path',html.includes("if(taskEmployeePin.value!==e.pin)return alert('Incorrect employee PIN.');taskEmployeeSession=e.id;taskEmployeePin.value='';renderMyTasks();speakEmployeeMotivation('greeting')")],
 ['Motivate Me replay button',html.includes("onclick=\"speakEmployeeMotivation('manual')\"")],
 ['English and Tagalog phrase pools',html.includes('en:[')&&html.includes('tl:[')],
 ['existing language selector used',html.includes("localStorage.getItem('employeeHubLanguage')")],
 ['mute and volume controls',html.includes('toggleMotivatorMute')&&html.includes('setMotivatorVolume')],
 ['browser speech synthesis only',html.includes('new SpeechSynthesisUtterance(pool[index])')&&html.includes('window.speechSynthesis.speak(utterance)')],
 ['no new external AI/network call in speech engine',!(/fetch\s*\(|XMLHttpRequest|WebSocket/.test(html.slice(html.indexOf('/* V10.9 ADDITIVE LOCAL BILINGUAL SPEECH ENGINE'),html.indexOf('function refreshEmployeeAICoach'))))],
 ['lock cancels speech',html.includes("if('speechSynthesis'in window)window.speechSynthesis.cancel();myTasksPanel.innerHTML")]
];
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`);assert(ok,name)}
console.log(`PASS: ${checks.length} spoken motivator checks`);
