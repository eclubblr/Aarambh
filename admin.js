// Simple client-side admin app using localStorage for demo/dynamic behavior
(function(){
  const LS_KEYS = {EVENTS:'adm_events_v1', REGS:'adm_regs_v1', TICK:'adm_tickets_v1', TPL:'adm_templates_v1', USERS:'adm_users_v1'};

  // helpers
  const $ = sel => document.querySelector(sel);
  const create = (t)=> document.createElement(t);
  function uid(){ return 'id_'+Math.random().toString(36).slice(2,9); }
  function save(key,data){ localStorage.setItem(key, JSON.stringify(data)); }
  function load(key,def){ try{ const v = JSON.parse(localStorage.getItem(key)||'null'); return v || def; }catch(e){return def;} }

  // initial demo data
  let events = load(LS_KEYS.EVENTS, [ {id:uid(), title:'AI – Build Fest', fees:200, eligibility:'Open', capacity:200}, {id:uid(), title:'Ideathon', fees:0, eligibility:'Students & Startups', capacity:150} ]);
  let regs = load(LS_KEYS.REGS, []);
  let tickets = load(LS_KEYS.TICK, []);
  let templates = load(LS_KEYS.TPL, {verify:'Hello {{name}}, verify your email: {{link}}', reg:'Thanks for registering for {{event}}', pay:'Payment received: {{amount}}'});
  let users = load(LS_KEYS.USERS, [{id:uid(), name:'Admin', email:'admin@local', role:'super-admin'}]);

  // role handling
  const roleSelect = $('#roleSelect');
  roleSelect.value = 'super-admin';
  roleSelect.addEventListener('change', ()=> renderAll());

  // nav view switching
  document.querySelectorAll('.adm-nav button').forEach(b=> b.addEventListener('click', (e)=>{
    document.querySelectorAll('.adm-nav button').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    const view = e.currentTarget.dataset.view;
    document.querySelectorAll('.view').forEach(v=> v.classList.add('hidden'));
    document.getElementById('view-'+view).classList.remove('hidden');
    renderAll();
  }));

  // reset data
  $('#logoutBtn').addEventListener('click', ()=>{
    if(!confirm('Reset admin demo data?')) return; localStorage.removeItem(LS_KEYS.EVENTS); localStorage.removeItem(LS_KEYS.REGS); localStorage.removeItem(LS_KEYS.TICK); localStorage.removeItem(LS_KEYS.TPL); localStorage.removeItem(LS_KEYS.USERS); location.reload();
  });

  // Events UI
  const eventsList = $('#eventsList');
  function renderEvents(filter=''){
    eventsList.innerHTML='';
    const f = filter.trim().toLowerCase();
    events.filter(e=> !f || e.title.toLowerCase().includes(f)).forEach(ev=>{
      const el = create('div'); el.className='card';
      el.innerHTML = `<h4>${ev.title}</h4><div class="meta">Fees: ₹${ev.fees} • Eligibility: ${ev.eligibility} • Capacity: ${ev.capacity}</div>`;
      const row = create('div'); row.style.display='flex'; row.style.gap='8px';
      const btnEdit = create('button'); btnEdit.className='btn-sm'; btnEdit.textContent='Edit'; btnEdit.addEventListener('click', ()=> openEventModal(ev));
      const btnDel = create('button'); btnDel.className='btn-sm'; btnDel.textContent='Delete'; btnDel.addEventListener('click', ()=>{ if(confirm('Delete event?')){ events = events.filter(x=>x.id!==ev.id); persist(); renderEvents($('#searchEvent').value); } });
      const btnViewRegs = create('button'); btnViewRegs.className='btn-sm'; btnViewRegs.textContent='View regs'; btnViewRegs.addEventListener('click', ()=>{ document.querySelector('[data-view="registrations"]').click(); $('#searchReg').value = ev.title; renderRegs(ev.title); });
      row.appendChild(btnViewRegs); row.appendChild(btnEdit); row.appendChild(btnDel); el.appendChild(row); eventsList.appendChild(el);
    });
    $('#mEvents').textContent = events.length;
  }

  function openEventModal(ev){
    $('#modal').classList.remove('hidden');
    $('#modalTitle').textContent = ev ? 'Edit Event' : 'Create Event';
    const form = $('#eventForm'); form.dataset.editId = ev ? ev.id : '';
    form.elements['title'].value = ev ? ev.title : '';
    form.elements['fees'].value = ev ? ev.fees : 0; form.elements['eligibility'].value = ev ? ev.eligibility : ''; form.elements['capacity'].value = ev ? ev.capacity : 100;
  }
  $('#addEvent').addEventListener('click', ()=> openEventModal(null));
  $('#cancelModal').addEventListener('click', ()=> $('#modal').classList.add('hidden'));
  $('#eventForm').addEventListener('submit', (e)=>{ 
    e.preventDefault(); 
    const id = e.target.dataset.editId; 
    const o = { id: id || uid(), title: e.target.elements['title'].value, fees: Number(e.target.elements['fees'].value)||0, eligibility: e.target.elements['eligibility'].value, capacity: Number(e.target.elements['capacity'].value)||0 };
    if(id){ events = events.map(x=> x.id===id ? o : x); } else events.unshift(o); persist(); $('#modal').classList.add('hidden'); renderEvents($('#searchEvent').value); 
  });
  $('#exportEvents').addEventListener('click', ()=> exportCSV(events, 'events'));

  // Users UI
  const usersList = $('#usersList');
  function renderUsers(filter=''){
    usersList.innerHTML = '';
    const f = (filter||'').trim().toLowerCase();
    const currentRole = roleSelect.value;
    users.filter(u=> !f || u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f)).forEach(u=>{
      const el = create('div'); el.className = 'user-row';
      const left = create('div'); left.style.display='flex'; left.style.gap='12px'; left.style.alignItems='center';
      const meta = create('div'); meta.innerHTML = `<strong>${u.name}</strong><div class="user-meta">${u.email}</div>`;
      left.appendChild(meta);
      const right = create('div'); right.style.display='flex'; right.style.gap='8px'; right.style.alignItems='center';
      const roleBadge = create('div'); roleBadge.className='role-badge'; roleBadge.textContent = u.role;
      const btnSwitch = create('button'); btnSwitch.className='btn-sm'; btnSwitch.textContent='Switch to'; btnSwitch.addEventListener('click', ()=>{ roleSelect.value = u.role; renderAll(); alert('Switched role to '+u.role); });
      right.appendChild(roleBadge);
      right.appendChild(btnSwitch);
      // role change/select (super-admin only)
      if(currentRole === 'super-admin'){
        const roleSel = create('select'); roleSel.innerHTML = '<option value="super-admin">Super Admin</option><option value="event-admin">Event Admin</option>'; roleSel.value = u.role; roleSel.addEventListener('change', (e)=>{ u.role = e.target.value; persist(); renderUsers($('#searchUser').value); });
        const btnRemove = create('button'); btnRemove.className='btn-sm'; btnRemove.textContent='Remove'; btnRemove.addEventListener('click', ()=>{ if(!confirm('Remove user?')) return; users = users.filter(x=>x.id !== u.id); persist(); renderUsers($('#searchUser').value); });
        right.appendChild(roleSel); right.appendChild(btnRemove);
      }
      el.appendChild(left); el.appendChild(right); usersList.appendChild(el);
    });
  }

  // Invite user modal
  $('#inviteUser').addEventListener('click', ()=>{ if(roleSelect.value !== 'super-admin'){ alert('Only super-admin can invite admins'); return; } $('#userModal').classList.remove('hidden'); $('#userModalTitle').textContent = 'Invite Admin'; const uf = $('#userForm'); uf.dataset.editId = ''; uf.querySelector('input[name="name"]').value = ''; uf.querySelector('input[name="email"]').value = ''; uf.querySelector('select[name="role"]').value = 'event-admin'; });
  $('#cancelUserModal').addEventListener('click', ()=> $('#userModal').classList.add('hidden'));
  $('#userForm').addEventListener('submit', (e)=>{ e.preventDefault(); const form = e.target; const name = (form.elements['name'].value||'').trim(); const email = (form.elements['email'].value||'').trim(); const role = form.elements['role'].value; if(!name||!email) return alert('Name and email required'); users.unshift({id:uid(), name, email, role}); persist(); $('#userModal').classList.add('hidden'); renderUsers(); alert('Invited '+name); });
  $('#searchUser').addEventListener('input', (e)=> renderUsers(e.target.value));

  // Registrations UI
  const regsList = $('#regsList');
  function renderRegs(filter=''){
    regsList.innerHTML='';
    const f = (filter||'').trim().toLowerCase();
    const list = regs.filter(r=> !f || r.name.toLowerCase().includes(f) || r.event.toLowerCase().includes(f));
    list.forEach(r=>{
      const el = create('div'); el.className='reg-row';
      el.innerHTML = `<strong>${r.name}</strong> • ${r.event} • ₹${r.amount} • <em>${r.status||'pending'}</em>`;
      const a1 = create('button'); a1.className='btn-sm'; a1.textContent = r.docApproved ? 'Doc OK' : 'Approve Doc'; a1.addEventListener('click', ()=>{ r.docApproved = !r.docApproved; persist(); renderRegs($('#searchReg').value); });
      const a2 = create('button'); a2.className='btn-sm'; a2.textContent='Delete'; a2.addEventListener('click', ()=>{ if(confirm('Delete registration?')){ regs = regs.filter(x=>x.id!==r.id); persist(); renderRegs($('#searchReg').value); } });
      el.appendChild(a1); el.appendChild(a2); regsList.appendChild(el);
    });
    $('#mRegs').textContent = regs.length;
  }
  $('#searchReg').addEventListener('input', (e)=> renderRegs(e.target.value));
  $('#exportRegs').addEventListener('click', ()=> exportCSV(regs, 'registrations'));
  $('#addManualReg').addEventListener('click', ()=>{
    const name = prompt('Name'); if(!name) return; const event = prompt('Event'); if(!event) return; const amount = Number(prompt('Amount')||0);
    regs.unshift({id:uid(), name, event, amount, status:'manual', docApproved:false}); persist(); renderRegs();
  });

  // Tickets
  const ticketsList = $('#ticketsList');
  function renderTickets(){ ticketsList.innerHTML=''; tickets.forEach(t=>{ const el=create('div'); el.className='ticket-row'; el.innerHTML = `<strong>${t.subject}</strong><div>${t.message}</div><div>Status: <em>${t.status||'open'}</em></div>`; const a1=create('button'); a1.className='btn-sm'; a1.textContent='Assign'; a1.addEventListener('click', ()=>{ const who=prompt('Assign to (name)'); if(who){ t.assigned=who; t.status='assigned'; persist(); renderTickets(); } }); const a2=create('button'); a2.className='btn-sm'; a2.textContent='Respond'; a2.addEventListener('click', ()=>{ const resp=prompt('Response'); if(resp){ t.responses=t.responses||[]; t.responses.push(resp); t.status='responded'; persist(); renderTickets(); } }); const a3=create('button'); a3.className='btn-sm'; a3.textContent='Close'; a3.addEventListener('click', ()=>{ t.status='closed'; persist(); renderTickets(); }); el.appendChild(a1); el.appendChild(a2); el.appendChild(a3); ticketsList.appendChild(el); }); }
  $('#newTicket').addEventListener('click', ()=>{ const s=prompt('Subject'); if(!s) return; const m=prompt('Message'); tickets.unshift({id:uid(), subject:s, message:m, status:'open'}); persist(); renderTickets(); });

  // Templates
  $('#tplVerify').value = templates.verify; $('#tplReg').value = templates.reg; $('#tplPay').value = templates.pay;
  $('#saveTemplates').addEventListener('click', ()=>{ templates.verify = $('#tplVerify').value; templates.reg = $('#tplReg').value; templates.pay = $('#tplPay').value; save(LS_KEYS.TPL, templates); alert('Saved'); });

  // export helper
  function exportCSV(arr, name){ if(!arr || !arr.length){ alert('No items to export'); return; } const keys = Object.keys(arr[0]); const csv = [keys.join(',')].concat(arr.map(r=> keys.map(k=> JSON.stringify(r[k]||'')).join(','))).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = create('a'); a.href = url; a.download = name+'.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  // persist everything
  function persist(){ save(LS_KEYS.EVENTS, events); save(LS_KEYS.REGS, regs); save(LS_KEYS.TICK, tickets); save(LS_KEYS.TPL, templates); save(LS_KEYS.USERS, users); updateRevenue(); }

  function updateRevenue(){ const rev = regs.reduce((s,r)=> s + (Number(r.amount)||0),0); $('#mRevenue').textContent = '₹'+rev; }

  // Charts (initialized later)
  let chartRegsPerEvent = null, chartRevenueByEvent = null, chartPaidFree = null;

  function initAnalyticsCharts(){
    // Registrations per event - bar
    const ctx1 = document.getElementById('chartRegsPerEvent');
    if(ctx1){ chartRegsPerEvent = new Chart(ctx1.getContext('2d'), { type:'bar', data:{labels:[], datasets:[{label:'Registrations', backgroundColor:'#d4af37', data:[]}]}, options:{responsive:true, maintainAspectRatio:false} }); }
    const ctx2 = document.getElementById('chartRevenueByEvent');
    if(ctx2){ chartRevenueByEvent = new Chart(ctx2.getContext('2d'), { type:'bar', data:{labels:[], datasets:[{label:'Revenue', backgroundColor:'#4caf50', data:[]}]}, options:{responsive:true, maintainAspectRatio:false} }); }
    const ctx3 = document.getElementById('chartPaidFree');
    if(ctx3){ chartPaidFree = new Chart(ctx3.getContext('2d'), { type:'doughnut', data:{labels:['Paid','Free'], datasets:[{data:[0,0], backgroundColor:['#d4af37','#777']}]}, options:{responsive:true, maintainAspectRatio:false} }); }
    updateAnalyticsCharts();
  }

  function updateAnalyticsCharts(){
    // compute counts per event and revenue per event
    const counts = {};
    const revenue = {};
    events.forEach(ev=>{ counts[ev.title]=0; revenue[ev.title]=0; });
    regs.forEach(r=>{ if(!r.event) return; counts[r.event] = (counts[r.event]||0)+1; revenue[r.event] = (revenue[r.event]||0) + (Number(r.amount)||0); });

    const labels = Object.keys(counts);
    const dataCounts = labels.map(l=> counts[l]||0);
    const dataRevenue = labels.map(l=> revenue[l]||0);

    if(chartRegsPerEvent){ chartRegsPerEvent.data.labels = labels; chartRegsPerEvent.data.datasets[0].data = dataCounts; chartRegsPerEvent.update(); }
    if(chartRevenueByEvent){ chartRevenueByEvent.data.labels = labels; chartRevenueByEvent.data.datasets[0].data = dataRevenue; chartRevenueByEvent.update(); }

    // Paid vs Free
    const paid = regs.reduce((s,r)=> s + ((Number(r.amount)||0) > 0 ? 1 : 0), 0);
    const free = regs.length - paid;
    if(chartPaidFree){ chartPaidFree.data.datasets[0].data = [paid, free]; chartPaidFree.update(); }
  }

  // initial render
  function renderAll(){ renderEvents($('#searchEvent').value||''); renderRegs($('#searchReg').value||''); renderTickets(); renderUsers($('#searchUser') ? $('#searchUser').value||'' : ''); updateRevenue(); setTimeout(()=>{ initAnalyticsCharts(); }, 80); }
  renderAll();

  // quick sample population if regs empty
  if(regs.length===0){ regs.push({id:uid(), name:'Alice', event:events[0].title, amount:200, status:'paid', docApproved:true}); regs.push({id:uid(), name:'Bob', event:events[1].title, amount:0, status:'registered', docApproved:false}); persist(); renderAll(); }

})();
