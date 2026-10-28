/* Self-contained API smoke test using Node 22's experimental node:sqlite; does not require internet or Wrangler. */
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import assert from 'node:assert/strict';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0002_expanded_admissions.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0003_safeguarding_declarations.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0004_enrol_accepted_admissions.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0005_student_registration_numbers.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0006_fix_decimal_student_year.sql',import.meta.url),'utf8'));
// Reproduce the live upgrade path: an accepted admission existed before 0004, but no student did.
const oldDb=new DatabaseSync(':memory:');
for(const filename of ['0001_initial.sql','0002_expanded_admissions.sql','0003_safeguarding_declarations.sql']) oldDb.exec(fs.readFileSync(new URL('../migrations/'+filename,import.meta.url),'utf8'));
oldDb.prepare(`INSERT INTO admissions(id,child_name,dob,guardian_name,guardian_email,first_name,last_name,gender,home_address,postcode,guardian_phone,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run('accepted-before-upgrade','Legacy Learner','2017-06-12','Test Parent','legacy@example.test','Legacy','Learner','Male','Example Road','BL1 1AA','07000000000','accepted');
oldDb.exec(fs.readFileSync(new URL('../migrations/0004_enrol_accepted_admissions.sql',import.meta.url),'utf8'));
oldDb.exec(fs.readFileSync(new URL('../migrations/0005_student_registration_numbers.sql',import.meta.url),'utf8'));
assert.equal(oldDb.prepare('SELECT student_id FROM admissions WHERE id=?').get('accepted-before-upgrade').student_id,'accepted-before-upgrade');
assert.equal(oldDb.prepare('SELECT first_name FROM students WHERE id=?').get('accepted-before-upgrade').first_name,'Legacy');
assert.equal(oldDb.prepare('SELECT COUNT(*) AS n FROM students').get().n,1);
assert.match(oldDb.prepare('SELECT student_no FROM students WHERE id=?').get('accepted-before-upgrade').student_no,/^MATT-\d{4}-0001$/);
// Simulate the historical SQLite REAL-year formatting issue and verify repair.
oldDb.prepare('UPDATE students SET student_no=? WHERE id=?').run('MATT-2026.0-0001','accepted-before-upgrade');
oldDb.exec(fs.readFileSync(new URL('../migrations/0006_fix_decimal_student_year.sql',import.meta.url),'utf8'));
assert.equal(oldDb.prepare('SELECT student_no FROM students WHERE id=?').get('accepted-before-upgrade').student_no,'MATT-2026-0001');
oldDb.exec(fs.readFileSync(new URL('../migrations/0006_fix_decimal_student_year.sql',import.meta.url),'utf8'));
assert.equal(oldDb.prepare('SELECT student_no FROM students WHERE id=?').get('accepted-before-upgrade').student_no,'MATT-2026-0001','repair migration must be idempotent');
oldDb.close();
const db={prepare(sql){const stmt=sqlite.prepare(sql);return {bind(...params){return {first(){return stmt.get(...params)||null;},all(){return {results:stmt.all(...params)};},run(){return stmt.run(...params);}};}};},batch(ops){sqlite.exec('BEGIN');try{const results=ops.map(x=>({meta:{changes:Number(x.run().changes||0)}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const env={DB:db,SETUP_KEY:'twentyfour-letters-bootstrap-secure',SCHOOL_NAME:'Madrasah At-Towfiq',ASSETS:{fetch:()=>new Response('page')}};
let cookie='',csrf='';
async function req(path,body,verb='POST',auth=true,view=''){const headers={'origin':'http://localhost:8787'};if(view)headers['x-portal-view']=view;if(body){headers['Content-Type']='application/json';if(auth)headers['x-csrf-token']=csrf;}if(cookie&&auth)headers.cookie=cookie;const response=await worker.fetch(new Request('http://localhost:8787/api'+path,{method:body?verb:'GET',headers,body:body?JSON.stringify(body):undefined}),env);const data=await response.json();return {status:response.status,data,response};}
let z=await req('/auth/setup-status');assert.equal(z.data.needs_setup,true);
z=await req('/auth/setup',{setup_key:env.SETUP_KEY,name:'Admin User',email:'admin@example.test',password:'this-is-a-secure-test-password'},'POST',false);assert.equal(z.status,200,JSON.stringify(z.data));cookie=z.response.headers.get('set-cookie').split(';')[0];csrf=z.data.csrf;
// Enforce Cloudflare-compatible hashing and exercise login/password verification.
let storedPassword=sqlite.prepare("SELECT password_hash FROM users WHERE email='admin@example.test'").get().password_hash;
assert.match(storedPassword,/^pbkdf2-sha256:100000:[A-Za-z0-9+/]+={0,2}$/);
let loginTest=await req('/auth/login',{email:'admin@example.test',password:'this-is-a-secure-test-password'},'POST',false);
assert.equal(loginTest.status,200,JSON.stringify(loginTest.data));
z=await req('/auth/me');assert.equal(z.status,200);csrf=z.data.csrf;
// Old local preview accounts must remain readable after this fix.
const legacySalt=randomBytes(16).toString('base64');
const legacyDigest=pbkdf2Sync('legacy-password-123',Buffer.from(legacySalt,'base64'),210000,32,'sha256').toString('base64');
sqlite.prepare("INSERT INTO users(id,name,email,role,password_hash,password_salt) VALUES(?,?,?,?,?,?)").run('legacy-fixture','Local Legacy','legacy@example.test','staff',legacyDigest,legacySalt);
const legacyLogin=await req('/auth/login',{email:'legacy@example.test',password:'legacy-password-123'},'POST',false);
assert.equal(legacyLogin.status,200,JSON.stringify(legacyLogin.data));
z=await req('/classes',{name:'Foundation',stage:'Foundation',capacity:20});assert.equal(z.status,200,JSON.stringify(z.data));const class_id=z.data.id;
// Test the new paper-form-equivalent admissions fields without any real child data.
const application={first_name:'Sample',last_name:'Learner',dob:'2017-06-12',gender:'Female',home_address:'Example Road',postcode:'BL1 1AA',home_telephone:'',guardian_name:'Example Guardian',guardian_email:'example.guardian@example.test',guardian_phone:'07000000000',emergency_phone:'07000000001',guardian_relationship:'Mother',previous_attended:'yes',previous_institute:'Example Madrasah',level_starting:0,level_qaaidah:1,qaaidah_page:'15',level_quran:0,quran_surah:'',arabic_read_write:1,medical_information:'Needs inhaler access when indicated',allergies:'No allergies reported',additional_learning_needs:'Extra reading support',consent_first_aid:1,consent_photos:0,message:'Test application only'};
// A new admission triggers exactly one formal receipt email, before any acceptance.
const originalReceiptFetch=globalThis.fetch;
let receiptMailPayload=null;
env.RESEND_API_KEY='test-receipt-key';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 receiptMailPayload=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'receipt-test-id'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 z=await req('/admissions',application);
 assert.equal(z.status,200,JSON.stringify(z.data));
 assert.equal(z.data.acknowledgement_status,'sent');
 assert.match(z.data.reference,/^MAT-\d{4}-[A-F0-9]{10}$/);
 assert.equal(receiptMailPayload.to[0],application.guardian_email);
 assert.equal(receiptMailPayload.from,env.EMAIL_FROM);
 assert.equal(receiptMailPayload.reply_to,env.ADMISSIONS_EMAIL);
 assert.ok(receiptMailPayload.subject.includes('Application received'));
 assert.ok(!receiptMailPayload.subject.includes(application.first_name),'Do not disclose child names in email subjects');
 assert.ok(receiptMailPayload.html.includes('Dear Example Guardian,'));
 assert.ok(receiptMailPayload.html.includes('Sample Learner'),'Admission acknowledgement includes the full pupil name');
 assert.ok(!receiptMailPayload.subject.includes('Sample Learner'),'Student name must not be in subject line');
 assert.ok(receiptMailPayload.html.includes('السلام عليكم ورحمة الله وبركاته'));
 assert.ok(receiptMailPayload.html.includes('Assalāmu'));
 assert.ok(receiptMailPayload.html.includes('at-towfiq-madrasah-logo.png'));
 assert.ok(receiptMailPayload.html.includes(z.data.reference));
 assert.ok(receiptMailPayload.html.includes('Received — awaiting review'));
 assert.ok(receiptMailPayload.html.includes('not an offer of admission'));
 assert.ok(!receiptMailPayload.html.includes('Needs inhaler'),'Medical notes must not be emailed');
 assert.ok(!receiptMailPayload.html.includes('No allergies'),'Allergies must not be emailed');
}finally{
 globalThis.fetch=originalReceiptFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
const application_id=z.data.id;
assert.ok(sqlite.prepare('SELECT id FROM admissions WHERE id=?').get(application_id),'Application must exist after sending the receipt');
z=await req('/admissions');assert.equal(z.status,200);assert.equal(z.data.items.length,1);assert.equal(z.data.items[0].qaaidah_page,'15');assert.equal(z.data.items[0].consent_first_aid,1);assert.equal(z.data.items[0].consent_photos,0);assert.equal(z.data.items[0].allergies,'No allergies reported');assert.equal(z.data.items[0].medical_information,'Needs inhaler access when indicated');assert.equal(z.data.items[0].additional_learning_needs,'Extra reading support');assert.equal(z.data.items[0].mobile,'');assert.equal(z.data.items[0].guardian_address,'');assert.equal(z.data.items[0].child_name,'Sample Learner');
z=await req('/admissions',{...application,id:application_id,update_details:true,level_qaaidah:0,level_quran:1,quran_surah:'Al-Fatihah',previous_attended:'no',previous_institute:'',consent_first_aid:0,consent_photos:1,allergies:'Peanut allergy'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/admissions',{id:application_id,status:'reviewing'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/admissions');assert.equal(z.data.items[0].status,'reviewing');assert.equal(z.data.items[0].quran_surah,'Al-Fatihah');assert.equal(z.data.items[0].level_qaaidah,0);assert.equal(z.data.items[0].consent_first_aid,0);assert.equal(z.data.items[0].consent_photos,1);assert.equal(z.data.items[0].allergies,'Peanut allergy');
z=await req('/students',{first_name:'Amina',last_name:'Example',class_id});assert.equal(z.status,403,'Manual student creation is prohibited');
z=await req('/students/bulk',{items:[{first_name:'Example',last_name:'Learner'}]});assert.equal(z.status,403,'Bulk student import is prohibited');
z=await req('/admissions',{id:application_id,status:'accepted'},'PATCH');
assert.equal(z.status,400,'Admission acceptance without a class is forbidden');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM students').get().n,0,'Rejected classless acceptance cannot create a pupil');
z=await req('/admissions',{id:application_id,status:'accepted',class_id},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
assert.equal(sqlite.prepare('SELECT class_id FROM students WHERE id=?').get(application_id).class_id,class_id,'Accepted student must have selected class');
assert.equal(z.data.invitation_status,'delivery_not_configured_or_failed','Acceptance attempts the parent invitation automatically');
assert.ok(z.data.invitation_url,'Without Resend a private guardian activation link must be returned');
const autoGuardianUrl=z.data.invitation_url;
const guardian_id=sqlite.prepare("SELECT id FROM users WHERE email=? AND role='parent'").get(application.guardian_email).id;
assert.equal(sqlite.prepare('SELECT password_hash FROM users WHERE id=?').get(guardian_id).password_hash,null,'Automatic parent invitation must not activate the account');
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(application_id).parent_id,guardian_id,'Accepting immediately links a newly invited guardian');
const student_id=z.data.student_id;assert.equal(student_id,application_id);
assert.equal(sqlite.prepare('SELECT student_no FROM students WHERE id=?').get(student_id).student_no,'MATT-'+new Date().getUTCFullYear()+'-0001');
z=await req('/students');assert.equal(z.data.items.length,1);assert.equal(z.data.items[0].first_name,'Sample');assert.equal(z.data.items[0].dob,application.dob);
z=await req('/admissions',{id:application_id,status:'accepted'},'PATCH');assert.equal(z.status,200);z=await req('/students');assert.equal(z.data.items.length,1,'Accepting twice must not duplicate a pupil');
assert.equal(sqlite.prepare('SELECT last_number FROM student_number_sequences WHERE enrollment_year=?').get(new Date().getUTCFullYear()).last_number,1,'Repeated approval must not consume an enrolment number');
z=await req('/admissions',{id:application_id,status:'declined'},'PATCH');assert.equal(z.status,409,'An enrolled application cannot be reversed');
// Quran verse boundaries and Surah ordering must also be enforced by the Worker API.
z=await req('/homework',{student_id,type:'hifdh',surah_from:'Al-Fatihah',verse_from:1,surah_to:'Al-Fatihah',verse_to:20,due_date:'2026-11-04'});assert.equal(z.status,400,'Al-Fatihah has only seven verses');
z=await req('/homework',{student_id,type:'hifdh',surah_from:'Al-Fatihah',verse_from:7,surah_to:'Al-Fatihah',verse_to:1,due_date:'2026-11-04'});assert.equal(z.status,400,'Descending verse ranges prohibited');
z=await req('/homework',{student_id,type:'murajaa',surah_from:'Al-Baqarah',verse_from:1,surah_to:'Al-Fatihah',verse_to:7,due_date:'2026-11-04'});assert.equal(z.status,400,'Descending Surah ranges prohibited');
z=await req('/homework',{student_id,type:'hifdh',surah_from:'Unknown Surah',verse_from:1,surah_to:'Al-Fatihah',verse_to:7,due_date:'2026-11-04'});assert.equal(z.status,400,'Invalid Surah must be rejected');
z=await req('/homework',{student_id,type:'hifdh',surah_from:'Al-Fatihah',verse_from:1,surah_to:'Al-Fatihah',verse_to:7,due_date:'2026-11-04',comments:'Practice'});assert.equal(z.status,200,JSON.stringify(z.data));const homework_id=z.data.id;
z=await req('/homework',{id:homework_id,status:'complete',teacher_feedback:'Excellent'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/behaviour',{student_id,reason_code:'kindness',notes:'Kind to a new student'});assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/attendance',{records:[{student_id,status:'present',date:'2026-10-27'}]});assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/fees',{student_id,period:'2026-10',amount_pence:3000,due_date:'2026-10-30'});assert.equal(z.status,200,JSON.stringify(z.data));const invoice_id=z.data.id;
z=await req('/payments',{invoice_id,amount_pence:1200,method:'cash'});assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/fees');assert.equal(z.data.items[0].paid_pence,1200);
// Bulk issue for selected and all active students, including duplicate-month protection.
const secondApplication={...application,first_name:'Bilal',last_name:'Test',guardian_email:'guardian2@example.test'};
// A provider rejection must not roll back the saved application.
env.RESEND_API_KEY='test-failed-provider';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
const priorFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response('Service unavailable',{status:503});
try{
 z=await req('/admissions',secondApplication);
 assert.equal(z.status,200,'A failed receipt email must never lose an application');
 assert.equal(z.data.acknowledgement_status,'not_sent');
 assert.ok(z.data.reference,'Application reference must still be returned');
}finally{
 globalThis.fetch=priorFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
const secondApplicationId=z.data.id;
assert.ok(sqlite.prepare('SELECT id FROM admissions WHERE id=?').get(secondApplicationId),'Application retained despite provider outage');
z=await req('/admissions',{id:secondApplicationId,status:'accepted',class_id},'PATCH');assert.equal(z.status,200);const student2=z.data.student_id;
assert.equal(sqlite.prepare('SELECT student_no FROM students WHERE id=?').get(student2).student_no,'MATT-'+new Date().getUTCFullYear()+'-0002');

 
// Exercise the actual HTML email sent through Resend, without making a network request.
const originalFetch=globalThis.fetch;
let resendPayload;
env.RESEND_API_KEY='integration-test-resend-token';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 resendPayload=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'test-email-id'}),{status:200,headers:{'Content-Type':'application/json'}});
};
try{
 const resendResult=await req('/guardians',{student_id:student2,greeting_name:'Ibrahim'});
 assert.equal(resendResult.status,200,JSON.stringify(resendResult.data));
 assert.equal(resendResult.data.invitation_status,'sent');
 assert.equal(resendResult.data.invitation_url,null,'Do not expose live invitation links in a successful send response');
 assert.equal(resendPayload.from,env.EMAIL_FROM);
 assert.equal(resendPayload.to[0],secondApplication.guardian_email);
 assert.equal(resendPayload.reply_to,env.ADMISSIONS_EMAIL);
 assert.ok(resendPayload.html.includes('Dear Ibrahim,'),'Custom preferred first name must appear in greeting');
 assert.ok(resendPayload.html.includes('Bilal Test'),'Admission acceptance invitation must include pupil full name');
 assert.ok(resendPayload.html.includes('السلام عليكم ورحمة الله وبركاته'),'Islamic greeting must be included');
 assert.ok(resendPayload.html.includes('Assalāmu'),'Transliterated taslīm must appear');
 assert.ok(resendPayload.html.includes('at-towfiq-madrasah-logo.png'),'Email includes official logo');
 assert.ok(resendPayload.html.includes('Activate my parent account'),'Email contains prominent activation CTA');
 assert.ok(resendPayload.html.includes('expires in 7 days'),'Invitation expiry must be explicit');
 assert.ok(resendPayload.html.includes('https://portal.attowfiqmasjid.org/?invite='),'Link must use the official portal domain');
 assert.ok(!resendPayload.subject.includes('Bilal'),'Subject must not disclose a pupil identity');
}finally{
 globalThis.fetch=originalFetch;
 delete env.RESEND_API_KEY;
 delete env.EMAIL_FROM;
 delete env.ADMISSIONS_EMAIL;
}

z=await req('/admissions',{...application,first_name:'Inactive',last_name:'Test',guardian_email:'inactive@example.test'});assert.equal(z.status,200);const thirdApplicationId=z.data.id;
z=await req('/admissions',{id:thirdApplicationId,status:'accepted',class_id},'PATCH');assert.equal(z.status,200);
z=await req('/students',{id:z.data.student_id,status:'inactive'},'PATCH');assert.equal(z.status,200);
z=await req('/fees/bulk',{mode:'selected',student_ids:[student_id,student2],period:'2026-11',amount_pence:3500,due_date:'2026-11-15',confirm:'ISSUE_BULK_INVOICES'});
assert.equal(z.status,200,JSON.stringify(z.data));assert.equal(z.data.created,2);assert.equal(z.data.skipped,0);
z=await req('/fees/bulk',{mode:'selected',student_ids:[student_id,student2],period:'2026-11',amount_pence:3500,confirm:'ISSUE_BULK_INVOICES'});
assert.equal(z.status,200,JSON.stringify(z.data));assert.equal(z.data.created,0);assert.equal(z.data.skipped,2);
z=await req('/fees/bulk',{mode:'all',period:'2026-12',amount_pence:3000,confirm:'ISSUE_BULK_INVOICES'});
assert.equal(z.status,200,JSON.stringify(z.data));assert.equal(z.data.created,2);assert.equal(z.data.selected,2);
z=await req('/fees/bulk',{mode:'selected',student_ids:['wrong-id'],period:'2027-01',amount_pence:3000,confirm:'ISSUE_BULK_INVOICES'});
assert.equal(z.status,400);
z=await req('/fees/bulk',{mode:'all',period:'2027-01',amount_pence:3000});assert.equal(z.status,400);
z=await req('/search?q=Sample');assert.equal(z.status,200,JSON.stringify(z.data));assert.equal(z.data.students.length,1);
z=await req('/reports');const report=z.data.items.find(x=>x.id===student_id);assert.ok(report);assert.equal(report.homework_complete,1);assert.equal(report.behaviour_points,3);
// Guardian activates the invitation automatically created by admission acceptance.
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student_id).parent_id,guardian_id,'Pupil is linked before parent activates, while pending account remains inactive');
z=await req('/guardians');assert.equal(z.status,200);assert.equal(z.data.items.length,3,'Guardian directory includes accepted pupils');
assert.ok(z.data.items.some(x=>x.student_id===student_id&&x.account_id===guardian_id));
const invite=new URL(autoGuardianUrl).searchParams.get('invite');
let pa=await req('/auth/accept-invite',{token:invite,password:'twelve-character-guardian-pass'},'POST',false);assert.equal(pa.status,200);
const parent_cookie=pa.response.headers.get('set-cookie').split(';')[0];const parent_csrf=pa.data.csrf;
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student_id).parent_id,guardian_id,'Activation links the unlinked accepted pupil by verified invitation email');
assert.notEqual(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student2).parent_id,guardian_id,'Other pupil stays with its own guardian');
const oldCookie=cookie,oldCsrf=csrf;cookie=parent_cookie;csrf=parent_csrf;
z=await req('/students');assert.equal(z.status,200);assert.equal(z.data.items.length,1);
z=await req('/behaviour');assert.equal(z.status,200);assert.equal(z.data.items.length,1);
z=await req('/homework',{student_id,type:'qaaidah',page_number:'12',due_date:'2026-11-04'});assert.equal(z.status,403,'Parent must not assign homework');
z=await req('/users');assert.equal(z.status,403,'Parent must not enumerate accounts');
z=await req('/admissions');assert.equal(z.status,403,'Parent must not view applicants');
z=await req('/guardians');assert.equal(z.status,403,'Parents cannot list other guardians');
z=await req('/guardians',{student_id},'POST');assert.equal(z.status,403,'Parents cannot issue invitations');
z=await req('/fees/bulk',{mode:'all',period:'2027-02',amount_pence:3000,confirm:'ISSUE_BULK_INVOICES'});assert.equal(z.status,403,'Parents cannot bulk invoice pupils');
cookie=oldCookie;csrf=oldCsrf;
// Updating accepted admission details keeps the pupil's basic details in sync.
const emailLogBeforeAdmissionEdit=sqlite.prepare('SELECT COUNT(*) AS total FROM email_log').get().total;
z=await req('/admissions',{...application,id:application_id,update_details:true,first_name:'Updated',last_name:'Learner',previous_attended:'no',previous_institute:''},'PATCH');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS total FROM email_log').get().total,emailLogBeforeAdmissionEdit,'Editing an admission must not resend the receipt');
assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/students');assert.equal(z.data.items.find(x=>x.id===student_id).first_name,'Updated');
z=await req('/demo-seed',{});assert.equal(z.status,403,'Demo seeding cannot bypass admissions');
z=await req('/settings',{key:'jumah_enabled',value:'false'});assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/automation/preview');assert.equal(z.status,200);
// Administrators can edit staff/admin details, but sensitive account transitions are guarded.
z=await req('/users',{name:'Office A',email:'office.a@example.test',role:'staff'});assert.equal(z.status,200);
const staff_id=z.data.id;
z=await req('/users',{id:staff_id,name:'Office Support A',role:'teacher'},'PATCH');
assert.equal(z.status,200,'Admin can update staff profile and role');
z=await req('/users');assert.equal(z.data.items.find(x=>x.id===staff_id).name,'Office Support A');
z=await req('/users',{id:staff_id,email:'office.b@example.test'},'PATCH');
assert.equal(z.status,200,JSON.stringify(z.data));assert.ok(z.data.invitation_url,'Email reassignment requires renewed activation');
const staffPass=await req('/auth/accept-invite',{token:new URL(z.data.invitation_url).searchParams.get('invite'),password:'staff-password-long-enough'},'POST',false);
assert.equal(staffPass.status,200,'Updated staff email accepts the new activation link');
z=await req('/users',{id:staff_id,email:'admin@example.test'},'PATCH');assert.equal(z.status,409,'Duplicate email is rejected');

// A teacher whose email matches a new guardian remains a teacher and can
// access their own child using a restricted Family view.
const teacherParentApplication={...application,first_name:'Hamza',last_name:'StaffChild',guardian_email:'office.b@example.test',guardian_name:'Office Support A'};
z=await req('/admissions',teacherParentApplication);assert.equal(z.status,200,JSON.stringify(z.data));
const teacherParentApplicationId=z.data.id;
const linkedMailFetch=globalThis.fetch;
let linkedAccountMail=null;
env.RESEND_API_KEY='test-existing-staff-parent';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 linkedAccountMail=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'existing-account-linked'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 z=await req('/admissions',{id:teacherParentApplicationId,status:'accepted',class_id},'PATCH');
 assert.equal(z.status,200,JSON.stringify(z.data));
 assert.equal(z.data.invitation_status,'linked_existing','Existing teacher receives linked-account notice instead of conflict error');
 assert.equal(z.data.email_status,'sent');
 assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(z.data.student_id).parent_id,staff_id);
 assert.equal(sqlite.prepare('SELECT role FROM users WHERE id=?').get(staff_id).role,'teacher','Staff role remains unchanged');
 assert.equal(linkedAccountMail.to[0],'office.b@example.test');
 assert.ok(linkedAccountMail.html.includes('Hamza StaffChild'));
 assert.ok(linkedAccountMail.html.includes('Family view'));
}finally{
 globalThis.fetch=linkedMailFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
const storedTeacherChild=sqlite.prepare('SELECT id FROM students WHERE parent_id=?').get(staff_id);
assert.ok(storedTeacherChild);
const adminCookieBeforeStaff=cookie,adminCsrfBeforeStaff=csrf;
cookie=staffPass.response.headers.get('set-cookie').split(';')[0];
csrf=staffPass.data.csrf;
z=await req('/auth/me',null,'GET');assert.equal(z.status,200,JSON.stringify(z.data));
assert.equal(z.data.user.role,'teacher');
assert.equal(z.data.user.has_family,true,'Staff parent can switch to family access');
z=await req('/students',null,'GET',true,'family');assert.equal(z.status,200);
assert.equal(z.data.items.length,1,'Family view only shows linked pupil');
assert.equal(z.data.items[0].id,storedTeacherChild.id);
z=await req('/fees',null,'GET',true,'family');assert.equal(z.status,200,'Family mode reads own fees');
z=await req('/users',null,'GET',true,'family');assert.equal(z.status,403,'Family mode denies staff directory');
z=await req('/attendance',{records:[{student_id:storedTeacherChild.id,date:'2026-11-18',status:'present'}]},'POST',true,'family');
assert.equal(z.status,403,'Family mode cannot record attendance');
z=await req('/students');assert.equal(z.status,200,'Teacher view remains accessible');
assert.ok(!z.data.items.some(x=>x.id===storedTeacherChild.id),'Teacher view retains class-scoped permissions');
cookie=adminCookieBeforeStaff;csrf=adminCsrfBeforeStaff;

z=await req('/users',{id:guardian_id,name:'Updated Guardian'},'PATCH');assert.equal(z.status,200);

 
// v1.0.16 — every newly assigned homework item and behaviour point change
// emails only the linked or accepted-admission guardian, after saving the record.
const notificationFetch=globalThis.fetch;
const sentNotifications=[];
env.RESEND_API_KEY='local-notification-simulation';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 sentNotifications.push(JSON.parse(options.body));
 return new Response(JSON.stringify({id:'mock-guardian-mail'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 const hwNotify=await req('/homework',{student_id:student2,type:'qaaidah',page_number:'22',comments:'Private instruction <do not show>',due_date:'2026-11-10'});
 assert.equal(hwNotify.status,200,JSON.stringify(hwNotify.data));
 assert.equal(hwNotify.data.notification_status,'sent');
 assert.equal(sentNotifications.length,1,'Assignment should send exactly one email');
 assert.equal(sentNotifications[0].to[0],secondApplication.guardian_email,'Unlinked accepted pupil uses registered guardian email');
 assert.equal(sentNotifications[0].reply_to,env.ADMISSIONS_EMAIL);
 assert.ok(sentNotifications[0].subject.includes('New homework assignment'));
 assert.ok(sentNotifications[0].html.includes('Qaaidah'));
 assert.ok(sentNotifications[0].html.includes('Bilal Test'),'Homework email must display pupil forename and surname');
 assert.ok(sentNotifications[0].html.includes('Page 22'));
 assert.ok(sentNotifications[0].html.includes('10 November 2026'));
 assert.ok(sentNotifications[0].html.includes('السلام عليكم ورحمة الله وبركاته'));
 assert.ok(sentNotifications[0].html.includes('https://portal.attowfiqmasjid.org/'));
 assert.ok(!sentNotifications[0].html.includes('Private instruction'),'Free-text homework comments must remain inside the secure portal');
 let notification=await req('/homework',{id:hwNotify.data.id,status:'complete',teacher_feedback:'Well done'},'PATCH');
 assert.equal(notification.status,200);
 assert.equal(sentNotifications.length,1,'Marking homework complete must not resend a new-assignment notice');
 notification=await req('/behaviour',{student_id:student2,reason_code:'kindness',notes:'Private teacher notes <confidential>'});
 assert.equal(notification.status,200,JSON.stringify(notification.data));
 assert.equal(notification.data.notification_status,'sent');
 assert.equal(sentNotifications.length,2);
 assert.ok(sentNotifications[1].html.includes('POINTS AWARDED'));
 assert.ok(sentNotifications[1].html.includes('Bilal Test'),'Positive behaviour email must display pupil full name');
 assert.ok(sentNotifications[1].html.includes('+3 points'));
 assert.ok(!sentNotifications[1].html.includes('Private teacher notes'));
 notification=await req('/behaviour',{student_id:student2,reason_code:'disrespect',notes:'Keep this note confidential'});
 assert.equal(notification.status,200,JSON.stringify(notification.data));
 assert.equal(notification.data.notification_status,'sent');
 assert.equal(sentNotifications.length,3);
 assert.ok(sentNotifications[2].html.includes('POINTS DEDUCTED'));
 assert.ok(sentNotifications[2].html.includes('Bilal Test'),'Deduction email must display pupil full name');
 assert.ok(sentNotifications[2].html.includes('-2 points'));
 assert.ok(sentNotifications[2].html.includes('Disrespectful language'));
 assert.ok(!sentNotifications[2].html.includes('Keep this note confidential'));
 assert.equal(sentNotifications.every(x=>x.from===env.EMAIL_FROM&&x.reply_to===env.ADMISSIONS_EMAIL),true);
 // A pupil linked to an activated parent should use that account's email.
 notification=await req('/homework',{student_id,type:'qaaidah',page_number:'10',due_date:'2026-11-12'});
 assert.equal(notification.status,200);
 assert.equal(notification.data.notification_status,'sent');
 assert.equal(sentNotifications[3].to[0],application.guardian_email);
 assert.ok(sentNotifications[3].html.includes('Updated Learner'),'Notifications use updated student record names, not stale admission fields');
 assert.ok(sentNotifications.every(p=>!p.subject.includes('Learner')&&!p.subject.includes('Bilal Test')),'Pupil names must never appear in email subjects');
}finally{
 globalThis.fetch=notificationFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
// A Resend outage must never roll back pupil work or behaviour records.
const failingNotificationFetch=globalThis.fetch;
env.RESEND_API_KEY='mock-api-failure';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async()=>new Response('Temporary error',{status:503});
try{
 const hwFail=await req('/homework',{student_id:student2,type:'islamic_studies',page_number:'16',due_date:'2026-11-13'});
 assert.equal(hwFail.status,200,'Assignment must save during email outage');
 assert.equal(hwFail.data.notification_status,'not_sent');
 assert.ok(sqlite.prepare('SELECT id FROM homework WHERE id=?').get(hwFail.data.id));
 const behaviourFail=await req('/behaviour',{student_id:student2,reason_code:'following'});
 assert.equal(behaviourFail.status,200,'Points must save during email outage');
 assert.equal(behaviourFail.data.notification_status,'not_sent');
 assert.ok(sqlite.prepare('SELECT points FROM behaviour WHERE id=?').get(behaviourFail.data.id));
}finally{
 globalThis.fetch=failingNotificationFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}

// Student-related private portal messages must identify the full pupil name,
// and a parent can only receive messages about pupils linked to that parent.
z=await req('/messages',{recipient_id:guardian_id,student_id:student2,subject:'Unrelated pupil',body:'Do not deliver'},'POST');
assert.equal(z.status,403,'Do not disclose an unrelated pupil to a different parent');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE subject='Unrelated pupil'").get().n,0);
const messageFetch=globalThis.fetch;
let linkedMessageEmail;
env.RESEND_API_KEY='test-message-sending';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 linkedMessageEmail=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'test-private-message'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 const sent=await req('/messages',{recipient_id:guardian_id,student_id,subject:'Private pupil progress',body:'Confidential note'},'POST');
 assert.equal(sent.status,200,JSON.stringify(sent.data));
 assert.equal(linkedMessageEmail.to[0],application.guardian_email);
 assert.ok(linkedMessageEmail.html.includes('Updated Learner'),'Pupil-related message alert must include full name');
 assert.ok(!linkedMessageEmail.html.includes('Confidential note'),'Private message bodies must remain within the portal');
 assert.ok(!linkedMessageEmail.subject.includes('Updated Learner'));
}finally{
 globalThis.fetch=messageFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}

// Existing parent + second accepted child: linking and email outcomes are distinct.
// This must NEVER show an already-linked error or change their password/role.
const existingGuardianBefore=sqlite.prepare('SELECT id,role,password_hash FROM users WHERE id=?').get(guardian_id);
const siblingApplication={...application,first_name:'Maryam',last_name:'Family',guardian_name:'Example Guardian'};
z=await req('/admissions',siblingApplication);assert.equal(z.status,200,JSON.stringify(z.data));
const siblingApplicationId=z.data.id;
const beforeSiblingCount=sqlite.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').get(application.guardian_email).n;
const originalSiblingFetch=globalThis.fetch;
let siblingEmailPayload;
let siblingSendCount=0;
env.RESEND_API_KEY='test-existing-parent-email';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 siblingSendCount++;
 siblingEmailPayload=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'existing-parent-sibling-mail'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 z=await req('/admissions',{id:siblingApplicationId,status:'accepted',class_id},'PATCH');
 assert.equal(z.status,200,JSON.stringify(z.data));
 assert.equal(z.data.enrolled,true);
 assert.equal(z.data.linked,true);
 assert.equal(z.data.invitation_status,'linked_existing','Second child must be a successful existing-parent link');
 assert.equal(z.data.email_status,'sent');
 assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(siblingApplicationId).parent_id,guardian_id,'Sibling linked to original parent');
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users WHERE email=?').get(application.guardian_email).n,beforeSiblingCount,'No duplicate parent account');
 const afterGuardian=sqlite.prepare('SELECT id,role,password_hash FROM users WHERE id=?').get(guardian_id);
 assert.deepEqual(afterGuardian,existingGuardianBefore,'Parent password and role must not change');
 assert.equal(siblingSendCount,1);
 assert.equal(siblingEmailPayload.to[0],application.guardian_email);
 assert.ok(siblingEmailPayload.html.includes('Maryam Family'),'Existing-parent email includes pupil full name');
 assert.ok(!siblingEmailPayload.subject.includes('Maryam Family'),'Pupil name stays out of subject');
 // A repeated admission acceptance is idempotent and must not generate a second email.
 z=await req('/admissions',{id:siblingApplicationId,status:'accepted',class_id},'PATCH');
 assert.equal(z.status,200,JSON.stringify(z.data));
 assert.equal(z.data.invitation_status,'already_linked');
 assert.equal(z.data.already_enrolled,true);
 assert.equal(z.data.linked,true);
 assert.equal(z.data.email_status,'not_attempted');
 assert.equal(siblingSendCount,1);
}finally{
 globalThis.fetch=originalSiblingFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
// Email failure must report a successful link, not a false "already linked" error.
z=await req('/admissions',{...siblingApplication,first_name:'Zaynab'});assert.equal(z.status,200);
const mailFailureChildId=z.data.id;
const existingParentFetch=globalThis.fetch;
env.RESEND_API_KEY='test-mail-failure';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async()=>new Response('Email temporarily unavailable',{status:503});
try{
 z=await req('/admissions',{id:mailFailureChildId,status:'accepted',class_id},'PATCH');
 assert.equal(z.status,200,JSON.stringify(z.data));
 assert.equal(z.data.invitation_status,'linked_existing');
 assert.equal(z.data.linked,true);
 assert.equal(z.data.email_status,'not_sent');
 assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(mailFailureChildId).parent_id,guardian_id);
}finally{
 globalThis.fetch=existingParentFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}

// Class allocation: existing legacy/unassigned pupils can be added through
// a class roster, with capacity and cross-class constraints enforced.
const extraClass=await req('/classes',{name:'Hifdh Group',stage:'Hifdh',capacity:1});
assert.equal(extraClass.status,200,JSON.stringify(extraClass.data));
const hifdhId=extraClass.data.id;
z=await req('/students',{id:student2,class_id:hifdhId},'PATCH');
assert.equal(z.status,200,'A pupil can transfer into a class with space');
assert.equal(sqlite.prepare('SELECT class_id FROM students WHERE id=?').get(student2).class_id,hifdhId);
z=await req('/students',{id:student_id,class_id:hifdhId},'PATCH');
assert.equal(z.status,409,'Cannot overfill a class through student edit');
z=await req('/classes',{id:hifdhId,name:'Hifdh Group',stage:'Hifdh',capacity:0},'PATCH');
assert.equal(z.status,400,'Class capacity cannot be zero');
z=await req('/classes',{id:hifdhId,name:'Hifdh Group',stage:'Hifdh',capacity:1},'PATCH');
assert.equal(z.status,200);
z=await req('/students',{id:student2,class_id:null},'PATCH');
assert.equal(z.status,400,'Active pupils must not be left unassigned');
const previousClass=sqlite.prepare('SELECT class_id FROM students WHERE id=?').get(student2).class_id;
assert.equal(previousClass,hifdhId);
const legacyUnassigned=student2;
sqlite.prepare('UPDATE students SET class_id=NULL WHERE id=?').run(legacyUnassigned);
z=await req('/classes/enrolment',{class_id:hifdhId,student_ids:[legacyUnassigned]},'PATCH');
assert.equal(z.status,200,JSON.stringify(z.data));
assert.equal(z.data.assigned,1);
assert.equal(sqlite.prepare('SELECT class_id FROM students WHERE id=?').get(legacyUnassigned).class_id,hifdhId);
z=await req('/classes/enrolment',{class_id:hifdhId,student_ids:[]},'PATCH');
assert.equal(z.status,409,'Roster cannot silently remove active pupils from a class');
z=await req('/classes/enrolment',{class_id:hifdhId,student_ids:[legacyUnassigned,student_id]},'PATCH');
assert.equal(z.status,409,'Roster cannot exceed capacity');
z=await req('/classes/enrolment',{class_id:hifdhId,student_ids:[legacyUnassigned,legacyUnassigned]},'PATCH');
assert.equal(z.status,400,'Roster rejects duplicate pupil IDs');

// Account recovery: generic acknowledgement, branded email, single-use token,
// confirmation validation, old session invalidation and reuse rejection.
const recoveryFetch=globalThis.fetch;
let recoveryPayload=null,recoverySends=0;
env.RESEND_API_KEY='test-reset-email';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 recoverySends++;
 recoveryPayload=JSON.parse(options.body);
 return new Response(JSON.stringify({id:'mock-reset'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 const unknown=await req('/auth/forgot',{email:'unknown-person@example.test'},'POST',false);
 assert.equal(unknown.status,200);
 const recovery=await req('/auth/forgot',{email:'admin@example.test'},'POST',false);
 assert.equal(recovery.status,200);
 assert.equal(unknown.data.message,recovery.data.message,'Do not reveal account existence');
 assert.equal(recoverySends,1);
 assert.equal(recoveryPayload.to[0],'admin@example.test');
 assert.equal(recoveryPayload.reply_to,env.ADMISSIONS_EMAIL);
 assert.ok(recoveryPayload.html.includes('السلام عليكم ورحمة الله وبركاته'));
 assert.ok(recoveryPayload.html.includes('Reset my password'));
 assert.ok(recoveryPayload.html.includes('30 minutes'));
 assert.ok(recoveryPayload.html.includes('portal.attowfiqmasjid.org'));
 const match=recoveryPayload.html.match(/\?reset=([a-zA-Z0-9_-]+)/);
 assert.ok(match,'Secure reset token must appear only in the email URL');
 const token=match[1];
 const duplicate=await req('/auth/forgot',{email:'admin@example.test'},'POST',false);
 assert.equal(duplicate.status,200);
 assert.equal(recoverySends,1,'Reset requests are throttled for an existing account');
 let attempt=await req('/auth/reset',{token,password:'short',confirm_password:'short'},'POST',false);
 assert.equal(attempt.status,400);
 attempt=await req('/auth/reset',{token,password:'new-super-secure-test-password',confirm_password:'mismatch-password'},'POST',false);
 assert.equal(attempt.status,400);
 attempt=await req('/auth/reset',{token,password:'new-super-secure-test-password',confirm_password:'new-super-secure-test-password'},'POST',false);
 assert.equal(attempt.status,200,JSON.stringify(attempt.data));
 attempt=await req('/auth/reset',{token,password:'another-secure-test-password',confirm_password:'another-secure-test-password'},'POST',false);
 assert.notEqual(attempt.status,200,'A used reset token cannot be reused');
 const signedOut=await req('/auth/me',null,'GET');
 assert.equal(signedOut.status,401,'Reset revokes existing sessions');
 const oldPassword=await req('/auth/login',{email:'admin@example.test',password:'this-is-a-secure-test-password'},'POST',false);
 assert.notEqual(oldPassword.status,200,'Old password cannot be used after recovery');
 const newLogin=await req('/auth/login',{email:'admin@example.test',password:'new-super-secure-test-password'},'POST',false);
 assert.equal(newLogin.status,200,JSON.stringify(newLogin.data));
 cookie=newLogin.response.headers.get('set-cookie').split(';')[0];
 csrf=newLogin.data.csrf;
}finally{
 globalThis.fetch=recoveryFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}

// v1.3.0 — Finance emails: new invoice, balance reminder and payment receipt.
// No bank transaction is created; the corresponding ledger record always saves first.
const originalFinanceFetch=globalThis.fetch;
const financePayloads=[];
env.RESEND_API_KEY='test-finance-emails';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 financePayloads.push(JSON.parse(options.body));
 return new Response(JSON.stringify({id:'finance-email-test-id'}),{status:200,headers:{'content-type':'application/json'}});
};
try{
 const fee=await req('/fees',{student_id,period:'2027-06',amount_pence:3000,due_date:'2027-06-30'});
 assert.equal(fee.status,200,JSON.stringify(fee.data));
 assert.equal(fee.data.notification_status,'sent','New individual invoice emails the guardian');
 const testFinanceInvoiceId=fee.data.id;
 assert.equal(financePayloads.length,1);
 assert.equal(financePayloads[0].to[0],application.guardian_email);
 assert.equal(financePayloads[0].reply_to,env.ADMISSIONS_EMAIL);
 assert.match(financePayloads[0].subject,/New fee invoice/);
 assert.ok(financePayloads[0].html.includes('Updated Learner'),'Full student name is in the finance email body');
 assert.ok(financePayloads[0].html.includes('June 2027'));
 assert.ok(financePayloads[0].html.includes('30 June 2027'));
 assert.ok(financePayloads[0].html.includes('£30.00'));
 assert.ok(financePayloads[0].html.includes('السلام عليكم ورحمة الله وبركاته'));
 assert.ok(financePayloads[0].html.includes('at-towfiq-madrasah-logo.png'));
 assert.ok(!financePayloads[0].subject.includes('Learner'),'The subject must not reveal pupil name');
 const reminder=await req('/fees/notify',{invoice_id:testFinanceInvoiceId});
 assert.equal(reminder.status,200,JSON.stringify(reminder.data));
 assert.equal(reminder.data.notification_status,'sent');
 assert.equal(financePayloads.length,2);
 assert.match(financePayloads[1].subject,/Fee balance reminder/);
 assert.ok(financePayloads[1].html.includes('£30.00'));
 // Only admin/staff can send messages, and parents cannot target other pupil invoices.
 const savedCookie=cookie,savedCsrf=csrf;
 cookie=parent_cookie;csrf=parent_csrf;
 const restricted=await req('/fees/notify',{invoice_id:testFinanceInvoiceId});
 assert.equal(restricted.status,403,'Parents cannot issue balance reminders');
 cookie=savedCookie;csrf=savedCsrf;
 assert.equal(financePayloads.length,2);
 const pmt=await req('/payments',{invoice_id:testFinanceInvoiceId,amount_pence:1000,method:'cash'});
 assert.equal(pmt.status,200,JSON.stringify(pmt.data));
 assert.equal(pmt.data.notification_status,'sent');
 assert.equal(financePayloads.length,3);
 assert.match(financePayloads[2].subject,/Payment receipt/);
 assert.ok(financePayloads[2].html.includes('£10.00'),'Receipt identifies the actual recorded amount');
 assert.ok(financePayloads[2].html.includes('£20.00'),'Receipt reports the remaining invoice balance');
 assert.ok(financePayloads[2].html.includes('Updated Learner'));
 assert.ok(!financePayloads[2].subject.includes('Updated Learner'));
 const allFees=await req('/fees',null,'GET');
 assert.equal(allFees.status,200);
 assert.equal(allFees.data.items.find(x=>x.id===testFinanceInvoiceId).paid_pence,1000);
 const settle=await req('/payments',{invoice_id:testFinanceInvoiceId,amount_pence:2000,method:'bank_transfer'});
 assert.equal(settle.status,200);
 assert.equal(settle.data.notification_status,'sent');
 assert.ok(financePayloads.at(-1).html.includes('Invoice fully paid'));
 const noReminder=await req('/fees/notify',{invoice_id:testFinanceInvoiceId});
 assert.equal(noReminder.status,200);
 assert.equal(noReminder.data.notification_status,'already_paid','Never email a payment demand for a settled invoice');
 assert.equal(financePayloads.length,4);
 const bogus=await req('/fees/notify',{invoice_id:'not-a-real-invoice'});
 assert.equal(bogus.status,404);
}finally{
 globalThis.fetch=originalFinanceFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}
// Provider outages never roll back a fee invoice or recorded cash payment.
const priorFinanceFetch=globalThis.fetch;
env.RESEND_API_KEY='test-finance-provider-outage';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async()=>new Response('Unavailable',{status:503});
try{
 const created=await req('/fees',{student_id,period:'2027-07',amount_pence:2500,due_date:'2027-07-30'});
 assert.equal(created.status,200,'Invoice must be saved despite failed notification');
 assert.equal(created.data.notification_status,'not_sent');
 assert.ok(sqlite.prepare('SELECT id FROM fee_invoices WHERE id=?').get(created.data.id));
 const recorded=await req('/payments',{invoice_id:created.data.id,amount_pence:2500,method:'cash'});
 assert.equal(recorded.status,200,'Payment must save despite email failure');
 assert.equal(recorded.data.notification_status,'not_sent');
 assert.ok(sqlite.prepare('SELECT id FROM payments WHERE id=?').get(recorded.data.id));
}finally{
 globalThis.fetch=priorFinanceFetch;
 delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;
}

z=await req('/auth/logout',{});assert.equal(z.status,200);
console.log('PASS: admissions and MATT registration numbers, login, classes, student profiles, valid/invalid Quran ranges, homework completion, behaviour, attendance, fees, account isolation, reports and settings.');

const admissionsUi=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
assert.equal(admissionsUi.includes("field('Daytime mobile number'"),false);
assert.equal(admissionsUi.includes("field('Parent / guardian address'"),false);
assert.ok(admissionsUi.includes('I consent to emergency first aid where necessary.'));
assert.ok(admissionsUi.includes('I consent to appropriate photographs for internal learning records.'));

assert.equal(admissionsUi.includes('data-value="add-student"'),false,'Student directory must not show Add student button');
assert.equal(admissionsUi.includes('data-value="bulk-import"'),false,'Student directory must not show Bulk import');
assert.ok(admissionsUi.includes("students:['students','classes','users','contacts','homework','behaviour','behaviour-catalog'"),'Student profile must load full behaviour catalogue');
assert.ok(admissionsUi.includes('function validateQuranVerses(data)'), 'Quran range validation must also be visible in the form');
assert.ok(admissionsUi.includes('const admissionReference=a=>'),'Administrators can locate applicants by emailed reference');
assert.ok(admissionsUi.includes("function notificationResultMessage(result,recordType)"),'Parents email delivery status shown to staff after save');
const notificationsWorker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
assert.ok(notificationsWorker.includes('studentNotificationRecipient'),'Guardian-only notification routing exists');
assert.ok(notificationsWorker.includes('notifyGuardianAboutRecord'),'Homework and behaviour notices share secure email routing');

assert.ok(admissionsUi.includes("acknowledgement_status==='sent'"),'Receipt submission status shown to administrator');
assert.ok(admissionsUi.includes('Starts as <strong>Incomplete</strong>'), 'Homework workflow explanation must be present');
assert.ok(admissionsUi.includes("function guardiansPage()"),'Student-linked guardians screen exists');
assert.ok(admissionsUi.includes("function staffPage()"),'Dedicated staff directory exists');
assert.ok(admissionsUi.includes("case 'edit-user'"),'Staff profile edit modal exists');
assert.ok(admissionsUi.includes('function invitationNotice('),'Invitation delivery result surfaced to staff');
assert.ok(admissionsUi.includes("guardian-invite-form"),'Guardian invitation uses the styled form');
assert.ok(admissionsUi.includes("guardian-invite-hero"),'Guardian invitation contains personalised summary');
assert.ok(admissionsUi.includes('name="greeting_name"'),'Guardian preferred name can be reviewed');
assert.equal(admissionsUi.includes("confirm('Send or regenerate an invitation"),false,'Never use a native browser confirm for parent invitations');

 
// v1.0.17: never show browser-owned confirm/prompt/alert pop-ups in shipped UI.
for(const path of ['../public/app.js','../public/index.html','../src/worker.js','../scripts/local-preview.mjs']){
 const code=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 assert.doesNotMatch(code,/\b(?:window\.|globalThis\.)?(?:confirm|prompt|alert)\s*\(/,'Native browser dialog is forbidden in '+path);
}
assert.doesNotThrow(()=>new Function(admissionsUi),'The portal UI script must parse after dialog conversion');
assert.ok(admissionsUi.includes('function confirmDialog('),'Reusable custom confirm dialog is available');
assert.ok(admissionsUi.includes('data-action="finance-notify"'),'Staff can send invoice statements');
assert.ok(admissionsUi.includes("if(a==='finance-notify')"),'Finance reminder has branded confirmation and action');
assert.ok(admissionsUi.includes('My family fee account'),'Parents see their private fee account');
assert.ok(admissionsUi.includes('fee-status-line'),'Fee statements show clear invoice statuses');

assert.ok(admissionsUi.includes("classChoices:get('classes')"),'Admission approval requires class selection');
assert.ok(admissionsUi.includes('class-roster-form'),'Class roster allocation form is accessible');
assert.ok(admissionsUi.includes('class-assignment-form'),'Student directory class assignment available');
assert.ok(admissionsUi.includes("class_id:raw.class_id"),'Class assignment writes chosen class to server');
assert.ok(admissionsUi.includes("'forgot-sent'"),'Forgot-password confirmation page exists');
assert.ok(admissionsUi.includes("'reset-success'"),'Password reset success page exists');
assert.ok(admissionsUi.includes("args.password!==args.confirm_password"),'Forgot-password flow confirms new password');

assert.ok(admissionsUi.includes('function familyDashboard()'),'Parent family dashboard is present');
assert.ok(admissionsUi.includes('family-switch'),'Family view switch appears in the UI');
assert.ok(admissionsUi.includes('x-portal-view'),'Family view requests carry their restricted role');
assert.ok(admissionsUi.includes("if(a==='family-switch')"),'Switch action is interactive');
assert.ok(admissionsUi.includes("result.invitation_status==='already_linked'"),'Existing parent links are treated as success in the UI');
assert.ok(admissionsUi.includes('Admission saved; directory refresh failed'),'Post-save refresh failures must not report enrolment as failed');
assert.ok(admissionsUi.includes('Admission saved; confirmation dialog failed'),'Email dialog errors must not report enrolment as failed');
assert.ok(admissionsUi.includes("result.already_enrolled?'This admission was already enrolled."),'Repeated acceptance shows idempotent success');

assert.ok(admissionsUi.includes('Linked · activation pending'),'Pending and active guardian status distinguished');
assert.ok(admissionsUi.includes("if(userCan('parent'))return familyDashboard()"),'Parent accounts receive family-specific dashboard');
assert.ok(admissionsUi.includes('get(\'attendance\')'),'Family dashboard loads attendance records');
assert.ok(admissionsUi.includes('get(\'behaviour\')'),'Family dashboard loads behaviour points');
assert.ok(admissionsUi.includes('get(\'fees\')'),'Family dashboard shows fee position');
assert.ok(admissionsUi.includes('data-action="family-student"'),'Each family card links to child profile');

assert.ok(admissionsUi.includes('role="alertdialog"'),'Custom dialog communicates accessible alert dialog semantics');
assert.ok(admissionsUi.includes('aria-modal="true"'),'Custom dialog announces modal focus');
assert.ok(admissionsUi.includes('requiredText:\'DELETE\''),'Permanent student deletion still requires typing DELETE');
assert.ok(admissionsUi.includes("typed.value.trim()!==requiredText"),'Destructive approval remains disabled until exact typed confirmation');
assert.ok(admissionsUi.includes("if(e.key==='Escape')"),'Keyboard Escape cancels the branded confirmation');
assert.ok(admissionsUi.includes('if(activeConfirmation)return Promise.resolve(false)'),'Parallel confirmation actions must not both execute');
for(const caseId of ['delete-student','delete-event','delete-announcement','toggle-user','demo-seed','send-jumah']){
 assert.ok(admissionsUi.includes("if(a==='"+caseId+"')"),'Action still available: '+caseId);
}
assert.ok(admissionsUi.includes("actionLabel:'Accept & enrol pupil'"),'Admissions acceptance requires a branded class-selection confirmation');
assert.ok(admissionsUi.includes("if(!classId){el.value=application?.status||'new';return;}"),'Cancelling class selection must restore original application status');
assert.ok(admissionsUi.includes("actionLabel:'Issue '+count+' invoices'"),'Bulk invoice confirmation is now branded');
assert.ok(admissionsUi.includes("actionLabel:'Send broadcast to all'"),'Bulk broadcast confirmation is now branded');

const portalStyles=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
assert.ok(portalStyles.includes('.guardian-invite-modal'),'Branded invitation styles must be present');
assert.ok(portalStyles.includes('.action-confirm-overlay'),'Every branded confirmation has dedicated overlay styling');
assert.ok(portalStyles.includes('.family-child-grid'),'Dedicated responsive family dashboard styles must be present');
assert.ok(portalStyles.includes('.action-confirm-dialog.tone-danger'),'Irreversible actions have visible danger styling');

const officialEmailConfig=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
assert.equal(officialEmailConfig.vars.EMAIL_FROM,'Madrasah At-Towfiq <notifications@attowfiqmasjid.org>');
assert.equal(officialEmailConfig.vars.ADMISSIONS_EMAIL,'admissions@attowfiqmasjid.org');
const officialEmailWorker=fs.readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
assert.ok(officialEmailWorker.includes('reply_to:options.replyTo'), 'Resend messages support Reply-To');
assert.ok(officialEmailWorker.includes('replyTo:env.ADMISSIONS_EMAIL'), 'Guardian invites reply to admissions');
