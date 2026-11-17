/* Madrasah At-Towfiq family invoice PDF.
   Runs entirely in the signed-in browser from a scoped API response:
   no third-party PDF service receives student or family data. */
(()=>{
 'use strict';
 const W=1240,H=1754,ROWS_PER_PAGE=9;
 const navy='#142e58',blue='#2b66ba',gold='#cda95e';
 const pounds=p=>'£'+(Number(p||0)/100).toFixed(2);
 const label=s=>String(s??'').slice(0,160);
 const ukDate=x=>x?new Date(x+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'—';
 const period=x=>/^[0-9]{4}-[0-9]{2}$/.test(x)?new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(x+'-01T12:00:00')):x;
 function rect(ctx,x,y,w,h,color){
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
 }
 function print(ctx,value,x,y,size=26,color=navy,weight='400',max=920){
  ctx.font=weight+' '+size+'px Arial, sans-serif';ctx.fillStyle=color;ctx.textBaseline='alphabetic';
  ctx.fillText(label(value),x,y,max);
 }
 function textRight(ctx,value,x,y,size=26,color=navy,weight='400'){
  ctx.save();ctx.textAlign='right';print(ctx,value,x,y,size,color,weight);ctx.restore();
 }
 function rounded(ctx,x,y,w,h,r,color){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
 }
 async function logoImage(){
  try{
   const image=new Image();image.src='/assets/at-towfiq-madrasah-logo.png';
   await image.decode();return image;
  }catch{return null;}
 }
 function pageCanvas(group,rows,page,count,logo){
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d',{alpha:false});
  rect(ctx,0,0,W,H,'#ffffff');rect(ctx,0,0,W,240,navy);
  rounded(ctx,68,46,194,140,12,'#ffffff');
  if(logo)ctx.drawImage(logo,80,52,171,128);
  print(ctx,'MADRASAH AT-TOWFIQ',290,100,39,'#ffffff','700');
  print(ctx,'24 Punch Street · Bolton BL3 5BJ',290,151,24,'#d6e5fa');
  print(ctx,'attowfiqmasjid.org',290,185,23,'#e5c58a');
  print(ctx,group.formal?'FAMILY INVOICE':'FAMILY FEE STATEMENT',68,333,42,navy,'700');
  print(ctx,label(group.invoice_number||'Existing student-ledger statement'),68,387,25,blue);
  textRight(ctx,'Page '+page+' of '+count,1170,389,22,'#6b7b94');
  rounded(ctx,68,432,1104,151,16,'#f0f5fb');
  print(ctx,'BILL TO',92,478,19,blue,'700');
  print(ctx,group.guardian_name||'Unlinked guardian',92,520,32,navy,'700',470);
  print(ctx,group.guardian_email||'Contact the madrasah to confirm guardian',92,554,22,'#63728b');
  print(ctx,'BILLING MONTH',710,478,19,blue,'700');
  print(ctx,period(group.period),710,520,29,navy,'700');
  print(ctx,'Due: '+ukDate(group.due_date),710,554,22,'#63728b');
  rect(ctx,68,635,1104,65,navy);
  print(ctx,'Student / registration',86,679,24,'#ffffff','700');
  textRight(ctx,'Charge',827,679,23,'#ffffff','700');
  textRight(ctx,'Paid',990,679,23,'#ffffff','700');
  textRight(ctx,'Outstanding',1149,679,23,'#ffffff','700');
  let y=742;
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   if(i%2===0)rect(ctx,68,y-33,1104,81,'#f3f7fc');
   print(ctx,row.student_name,90,y+2,26,navy,'700',470);
   print(ctx,row.student_no,90,y+31,19,'#657995');
   textRight(ctx,pounds(row.amount_pence),827,y+13,24);
   textRight(ctx,pounds(row.paid_pence),990,y+13,24);
   textRight(ctx,pounds(row.balance_pence),1149,y+13,24,row.balance_pence?'#a73c33':'#25805a','700');
   y+=88;
  }
  if(page===count){
   rect(ctx,700,1470,472,2,'#d9e4f2');
   textRight(ctx,'Total charges',981,1514,24,'#667c96');
   textRight(ctx,pounds(group.total_pence),1148,1514,27,navy,'700');
   textRight(ctx,'Total paid',981,1561,24,'#667c96');
   textRight(ctx,pounds(group.paid_pence),1148,1561,27,navy,'700');
   rounded(ctx,700,1590,472,78,12,'#eaf3fe');
   print(ctx,'FAMILY BALANCE',718,1638,21,navy,'700');
   textRight(ctx,pounds(group.balance_pence),1150,1641,33,blue,'700');
  }
  rect(ctx,68,1700,1104,1,'#d6e1ee');
  print(ctx,'School ledger statement · No online payment is processed by this document.',68,1728,19,'#667a96');
  return canvas;
 }
 function makePdf(jpegs){
  const encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
  function put(bytes){const arr=typeof bytes==='string'?encoder.encode(bytes):bytes;parts.push(arr);length+=arr.length;}
  function obj(n,body){offsets[n]=length;put(n+' 0 obj\n'+body+'\nendobj\n');}
  const n=jpegs.length;
  put('%PDF-1.4\n%At-Towfiq\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  const ids=jpegs.map((_,i)=>3+i*3);
  obj(2,'<< /Type /Pages /Kids ['+ids.map(i=>i+' 0 R').join(' ')+'] /Count '+n+' >>');
  for(let i=0;i<n;i++){
   const pageId=ids[i],imageId=pageId+1,contentId=pageId+2;
   obj(pageId,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Invoice '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>');
   const jpeg=jpegs[i];
   offsets[imageId]=length;
   put(imageId+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+W+' /Height '+H+
    ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
   put(jpeg);put('\nendstream\nendobj\n');
   const instructions='q\n595.28 0 0 841.89 0 0 cm\n/Invoice Do\nQ\n';
   obj(contentId,'<< /Length '+encoder.encode(instructions).length+' >>\nstream\n'+instructions+'endstream');
  }
  const at=length,total=2+3*n;
  put('xref\n0 '+(total+1)+'\n0000000000 65535 f \n');
  for(let j=1;j<=total;j++)put(String(offsets[j]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+at+'\n%%EOF');
  return new Blob(parts,{type:'application/pdf'});
 }
 function decodeBase64(base64){
  const raw=atob(base64),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
 }
 async function download(group){
  if(!group||!Array.isArray(group.lines)||!group.lines.length)throw Error('No family invoice details available');
  const count=Math.ceil(group.lines.length/ROWS_PER_PAGE),logo=await logoImage(),jpegs=[];
  for(let i=0;i<count;i++){
   const canvas=pageCanvas(group,group.lines.slice(i*ROWS_PER_PAGE,(i+1)*ROWS_PER_PAGE),i+1,count,logo);
   jpegs.push(decodeBase64(canvas.toDataURL('image/jpeg',0.89).split(',')[1]));
  }
  const blob=makePdf(jpegs),url=URL.createObjectURL(blob),link=document.createElement('a');
  const suffix=(group.invoice_number||'Statement-'+group.period).replace(/[^A-Za-z0-9-]/g,'-');
  link.href=url;link.download='At-Towfiq-'+suffix+'.pdf';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 window.MadrasahFamilyInvoicePdf={download};
})();
