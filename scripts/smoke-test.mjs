/* Self-contained API smoke test using Node 22's experimental node:sqlite; does not require internet or Wrangler. */
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
import assert from 'node:assert/strict';
import {pbkdf2Sync,randomBytes} from 'node:crypto';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0002_expanded_admissions.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0003_safeguarding_declarations.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0004_enrol_accepted_admissions.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0005_student_registration_numbers.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0006_fix_decimal_student_year.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0007_attendance_family_alerts.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0008_pupil_progress_reports.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0009_compliance_communications.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0010_staff_dbs_review.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0011_dbs_evidence_received.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0012_in_app_notifications.sql',import.meta.url),'utf8'));sqlite.exec(fs.readFileSync(new URL('../migrations/0013_academic_calendar_communication_preferences.sql',import.meta.url),'utf8'));
sqlite.exec(fs.readFileSync(new URL('../migrations/0014_class_weekly_timetable.sql',import.meta.url),'utf8'));

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

// Regression: admin-curated masjid website video publishing and public-only feed.
let videoCheck=await req('/public/masjid-videos',undefined,'GET',false);
assert.equal(videoCheck.status,200,'Public masjid video endpoint requires no portal login');
assert.deepEqual(videoCheck.data.items,[]);
videoCheck=await req('/website/videos',{action:'create',url:'https://youtu.be/AbCdEfG1234',title:'Friday Khutbah — Community',category:'Khutbah',description:'A public sermon',published:false,featured:false});
assert.equal(videoCheck.status,200,JSON.stringify(videoCheck.data));
const savedVideo=videoCheck.data.items[0];
assert.equal(savedVideo.youtube_id,'AbCdEfG1234');
videoCheck=await req('/public/masjid-videos',undefined,'GET',false);
assert.deepEqual(videoCheck.data.items,[],'Drafts must never appear on the public feed');
videoCheck=await req('/website/videos',{action:'toggle',id:savedVideo.id});
assert.equal(videoCheck.status,200);
videoCheck=await req('/public/masjid-videos',undefined,'GET',false);
assert.equal(videoCheck.data.items.length,1,'A published video must appear in the public feed');
assert.equal(videoCheck.data.items[0].title,'Friday Khutbah — Community');
assert.equal(videoCheck.data.items[0].published,undefined,'Public feed must not expose private editor state');
assert.equal(videoCheck.data.items[0].url,undefined,'Public feed only includes curated public fields');
let invalidVideo=await req('/website/videos',{action:'create',url:'https://notyoutube.example/watch?v=AbCdEfG1234',title:'Malicious URL',published:true});
assert.equal(invalidVideo.status,400,'Unapproved video URLs are rejected');
invalidVideo=await req('/website/videos',{action:'create',url:'https://youtu.be/AbCdEfG1234',title:'Duplicate video',published:true});
assert.equal(invalidVideo.status,409,'Duplicate YouTube IDs are not allowed');
videoCheck=await req('/website/videos',{action:'delete',id:savedVideo.id});
assert.equal(videoCheck.status,200);
videoCheck=await req('/public/masjid-videos',undefined,'GET',false);
assert.deepEqual(videoCheck.data.items,[],'Deletion removes video from public feed');

// Old local preview accounts must remain readable after this fix.
const legacySalt=randomBytes(16).toString('base64');
const legacyDigest=pbkdf2Sync('legacy-password-123',Buffer.from(legacySalt,'base64'),210000,32,'sha256').toString('base64');
sqlite.prepare("INSERT INTO users(id,name,email,role,password_hash,password_salt) VALUES(?,?,?,?,?,?)").run('legacy-fixture','Local Legacy','legacy@example.test','staff',legacyDigest,legacySalt);
const legacyLogin=await req('/auth/login',{email:'legacy@example.test',password:'legacy-password-123'},'POST',false);
assert.equal(legacyLogin.status,200,JSON.stringify(legacyLogin.data));
z=await req('/classes',{name:'Foundation',stage:'Foundation',capacity:20});assert.equal(z.status,200,JSON.stringify(z.data));const class_id=z.data.id;
// v1.9.0: Weekly timetable is private, editable by office staff and validated
// against same-class, teacher and physical-room scheduling conflicts.
const timetableRow={class_id,weekday:6,starts_at:'10:00',ends_at:'12:00',subject:'Qur’an & Qaaidah',room:'Room A',notes:'Bring Qaaidah book'};
z=await req('/timetable',timetableRow);assert.equal(z.status,200,JSON.stringify(z.data));const timetableId=z.data.id;
z=await req('/timetable');assert.equal(z.status,200);assert.equal(z.data.items.length,1);
assert.equal(z.data.items[0].class_name,'Foundation');
assert.equal(z.data.items[0].weekday,6);
assert.equal(z.data.items[0].subject,timetableRow.subject);
z=await req('/timetable',{...timetableRow,starts_at:'11:30',ends_at:'12:30',room:'Room C'});
assert.equal(z.status,409,'A class cannot be double-booked');
z=await req('/timetable',{...timetableRow,starts_at:'12:00',ends_at:'13:00',subject:'Islamic Studies',room:'Room A'});
assert.equal(z.status,200,'Back-to-back sessions are permitted');const adjacentId=z.data.id;
z=await req('/timetable',{...timetableRow,weekday:0});assert.equal(z.status,400,'Invalid weekday blocked');
z=await req('/timetable',{...timetableRow,starts_at:'24:00'});assert.equal(z.status,400,'24:00 is not a valid wall clock time');
z=await req('/timetable',{...timetableRow,starts_at:'12:00',ends_at:'11:00'});assert.equal(z.status,400,'End cannot precede start');
z=await req('/timetable',{...timetableRow,class_id:'unknown-class'});assert.equal(z.status,404,'Class must exist');
z=await req('/classes',{name:'Timetable Studio A',stage:'Hifdh',capacity:16,teacher_id:'legacy-fixture'});assert.equal(z.status,200);const timetableClassA=z.data.id;
z=await req('/classes',{name:'Timetable Studio B',stage:'Qaaidah',capacity:16,teacher_id:'legacy-fixture'});assert.equal(z.status,200);const timetableClassB=z.data.id;
z=await req('/timetable',{...timetableRow,class_id:timetableClassA,starts_at:'10:30',ends_at:'11:30',subject:'Hifdh',room:'room a'});
assert.equal(z.status,409,'Rooms are case-insensitive and cannot overlap');
z=await req('/timetable',{...timetableRow,class_id:timetableClassA,starts_at:'10:30',ends_at:'11:30',subject:'Hifdh',room:'Room B'});
assert.equal(z.status,200);const teacherSessionId=z.data.id;
z=await req('/timetable',{...timetableRow,class_id:timetableClassB,starts_at:'10:45',ends_at:'11:45',subject:'Qur’an revision',room:'Room C'});
assert.equal(z.status,409,'A teacher cannot be scheduled to different classes simultaneously');
z=await req('/timetable',{...timetableRow,class_id:timetableClassB,starts_at:'11:30',ends_at:'13:00',subject:'Qur’an revision',room:'Room C'});
assert.equal(z.status,200,'Teacher can start another class as soon as the preceding session ends');
const alternateId=z.data.id;
z=await req('/classes',{id:timetableClassB,name:'Timetable Studio B',stage:'Qaaidah',capacity:16,teacher_id:'legacy-fixture',schedule:''},'PATCH');
assert.equal(z.status,200);
z=await req('/timetable',{id:timetableId,...timetableRow,weekday:5,starts_at:'09:30',ends_at:'11:00'},'PATCH');
assert.equal(z.status,200,'Admin can move a timetable session');
z=await req('/timetable');assert.equal(z.data.items.find(x=>x.id===timetableId).weekday,5);
z=await req('/timetable',{id:adjacentId},'DELETE');assert.equal(z.status,200);
z=await req('/timetable',{id:adjacentId},'DELETE');assert.equal(z.status,404,'Deleted lesson cannot be deleted again');
const anonymousTimetable=await req('/timetable',undefined,'GET',false);
assert.equal(anonymousTimetable.status,401,'Timetable must not be publicly accessible');
// Restore timetable on Saturday for the linked-family view test below.
z=await req('/timetable',{id:timetableId,...timetableRow},'PATCH');assert.equal(z.status,200);
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
// Only classes currently attended by this parent's active children may be read.
const timetableAdminCookie=cookie,timetableAdminCsrf=csrf;
cookie=parent_cookie;csrf=parent_csrf;
let familyTimetable=await req('/timetable');
assert.equal(familyTimetable.status,200,JSON.stringify(familyTimetable.data));
assert.ok(familyTimetable.data.items.some(x=>x.id===timetableId),'Parent sees their pupil’s class schedule');
assert.ok(familyTimetable.data.items.every(x=>x.class_id===class_id),'Parent never sees unrelated class schedules');
const familyClasses=await req('/classes');
assert.equal(familyClasses.status,200);
assert.ok(familyClasses.data.items.length>0);
assert.ok(familyClasses.data.items.every(x=>x.id===class_id),'Class directory must not expose other families’ class information');
familyTimetable=await req('/timetable',{...timetableRow,subject:'Unauthorised'},'POST');
assert.equal(familyTimetable.status,403,'Guardian cannot edit timetable');
cookie=timetableAdminCookie;csrf=timetableAdminCsrf;

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
const teacherVisibleTimetable=await req('/timetable');
assert.equal(teacherVisibleTimetable.status,200);
assert.ok(teacherVisibleTimetable.data.items.every(x=>x.teacher_id===staff_id),'Teacher view must not show unrelated class sessions');
const teacherFamilyTimetable=await req('/timetable',null,'GET',true,'family');
assert.equal(teacherFamilyTimetable.status,200);
assert.ok(teacherFamilyTimetable.data.items.every(x=>x.class_id===class_id),'Dual-role family view only shows the child’s class');
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


// v1.4.0: attendance is all-or-nothing, emails are opt-in and never repeated.
const schoolDateForTest=()=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const val=t=>parts.find(p=>p.type===t).value;
 return [val('year'),val('month'),val('day')].join('-');
};
const markDate=schoolDateForTest(),oldMailFetch=globalThis.fetch,absenceEmails=[];
env.RESEND_API_KEY='attendance-test-key';
env.EMAIL_FROM='Madrasah At-Towfiq <notifications@attowfiqmasjid.org>';
env.ADMISSIONS_EMAIL='admissions@attowfiqmasjid.org';
globalThis.fetch=async(url,opts)=>{
 assert.equal(String(url),'https://api.resend.com/emails');
 absenceEmails.push(JSON.parse(opts.body));
 return new Response(JSON.stringify({id:'test-absence-id'}),{status:200});
};
try{
 let r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent'},{student_id:'unknown',date:markDate,status:'present'}],notify_guardians:true});
 assert.equal(r.status,404,'Invalid pupil blocks entire batch');
 assert.equal(sqlite.prepare('SELECT id FROM attendance WHERE student_id=? AND date=?').get(student_id,markDate),undefined,'Batch was atomic');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'present'},{student_id,date:markDate,status:'absent'}]});
 assert.equal(r.status,400,'Duplicate entries rejected');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent',note:'PRIVATE DETAILS'}]});
 assert.equal(r.status,200);
 assert.equal(absenceEmails.length,0,'No automatic email without explicit opt-in');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'present'}],notify_guardians:true});
 assert.equal(r.status,200);
 assert.equal(r.data.alert_results.eligible,0,'Present statuses do not notify');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent',note:'PRIVATE DETAILS'}],notify_guardians:true});
 assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal(r.data.alert_results.sent,1);
 assert.equal(absenceEmails.length,1);
 assert.equal(absenceEmails[0].to[0],application.guardian_email);
 assert.equal(absenceEmails[0].reply_to,env.ADMISSIONS_EMAIL);
 assert.ok(absenceEmails[0].html.includes('Updated Learner'));
 assert.ok(absenceEmails[0].html.includes('Absent'));
 assert.ok(absenceEmails[0].html.includes('السلام عليكم ورحمة الله وبركاته'));
 assert.ok(!absenceEmails[0].html.includes('PRIVATE DETAILS'),'Internal notes cannot be sent');
 assert.ok(!absenceEmails[0].subject.includes('Learner'),'No pupil name in email subject');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent'}],notify_guardians:true});
 assert.equal(r.status,200);
 assert.equal(r.data.alert_results.eligible,0,'Re-saving absent cannot trigger a second email');
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'present'}]});
 assert.equal(r.status,200);
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent'}],notify_guardians:true});
 assert.equal(r.data.alert_results.already_attempted,1,'Corrections cannot resend previously sent notice');
 assert.equal(absenceEmails.length,1);
 assert.equal(sqlite.prepare('SELECT state FROM attendance_family_alerts WHERE student_id=? AND attendance_date=?').get(student_id,markDate).state,'sent');
 r=await req('/attendance',{records:[{student_id,date:'2026-01-15',status:'absent'}],notify_guardians:true});
 assert.equal(r.status,400,'Only today can trigger a notice');
 const prevCookie=cookie,prevCsrf=csrf;cookie=parent_cookie;csrf=parent_csrf;
 r=await req('/attendance',{records:[{student_id,date:markDate,status:'absent'}],notify_guardians:true});
 assert.equal(r.status,403,'Parent cannot issue absence alerts');
 cookie=prevCookie;csrf=prevCsrf;
 globalThis.fetch=async()=>new Response('Unavailable',{status:503});
 r=await req('/attendance',{records:[{student_id:student2,date:markDate,status:'absent'}],notify_guardians:true});
 assert.equal(r.status,200,'Email rejection must not roll back attendance');
 assert.equal(r.data.alert_results.not_sent,1);
 assert.ok(sqlite.prepare("SELECT id FROM attendance WHERE student_id=? AND date=? AND status='absent'").get(student2,markDate));
 assert.equal(sqlite.prepare('SELECT state FROM attendance_family_alerts WHERE student_id=? AND attendance_date=?').get(student2,markDate).state,'not_sent');
}finally{globalThis.fetch=oldMailFetch;delete env.RESEND_API_KEY;delete env.EMAIL_FROM;delete env.ADMISSIONS_EMAIL;}


// v1.5.0 – Monthly learner assessments, teacher scope and explicit publication.
const reportDraft={
 student_id,period:'2026-10',hifdh:'progressing',murajaa:'',qaaidah:'secure',
 islamic_studies:'developing',summary:'',next_steps:'',status:'draft'
};
let pr=await req('/progress-reports',reportDraft);
assert.equal(pr.status,200,JSON.stringify(pr.data));
const draftId=pr.data.id;
assert.equal(pr.data.status,'draft');
assert.equal(sqlite.prepare('SELECT status FROM pupil_progress_reports WHERE id=?').get(draftId).status,'draft');
pr=await req('/progress-reports');assert.equal(pr.status,200);
assert.ok(pr.data.items.some(x=>x.id===draftId),'Administrator may read an unpublished report');
pr=await req('/progress-reports',{...reportDraft},'POST');
assert.equal(pr.status,409,'A second report in the same month must be blocked');
pr=await req('/progress-reports',{...reportDraft,period:'2026-13'});
assert.equal(pr.status,400,'Invalid report month must be rejected');
pr=await req('/progress-reports',{...reportDraft,period:'2026-11',hifdh:'unverified'});
assert.equal(pr.status,400,'Assessments require one of the official progress levels');
pr=await req('/progress-reports',{id:draftId,status:'published',summary:'Too brief',hifdh:''},'PATCH');
assert.equal(pr.status,400,'Publishing requires a meaningful summary and assessment');
const savedAdminCookie=cookie,savedAdminCsrf=csrf;
cookie=parent_cookie;csrf=parent_csrf;
pr=await req('/progress-reports');assert.equal(pr.status,200);
assert.equal(pr.data.items.length,0,'A parent must never see an unpublished report');
pr=await req('/progress-reports',{...reportDraft,period:'2026-12',status:'published'});
assert.equal(pr.status,403,'Parents cannot create a report');
pr=await req('/progress-reports',{id:draftId,summary:'An unauthorised edit',status:'published'},'PATCH');
assert.equal(pr.status,403,'Parents cannot edit or publish a report');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
pr=await req('/progress-reports',{
 id:draftId,student_id,period:'2026-10',hifdh:'progressing',murajaa:'developing',
 qaaidah:'secure',islamic_studies:'progressing',
 summary:'Steady progress in Qur’an reading and early memorisation during the month.',
 next_steps:'Practise the assigned verses for ten minutes daily with a guardian.',
 status:'published'},'PATCH');
assert.equal(pr.status,200,JSON.stringify(pr.data));
assert.equal(pr.data.published,true);
assert.ok(sqlite.prepare('SELECT published_at FROM pupil_progress_reports WHERE id=?').get(draftId).published_at);
cookie=parent_cookie;csrf=parent_csrf;
pr=await req('/progress-reports');assert.equal(pr.status,200);
assert.deepEqual(pr.data.items.map(x=>x.id),[draftId],'Guardian sees only their linked pupil’s published report');
assert.match(pr.data.items[0].summary,/Steady progress/);
assert.match(pr.data.items[0].next_steps,/Practise the assigned verses/);
cookie=savedAdminCookie;csrf=savedAdminCsrf;
const otherClass=await req('/classes',{name:'Advanced Reports',stage:'Advanced',capacity:10});
assert.equal(otherClass.status,200,JSON.stringify(otherClass.data));
pr=await req('/students',{id:student2,class_id:otherClass.data.id},'PATCH');
assert.equal(pr.status,200,'Place unrelated pupil in a different teacher class');
pr=await req('/classes',{id:class_id,name:'Foundation',stage:'Foundation',capacity:20,teacher_id:staff_id,schedule:''},'PATCH');
assert.equal(pr.status,200,'Assign the Foundation class to the test teacher');
const otherReport={
 student_id:student2,period:'2026-10',hifdh:'secure',murajaa:'',
 qaaidah:'',islamic_studies:'',summary:'Consistent learning this month.',
 next_steps:'Read with a responsible adult.',status:'published'
};
pr=await req('/progress-reports',otherReport);
assert.equal(pr.status,200,JSON.stringify(pr.data));
const otherReportId=pr.data.id;
cookie=parent_cookie;csrf=parent_csrf;
pr=await req('/progress-reports');
assert.deepEqual(pr.data.items.map(x=>x.id),[draftId],'Another family’s published record must not leak');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
const teacherChildReport=await req('/progress-reports',{
 student_id:storedTeacherChild.id,period:'2026-10',hifdh:'developing',
 summary:'The pupil is beginning to read confidently with patient support.',
 next_steps:'Revise short passages together each week.',status:'published'
});
assert.equal(teacherChildReport.status,200,JSON.stringify(teacherChildReport.data));
const teacherCookie=staffPass.response.headers.get('set-cookie').split(';')[0];
cookie=teacherCookie;csrf=staffPass.data.csrf;
// /auth/me rotates CSRF on an existing session; refresh before exercising writes.
const teacherSession=await req('/auth/me');assert.equal(teacherSession.status,200);
csrf=teacherSession.data.csrf;
pr=await req('/progress-reports');assert.equal(pr.status,200);
assert.ok(pr.data.items.some(x=>x.id===draftId),'Assigned teacher sees class progress reports');
assert.ok(!pr.data.items.some(x=>x.id===otherReportId),'Teacher cannot read another class report');
pr=await req('/progress-reports',{...reportDraft,student_id:student2,period:'2026-11'});
assert.equal(pr.status,403,'Teacher cannot create reports for another class');
pr=await req('/progress-reports',{
 id:otherReportId,summary:'Attempted outside-class update',status:'published'},'PATCH');
assert.equal(pr.status,403,'Teacher cannot edit another class report by ID');
pr=await req('/progress-reports',{
 student_id,period:'2026-11',hifdh:'excellent',
 summary:'A confident and consistent learner in recitation this month.',
 next_steps:'Maintain a daily revision routine.',status:'draft'});
assert.equal(pr.status,200,'Assigned teacher may prepare a private draft for their class');
pr=await req('/progress-reports',null,'GET',true,'family');
assert.equal(pr.status,200);
assert.deepEqual(pr.data.items.map(x=>x.id),[teacherChildReport.data.id],
 'Dual-role teacher Family view sees only their own child’s published report');
pr=await req('/progress-reports',{...reportDraft,period:'2026-12'},'POST',true,'family');
assert.equal(pr.status,403,'Dual-role Family view cannot create a teaching report');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
pr=await req('/progress-reports',{
 id:draftId,status:'draft',hifdh:'progressing',murajaa:'developing',
 qaaidah:'secure',islamic_studies:'progressing',
 summary:'Steady progress in Qur’an reading and early memorisation during the month.',
 next_steps:'Practise the assigned verses for ten minutes daily with a guardian.'},'PATCH');
assert.equal(pr.status,200,'Staff can withdraw a report from family view');
cookie=parent_cookie;csrf=parent_csrf;
pr=await req('/progress-reports');
assert.equal(pr.data.items.some(x=>x.id===draftId),false,'Unpublishing immediately revokes family access');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
assert.ok(sqlite.prepare('SELECT COUNT(*) AS count FROM pupil_progress_reports').get().count>=4,
 'New report records remain separate from existing homework and attendance');


// v1.6.0 – secure two-way correspondence, consent snapshots and office compliance.
const msgRoot=sqlite.prepare("SELECT id FROM messages WHERE subject='Private pupil progress'").get()?.id;
assert.ok(msgRoot,'Existing pre-upgrade private messages remain in the inbox');
let comm=await req('/messages');assert.equal(comm.status,200);
assert.ok(comm.data.items.some(x=>x.id===msgRoot),'Office sees previously sent messages');
assert.ok(comm.data.items.some(x=>x.id===msgRoot&&x.conversation_id===msgRoot),
 'Legacy messages become conversation roots without rewriting existing records');
const foreignThread=await req('/messages',{recipient_id:staff_id,subject:'Office-only message',body:'Visible only to its participants'});
assert.equal(foreignThread.status,200,JSON.stringify(foreignThread.data));
const foreignRoot=foreignThread.data.id;
cookie=parent_cookie;csrf=parent_csrf;
comm=await req('/messages');assert.equal(comm.status,200);
assert.ok(comm.data.items.some(x=>x.id===msgRoot),'Guardian sees an existing private message');
assert.ok(!comm.data.items.some(x=>x.id===foreignRoot),'Guardian must not see an unrelated conversation');
comm=await req('/messages',{recipient_id:staff_id,subject:'Parent-initiated',body:'This must be denied'});
assert.equal(comm.status,400,'Guardian cannot start a new conversation without selecting their own child');
comm=await req('/messages',{reply_to:foreignRoot,body:'Not my conversation'});
assert.equal(comm.status,403,'Guardian cannot enter a conversation not addressed to them');
comm=await req('/messages',{id:msgRoot},'PATCH');assert.equal(comm.status,200,JSON.stringify(comm.data));
assert.ok(sqlite.prepare('SELECT read_at FROM messages WHERE id=?').get(msgRoot).read_at,
 'Recipient read marker is persisted');
comm=await req('/messages',{reply_to:msgRoot,recipient_id:staff_id,body:'Recipient spoof attempt'});
assert.equal(comm.status,403,'Reply recipients cannot be substituted');
comm=await req('/messages',{reply_to:msgRoot,body:'Thank you, I have seen the homework note.'});
assert.equal(comm.status,200,JSON.stringify(comm.data));
assert.equal(comm.data.conversation_id,msgRoot);
const parentReply=sqlite.prepare('SELECT * FROM messages WHERE id=?').get(comm.data.id);
assert.equal(parentReply.thread_root_id,msgRoot);
assert.equal(parentReply.recipient_id,savedAdminCookie?sqlite.prepare("SELECT id FROM users WHERE email='admin@example.test'").get().id:null);
assert.equal(parentReply.created_by,guardian_id);
comm=await req('/messages',{id:parentReply.id},'PATCH');
assert.equal(comm.status,403,'A sender cannot mark their own reply as read for its recipient');
comm=await req('/compliance/consents');assert.equal(comm.status,403,'Parents cannot enumerate admission declarations');
comm=await req('/compliance/policies');assert.equal(comm.status,403);
comm=await req('/compliance/concerns');assert.equal(comm.status,403);
// Parent-initiated conversations are limited to their linked child’s lead teacher.
let tc=await req('/contacts');assert.equal(tc.status,200);
assert.ok(tc.data.items.some(x=>x.id===staff_id&&x.role==='teacher'),
 'The guardian can choose the assigned lead teacher');
assert.ok(!tc.data.items.some(x=>x.id===foreignRoot),
 'Contact directory lists account IDs, not unrelated conversations');
assert.ok(tc.data.items.every(x=>x.role==='teacher'),'Parents cannot enumerate all staff contacts');
let newParent=await req('/messages',{recipient_id:staff_id,subject:'Question about revision',body:'May we review the assigned surah at home?'});
assert.equal(newParent.status,400,'A guardian must choose a linked pupil for a new teacher conversation');
newParent=await req('/messages',{recipient_id:staff_id,student_id:student2,subject:'Different pupil',body:'Forbidden'});
assert.equal(newParent.status,403,'Parents cannot message a teacher about an unlinked child');
newParent=await req('/messages',{recipient_id:sqlite.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get().id,student_id,subject:'Unauthorised staff contact',body:'Forbidden'});
assert.equal(newParent.status,403,'Parents can only start conversations with their child’s assigned teacher');
newParent=await req('/messages',{recipient_id:staff_id,student_id,subject:'Question about revision',body:'May we review the assigned surah at home?'});
assert.equal(newParent.status,200,JSON.stringify(newParent.data));
assert.equal(sqlite.prepare('SELECT recipient_id,created_by,student_id FROM messages WHERE id=?').get(newParent.data.id).recipient_id,staff_id);
const parentStartedId=newParent.data.id;
cookie=teacherCookie;csrf=teacherSession.data.csrf;
const teacherInbox=await req('/messages');assert.equal(teacherInbox.status,200);
assert.ok(teacherInbox.data.items.some(x=>x.id===parentStartedId),'Assigned teacher sees guardian-initiated conversation');
const teacherReply=await req('/messages',{reply_to:parentStartedId,body:'Yes, please revise the passage together each evening.'});
assert.equal(teacherReply.status,200,JSON.stringify(teacherReply.data));
assert.equal(teacherReply.data.conversation_id,parentStartedId);
cookie=parent_cookie;csrf=parent_csrf;
const parentInbox=await req('/messages');assert.ok(parentInbox.data.items.some(x=>x.id===teacherReply.data.id),
 'Guardian sees the teacher’s response in the same private conversation');

cookie=savedAdminCookie;csrf=savedAdminCsrf;
comm=await req('/messages');assert.ok(comm.data.items.some(x=>x.id===parentReply.id),'Office can read parent replies');
comm=await req('/messages',{id:parentReply.id},'PATCH');assert.equal(comm.status,200,'Office marks its own received reply read');
comm=await req('/compliance/consents');assert.equal(comm.status,200,JSON.stringify(comm.data));
const declared=comm.data.items.find(x=>x.student_id===student_id);
assert.ok(declared,'Original accepted admission is represented in the consent snapshot');
assert.equal(Number(declared.consent_first_aid),1);
assert.equal(Number(declared.consent_photos),0);
comm=await req('/compliance/policies');assert.equal(comm.status,200);
assert.deepEqual(comm.data.items,[],'No fictitious policy compliance is implied');
comm=await req('/compliance/policies',{title:'Child protection policy',category:'safeguarding',version:'1.0',owner:'DSL',review_due:'bad-date',status:'current',notes:''});
assert.equal(comm.status,400,'Review date must be validated');
comm=await req('/compliance/policies',{title:'Child protection policy',category:'safeguarding',version:'1.0',owner:'Designated lead',review_due:'2027-06-01',status:'draft',notes:'Pending approval'});
assert.equal(comm.status,200,JSON.stringify(comm.data));
const policyId=comm.data.id;
comm=await req('/compliance/policies',{id:policyId,title:'Child protection policy',category:'safeguarding',version:'1.1',owner:'Designated lead',review_due:'2027-06-01',status:'current',notes:'Approved by trustees'},'PATCH');
assert.equal(comm.status,200);
assert.equal(sqlite.prepare('SELECT version,status FROM compliance_policies WHERE id=?').get(policyId).version,'1.1');
comm=await req('/compliance/concerns',{kind:'possible_breach',title:'Simulated access error',occurred_on:'2026-10-28',description:'Fictional audit exercise',action_taken:'Restricted accounts verified'});
assert.equal(comm.status,200,JSON.stringify(comm.data));
const adminConcernId=comm.data.id;
const officeInvite=await req('/users',{name:'Compliance Office',email:'compliance.office@example.test',role:'staff'});
assert.equal(officeInvite.status,200,JSON.stringify(officeInvite.data));
assert.ok(officeInvite.data.invitation_url,'Fictional staff receives setup link');
const officeAuth=await req('/auth/accept-invite',{token:new URL(officeInvite.data.invitation_url).searchParams.get('invite'),password:'compliance-test-password-123'},'POST',false);
assert.equal(officeAuth.status,200,JSON.stringify(officeAuth.data));
cookie=officeAuth.response.headers.get('set-cookie').split(';')[0];csrf=officeAuth.data.csrf;
const officeSession=await req('/auth/me');assert.equal(officeSession.status,200);
csrf=officeSession.data.csrf;
comm=await req('/compliance/policies');assert.equal(comm.status,200);
assert.ok(comm.data.items.some(x=>x.id===policyId),'Office can review current policy register');
comm=await req('/compliance/policies',{title:'Unauthorised policy',category:'data_protection',status:'current',notes:''});
assert.equal(comm.status,403,'Only admins can change formal policy records');
comm=await req('/compliance/concerns');assert.equal(comm.status,200);
assert.ok(!comm.data.items.some(x=>x.id===adminConcernId),'Office staff cannot read another reporter’s concern');
comm=await req('/compliance/concerns',{kind:'access_review',title:'Review of permissions',occurred_on:'2026-10-28',description:'Account-role review needed',action_taken:''});
assert.equal(comm.status,200,JSON.stringify(comm.data));
const officeConcernId=comm.data.id;
comm=await req('/compliance/concerns');assert.ok(comm.data.items.some(x=>x.id===officeConcernId));
assert.ok(!comm.data.items.some(x=>x.id===adminConcernId));
comm=await req('/compliance/concerns',{id:officeConcernId,description:'Attempted closure',action_taken:'',status:'closed'},'PATCH');
assert.equal(comm.status,403,'Only administrators can close privacy concerns');
comm=await req('/compliance/consents');assert.equal(comm.status,200,'Staff can review admission declarations');
cookie=teacherCookie;csrf=teacherSession.data.csrf;
comm=await req('/compliance/consents');assert.equal(comm.status,403,'Teachers cannot read the office-wide consent register');
comm=await req('/compliance/concerns');assert.equal(comm.status,403,'Teachers cannot enumerate private office concerns');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
comm=await req('/compliance/concerns');assert.equal(comm.status,200);
assert.ok(comm.data.items.some(x=>x.id===adminConcernId)&&comm.data.items.some(x=>x.id===officeConcernId));
comm=await req('/compliance/concerns',{id:officeConcernId,description:'Account-role review needed',action_taken:'Audit complete; access limited',status:'closed'},'PATCH');
assert.equal(comm.status,200);
assert.equal(sqlite.prepare('SELECT status FROM compliance_concerns WHERE id=?').get(officeConcernId).status,'closed');


// v1.6.2 – new DBS checks must be uploaded atomically with their private certificate.
let dbs=await req('/compliance/dbs');assert.equal(dbs.status,200,JSON.stringify(dbs.data));
assert.equal(dbs.data.storage_ready,false,'Private R2 is not inferred from D1 alone');
assert.ok(dbs.data.items.some(p=>p.staff_id===staff_id&&p.alert==='not_recorded'));
const dbsDay=days=>new Date(Date.now()+days*86400000).toISOString().slice(0,10);
const checkInfo={staff_id:staff_id,check_level:'enhanced_barred',issued_on:dbsDay(-365),review_due:dbsDay(30),reference_last4:'A1B2',checked_on:dbsDay(-300)};
const pdfBytes=new Uint8Array([37,80,68,70,45,49,46,55,10,37,37,69,79,70,10]);
const dbsFileURL='/compliance/dbs/file?staff_id='+encodeURIComponent(staff_id);
async function dbsSubmit(data=checkInfo,{withFile=true,authorized=true,bytes=pdfBytes}={}){
 const fd=new FormData();
 for(const [key,value] of Object.entries(data))fd.append(key,String(value));
 if(withFile)fd.append('certificate',new Blob([bytes],{type:'application/pdf'}),'certificate.pdf');
 if(authorized)fd.append('retention_authorized','YES');
 const res=await worker.fetch(new Request('http://localhost:8787/api/compliance/dbs/submit',{
  method:'POST',headers:{origin:'http://localhost:8787','x-csrf-token':csrf,cookie},body:fd
 }),env);
 return {status:res.status,data:await res.json()};
}
dbs=await req('/compliance/dbs',checkInfo);
assert.equal(dbs.status,405,'Metadata-only requests must no longer create DBS records');
let up=await dbsSubmit(checkInfo,{withFile:false});
assert.equal(up.status,400,'Certificate mandatory at initial DBS registration');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM staff_dbs_checks').get().n,0,'No record saved when certificate missing');
up=await dbsSubmit();
assert.equal(up.status,503,'No records saved without private R2 storage');
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM staff_dbs_checks').get().n,0);
const privateFiles=new Map();
env.DBS_FILES={
 async put(key,data){privateFiles.set(key,new Uint8Array(data));},
 async get(key){const data=privateFiles.get(key);return data?{body:new Blob([data]).stream()}:null;},
 async delete(key){privateFiles.delete(key);}
};
up=await dbsSubmit({...checkInfo,issued_on:'2026-02-30'});
assert.equal(up.status,400,'Invalid calendar dates are rejected');
up=await dbsSubmit(checkInfo,{authorized:false});
assert.equal(up.status,403,'Temporary document retention must be authorised');
up=await dbsSubmit(checkInfo,{bytes:new Uint8Array([66,65,68,70,73,76,69,33])});
assert.equal(up.status,415,'Only genuine PDF/PNG/JPEG magic bytes accepted');
assert.equal(privateFiles.size,0);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM staff_dbs_checks').get().n,0);
up=await dbsSubmit();assert.equal(up.status,200,JSON.stringify(up.data));
assert.equal(up.data.certificate_received,true);
assert.equal(privateFiles.size,1,'New private certificate stored only in R2');
dbs=await req('/compliance/dbs');assert.equal(dbs.status,200);
assert.equal(dbs.data.storage_ready,true);
let staffCheck=dbs.data.items.find(p=>p.staff_id===staff_id);
assert.equal(staffCheck.alert,'due_soon','Due soon warning appears within 60 days');
assert.equal(staffCheck.reference_last4,'A1B2');
assert.ok(staffCheck.document_uploaded_at);
assert.ok(staffCheck.document_received_at,'Received timestamp is retained separate from live storage');
assert.ok(!('document_key' in staffCheck),'Private R2 key must not appear in JSON');
assert.equal(dbs.data.warnings,1);
// Recheck dates for already received evidence may be updated without reuploading an expired copy.
up=await dbsSubmit({...checkInfo,review_due:dbsDay(-5)},{withFile:false});
assert.equal(up.status,200);
dbs=await req('/compliance/dbs');assert.equal(dbs.data.items.find(p=>p.staff_id===staff_id).alert,'overdue');
up=await dbsSubmit({...checkInfo,review_due:dbsDay(90)},{withFile:false});
assert.equal(up.status,200);
dbs=await req('/compliance/dbs');assert.equal(dbs.data.warnings,0);
up=await dbsSubmit({...checkInfo,issued_on:dbsDay(-100)},{withFile:false});
assert.equal(up.status,400,'Replacing certificate issue date needs the new certificate');
up=await dbsSubmit({...checkInfo,issued_on:dbsDay(-100),review_due:dbsDay(90)});
assert.equal(up.status,200);
assert.equal(privateFiles.size,1,'Replacing an uploaded certificate removes the old private object');
let downloaded=await worker.fetch(new Request('http://localhost:8787/api'+dbsFileURL,{headers:{cookie}}),env);
assert.equal(downloaded.status,200);
assert.equal(downloaded.headers.get('cache-control'),'no-store, private');
assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),pdfBytes);
// Pre-existing metadata-only rows, like records made using v1.6.1, also require an upload.
const adminId=sqlite.prepare("SELECT id FROM users WHERE role='admin'").get().id;
sqlite.prepare("INSERT INTO staff_dbs_checks(id,user_id,check_level,issued_on,review_due) VALUES(?,?,?,?,?)").run('legacy-dbs-test',adminId,'enhanced',dbsDay(-100),dbsDay(300));
up=await dbsSubmit({staff_id:adminId,check_level:'enhanced',issued_on:dbsDay(-100),review_due:dbsDay(300),checked_on:''},{withFile:false});
assert.equal(up.status,400,'Historical date-only record must be completed with actual certificate');
up=await dbsSubmit({staff_id:adminId,check_level:'enhanced',issued_on:dbsDay(-100),review_due:dbsDay(300),checked_on:''});
assert.equal(up.status,200);
assert.equal(privateFiles.size,2);
// Access control applies to the combined save operation as well as file downloads.
cookie=parent_cookie;csrf=parent_csrf;
dbs=await req('/compliance/dbs');assert.equal(dbs.status,403);
up=await dbsSubmit();assert.equal(up.status,403);
dbs=await req(dbsFileURL);assert.equal(dbs.status,403);
cookie=officeAuth.response.headers.get('set-cookie').split(';')[0];csrf=officeSession.data.csrf;
up=await dbsSubmit();assert.equal(up.status,403,'Office staff must not upload DBS certificates');
cookie=teacherCookie;csrf=teacherSession.data.csrf;
up=await dbsSubmit();assert.equal(up.status,403,'Teachers must not upload DBS certificates');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
// Manual deletion removes just the retained copy, not the immutable received timestamp.
dbs=await req(dbsFileURL,{staff_id},'DELETE');assert.equal(dbs.status,200);
assert.equal(privateFiles.size,1);
const evidence=sqlite.prepare('SELECT document_key,document_received_at FROM staff_dbs_checks WHERE user_id=?').get(staff_id);
assert.equal(evidence.document_key,null);
assert.ok(evidence.document_received_at);
up=await dbsSubmit({...checkInfo,issued_on:dbsDay(-100),review_due:dbsDay(120)},{withFile:false});
assert.equal(up.status,200,'A short-lived deleted copy does not force indefinite storage of criminal history');
up=await dbsSubmit({...checkInfo,issued_on:dbsDay(-150),review_due:dbsDay(120)},{withFile:false});
assert.equal(up.status,400,'Change to a different issue date requires replacement evidence');
// Scheduled purge also leaves the minimal evidence-received date.
const adminFile=sqlite.prepare('SELECT document_key FROM staff_dbs_checks WHERE user_id=?').get(adminId).document_key;
sqlite.prepare('UPDATE staff_dbs_checks SET document_purge_after=? WHERE user_id=?').run('2020-01-01T00:00:00.000Z',adminId);
const purgeJobs=[];
await worker.scheduled({cron:'0 6 * * *'},env,{waitUntil(p){purgeJobs.push(p);}});
await Promise.all(purgeJobs);
assert.ok(!privateFiles.has(adminFile),'Scheduled purge destroys expired private certificate');
const adminEvidence=sqlite.prepare('SELECT document_key,document_received_at FROM staff_dbs_checks WHERE user_id=?').get(adminId);
assert.equal(adminEvidence.document_key,null);
assert.ok(adminEvidence.document_received_at);
delete env.DBS_FILES;


// v1.7.0 — provider-independent in-app notifications, role scoping and read receipts.
// Early behaviour exercises occurred before the guardian accepted their invitation.
// Active guardians receive new events after account activation, not a historical backfill.
const newCharacterUpdate=await req('/behaviour',{student_id,reason_code:'kindness',notes:'Private notes for attendance and pastoral review'});
assert.equal(newCharacterUpdate.status,200,JSON.stringify(newCharacterUpdate.data));
cookie=parent_cookie;csrf=parent_csrf;
let notice=await req('/notifications');
assert.equal(notice.status,200,JSON.stringify(notice.data));
const familyKinds=new Set(notice.data.items.map(x=>x.kind));
for(const kind of ['homework','behaviour','invoice','payment','progress','message']){
 assert.ok(familyKinds.has(kind),'Parent notification inbox should include '+kind+' events created after activation');
}
assert.ok(notice.data.unread>0,'New records must appear unread');
assert.ok(notice.data.items.every(x=>!('recipient_id' in x)),'Do not expose notification recipient identities in response payload');
assert.ok(notice.data.items.every(x=>!x.body.includes('Peanut allergy')),'No restricted child medical data in summaries');
assert.ok(notice.data.items.every(x=>!x.body.includes('Kind to a new student')),'No raw behaviour notes in notifications');
assert.ok(notice.data.items.every(x=>!x.body.includes('Yes, please revise')),'No private message contents in notification summaries');
const firstNotice=notice.data.items.find(x=>x.kind==='homework');
assert.ok(firstNotice);
let mark=await req('/notifications',{id:firstNotice.id},'PATCH');
assert.equal(mark.status,200,JSON.stringify(mark.data));
notice=await req('/notifications');
assert.ok(notice.data.items.find(x=>x.id===firstNotice.id).read_at,'A parent can acknowledge only their own notice');
const idempotent=await req('/notifications',{id:firstNotice.id},'PATCH');
assert.equal(idempotent.status,200,'Marking an already-read notification is harmless');
const originalUnread=notice.data.unread;
const hiddenId='hidden-unlinked-notice';
sqlite.prepare(`INSERT INTO portal_notifications(id,recipient_id,student_id,kind,source_id,title,body,target_page)
 VALUES(?,?,?,?,?,?,?,?)`).run(hiddenId,guardian_id,student2,'homework','other-family','Other family private','Hidden from guardian','homework');
notice=await req('/notifications');
assert.ok(!notice.data.items.some(x=>x.id===hiddenId),'Guardians cannot view notifications for unrelated children even if misaddressed');
assert.equal(notice.data.unread,originalUnread,'Hidden records must not affect unread count');
mark=await req('/notifications',{id:hiddenId},'PATCH');
assert.equal(mark.status,404,'Hidden notice cannot be acknowledged by unrelated guardian');
mark=await req('/notifications',{mark_all:true},'PATCH');
assert.equal(mark.status,200,'Bulk mark-read should affect visible notices only');
notice=await req('/notifications');assert.equal(notice.data.unread,0);
assert.equal(sqlite.prepare('SELECT read_at FROM portal_notifications WHERE id=?').get(hiddenId).read_at,null,
 'Bulk acknowledgement must not change a notice for an unrelated pupil');
let forbidden=await req('/notifications',{recipient_id:guardian_id,kind:'homework',source_id:'forged',title:'Forged'},'POST');
assert.equal(forbidden.status,405,'Nobody may forge a new notification through the API');
cookie=teacherCookie;csrf=teacherSession.data.csrf;
notice=await req('/notifications');assert.equal(notice.status,200);
assert.ok(notice.data.items.some(x=>x.kind==='message'),'Assigned teacher sees their own private message notification');
assert.ok(!notice.data.items.some(x=>x.id===firstNotice.id),'Teacher cannot read guardian notifications');
mark=await req('/notifications',{id:firstNotice.id},'PATCH');
assert.equal(mark.status,404,'Teachers cannot acknowledge a parent’s notice');
cookie=savedAdminCookie;csrf=savedAdminCsrf;
notice=await req('/notifications');assert.equal(notice.status,200);
assert.ok(!notice.data.items.some(x=>x.id===firstNotice.id),'Admin may not enumerate another account’s notices');
const unauthNotice=await req('/notifications',null,'GET',false);
assert.equal(unauthNotice.status,401,'Unauthenticated users cannot read notifications');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM portal_notifications WHERE kind='behaviour' AND source_id=? AND recipient_id=?").get(newCharacterUpdate.data.id,guardian_id).n,1,
 'Each event created after guardian activation is represented once per recipient');
sqlite.prepare('UPDATE portal_notifications SET created_at=? WHERE id=?').run('2020-01-01 00:00:00',hiddenId);
const scheduledNotificationJobs=[];
await worker.scheduled({cron:'0 6 * * *'},env,{waitUntil(p){scheduledNotificationJobs.push(p);}});
await Promise.all(scheduledNotificationJobs);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM portal_notifications WHERE id=?').get(hiddenId).n,0,
 'Daily cleanup removes notices older than 365 days');


// v1.8.0 — academic term and calendar validation, family channel consent and withdrawal.
const termData=(name,starts_on,ends_on)=>({name,academic_year:'2026/27',starts_on,ends_on,notes:'Test term'});
let acad=await req('/academic/terms',termData('Autumn','2026-09-05','2026-12-18'));assert.equal(acad.status,200,JSON.stringify(acad.data));
const autumn=acad.data.id;
acad=await req('/academic/terms',termData('Impossible','2026-02-30','2026-03-02'));assert.equal(acad.status,400);
acad=await req('/academic/terms',termData('Overlap','2026-11-01','2027-01-31'));assert.equal(acad.status,409);
acad=await req('/academic/terms',termData('Spring','2027-01-06','2027-03-31'));assert.equal(acad.status,200);
let dateEvent=await req('/academic/calendar',{term_id:autumn,title:'October closure',kind:'holiday',starts_on:'2026-10-26',ends_on:'2026-10-30',notes:'No lessons'});
assert.equal(dateEvent.status,200,JSON.stringify(dateEvent.data));const eventId=dateEvent.data.id;
acad=await req('/academic/calendar',{term_id:autumn,title:'Out of term',kind:'holiday',starts_on:'2027-01-07',ends_on:'2027-01-08'});assert.equal(acad.status,400);
acad=await req('/academic/calendar',{title:'Invalid classification',kind:'private_note',starts_on:'2026-11-01',ends_on:'2026-11-01'});assert.equal(acad.status,400);
acad=await req('/academic/terms',{id:autumn,...termData('Autumn shortened','2026-11-01','2026-12-18')},'PATCH');assert.equal(acad.status,409);
acad=await req('/academic/terms',{id:autumn},'DELETE');assert.equal(acad.status,409);
acad=await req('/academic/calendar');assert.equal(acad.status,200);
assert.ok(acad.data.items.some(x=>x.id===eventId&&x.term_name==='Autumn'));

cookie=parent_cookie;csrf=parent_csrf;
acad=await req('/academic/terms');assert.equal(acad.status,200,'Parents may view school terms');
acad=await req('/academic/calendar');assert.equal(acad.status,200,'Parents may view school dates');
acad=await req('/academic/terms',termData('No permission','2027-05-01','2027-06-01'));assert.equal(acad.status,403);
acad=await req('/academic/calendar',{title:'False event',kind:'other',starts_on:'2027-01-01',ends_on:'2027-01-01'});assert.equal(acad.status,403);
let pref=await req('/communication-preferences');assert.equal(pref.status,200);assert.equal(pref.data.preferences.sms_opt_in,0);
const chosen={mobile_e164:'+447700900123',sms_opt_in:true,whatsapp_opt_in:true,community_updates_opt_in:true,confirm_consent:true};
pref=await req('/communication-preferences',{...chosen,confirm_consent:false});assert.equal(pref.status,400,'Explicit opt-in confirmation required');
pref=await req('/communication-preferences',{...chosen,mobile_e164:'07700900123'});assert.equal(pref.status,400);
pref=await req('/communication-preferences',{...chosen,mobile_e164:''});assert.equal(pref.status,400);
pref=await req('/communication-preferences',{...chosen,user_id:'fake-other-user'});assert.equal(pref.status,200,JSON.stringify(pref.data));
assert.equal(pref.data.external_delivery_enabled,false,'No external sending enabled by an opt-in');
pref=await req('/communication-preferences');assert.equal(pref.data.preferences.sms_opt_in,1);assert.equal(pref.data.preferences.whatsapp_opt_in,1);
assert.equal(pref.data.preferences.mobile_e164,chosen.mobile_e164);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM guardian_communication_preference_audit WHERE user_id=?').get(guardian_id).n,1);
pref=await req('/communication-preferences',chosen);assert.equal(pref.data.changed,false);
pref=await req('/communication-preferences',{mobile_e164:'',sms_opt_in:false,whatsapp_opt_in:false,community_updates_opt_in:false,confirm_consent:false});assert.equal(pref.status,200);
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM guardian_communication_preference_audit WHERE user_id=?').get(guardian_id).n,2,'Withdrawal audited');
pref=await req('/communication-preferences');assert.equal(pref.data.preferences.sms_opt_in,0);

cookie=teacherCookie;csrf=teacherSession.data.csrf;
pref=await req('/communication-preferences');assert.equal(pref.status,403,'Staff role cannot view family preferences');
pref=await req('/communication-preferences',null,'GET',true,'family');assert.equal(pref.status,200,'Dual-role user can view Family preferences');
pref=await req('/communication-preferences',{...chosen,whatsapp_opt_in:false},'POST',true,'family');assert.equal(pref.status,200,'Dual-role user can opt-in in Family view');
pref=await req('/communication-preferences');assert.equal(pref.status,403);
cookie=savedAdminCookie;csrf=savedAdminCsrf;
acad=await req('/academic/calendar',{id:eventId},'DELETE');assert.equal(acad.status,200);
acad=await req('/academic/terms',{id:autumn},'DELETE');assert.equal(acad.status,200);
const checkCookie=cookie,checkCsrf=csrf;cookie='';csrf='';
acad=await req('/academic/terms');assert.equal(acad.status,401);
pref=await req('/communication-preferences');assert.equal(pref.status,401);
cookie=checkCookie;csrf=checkCsrf;

z=await req('/auth/logout',{});assert.equal(z.status,200);
console.log('PASS: admissions, learning, academic calendar, parent communication consent, notifications, DBS and compliance.');

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

assert.ok(admissionsUi.includes('function classroomPage()'),'Teacher classroom hub must exist');
assert.ok(admissionsUi.includes('function progressPage()'),'Family-visible learner reports must exist');
assert.ok(admissionsUi.includes("case 'progress-report'"),'The report editor modal must exist');
assert.ok(admissionsUi.includes("formId==='progress-report-form'"),'The report save/publish workflow must exist');
assert.ok(admissionsUi.includes("progressReportCards("),'Pupil reports are shown using the reusable renderer');
assert.ok(admissionsUi.includes('h(r.summary)'),'Progress narratives must be escaped against HTML injection');
assert.ok(admissionsUi.includes("data-value=\"progress\""),'Guardian dashboard links to progress reports');


// v1.6.0 UX: real threaded inbox, compliance centre, and styled forms.
assert.ok(admissionsUi.includes("function compliancePage()"),'Compliance dashboard exists');
assert.ok(admissionsUi.includes("function notificationPage()"),'Notification page must be rendered');
assert.ok(admissionsUi.includes("case'notifications':content=notificationPage();"),'Notification page must be in navigation');
assert.ok(admissionsUi.includes("notification-read-all"),'Notification read-all control is included');
assert.ok(admissionsUi.includes("notify-bell-count"),'Unread count shown in the top navigation bell');
assert.ok(!admissionsUi.includes("const _load=load;load="),'Avoid overriding the combined loader and losing DB storage metadata');

assert.ok(admissionsUi.includes("function dbsRegisterSection()"),'Compliance page must render DBS recheck register');
assert.ok(admissionsUi.includes("function dbsWarningCount()")||admissionsUi.includes("const dbsWarningCount=()"),'In-app recheck notification count must exist');
assert.ok(admissionsUi.includes("name=\"certificate\""),'The DBS edit/record dialog must include the certificate control');
assert.ok(admissionsUi.includes("formId==='dbs-record-form'"),'DBS save includes a combined document upload');
assert.ok(admissionsUi.includes("/compliance/dbs/submit"),'DBS form must use the multipart transactional endpoint');
assert.ok(admissionsUi.includes("formId==='dbs-upload-form'"),'Secure file upload path must exist');

assert.ok(admissionsUi.includes("function messageGroups()"),'Messages are grouped by conversation');
assert.ok(admissionsUi.includes("case 'reply-message'"),'Parent replies use a controlled dialog');
assert.ok(admissionsUi.includes("formId==='reply-message-form'"),'Replies are posted to the server');
assert.ok(admissionsUi.includes("case 'policy-record'"),'Policy register can be managed');
assert.ok(admissionsUi.includes("case 'compliance-concern'"),'Office can submit a concern');
assert.ok(admissionsUi.includes("case'compliance':content=compliancePage();"),'Compliance navigation has a rendered page');
assert.ok(admissionsUi.includes("h(m.body)"),'Private messages are HTML escaped');

assert.ok(admissionsUi.includes('function academicCalendarPage()'),'Calendar page exists');
assert.ok(admissionsUi.includes('function communicationPreferencesPage()'),'Guardian preferences page exists');
assert.ok(admissionsUi.includes("case 'academic-term'"),'Academic term form exists');
assert.ok(admissionsUi.includes("formId==='communication-preferences-form'"),'Consent form submits');
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
assert.ok(admissionsUi.includes('function timetablePage()'),'Weekly timetable page exists');
assert.ok(admissionsUi.includes("case'timetable':content=timetablePage()"),'Timetable has its own route');
const timetableMigration=fs.readFileSync(new URL('../migrations/0014_class_weekly_timetable.sql',import.meta.url),'utf8');
assert.ok(timetableMigration.includes('REFERENCES classes(id) ON DELETE CASCADE'),'Timetable has an indexed parent-class relation');
assert.ok(admissionsUi.includes("timetable:['timetable', 'classes']"),'Timetable loads its authorised class choices');
assert.ok(admissionsUi.includes("['timetable','Weekly timetable'"),'Timetable has school navigation');
assert.ok(admissionsUi.includes("case 'timetable-add':case 'timetable-edit'"),'Staff can create and edit weekly lessons');
assert.ok(admissionsUi.includes("if(a==='timetable-delete')"),'Staff can delete lessons with confirmation');
assert.ok(admissionsUi.includes("if(a==='timetable-print')"),'Printable weekly timetable exists');
assert.ok(admissionsUi.includes("window.print()"),'Print action calls the browser printing interface');

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


// Public Madrasah website admissions regression: creates a pending application only.
const madrasahOrigin='https://madrasah.attowfiqmasjid.org';
const publicAdmissionUrl='http://localhost:8787/api/public/admissions';
const admissionReady=await worker.fetch(new Request(publicAdmissionUrl,{
 headers:{Origin:madrasahOrigin},method:'GET'}),env);
assert.equal(admissionReady.status,200,'Public admission service readiness');
assert.equal((await admissionReady.json()).accepting,true);
assert.equal(admissionReady.headers.get('Access-Control-Allow-Origin'),madrasahOrigin);
const admissionOptions=await worker.fetch(new Request(publicAdmissionUrl,{
 headers:{Origin:madrasahOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'},
 method:'OPTIONS'}),env);
assert.equal(admissionOptions.status,204,'Admission preflight must allow approved site');
assert.equal(admissionOptions.headers.get('Access-Control-Allow-Origin'),madrasahOrigin);
const publicApplicant={first_name:'Public',last_name:'Applicant',dob:'2016-04-03',gender:'Female',
 home_address:'12 Sample Road',postcode:'BL3 5BJ',guardian_name:'Guardian Example',
 guardian_email:'public-guardian@example.test',guardian_phone:'07000123123',
 guardian_relationship:'Mother',previous_attended:'no',
 level_starting:true,level_qaaidah:false,level_quran:false,arabic_read_write:false,
 consent_first_aid:false,consent_photos:false,parent_confirmed:true,
 form_started_at:Date.now()-7000};
const admissionRequest=await worker.fetch(new Request(publicAdmissionUrl,{
 method:'POST',headers:{Origin:madrasahOrigin,'Content-Type':'application/json'},
 body:JSON.stringify(publicApplicant)}),env);
const admissionResult=await admissionRequest.json();
assert.equal(admissionRequest.status,201,JSON.stringify(admissionResult));
assert.match(admissionResult.reference,/^MAT-\d{4}-/);
const record=sqlite.prepare('SELECT * FROM admissions WHERE guardian_email=?').get('public-guardian@example.test');
assert.ok(record,'A public application must be written to the private admissions register');
assert.equal(record.status,'new','Public submissions cannot accept or enrol a child');
assert.equal(record.student_id,null,'No student record is created until staff acceptance');
assert.equal(record.parent_confirmed,1);
assert.equal(record.consent_photos,0,'Optional photo consent must remain unchecked');
const forbiddenAdmissionOrigin=await worker.fetch(new Request(publicAdmissionUrl,{
 method:'GET',headers:{Origin:'https://not-our-site.example'}}),env);
assert.equal(forbiddenAdmissionOrigin.status,403,'Foreign origins cannot submit');
const invalidPublic=await worker.fetch(new Request(publicAdmissionUrl,{
 method:'POST',headers:{Origin:madrasahOrigin,'Content-Type':'application/json'},
 body:JSON.stringify({...publicApplicant,gender:'Unknown',guardian_email:'invalid-another@example.test'})}),env);
assert.equal(invalidPublic.status,400,'Invalid gender is rejected before insertion');



// Admin dashboard admissions attention — no public/pupil data is exposed to teachers/parents.
const admissionDashboardSource=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
assert.ok(admissionDashboardSource.includes("function pendingAdmissionsPanel()"),'Pending admissions panel must exist on dashboard');
assert.ok(admissionDashboardSource.includes("function pendingApplications()"),'Application queue must exclude enrolled or decided pupils');
assert.ok(admissionDashboardSource.includes("a.status==='new'||a.status==='reviewing'"),'Both new and reviewing applicants count as pending');
assert.ok(admissionDashboardSource.includes("page==='dashboard'&&userCan('admin','staff')"),'Dashboard admissions must only be loaded for authorised roles');
assert.ok(admissionDashboardSource.includes("data-action=\"admission-open\""),'Pending application must have one-click review');
assert.ok(admissionDashboardSource.includes("if(a==='admission-open')"),'Review action must navigate into the admissions register');
assert.ok(admissionDashboardSource.includes("label:'Admissions to review'"),'Dashboard KPI must show pending applications');
assert.ok(!admissionDashboardSource.includes("Upcoming moments"),'Redundant upcoming moments panel should be replaced');
assert.ok(admissionDashboardSource.includes("classChoices:get('classes')"),'Admissions approval must continue requiring class allocation');

assert.ok(admissionDashboardSource.includes('id="admission-detail-status"'),'Application review dialog must expose status actions');
assert.ok(admissionDashboardSource.includes('document.querySelector(\'.modal-overlay\')?.remove();'),'Successful admission decisions should close stale dialogs');


// The public portal login can be crawled; confidential API responses must not be indexed.
const portalHomeHtml=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const portalRobots=fs.readFileSync(new URL('../public/robots.txt',import.meta.url),'utf8');
const portalSitemap=fs.readFileSync(new URL('../public/sitemap.xml',import.meta.url),'utf8');
assert.ok(portalHomeHtml.includes('href="https://portal.attowfiqmasjid.org/"'),'Portal public login has canonical URL');
assert.ok(portalHomeHtml.includes('name="robots" content="index,follow"'),'Public sign-in landing is indexable');
assert.ok(portalSitemap.includes('<loc>https://portal.attowfiqmasjid.org/</loc>'),'Sitemap lists public portal landing only');
assert.ok(!portalSitemap.includes('/api/')&&!portalSitemap.includes('/students'),'Private API and student routes excluded from portal sitemap');
assert.ok(portalRobots.includes('Disallow: /api/'),'Portal API blocked from crawler requests');
const portalHealth=await worker.fetch(new Request('https://portal.attowfiqmasjid.org/api/health'),env);
assert.equal(portalHealth.headers.get('X-Robots-Tag'),'noindex, nofollow','Portal API responses explicitly opt out of indexing');


// Regression: the website photo form must be intercepted by the central submit
// listener; otherwise the browser reloads and no D1 gallery row is written.
const galleryUi=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const delegatedPhotoSubmit=galleryUi.match(/document\.addEventListener\('submit',[\s\S]*?\}\);/);
assert.ok(delegatedPhotoSubmit?.[0].includes("'website-photo-form'"),'Gallery upload form must be handled by delegated submit listener');
assert.ok(galleryUi.includes("if(formId==='website-photo-form')"),'Gallery upload must have a submission handler');
assert.ok(galleryUi.includes("await fetch('/api/website/photos'"),'Gallery upload must POST to the portal API');
const galleryResponse=await worker.fetch(new Request('https://portal.attowfiqmasjid.org/api/public/masjid-photos'),env);
assert.equal(galleryResponse.status,200,'Published photo feed must be accessible');
assert.ok(Array.isArray((await galleryResponse.json()).items),'Published photo feed must contain an items array');
