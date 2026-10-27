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
async function req(path,body,verb='POST',auth=true){const headers={'origin':'http://localhost:8787'};if(body){headers['Content-Type']='application/json';if(auth)headers['x-csrf-token']=csrf;}if(cookie&&auth)headers.cookie=cookie;const response=await worker.fetch(new Request('http://localhost:8787/api'+path,{method:body?verb:'GET',headers,body:body?JSON.stringify(body):undefined}),env);const data=await response.json();return {status:response.status,data,response};}
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
z=await req('/admissions',application);assert.equal(z.status,200,JSON.stringify(z.data));const application_id=z.data.id;
z=await req('/admissions');assert.equal(z.status,200);assert.equal(z.data.items.length,1);assert.equal(z.data.items[0].qaaidah_page,'15');assert.equal(z.data.items[0].consent_first_aid,1);assert.equal(z.data.items[0].consent_photos,0);assert.equal(z.data.items[0].allergies,'No allergies reported');assert.equal(z.data.items[0].medical_information,'Needs inhaler access when indicated');assert.equal(z.data.items[0].additional_learning_needs,'Extra reading support');assert.equal(z.data.items[0].mobile,'');assert.equal(z.data.items[0].guardian_address,'');assert.equal(z.data.items[0].child_name,'Sample Learner');
z=await req('/admissions',{...application,id:application_id,update_details:true,level_qaaidah:0,level_quran:1,quran_surah:'Al-Fatihah',previous_attended:'no',previous_institute:'',consent_first_aid:0,consent_photos:1,allergies:'Peanut allergy'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/admissions',{id:application_id,status:'reviewing'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/admissions');assert.equal(z.data.items[0].status,'reviewing');assert.equal(z.data.items[0].quran_surah,'Al-Fatihah');assert.equal(z.data.items[0].level_qaaidah,0);assert.equal(z.data.items[0].consent_first_aid,0);assert.equal(z.data.items[0].consent_photos,1);assert.equal(z.data.items[0].allergies,'Peanut allergy');
z=await req('/students',{first_name:'Amina',last_name:'Example',class_id});assert.equal(z.status,403,'Manual student creation is prohibited');
z=await req('/students/bulk',{items:[{first_name:'Example',last_name:'Learner'}]});assert.equal(z.status,403,'Bulk student import is prohibited');
z=await req('/admissions',{id:application_id,status:'accepted'},'PATCH');assert.equal(z.status,200,JSON.stringify(z.data));
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
z=await req('/admissions',secondApplication);assert.equal(z.status,200);const secondApplicationId=z.data.id;
z=await req('/admissions',{id:secondApplicationId,status:'accepted'},'PATCH');assert.equal(z.status,200);const student2=z.data.student_id;
assert.equal(sqlite.prepare('SELECT student_no FROM students WHERE id=?').get(student2).student_no,'MATT-'+new Date().getUTCFullYear()+'-0002');
z=await req('/admissions',{...application,first_name:'Inactive',last_name:'Test',guardian_email:'inactive@example.test'});assert.equal(z.status,200);const thirdApplicationId=z.data.id;
z=await req('/admissions',{id:thirdApplicationId,status:'accepted'},'PATCH');assert.equal(z.status,200);
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
// Guardian joins after admission: activation links their accepted child automatically.
z=await req('/users',{name:'Test Guardian',email:application.guardian_email,role:'parent'});assert.equal(z.status,200);assert.ok(z.data.invitation_url);
const guardian_id=z.data.id;
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student_id).parent_id,null,'Pending invitation must not link the pupil before activation');
const invite=new URL(z.data.invitation_url).searchParams.get('invite');
let pa=await req('/auth/accept-invite',{token:invite,password:'twelve-character-guardian-pass'},'POST',false);assert.equal(pa.status,200);
const parent_cookie=pa.response.headers.get('set-cookie').split(';')[0];const parent_csrf=pa.data.csrf;
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student_id).parent_id,guardian_id,'Activation links the unlinked accepted pupil by verified invitation email');
assert.equal(sqlite.prepare('SELECT parent_id FROM students WHERE id=?').get(student2).parent_id,null,'An unrelated pupil must not be linked');
const oldCookie=cookie,oldCsrf=csrf;cookie=parent_cookie;csrf=parent_csrf;
z=await req('/students');assert.equal(z.status,200);assert.equal(z.data.items.length,1);
z=await req('/behaviour');assert.equal(z.status,200);assert.equal(z.data.items.length,1);
z=await req('/homework',{student_id,type:'qaaidah',page_number:'12',due_date:'2026-11-04'});assert.equal(z.status,403,'Parent must not assign homework');
z=await req('/users');assert.equal(z.status,403,'Parent must not enumerate accounts');
z=await req('/admissions');assert.equal(z.status,403,'Parent must not view applicants');
z=await req('/fees/bulk',{mode:'all',period:'2027-02',amount_pence:3000,confirm:'ISSUE_BULK_INVOICES'});assert.equal(z.status,403,'Parents cannot bulk invoice pupils');
cookie=oldCookie;csrf=oldCsrf;
// Updating accepted admission details keeps the pupil's basic details in sync.
z=await req('/admissions',{...application,id:application_id,update_details:true,first_name:'Updated',last_name:'Learner',previous_attended:'no',previous_institute:''},'PATCH');
assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/students');assert.equal(z.data.items.find(x=>x.id===student_id).first_name,'Updated');
z=await req('/demo-seed',{});assert.equal(z.status,403,'Demo seeding cannot bypass admissions');
z=await req('/settings',{key:'jumah_enabled',value:'false'});assert.equal(z.status,200,JSON.stringify(z.data));
z=await req('/automation/preview');assert.equal(z.status,200);
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
assert.ok(admissionsUi.includes('Starts as <strong>Incomplete</strong>'), 'Homework workflow explanation must be present');