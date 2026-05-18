const initial = { role:'employee', goals:[], locked:false, submitted:false, comments:[], audit:[] };
const state = JSON.parse(localStorage.getItem('aq_state') || JSON.stringify(initial));
const save = () => localStorage.setItem('aq_state', JSON.stringify(state));
const el = (id) => document.getElementById(id);

const aiTemplates = [
  { title:'Increase Customer NPS', desc:'Improve customer satisfaction score', thrust:'Customer Excellence', uom:'min', target:70, weight:20 },
  { title:'Reduce Ticket TAT', desc:'Lower average issue resolution time', thrust:'Operational Efficiency', uom:'max', target:24, weight:20 },
  { title:'Zero Security Incidents', desc:'Maintain zero critical incidents', thrust:'Risk & Compliance', uom:'zero', target:0, weight:20 },
  { title:'Quarterly Project Delivery', desc:'Deliver release before deadline', thrust:'Execution', uom:'timeline', target:'2026-09-30', weight:20 },
  { title:'Upskill Certification', desc:'Complete advanced certification', thrust:'People Growth', uom:'timeline', target:'2026-12-31', weight:20 }
];

function quarterWindow(){const m=new Date().getMonth()+1;if(m===5||m===6)return'Phase 1 Open';if(m>=7&&m<=9)return'Q1 Open';if(m>=10&&m<=12)return'Q2 Open';if(m===1||m===2)return'Q3 Open';return'Q4 / Annual Open';}
function progress(g){const t=Number(g.target),a=Number(g.achievement||0);if(g.uom==='min')return t?Math.min(100,a/t*100):0;if(g.uom==='max')return a?Math.min(100,t/a*100):0;if(g.uom==='zero')return a===0?100:0;if(g.uom==='timeline')return g.status==='Completed'?100:g.status==='On Track'?50:0;return 0}
function risk(g){const p=progress(g);if(p<40)return{label:'High Risk',cls:'risk-high'};if(p<70)return{label:'Medium Risk',cls:'risk-med'};return{label:'Low Risk',cls:'risk-low'};}

function render(){
  el('activeRole').textContent = `Active Role: ${state.role}`;
  el('role').value = state.role;
  el('quarterWindow').textContent = `Window: ${quarterWindow()}`;
  el('totalGoals').textContent = state.goals.length;
  const tw = state.goals.reduce((s,g)=>s+Number(g.weight),0); el('totalWeight').textContent = `${tw}%`;
  el('lockState').textContent = state.locked ? 'Yes' : 'No';

  el('employeeSection').style.display = state.role==='employee'?'block':'none';
  el('managerSection').style.display = state.role==='manager'?'block':'none';
  el('adminSection').style.display = state.role==='admin'?'block':'none';

  el('goalTable').innerHTML = state.goals.map((g,i)=>{const r=risk(g);return `<tr>
  <td>${g.title}</td><td>${g.target}</td><td>${g.weight}</td>
  <td><select onchange="updateStatus(${i},this.value)">${['Not Started','On Track','Completed'].map(s=>`<option ${g.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
  <td><input type="number" value="${g.achievement||0}" onchange="updateAchievement(${i},this.value)"/></td>
  <td>${progress(g).toFixed(1)}%</td><td><span class="badge ${r.cls}">${r.label}</span></td>
  <td><button onclick="delGoal(${i})" ${state.locked?'disabled':''}>Delete</button></td></tr>`;}).join('');

  el('riskAlerts').innerHTML = state.goals.filter(g=>risk(g).label!=='Low Risk').map(g=>`<li>${g.title}: ${risk(g).label}</li>`).join('') || '<li>No risks detected.</li>';
  el('commentLog').innerHTML = state.comments.map(c=>`<li>${c}</li>`).join('');
  el('audit').innerHTML = state.audit.map(a=>`<li>${a}</li>`).join('');
  const done = state.goals.filter(g=>g.status==='Completed').length;
  el('doneGoals').textContent = done;
  el('completionRate').textContent = state.goals.length?`${((done/state.goals.length)*100).toFixed(0)}%`:'0%';
  el('riskCount').textContent = state.goals.filter(g=>risk(g).label!=='Low Risk').length;
}

window.updateStatus=(i,v)=>{state.goals[i].status=v;save();render();};
window.updateAchievement=(i,v)=>{state.goals[i].achievement=Number(v);save();render();};
window.delGoal=(i)=>{state.goals.splice(i,1);save();render();};
el('switchRole').onclick=()=>{state.role=el('role').value;save();render();};

el('aiSuggest').onclick=()=>{
  if(state.locked) return alert('Goals locked');
  if(state.goals.length) return alert('Clear existing goals first for auto-pack');
  state.goals = aiTemplates.map(g=>({...g,status:'Not Started',achievement:0}));
  state.audit.push(`${new Date().toISOString()} AI suggested goal pack`); save(); render();
};

el('goalForm').onsubmit=(e)=>{e.preventDefault();if(state.locked)return alert('Goals locked'); if(state.goals.length>=8)return alert('Maximum 8 goals allowed');
  const weight=Number(el('weight').value); if(weight<10)return alert('Minimum 10%');
  state.goals.push({title:el('title').value,desc:el('desc').value,thrust:el('thrust').value,uom:el('uom').value,target:el('target').value,weight,status:'Not Started',achievement:0});
  state.audit.push(`${new Date().toISOString()} employee created goal ${el('title').value}`); save(); e.target.reset(); render();
};

el('submitGoals').onclick=()=>{const total=state.goals.reduce((s,g)=>s+Number(g.weight),0);if(total!==100)return alert(`Total must be 100%. current ${total}%`);state.submitted=true;state.audit.push(`${new Date().toISOString()} employee submitted goals`);save();render();alert('Submitted');};
el('approveGoals').onclick=()=>{state.locked=true;state.audit.push(`${new Date().toISOString()} manager approved and locked`);save();render();};
el('returnGoals').onclick=()=>{state.locked=false;state.submitted=false;state.audit.push(`${new Date().toISOString()} manager returned for rework`);save();render();};
el('saveComment').onclick=()=>{const v=el('managerComment').value.trim();if(!v)return;state.comments.push(`${new Date().toISOString()} ${v}`);el('managerComment').value='';save();render();};
el('unlockGoals').onclick=()=>{state.locked=false;state.audit.push(`${new Date().toISOString()} admin unlocked goals`);save();render();};
el('exportCsv').onclick=()=>{const rows=[['Title','Target','Achievement','Progress','Risk']].concat(state.goals.map(g=>[g.title,g.target,g.achievement||0,`${progress(g).toFixed(1)}%`,risk(g).label]));const csv=rows.map(r=>r.join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='achievement-report.csv';a.click();};

render();
