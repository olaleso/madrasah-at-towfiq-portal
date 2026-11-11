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
    if(!cls)throw Error('Unknown class "'+obj.class_name+'" on row '+obj.source_row+'. Create the class first or leave class_name blank.');
    obj.class_id=cls.id;
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
   '<span>'+items.filter(x=>x.errors.length).length+' blocked</span>'+
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
   confirm=$('legacy-confirm-phrase'),commit=$('legacy-commit-button');
  if(!file||!previewButton||!list||!commit)return;
  let rows=[],response=null,hash='',filename='';
  templateButton?.addEventListener('click',downloadTemplate);
  const update=()=>{
   const chosen=[...document.querySelectorAll('.legacy-select:checked')].length;
   commit.disabled=!(response&&chosen>0&&confirm.value==='IMPORT LEGACY STUDENTS');
   $('legacy-selected-count').textContent=chosen+' student'+(chosen===1?'':'s')+' selected for import';
  };
  confirm.addEventListener('input',update);
  list.addEventListener('change',event=>{if(event.target.classList.contains('legacy-select'))update();});
  previewButton.addEventListener('click',async()=>{
   const chosen=file.files?.[0];if(!chosen){toast('Select a CSV import file first',true);return;}
   if(chosen.size>350000)throw Error('CSV file is too large (limit 350 KB)');
   previewButton.disabled=true;commit.disabled=true;response=null;
   $('legacy-file-status').textContent='Validating the file and checking possible duplicates…';
   try{
    const contents=await chosen.text();
    rows=buildRows(contents,classes);
    if(rows.length<1)throw Error('No students found');
    hash=await sha256(contents);filename=chosen.name;
    response=await post('/legacy-students/preview',{source_hash:hash,filename,items:rows});
    list.innerHTML=previewTable(response.items);
    $('legacy-confirm-panel').hidden=false;
    $('legacy-file-status').textContent='Preview complete. Inspect blocked rows before confirming; no database changes have been made.';
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
     source_hash:hash,filename,items:selected,confirmation:'IMPORT LEGACY STUDENTS'});
    $('legacy-file-status').textContent=outcome.created+' student(s) imported successfully; '+outcome.already_imported+' previously imported. No parent invitations were sent.';
    toast('Imported '+outcome.created+' legacy students');
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
