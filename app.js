const state = JSON.parse(localStorage.getItem('aq_state') || '{"role":"employee","goals":[],"locked":false,"submitted":false,"comments":[],"audit":[]}');
const save = () => localStorage.setItem('aq_state', JSON.stringify(state));
const el = (id) => document.getElementById(id);

function quarterWindow() {
  const m = new Date().getMonth() + 1;
  if (m === 5 || m === 6) return 'Phase 1 window open (Goal creation + approval).';
  if (m >= 7 && m <= 9) return 'Q1 check-in window open.';
  if (m >= 10 && m <= 12) return 'Q2 check-in window open.';
  if (m === 1 || m === 2) return 'Q3 check-in window open.';
  return 'Q4 / Annual check-in window open.';
}

function progress(g) {
  const t = Number(g.target); const a = Number(g.achievement || 0);
  if (g.uom === 'min') return t ? Math.min(100, (a / t) * 100).toFixed(1) + '%' : '0%';
  if (g.uom === 'max') return a ? Math.min(100, (t / a) * 100).toFixed(1) + '%' : '0%';
  if (g.uom === 'zero') return a === 0 ? '100%' : '0%';
  if (g.uom === 'timeline') return g.status === 'Completed' ? '100%' : g.status === 'On Track' ? '50%' : '0%';
  return '0%';
}

function render() {
  el('activeRole').textContent = `Active role: ${state.role}`;
  el('role').value = state.role;
  el('employeeSection').style.display = state.role === 'employee' ? 'block' : 'none';
  el('managerSection').style.display = state.role === 'manager' ? 'block' : 'none';
  el('adminSection').style.display = state.role === 'admin' ? 'block' : 'none';
  el('quarterWindow').textContent = quarterWindow();

  el('goalTable').innerHTML = state.goals.map((g, i) => `
    <tr>
      <td>${g.title}</td><td>${g.target}</td><td>${g.weight}</td>
      <td>
        <select onchange="updateStatus(${i}, this.value)">
          ${['Not Started','On Track','Completed'].map(s => `<option ${g.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><input type="number" value="${g.achievement||0}" ${state.locked && state.role==='employee' ? '' : ''} onchange="updateAchievement(${i}, this.value)" /></td>
      <td>${progress(g)}</td>
      <td><button onclick="delGoal(${i})" ${state.locked ? 'disabled' : ''}>Delete</button></td>
    </tr>
  `).join('');

  el('commentLog').innerHTML = state.comments.map(c => `<li>${c}</li>`).join('');
  el('audit').innerHTML = state.audit.map(a => `<li>${a}</li>`).join('');
}

window.updateStatus = (i, v) => { state.goals[i].status = v; save(); render(); };
window.updateAchievement = (i, v) => { state.goals[i].achievement = Number(v); save(); render(); };
window.delGoal = (i) => { state.goals.splice(i, 1); save(); render(); };

el('switchRole').onclick = () => { state.role = el('role').value; save(); render(); };

el('goalForm').onsubmit = (e) => {
  e.preventDefault();
  if (state.locked) return alert('Goals are locked.');
  if (state.goals.length >= 8) return alert('Maximum 8 goals allowed.');
  const weight = Number(el('weight').value);
  if (weight < 10) return alert('Minimum weightage is 10%.');
  state.goals.push({ title: el('title').value, desc: el('desc').value, thrust: el('thrust').value, uom: el('uom').value, target: el('target').value, weight, status: 'Not Started', achievement: 0 });
  state.audit.push(`${new Date().toISOString()} employee created goal ${el('title').value}`);
  save(); e.target.reset(); render();
};

el('submitGoals').onclick = () => {
  const total = state.goals.reduce((s, g) => s + Number(g.weight), 0);
  if (total !== 100) return alert(`Total weightage must be 100%. Current: ${total}%`);
  state.submitted = true;
  state.audit.push(`${new Date().toISOString()} employee submitted goal sheet`);
  save(); render(); alert('Submitted for manager approval.');
};
el('approveGoals').onclick = () => { state.locked = true; state.audit.push(`${new Date().toISOString()} manager approved + locked goals`); save(); render(); };
el('returnGoals').onclick = () => { state.locked = false; state.submitted = false; state.audit.push(`${new Date().toISOString()} manager returned for rework`); save(); render(); };
el('saveComment').onclick = () => { if (el('managerComment').value.trim()) state.comments.push(`${new Date().toISOString()} ${el('managerComment').value}`); save(); render(); el('managerComment').value=''; };
el('unlockGoals').onclick = () => { state.locked = false; state.audit.push(`${new Date().toISOString()} admin unlocked goals`); save(); render(); };
el('exportCsv').onclick = () => {
  const rows = [['Title','Target','Achievement','Progress']].concat(state.goals.map(g => [g.title, g.target, g.achievement || 0, progress(g)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'achievement-report.csv'; a.click();
};

render();
