/* Masjid At-Towfiq Nikah certificate renderer.
   Only admins can access the approved background. Private names and dates
   remain in browser memory, never uploaded or stored in D1. */
(()=>{
 'use strict';
 const W=1535,H=1024;
 let base=null,canvas=null,form=null,ready=false,downloadReady=false;
 let apiFn=null,postFn=null,toastFn=null;
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
  return {groom:get('groom'),bride:get('bride'),witness1:get('witness1'),
   witness2:get('witness2'),nikahDate:get('nikahDate'),mahr:get('mahr'),
   issueDate:get('issueDate')};
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
  // Exact blank-field bounds of the approved 1535×1024 bilingual image.
  // One beautifully calligraphed entry per person: no duplicated Arabic field.
  scriptName(ctx,r.groom,445,434,1439,473);
  scriptName(ctx,r.bride,445,478,1439,517);
  formal(ctx,toUK(r.nikahDate),594,549,303,19);
  formal(ctx,r.mahr,940,592,973,19);
  formal(ctx,r.witness1,638,697,350,20);
  formal(ctx,r.witness2,638,741,350,20);
  if(r.issueDate){
   ctx.save();ctx.fillStyle='#fff';ctx.fillRect(1163,934,226,39);ctx.restore();
   formal(ctx,toUK(r.issueDate),1276,952,215,19);
  }
 }
 function setDownloads(enabled){
  downloadReady=enabled;
  for(const id of ['marriage-download-png','marriage-download-pdf']){const node=$(id);if(node)node.disabled=!enabled;}
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
 async function mount({api,post,toast}){
  apiFn=api;postFn=post;toastFn=toast;
  canvas=$('marriage-cert-canvas');form=$('marriage-cert-form');
  if(!canvas||!form)return;
  base=null;ready=false;setDownloads(false);
  form.addEventListener('input',()=>{setDownloads(false);if(ready)void draw();});
  form.addEventListener('change',()=>{setDownloads(false);if(ready)void draw();});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!ready){message('Upload the approved template before generating.',true);return;}
   if(!form.reportValidity())return;
   const r=record();
   if(!validDate(r.issueDate)||(r.nikahDate&&!validDate(r.nikahDate))){message('Check the date fields.',true);return;}
   try{
    if(document.fonts?.ready)await document.fonts.ready;
    await draw();setDownloads(true);
    message('Certificate ready. Download the PNG image or A4 landscape PDF.');
   }catch(err){message(err.message,true);}
  });
  $('marriage-download-png').addEventListener('click',()=>png().catch(e=>message(e.message,true)));
  $('marriage-download-pdf').addEventListener('click',()=>pdf().catch(e=>message(e.message,true)));
  $('marriage-template-upload').addEventListener('click',async()=>{
   const button=$('marriage-template-upload');button.disabled=true;
   try{await upload();}catch(e){message(e.message,true);}finally{button.disabled=false;}
  });
  try{
   const response=await apiFn('/masjid/marriage-template');
   if(!response.configured||!response.image){
    $('marriage-template-message').textContent='One-time setup: upload the approved certificate artwork below.';
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
