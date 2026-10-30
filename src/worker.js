const ROLES = ['admin','staff','teacher','parent'];

const QURAN_SURAHS='Al-Fatihah|Al-Baqarah|Aal-Imran|An-Nisa|Al-Maidah|Al-Anam|Al-Araf|Al-Anfal|At-Tawbah|Yunus|Hud|Yusuf|Ar-Rad|Ibrahim|Al-Hijr|An-Nahl|Al-Isra|Al-Kahf|Maryam|Ta-Ha|Al-Anbiya|Al-Hajj|Al-Muminun|An-Nur|Al-Furqan|Ash-Shuara|An-Naml|Al-Qasas|Al-Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba|Fatir|Ya-Sin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Ash-Shura|Az-Zukhruf|Ad-Dukhan|Al-Jathiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Adh-Dhariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqiah|Al-Hadid|Al-Mujadilah|Al-Hashr|Al-Mumtahanah|As-Saff|Al-Jumuah|Al-Munafiqun|At-Taghabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Maarij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba|An-Naziat|Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Inshiqaq|Al-Buruj|At-Tariq|Al-Ala|Al-Ghashiyah|Al-Fajr|Al-Balad|Ash-Shams|Al-Layl|Ad-Duha|Ash-Sharh|At-Tin|Al-Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-Adiyat|Al-Qariah|At-Takathur|Al-Asr|Al-Humazah|Al-Fil|Quraysh|Al-Maun|Al-Kawthar|Al-Kafirun|An-Nasr|Al-Masad|Al-Ikhlas|Al-Falaq|An-Nas'.split('|');
const QURAN_VERSE_COUNTS=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
// Surah and ayah bounds use the standard 6236-verse (Kufan) numbering.
function checkQuranRange(b){
 const start=QURAN_SURAHS.indexOf(String(b.surah_from||''));
 const end=QURAN_SURAHS.indexOf(String(b.surah_to||''));
 if(start<0||end<0)error('Choose valid starting and ending Surahs');
 const firstVerse=Number(b.verse_from),lastVerse=Number(b.verse_to);
 if(!Number.isInteger(firstVerse)||firstVerse<1||firstVerse>QURAN_VERSE_COUNTS[start])
  error('From verse must be between 1 and '+QURAN_VERSE_COUNTS[start]+' for '+QURAN_SURAHS[start]);
 if(!Number.isInteger(lastVerse)||lastVerse<1||lastVerse>QURAN_VERSE_COUNTS[end])
  error('To verse must be between 1 and '+QURAN_VERSE_COUNTS[end]+' for '+QURAN_SURAHS[end]);
 if(end<start||(start===end&&lastVerse<firstVerse))
  error('Ending Surah/verse cannot come before starting Surah/verse');
}

const DAY = 86400;
const SESSION_AGE = 7 * DAY;
const iso = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const enc = new TextEncoder();
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a)));
const from64 = s => Uint8Array.from(atob(s), x=>x.charCodeAt(0));
const random = (size=32) => b64(crypto.getRandomValues(new Uint8Array(size))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function sha(str){return b64(await crypto.subtle.digest('SHA-256',enc.encode(str)));}
// Cloudflare Workers WebCrypto limits a single PBKDF2 derivation to 100,000 iterations.
// Prefix all new hashes with their scheme and iteration count. Older local-preview
// accounts used an unversioned 210,000-iteration hash; retain verification for them.
const PASSWORD_ROUNDS = 100000;
const LEGACY_PASSWORD_ROUNDS = 210000;
const PASSWORD_SCHEME = 'pbkdf2-sha256';
async function passwordDerive(pass,salt,rounds){
 const k=await crypto.subtle.importKey('raw',enc.encode(String(pass)), 'PBKDF2',false,['deriveBits']);
 return b64(await crypto.subtle.deriveBits({name:'PBKDF2',salt:from64(salt),iterations:rounds,hash:'SHA-256'},k,256));
}
async function passwordHash(pass,salt){
 return `${PASSWORD_SCHEME}:${PASSWORD_ROUNDS}:${await passwordDerive(pass,salt,PASSWORD_ROUNDS)}`;
}
async function verifyPassword(pass,salt,stored){
 const hash=String(stored||'');
 const parts=hash.split(':');
 const versioned=parts.length===3&&parts[0]===PASSWORD_SCHEME;
 const rounds=versioned?Number(parts[1]):LEGACY_PASSWORD_ROUNDS;
 const digest=versioned?parts[2]:hash;
 if(!digest||![PASSWORD_ROUNDS,LEGACY_PASSWORD_ROUNDS].includes(rounds))return false;
 try {return await safeEqual(await passwordDerive(pass,salt,rounds),digest);}
 catch(err){
  if(rounds===LEGACY_PASSWORD_ROUNDS && err?.name==='NotSupportedError')
   error('Legacy password cannot be verified on Cloudflare. Contact an administrator for a password reset.',409);
  throw err;
 }
}
async function safeEqual(a,b){const x=enc.encode(a||'');const y=enc.encode(b||'');let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++) d |= (x[i]||0)^(y[i]||0);return d===0;}
const short = (x,n=220)=>String(x??'').trim().slice(0,n);
const email = x=>short(x,254).toLowerCase();
const json = (body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
function error(message,status=400){throw Object.assign(new Error(message),{status});}
async function input(req){if(Number(req.headers.get('content-length')||0)>120000) error('Request too large',413);let b;try{b=await req.json();}catch{error('A valid JSON request is required');}if(typeof b!=='object'||!b||Array.isArray(b)) error('Invalid request body');return b;}
async function all(db,sql,...bind){return (await db.prepare(sql).bind(...bind).all()).results||[];}
async function first(db,sql,...bind){return db.prepare(sql).bind(...bind).first();}
async function run(db,sql,...bind){return db.prepare(sql).bind(...bind).run();}
const nowDate=()=>new Date().toISOString().slice(0,10);
// Absent notices use the local Bolton calendar day rather than UTC near midnight.
const schoolLocalDate=()=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const val=type=>parts.find(p=>p.type===type)?.value||'';
 return [val('year'),val('month'),val('day')].join('-');
};
const nextIso=(seconds)=>new Date(Date.now()+seconds*1000).toISOString();
const isDate = s=> /^\d{4}-\d{2}-\d{2}$/.test(String(s||'')) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));
const isDbsDate = date=>isDate(date)&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
const isMoney = x=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=100000000;
function requireRole(user,...roles){if(!roles.includes(user.role)) error('You do not have permission to perform this action',403);}
function consented(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)error('Invalid origin',403);const site=req.headers.get('sec-fetch-site');if(site&&!['same-origin','none'].includes(site))error('Cross-site request blocked',403);}
function cookie(req){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('at_session='))?.slice(11)||'';}
function setCookie(req,token,age){const secure=new URL(req.url).protocol==='https:'?'; Secure':'';return `at_session=${token}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=${age}`;}
async function session(req,env){
 const token=cookie(req);if(!token)return null;
 const digest=await sha(token);
 const user=await first(env.DB,`SELECT u.id,u.name,u.email,u.role,u.active,s.csrf_hash,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,digest,iso());
 if(!user?.active)return null;
 if(req.headers.get('x-portal-view')==='family' && user.role!=='parent'){
  const linked=await first(env.DB,"SELECT id FROM students WHERE parent_id=? AND status='active' LIMIT 1",user.id);
  if(!linked)error('Family access is not enabled for this account',403);
  user.primary_role=user.role;
  user.role='parent'; // Restrict ALL API calls to parent permissions in Family view.
 }
 return user;
}
// Session response constructed separately so cookie is always set on login.
async function signedIn(req,env,user){
 const token=random(32),csrf=random(24);
 await run(env.DB,'INSERT INTO sessions(token_hash,csrf_hash,user_id,expires_at) VALUES(?,?,?,?)',await sha(token),await sha(csrf),user.id,nextIso(SESSION_AGE));
 const family=await first(env.DB,"SELECT id FROM students WHERE parent_id=? AND status='active' LIMIT 1",user.id);
 return json({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role,has_family:!!family},csrf},200,{'Set-Cookie':setCookie(req,token,SESSION_AGE)});
}
async function audit(db,user,action,entity,entity_id='',detail=''){await run(db,'INSERT INTO audit_log(id,actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)',id(),user?.id||null,action,entity,entity_id,short(detail,600));}
function studentScope(user,alias='s'){if(user.role==='admin'||user.role==='staff')return {where:'1=1',args:[]};if(user.role==='teacher')return {where:`${alias}.class_id IN (SELECT id FROM classes WHERE teacher_id=?)`,args:[user.id]};return {where:`${alias}.parent_id=?`,args:[user.id]};}
async function permittedStudent(db,user,sid){const s=await first(db,'SELECT * FROM students WHERE id=?',sid);if(!s)error('Student not found',404);if(['admin','staff'].includes(user.role))return s;if(user.role==='parent'&&s.parent_id===user.id)return s;if(user.role==='teacher'){const c=await first(db,'SELECT id FROM classes WHERE id=? AND teacher_id=?',s.class_id,user.id);if(c)return s;}error('You are not assigned to this student',403);}

const DBS_RETENTION_DAYS=180;
const DBS_MAX_FILE_BYTES=3*1024*1024;
const dbsDayDiff=(date,base=schoolLocalDate())=>Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(base+'T00:00:00Z'))/86400000);
const dbsNotice=(due,base=schoolLocalDate())=>{
 const days=dbsDayDiff(due,base);
 return {days_remaining:days,alert:days<0?'overdue':days<=60?'due_soon':'current'};
};
async function purgeOldDbsDocuments(env){
 if(!env.DB||!env.DBS_FILES)return 0;
 const records=await all(env.DB,"SELECT id,document_key FROM staff_dbs_checks WHERE document_key IS NOT NULL AND document_purge_after<=? LIMIT 150",iso());
 let count=0;
 for(const rec of records){
  await env.DBS_FILES.delete(rec.document_key);
  await run(env.DB,'UPDATE staff_dbs_checks SET document_key=NULL,document_mime=NULL,document_uploaded_at=NULL,document_purge_after=NULL WHERE id=? AND document_key=?',rec.id,rec.document_key);
  count++;
 }
 return count;
}


/*
 * Private, provider-independent notifications. Never put safeguarding, medical,
 * message text or detailed behaviour notes into the notification body.
 * A new notification is only delivered to the currently linked user account.
 * UNIQUE(recipient_id,kind,source_id) makes retries idempotent.
 */
async function createInboxNotification(db,recipientId,studentId,kind,sourceId,title,body,targetPage){
 if(!recipientId)return;
 try{
  await run(db,'INSERT OR IGNORE INTO portal_notifications(id,recipient_id,student_id,kind,source_id,title,body,target_page) VALUES(?,?,?,?,?,?,?,?)',
   id(),recipientId,studentId||null,kind,String(sourceId),short(title,160),short(body,300),targetPage);
 }catch(err){console.error('Private in-app notification could not be saved',err);}
}
async function notifyLinkedGuardianInApp(db,studentId,kind,sourceId,title,body,targetPage){
 try{
  const linked=await first(db,`SELECT s.parent_id,s.first_name,s.last_name
    FROM students s JOIN users u ON u.id=s.parent_id AND u.active=1
    WHERE s.id=? AND s.status='active'`,studentId);
  if(!linked?.parent_id)return;
  const display=[linked.first_name,linked.last_name].filter(Boolean).join(' ');
  await createInboxNotification(db,linked.parent_id,studentId,kind,sourceId,title,
   body.replace('{student}',display),targetPage);
 }catch(err){console.error('Guardian in-app notification unavailable',err);}
}

const FIELDS_STUDENT=['first_name','last_name','dob','gender','class_id','parent_id','phone','address','medical_notes','status'];
const CATALOG=[
 ['talking','Talking repeatedly during lessons',-1],['instructions','Not following instructions',-1],['distracting','Distracting other pupils',-1],['unprepared','Being unprepared for lessons repeatedly',-1],['lateness','Repeated lateness without a valid reason',-1],
 ['disrespect','Disrespectful language',-2],['disruption','Deliberately disrupting the lesson',-2],['refusal','Refusing to follow reasonable instructions',-2],['disturbing','Repeatedly disturbing other pupils’ learning',-2],['arguing','Arguing aggressively with another pupil',-3],['swearing','Swearing or using offensive language',-3],['damage','Deliberately damaging property',-4],['bullying','Bullying or repeated intimidation',-5],['threatening','Threatening another pupil',-5],['fighting','Fighting or physical aggression',-5],['harassment','Serious harassment or discriminatory abuse',-5],
 ['punctual','Arriving on time',1],['equipment','Bringing all books and equipment',1],['homework','Completing homework',1],['manners','Showing excellent manners',1],['following','Following instructions promptly',1],['participation','Participating positively in class',1],['helping','Helping another student',2],['respect','Showing exceptional respect to teachers',2],['hifdh-effort','Excellent effort in Qur’an memorisation',2],['leadership','Demonstrating leadership and responsibility',2],['resolution','Helping resolve a disagreement peacefully',3],['improvement','Outstanding improvement in behaviour',3],['kindness','Exceptional act of kindness or character',3]
].map(([code,label,points])=>({code,label,points,category:points>0?'positive':'concern'}));
async function mail(env,to,subject,html,options={}){const e=id();if(!env.RESEND_API_KEY||!env.EMAIL_FROM){await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status,error) VALUES(?,?,?,?,?)',e,to,subject,'not_configured','Resend API key or sender not configured');return {sent:false};}try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html,...(options.replyTo?{reply_to:options.replyTo}:{})})});if(!r.ok)throw new Error(`Provider returned ${r.status}`);await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status) VALUES(?,?,?,?)',e,to,subject,'sent');return {sent:true};}catch(err){await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status,error) VALUES(?,?,?,?,?)',e,to,subject,'failed',short(err.message));return {sent:false};}}

function passwordResetEmailHtml(accountName,resetUrl,contactAddress){
 const person=escapeHtml(short(accountName||'Portal user',100));
 const link=escapeHtml(resetUrl);
 const support=escapeHtml(contactAddress||'admissions@attowfiqmasjid.org');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <title>Reset your Madrasah At-Towfiq password</title><style>@media(max-width:600px){.reset-wrap{width:100%!important}.reset-pad{padding:25px 21px!important}.reset-btn{display:block!important;text-align:center!important}}</style></head>
 <body style="margin:0;background:#f2f5fa;color:#233a61;font-family:Arial,Helvetica,sans-serif"><span style="display:none!important;max-height:0;opacity:0;overflow:hidden">Secure account recovery — your one-time link expires in 30 minutes.</span>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5fa"><tr><td align="center" style="padding:35px 14px">
 <table role="presentation" width="580" class="reset-wrap" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:#fff;border:1px solid #dce8f5;border-radius:18px;overflow:hidden">
 <tr><td style="padding:27px 34px;background:#172e57;text-align:center"><img src="https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png" alt="Madrasah At-Towfiq" width="180" style="display:block;width:180px;margin:0 auto 15px;max-width:80%;background:#fff;padding:7px;border-radius:8px"><p style="margin:0;color:#bed7f9;font-size:11px;letter-spacing:2px">MADRASAH AT-TOWFIQ · BOLTON</p></td></tr>
 <tr><td class="reset-pad" style="padding:38px 41px 31px">
 <p style="font-size:11px;letter-spacing:1.5px;font-weight:bold;color:#3769b9">ACCOUNT SECURITY</p>
 <h1 style="margin:0 0 23px;font:normal 30px/1.25 Georgia,'Times New Roman',serif;color:#1c365f">Reset your portal password</h1>
 <p lang="ar" dir="rtl" style="text-align:left;font-size:23px;color:#1c477d;margin:0 0 4px">السلام عليكم ورحمة الله وبركاته</p>
 <p style="font-size:13px;font-style:italic;color:#77879d;margin:0 0 21px">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
 <p style="font-size:15px;color:#435879;line-height:1.85">Dear <strong>${person}</strong>,</p>
 <p style="font-size:15px;color:#435879;line-height:1.85">We received a request to reset the password for your secure Madrasah At-Towfiq account. Please use the link below if you made this request.</p>
 <p style="margin:24px 0"><a class="reset-btn" href="${link}" style="display:inline-block;padding:16px 25px;background:#386bc8;color:#fff;text-decoration:none;border-radius:9px;font-size:14px;font-weight:bold">Reset my password &nbsp;→</a></p>
 <div style="background:#f0f5fe;border:1px solid #dce8f8;border-radius:10px;padding:16px;color:#466082;font-size:13px;line-height:1.75"><strong>Security reminder:</strong> This link expires in 30 minutes and can be used only once. A successful reset signs out other sessions on the account.</div>
 <p style="font-size:12px;color:#667e9d;line-height:1.85;word-break:break-all">If the button does not open, copy this link into your browser:<br><a href="${link}" style="color:#3364b9">${link}</a></p>
 <p style="font-size:13px;color:#627a9c;line-height:1.8">If you did not request this change, no action is needed. Your password has not been changed.</p>
 <p style="font-size:13px;color:#627a9c;line-height:1.8">Questions? Contact <a href="mailto:${support}" style="color:#315eaf">${support}</a>.</p>
 <p style="font-size:14px;color:#435879;line-height:1.75">Jazākum Allāhu khayran,<br><strong>The Madrasah At-Towfiq Team</strong></p>
 </td></tr><tr><td style="padding:21px 32px;text-align:center;background:#f7f9fd;font-size:11px;color:#8293ae">Rooted in faith, guided by knowledge.</td></tr>
 </table></td></tr></table></body></html>`;
}
async function inviteGuardianAfterAcceptance(db,env,req,application,actor){
 const guardianEmail=email(application.guardian_email);
 if(!/^\S+@\S+\.\S+$/.test(guardianEmail))return {invitation_status:'invalid_email'};
 const existing=await first(db,'SELECT id,email,name,role,password_hash,active FROM users WHERE email=?',guardianEmail);
 const pupil=await first(db,'SELECT id,parent_id,first_name,last_name FROM students WHERE id=?',application.student_id||application.id);
 if(!pupil)return {invitation_status:'student_not_found'};
 // An unrelated pre-existing parent assignment must never be silently replaced.
 if(pupil.parent_id && (!existing||pupil.parent_id!==existing.id))
   return {invitation_status:'manual_review'};
 // Do not use admission acceptance to reactivate a deliberately deactivated account.
 if(existing?.password_hash && !existing.active)return {invitation_status:'manual_review'};
 let uid=existing?.id;
 if(!uid){
  uid=id();
  await run(db,'INSERT INTO users(id,name,email,role,active) VALUES(?,?,?,?,0)',
   uid,short(application.guardian_name,100)||'Parent / Guardian',guardianEmail,'parent');
 }
 // Linking is immediate on acceptance, independent of email delivery.
 // Pending accounts remain inactive until their invitation is accepted.
 if(!pupil.parent_id)await run(db,'UPDATE students SET parent_id=? WHERE id=? AND parent_id IS NULL',uid,pupil.id);
 const name=guardianGreetingName(application.preferred_greeting_name,application.guardian_name);
 const pupilName=[pupil.first_name,pupil.last_name].map(x=>short(x,80)).filter(Boolean).join(' ');
 const active=Boolean(existing?.active&&existing?.password_hash);
 if(active){
  // An existing teacher/staff/admin may also be a guardian. Keep their staff role
  // and current password unchanged; show the child in an explicit family view.
  const html=guardianExistingAccountHtml(name,pupilName,env.ADMISSIONS_EMAIL,existing.role!=='parent');
  let delivered={sent:false};
  try{delivered=await mail(env,guardianEmail,'Your child is linked to your Madrasah At-Towfiq account',html,{replyTo:env.ADMISSIONS_EMAIL});}
  catch(emailErr){try{await audit(db,actor,'guardian_link_email_error','students',pupil.id,short(emailErr.message,150));}catch{}}
  try{await audit(db,actor,'guardian_link_existing','students',pupil.id,delivered.sent?'email_sent':'delivery_not_confirmed');}catch{}
  // A notification or audit-log failure cannot turn a completed link into an
  // error. The caller receives the actual enrolment and email outcomes separately.
  return {invitation_status:'linked_existing',email_status:delivered.sent?'sent':'not_sent',linked:true};
 }
 // For a new or still-pending account, email a single-use password activation
 // invitation immediately after recording the parent/child relationship.
 const token=random(32);
 await run(db,"DELETE FROM auth_tokens WHERE user_id=? AND purpose='invite'",uid);
 await run(db,'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)',await sha(token),uid,'invite',nextIso(7*DAY));
 const link='https://portal.attowfiqmasjid.org/?invite='+encodeURIComponent(token);
 const html=guardianInvitationHtml(name,link,env.ADMISSIONS_EMAIL,pupilName);
 const delivered=await mail(env,guardianEmail,'Welcome to Madrasah At-Towfiq | Parent account invitation',html,{replyTo:env.ADMISSIONS_EMAIL});
 await audit(db,actor,'guardian_invitation','users',uid,delivered.sent?'email_sent':'delivery_not_confirmed');
 return {invitation_status:delivered.sent?'sent':'delivery_not_configured_or_failed',
  invitation_url:delivered.sent?null:link,linked:true};
}
function guardianExistingAccountHtml(name,pupilName,admissionsEmail,showFamilySwitch){
 const greeting=escapeHtml(short(name||'Parent / Guardian',60));
 const child=escapeHtml(short(pupilName||'your child',170));
 const support=escapeHtml(admissionsEmail||'admissions@attowfiqmasjid.org');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <title>Your child's portal access | Madrasah At-Towfiq</title>
 <style>@media(max-width:600px){.guardian-email-wrap{width:100%!important}.guardian-email-pad{padding:24px 19px!important}}</style></head>
 <body style="margin:0;background:#f2f5fb;font-family:Arial,Helvetica,sans-serif;color:#253d60">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5fb"><tr><td align="center" style="padding:30px 12px">
 <table role="presentation" class="guardian-email-wrap" width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:#fff;border:1px solid #dde6f3;border-radius:18px;overflow:hidden">
 <tr><td align="center" style="padding:28px;background:#172e57;color:#c5dafa">
 <img src="https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png" alt="Madrasah At-Towfiq" width="180" style="display:block;width:180px;max-width:80%;margin:0 auto 14px;background:#fff;border-radius:9px;padding:7px">
 <span style="font-size:11px;letter-spacing:2px">MADRASAH AT-TOWFIQ · BOLTON</span></td></tr>
 <tr><td class="guardian-email-pad" style="padding:35px 40px">
 <h1 style="font:normal 29px/1.3 Georgia,serif;color:#1c365d;margin:0 0 22px">Welcome to your child's learning journey</h1>
 <p lang="ar" dir="rtl" style="text-align:left;color:#234975;font-size:23px;margin:0 0 5px">السلام عليكم ورحمة الله وبركاته</p>
 <p style="font-size:13px;color:#778aa4;margin:0 0 23px;font-style:italic">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
 <p>Dear <strong>${greeting}</strong>,</p>
 <p style="line-height:1.9;color:#465a76">We are pleased to confirm that <strong>${child}</strong> has been enrolled at Madrasah At-Towfiq and securely linked to your existing account.</p>
 <p style="line-height:1.9;color:#465a76">You do not need to create a second account or change your password. Simply sign in using your existing credentials.${showFamilySwitch?' Then select <strong>Family view</strong> to access your child’s learning dashboard.':''}</p>
 <p><a href="https://portal.attowfiqmasjid.org/" style="display:inline-block;padding:15px 23px;background:#386bc8;color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Open the parent portal →</a></p>
 <p style="font-size:13px;line-height:1.85;color:#657d9d;margin:25px 0 0">For help, email <a href="mailto:${support}" style="color:#315fb3">${support}</a>. Please keep your account details private.</p>
 <p style="font-size:14px;color:#465a76;margin:23px 0 0">Jazākum Allāhu khayran,<br><strong>The Admissions Team</strong><br>Madrasah At-Towfiq</p>
 </td></tr><tr><td align="center" style="background:#f7f9fd;padding:19px;font-size:11px;color:#8295ae">Rooted in faith, guided by knowledge.</td></tr>
 </table></td></tr></table></body></html>`;
}

const guardianGreetingName=(preferred,fullName)=>{
 const chosen=short(preferred||'',60).trim();
 if(chosen)return chosen.split(/\s+/)[0];
 // The current admissions form stores one full-name field (often surname first).
 // Manual invites let staff review/edit the preferred name when ordering differs.
 const parts=short(fullName||'',120).trim().split(/\s+/).filter(Boolean);
 return parts.length?parts[parts.length-1]:'Parent / Guardian';
};
function guardianInvitationHtml(name,activationUrl,admissionsEmail,studentFullName){
 const first=escapeHtml(short(name||'Parent / Guardian',60));
 const pupil=escapeHtml(short(studentFullName||'your child',170));
 const link=escapeHtml(activationUrl);
 const contact=escapeHtml(admissionsEmail||'admissions@attowfiqmasjid.org');
 const logo='https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png';
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Madrasah At-Towfiq – Parent invitation</title>
<style>@media only screen and (max-width:600px){.mail-wrap{width:100%!important}.mail-pad{padding:27px 22px!important}.mail-title{font-size:27px!important}.mail-button{display:block!important;text-align:center!important}}</style></head>
<body style="margin:0;padding:0;background:#f2f5fb;color:#172d50;font-family:Arial,Helvetica,sans-serif">
<span style="display:none!important;font-size:1px;color:#f2f5fb;max-height:0;max-width:0;opacity:0;overflow:hidden">Your private invitation to the Madrasah At-Towfiq parent portal.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f5fb"><tr><td align="center" style="padding:36px 15px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="mail-wrap" style="max-width:600px;width:100%;background:#fff;border:1px solid #e2e9f4;border-radius:18px;overflow:hidden">
<tr><td style="padding:29px 34px 24px;background:#172e57;text-align:center">
<img src="${logo}" alt="Madrasah At-Towfiq" width="190" style="display:block;margin:0 auto 16px;width:190px;max-width:80%;height:auto;border:0;background:#ffffff;border-radius:9px;padding:7px">
<p style="margin:0;color:#b8d7ff;font-size:11px;font-weight:bold;letter-spacing:2.3px">MADRASAH AT-TOWFIQ · BOLTON</p></td></tr>
<tr><td class="mail-pad" style="padding:39px 42px 22px">
<p style="margin:0 0 12px;color:#3067bc;font-size:12px;font-weight:bold;letter-spacing:1.3px;text-transform:uppercase">Parent &amp; guardian account invitation</p>
<h1 class="mail-title" style="margin:0 0 25px;color:#18325b;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.27;font-weight:normal">Welcome to our learning community</h1>
<p lang="ar" dir="rtl" style="margin:0 0 4px;text-align:left;color:#183b70;font-size:24px;line-height:1.8">السلام عليكم ورحمة الله وبركاته</p>
<p style="margin:0 0 24px;color:#75849a;font-size:13px;font-style:italic">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
<p style="margin:0 0 18px;color:#1d3558;font-size:16px;line-height:1.8"><strong>Dear ${first},</strong></p>
<p style="margin:0 0 17px;color:#435573;font-size:15px;line-height:1.85">We are pleased to inform you that the application submitted for <strong>${pupil}</strong> has been accepted by <strong>Madrasah At-Towfiq</strong>.</p>
<p style="margin:0 0 23px;color:#435573;font-size:15px;line-height:1.85">You are formally invited to activate your secure parent account. Through the portal, you can follow your child’s homework, attendance and learning progress, and receive important madrasah updates.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 25px;background:#f0f5fd;border:1px solid #dce9f9;border-radius:11px"><tr><td style="padding:17px 19px;color:#315b92;font-size:13px;line-height:1.75"><strong>Your next step</strong><br>Activate your account securely and create your personal password.</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 23px"><tr><td bgcolor="#386bc8" style="border-radius:9px;background:#386bc8"><a class="mail-button" href="${link}" style="display:inline-block;padding:17px 27px;font-weight:bold;font-size:14px;letter-spacing:.1px;text-decoration:none;color:#ffffff">Activate my parent account &nbsp;→</a></td></tr></table>
<p style="margin:0 0 12px;color:#667a96;font-size:13px;line-height:1.75"><strong>For your security:</strong> this link can be used once and expires in 7 days. Please keep it private.</p>
<p style="margin:0 0 29px;color:#667a96;font-size:12px;line-height:1.7">If the button does not open, copy this link into your browser:<br><a href="${link}" style="color:#325fb7;word-break:break-all;overflow-wrap:anywhere">${link}</a></p>
<p style="margin:0 0 8px;color:#435573;font-size:15px;line-height:1.85">We look forward to working with you to nurture your child’s knowledge, good character and faith.</p>
<p style="margin:0 0 10px;color:#435573;font-size:15px;line-height:1.85">Jazākum Allāhu khayran,<br><strong>The Admissions Team</strong><br>Madrasah At-Towfiq</p>
</td></tr><tr><td style="padding:23px 34px;background:#f7f9fd;border-top:1px solid #e7edf6;text-align:center">
<p style="margin:0 0 7px;color:#506483;font-size:12px;line-height:1.7">Questions? <a href="mailto:${contact}" style="color:#325fb7;text-decoration:none">${contact}</a></p>
<p style="margin:0;color:#8798b0;font-size:11px;line-height:1.6">Madrasah At-Towfiq · Bolton, United Kingdom<br>If you were not expecting this invitation, please contact the admissions team.</p>
</td></tr></table>
<p style="margin:20px 0 0;text-align:center;font-size:11px;color:#8798b0">Rooted in faith, guided by knowledge.</p>
</td></tr></table></body></html>`;
}


function applicationReceiptReference(applicationId,receivedAt){
 const year=String(receivedAt||'').slice(0,4)||String(new Date().getUTCFullYear());
 const slug=String(applicationId||'').replace(/[^a-zA-Z0-9]/g,'').slice(0,10).toUpperCase();
 return 'MAT-'+year+'-'+slug;
}
function applicationReceiptHtml({guardianName,studentName,reference,submittedAt,admissionsEmail}){
 const name=escapeHtml(short(guardianName||'Parent / Guardian',120));
 const student=escapeHtml(short(studentName||'your child',170));
 const ref=escapeHtml(reference);
 const submitted=escapeHtml(submittedAt);
 const contact=escapeHtml(admissionsEmail||'admissions@attowfiqmasjid.org');
 const logo='https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png';
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Application received | Madrasah At-Towfiq</title>
<style>@media only screen and (max-width:600px){.mail-wrap{width:100%!important}.mail-pad{padding:27px 22px!important}.mail-title{font-size:27px!important}.ref-table td{display:block!important;width:auto!important;padding:5px 0!important}}</style>
</head><body style="margin:0;padding:0;background:#f2f5fb;color:#172d50;font-family:Arial,Helvetica,sans-serif">
<span style="display:none!important;font-size:1px;color:#f2f5fb;max-height:0;max-width:0;opacity:0;overflow:hidden">We have received your admission application. Please retain your reference number for future correspondence.</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f5fb"><tr><td align="center" style="padding:34px 14px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="mail-wrap" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e0e8f4;border-radius:18px;overflow:hidden">
<tr><td style="background:#172e57;text-align:center;padding:28px 34px 24px">
<img src="${logo}" alt="Madrasah At-Towfiq logo" width="190" style="display:block;margin:0 auto 16px;width:190px;max-width:80%;height:auto;border:0;border-radius:9px;background:#ffffff;padding:7px">
<p style="margin:0;color:#bbd7fd;font-size:11px;font-weight:bold;letter-spacing:2.3px">MADRASAH AT-TOWFIQ · BOLTON</p>
</td></tr>
<tr><td class="mail-pad" style="padding:38px 42px 25px">
<p style="margin:0 0 11px;color:#3769be;text-transform:uppercase;font-size:11px;letter-spacing:1.6px;font-weight:bold">Admissions · Confirmation of receipt</p>
<h1 class="mail-title" style="margin:0 0 15px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.3;font-weight:normal;color:#1c365f">Your application has been received</h1>
<p style="margin:0 0 26px;color:#4a8467;font-size:13px;font-weight:bold">✓ Successfully recorded · Awaiting review</p>
<p dir="rtl" lang="ar" style="margin:0 0 5px;font-size:24px;line-height:1.8;color:#193e76;text-align:left">السلام عليكم ورحمة الله وبركاته</p>
<p style="margin:0 0 23px;font-size:13px;font-style:italic;color:#74849b">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
<p style="margin:0 0 18px;color:#20395b;font-size:16px;line-height:1.8"><strong>Dear ${name},</strong></p>
<p style="margin:0 0 19px;font-size:15px;line-height:1.85;color:#435573">Jazākum Allāhu khayran for your interest in Madrasah At-Towfiq. We are pleased to acknowledge receipt of the admission application submitted for <strong>${student}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.85;color:#435573">Your application has been securely recorded and will be reviewed by our admissions team. We appreciate the trust you have placed in the madrasah.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;background:#f0f5fd;border:1px solid #dce8f7;border-radius:12px">
<tr><td style="padding:18px 20px">
<p style="margin:0 0 13px;color:#325994;font-size:11px;letter-spacing:1.1px;font-weight:bold">YOUR APPLICATION DETAILS</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="ref-table">
<tr><td style="padding:6px 0;color:#71839e;font-size:12px;width:36%">Reference</td><td style="padding:6px 0;color:#1e3864;font-weight:bold;font-size:14px">${ref}</td></tr>
<tr><td style="padding:6px 0;color:#71839e;font-size:12px">Received on</td><td style="padding:6px 0;color:#1e3864;font-weight:bold;font-size:13px">${submitted}</td></tr>
<tr><td style="padding:6px 0;color:#71839e;font-size:12px">Application status</td><td style="padding:6px 0;color:#1e3864;font-weight:bold;font-size:13px">Received — awaiting review</td></tr>
</table></td></tr></table>
<h2 style="margin:0 0 12px;color:#243f6b;font-size:17px;line-height:1.4">What happens next?</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px">
<tr><td valign="top" style="width:33px;padding:4px 8px 12px 0;color:#3566bd;font-weight:bold;font-size:15px">01</td><td style="padding:4px 0 12px;color:#495d7a;font-size:14px;line-height:1.75"><strong style="color:#263f67">Application review.</strong> Our admissions team will review the information provided.</td></tr>
<tr><td valign="top" style="padding:4px 8px 12px 0;color:#3566bd;font-weight:bold;font-size:15px">02</td><td style="padding:4px 0 12px;color:#495d7a;font-size:14px;line-height:1.75"><strong style="color:#263f67">Further information.</strong> We will contact you if clarification or additional details are needed.</td></tr>
<tr><td valign="top" style="padding:4px 8px 12px 0;color:#3566bd;font-weight:bold;font-size:15px">03</td><td style="padding:4px 0 12px;color:#495d7a;font-size:14px;line-height:1.75"><strong style="color:#263f67">Decision and next steps.</strong> You will be notified separately when a decision has been made.</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 25px;background:#fffbef;border-left:3px solid #dbb365;border-radius:6px"><tr><td style="padding:14px 16px;color:#7b653d;font-size:12px;line-height:1.75"><strong>Please note:</strong> This email confirms receipt only. It is not an offer of admission or confirmation of an allocated place.</td></tr></table>
<p style="margin:0 0 10px;color:#435573;font-size:14px;line-height:1.8">Please keep the reference above for future enquiries. For questions, contact <a href="mailto:${contact}" style="color:#3568bc;text-decoration:none">${contact}</a>.</p>
<p style="margin:21px 0 0;color:#435573;font-size:14px;line-height:1.8">With kind regards and duʿā’,<br><strong>The Admissions Team</strong><br>Madrasah At-Towfiq</p>
</td></tr>
<tr><td style="background:#f7f9fd;border-top:1px solid #e7edf6;padding:22px 32px;text-align:center">
<p style="margin:0 0 8px;color:#4d6589;font-size:12px">Madrasah At-Towfiq · Bolton, United Kingdom</p>
<p style="margin:0;color:#8294ad;font-size:11px;line-height:1.7">This is an automated acknowledgement sent to the email address recorded on the application. Please do not send sensitive student or medical information by ordinary email.</p>
</td></tr></table>
<p style="margin:19px 0 0;color:#8a98ae;font-size:11px;text-align:center">Rooted in faith, guided by knowledge.</p>
</td></tr></table></body></html>`;
}
async function sendApplicationReceipt(db,env,application){
 const guardianEmail=email(application.guardian_email);
 const receivedAt=application.created_at||iso();
 const reference=applicationReceiptReference(application.id,receivedAt);
 const receivedDate=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'long',year:'numeric'}).format(new Date(receivedAt));
 const html=applicationReceiptHtml({
  guardianName:application.guardian_name,studentName:[application.first_name,application.last_name].filter(Boolean).join(' ')||application.child_name,
  reference,submittedAt:receivedDate,admissionsEmail:env.ADMISSIONS_EMAIL
 });
 const outcome=await mail(env,guardianEmail,'Madrasah At-Towfiq | Application received ('+reference+')',html,{replyTo:env.ADMISSIONS_EMAIL});
 return {acknowledgement_status:outcome.sent?'sent':'not_sent',reference};
}


const publicPortalUrl='https://portal.attowfiqmasjid.org/';
function safeEmailDate(value){
 const date=new Date(String(value||'').slice(0,10)+'T12:00:00Z');
 return Number.isNaN(date.getTime())?'See your parent portal':new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/London'}).format(date);
}
async function studentNotificationRecipient(db,studentId){
 const row=await first(db,`SELECT s.id,s.first_name,s.last_name,s.status,s.parent_id,
  p.email AS linked_email,p.name AS linked_name,p.role AS linked_role,p.active AS linked_active,p.password_hash AS linked_password_hash,
  a.guardian_email,a.guardian_name
  FROM students s LEFT JOIN users p ON p.id=s.parent_id
  LEFT JOIN admissions a ON a.student_id=s.id AND a.status='accepted'
  WHERE s.id=?`,studentId);
 if(!row||row.status!=='active')return null;
 let to,guardianName;
 if(row.parent_id){
  // A manually reassigned guardian supersedes the old admission email.
  // Never leak pupil records to an obsolete guardian.
  if(!['parent','teacher','staff','admin'].includes(row.linked_role))return null;
  if(row.linked_active){
   to=email(row.linked_email);guardianName=row.linked_name;
  }else if(row.linked_role==='parent'&&!row.linked_password_hash&&row.guardian_email
   &&email(row.linked_email)===email(row.guardian_email)){
   // New parent is linked but hasn't activated login yet. The accepted admission
   // is still the verified contact for homework/behaviour notifications.
   to=email(row.guardian_email);guardianName=row.guardian_name;
  }else return null;
 }else{
  to=email(row.guardian_email);guardianName=row.guardian_name;
 }
 if(!/^\S+@\S+\.\S+$/.test(to||''))return null;
 return {to,firstName:short(row.first_name,80),lastName:short(row.last_name,80),fullName:[row.first_name,row.last_name].map(x=>short(x,80)).filter(Boolean).join(' '),guardianName:short(guardianName||'Parent / Guardian',100)};
}
function studentActivityEmail({recipient,kind,subjectTitle,summaryLabel,summaryValue,description,explanation,dueDate,admissionsEmail}){
 const greeting=escapeHtml(guardianGreetingName('',recipient.guardianName));
 const pupil=escapeHtml(recipient.fullName);
 const label=escapeHtml(summaryLabel);
 const value=escapeHtml(summaryValue);
 const details=escapeHtml(description);
 const guidance=escapeHtml(explanation);
 const contact=escapeHtml(admissionsEmail||'admissions@attowfiqmasjid.org');
 const heading=escapeHtml(subjectTitle);
 const logo='https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png';
 const extra=dueDate?`<tr><td style="padding:8px 0;color:#6e829f;font-size:13px">Due date</td><td style="padding:8px 0;color:#233e6b;font-size:14px;font-weight:bold;text-align:right">${escapeHtml(dueDate)}</td></tr>`:'';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <title>${heading} | Madrasah At-Towfiq</title><style>@media only screen and (max-width:600px){.notify-wrap{width:100%!important}.notify-pad{padding:27px 21px!important}.notify-title{font-size:25px!important}.notify-button{display:block!important;text-align:center!important}}</style></head>
 <body style="margin:0;padding:0;background:#f1f5fb;font-family:Arial,Helvetica,sans-serif;color:#263c5f">
 <span style="display:none!important;opacity:0;max-height:0;overflow:hidden;color:#f1f5fb">A new ${kind==='homework'?'homework assignment':kind==='attendance'?'attendance update':'behaviour points update'} is available in your child’s parent portal.</span>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5fb"><tr><td align="center" style="padding:34px 15px">
 <table role="presentation" width="600" class="notify-wrap" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e2eaf6;border-radius:18px;overflow:hidden">
 <tr><td style="background:#172e57;padding:26px 32px 23px;text-align:center">
 <img src="${logo}" alt="Madrasah At-Towfiq" width="185" style="display:block;margin:0 auto 16px;width:185px;max-width:80%;height:auto;background:#fff;border-radius:8px;padding:7px;border:0">
 <p style="margin:0;color:#c2d8f8;letter-spacing:2.1px;font-size:11px;font-weight:bold">MADRASAH AT-TOWFIQ · BOLTON</p></td></tr>
 <tr><td class="notify-pad" style="padding:38px 42px 28px">
 <p style="margin:0 0 11px;color:#396abd;font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase">LEARNING &amp; CHARACTER · PARENT UPDATE</p>
 <h1 class="notify-title" style="margin:0 0 23px;font:normal 30px/1.28 Georgia,'Times New Roman',serif;color:#1c365f">${heading}</h1>
 <p lang="ar" dir="rtl" style="margin:0 0 5px;text-align:left;color:#244578;font-size:23px;line-height:1.8">السلام عليكم ورحمة الله وبركاته</p>
 <p style="margin:0 0 23px;color:#79889e;font-size:13px;font-style:italic">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
 <p style="margin:0 0 18px;color:#1d355a;font-size:16px;line-height:1.75"><strong>Dear ${greeting},</strong></p>
 <p style="margin:0 0 22px;color:#455977;font-size:15px;line-height:1.85">${guidance} The update relates to <strong>${pupil}</strong>.</p>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f0f5fd;border:1px solid #dbe7f7;border-radius:12px">
 <tr><td style="padding:19px 22px"><p style="margin:0 0 12px;color:#5474a6;font-size:11px;letter-spacing:1.3px;font-weight:bold">${label}</p>
 <p style="margin:0 0 11px;font-size:22px;font-weight:bold;color:#1c4077;line-height:1.4">${value}</p>
 <p style="margin:0 0 12px;color:#536b89;font-size:13px;line-height:1.75">${details}</p>
 ${extra?'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #dce7f5;margin-top:11px">'+extra+'</table>':''}
 </td></tr></table>
 <p style="margin:0 0 22px;color:#556983;font-size:14px;line-height:1.8">For full details, learning instructions and any additional teacher feedback, sign in securely to the parent portal.</p>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 25px"><tr><td bgcolor="#386bc8" style="border-radius:9px;background:#386bc8">
 <a class="notify-button" href="${publicPortalUrl}" style="display:inline-block;color:#fff;text-decoration:none;padding:16px 27px;font-size:14px;font-weight:bold">Open the parent portal &nbsp;→</a>
 </td></tr></table>
 <p style="margin:0;color:#697e9c;font-size:12px;line-height:1.7">This is a confidential update for the recorded parent or guardian. Please do not forward pupil records. If you have a question, contact <a href="mailto:${contact}" style="color:#315fb3;text-decoration:none">${contact}</a>.</p>
 <p style="margin:22px 0 0;color:#455977;font-size:14px;line-height:1.8">Jazākum Allāhu khayran,<br><strong>The Madrasah Team</strong><br>Madrasah At-Towfiq</p>
 </td></tr>
 <tr><td style="padding:20px 32px;background:#f7f9fd;border-top:1px solid #e7edf6;text-align:center;color:#8394ae;font-size:11px;line-height:1.7">Madrasah At-Towfiq · Bolton, United Kingdom<br>Rooted in faith, guided by knowledge.</td></tr>
 </table></td></tr></table></body></html>`;
}
async function notifyGuardianAboutRecord(db,env,studentId,kind,item,actor){
 const recipient=await studentNotificationRecipient(db,studentId);
 if(!recipient)return {notification_status:'no_guardian_email'};
 let emailSubject,template;
 if(kind==='homework'){
  const types={hifdh:'Qur’an memorisation (Hifdh)',murajaa:'Qur’an revision (Muraja’a)',qaaidah:'Qaaidah',islamic_studies:'Islamic Studies'};
  const type=types[item.type]||'Homework';
  const part=['hifdh','murajaa'].includes(item.type)
    ?item.surah_from+' (verse '+item.verse_from+') to '+item.surah_to+' (verse '+item.verse_to+')'
    :'Page '+short(item.page_number,50);
  emailSubject='New homework assignment | Madrasah At-Towfiq';
  template=studentActivityEmail({recipient,kind,
   subjectTitle:'A new homework assignment',summaryLabel:'ASSIGNMENT',summaryValue:type,
   description:part,explanation:'A new learning task has been assigned to your child.',
   dueDate:safeEmailDate(item.due_date),admissionsEmail:env.ADMISSIONS_EMAIL});
 }else if(kind==='behaviour'){
  const delta=Number(item.points),positive=delta>0;
  emailSubject='Behaviour points update | Madrasah At-Towfiq';
  template=studentActivityEmail({recipient,kind,
   subjectTitle:positive?'Celebrating positive character':'A behaviour points update',
   summaryLabel:positive?'POINTS AWARDED':'POINTS DEDUCTED',
   summaryValue:(positive?'+':'')+delta+' '+(Math.abs(delta)===1?'point':'points'),
   description:short(item.description,150),
   explanation:positive?'We are pleased to recognise a positive contribution to our madrasah community.':'A behaviour points adjustment has been recorded in our learning and character system.',
   admissionsEmail:env.ADMISSIONS_EMAIL});
 }else return {notification_status:'unsupported'};
 const sent=await mail(env,recipient.to,emailSubject,template,{replyTo:env.ADMISSIONS_EMAIL});
 const result=sent.sent?'sent':'not_sent';
 try{await audit(db,actor,'parent_'+kind+'_notification',kind,item.id,result);}catch{}
 return {notification_status:result};
}



// Only send on an explicitly recorded new absence, once per pupil and date.
// Claiming the unique key first avoids duplicate messages on repeated saves.
async function notifyGuardianOfAbsence(db,env,studentId,date,actor){
 const claim=await run(db,"INSERT OR IGNORE INTO attendance_family_alerts(student_id,attendance_date,state) VALUES(?,?,'processing')",studentId,date);
 if(Number(claim?.meta?.changes??claim?.changes??0)!==1)return 'already_attempted';
 let outcome='not_sent';
 try{
  const recipient=await studentNotificationRecipient(db,studentId);
  if(!recipient)outcome='no_guardian_email';
  else{
   const html=studentActivityEmail({recipient,kind:'attendance',
    subjectTitle:'An attendance update for your child',summaryLabel:'ATTENDANCE STATUS',summaryValue:'Absent',
    description:'Recorded for '+safeEmailDate(date),
    explanation:'The attendance register records an absence for your child. If this is unexpected or incorrect, please contact the madrasah.',
    admissionsEmail:env.ADMISSIONS_EMAIL});
   const sent=await mail(env,recipient.to,'Attendance update | Madrasah At-Towfiq',html,{replyTo:env.ADMISSIONS_EMAIL});
   outcome=sent.sent?'sent':'not_sent';
  }
 }catch(err){outcome='not_sent';}
 try{
  await run(db,'UPDATE attendance_family_alerts SET state=? WHERE student_id=? AND attendance_date=?',outcome,studentId,date);
  await audit(db,actor,'parent_absence_notice','attendance',studentId,date+' '+outcome);
 }catch{}
 return outcome;
}

const financeMoney=pence=>'£'+(Number(pence||0)/100).toFixed(2);
const financePeriod=period=>{
 const match=/^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(period||''));
 if(!match)return String(period||'');
 return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(match[1]),Number(match[2])-1,1)));
};
function financeNoticeHtml({recipient,kind,invoice,paidPence=0,paymentPence=0,remainingPence=0,admissionsEmail}){
 const name=escapeHtml(guardianGreetingName('',recipient.guardianName));
 const child=escapeHtml(recipient.fullName);
 const period=escapeHtml(financePeriod(invoice.period));
 const amount=escapeHtml(financeMoney(invoice.amount_pence));
 const paid=escapeHtml(financeMoney(paidPence));
 const remaining=escapeHtml(financeMoney(remainingPence));
 const payment=escapeHtml(financeMoney(paymentPence));
 const due=invoice.due_date?escapeHtml(safeEmailDate(invoice.due_date)):'See your parent portal';
 const support=escapeHtml(admissionsEmail||'admissions@attowfiqmasjid.org');
 const receipt=kind==='receipt',reminder=kind==='reminder';
 const title=receipt?'Your payment has been recorded':reminder?'Your madrasah fee statement':'A new fee invoice is available';
 const status=receipt?(remainingPence===0?'Invoice fully paid':'Payment received · balance remaining'):reminder?'Fee balance reminder':'New invoice issued';
 const intro=receipt?'Thank you for your payment. We are pleased to confirm that it has been entered in the madrasah fee ledger.':reminder?'This is a courteous reminder of an outstanding balance on your child’s fee account. If you have recently paid, please contact the admissions team so the records can be checked.':'A new fee invoice has been issued for your child. Please review the amount and due date below.';
 const extra=receipt?`<tr><td style="padding:7px 0;color:#7184a3;font-size:13px">Payment recorded</td><td align="right" style="padding:7px 0;font-weight:bold;color:#193962">${payment}</td></tr>`:'';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <title>${title} | Madrasah At-Towfiq</title>
 <style>@media only screen and (max-width:600px){.finance-wrap{width:100%!important}.finance-pad{padding:26px 21px!important}.finance-title{font-size:25px!important}.finance-cta{display:block!important;text-align:center!important}}</style></head>
 <body style="margin:0;background:#f2f5fb;color:#243a5e;font-family:Arial,Helvetica,sans-serif"><span style="display:none!important;max-height:0;opacity:0;overflow:hidden">A private fee update is available in your family portal.</span>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5fb"><tr><td align="center" style="padding:32px 13px">
 <table role="presentation" width="580" class="finance-wrap" cellpadding="0" cellspacing="0" style="width:100%;max-width:580px;background:#fff;border:1px solid #dfe8f6;border-radius:18px;overflow:hidden">
 <tr><td style="padding:29px 33px 23px;text-align:center;background:#172e57"><img src="https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png" alt="Madrasah At-Towfiq" width="183" style="display:block;width:183px;max-width:80%;height:auto;padding:7px;border-radius:8px;background:#fff;margin:0 auto 15px"><p style="color:#bdd8fb;font-size:11px;letter-spacing:2px;margin:0">MADRASAH AT-TOWFIQ · BOLTON</p></td></tr>
 <tr><td class="finance-pad" style="padding:37px 41px 29px">
 <p style="font-size:11px;font-weight:bold;letter-spacing:1.6px;color:#376bbd;margin:0 0 11px">FAMILY ACCOUNTS · PRIVATE UPDATE</p>
 <h1 class="finance-title" style="font:normal 30px/1.28 Georgia,'Times New Roman',serif;color:#1e3965;margin:0 0 12px">${title}</h1>
 <p style="font-size:13px;color:#398565;font-weight:bold;margin:0 0 24px">${status}</p>
 <p lang="ar" dir="rtl" style="text-align:left;color:#224777;font-size:23px;margin:0 0 5px">السلام عليكم ورحمة الله وبركاته</p>
 <p style="font-style:italic;color:#7b8ba4;font-size:13px;margin:0 0 23px">Assalāmu ʿalaykum wa raḥmatullāhi wa barakātuh</p>
 <p style="line-height:1.8;font-size:15px;color:#435778;margin:0 0 18px"><strong>Dear ${name},</strong></p>
 <p style="line-height:1.9;font-size:15px;color:#435778;margin:0 0 16px">${intro}</p>
 <p style="line-height:1.8;font-size:14px;color:#536c8b;margin:0 0 23px">Student: <strong>${child}</strong></p>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5fe;border:1px solid #dbe6f7;border-radius:12px;margin-bottom:24px"><tr><td style="padding:17px 19px">
 <p style="font-size:11px;letter-spacing:1.2px;color:#426aa4;font-weight:bold;margin:0 0 13px">FEE ACCOUNT SUMMARY</p>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
 <tr><td style="padding:7px 0;font-size:13px;color:#7184a3">Billing period</td><td align="right" style="padding:7px 0;font-weight:bold;color:#193962">${period}</td></tr>
 <tr><td style="padding:7px 0;font-size:13px;color:#7184a3">Invoice total</td><td align="right" style="padding:7px 0;font-weight:bold;color:#193962">${amount}</td></tr>
 ${extra}
 <tr><td style="padding:7px 0;font-size:13px;color:#7184a3">Total paid</td><td align="right" style="padding:7px 0;font-weight:bold;color:#193962">${paid}</td></tr>
 <tr><td style="padding:9px 0 7px;font-size:14px;color:#244778;border-top:1px solid #d8e4f4">Balance remaining</td><td align="right" style="padding:9px 0 7px;font-size:17px;font-weight:bold;color:#244778;border-top:1px solid #d8e4f4">${remaining}</td></tr>
 <tr><td style="padding:7px 0;font-size:13px;color:#7184a3">Due date</td><td align="right" style="padding:7px 0;font-size:13px;font-weight:bold;color:#193962">${due}</td></tr>
 </table></td></tr></table>
 <p style="font-size:13px;color:#5c7290;line-height:1.8;margin:0 0 22px">The amount above reflects the madrasah’s recorded ledger. This email is ${receipt?'a receipt for a payment recorded by staff':'a statement of the amount currently recorded'}; it does not process a bank payment or establish a direct debit.</p>
 <p style="margin:0 0 26px"><a href="https://portal.attowfiqmasjid.org/" class="finance-cta" style="display:inline-block;background:#386bc8;color:#fff;text-decoration:none;padding:16px 24px;border-radius:9px;font-size:14px;font-weight:bold">View my fee statement &nbsp;→</a></p>
 <p style="font-size:12px;color:#697d9a;line-height:1.75;margin:0">If you believe a payment is missing or have questions, contact <a href="mailto:${support}" style="color:#3565bc">${support}</a>. Please do not reply with card or bank-account information.</p>
 <p style="font-size:14px;color:#435778;line-height:1.8;margin:23px 0 0">Jazākum Allāhu khayran,<br><strong>The Madrasah Accounts Team</strong><br>Madrasah At-Towfiq</p>
 </td></tr><tr><td style="padding:19px 32px;text-align:center;background:#f7f9fd;color:#8296b0;font-size:11px">Rooted in faith, guided by knowledge.</td></tr>
 </table></td></tr></table></body></html>`;
}
async function financeEmailForInvoice(db,env,invoiceId,kind,actor,paymentPence=0){
 const invoice=await first(db,'SELECT id,student_id,period,amount_pence,due_date FROM fee_invoices WHERE id=?',invoiceId);
 if(!invoice)return {notification_status:'not_sent'};
 const paid=await first(db,'SELECT COALESCE(SUM(amount_pence),0) AS total FROM payments WHERE invoice_id=?',invoiceId);
 const paidPence=Number(paid?.total||0),remainingPence=Math.max(0,Number(invoice.amount_pence)-paidPence);
 if(kind==='reminder'&&remainingPence===0)return {notification_status:'already_paid'};
 const recipient=await studentNotificationRecipient(db,invoice.student_id);
 if(!recipient)return {notification_status:'no_guardian_email'};
 const html=financeNoticeHtml({recipient,kind,invoice,paidPence,paymentPence,remainingPence,admissionsEmail:env.ADMISSIONS_EMAIL});
 const subject=kind==='receipt'?'Payment receipt | Madrasah At-Towfiq':kind==='reminder'?'Fee balance reminder | Madrasah At-Towfiq':'New fee invoice | Madrasah At-Towfiq';
 const sent=await mail(env,recipient.to,subject,html,{replyTo:env.ADMISSIONS_EMAIL});
 const result=sent.sent?'sent':'not_sent';
 try{await audit(db,actor,'family_fee_'+kind,'invoice',invoiceId,result);}catch{}
 return {notification_status:result};
}

const escapeHtml=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function handle(req,env){
 const u=new URL(req.url), path=u.pathname,method=req.method,db=env.DB;
 if(!db)error('Cloudflare D1 binding missing. Configure wrangler.jsonc and run migrations.',503);
 if(method!=='GET') consented(req);
 if(path==='/api/health')return json({ok:true,service:'Madrasah At-Towfiq portal'});
 if(path==='/api/auth/setup-status' && method==='GET'){const a=await first(db,"SELECT COUNT(*) AS n FROM users WHERE role='admin'");return json({needs_setup:!a?.n});}
 if(path==='/api/auth/setup' && method==='POST'){
  const b=await input(req),n=await first(db,"SELECT COUNT(*) AS n FROM users WHERE role='admin'");if(n?.n)error('Initial setup already completed',409);
  if(!env.SETUP_KEY||env.SETUP_KEY.length<16||!(await safeEqual(short(b.setup_key,300),env.SETUP_KEY)))error('Invalid setup key',403);
  if(!b.email||!String(b.email).includes('@')||!b.name||String(b.password||'').length<12)error('Name, valid email and a password of at least 12 characters required');
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));const uid=id();await run(db,'INSERT INTO users(id,name,email,role,password_hash,password_salt) VALUES(?,?,?,?,?,?)',uid,short(b.name,80),email(b.email),'admin',await passwordHash(b.password,salt),salt);
  await audit(db,{id:uid},'setup','users',uid);return signedIn(req,env,{id:uid,name:short(b.name,80),email:email(b.email),role:'admin'});
 }
 if(path==='/api/auth/login'&&method==='POST'){
  const b=await input(req),user=await first(db,'SELECT * FROM users WHERE email=?',email(b.email));
  if(!user||!user.active||!user.password_hash)error('Invalid email or password',401);
  if(user.locked_until&&user.locked_until>iso())error('Account temporarily locked. Try again later.',429);
  const ok=await verifyPassword(String(b.password||''),user.password_salt,user.password_hash);
  if(!ok){const failures=(user.failed_logins||0)+1;await run(db,'UPDATE users SET failed_logins=?,locked_until=? WHERE id=?',failures,failures>=6?nextIso(900):null,user.id);error('Invalid email or password',401);}
  await run(db,'UPDATE users SET failed_logins=0,locked_until=NULL WHERE id=?',user.id);await audit(db,user,'login','session');return signedIn(req,env,user);
 }
 if(path==='/api/auth/accept-invite'&&method==='POST'){
  const b=await input(req),token=String(b.token||'');if(String(b.password||'').length<12)error('Password must be at least 12 characters');
  const row=await first(db,"SELECT user_id,expires_at FROM auth_tokens WHERE token_hash=? AND purpose='invite'",await sha(token));if(!row||row.expires_at<iso())error('Invitation expired or invalid',400);
  const account=await first(db,'SELECT id,email,role FROM users WHERE id=?',row.user_id);
  if(!account)error('Invitation account not found',404);
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));
  const operations=[
    db.prepare('UPDATE users SET password_hash=?,password_salt=?,active=1 WHERE id=?').bind(await passwordHash(b.password,salt),salt,row.user_id),
    db.prepare("DELETE FROM auth_tokens WHERE user_id=? AND purpose='invite'").bind(row.user_id)
  ];
  // Link only already-accepted, unlinked pupils with an exact registered guardian email.
  // Never replace a parent's existing assignment. Requiring activation prevents linking
  // pupils to an invitation before the guardian actually accepts it.
  if(account.role==='parent'){
    operations.push(db.prepare(`UPDATE students SET parent_id=?
       WHERE parent_id IS NULL AND id IN (
         SELECT a.student_id FROM admissions a
         WHERE a.status='accepted' AND a.student_id IS NOT NULL
           AND lower(trim(a.guardian_email))=?
       )`).bind(account.id,email(account.email)));
  }
  const result=await db.batch(operations);
  const user=await first(db,'SELECT * FROM users WHERE id=?',row.user_id);
  await audit(db,user,'invite_accepted','users',user.id);
  if(account.role==='parent' && Number(result[2]?.meta?.changes||0)>0)
    await audit(db,user,'guardian_auto_link','students','',String(result[2].meta.changes)+' matching unlinked pupils');
  return signedIn(req,env,user);
 }
 if(path==='/api/auth/forgot'&&method==='POST'){
  const b=await input(req);
  const user=await first(db,'SELECT id,email,name,active,password_hash FROM users WHERE email=?',email(b.email));
  // Generic response regardless of account existence or delivery status:
  // never reveal whether a child's parent, teacher or admin has an account.
  const message='If the address belongs to an active account, you will receive a password reset email shortly. Please check your inbox and spam folder.';
  if(user?.active&&user.password_hash&&env.RESEND_API_KEY&&env.EMAIL_FROM){
   try{
    const existingReset=await first(db,"SELECT created_at FROM auth_tokens WHERE user_id=? AND purpose='reset' ORDER BY created_at DESC LIMIT 1",user.id);
    const lastAttempt=existingReset?Date.parse(existingReset.created_at):0;
    if(!lastAttempt||Date.now()-lastAttempt>=60000){
     const token=random(32);
     await run(db,"DELETE FROM auth_tokens WHERE user_id=? AND purpose='reset'",user.id);
     await run(db,'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)',await sha(token),user.id,'reset',nextIso(1800));
     const resetUrl='https://portal.attowfiqmasjid.org/?reset='+encodeURIComponent(token);
     const html=passwordResetEmailHtml(user.name,resetUrl,env.ADMISSIONS_EMAIL);
     const sent=await mail(env,user.email,'Reset your Madrasah At-Towfiq password',html,{replyTo:env.ADMISSIONS_EMAIL});
     try{await audit(db,user,'password_reset_requested','users',user.id,sent.sent?'email_accepted':'email_failed');}catch{}
    }
   }catch(err){
    try{await audit(db,user,'password_reset_request_error','users',user.id,short(err.message,180));}catch{}
   }
  }
  return json({ok:true,message});
 }
 if(path==='/api/auth/reset'&&method==='POST'){
  const b=await input(req);if(String(b.password||'').length<12)error('Password must be at least 12 characters');if(b.password!==b.confirm_password)error('Passwords do not match',400);const tok=await sha(String(b.token||''));
  const row=await first(db,"SELECT user_id,expires_at FROM auth_tokens WHERE token_hash=? AND purpose='reset'",tok);if(!row||row.expires_at<iso())error('Reset link expired or invalid');
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));await run(db,'UPDATE users SET password_salt=?,password_hash=?,failed_logins=0,locked_until=NULL WHERE id=?',salt,await passwordHash(b.password,salt),row.user_id);await run(db,'DELETE FROM auth_tokens WHERE user_id=?',row.user_id);await run(db,'DELETE FROM sessions WHERE user_id=?',row.user_id);return json({ok:true});
 }
 const user=await session(req,env);if(!user)error('Your session has expired. Please sign in.',401);
 if(path==='/api/auth/me'&&method==='GET'){
   const csrf=random(24);await run(db,'UPDATE sessions SET csrf_hash=? WHERE token_hash=?',await sha(csrf),user.token_hash);
   const family=await first(db,"SELECT id FROM students WHERE parent_id=? AND status='active' LIMIT 1",user.id);
   return json({user:{id:user.id,name:user.name,email:user.email,role:user.primary_role||user.role,has_family:!!family},csrf});
 }
 if(method!=='GET'){const received=req.headers.get('x-csrf-token');if(!received||!(await safeEqual(await sha(received),user.csrf_hash)))error('Security token expired. Reload your page.',403);}
 if(path==='/api/auth/logout'&&method==='POST'){await run(db,'DELETE FROM sessions WHERE token_hash=?',user.token_hash);return json({ok:true},200,{'Set-Cookie':setCookie(req,'',0)});}
 if(path==='/api/auth/password'&&method==='POST'){const b=await input(req),r=await first(db,'SELECT password_hash,password_salt FROM users WHERE id=?',user.id);if(!await verifyPassword(b.current_password||'',r.password_salt,r.password_hash))error('Current password is incorrect');if(String(b.new_password||'').length<12)error('New password must be at least 12 characters');const salt=b64(crypto.getRandomValues(new Uint8Array(16)));await run(db,'UPDATE users SET password_hash=?,password_salt=? WHERE id=?',await passwordHash(b.new_password,salt),salt,user.id);await run(db,'DELETE FROM sessions WHERE user_id=? AND token_hash<>?',user.id,user.token_hash);return json({ok:true});}

 // Account-specific notifications. No API accepts a client-supplied recipient.
 // Recheck current pupil links on every read or acknowledgement, including Family view.
 if(path==='/api/notifications'){
  const scope=user.role==='parent'
   ?' AND (n.student_id IS NULL OR EXISTS (SELECT 1 FROM students s WHERE s.id=n.student_id AND s.parent_id=? AND s.status=\'active\'))'
   :user.role==='teacher'
   ?' AND (n.student_id IS NULL OR EXISTS (SELECT 1 FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=n.student_id AND c.teacher_id=? AND s.status=\'active\'))'
   :'';
  const bindings=[user.id,...(scope?[user.id]:[])];
  if(method==='GET'){
   const items=await all(db,`SELECT n.id,n.kind,n.student_id,n.title,n.body,n.target_page,n.read_at,n.created_at
    FROM portal_notifications n WHERE n.recipient_id=?${scope}
    ORDER BY n.created_at DESC,n.id DESC LIMIT 150`,...bindings);
   const total=await first(db,`SELECT COUNT(*) AS n FROM portal_notifications n WHERE n.recipient_id=? AND n.read_at IS NULL${scope}`,...bindings);
   return json({items,unread:Number(total?.n||0)});
  }
  if(method==='PATCH'){
   const b=await input(req);
   if(b.mark_all===true){
    await run(db,`UPDATE portal_notifications AS n SET read_at=COALESCE(read_at,?)
      WHERE n.recipient_id=? AND n.read_at IS NULL${scope}`,iso(),...bindings);
    return json({ok:true});
   }
   const targetId=short(b.id,100);
   if(!targetId)error('Choose a notification to mark as read');
   const notice=await first(db,`SELECT n.id FROM portal_notifications n
    WHERE n.id=? AND n.recipient_id=?${scope}`,targetId,...bindings);
   if(!notice)error('Notification not found for this account',404);
   await run(db,'UPDATE portal_notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND recipient_id=?',iso(),targetId,user.id);
   return json({ok:true});
  }
  error('Method not allowed',405);
 }

 if(path==='/api/search'&&method==='GET'){
  const query=short(u.searchParams.get('q')||'',70);if(query.length<2)return json({students:[],homework:[],classes:[]});const like='%'+query.replace(/[\%_]/g,x=>'\\'+x)+'%';const scope=studentScope(user);
  const students=await all(db,`SELECT s.id,s.student_no,s.first_name,s.last_name,c.name AS class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE ${scope.where} AND (s.first_name LIKE ? ESCAPE '\\' OR s.last_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\') LIMIT 10`,...scope.args,like,like,like);
  const homework=await all(db,`SELECT h.id,h.student_id,h.type,h.due_date,s.first_name,s.last_name FROM homework h JOIN students s ON s.id=h.student_id WHERE ${scope.where} AND (h.type LIKE ? ESCAPE '\\' OR s.first_name LIKE ? ESCAPE '\\' OR s.last_name LIKE ? ESCAPE '\\') LIMIT 7`,...scope.args,like,like,like);
  const classes=user.role==='parent'?[]:await all(db,'SELECT id,name,stage FROM classes WHERE name LIKE ? LIMIT 5',like);return json({students,homework,classes});
 }
 if(path==='/api/classes/enrolment'){
  requireRole(user,'admin','staff');
  if(method!=='PATCH')error('Method not allowed',405);
  const b=await input(req);
  const classId=short(b.class_id,100);
  const course=await first(db,'SELECT id,name,capacity FROM classes WHERE id=?',classId);
  if(!course)error('Select a valid class before assigning pupils',404);
  if(!Array.isArray(b.student_ids)||b.student_ids.length>500)error('Select a valid list of no more than 500 pupils',400);
  const requested=b.student_ids.map(x=>short(x,100));
  if(new Set(requested).size!==requested.length||requested.some(x=>!x))error('Duplicate or invalid pupil selection',400);
  if(requested.length>Number(course.capacity))error('Class capacity exceeded. Select no more than '+course.capacity+' pupils.',409);
  const current=await all(db,'SELECT id FROM students WHERE class_id=?',classId);
  const currentIds=new Set(current.map(x=>x.id));
  if(current.some(x=>!requested.includes(x.id)))error('Do not remove existing pupils from an active class. Move a pupil using Change class in their profile.',409);
  const pupils=requested.length?await all(db,`SELECT id,class_id,status FROM students WHERE id IN (${requested.map(()=>'?').join(',')})`,...requested):[];
  if(pupils.length!==requested.length)error('One or more pupils could not be found',404);
  if(pupils.some(x=>x.class_id && x.class_id!==classId))error('A selected pupil belongs to a different class. Reassign that pupil from their profile first.',409);
  if(pupils.some(x=>x.status!=='active'&&!currentIds.has(x.id)))error('Only active pupils can be newly enrolled into a class',409);
  const desired=new Set(requested);
  const updates=pupils.filter(x=>!currentIds.has(x.id)).map(x=>db.prepare('UPDATE students SET class_id=? WHERE id=? AND class_id IS NULL').bind(classId,x.id));
  if(updates.length)await db.batch(updates);
  await audit(db,user,'assign_roster','class',classId,`${requested.length} pupils selected; ${updates.length} class links changed`);
  return json({ok:true,class_id:classId,assigned:requested.length,changed:updates.length});
 }
 if(path==='/api/classes'){
  if(method==='GET'){const c=user.role==='teacher'?await all(db,'SELECT c.*,u.name AS teacher_name,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) AS enrolled FROM classes c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=? ORDER BY c.name',user.id):await all(db,'SELECT c.*,u.name AS teacher_name,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) AS enrolled FROM classes c LEFT JOIN users u ON u.id=c.teacher_id ORDER BY c.name');return json({items:c});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST'){
   if(!short(b.name,100))error('Class name required');
   const capacity=b.capacity===undefined?25:Number(b.capacity);
   if(!Number.isInteger(capacity)||capacity<1||capacity>1000)error('Class capacity must be between 1 and 1000',400);
   const cid=id();await run(db,'INSERT INTO classes(id,name,stage,teacher_id,capacity,schedule) VALUES(?,?,?,?,?,?)',cid,short(b.name,100),short(b.stage,60)||'Foundation',b.teacher_id||null,capacity,short(b.schedule,200));
   await audit(db,user,'create','class',cid);return json({ok:true,id:cid});
  }
  if(method==='PATCH'){
   if(!b.id)error('Class ID required');
   const current=await first(db,'SELECT id FROM classes WHERE id=?',b.id);
   if(!current)error('Class not found',404);
   const capacity=b.capacity===undefined?25:Number(b.capacity);
   if(!Number.isInteger(capacity)||capacity<1||capacity>1000)error('Class capacity must be between 1 and 1000',400);
   const total=await first(db,'SELECT COUNT(*) AS total FROM students WHERE class_id=?',b.id);
   if(Number(total?.total||0)>capacity)error('Class already has '+total.total+' pupils. Increase capacity or reallocate pupils first.',409);
   await run(db,'UPDATE classes SET name=?,stage=?,teacher_id=?,capacity=?,schedule=? WHERE id=?',short(b.name,100),short(b.stage,60),b.teacher_id||null,capacity,short(b.schedule,200),b.id);
   await audit(db,user,'update','class',b.id);return json({ok:true});
  }
 }
 if(path==='/api/users'){
  requireRole(user,'admin');if(method==='GET')return json({items:await all(db,'SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC')});
  if(method==='POST'){const b=await input(req);if(!b.name||!String(b.email||'').includes('@')||!ROLES.includes(b.role))error('Name, valid email and role required');const uid=id();await run(db,'INSERT INTO users(id,name,email,role,active) VALUES(?,?,?,?,1)',uid,short(b.name,100),email(b.email),b.role);
    const t=random(32);await run(db,"INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)",await sha(t),uid,'invite',nextIso(7*DAY));const link=new URL('/?invite='+encodeURIComponent(t),req.url).href;const mailed=await mail(env,email(b.email),'You are invited to Madrasah At-Towfiq',`<p>Welcome to Madrasah At-Towfiq.</p><p><a href="${escapeHtml(link)}">Activate your account</a></p><p>This link expires in seven days.</p>`);
    await audit(db,user,'invite','users',uid);return json({ok:true,id:uid,invitation_url:mailed.sent?null:link,emailed:mailed.sent});}
  if(method==='PATCH'){
   const b=await input(req);
   const original=await first(db,'SELECT id,name,email,role,active,password_hash,password_salt FROM users WHERE id=?',b.id);
   if(!original)error('Account not found',404);
   if(b.id===user.id&&b.active===false)error('Cannot deactivate your own account');
   if(b.role&&!ROLES.includes(b.role))error('Invalid role');
   const role=b.role||original.role,active=b.active===undefined?original.active:(b.active?1:0);
   if(original.role==='admin'&&(role!=='admin'||!active)){
    const admins=await first(db,"SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1");
    if(admins.n<=1)error('You cannot deactivate or demote the last admin');
   }
   const newEmail=b.email===undefined?original.email:email(b.email);
   if(!/^\S+@\S+\.\S+$/.test(newEmail))error('Valid email required');
   const name=b.name===undefined?original.name:short(b.name,100);
   if(!name)error('Name required');
   const changedEmail=newEmail!==original.email;
   if(changedEmail&&await first(db,'SELECT id FROM users WHERE email=? AND id<>?',newEmail,b.id))error('Email already belongs to another account',409);
   if(changedEmail&&b.id===user.id){
    if(!b.current_password||!await verifyPassword(b.current_password,original.password_salt,original.password_hash))
      error('Enter your current password to change your own administrator email',403);
   }
   // For an email reassignment to another person, invalidate existing sessions,
   // remove the old password and require new-inbox activation before access resumes.
   await run(db,'UPDATE users SET name=?,email=?,role=?,active=?,password_hash=?,password_salt=? WHERE id=?',
    name,newEmail,role,active,changedEmail&&b.id!==user.id?null:original.password_hash,
    changedEmail&&b.id!==user.id?null:original.password_salt,b.id);
   if(changedEmail&&b.id!==user.id){
    await run(db,'DELETE FROM sessions WHERE user_id=?',b.id);
    await run(db,"DELETE FROM auth_tokens WHERE user_id=? AND purpose='invite'",b.id);
    const token=random(32);
    await run(db,'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)',await sha(token),b.id,'invite',nextIso(7*DAY));
    const link=new URL('/?invite='+encodeURIComponent(token),req.url).href;
    const delivered=await mail(env,newEmail,'Madrasah At-Towfiq — Confirm your updated account email',
      '<p>Your madrasah account email has been updated. Activate the account using <a href="'+escapeHtml(link)+'">this secure invitation link</a>. This link expires in seven days.</p>');
    await audit(db,user,'update_and_reinvite','users',b.id);
    return json({ok:true,emailed:delivered.sent,invitation_url:delivered.sent?null:link});
   }
   await audit(db,user,'update','users',b.id);return json({ok:true});
  }
 }
 if(path==='/api/guardians'){
  requireRole(user,'admin','staff');
  if(method==='GET'){
   const rows=await all(db,`SELECT s.id AS student_id,s.student_no,s.first_name,s.last_name,
      a.id AS admission_id,a.guardian_name,a.guardian_email,a.guardian_phone,
      s.parent_id,COALESCE(u.id,pending.id) AS account_id,
      CASE WHEN u.active=1 AND u.password_hash IS NOT NULL THEN 1 ELSE 0 END AS activated,
      CASE WHEN s.parent_id IS NOT NULL AND u.active=1 AND u.password_hash IS NOT NULL THEN 'linked'
           WHEN s.parent_id IS NOT NULL THEN 'pending_activation'
           WHEN pending.id IS NOT NULL THEN 'invited_or_pending' ELSE 'not_invited' END AS link_status
     FROM students s LEFT JOIN admissions a ON a.student_id=s.id
       LEFT JOIN users u ON u.id=s.parent_id
       LEFT JOIN users pending ON pending.email=lower(trim(a.guardian_email))
     ORDER BY s.last_name,s.first_name`);
   return json({items:rows});
  }
  if(method==='POST'){
   const b=await input(req);
   if(!b.student_id)error('Student required');
   const admission=await first(db,"SELECT a.* FROM admissions a JOIN students s ON s.id=a.student_id WHERE a.student_id=? AND a.status='accepted'",b.student_id);
   if(!admission)error('Accepted admission not found',404);
   const outcome=await inviteGuardianAfterAcceptance(db,env,req,{...admission,preferred_greeting_name:short(b.greeting_name,60)},user);
   return json({ok:true,...outcome});
  }
 }
 if(path==='/api/contacts'&&method==='GET'){
  const contacts=user.role==='parent'
    ?await all(db,"SELECT DISTINCT u.id,u.name,u.role FROM users u JOIN classes c ON c.teacher_id=u.id JOIN students s ON s.class_id=c.id WHERE s.parent_id=? AND s.status='active' AND u.active=1 ORDER BY u.name",user.id)
    :user.role==='teacher'
     ?await all(db,"SELECT DISTINCT u.id,u.name,u.email,u.role FROM users u JOIN students s ON s.parent_id=u.id JOIN classes c ON c.id=s.class_id WHERE c.teacher_id=? AND u.active=1 ORDER BY u.name",user.id)
     :await all(db,"SELECT id,name,email,role FROM users WHERE active=1 AND id<>? ORDER BY name",user.id);return json({items:contacts});
 }
 if(path==='/api/students/bulk'&&method==='POST')error('New pupils must be enrolled through an accepted admission application',403);
 if(path==='/api/students'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT s.*,c.name AS class_name,u.name AS parent_name,(SELECT COALESCE(SUM(points),0) FROM behaviour b WHERE b.student_id=s.id) AS behaviour_score FROM students s LEFT JOIN classes c ON c.id=s.class_id LEFT JOIN users u ON u.id=s.parent_id WHERE ${s.where} ORDER BY s.first_name,s.last_name`,...s.args)});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST')error('New pupils must be enrolled through an accepted admission application',403);
  if(method==='PATCH'){if(!b.id)error('Student ID required');const existing=await first(db,'SELECT * FROM students WHERE id=?',b.id);if(!existing)error('Student not found',404);const obj={...existing};for(const k of FIELDS_STUDENT)if(b[k]!==undefined)obj[k]=b[k];
   if(b.class_id!==undefined && !b.class_id && existing.status==='active')error('Active pupils must have a class. Reassign to another class instead.',400);
   if(b.class_id!==undefined && b.class_id!==existing.class_id && b.class_id){
    if(existing.status!=='active')error('Only active pupils can be newly assigned to a class',409);
    const target=await first(db,'SELECT id,capacity FROM classes WHERE id=?',b.class_id);
    if(!target)error('Selected class was not found',404);
    const count=await first(db,'SELECT COUNT(*) AS total FROM students WHERE class_id=? AND id<>?',b.class_id,b.id);
    if(Number(count.total)>=Number(target.capacity))error('Selected class is full. Choose another class or increase its capacity.',409);
   }
   await run(db,'UPDATE students SET first_name=?,last_name=?,dob=?,gender=?,class_id=?,parent_id=?,phone=?,address=?,medical_notes=?,status=? WHERE id=?',...FIELDS_STUDENT.map(k=>obj[k]===null?null:short(obj[k],k==='medical_notes'?600:250)),b.id);await audit(db,user,'update','student',b.id);return json({ok:true});}
  if(method==='DELETE'){if(!b.id)error('Student ID required');await run(db,'DELETE FROM students WHERE id=?',b.id);await audit(db,user,'delete','student',b.id,'Hard deleted student and linked records');return json({ok:true});}
 }
 // Full paper-form-equivalent admissions. Records are restricted to office roles.
 if(path==='/api/admissions'){
  requireRole(user,'admin','staff');
  if(method==='GET')return json({items:await all(db,'SELECT * FROM admissions ORDER BY created_at DESC')});
  const b=await input(req);
  if(method==='POST'||(method==='PATCH'&&b.update_details===true)){
   const childFirst=short(b.first_name,80),childLast=short(b.last_name,80);
   const childName=short([childFirst,childLast].filter(Boolean).join(' '),170);
   if(!childFirst||!childLast||!isDate(b.dob))error('Student forename, surname and valid date of birth are required');
   if(!['Male','Female','Prefer not to say'].includes(b.gender))error('Choose a valid gender option');
   if(!short(b.home_address,260)||!short(b.postcode,16))error('Home address and postcode are required');
   if(!short(b.guardian_name,120)||!/^\S+@\S+\.\S+$/.test(email(b.guardian_email)))error('Guardian full name and valid email are required');
   if(!short(b.guardian_phone,40))error('Guardian mobile/contact number is required');
   if(b.previous_attended&&!['yes','no','unknown'].includes(b.previous_attended))error('Invalid previous education answer');
   if(b.previous_attended==='yes'&&!short(b.previous_institute,150))error('Please enter the previous madrasah or institution');
   const names=['first_name','last_name','dob','gender','home_address','postcode','home_telephone','guardian_name','guardian_email','guardian_phone','emergency_phone','guardian_relationship','previous_attended','previous_institute','level_starting','level_qaaidah','qaaidah_page','level_quran','quran_surah','arabic_read_write','medical_information','allergies','additional_learning_needs','consent_first_aid','consent_photos','message'];
   const integers=new Set(['level_starting','level_qaaidah','level_quran','arabic_read_write','consent_first_aid','consent_photos']);
   const sizes={first_name:80,last_name:80,dob:10,gender:30,home_address:260,postcode:16,home_telephone:40,guardian_name:120,guardian_email:254,guardian_phone:40,emergency_phone:40,guardian_relationship:50,previous_attended:12,previous_institute:150,qaaidah_page:55,quran_surah:100,medical_information:1600,allergies:1000,additional_learning_needs:1600,message:1500};
   const values=names.map(k=>integers.has(k)?((b[k]===true||b[k]===1||b[k]==='1'||b[k]==='on')?1:0):k==='guardian_email'?email(b[k]):short(b[k],sizes[k]||120));
   const phone=short(b.guardian_phone||'',40);
   if(method==='POST'){
    const rid=id(), cols=['id','child_name','phone',...names];
    await run(db,`INSERT INTO admissions(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`,rid,childName,phone,...values);
    await audit(db,user,'create','admission',rid);
    // Email is a best-effort notification AFTER the admission has been saved.
    // If sending or logging fails, the application must still exist and return success.
    let receipt={acknowledgement_status:'not_sent',reference:applicationReceiptReference(rid,iso())};
    try{
     const recorded=await first(db,'SELECT id,child_name,guardian_name,guardian_email,created_at FROM admissions WHERE id=?',rid);
     receipt=await sendApplicationReceipt(db,env,recorded);
     await audit(db,user,'application_receipt','admission',rid,receipt.acknowledgement_status);
    }catch(err){
     try{await audit(db,user,'application_receipt_error','admission',rid,short(err.message,180));}catch{}
    }
    return json({ok:true,id:rid,...receipt});
   }
   if(!b.id||!await first(db,'SELECT id FROM admissions WHERE id=?',b.id))error('Application not found',404);
   const existingAdmission=await first(db,'SELECT student_id FROM admissions WHERE id=?',b.id);
   const admissionUpdate=db.prepare(`UPDATE admissions SET child_name=?,phone=?,${names.map(k=>k+'=?').join(',')},updated_at=? WHERE id=?`).bind(childName,phone,...values,iso(),b.id);
   if(existingAdmission?.student_id){
    const home=[short(b.home_address,260),short(b.postcode,16)].filter(Boolean).join(', ');
    await db.batch([admissionUpdate,db.prepare('UPDATE students SET first_name=?,last_name=?,dob=?,gender=?,phone=?,address=? WHERE id=?').bind(childFirst,childLast,b.dob,b.gender,phone,home,existingAdmission.student_id)]);
   }else await admissionUpdate.run();
   await audit(db,user,'edit','admission',b.id);return json({ok:true,id:b.id});
  }
  if(method==='PATCH'){
   const application=b.id?await first(db,'SELECT * FROM admissions WHERE id=?',b.id):null;
   if(!application)error('Application not found',404);
   if(!['new','reviewing','accepted','declined'].includes(b.status))error('Invalid status');
   if(b.status==='accepted'){
    // An existing admission remains enrolled; do not allocate another number.
    if(application.student_id){
     const already=await first(db,`SELECT s.id,s.parent_id,u.email AS linked_email
       FROM students s LEFT JOIN users u ON u.id=s.parent_id WHERE s.id=?`,application.student_id);
     const sameGuardian=!!(already?.parent_id && email(already.linked_email)===email(application.guardian_email));
     return json({ok:true,student_id:application.student_id,enrolled:true,already_enrolled:true,
       linked:sameGuardian,invitation_status:sameGuardian?'already_linked':'manual_review',
       email_status:'not_attempted'});
    }
    if(!short(application.first_name)||!short(application.last_name)||!isDate(application.dob))
      error('Complete the pupil name and date of birth before approval');
    const sid=application.id;
    const guardian=await first(db,'SELECT id FROM users WHERE email=? AND (active=1 OR password_hash IS NULL)',email(application.guardian_email));
    const proposedClass=short(b.class_id,100);
    if(!proposedClass)error('Assign a learning class before accepting this admission. Create a class under Classes & enrolment if needed.',400);
    let chosenClass=null;
    if(proposedClass){
     chosenClass=await first(db,'SELECT id,capacity,name FROM classes WHERE id=?',proposedClass);
     if(!chosenClass)error('Selected class does not exist. Refresh the class list.',404);
     const occupancy=await first(db,'SELECT COUNT(*) AS total FROM students WHERE class_id=?',proposedClass);
     if(Number(occupancy.total)>=Number(chosenClass.capacity))error('Selected class is full. Choose a different class or accept without one.',409);
    }
    const year=Number(nowDate().slice(0,4));
    const seq=await first(db,'SELECT last_number FROM student_number_sequences WHERE enrollment_year=?',year);
    if(seq?.last_number>=9999)error('Student number capacity reached for '+year+'. Contact an administrator.',409);
    const address=[short(application.home_address,260),short(application.postcode,16)].filter(Boolean).join(', ');
    // D1 batch is transactional: number allocation, enrolment and status update succeed together.
    await db.batch([
     db.prepare(`INSERT INTO student_number_sequences(enrollment_year,last_number) VALUES(?,1)
       ON CONFLICT(enrollment_year) DO UPDATE SET last_number=last_number+1 WHERE last_number<9999`).bind(year),
     db.prepare(`INSERT INTO students(id,student_no,first_name,last_name,dob,gender,class_id,parent_id,phone,address,status)
       SELECT ?, 'MATT-'||printf('%04d',?)||'-'||printf('%04d',last_number),?,?,?,?,?,?,?,?,'active'
       FROM student_number_sequences WHERE enrollment_year=? AND last_number BETWEEN 1 AND 9999
       ON CONFLICT(id) DO NOTHING`).bind(sid,year,short(application.first_name,80),short(application.last_name,80),application.dob,short(application.gender,30),chosenClass?.id||null,guardian?.id||null,short(application.guardian_phone||application.phone,40),address,year),
     db.prepare('UPDATE admissions SET status=?,student_id=?,updated_at=? WHERE id=?').bind('accepted',sid,iso(),application.id)
    ]);
    await audit(db,user,'enrol','admission',application.id,`Student ${sid}`);
    let invitation={invitation_status:'not_attempted'};
    try{invitation=await inviteGuardianAfterAcceptance(db,env,req,{...application,student_id:sid},user);}
    catch(err){await audit(db,user,'guardian_invitation_error','admission',application.id,short(err.message,150));invitation={invitation_status:'error'};}
    return json({ok:true,student_id:sid,enrolled:true,...invitation});
   }
   if(application.student_id)error('This pupil is already enrolled. Update their student profile instead of reversing acceptance.',409);
   await run(db,'UPDATE admissions SET status=?,updated_at=? WHERE id=?',b.status,iso(),b.id);
   await audit(db,user,'review','admission',b.id,b.status);return json({ok:true});
  }
 }
 if(path==='/api/attendance'){
  if(method==='GET'){const s=studentScope(user),day=short(u.searchParams.get('date')||nowDate(),10);const rows=await all(db,`SELECT a.*,s.first_name,s.last_name,s.class_id FROM attendance a JOIN students s ON s.id=a.student_id WHERE ${s.where} AND (?='' OR a.date=?) ORDER BY s.first_name`,...s.args,u.searchParams.has('date')?day:'',u.searchParams.has('date')?day:'');return json({items:rows});}
   requireRole(user,'admin','staff','teacher');
   if(method==='POST'){
    const b=await input(req),records=Array.isArray(b.records)?b.records:[b];
    if(!records.length||records.length>100)error('Choose 1–100 attendance records');
    const alertFamilies=b.notify_guardians===true,seen=new Set(),prepared=[];
    // Verify all records, including teacher scope, before writing any.
    for(const a of records){
     if(!a||!a.student_id||!['present','absent','late','excused'].includes(a.status)||!isDate(a.date))
      error('Choose a valid attendance status and date for each selected pupil');
     const key=a.student_id+'|'+a.date;
     if(seen.has(key))error('Duplicate pupil attendance entry',400);
     seen.add(key);
     const pupil=await permittedStudent(db,user,a.student_id);
     if(pupil.status!=='active')error('Attendance can only be recorded for active pupils',400);
     if(alertFamilies&&a.date!==schoolLocalDate())error('Family absence alerts can only be sent for today’s register',400);
     const previous=alertFamilies?await first(db,'SELECT status FROM attendance WHERE student_id=? AND date=?',a.student_id,a.date):null;
     prepared.push({student_id:a.student_id,date:a.date,status:a.status,note:short(a.note,300),newAbsence:alertFamilies&&a.status==='absent'&&previous?.status!=='absent'});
    }
    await db.batch(prepared.map(a=>db.prepare(
     'INSERT INTO attendance(id,student_id,date,status,note,recorded_by) VALUES(?,?,?,?,?,?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status,note=excluded.note,recorded_by=excluded.recorded_by'
    ).bind(id(),a.student_id,a.date,a.status,a.note,user.id)));
    try{await audit(db,user,'record','attendance','',prepared.length+' records');}catch{}
    for(const a of prepared.filter(x=>x.newAbsence)){
     await notifyLinkedGuardianInApp(db,a.student_id,'attendance',a.student_id+'|'+a.date,
      'Attendance update','An absence has been recorded for {student}. Please open the secure attendance record.','attendance');
    }
    const alert_results={eligible:0,sent:0,not_sent:0,no_guardian_email:0,already_attempted:0};
    for(const a of prepared.filter(x=>x.newAbsence)){
     alert_results.eligible++;
     try{
      const result=await notifyGuardianOfAbsence(db,env,a.student_id,a.date,user);
      alert_results[result]=(alert_results[result]||0)+1;
     }catch{alert_results.not_sent++;}
    }
    return json({ok:true,count:prepared.length,alert_results});
   }
 }
 if(path==='/api/homework'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT h.*,s.first_name,s.last_name,s.class_id,u.name AS teacher_name FROM homework h JOIN students s ON s.id=h.student_id LEFT JOIN users u ON u.id=h.assigned_by WHERE ${s.where} ORDER BY h.due_date DESC,h.created_at DESC LIMIT 500`,...s.args)});}
  requireRole(user,'admin','staff','teacher');const b=await input(req);
  if(method==='POST'){
   await permittedStudent(db,user,b.student_id);
   if(!['hifdh','murajaa','qaaidah','islamic_studies'].includes(b.type)||!isDate(b.due_date))
    error('Choose a subject and valid due date');
   if(['hifdh','murajaa'].includes(b.type))checkQuranRange(b);
   if(['qaaidah','islamic_studies'].includes(b.type)&&!short(b.page_number,50))error('Page number required');
   const hid=id();
   await run(db,'INSERT INTO homework(id,student_id,type,surah_from,verse_from,surah_to,verse_to,page_number,comments,due_date,assigned_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)',hid,b.student_id,b.type,short(b.surah_from,100),['hifdh','murajaa'].includes(b.type)?Number(b.verse_from):null,short(b.surah_to,100),['hifdh','murajaa'].includes(b.type)?Number(b.verse_to):null,short(b.page_number,50),short(b.comments,1000),b.due_date,user.id);
   await audit(db,user,'assign','homework',hid);
   await notifyLinkedGuardianInApp(db,b.student_id,'homework',hid,'New learning assignment',
    'A new assignment has been added for {student}. Sign in to view the details.','homework');
   let notification={notification_status:'not_sent'};
   try{
    notification=await notifyGuardianAboutRecord(db,env,b.student_id,'homework',{...b,id:hid},user);
   }catch(err){
    try{await audit(db,user,'parent_homework_notification_error','homework',hid,short(err.message,150));}catch{}
   }
   return json({ok:true,id:hid,...notification});
  }
  if(method==='PATCH'){const h=await first(db,'SELECT * FROM homework WHERE id=?',b.id);if(!h)error('Homework not found',404);await permittedStudent(db,user,h.student_id);if(!['complete','incomplete'].includes(b.status))error('Invalid status');await run(db,'UPDATE homework SET status=?,teacher_feedback=?,completed_at=? WHERE id=?',b.status,short(b.teacher_feedback,1000),b.status==='complete'?iso():null,b.id);await audit(db,user,'grade','homework',b.id,b.status);return json({ok:true});}
  if(method==='DELETE'){requireRole(user,'admin','staff');const h=await first(db,'SELECT student_id FROM homework WHERE id=?',b.id);if(!h)error('Homework not found',404);await run(db,'DELETE FROM homework WHERE id=?',b.id);await audit(db,user,'delete','homework',b.id);return json({ok:true});}
 }
 if(path==='/api/behaviour-catalog'&&method==='GET')return json({items:CATALOG});
 if(path==='/api/behaviour'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT b.*,s.first_name,s.last_name,u.name AS recorded_by_name FROM behaviour b JOIN students s ON s.id=b.student_id LEFT JOIN users u ON u.id=b.recorded_by WHERE ${s.where} ORDER BY b.created_at DESC LIMIT 600`,...s.args)});}
  requireRole(user,'admin','staff','teacher');const b=await input(req);
  if(method==='POST'){await permittedStudent(db,user,b.student_id);const c=CATALOG.find(x=>x.code===b.reason_code);if(!c)error('Behaviour type not recognised');const bid=id();await run(db,'INSERT INTO behaviour(id,student_id,reason_code,description,points,notes,recorded_by) VALUES(?,?,?,?,?,?,?)',bid,b.student_id,c.code,c.label,c.points,short(b.notes,800),user.id);await audit(db,user,'record','behaviour',bid,`${c.label}: ${c.points}`);
   await notifyLinkedGuardianInApp(db,b.student_id,'behaviour',bid,'Learning and character update',
    'A new learning and character update is available for {student} in the private portal.','behaviour');
   let notification={notification_status:'not_sent'};
   try{
    notification=await notifyGuardianAboutRecord(db,env,b.student_id,'behaviour',{id:bid,points:c.points,description:c.label},user);
   }catch(err){
    try{await audit(db,user,'parent_behaviour_notification_error','behaviour',bid,short(err.message,150));}catch{}
   }
   return json({ok:true,id:bid,...notification});}
  if(method==='DELETE'){requireRole(user,'admin');await run(db,'DELETE FROM behaviour WHERE id=?',b.id);await audit(db,user,'remove','behaviour',b.id);return json({ok:true});}
 }
 if(path==='/api/fees/bulk' && method==='POST'){
  const user=await session(req,env);if(!user)error('Your session has expired. Please sign in.',401);
  requireRole(user,'admin','staff');
  const b=await input(req);
  if(b.confirm!=='ISSUE_BULK_INVOICES')error('Bulk invoice confirmation required',400);
  if(!['all','selected'].includes(b.mode))error('Select all or selected students',400);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(b.period||'')))error('Valid billing month required',400);
  if(!isMoney(b.amount_pence)||Number(b.amount_pence)<1)error('Valid positive amount required',400);
  if(b.due_date&&!isDate(b.due_date))error('Valid due date required',400);
  if(method!=='GET'){const received=req.headers.get('x-csrf-token');if(!received||!(await safeEqual(await sha(received),user.csrf_hash)))error('Security token expired. Reload your page.',403);}
  const roster=await all(db,"SELECT id FROM students WHERE status='active' ORDER BY id");
  const activeIds=new Set(roster.map(x=>x.id));
  let targets;
  if(b.mode==='all')targets=roster.map(x=>x.id);
  else{
    if(!Array.isArray(b.student_ids)||b.student_ids.length>1000)error('Select between 1 and 1000 active students',400);
    targets=[...new Set(b.student_ids)];
    if(targets.some(x=>typeof x!=='string'||!activeIds.has(x)))error('Selection includes an inactive or unknown student',400);
  }
  if(!targets.length)error('No active students selected for invoicing',400);
  // D1 batch executes each chunk transactionally. INSERT OR IGNORE prevents duplicate monthly invoices.
  let created=0;
  for(let i=0;i<targets.length;i+=75){
    const group=targets.slice(i,i+75);
    const ops=group.map(sid=>db.prepare('INSERT OR IGNORE INTO fee_invoices(id,student_id,period,amount_pence,due_date) VALUES(?,?,?,?,?)').bind(id(),sid,b.period,Number(b.amount_pence),b.due_date||null));
    const results=await db.batch(ops);
    created+=results.reduce((n,r)=>n+Number(r.meta?.changes||0),0);
  }
  await audit(db,user,'bulk-issue','invoice','',`${b.mode}: ${created}/${targets.length} created for ${b.period}`);
  return json({ok:true,selected:targets.length,created,skipped:targets.length-created,period:b.period});
 }
 if(path==='/api/fees'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT f.*,s.first_name,s.last_name,(SELECT COALESCE(SUM(p.amount_pence),0) FROM payments p WHERE p.invoice_id=f.id) AS paid_pence FROM fee_invoices f JOIN students s ON s.id=f.student_id WHERE ${s.where} ORDER BY f.period DESC,s.first_name`,...s.args)});}
  requireRole(user,'admin','staff');if(method==='POST'){const b=await input(req);await permittedStudent(db,user,b.student_id);if(!/^\d{4}-\d{2}$/.test(b.period||'')||!isMoney(b.amount_pence))error('Period (YYYY-MM) and positive amount required');const fid=id();await run(db,'INSERT INTO fee_invoices(id,student_id,period,amount_pence,due_date) VALUES(?,?,?,?,?)',fid,b.student_id,b.period,Number(b.amount_pence),b.due_date||null);await audit(db,user,'issue','invoice',fid);
   await notifyLinkedGuardianInApp(db,b.student_id,'invoice',fid,'New fee statement',
    'A fee statement is available for {student}. Please open your secure fee account.','fees');
   let notification={notification_status:'not_sent'};
   try{notification=await financeEmailForInvoice(db,env,fid,'issued',user);}
   catch(e){try{await audit(db,user,'fee_notification_error','invoice',fid,short(e.message,160));}catch{}}
   return json({ok:true,id:fid,...notification});}
 }
 if(path==='/api/fees/notify' && method==='POST'){
  requireRole(user,'admin','staff');
  const b=await input(req);
  if(!b.invoice_id)error('Select an invoice',400);
  const invoice=await first(db,'SELECT id,student_id FROM fee_invoices WHERE id=?',b.invoice_id);
  if(!invoice)error('Invoice not found',404);
  let result={notification_status:'not_sent'};
  try{result=await financeEmailForInvoice(db,env,invoice.id,'reminder',user);}
  catch(err){try{await audit(db,user,'fee_reminder_error','invoice',invoice.id,short(err.message,150));}catch{}}
  return json({ok:true,...result});
 }
 if(path==='/api/payments'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT p.*,s.first_name,s.last_name,f.period FROM payments p JOIN students s ON s.id=p.student_id JOIN fee_invoices f ON f.id=p.invoice_id WHERE ${s.where} ORDER BY p.created_at DESC`,...s.args)});}
  requireRole(user,'admin','staff');if(method==='POST'){const b=await input(req),f=await first(db,'SELECT * FROM fee_invoices WHERE id=?',b.invoice_id);if(!f)error('Invoice not found',404);if(!isMoney(b.amount_pence)||Number(b.amount_pence)<=0)error('Valid payment amount required');const paid=await first(db,'SELECT COALESCE(SUM(amount_pence),0) AS total FROM payments WHERE invoice_id=?',f.id);if(Number(b.amount_pence)>f.amount_pence-paid.total)error('Payment exceeds outstanding invoice balance');const pid=id();await run(db,'INSERT INTO payments(id,invoice_id,student_id,amount_pence,method,reference,recorded_by) VALUES(?,?,?,?,?,?,?)',pid,f.id,f.student_id,Number(b.amount_pence),short(b.method,30)||'manual',short(b.reference,120),user.id);await audit(db,user,'payment','invoice',f.id,`${b.amount_pence} pence`);
   await notifyLinkedGuardianInApp(db,f.student_id,'payment',pid,'Payment recorded',
    'A payment has been recorded for {student}. View the receipt in your secure fee account.','fees');
   let notification={notification_status:'not_sent'};
   try{notification=await financeEmailForInvoice(db,env,f.id,'receipt',user,Number(b.amount_pence));}
   catch(e){try{await audit(db,user,'fee_receipt_error','invoice',f.id,short(e.message,160));}catch{}}
   return json({ok:true,id:pid,...notification});}
 }
 if(path==='/api/announcements'){
  if(method==='GET'){let rows=await all(db,'SELECT a.*,u.name AS author FROM announcements a LEFT JOIN users u ON a.created_by=u.id ORDER BY a.created_at DESC LIMIT 100');return json({items:rows.filter(x=>x.audience==='all'||x.audience===user.role||user.role==='admin'||user.role==='staff')});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST'){if(!b.title||!b.body)error('Title and message required');if(!['all','parent','teacher','staff','admin'].includes(b.audience||'all'))error('Invalid audience');const aid=id();await run(db,'INSERT INTO announcements(id,title,body,audience,created_by) VALUES(?,?,?,?,?)',aid,short(b.title,150),short(b.body,2500),b.audience||'all',user.id);await audit(db,user,'publish','announcement',aid);return json({ok:true});}
  if(method==='DELETE'){requireRole(user,'admin','staff');await run(db,'DELETE FROM announcements WHERE id=?',b.id);return json({ok:true});}
 }

 // Threaded private portal conversations. Only actual participants can reply.
 // Recipient is derived from the root message for all replies, never trusted from the client.
 if(path==='/api/messages'){
  if(method==='GET'){
   const scope=user.role==='admin'||user.role==='staff'
    ?{where:'1=1',args:[]}
    :user.role==='parent'
     ?{where:"(m.recipient_id=? OR m.created_by=?) AND (m.student_id IS NULL OR EXISTS (SELECT 1 FROM students s WHERE s.id=m.student_id AND s.parent_id=?))",args:[user.id,user.id,user.id]}
     :{where:"(m.recipient_id=? OR m.created_by=?) AND (m.student_id IS NULL OR EXISTS (SELECT 1 FROM students s JOIN classes c ON c.id=s.class_id WHERE s.id=m.student_id AND c.teacher_id=?))",args:[user.id,user.id,user.id]};
   return json({items:await all(db,`SELECT m.*,COALESCE(m.thread_root_id,m.id) AS conversation_id,
     receiver.name AS recipient_name,sender.name AS sender_name
     FROM messages m LEFT JOIN users receiver ON receiver.id=m.recipient_id
     LEFT JOIN users sender ON sender.id=m.created_by
     WHERE ${scope.where} ORDER BY m.created_at DESC,m.id DESC LIMIT 500`,...scope.args)});
  }
  if(method==='PATCH'){
   const b=await input(req);if(!b.id)error('Message ID required');
   const message=await first(db,'SELECT recipient_id FROM messages WHERE id=?',short(b.id,100));
   if(!message)error('Message not found',404);
   if(message.recipient_id!==user.id)error('Only the recipient can mark this message read',403);
   await run(db,'UPDATE messages SET read_at=COALESCE(read_at,?) WHERE id=?',iso(),short(b.id,100));
   return json({ok:true});
  }
  if(method==='POST'){
   const b=await input(req);
   if(typeof b.body!=='string'||!b.body.trim()||b.body.length>3000)error('Write a message of up to 3000 characters');
   let target=null,subject='',linkedPupil=null,threadRoot=null;
   if(b.reply_to){
    const root=await first(db,'SELECT * FROM messages WHERE id=? AND thread_root_id IS NULL',short(b.reply_to,100));
    if(!root)error('Conversation not found',404);
    if(user.id!==root.created_by&&user.id!==root.recipient_id)
     error('Only a participant can reply to this conversation',403);
    if(root.student_id){
     // Guardian/class link changes must immediately revoke access to pupil messages.
     linkedPupil=await permittedStudent(db,user,root.student_id);
    }
    threadRoot=root.id;
    target=await first(db,'SELECT id,name,email,role,active FROM users WHERE id=?',
     user.id===root.created_by?root.recipient_id:root.created_by);
    if(!target?.active)error('The other participant is not an active account',409);
    subject=short(root.subject,160);
    if(b.recipient_id&&b.recipient_id!==target.id)error('The recipient cannot be changed during a reply',403);
   }else{
    requireRole(user,'admin','staff','teacher','parent');
    if(typeof b.subject!=='string'||!b.subject.trim()||b.subject.length>160)error('Subject required (up to 160 characters)');
    if(!b.recipient_id)error('Select a recipient');
    target=await first(db,'SELECT id,name,email,role,active FROM users WHERE id=?',short(b.recipient_id,100));
    if(!target?.active)error('Select an active recipient',404);
    if(target.id===user.id)error('Choose a different recipient');
    if(user.role==='teacher'){
     if(target.role!=='parent')error('Teachers can only message linked guardians',403);
     const linked=await first(db,'SELECT s.id FROM students s JOIN classes c ON c.id=s.class_id WHERE s.parent_id=? AND c.teacher_id=? LIMIT 1',target.id,user.id);
     if(!linked)error('Recipient is not a guardian in your assigned class',403);
    }
    if(user.role==='parent'){
     // Parent-initiated correspondence must be for their own active pupil
     // and addressed only to that pupil's currently assigned lead teacher.
     if(!b.student_id)error('Select your linked pupil before messaging a teacher');
     linkedPupil=await permittedStudent(db,user,short(b.student_id,100));
     if(linkedPupil.status!=='active')error('Messages require an actively enrolled pupil',403);
     const assignment=await first(db,'SELECT teacher_id FROM classes WHERE id=?',linkedPupil.class_id);
     if(target.role!=='teacher'||assignment?.teacher_id!==target.id)
      error('Parents can only contact their own child’s assigned teacher',403);
    }
    if(b.student_id){
     linkedPupil=await permittedStudent(db,user,short(b.student_id,100));
     if(target.role==='parent'&&linkedPupil.parent_id!==target.id)
      error('The selected pupil is not linked to this recipient',403);
    }
    subject=short(b.subject,160);
   }
   const mid=id();
   await run(db,'INSERT INTO messages(id,recipient_id,subject,body,student_id,created_by,thread_root_id) VALUES(?,?,?,?,?,?,?)',
    mid,target.id,subject,short(b.body,3000),linkedPupil?.id||null,user.id,threadRoot);
   try{await audit(db,user,threadRoot?'reply':'send','message',mid,threadRoot?'thread '+threadRoot:'private conversation');}catch{}
   await createInboxNotification(db,target.id,linkedPupil?.id||null,'message',mid,
    'New private message','A private message is waiting for you in the Communications Centre.','communications');
   let notification_status='not_sent';
   if(env.RESEND_API_KEY&&env.EMAIL_FROM&&!env.EMAIL_FROM.includes('example.org')){
    // Email is a generic inbox alert: no message text, learner name or confidential metadata.
    const emailHtml=`<div style="background:#f2f5fb;padding:28px 14px;font-family:Arial,sans-serif;color:#243b61">
      <div style="max-width:560px;margin:auto;background:#fff;padding:28px;border-radius:12px">
      <h2 style="color:#19345e">Madrasah At-Towfiq · Private message</h2>
      <p>Assalamu alaikum. A new private message${linkedPupil?' concerning <strong>'+escapeHtml([linkedPupil.first_name,linkedPupil.last_name].filter(Boolean).join(' '))+'</strong>':''} is waiting in your secure Madrasah At-Towfiq portal inbox.</p>
      <p>For your privacy, the message content is not included in this email.</p>
      <a href="https://portal.attowfiqmasjid.org/" style="background:#376ac5;color:white;padding:12px 16px;border-radius:8px;display:inline-block;text-decoration:none">Open secure portal</a>
      </div></div>`;
    try{const result=await mail(env,target.email,'New private portal message | Madrasah At-Towfiq',emailHtml,{replyTo:env.ADMISSIONS_EMAIL});
     notification_status=result.sent?'sent':'not_sent';}
    catch(err){try{await audit(db,user,'message_email_failed','message',mid,short(err.message,160));}catch{}}
   }
   return json({ok:true,id:mid,conversation_id:threadRoot||mid,notification_status});
  }
  error('Method not allowed',405);
 }
 if(path==='/api/events'){
  if(method==='GET')return json({items:await all(db,'SELECT * FROM events ORDER BY event_date ASC LIMIT 200')});requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST'){if(!b.title||!isDate(b.event_date))error('Event title and valid date required');const eid=id();await run(db,'INSERT INTO events(id,title,event_date,description,category) VALUES(?,?,?,?,?)',eid,short(b.title,150),b.event_date,short(b.description,1500),short(b.category,50)||'community');await audit(db,user,'create','event',eid);return json({ok:true});}
  if(method==='DELETE'){await run(db,'DELETE FROM events WHERE id=?',b.id);return json({ok:true});}
 }
 if(path==='/api/quizzes'){
  if(method==='GET'){const qs=await all(db,'SELECT id,question,options_json,category,created_at FROM quizzes ORDER BY created_at DESC LIMIT 100');const answered=await all(db,'SELECT quiz_id,answer_index,is_correct,points FROM quiz_attempts WHERE user_id=?',user.id);return json({items:qs.map(q=>({...q,options:JSON.parse(q.options_json)})),attempts:answered});}
  requireRole(user,'admin','staff','teacher');if(method==='POST'){const b=await input(req);if(!b.question||!Array.isArray(b.options)||b.options.length!==4||!Number.isInteger(Number(b.answer_index))||b.answer_index<0||b.answer_index>3)error('Question, four answers and correct option required');const qid=id();await run(db,'INSERT INTO quizzes(id,question,options_json,answer_index,category) VALUES(?,?,?,?,?)',qid,short(b.question,500),JSON.stringify(b.options.map(x=>short(x,250))),b.answer_index,short(b.category,60)||'Islamic Knowledge');await audit(db,user,'create','quiz',qid);return json({ok:true});}
 }
 if(path==='/api/quizzes/answer'&&method==='POST'){const b=await input(req),q=await first(db,'SELECT * FROM quizzes WHERE id=?',b.quiz_id);if(!q)error('Quiz not found',404);const chosen=Number(b.answer_index);if(!Number.isInteger(chosen)||chosen<0||chosen>3)error('Invalid answer');const correct=chosen===q.answer_index;await run(db,'INSERT INTO quiz_attempts(id,quiz_id,user_id,answer_index,is_correct,points) VALUES(?,?,?,?,?,?)',id(),q.id,user.id,chosen,correct?1:0,correct?10:0);return json({ok:true,correct,correct_index:q.answer_index,points:correct?10:0});}
 if(path==='/api/leaderboard'&&method==='GET')return json({items:await all(db,'SELECT u.name,COUNT(a.id) AS played,SUM(a.points) AS points FROM quiz_attempts a JOIN users u ON u.id=a.user_id GROUP BY a.user_id ORDER BY points DESC,played DESC LIMIT 30')});
 if(path==='/api/settings'){
  if(method==='GET')return json({items:await all(db,'SELECT * FROM school_settings ORDER BY key')});requireRole(user,'admin');const b=await input(req);if(method==='POST'){if(!['monthly_fee_pence','school_email','school_phone','school_address','academic_year','jumah_schedule','jumah_message','jumah_enabled','brand_note'].includes(b.key))error('Invalid setting');await run(db,'INSERT INTO school_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',b.key,short(b.value,1200));await audit(db,user,'setting','settings',b.key);return json({ok:true});}
 }

 if(path==='/api/compliance/consents'&&method==='GET'){
  requireRole(user,'admin','staff');
  const items=await all(db,`SELECT s.id AS student_id,s.student_no,s.first_name,s.last_name,c.name AS class_name,
   a.id AS admission_id,a.consent_first_aid,a.consent_photos,a.created_at AS declared_at
   FROM students s LEFT JOIN classes c ON c.id=s.class_id
   LEFT JOIN admissions a ON a.id=(SELECT id FROM admissions WHERE student_id=s.id AND status='accepted'
      ORDER BY created_at DESC LIMIT 1)
   WHERE s.status='active' ORDER BY s.last_name,s.first_name LIMIT 1500`);
  return json({items});
 }
 if(path==='/api/compliance/policies'){
  requireRole(user,'admin','staff');
  if(method==='GET')return json({items:await all(db,'SELECT p.*,u.name AS recorded_by_name FROM compliance_policies p LEFT JOIN users u ON u.id=p.created_by ORDER BY CASE WHEN p.status=\'current\' THEN 0 WHEN p.status=\'draft\' THEN 1 ELSE 2 END,p.review_due,p.title LIMIT 300')});
  requireRole(user,'admin');
  if(method!=='POST'&&method!=='PATCH')error('Method not allowed',405);
  const b=await input(req),existing=method==='PATCH'
   ?await first(db,'SELECT id FROM compliance_policies WHERE id=?',short(b.id,100)):null;
  if(method==='PATCH'&&!existing)error('Policy record not found',404);
  const title=short(b.title,160),category=short(b.category,32),status=short(b.status,16);
  if(!title)error('Policy title required');
  if(!['safeguarding','data_protection','health_safety','education','other'].includes(category))error('Invalid policy category');
  if(!['draft','current','retired'].includes(status))error('Invalid policy status');
  if(b.review_due&&!isDate(b.review_due))error('Choose a valid next review date');
  if(typeof b.notes!=='string'||b.notes.length>1200)error('Review notes cannot exceed 1200 characters');
  const recordId=existing?.id||id();
  if(existing){
   await run(db,'UPDATE compliance_policies SET title=?,category=?,version=?,owner=?,review_due=?,status=?,notes=?,updated_at=? WHERE id=?',
    title,category,short(b.version,32)||'1.0',short(b.owner,120),b.review_due||null,status,short(b.notes,1200),iso(),recordId);
  }else{
   await run(db,'INSERT INTO compliance_policies(id,title,category,version,owner,review_due,status,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?)',
    recordId,title,category,short(b.version,32)||'1.0',short(b.owner,120),b.review_due||null,status,short(b.notes,1200),user.id);
  }
  await audit(db,user,existing?'update':'create','compliance_policy',recordId,status);
  return json({ok:true,id:recordId});
 }
 if(path==='/api/compliance/concerns'){
  requireRole(user,'admin','staff');
  if(method==='GET'){
   const rows=user.role==='admin'
    ?await all(db,`SELECT c.*,u.name AS reported_by_name FROM compliance_concerns c LEFT JOIN users u ON u.id=c.reported_by ORDER BY c.created_at DESC LIMIT 300`)
    :await all(db,`SELECT c.*,u.name AS reported_by_name FROM compliance_concerns c LEFT JOIN users u ON u.id=c.reported_by WHERE c.reported_by=? ORDER BY c.created_at DESC LIMIT 100`,user.id);
   return json({items:rows});
  }
  if(method!=='POST'&&method!=='PATCH')error('Method not allowed',405);
  const b=await input(req),existing=method==='PATCH'
   ?await first(db,'SELECT * FROM compliance_concerns WHERE id=?',short(b.id,100)):null;
  if(method==='PATCH'){requireRole(user,'admin');if(!existing)error('Concern record not found',404);}
  const kind=existing?.kind||short(b.kind,40),title=existing?.title||short(b.title,180),occurred=existing?.occurred_on||short(b.occurred_on,10);
  if(!['privacy_request','possible_breach','access_review','operational'].includes(kind))error('Choose a concern category');
  if(!title||!isDate(occurred))error('Concern title and valid occurrence date required');
  if(typeof b.description!=='string'||b.description.length>2000
   ||typeof b.action_taken!=='string'||b.action_taken.length>2000)error('Description or action notes exceed 2000 characters');
  const status=method==='POST'?'open':short(b.status,20);
  if(!['open','in_review','closed'].includes(status))error('Invalid concern status');
  const recordId=existing?.id||id();
  if(existing){
   await run(db,'UPDATE compliance_concerns SET description=?,action_taken=?,status=?,updated_at=? WHERE id=?',
    short(b.description,2000),short(b.action_taken,2000),status,iso(),recordId);
  }else{
   await run(db,'INSERT INTO compliance_concerns(id,kind,title,occurred_on,description,action_taken,status,reported_by) VALUES(?,?,?,?,?,?,?,?)',
    recordId,kind,title,occurred,short(b.description,2000),short(b.action_taken,2000),'open',user.id);
  }
  await audit(db,user,existing?'update':'create','compliance_concern',recordId,kind+' '+status);
  return json({ok:true,id:recordId});
 }

 // Administrator-only DBS register. A DBS certificate has no statutory expiry date:
 // review_due is a school-defined renewal/recheck date, not a certificate expiry.
 if(path==='/api/compliance/dbs'){
  requireRole(user,'admin');
  if(method==='GET'){
   const rows=await all(db,`SELECT u.id AS staff_id,u.name AS staff_name,u.role,u.active,
     d.id AS check_id,d.check_level,d.issued_on,d.review_due,d.reference_last4,d.checked_on,
     d.document_uploaded_at,d.document_purge_after,d.document_received_at,d.updated_at
     FROM users u LEFT JOIN staff_dbs_checks d ON d.user_id=u.id
     WHERE u.role IN ('admin','staff','teacher') AND u.active=1
     ORDER BY u.role,u.name LIMIT 500`);
   const items=rows.map(x=>x.review_due?{...x,...dbsNotice(x.review_due)}:{...x,alert:'not_recorded',days_remaining:null});
   const warnings=items.filter(x=>['overdue','due_soon'].includes(x.alert));
   return json({items,warnings:warnings.length,overdue:items.filter(x=>x.alert==='overdue').length,window_days:60,storage_ready:!!env.DBS_FILES});
  }
  error('DBS metadata must be submitted through the certificate verification form',405);
 }
 // Create or revise a DBS check and upload its evidence as one protected operation.
 // A new check (or a previously unverified/legacy entry) cannot be saved without
 // a real certificate file being securely retained by the private R2 bucket.
 if(path==='/api/compliance/dbs/submit'&&method==='POST'){
  requireRole(user,'admin');
  if(Number(req.headers.get('content-length')||0)>DBS_MAX_FILE_BYTES+12000)
   error('DBS form exceeds permitted 3 MB file size',413);
  const type=String(req.headers.get('content-type')||'');
  if(!type.toLowerCase().startsWith('multipart/form-data;'))error('Submit a form with a DBS certificate file',415);
  const form=await req.formData();
  const staffId=short(form.get('staff_id'),100);
  const staff=await first(db,"SELECT id FROM users WHERE id=? AND active=1 AND role IN ('admin','staff','teacher')",staffId);
  if(!staff)error('Select an active staff account',404);
  const previous=await first(db,'SELECT * FROM staff_dbs_checks WHERE user_id=?',staff.id);
  const level=short(form.get('check_level'),30);
  const issued=short(form.get('issued_on'),10);
  const due=short(form.get('review_due'),10);
  const refSuffix=short(form.get('reference_last4'),4).toUpperCase();
  const checked=short(form.get('checked_on'),10);
  if(!['basic','standard','enhanced','enhanced_barred'].includes(level))error('Select a DBS check level');
  if(!isDbsDate(issued)||!isDbsDate(due)||issued>due||issued>schoolLocalDate())
   error('Choose a valid issue date and a later school recheck date');
  if(!/^[A-Z0-9]{0,4}$/.test(refSuffix))error('Reference suffix must contain at most four letters or digits');
  if(checked&&(!isDbsDate(checked)||checked>schoolLocalDate()))
   error('Choose a valid historical verification date');

  const upload=form.get('certificate');
  const hasUpload=upload instanceof Blob&&upload.size>0;
  const mustUpload=!previous||!previous.document_received_at||issued!==previous.issued_on;
  if(mustUpload&&!hasUpload)
   error('Upload the actual DBS certificate to save this check. Existing dates without an uploaded certificate are incomplete.');
  if(hasUpload&&!env.DBS_FILES)
   error('Private DBS storage is unavailable. The DBS check has NOT been saved. Verify the DBS_FILES R2 Worker binding.',503);
  if(mustUpload&&!env.DBS_FILES)
   error('Private DBS storage is unavailable. The DBS check has NOT been saved.',503);
  if(hasUpload&&form.get('retention_authorized')!=='YES')
   error('Confirm authorised temporary retention of the uploaded certificate',403);

  let fileData=null,mime=null,newKey=null;
  if(hasUpload){
   if(upload.size<8||upload.size>DBS_MAX_FILE_BYTES)
    error('Choose a PDF, PNG or JPEG certificate no larger than 3 MB');
   fileData=new Uint8Array(await upload.arrayBuffer());
   const pdf=fileData[0]===37&&fileData[1]===80&&fileData[2]===68&&fileData[3]===70&&fileData[4]===45;
   const png=fileData[0]===137&&fileData[1]===80&&fileData[2]===78&&fileData[3]===71&&fileData[4]===13&&fileData[5]===10;
   const jpg=fileData[0]===255&&fileData[1]===216&&fileData[2]===255;
   mime=pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':null;
   if(!mime)error('Only a valid PDF, PNG or JPEG document can be uploaded',415);
   newKey='private/dbs/'+id();
  }

  const at=iso(),purgeAt=hasUpload?new Date(Date.now()+DBS_RETENTION_DAYS*86400000).toISOString():null;
  if(newKey)await env.DBS_FILES.put(newKey,fileData,{httpMetadata:{contentType:mime}});
  const checkId=previous?.id||id();
  try{
   if(previous){
    if(hasUpload){
     await run(db,`UPDATE staff_dbs_checks SET check_level=?,issued_on=?,review_due=?,reference_last4=?,checked_on=?,
      document_key=?,document_mime=?,document_uploaded_at=?,document_purge_after=?,document_received_at=?,updated_by=?,updated_at=? WHERE id=?`,
      level,issued,due,refSuffix,checked||null,newKey,mime,at,purgeAt,at,user.id,at,checkId);
    }else{
     await run(db,`UPDATE staff_dbs_checks SET check_level=?,issued_on=?,review_due=?,reference_last4=?,checked_on=?,updated_by=?,updated_at=? WHERE id=?`,
      level,issued,due,refSuffix,checked||null,user.id,at,checkId);
    }
   }else{
    await run(db,`INSERT INTO staff_dbs_checks(id,user_id,check_level,issued_on,review_due,reference_last4,checked_on,
      document_key,document_mime,document_uploaded_at,document_purge_after,document_received_at,updated_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      checkId,staff.id,level,issued,due,refSuffix,checked||null,newKey,mime,at,purgeAt,at,user.id);
   }
  }catch(err){
   if(newKey)try{await env.DBS_FILES.delete(newKey);}catch(e){console.error('DBS upload rollback cleanup failed',e);}
   throw err;
  }
  if(newKey&&previous?.document_key&&previous.document_key!==newKey){
   try{await env.DBS_FILES.delete(previous.document_key);}
   catch(e){console.error('Old private DBS copy could not be deleted; R2 lifecycle still applies',e);}
  }
  try{await audit(db,user,previous?'update':'create','staff_dbs_check',staff.id,
    hasUpload?'DBS review and certificate received':'DBS recheck date updated');}catch(e){console.error('DBS audit write failed',e);}
  return json({ok:true,id:checkId,certificate_received:hasUpload,
   document_purge_after:purgeAt||previous?.document_purge_after||null});
 }
 if(path==='/api/compliance/dbs/file'){
  requireRole(user,'admin');
  const sid=short(u.searchParams.get('staff_id'),100);
  const record=await first(db,'SELECT * FROM staff_dbs_checks WHERE user_id=?',sid);
  if(!record)error('Register a DBS review first',404);
  if(method==='GET'){
   if(!record.document_key)error('No DBS certificate copy is retained',404);
   if(record.document_purge_after && record.document_purge_after<=iso()){
    if(env.DBS_FILES)await env.DBS_FILES.delete(record.document_key);
    await run(db,'UPDATE staff_dbs_checks SET document_key=NULL,document_mime=NULL,document_uploaded_at=NULL,document_purge_after=NULL WHERE id=?',record.id);
    error('Retention period ended; the certificate copy was removed',410);
   }
   if(!env.DBS_FILES)error('Private DBS document storage is not configured',503);
   const file=await env.DBS_FILES.get(record.document_key);
   if(!file)error('Document not available',404);
   await audit(db,user,'view_file','staff_dbs_check',sid,'Private certificate download');
   return new Response(file.body,{headers:{
    'Content-Type':record.document_mime||'application/octet-stream',
    'Content-Disposition':`attachment; filename="dbs-certificate.${record.document_mime==='application/pdf'?'pdf':record.document_mime==='image/png'?'png':'jpg'}"`,
    'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"sandbox",'Referrer-Policy':'no-referrer'
   }});
  }
  if(method==='DELETE'){
   if(!record.document_key)error('No certificate copy is retained',404);
   if(!env.DBS_FILES)error('Private DBS document storage is not configured',503);
   await env.DBS_FILES.delete(record.document_key);
   await run(db,'UPDATE staff_dbs_checks SET document_key=NULL,document_mime=NULL,document_uploaded_at=NULL,document_purge_after=NULL WHERE id=?',record.id);
   await audit(db,user,'delete_file','staff_dbs_check',sid,'Retained certificate copy securely removed');
   return json({ok:true});
  }
  if(method!=='POST')error('Method not allowed',405);
  if(!env.DBS_FILES)error('Private DBS storage not configured. Set up a private Cloudflare R2 bucket before uploading.',503);
  if(record.document_key)error('Remove the existing certificate copy before uploading another',409);
  if(Number(req.headers.get('content-length')||0)>DBS_MAX_FILE_BYTES+10000)error('Certificate file exceeds 3 MB',413);
  if(!String(req.headers.get('content-type')||'').includes('multipart/form-data'))error('A multipart file upload is required');
  const form=await req.formData();
  if(form.get('retention_authorized')!=='YES')error('Confirm that temporary retention is authorised under the school’s DBS handling policy',403);
  const file=form.get('certificate');
  if(!(file instanceof Blob)||file.size<8||file.size>DBS_MAX_FILE_BYTES)error('Choose a PDF, PNG or JPEG certificate under 3 MB');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10;
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const mime=pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':null;
  if(!mime)error('Only real PDF, PNG or JPEG files are accepted',415);
  const key='private/dbs/'+id();
  await env.DBS_FILES.put(key,bytes,{httpMetadata:{contentType:mime}});
  const purgeAt=new Date(Date.now()+DBS_RETENTION_DAYS*86400000).toISOString();
  try{
   await run(db,'UPDATE staff_dbs_checks SET document_key=?,document_mime=?,document_uploaded_at=?,document_purge_after=?,document_received_at=?,updated_by=?,updated_at=? WHERE id=?',
    key,mime,iso(),purgeAt,iso(),user.id,iso(),record.id);
  }catch(err){await env.DBS_FILES.delete(key);throw err;}
  await audit(db,user,'upload_file','staff_dbs_check',sid,'Restricted certificate copy; automatic purge scheduled');
  return json({ok:true,document_purge_after:purgeAt});
 }

 if(path==='/api/email-log'&&method==='GET'){requireRole(user,'admin');return json({items:await all(db,'SELECT * FROM email_log ORDER BY created_at DESC LIMIT 100')});}
 if(path==='/api/audit'&&method==='GET'){requireRole(user,'admin');return json({items:await all(db,'SELECT a.*,u.name AS actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 150')});}
 if(path==='/api/automation/preview'&&method==='GET'){
  requireRole(user,'admin');const x=await first(db,"SELECT value FROM school_settings WHERE key='jumah_message'");const en=await first(db,"SELECT value FROM school_settings WHERE key='jumah_enabled'");const recipients=await first(db,"SELECT COUNT(*) AS n FROM users WHERE active=1 AND role IN ('parent','teacher','staff')");return json({enabled:en?.value==='true',recipient_count:recipients.n,subject:'Jumu’ah reminder — Madrasah At-Towfiq',body:x?.value||'Assalamu alaikum. Jumu’ah Mubarak. May Allah bless our families, teachers and students. Please remember the etiquettes of Jumu’ah and join us for prayer.'});
 }
 if(path==='/api/automation/send'&&method==='POST'){
  requireRole(user,'admin');if(!env.RESEND_API_KEY||!env.EMAIL_FROM||env.EMAIL_FROM.includes('example.org'))error('Configure a verified Resend sender and RESEND_API_KEY first');const b=await input(req);if(b.confirm!=='SEND_JUMAH')error('Confirmation required');const msg=await first(db,"SELECT value FROM school_settings WHERE key='jumah_message'");const recipients=await all(db,"SELECT email FROM users WHERE active=1 AND role IN ('parent','teacher','staff')");let sent=0;for(const r of recipients){const z=await mail(env,r.email,'Jumu’ah reminder — Madrasah At-Towfiq',`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Madrasah At-Towfiq</h2><p>${escapeHtml(msg?.value||'Assalamu alaikum. Jumu’ah Mubarak. May Allah bless our community.')}</p><p>Masjid At-Towfiq, Bolton</p></div>`);if(z.sent)sent++;}await audit(db,user,'send','jumah','',`${sent} emails`);return json({ok:true,sent,total:recipients.length});
 }
 if(path==='/api/stats'&&method==='GET'){
  const s=studentScope(user);const rows=await all(db,`SELECT s.id FROM students s WHERE ${s.where}`,...s.args);const ids=rows.map(x=>x.id);
  const stats={students:ids.length,classes:(await all(db,'SELECT id FROM classes')).length,people:[],today_attendance:0,homework_pending:0,behaviour_points:0,balance_pence:0};
  if(ids.length){const clause=ids.map(()=>'?').join(',');const [att,home,beh,fees]=await Promise.all([first(db,`SELECT COUNT(*) AS n FROM attendance WHERE student_id IN (${clause}) AND date=? AND status='present'`,...ids,nowDate()),first(db,`SELECT COUNT(*) AS n FROM homework WHERE student_id IN (${clause}) AND status='incomplete'`,...ids),first(db,`SELECT COALESCE(SUM(points),0) AS n FROM behaviour WHERE student_id IN (${clause})`,...ids),first(db,`SELECT COALESCE(SUM(f.amount_pence),0) AS n FROM fee_invoices f WHERE f.student_id IN (${clause})`,...ids)]);const paid=await first(db,`SELECT COALESCE(SUM(amount_pence),0) AS n FROM payments WHERE student_id IN (${clause})`,...ids);Object.assign(stats,{today_attendance:att.n,homework_pending:home.n,behaviour_points:beh.n,balance_pence:fees.n-paid.n});}
  const a=await all(db,'SELECT id,title,created_at FROM announcements ORDER BY created_at DESC LIMIT 4');const upcoming=await all(db,'SELECT * FROM events WHERE event_date>=? ORDER BY event_date LIMIT 4',nowDate());return json({stats,announcements:a,upcoming});
 }
 // Draft progress reports are staff-only; parents see published reports for
 // their currently linked children. A dual-role user in Family view is a parent.
 if(path==='/api/progress-reports'){
  if(method==='GET'){
   const scope=studentScope(user);
   const visible=user.role==='parent'?" AND r.status='published'":'';
   const items=await all(db,`SELECT r.id,r.student_id,r.period,r.hifdh,r.murajaa,r.qaaidah,r.islamic_studies,
    r.summary,r.next_steps,r.status,r.published_at,r.created_at,r.updated_at,
    s.first_name,s.last_name,s.student_no,c.name AS class_name,u.name AS author_name
    FROM pupil_progress_reports r JOIN students s ON s.id=r.student_id
    LEFT JOIN classes c ON c.id=s.class_id
    LEFT JOIN users u ON u.id=r.author_id
    WHERE ${scope.where}${visible} ORDER BY r.period DESC,r.updated_at DESC LIMIT 500`,...scope.args);
   return json({items});
  }
  requireRole(user,'admin','staff','teacher');
  if(method!=='POST'&&method!=='PATCH')error('Method not allowed',405);
  const b=await input(req);
  const existing=method==='PATCH'
   ?await first(db,'SELECT * FROM pupil_progress_reports WHERE id=?',short(b.id,100))
   :null;
  if(method==='PATCH'&&!existing)error('Progress report not found',404);
  if(method==='POST'&&b.id)error('Create a new report without an existing report ID');
  const studentId=existing?.student_id||short(b.student_id,100);
  if(existing&&b.student_id&&b.student_id!==studentId)error('Cannot change the pupil on an existing report');
  const pupil=await permittedStudent(db,user,studentId);
  if(pupil.status!=='active')error('Progress reports can only be created or edited for active pupils');
  const period=existing?.period||short(b.period,7);
  if(!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(period))error('Choose a valid report month');
  if(existing&&b.period&&b.period!==period)error('Cannot change a report period after creation');
  const grades=['','developing','progressing','secure','excellent'];
  const fields=['hifdh','murajaa','qaaidah','islamic_studies'];
  const ratings=fields.map(field=>short(b[field],32));
  if(ratings.some(v=>!grades.includes(v)))error('Choose a valid subject progress level');
  if(typeof b.summary!=='string'||b.summary.length>1200||typeof b.next_steps!=='string'||b.next_steps.length>800)
   error('Report comments exceed the permitted length');
  const summary=short(b.summary,1200),nextSteps=short(b.next_steps,800);
  if(!['draft','published'].includes(b.status))error('Choose Draft or Publish');
  if(b.status==='published'&&(summary.length<10||!ratings.some(Boolean)))
   error('To publish, include a meaningful summary and at least one subject assessment');
  const publishedAt=b.status==='published'
   ?existing?.status==='published'&&existing.published_at||iso():null;
  let reportId=existing?.id;
  if(!existing){
   const duplicate=await first(db,'SELECT id FROM pupil_progress_reports WHERE student_id=? AND period=?',studentId,period);
   if(duplicate)error('A progress report already exists for this pupil and month. Edit the existing report.',409);
   reportId=id();
   await run(db,`INSERT INTO pupil_progress_reports
     (id,student_id,period,hifdh,murajaa,qaaidah,islamic_studies,summary,next_steps,status,author_id,published_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
     reportId,studentId,period,...ratings,summary,nextSteps,b.status,user.id,publishedAt);
  }else{
   await run(db,`UPDATE pupil_progress_reports
    SET hifdh=?,murajaa=?,qaaidah=?,islamic_studies=?,summary=?,next_steps=?,
     status=?,published_at=?,updated_at=?
    WHERE id=? AND student_id=?`,
    ...ratings,summary,nextSteps,b.status,publishedAt,iso(),reportId,studentId);
  }
  try{await audit(db,user,existing?'update':'create','progress_report',reportId,
    period+' '+b.status+(existing?.status!==b.status?' (visibility change)':''));}catch{}
  if(b.status==='published'&&existing?.status!=='published')
   await notifyLinkedGuardianInApp(db,studentId,'progress',reportId,'New progress report',
    'A new monthly progress report is available for {student}. Please sign in to read it.','progress');
  return json({ok:true,id:reportId,status:b.status,published:b.status==='published'});
 }
 if(path==='/api/reports'&&method==='GET'){
  requireRole(user,'admin','staff','teacher');const s=studentScope(user);const summary=await all(db,`SELECT s.id,s.student_no,s.first_name,s.last_name,c.name AS class_name,(SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id AND a.status='present') AS present,(SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id) AS attendance_total,(SELECT COUNT(*) FROM homework h WHERE h.student_id=s.id AND h.status='complete') AS homework_complete,(SELECT COUNT(*) FROM homework h WHERE h.student_id=s.id) AS homework_total,(SELECT COALESCE(SUM(b.points),0) FROM behaviour b WHERE b.student_id=s.id) AS behaviour_points FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE ${s.where} ORDER BY c.name,s.first_name`,...s.args);return json({items:summary});
 }
 if(path==='/api/demo-seed'&&method==='POST')error('New pupils must be enrolled through Admissions',403);
 error('Endpoint not found',404);
}
export default {
 async scheduled(event,env,ctx){
  ctx.waitUntil(purgeOldDbsDocuments(env).catch(err=>console.error('DBS retention purge failed',err)));
  if(event.cron!=='0 8 * * 5')return;
  ctx.waitUntil((async()=>{if(!env.DB||!env.RESEND_API_KEY||!env.EMAIL_FROM||env.EMAIL_FROM.includes('example.org'))return;const v=await first(env.DB,"SELECT value FROM school_settings WHERE key='jumah_enabled'");if(v?.value!=='true')return;const m=await first(env.DB,"SELECT value FROM school_settings WHERE key='jumah_message'");const people=await all(env.DB,"SELECT email FROM users WHERE active=1 AND role IN ('parent','teacher','staff')");for(const p of people){await mail(env,p.email,'Jumu’ah reminder — Madrasah At-Towfiq',`<div style="font-family:Arial,sans-serif"><h2>Madrasah At-Towfiq</h2><p>${escapeHtml(m?.value||'Assalamu alaikum. Jumu’ah Mubarak.')}</p></div>`);}})());
 },
 async fetch(req,env){const url=new URL(req.url);if(!url.pathname.startsWith('/api/')){return env.ASSETS.fetch(req);}
   try{return await handle(req,env);}catch(err){const code=err.status||((/UNIQUE constraint failed/i).test(err.message)?409:500);if(code>=500)console.error(err);return json({error:code>=500?'Unexpected server error':err.message},code);}
 }
};