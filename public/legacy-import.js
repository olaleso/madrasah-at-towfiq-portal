/* Admin-only legacy pupil CSV importer. Browser parsing is local; preview is
   validated again on server. Nothing is committed until typed confirmation. */
(()=>{
 'use strict';
 const required=['source_row','first_name','last_name','dob','gender','guardian_name',
  'guardian_email','guardian_phone','address','class_name','review_note'];
 const $=id=>document.getElementById(id);
 const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function parseCsv(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const output=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){
    if(c==='"'&&text[i+1]==='"'){value+='"';i++;}
    else if(c==='"')quoted=false;
    else value+=c;
   }else if(c==='"')quoted=true;
   else if(c===','){row.push(value);value='';}
   else if(c==='\n'){row.push(value.replace(/\r$/,''));output.push(row);row=[];value='';}
   else value+=c;
  }
  if(quoted)throw Error('CSV file contains an unfinished quoted field');
  if(value||row.length){row.push(value.replace(/\r$/,''));output.push(row);}
  return output;
 }
 function buildRows(text,classes){
  const grid=parseCsv(text);
  if(grid.length<2)throw Error('CSV has no student rows');
  const headers=grid.shift().map(x=>String(x).trim().toLowerCase().replace(/\s+/g,'_'));
  for(const col of required)if(!headers.includes(col))
   throw Error('CSV is missing the column '+col+'. Use the prepared legacy import CSV.');
  const seen=new Map();
  const mapped=grid.filter(r=>r.some(v=>String(v||'').trim())).map((cells,idx)=>{
   const obj={};
   headers.forEach((x,i)=>{obj[x]=String(cells[i]||'').trim();});
   obj.source_row=Number(obj.source_row);
   const className=String(obj.class_name||'').trim().toLocaleLowerCase('en-GB');
   if(className){
    const cls=classes.find(c=>c.name.trim().toLocaleLowerCase('en-GB')===className);
    if(cls)obj.class_id=cls.id;
    else{
     // Legacy class labels need not match current classes. Keep the pupil
     // enrolable and assign the correct class manually after import.
     obj.class_id='';
     obj.review_note=[obj.review_note,'Unmatched old class "'+obj.class_name+'": assign class after import'].filter(Boolean).join(' | ').slice(0,500);
    }
   }else obj.class_id='';
   delete obj.class_name;
   if(seen.has(obj.source_row))throw Error('Source row '+obj.source_row+' is duplicated in the CSV');
   seen.set(obj.source_row,idx);
   return obj;
  });
  if(mapped.length>100)throw Error('Maximum 100 student rows per upload; split the file into smaller batches');
  return mapped;
 }
 function templ(){
  return required.join(',')+'\r\n';
 }
 function downloadTemplate(){
  const blob=new Blob([templ()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='AtTowfiq_Legacy_Import_Template.csv';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function previewTable(items){
  const rows=items.map((x,i)=>{
   const ok=!x.errors.length&&!x.already_imported;
   const issues=[...x.errors,...x.warnings].filter(Boolean);
   return '<tr class="'+(x.errors.length?'legacy-row-blocked':'')+'">'+
    '<td><input type="checkbox" class="legacy-select" data-index="'+i+'" '+
      (ok?'checked':'disabled')+' aria-label="Include student on source row '+h(x.source_row)+'"></td>'+
    '<td><strong>'+h(x.name)+'</strong><small>Original row '+h(x.source_row)+'</small></td>'+
    '<td>'+ (x.already_imported?'<span class="tag blue">Already imported</span>':
       x.errors.length?'<span class="tag red">Needs review</span>':
       x.missing_count?'<span class="tag amber">Incomplete</span>':'<span class="tag green">Ready</span>')+
    '</td><td class="legacy-issues">'+(issues.length?issues.map(q=>'<div>'+h(q)+'</div>').join(''):'<span class="muted">No issues</span>')+'</td></tr>';
  }).join('');
  return '<div class="legacy-preview-counts"><span>'+items.length+' rows</span>'+
   '<span>'+items.filter(x=>x.errors.length&&!x.already_imported).length+' blocked</span>'+
   '<span>'+items.filter(x=>x.missing_count).length+' incomplete</span>'+
   '<span>'+items.filter(x=>x.already_imported).length+' previously imported</span></div>'+
   '<div class="table-scroll"><table class="table legacy-preview-table"><thead><tr><th>Include</th><th>Student</th><th>Status</th><th>Missing details / notes</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 }
 async function sha256(text){
  const value=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function mount({api,post,toast,navigate,classes=[]}){
  const file=$('legacy-upload-file'),previewButton=$('legacy-preview-button'),
   templateButton=$('legacy-template-button'),list=$('legacy-preview-results'),
   confirm=$('legacy-confirm-phrase'),commit=$('legacy-commit-button'),
   sendNotices=$('legacy-send-notices'),guardianVerified=$('legacy-guardian-verified'),
   restartNumbers=$('legacy-restart-numbers');
  if(!file||!previewButton||!list||!commit)return;
  let rows=[],response=null,hash='',filename='';
  templateButton?.addEventListener('click',downloadTemplate);
  api('/legacy-students/notices').then(info=>{
   const c=info.counts||{},total=Object.values(c).reduce((a,x)=>a+Number(x||0),0);
   const stats=$('legacy-delivery-stats');
   if(stats)stats.textContent=total?
     'Migration notices — '+Number(c.sent||0)+' sent; '+Number(c.pending||0)+' queued; '+
      Number(c.sending||0)+' sending; '+Number(c.failed||0)+' awaiting retry.':
     'No migration notices have been queued yet.';
  }).catch(()=>{const stats=$('legacy-delivery-stats');if(stats)stats.textContent='Notification delivery status unavailable';});
  // Family onboarding is deliberately separate from the historical import.
  // No child is linked merely because an email address is present in the CSV.
  const familyReview=$('legacy-family-review');
  const familyVerified=$('legacy-family-verified');
  const familyLink=$('legacy-link-families');
  const familySend=$('legacy-send-followups');
  const familyStatus=$('legacy-family-status');
  let families=[];
  const redrawFamilies=()=>{
   if(!familyReview)return;
   const groups=new Map();
   let withoutEmail=0;
   for(const item of families){
    const address=String(item.guardian_email||'').trim();
    if(!address){withoutEmail++;continue;}
    if(!groups.has(address))groups.set(address,[]);
    groups.get(address).push(item);
   }
   const rows=[...groups.entries()].map(([address,kids])=>{
    const names=[...new Set(kids.map(x=>String(x.guardian_name||'').trim().toLowerCase()).filter(Boolean))];
    const linked=kids.every(x=>x.parent_id&&x.parent_id===(x.account_id||''));
    const conflict=names.length!==1||kids.some(x=>x.parent_id&&x.parent_id!==x.account_id)||
      kids.some(x=>x.has_password&& !x.account_active);
    const queued=Boolean(kids[0].onboarding_status);
    const eligible=!conflict&&!queued&&!linked;
    const status=conflict?'Manual review':queued?'Follow-up '+kids[0].onboarding_status:
      linked?'Already linked':'Ready for verification';
    const children=kids.map(x=>h(x.first_name+' '+x.last_name+' ('+x.student_no+')')).join(', ');
    return '<tr><td><input type="checkbox" class="legacy-family-select" data-email="'+h(address)+
       '" '+(eligible?'':'disabled')+'></td><td><strong>'+h(kids[0].guardian_name||'Guardian name missing')+
       '</strong><small>'+h(address)+'</small></td><td>'+children+'</td><td>'+h(status)+'</td></tr>';
   }).join('');
   familyReview.innerHTML='<p class="small muted">'+groups.size+' guardian groups · '+withoutEmail+
     ' pupils missing guardian email. Confirm any group marked manual review before proceeding.</p>'+
     '<div class="table-scroll"><table class="table"><thead><tr><th>Select</th><th>Guardian</th><th>Imported children</th><th>Status</th></tr></thead><tbody>'+
      rows+'</tbody></table></div>';
   if(familyLink)familyLink.disabled=true;
   if(familyVerified)familyVerified.checked=false;
  };
  const loadFamilies=async()=>{
   if(!familyReview)return;
   try{const result=await api('/legacy-students/families');families=result.items||[];redrawFamilies();}
   catch(e){familyReview.textContent='Could not load family groups: '+e.message;}
  };
  const updateFamilySelection=()=>{
   if(familyLink)familyLink.disabled=!(familyVerified?.checked&&
     familyReview?.querySelector('.legacy-family-select:checked'));
  };
  familyReview?.addEventListener('change',updateFamilySelection);
  familyVerified?.addEventListener('change',updateFamilySelection);
  familyLink?.addEventListener('click',async()=>{
   const emails=[...familyReview.querySelectorAll('.legacy-family-select:checked')].map(x=>x.dataset.email);
   if(!emails.length||!familyVerified?.checked)return;
   if(!window.confirm('Link '+emails.length+' verified guardian groups to their children and queue follow-up invitations? Only proceed if you have verified their identities and access rights.'))return;
   familyLink.disabled=true;
   try{
    const result=await post('/legacy-students/families/onboard',{
     emails,guardians_verified:true,confirmation:'LINK VERIFIED GUARDIANS'});
    const queued=result.results.filter(x=>x.status==='queued').length;
    const review=result.results.filter(x=>x.status==='review').length;
    familyStatus.textContent=queued+' family groups linked and queued; '+review+
     ' require manual review. Click Send queued follow-up invitations when ready.';
    await loadFamilies();
   }catch(e){toast(e.message,true);updateFamilySelection();}
  });
  familySend?.addEventListener('click',async()=>{
   if(!window.confirm('Send up to 10 queued or eligible failed family follow-up invitations now? Previously accepted follow-ups will not be resent.'))return;
   familySend.disabled=true;
   try{
    const result=await post('/legacy-students/families/send',{confirmation:'SEND FAMILY FOLLOWUPS'});
    familyStatus.textContent=result.accepted+' follow-up messages accepted by the email provider this run. More will be sent by the scheduled queue.';
    await loadFamilies();
   }catch(e){toast(e.message,true);}
   finally{familySend.disabled=false;}
  });
  loadFamilies();
  const update=()=>{
   const selected=[...document.querySelectorAll('.legacy-select:checked')].map(el=>rows[Number(el.dataset.index)]);
   const chosen=selected.length;
   const isValidAddress=x=>x.length<=254&&!x.includes(' ')&&x.includes('@')&&x.lastIndexOf('.')>x.indexOf('@')+1;
   const emails=new Set(selected.map(x=>String(x?.guardian_email||'').toLowerCase().trim()).filter(isValidAddress));
   const notifying=sendNotices?.checked===true;
   if(guardianVerified)guardianVerified.disabled=!notifying;
   commit.disabled=!(response&&chosen>0&&confirm.value==='IMPORT LEGACY STUDENTS'&&
     (!notifying||guardianVerified?.checked===true));
   $('legacy-selected-count').textContent=chosen+' student'+(chosen===1?'':'s')+' selected for import';
   const line=$('legacy-mail-queue-status');
   if(line)line.textContent=notifying?
     emails.size+' unique eligible guardian address'+(emails.size===1?'':'es')+
      ' in selected rows. Confirm addresses are verified to enable automatic notices.':
     'Guardian notices are disabled for this import.';
  };
  confirm.addEventListener('input',update);
  sendNotices?.addEventListener('change',()=>{if(!sendNotices.checked&&guardianVerified)guardianVerified.checked=false;update();});
  guardianVerified?.addEventListener('change',update);
  list.addEventListener('change',event=>{if(event.target.classList.contains('legacy-select'))update();});
  previewButton.addEventListener('click',async()=>{
   const chosen=file.files?.[0];if(!chosen){toast('Select a CSV import file first',true);return;}
   previewButton.disabled=true;commit.disabled=true;response=null;
   $('legacy-file-status').textContent='Validating the file and checking possible duplicates…';
   try{
    if(chosen.size>350000)throw Error('CSV file is too large (limit 350 KB)');
    const contents=await chosen.text();
    rows=buildRows(contents,classes);
    if(rows.length<1)throw Error('No students found');
    hash=await sha256(contents);filename=chosen.name;
    response=await post('/legacy-students/preview',{source_hash:hash,filename,items:rows});
    list.innerHTML=previewTable(response.items);
    $('legacy-confirm-panel').hidden=false;
    $('legacy-file-status').textContent='Preview complete. Unknown or invalid DOBs are left blank and flagged for later correction. Check any genuinely blocked identities/duplicates before confirming; nothing has been imported yet.';
    update();
   }catch(e){
    rows=[];response=null;list.textContent='';
    $('legacy-confirm-panel').hidden=true;
    $('legacy-file-status').textContent=e.message;
    toast(e.message,true);
   }finally{previewButton.disabled=false;}
  });
  commit.addEventListener('click',async()=>{
   if(!response||confirm.value!=='IMPORT LEGACY STUDENTS')return;
   const selected=[...document.querySelectorAll('.legacy-select:checked')].map(el=>rows[Number(el.dataset.index)]);
   if(!selected.length){toast('Select at least one validated student',true);return;}
   commit.disabled=true;previewButton.disabled=true;
   try{
    const outcome=await post('/legacy-students/commit',{
     source_hash:hash,filename,items:selected,confirmation:'IMPORT LEGACY STUDENTS',
     notify_guardians:sendNotices?.checked===true,
     guardian_contacts_verified:guardianVerified?.checked===true,
     start_first_cohort_at_one:restartNumbers?.checked===true});
    $('legacy-file-status').textContent=outcome.created+' student(s) imported successfully; '+
     outcome.already_imported+' previously imported. '+Number(outcome.notices_queued||0)+
     ' guardian migration notification(s) queued for delivery. No parent invitations were sent.';
    toast('Imported '+outcome.created+' legacy students. First registration: '+
     (outcome.first_registration_number||'allocated automatically')+
     '. Queued '+Number(outcome.notices_queued||0)+' family notice(s)');
    rows=[];response=null;confirm.value='';file.value='';list.textContent='';
    $('legacy-confirm-panel').hidden=true;
    await navigate('legacy');
   }catch(e){
    toast('Import not completed: '+e.message,true);
    $('legacy-file-status').textContent=e.message;
    update();
   }finally{previewButton.disabled=false;}
  });
 }
 window.MadrasahLegacyImport={mount,parseCsv,buildRows};
})();
