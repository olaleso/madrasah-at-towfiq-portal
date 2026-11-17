/* Family billing UI. Access is controlled by server endpoints; this only
   presents the already-scoped fee records returned for the signed-in user. */
(()=>{
 'use strict';
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const money=p=>'£'+(Number(p||0)/100).toFixed(2);
 const date=x=>x?new Date(x+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
 const month=x=>/^[0-9]{4}-[0-9]{2}$/.test(x)?new Date(x+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):safe(x);
 let state=null;
 const $=(sel,root=document)=>root.querySelector(sel);
 const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
 const sum=(groups,key)=>groups.reduce((a,g)=>a+Number(g[key]||0),0);
 function familyCard(group,index,payments,familyPayments,canManage){
  const balance=Number(group.balance_pence||0),paid=Number(group.paid_pence||0);
  const invoiceIds=new Set(group.lines.map(x=>x.invoice_id));
  const history=[...familyPayments.filter(x=>x.family_invoice_id===group.family_invoice_id).map(x=>({...x,first_name:'Family payment',last_name:''})),...payments.filter(x=>invoiceIds.has(x.invoice_id)&&!x.family_batch_id)].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  const status=!balance?'Paid':paid?'Part paid':'Outstanding';
  const lines=group.lines.map(x=>`<tr><td><strong>${safe(x.student_name)}</strong><small>${safe(x.student_no)}</small></td><td>${money(x.amount_pence)}</td><td>${money(x.paid_pence)}</td><td><strong>${money(x.balance_pence)}</strong></td></tr>`).join('');
  return `<details class="family-bill" data-family-row data-family-index="${index}" data-search="${safe([group.guardian_name,group.guardian_email,group.period,group.invoice_number,group.lines.map(x=>x.student_name+' '+x.student_no).join(' ')].join(' ').toLowerCase())}">
   <summary class="family-bill-head">
     <div><strong>${safe(group.guardian_name)}</strong><small>${safe(group.guardian_email||'No linked guardian address')} · ${safe(month(group.period))} · ${group.lines.length} student${group.lines.length===1?'':'s'}</small></div>
     <div class="family-bill-total"><strong>${money(balance)}</strong><span class="family-bill-status ${balance?'outstanding':'paid'}">${status}</span></div>
   </summary>
   <div class="family-bill-body">
     <p class="family-bill-ref">${group.formal?'Family invoice '+safe(group.invoice_number):'Historical family statement (student invoices retained)'}
      ${group.requires_review?'<span class="family-review">Guardian review required</span>':''}</p>
     <div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Charge</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>${lines}</tbody></table></div>
     <div class="family-bill-foot"><span>Family charges <b>${money(group.total_pence)}</b></span><span>Paid <b>${money(group.paid_pence)}</b></span><span>Balance <b>${money(group.balance_pence)}</b></span><span>Due ${date(group.due_date)}</span></div>
     <div class="family-bill-actions">
       <button type="button" class="btn smol outline" data-family-action="pdf" data-index="${index}">Download PDF</button>
       ${canManage&&group.formal&&!group.requires_review&&balance?`<button type="button" class="btn smol primary" data-family-action="pay" data-index="${index}">Record family payment</button>
        <button type="button" class="btn smol white" data-family-action="remind" data-index="${index}">Email family statement</button>`:''}
       ${canManage&&!group.formal?'<span class="small muted">Existing charges are grouped for display; no new invoice has been issued.</span>':''}
     </div>
     <div class="family-pay-panel" data-family-pay-panel="${index}" hidden>
       <form class="family-payment-form" data-family-payment="${index}">
       <div class="form-grid">
        <div class="field"><label>Amount received (£)</label><input name="amount" required type="number" step="0.01" min="0.01" max="${(balance/100).toFixed(2)}" value="${(balance/100).toFixed(2)}"></div>
        <div class="field"><label>Payment method</label><select name="method"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="card_external">Card (externally processed)</option><option value="other">Other</option></select></div>
        <div class="field wide"><label>Receipt / transaction reference</label><input name="reference" maxlength="120" placeholder="Optional payment reference"></div>
       </div>
       <p class="small muted">The payment is allocated to this family's oldest unpaid student charges first. It will not exceed the combined outstanding amount.</p>
       <button class="btn primary" type="submit">Confirm family payment</button>
       </form>
     </div>
     ${history.length?`<details class="family-pay-history"><summary>Payment history (${history.length} entries)</summary><div class="table-scroll"><table class="table"><thead><tr><th>Date</th><th>Student</th><th>Method</th><th>Amount</th></tr></thead><tbody>${history.map(x=>`<tr><td>${date(String(x.created_at||'').slice(0,10))}</td><td>${safe(x.first_name)} ${safe(x.last_name)}</td><td>${safe(x.method)}</td><td>${money(x.amount_pence)}</td></tr>`).join('')}</tbody></table></div></details>`:''}
   </div>
  </details>`;
 }
 function html({groups=[],eligible=[],payments=[],familyPayments=[],queue=[],canManage=false}){
  const queued=queue.reduce((n,x)=>['pending','failed'].includes(x.status)?n+Number(x.total||0):n,0);
  const sorted=[...groups].sort((a,b)=>String(b.period).localeCompare(String(a.period))||String(a.guardian_name).localeCompare(String(b.guardian_name)));
  const verified=eligible.filter(x=>x.eligible);
  const oneOptions=verified.map(g=>`<option value="${safe(g.guardian_id)}">${safe(g.guardian_name)} · ${g.children.length} child${g.children.length===1?'':'ren'}</option>`).join('');
  const choices=verified.map(g=>`<label class="family-choice"><input type="checkbox" name="guardian_ids" value="${safe(g.guardian_id)}"><span><strong>${safe(g.guardian_name)}</strong><small>${safe(g.children.map(c=>c.name).join(', '))}</small></span></label>`).join('');
  const selected=verified[0]||null;
  const perChild=selected?selected.children.map(c=>`<label class="family-child-price"><span>${safe(c.name)}<small>${safe(c.student_no)}</small></span><input name="student_fee" data-student-id="${safe(c.id)}" type="number" min="0" max="100000" step="0.01" value="30.00" aria-label="Fee for ${safe(c.name)}"></label>`).join(''):'';
  return `<section class="surface family-billing" id="family-billing">
   <div class="surface-head"><div><h3>Family billing &amp; statements</h3><p class="small muted" style="margin-top:6px">One family summary per guardian and billing month, with every child's charges and payments preserved.</p></div>
    ${canManage?`<button class="btn primary" type="button" data-family-action="toggle-issue">Create family invoices</button>`:''}
   </div>
   <div class="family-billing-metrics"><div><small>Family statements</small><strong>${sorted.length}</strong></div><div><small>Total charges</small><strong>${money(sum(sorted,'total_pence'))}</strong></div><div><small>Recorded payments</small><strong>${money(sum(sorted,'paid_pence'))}</strong></div><div><small>Outstanding</small><strong>${money(sum(sorted,'balance_pence'))}</strong></div></div>
   ${canManage?`<div class="family-billing-actions"><button class="btn smol white" type="button" data-family-action="send">Send pending family invoice emails${queued?' ('+queued+')':''}</button><span class="small muted">${verified.length} verified billing families available · Unverified and unlinked guardians need review</span></div>
    <div class="family-issue-panel" id="family-issue-panel" hidden>
     <h3>Issue monthly family invoices</h3><p class="small muted">Existing invoices for the selected month are reused. A family receives one consolidated email once issued. New families must have an activated guardian account.</p>
     ${verified.length?`<form id="family-issue-form"><div class="form-grid">
       <div class="field"><label>Who to invoice</label><select name="mode"><option value="one">One family</option><option value="selected">Selected families</option><option value="all">All verified families</option></select></div>
       <div class="field"><label>Billing month</label><input name="period" type="month" required value="${new Date().toLocaleDateString('en-CA',{timeZone:'Europe/London'}).slice(0,7)}"></div>
       <div class="field"><label>Default amount per child (£)</label><input name="amount" type="number" min="0.01" step="0.01" value="30.00" required></div>
       <div class="field"><label>Payment due</label><input name="due_date" type="date" required value="${new Date(Date.now()+14*86400000).toISOString().slice(0,10)}"></div>
       <div class="field wide" data-family-mode="one"><label>Billing guardian</label><select name="guardian_id">${oneOptions}</select></div>
       <div class="field wide" data-family-mode="selected" hidden><label>Choose families</label><div class="family-choice-list">${choices}</div></div>
       <div class="field wide" data-family-mode="all" hidden><div class="notice">All ${verified.length} verified families will be considered. Existing student charges for the month will not be duplicated.</div></div>
       <div class="field wide" data-family-mode="one"><label>Adjust individual student fees (optional)</label><div id="family-child-fees">${perChild}</div></div>
      </div><div class="family-form-actions"><button class="btn primary" type="submit">Issue family invoices</button></div></form>`:'<p class="muted">No activated, linked guardian accounts are available for family billing.</p>'}
    </div>`:''}
   ${sorted.length?`<div class="family-filter"><input id="family-billing-search" type="search" autocomplete="off" placeholder="Search guardian, student, registration or invoice" aria-label="Search family fee statements"><span id="family-billing-count">${sorted.length} families shown</span></div>
     <div class="family-bill-list">${sorted.map((g,i)=>familyCard(g,i,payments,familyPayments,canManage)).join('')}</div>`:'<p class="muted" style="padding:20px 0">No family fee records yet. Existing student invoices will appear here grouped automatically.</p>'}
   </section>`;
 }
 function updateMode(root){
  const form=$('#family-issue-form',root);if(!form)return;
  const mode=form.elements.mode.value;
  for(const el of $$('[data-family-mode]',form))el.hidden=el.dataset.familyMode!==mode;
  updateChildren(root);
 }
 function updateChildren(root){
  const form=$('#family-issue-form',root);if(!form||form.elements.mode.value!=='one')return;
  const parent=state.eligible.find(x=>x.guardian_id===form.elements.guardian_id.value);
  const base=Number(form.elements.amount.value||30).toFixed(2);
  const box=$('#family-child-fees',root);
  box.innerHTML=(parent?.children||[]).map(c=>`<label class="family-child-price"><span>${safe(c.name)}<small>${safe(c.student_no)}</small></span>
   <input name="student_fee" data-student-id="${safe(c.id)}" type="number" min="0" max="100000" step="0.01" value="${base}" aria-label="Fee for ${safe(c.name)}"></label>`).join('');
 }
 async function mount(context){
  const root=$('#family-billing');if(!root)return;
  state={...context,groups:[...context.groups].sort((a,b)=>String(b.period).localeCompare(String(a.period))||String(a.guardian_name).localeCompare(String(b.guardian_name))),root};
  root.addEventListener('change',e=>{
   if(e.target.name==='mode'||e.target.name==='guardian_id')updateMode(root);
   if(e.target.name==='amount'&&e.target.closest('#family-issue-form'))updateChildren(root);
  });
  root.addEventListener('input',e=>{
   if(e.target.id!=='family-billing-search')return;
   const query=e.target.value.trim().toLocaleLowerCase();let visible=0;
   for(const row of $$('[data-family-row]',root)){
    const found=(row.dataset.search||'').includes(query);
    row.hidden=!found;if(found)visible++;
   }
   const count=$('#family-billing-count',root);if(count)count.textContent=visible+' of '+state.groups.length+' families shown';
  });
  root.addEventListener('click',async e=>{
   const button=e.target.closest('[data-family-action]');if(!button)return;
   const action=button.dataset.familyAction;
   const group=state.groups[Number(button.dataset.index)];
   try{
    if(action==='toggle-issue'){const panel=$('#family-issue-panel',root);panel.hidden=!panel.hidden;return;}
    if(action==='pdf'){await window.MadrasahFamilyInvoicePdf.download(group);return;}
    if(action==='pay'){
     const panel=$('[data-family-pay-panel="'+button.dataset.index+'"]',root);
     if(panel)panel.hidden=!panel.hidden;return;
    }
    if(action==='remind'){
     if(!group?.formal||group.requires_review||!group.balance_pence)return;
     const confirmed=await state.confirmDialog({title:'Send consolidated family statement?',message:'Email '+group.guardian_name+' about the '+month(group.period)+' family balance?',details:'One email will list the children and their individual charges. It does not initiate a payment.',actionLabel:'Email family statement'});
     if(!confirmed)return;
     button.disabled=true;
     const result=await state.post('/fees/families/notify',{family_invoice_id:group.family_invoice_id,confirm:'SEND_FAMILY_STATEMENT'});
     state.toast(result.notification_status==='sent'?'Family statement accepted by email provider':result.notification_status==='already_paid'?'Family balance has been settled':'Email not accepted. Review the email log.',result.notification_status!=='sent');
     return;
    }
    if(action==='send'){
     const ok=await state.confirmDialog({title:'Send pending family invoice emails?',message:'Send up to six queued or eligible failed family invoice emails now?',details:'Already accepted emails are excluded and delivery is rate limited. More queued emails are processed by the scheduled job.',actionLabel:'Send family invoices'});
     if(!ok)return;
     button.disabled=true;
     const result=await state.post('/fees/families/send',{confirm:'SEND_FAMILY_INVOICES'});
     state.toast(result.accepted+' family invoice emails accepted. Remaining queue can be sent later.');
     await state.navigate('fees');return;
    }
   }catch(err){state.toast(err.message,true);}
   finally{button.disabled=false;}
  });
  root.addEventListener('submit',async e=>{
   if(e.target.id==='family-issue-form'){
    e.preventDefault();const form=e.target,mode=form.elements.mode.value;
    const selected=mode==='selected'?$$('input[name="guardian_ids"]:checked',form).map(el=>el.value):[];
    const guardian_id=form.elements.guardian_id.value;
    const list=mode==='all'?state.eligible.filter(x=>x.eligible):
     mode==='one'?state.eligible.filter(x=>x.guardian_id===guardian_id):state.eligible.filter(x=>selected.includes(x.guardian_id));
    const amount_pence=Math.round(Number(form.elements.amount.value)*100);
    if(!list.length){state.toast('Choose at least one verified guardian',true);return;}
    const student_amounts={};
    if(mode==='one')for(const el of $$('input[name="student_fee"]',form))
     student_amounts[el.dataset.studentId]=Math.round(Number(el.value)*100);
    const people=list.reduce((total,x)=>total+x.children.length,0);
    const confirm=await state.confirmDialog({title:'Issue family invoices?',message:'Issue '+list.length+' family invoice(s) for '+people+' enrolled children?',details:'Default charge '+money(amount_pence)+' per child, with any approved individual adjustments. Existing charges will not be duplicated. Sending the consolidated emails is a separate step.',actionLabel:'Issue family invoices',tone:'warning'});
    if(!confirm)return;
    const submit=$('button[type="submit"]',form);submit.disabled=true;
    try{
     const result=await state.post('/fees/families/issue',{mode,guardian_id,guardian_ids:selected,
      amount_pence,student_amounts,period:form.elements.period.value,due_date:form.elements.due_date.value,
      confirm:'ISSUE_FAMILY_INVOICES'});
     state.toast('Family billing saved: '+result.families+' families, '+result.created+' new student charges; '+result.skipped+' existing charges reused. Send pending family emails when ready.');
     await state.navigate('fees');
    }catch(err){state.toast(err.message,true);submit.disabled=false;}
    return;
   }
   if(e.target.matches('.family-payment-form')){
    e.preventDefault();const form=e.target,index=Number(form.dataset.familyPayment);
    const group=state.groups[index];if(!group?.formal)return;
    const amount_pence=Math.round(Number(form.elements.amount.value)*100);
    if(amount_pence<1||amount_pence>group.balance_pence){state.toast('Payment exceeds the outstanding family balance',true);return;}
    const confirmed=await state.confirmDialog({title:'Record family payment?',message:'Record '+money(amount_pence)+' for '+group.guardian_name+'?',details:'This will allocate the payment to individual children’s oldest outstanding charges. The school ledger will be updated immediately.',actionLabel:'Record payment',tone:'warning'});
    if(!confirmed)return;
    const submit=$('button[type="submit"]',form);submit.disabled=true;
    if(!form.dataset.requestKey)form.dataset.requestKey=crypto.randomUUID();
    try{
     const result=await state.post('/fees/families/payments',{family_invoice_id:group.family_invoice_id,
      amount_pence,method:form.elements.method.value,reference:form.elements.reference.value,
      request_key:form.dataset.requestKey});
     state.toast(result.already_recorded?'Payment was already recorded (not duplicated).':
      result.notification_status==='sent'?'Family payment recorded · one receipt email accepted':'Family payment recorded · email receipt may need review.');
     await state.navigate('fees');
    }catch(err){state.toast(err.message,true);submit.disabled=false;}
   }
  });
 }
 window.MadrasahFamilyBilling={html,mount};
})();
