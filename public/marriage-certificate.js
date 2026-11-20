/* Masjid At-Towfiq Nikah certificate renderer.
   Only admins can access the approved background. Private names and dates
   remain in browser memory, never uploaded or stored in D1. */
(()=>{
 'use strict';
 const W=1535,H=1024;
 let base=null,canvas=null,form=null,ready=false,downloadReady=false;
 let apiFn=null,postFn=null,toastFn=null,confirmDialogFn=null;
 let saveRequestKey=null,lastSavedId=null,archiveSequence=0,archiveSearchTimer=null;
 const $=id=>document.getElementById(id);
 const text=(s,max=160)=>String(s||'').trim().slice(0,max);
 function message(value,error=false){
  const node=$('marriage-cert-status');if(!node)return;
  node.textContent=value;node.hidden=!value;node.dataset.error=error?'true':'false';
 }
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&
  new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 const toUK=d=>validDate(d)?d.split('-').reverse().join(' / '):'';
 function record(){
  const f=new FormData(form),get=name=>text(f.get(name));
  return {groom:get('groom'),bride:get('bride'),
   witness1:get('witness1'),witness2:get('witness2'),imam:get('imam'),
   nikahDate:get('nikahDate'),mahr:get('mahr'),issueDate:get('issueDate')};
 }
 function scriptName(ctx,name,x1,y1,x2,y2){
  if(!name)return;
  ctx.save();ctx.beginPath();ctx.rect(x1,y1,x2-x1,y2-y1);ctx.clip();
  const loaded=document.fonts&&document.fonts.check('38px "Great Vibes"');
  const font=loaded?'"Great Vibes"':'"Segoe Script","URW Chancery L","Apple Chancery",cursive';
  let size=38;
  while(size>21){
   ctx.font=size+'px '+font;
   if(ctx.measureText(name).width<x2-x1-40)break;
   size--;
  }
  ctx.fillStyle='#052c67';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(198,144,38,.17)';ctx.shadowBlur=1.2;
  ctx.fillText(name,(x1+x2)/2,(y1+y2)/2+1,x2-x1-28);
  ctx.restore();
 }
 function formal(ctx,value,x,y,maxWidth=760,fontSize=20){
  if(!value)return;
  ctx.save();ctx.fillStyle='#091f47';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='600 '+fontSize+'px Georgia,"Times New Roman",serif';
  ctx.fillText(value,x,y,maxWidth);ctx.restore();
 }
 async function loadImage(url){
  return new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>image.naturalWidth?resolve(image):reject(Error('Empty certificate image'));
   image.onerror=()=>reject(Error('Could not load the approved certificate template'));image.src=url;
  });
 }
 async function draw(){
  if(!base||!canvas)return;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.clearRect(0,0,W,H);ctx.drawImage(base,0,0,W,H);
  const r=record();
  // Blank field bounds of approved 1535×1024 v4 artwork. Witnesses
  // have name fields only; NO third "imam" row exists beside them.
  scriptName(ctx,r.groom,436,403,1442,444);
  scriptName(ctx,r.bride,436,451,1442,493);
  formal(ctx,toUK(r.nikahDate),594,524,318,19);
  formal(ctx,r.mahr,945,574,976,19);
  scriptName(ctx,r.witness1,440,625,1442,665);
  scriptName(ctx,r.witness2,440,674,1442,715);
  // The officiating imam is identified in the EXISTING footer labelled
  // "Authorised Imam / Officiating Registrar" – not in a new table field.
  // Place their printed name above the existing footer line.
  scriptName(ctx,r.imam,182,811,539,851);
  formal(ctx,toUK(r.issueDate),1177,825,350,19);
 }
 function setDownloads(enabled){
  downloadReady=enabled;
  for(const id of ['marriage-download-png','marriage-download-pdf']){const node=$(id);if(node)node.disabled=!enabled;}
  const save=$('marriage-save-certificate');
  if(save)save.disabled=!enabled||!!lastSavedId;
 }
 function filename(ext){
  const r=record(),slug=s=>text(s,60).replace(/[^a-zA-Z0-9 ]/g,'').trim().replace(/\s+/g,'-').slice(0,45)||'Name';
  return 'At-Towfiq-Nikah-'+slug(r.groom)+'-'+slug(r.bride)+'-'+r.issueDate+'.'+ext;
 }
 function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 function decode(base64){
  const binary=atob(base64),out=new Uint8Array(binary.length);
  for(let i=0;i<out.length;i++)out[i]=binary.charCodeAt(i);
  return out;
 }
 function buildPdf(jpeg,width,height){
  // Single-page A4 landscape PDF embedding the full-quality JPEG canvas.
  const encoder=new TextEncoder(),parts=[];let length=0;const positions=[0];
  const append=data=>{const buffer=typeof data==='string'?encoder.encode(data):data;parts.push(buffer);length+=buffer.byteLength;};
  const obj=(n,value)=>{positions[n]=length;append(n+' 0 obj\n'+value+'\nendobj\n');};
  append('%PDF-1.4\n%At-Towfiq\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Cert 4 0 R >> >> /Contents 5 0 R >>');
  positions[4]=length;
  append('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+
   ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
  append(jpeg);append('\nendstream\nendobj\n');
  const scale=Math.min(825/width,579/height);
  const dw=(width*scale).toFixed(3),dh=(height*scale).toFixed(3),
   dx=((841.89-width*scale)/2).toFixed(3),dy=((595.28-height*scale)/2).toFixed(3);
  const instructions='q\n'+dw+' 0 0 '+dh+' '+dx+' '+dy+' cm\n/Cert Do\nQ\n';
  obj(5,'<< /Length '+encoder.encode(instructions).length+' >>\nstream\n'+instructions+'endstream');
  const xref=length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for(let i=1;i<=5;i++)append(String(positions[i]).padStart(10,'0')+' 00000 n \n');
  append('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  return new Blob(parts,{type:'application/pdf'});
 }
 async function png(){
  if(!downloadReady)return;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('Could not create the PNG image');
  downloadBlob(blob,filename('png'));
 }
 async function pdf(){
  if(!downloadReady)return;
  const data=canvas.toDataURL('image/jpeg',0.94);
  downloadBlob(buildPdf(decode(data.split(',')[1]),canvas.width,canvas.height),filename('pdf'));
 }
 function archiveEscape(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 }
 function archiveDate(value){
  if(!value)return '—';
  const parts=String(value).slice(0,10).split('-');
  return parts.length===3?parts.reverse().join(' / '):archiveEscape(value);
 }
 async function refreshArchive(){
  const list=$('marriage-archive-list');
  if(!list||!apiFn)return;
  const request=++archiveSequence;
  const q=$('marriage-archive-search')?.value?.trim()||'';
  try{
   const response=await apiFn('/masjid/marriage-certificates'+(q?'?q='+encodeURIComponent(q):''));
   if(request!==archiveSequence||!list.isConnected)return;
   const items=response.items||[];
   if(!items.length){
    list.innerHTML='<p class="small muted">No saved certificates match your search. Certificates appear here only after an administrator chooses Save certificate.</p>';return;
   }
   list.innerHTML='<div class="table-scroll"><table class="table"><thead><tr><th>Reference</th><th>Groom and bride</th><th>Nikah / issued</th><th>Saved</th><th>Actions</th></tr></thead><tbody>'+
    items.map(item=>'<tr><td><strong>'+archiveEscape(item.reference)+'</strong></td>'+
     '<td>'+archiveEscape(item.groom_name)+'<small class="marriage-archive-partner">and '+archiveEscape(item.bride_name)+'</small></td>'+
     '<td>'+archiveDate(item.nikah_date)+'<small class="marriage-archive-partner">Issued '+archiveDate(item.issue_date)+'</small></td>'+
     '<td>'+archiveDate(item.created_at)+'</td>'+
     '<td class="marriage-archive-actions"><a class="btn smol outline" href="/api/masjid/marriage-certificates/file?id='+encodeURIComponent(item.id)+'" download="'+archiveEscape(item.reference)+'.pdf">Download PDF</a>'+
     '<button type="button" class="btn smol white marriage-archive-delete" data-id="'+archiveEscape(item.id)+'" data-reference="'+archiveEscape(item.reference)+'">Delete copy</button></td></tr>').join('')+'</tbody></table></div><p class="small muted">Showing up to 100 latest records. Search by either name or certificate reference to find older records.</p>';
  }catch(e){
   if(request===archiveSequence&&list.isConnected)
    list.textContent='Could not load saved certificates: '+e.message;
  }
 }
 async function saveCertificate(){
  if(!downloadReady)throw Error('Generate the certificate before saving it');
  if(!$('marriage-retention-consent')?.checked)
   throw Error('Please confirm that the masjid is authorised to store this certificate');
  if(!form.reportValidity())throw Error('Complete the certificate details');
  const button=$('marriage-save-certificate');button.disabled=true;
  try{
   const details=record();
   const pdfImage=canvas.toDataURL('image/jpeg',0.94);
   const pdfBlob=buildPdf(decode(pdfImage.split(',')[1]),canvas.width,canvas.height);
   if(pdfBlob.size>3145728)throw Error('Generated PDF is larger than 3 MB. Please reduce the certificate image size.');
   if(!saveRequestKey)saveRequestKey=crypto.randomUUID();
   const payload=new FormData(form);
   payload.set('certificate',pdfBlob,filename('pdf'));
   payload.set('request_key',saveRequestKey);
   payload.set('retention_confirmed','YES');
   const result=await apiFn('/masjid/marriage-certificates',{method:'POST',body:payload});
   lastSavedId=result.id;
   $('marriage-retention-consent').checked=false;
   message('Certificate securely saved as '+result.reference+'. You can retrieve its PDF from Saved marriage certificates below.');
   toastFn(result.already_saved?'This certificate was already saved':'Certificate saved securely');
   await refreshArchive();
  }finally{button.disabled=!!lastSavedId||!downloadReady;}
 }
 async function deleteSavedCertificate(button){
  const certificateId=button.dataset.id,reference=button.dataset.reference;
  if(!confirmDialogFn)throw Error('Confirmation control is unavailable');
  const confirmed=await confirmDialogFn({
   title:'Permanently delete the saved PDF?',
   message:'Delete the retained marriage certificate '+reference+'?',
   details:'This removes the private PDF copy. The audit trail remains. The deleted document cannot be recovered from the portal.',
   actionLabel:'Delete saved copy',tone:'danger',requiredText:reference
  });
  if(!confirmed)return;
  button.disabled=true;
  try{
   await postFn('/masjid/marriage-certificates',
    {id:certificateId,reference,confirm:'DELETE_CERTIFICATE'},'DELETE');
   if(lastSavedId===certificateId){lastSavedId=null;saveRequestKey=null;setDownloads(false);}
   toastFn('Saved certificate copy deleted');
   await refreshArchive();
  }catch(err){message(err.message,true);}
  finally{button.disabled=false;}
 }
 async function optimise(file){
  if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Choose your approved PNG or JPEG certificate template');
  if(file.size>8*1024*1024)throw Error('Template image must be under 8 MB');
  const url=URL.createObjectURL(file);let img;
  try{img=await loadImage(url);}finally{URL.revokeObjectURL(url);}
  const ratio=img.naturalWidth/img.naturalHeight;
  if(ratio<1.45||ratio>1.55||img.naturalWidth<1200||img.naturalHeight<780)
   throw Error('Use the approved landscape At-Towfiq certificate (approximately 1535 × 1024)');
  const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;
  const c=tmp.getContext('2d',{alpha:false});c.fillStyle='white';c.fillRect(0,0,W,H);c.drawImage(img,0,0,W,H);
  for(const q of [.94,.91,.87,.83,.79]){
   const data=tmp.toDataURL('image/jpeg',q);
   if(data.length<1000000)return data;
  }
  throw Error('Template is too large. Use the optimised approved template JPG.');
 }
 async function upload(){
  const file=$('marriage-template-file')?.files?.[0],confirmed=$('marriage-template-confirm')?.checked;
  if(!file)throw Error('Select the approved certificate image first');
  if(!confirmed)throw Error('Confirm this is the approved Masjid At-Towfiq template');
  message('Preparing and saving the approved certificate artwork…');
  const image=await optimise(file);
  await postFn('/masjid/marriage-template',{image,confirmed:true},'PUT');
  base=await loadImage(image);ready=true;await draw();setDownloads(false);
  $('marriage-cert-canvas').hidden=false;$('marriage-canvas-placeholder').hidden=true;
  $('marriage-template-message').textContent='Approved certificate artwork saved and ready.';
  $('marriage-template-file').value='';$('marriage-template-confirm').checked=false;
  message('');toastFn('Approved certificate template saved');
 }
 async function mount({api,post,toast,confirmDialog}){
  apiFn=api;postFn=post;toastFn=toast;confirmDialogFn=confirmDialog;
  canvas=$('marriage-cert-canvas');form=$('marriage-cert-form');
  if(!canvas||!form)return;
  base=null;ready=false;lastSavedId=null;saveRequestKey=null;setDownloads(false);
  const changed=()=>{lastSavedId=null;saveRequestKey=null;setDownloads(false);if(ready)void draw();};
  form.addEventListener('input',changed);
  form.addEventListener('change',changed);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!ready){message('Upload the approved template before generating.',true);return;}
   if(!form.reportValidity())return;
   const r=record();
   if(!validDate(r.issueDate)||(r.nikahDate&&!validDate(r.nikahDate))){message('Check the date fields.',true);return;}
   try{
    if(document.fonts?.ready)await document.fonts.ready;
    await draw();setDownloads(true);
    message('Certificate ready. Download a copy, or confirm retention and save the PDF to the private archive.');
   }catch(err){message(err.message,true);}
  });
  $('marriage-download-png').addEventListener('click',()=>png().catch(e=>message(e.message,true)));
  $('marriage-download-pdf').addEventListener('click',()=>pdf().catch(e=>message(e.message,true)));
  $('marriage-save-certificate').addEventListener('click',async()=>{
   try{await saveCertificate();}catch(e){message(e.message,true);}
  });
  $('marriage-archive-refresh').addEventListener('click',()=>void refreshArchive());
  $('marriage-archive-search').addEventListener('input',()=>{
   clearTimeout(archiveSearchTimer);
   archiveSearchTimer=setTimeout(()=>void refreshArchive(),250);
  });
  $('marriage-archive-list').addEventListener('click',event=>{
   const button=event.target.closest('.marriage-archive-delete');
   if(button)void deleteSavedCertificate(button);
  });
  void refreshArchive();
  $('marriage-template-upload').addEventListener('click',async()=>{
   const button=$('marriage-template-upload');button.disabled=true;
   try{await upload();}catch(e){message(e.message,true);}finally{button.disabled=false;}
  });
  try{
   const response=await apiFn('/masjid/marriage-template');
   if(!response.configured||!response.image){
    $('marriage-template-message').textContent='Template update required: upload the approved certificate with two witness-name rows and the officiating imam identified in the existing footer. Previous certificate designs remain archived.';
    $('marriage-canvas-placeholder').hidden=false;canvas.hidden=true;return;
   }
   base=await loadImage(response.image);ready=true;
   canvas.hidden=false;$('marriage-canvas-placeholder').hidden=true;
   $('marriage-template-message').textContent='Approved certificate artwork is installed.';
   await draw();
   if(document.fonts?.load)document.fonts.load('38px "Great Vibes"').then(()=>{if(ready)void draw();}).catch(()=>{});
  }catch(err){message('Could not load the approved template: '+err.message,true);}
 }
 window.MasjidMarriageCertificate={mount,buildPdf};
})();
