const ROLES = ['admin','staff','teacher','parent'];
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
const nextIso=(seconds)=>new Date(Date.now()+seconds*1000).toISOString();
const isDate = s=> /^\d{4}-\d{2}-\d{2}$/.test(String(s||'')) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));
const isMoney = x=>Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=100000000;
function requireRole(user,...roles){if(!roles.includes(user.role)) error('You do not have permission to perform this action',403);}
function consented(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)error('Invalid origin',403);const site=req.headers.get('sec-fetch-site');if(site&&!['same-origin','none'].includes(site))error('Cross-site request blocked',403);}
function cookie(req){return req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('at_session='))?.slice(11)||'';}
function setCookie(req,token,age){const secure=new URL(req.url).protocol==='https:'?'; Secure':'';return `at_session=${token}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=${age}`;}
async function session(req,env){const token=cookie(req);if(!token)return null;const digest=await sha(token);const user=await first(env.DB,`SELECT u.id,u.name,u.email,u.role,u.active,s.csrf_hash,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,digest,iso());return user?.active?user:null;}
// Session response constructed separately so cookie is always set on login.
async function signedIn(req,env,user){const token=random(32),csrf=random(24);await run(env.DB,'INSERT INTO sessions(token_hash,csrf_hash,user_id,expires_at) VALUES(?,?,?,?)',await sha(token),await sha(csrf),user.id,nextIso(SESSION_AGE));return json({ok:true,user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf},200,{'Set-Cookie':setCookie(req,token,SESSION_AGE)});}
async function audit(db,user,action,entity,entity_id='',detail=''){await run(db,'INSERT INTO audit_log(id,actor_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)',id(),user?.id||null,action,entity,entity_id,short(detail,600));}
function studentScope(user,alias='s'){if(user.role==='admin'||user.role==='staff')return {where:'1=1',args:[]};if(user.role==='teacher')return {where:`${alias}.class_id IN (SELECT id FROM classes WHERE teacher_id=?)`,args:[user.id]};return {where:`${alias}.parent_id=?`,args:[user.id]};}
async function permittedStudent(db,user,sid){const s=await first(db,'SELECT * FROM students WHERE id=?',sid);if(!s)error('Student not found',404);if(['admin','staff'].includes(user.role))return s;if(user.role==='parent'&&s.parent_id===user.id)return s;if(user.role==='teacher'){const c=await first(db,'SELECT id FROM classes WHERE id=? AND teacher_id=?',s.class_id,user.id);if(c)return s;}error('You are not assigned to this student',403);}
const FIELDS_STUDENT=['first_name','last_name','dob','gender','class_id','parent_id','phone','address','medical_notes','status'];
const CATALOG=[
 ['talking','Talking repeatedly during lessons',-1],['instructions','Not following instructions',-1],['distracting','Distracting other pupils',-1],['unprepared','Being unprepared for lessons repeatedly',-1],['lateness','Repeated lateness without a valid reason',-1],
 ['disrespect','Disrespectful language',-2],['disruption','Deliberately disrupting the lesson',-2],['refusal','Refusing to follow reasonable instructions',-2],['disturbing','Repeatedly disturbing other pupils’ learning',-2],['arguing','Arguing aggressively with another pupil',-3],['swearing','Swearing or using offensive language',-3],['damage','Deliberately damaging property',-4],['bullying','Bullying or repeated intimidation',-5],['threatening','Threatening another pupil',-5],['fighting','Fighting or physical aggression',-5],['harassment','Serious harassment or discriminatory abuse',-5],
 ['punctual','Arriving on time',1],['equipment','Bringing all books and equipment',1],['homework','Completing homework',1],['manners','Showing excellent manners',1],['following','Following instructions promptly',1],['participation','Participating positively in class',1],['helping','Helping another student',2],['respect','Showing exceptional respect to teachers',2],['hifdh-effort','Excellent effort in Qur’an memorisation',2],['leadership','Demonstrating leadership and responsibility',2],['resolution','Helping resolve a disagreement peacefully',3],['improvement','Outstanding improvement in behaviour',3],['kindness','Exceptional act of kindness or character',3]
].map(([code,label,points])=>({code,label,points,category:points>0?'positive':'concern'}));
async function mail(env,to,subject,html){const e=id();if(!env.RESEND_API_KEY||!env.EMAIL_FROM){await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status,error) VALUES(?,?,?,?,?)',e,to,subject,'not_configured','Resend API key or sender not configured');return {sent:false};}try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,html})});if(!r.ok)throw new Error(`Provider returned ${r.status}`);await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status) VALUES(?,?,?,?)',e,to,subject,'sent');return {sent:true};}catch(err){await run(env.DB,'INSERT INTO email_log(id,recipient,subject,status,error) VALUES(?,?,?,?,?)',e,to,subject,'failed',short(err.message));return {sent:false};}}
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
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));await run(db,'UPDATE users SET password_hash=?,password_salt=?,active=1 WHERE id=?',await passwordHash(b.password,salt),salt,row.user_id);await run(db,"DELETE FROM auth_tokens WHERE user_id=? AND purpose='invite'",row.user_id);const user=await first(db,'SELECT * FROM users WHERE id=?',row.user_id);await audit(db,user,'invite_accepted','users',user.id);return signedIn(req,env,user);
 }
 if(path==='/api/auth/forgot'&&method==='POST'){
  const b=await input(req),user=await first(db,'SELECT id,email FROM users WHERE email=? AND active=1',email(b.email));
  if(user&&env.RESEND_API_KEY&&env.EMAIL_FROM){const t=random(32);await run(db,'INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)',await sha(t),user.id,'reset',nextIso(1800));const link=new URL('/?reset='+encodeURIComponent(t),req.url).href;await mail(env,user.email,'Reset your Madrasah At-Towfiq password',`<p>Use this link within 30 minutes to reset your password:</p><p><a href="${escapeHtml(link)}">Reset password</a></p>`);}
  return json({ok:true,message:'If an account exists and email delivery is configured, a reset link will be sent.'});
 }
 if(path==='/api/auth/reset'&&method==='POST'){
  const b=await input(req);if(String(b.password||'').length<12)error('Password must be at least 12 characters');const tok=await sha(String(b.token||''));
  const row=await first(db,"SELECT user_id,expires_at FROM auth_tokens WHERE token_hash=? AND purpose='reset'",tok);if(!row||row.expires_at<iso())error('Reset link expired or invalid');
  const salt=b64(crypto.getRandomValues(new Uint8Array(16)));await run(db,'UPDATE users SET password_salt=?,password_hash=?,failed_logins=0,locked_until=NULL WHERE id=?',salt,await passwordHash(b.password,salt),row.user_id);await run(db,'DELETE FROM auth_tokens WHERE user_id=?',row.user_id);await run(db,'DELETE FROM sessions WHERE user_id=?',row.user_id);return json({ok:true});
 }
 const user=await session(req,env);if(!user)error('Your session has expired. Please sign in.',401);
 if(path==='/api/auth/me'&&method==='GET'){
   const csrf=random(24);await run(db,'UPDATE sessions SET csrf_hash=? WHERE token_hash=?',await sha(csrf),user.token_hash);
   return json({user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf});
 }
 if(method!=='GET'){const received=req.headers.get('x-csrf-token');if(!received||!(await safeEqual(await sha(received),user.csrf_hash)))error('Security token expired. Reload your page.',403);}
 if(path==='/api/auth/logout'&&method==='POST'){await run(db,'DELETE FROM sessions WHERE token_hash=?',user.token_hash);return json({ok:true},200,{'Set-Cookie':setCookie(req,'',0)});}
 if(path==='/api/auth/password'&&method==='POST'){const b=await input(req),r=await first(db,'SELECT password_hash,password_salt FROM users WHERE id=?',user.id);if(!await verifyPassword(b.current_password||'',r.password_salt,r.password_hash))error('Current password is incorrect');if(String(b.new_password||'').length<12)error('New password must be at least 12 characters');const salt=b64(crypto.getRandomValues(new Uint8Array(16)));await run(db,'UPDATE users SET password_hash=?,password_salt=? WHERE id=?',await passwordHash(b.new_password,salt),salt,user.id);await run(db,'DELETE FROM sessions WHERE user_id=? AND token_hash<>?',user.id,user.token_hash);return json({ok:true});}
 if(path==='/api/search'&&method==='GET'){
  const query=short(u.searchParams.get('q')||'',70);if(query.length<2)return json({students:[],homework:[],classes:[]});const like='%'+query.replace(/[\%_]/g,x=>'\\'+x)+'%';const scope=studentScope(user);
  const students=await all(db,`SELECT s.id,s.student_no,s.first_name,s.last_name,c.name AS class_name FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE ${scope.where} AND (s.first_name LIKE ? ESCAPE '\\' OR s.last_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\') LIMIT 10`,...scope.args,like,like,like);
  const homework=await all(db,`SELECT h.id,h.student_id,h.type,h.due_date,s.first_name,s.last_name FROM homework h JOIN students s ON s.id=h.student_id WHERE ${scope.where} AND (h.type LIKE ? ESCAPE '\\' OR s.first_name LIKE ? ESCAPE '\\' OR s.last_name LIKE ? ESCAPE '\\') LIMIT 7`,...scope.args,like,like,like);
  const classes=user.role==='parent'?[]:await all(db,'SELECT id,name,stage FROM classes WHERE name LIKE ? LIMIT 5',like);return json({students,homework,classes});
 }
 if(path==='/api/classes'){
  if(method==='GET'){const c=user.role==='teacher'?await all(db,'SELECT c.*,u.name AS teacher_name,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) AS enrolled FROM classes c LEFT JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=? ORDER BY c.name',user.id):await all(db,'SELECT c.*,u.name AS teacher_name,(SELECT COUNT(*) FROM students s WHERE s.class_id=c.id) AS enrolled FROM classes c LEFT JOIN users u ON u.id=c.teacher_id ORDER BY c.name');return json({items:c});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST'){if(!b.name)error('Class name required');const cid=id();await run(db,'INSERT INTO classes(id,name,stage,teacher_id,capacity,schedule) VALUES(?,?,?,?,?,?)',cid,short(b.name,100),short(b.stage,60)||'Foundation',b.teacher_id||null,Number(b.capacity)||25,short(b.schedule,200));await audit(db,user,'create','class',cid);return json({ok:true,id:cid});}
  if(method==='PATCH'){if(!b.id)error('Class ID required');await run(db,'UPDATE classes SET name=?,stage=?,teacher_id=?,capacity=?,schedule=? WHERE id=?',short(b.name,100),short(b.stage,60),b.teacher_id||null,Number(b.capacity)||25,short(b.schedule,200),b.id);await audit(db,user,'update','class',b.id);return json({ok:true});}
 }
 if(path==='/api/users'){
  requireRole(user,'admin');if(method==='GET')return json({items:await all(db,'SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC')});
  if(method==='POST'){const b=await input(req);if(!b.name||!String(b.email||'').includes('@')||!ROLES.includes(b.role))error('Name, valid email and role required');const uid=id();await run(db,'INSERT INTO users(id,name,email,role,active) VALUES(?,?,?,?,1)',uid,short(b.name,100),email(b.email),b.role);
    const t=random(32);await run(db,"INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)",await sha(t),uid,'invite',nextIso(7*DAY));const link=new URL('/?invite='+encodeURIComponent(t),req.url).href;const mailed=await mail(env,email(b.email),'You are invited to Madrasah At-Towfiq',`<p>Welcome to Madrasah At-Towfiq.</p><p><a href="${escapeHtml(link)}">Activate your account</a></p><p>This link expires in seven days.</p>`);
    await audit(db,user,'invite','users',uid);return json({ok:true,id:uid,invitation_url:mailed.sent?null:link,emailed:mailed.sent});}
  if(method==='PATCH'){const b=await input(req);if(b.id===user.id&&b.active===false)error('Cannot deactivate your own account');if(b.role&&!ROLES.includes(b.role))error('Invalid role');if(b.active===false||(b.role&&b.role!=='admin')){const admins=await first(db,"SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1");const prior=await first(db,'SELECT role FROM users WHERE id=?',b.id);if(prior?.role==='admin'&&admins.n<=1)error('You cannot deactivate or demote the last admin');}await run(db,'UPDATE users SET name=COALESCE(?,name),role=COALESCE(?,role),active=COALESCE(?,active) WHERE id=?',b.name?short(b.name,100):null,b.role||null,b.active===undefined?null:(b.active?1:0),b.id);await audit(db,user,'update','users',b.id);return json({ok:true});}
 }
 if(path==='/api/contacts'&&method==='GET'){
  const contacts=user.role==='parent'?[]:user.role==='teacher'?await all(db,"SELECT DISTINCT u.id,u.name,u.email,u.role FROM users u JOIN students s ON s.parent_id=u.id JOIN classes c ON c.id=s.class_id WHERE c.teacher_id=? AND u.active=1 ORDER BY u.name",user.id):await all(db,"SELECT id,name,email,role FROM users WHERE active=1 AND id<>? ORDER BY name",user.id);return json({items:contacts});
 }
 if(path==='/api/students/bulk'&&method==='POST')error('New pupils must be enrolled through an accepted admission application',403);
 if(path==='/api/students'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT s.*,c.name AS class_name,u.name AS parent_name,(SELECT COALESCE(SUM(points),0) FROM behaviour b WHERE b.student_id=s.id) AS behaviour_score FROM students s LEFT JOIN classes c ON c.id=s.class_id LEFT JOIN users u ON u.id=s.parent_id WHERE ${s.where} ORDER BY s.first_name,s.last_name`,...s.args)});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST')error('New pupils must be enrolled through an accepted admission application',403);
  if(method==='PATCH'){if(!b.id)error('Student ID required');const existing=await first(db,'SELECT * FROM students WHERE id=?',b.id);if(!existing)error('Student not found',404);const obj={...existing};for(const k of FIELDS_STUDENT)if(b[k]!==undefined)obj[k]=b[k];await run(db,'UPDATE students SET first_name=?,last_name=?,dob=?,gender=?,class_id=?,parent_id=?,phone=?,address=?,medical_notes=?,status=? WHERE id=?',...FIELDS_STUDENT.map(k=>obj[k]===null?null:short(obj[k],k==='medical_notes'?600:250)),b.id);await audit(db,user,'update','student',b.id);return json({ok:true});}
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
    await audit(db,user,'create','admission',rid);return json({ok:true,id:rid});
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
    // The admission UUID is reused as the student UUID to make enrolment idempotent.
    // The two changes are one D1 batch transaction, so a failed insert cannot approve a pupil.
    if(!short(application.first_name)||!short(application.last_name)||!isDate(application.dob))error('Complete the pupil name and date of birth before approval');
    const sid=application.student_id||application.id;
    const guardian=await first(db,"SELECT id FROM users WHERE role='parent' AND active=1 AND email=?",email(application.guardian_email));
    const number='AT-'+new Date().getUTCFullYear()+'-'+sid.replace(/-/g,'').slice(0,10).toUpperCase();
    const address=[short(application.home_address,260),short(application.postcode,16)].filter(Boolean).join(', ');
    await db.batch([
     db.prepare(`INSERT INTO students(id,student_no,first_name,last_name,dob,gender,parent_id,phone,address,status)
       VALUES(?,?,?,?,?,?,?,?,?,'active') ON CONFLICT(id) DO NOTHING`).bind(sid,number,short(application.first_name,80),short(application.last_name,80),application.dob,short(application.gender,30),guardian?.id||null,short(application.guardian_phone||application.phone,40),address),
     db.prepare('UPDATE admissions SET status=?,student_id=?,updated_at=? WHERE id=?').bind('accepted',sid,iso(),application.id)
    ]);
    await audit(db,user,'enrol','admission',application.id,`Student ${sid}`);
    return json({ok:true,student_id:sid,enrolled:true});
   }
   if(application.student_id)error('This pupil is already enrolled. Update their student profile instead of reversing acceptance.',409);
   await run(db,'UPDATE admissions SET status=?,updated_at=? WHERE id=?',b.status,iso(),b.id);
   await audit(db,user,'review','admission',b.id,b.status);return json({ok:true});
  }
 }
 if(path==='/api/attendance'){
  if(method==='GET'){const s=studentScope(user),day=short(u.searchParams.get('date')||nowDate(),10);const rows=await all(db,`SELECT a.*,s.first_name,s.last_name,s.class_id FROM attendance a JOIN students s ON s.id=a.student_id WHERE ${s.where} AND (?='' OR a.date=?) ORDER BY s.first_name`,...s.args,u.searchParams.has('date')?day:'',u.searchParams.has('date')?day:'');return json({items:rows});}
  requireRole(user,'admin','staff','teacher');if(method==='POST'){const b=await input(req),records=Array.isArray(b.records)?b.records:[b];if(records.length>100)error('Too many records');let count=0;for(const a of records){await permittedStudent(db,user,a.student_id);if(!['present','absent','late','excused'].includes(a.status)||!isDate(a.date))error('Invalid attendance status or date');await run(db,'INSERT INTO attendance(id,student_id,date,status,note,recorded_by) VALUES(?,?,?,?,?,?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status,note=excluded.note,recorded_by=excluded.recorded_by',id(),a.student_id,a.date,a.status,short(a.note,300),user.id);count++;}await audit(db,user,'record','attendance','',`${count} records`);return json({ok:true,count});}
 }
 if(path==='/api/homework'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT h.*,s.first_name,s.last_name,s.class_id,u.name AS teacher_name FROM homework h JOIN students s ON s.id=h.student_id LEFT JOIN users u ON u.id=h.assigned_by WHERE ${s.where} ORDER BY h.due_date DESC,h.created_at DESC LIMIT 500`,...s.args)});}
  requireRole(user,'admin','staff','teacher');const b=await input(req);
  if(method==='POST'){await permittedStudent(db,user,b.student_id);if(!['hifdh','murajaa','qaaidah','islamic_studies'].includes(b.type)||!isDate(b.due_date))error('Choose subject and a valid due date');if(['hifdh','murajaa'].includes(b.type)&&(!b.surah_from||!b.surah_to||!Number.isInteger(Number(b.verse_from))||!Number.isInteger(Number(b.verse_to))||Number(b.verse_from)<1||Number(b.verse_to)<1))error('Surah and verse range required');if(['qaaidah','islamic_studies'].includes(b.type)&&!b.page_number)error('Page number required');const hid=id();await run(db,'INSERT INTO homework(id,student_id,type,surah_from,verse_from,surah_to,verse_to,page_number,comments,due_date,assigned_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)',hid,b.student_id,b.type,short(b.surah_from,100),b.verse_from?Number(b.verse_from):null,short(b.surah_to,100),b.verse_to?Number(b.verse_to):null,short(b.page_number,50),short(b.comments,1000),b.due_date,user.id);await audit(db,user,'assign','homework',hid);return json({ok:true,id:hid});}
  if(method==='PATCH'){const h=await first(db,'SELECT * FROM homework WHERE id=?',b.id);if(!h)error('Homework not found',404);await permittedStudent(db,user,h.student_id);if(!['complete','incomplete'].includes(b.status))error('Invalid status');await run(db,'UPDATE homework SET status=?,teacher_feedback=?,completed_at=? WHERE id=?',b.status,short(b.teacher_feedback,1000),b.status==='complete'?iso():null,b.id);await audit(db,user,'grade','homework',b.id,b.status);return json({ok:true});}
  if(method==='DELETE'){requireRole(user,'admin','staff');const h=await first(db,'SELECT student_id FROM homework WHERE id=?',b.id);if(!h)error('Homework not found',404);await run(db,'DELETE FROM homework WHERE id=?',b.id);await audit(db,user,'delete','homework',b.id);return json({ok:true});}
 }
 if(path==='/api/behaviour-catalog'&&method==='GET')return json({items:CATALOG});
 if(path==='/api/behaviour'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT b.*,s.first_name,s.last_name,u.name AS recorded_by_name FROM behaviour b JOIN students s ON s.id=b.student_id LEFT JOIN users u ON u.id=b.recorded_by WHERE ${s.where} ORDER BY b.created_at DESC LIMIT 600`,...s.args)});}
  requireRole(user,'admin','staff','teacher');const b=await input(req);
  if(method==='POST'){await permittedStudent(db,user,b.student_id);const c=CATALOG.find(x=>x.code===b.reason_code);if(!c)error('Behaviour type not recognised');const bid=id();await run(db,'INSERT INTO behaviour(id,student_id,reason_code,description,points,notes,recorded_by) VALUES(?,?,?,?,?,?,?)',bid,b.student_id,c.code,c.label,c.points,short(b.notes,800),user.id);await audit(db,user,'record','behaviour',bid,`${c.label}: ${c.points}`);return json({ok:true,id:bid});}
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
  requireRole(user,'admin','staff');if(method==='POST'){const b=await input(req);await permittedStudent(db,user,b.student_id);if(!/^\d{4}-\d{2}$/.test(b.period||'')||!isMoney(b.amount_pence))error('Period (YYYY-MM) and positive amount required');const fid=id();await run(db,'INSERT INTO fee_invoices(id,student_id,period,amount_pence,due_date) VALUES(?,?,?,?,?)',fid,b.student_id,b.period,Number(b.amount_pence),b.due_date||null);await audit(db,user,'issue','invoice',fid);return json({ok:true,id:fid});}
 }
 if(path==='/api/payments'){
  if(method==='GET'){const s=studentScope(user);return json({items:await all(db,`SELECT p.*,s.first_name,s.last_name,f.period FROM payments p JOIN students s ON s.id=p.student_id JOIN fee_invoices f ON f.id=p.invoice_id WHERE ${s.where} ORDER BY p.created_at DESC`,...s.args)});}
  requireRole(user,'admin','staff');if(method==='POST'){const b=await input(req),f=await first(db,'SELECT * FROM fee_invoices WHERE id=?',b.invoice_id);if(!f)error('Invoice not found',404);if(!isMoney(b.amount_pence)||Number(b.amount_pence)<=0)error('Valid payment amount required');const paid=await first(db,'SELECT COALESCE(SUM(amount_pence),0) AS total FROM payments WHERE invoice_id=?',f.id);if(Number(b.amount_pence)>f.amount_pence-paid.total)error('Payment exceeds outstanding invoice balance');const pid=id();await run(db,'INSERT INTO payments(id,invoice_id,student_id,amount_pence,method,reference,recorded_by) VALUES(?,?,?,?,?,?,?)',pid,f.id,f.student_id,Number(b.amount_pence),short(b.method,30)||'manual',short(b.reference,120),user.id);await audit(db,user,'payment','invoice',f.id,`${b.amount_pence} pence`);return json({ok:true,id:pid});}
 }
 if(path==='/api/announcements'){
  if(method==='GET'){let rows=await all(db,'SELECT a.*,u.name AS author FROM announcements a LEFT JOIN users u ON a.created_by=u.id ORDER BY a.created_at DESC LIMIT 100');return json({items:rows.filter(x=>x.audience==='all'||x.audience===user.role||user.role==='admin'||user.role==='staff')});}
  requireRole(user,'admin','staff');const b=await input(req);
  if(method==='POST'){if(!b.title||!b.body)error('Title and message required');if(!['all','parent','teacher','staff','admin'].includes(b.audience||'all'))error('Invalid audience');const aid=id();await run(db,'INSERT INTO announcements(id,title,body,audience,created_by) VALUES(?,?,?,?,?)',aid,short(b.title,150),short(b.body,2500),b.audience||'all',user.id);await audit(db,user,'publish','announcement',aid);return json({ok:true});}
  if(method==='DELETE'){requireRole(user,'admin','staff');await run(db,'DELETE FROM announcements WHERE id=?',b.id);return json({ok:true});}
 }
 if(path==='/api/messages'){
  if(method==='GET'){const rows=user.role==='admin'||user.role==='staff'?await all(db,'SELECT m.*,u.name AS recipient_name FROM messages m LEFT JOIN users u ON u.id=m.recipient_id ORDER BY m.created_at DESC LIMIT 200'):await all(db,'SELECT m.*,u.name AS recipient_name FROM messages m LEFT JOIN users u ON u.id=m.recipient_id WHERE m.recipient_id=? ORDER BY m.created_at DESC LIMIT 200',user.id);return json({items:rows});}
  requireRole(user,'admin','staff','teacher');if(method==='POST'){const b=await input(req);if(!b.subject||!b.body||!b.recipient_id)error('Recipient, subject and message required');const target=await first(db,'SELECT * FROM users WHERE id=?',b.recipient_id);if(!target)error('Recipient not found',404);if(user.role==='teacher'){if(target.role!=='parent')error('Teachers can only message parents');const child=await first(db,'SELECT s.id FROM students s JOIN classes c ON c.id=s.class_id WHERE s.parent_id=? AND c.teacher_id=? LIMIT 1',b.recipient_id,user.id);if(!child)error('Recipient is not a parent of your class',403);}if(b.student_id)await permittedStudent(db,user,b.student_id);const mid=id();await run(db,'INSERT INTO messages(id,recipient_id,subject,body,student_id,created_by) VALUES(?,?,?,?,?,?)',mid,b.recipient_id,short(b.subject,160),short(b.body,3000),b.student_id||null,user.id);await audit(db,user,'send','message',mid);if(env.RESEND_API_KEY&&env.EMAIL_FROM&&!env.EMAIL_FROM.includes('example.org'))await mail(env,target.email,'New message — Madrasah At-Towfiq',`<p>Assalamu alaikum,</p><p>You have a new private message in your Madrasah At-Towfiq parent/staff portal.</p><p>Please sign in securely to read it.</p>`);return json({ok:true});}
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
 if(path==='/api/reports'&&method==='GET'){
  requireRole(user,'admin','staff','teacher');const s=studentScope(user);const summary=await all(db,`SELECT s.id,s.student_no,s.first_name,s.last_name,c.name AS class_name,(SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id AND a.status='present') AS present,(SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id) AS attendance_total,(SELECT COUNT(*) FROM homework h WHERE h.student_id=s.id AND h.status='complete') AS homework_complete,(SELECT COUNT(*) FROM homework h WHERE h.student_id=s.id) AS homework_total,(SELECT COALESCE(SUM(b.points),0) FROM behaviour b WHERE b.student_id=s.id) AS behaviour_points FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE ${s.where} ORDER BY c.name,s.first_name`,...s.args);return json({items:summary});
 }
 if(path==='/api/demo-seed'&&method==='POST')error('New pupils must be enrolled through Admissions',403);
 error('Endpoint not found',404);
}
export default {
 async scheduled(event,env,ctx){
  ctx.waitUntil((async()=>{if(!env.DB||!env.RESEND_API_KEY||!env.EMAIL_FROM||env.EMAIL_FROM.includes('example.org'))return;const v=await first(env.DB,"SELECT value FROM school_settings WHERE key='jumah_enabled'");if(v?.value!=='true')return;const m=await first(env.DB,"SELECT value FROM school_settings WHERE key='jumah_message'");const people=await all(env.DB,"SELECT email FROM users WHERE active=1 AND role IN ('parent','teacher','staff')");for(const p of people){await mail(env,p.email,'Jumu’ah reminder — Madrasah At-Towfiq',`<div style="font-family:Arial,sans-serif"><h2>Madrasah At-Towfiq</h2><p>${escapeHtml(m?.value||'Assalamu alaikum. Jumu’ah Mubarak.')}</p></div>`);}})());
 },
 async fetch(req,env){const url=new URL(req.url);if(!url.pathname.startsWith('/api/')){return env.ASSETS.fetch(req);}
   try{return await handle(req,env);}catch(err){const code=err.status||((/UNIQUE constraint failed/i).test(err.message)?409:500);if(code>=500)console.error(err);return json({error:code>=500?'Unexpected server error':err.message},code);}
 }
};