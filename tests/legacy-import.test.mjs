import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {validateLegacyRow,validateLegacyBatch,normalizeLegacyPhone,normalizeLegacyDob,matchExistingLegacy} from '../src/legacy-students.mjs';
const client=fs.readFileSync(new URL('../public/legacy-import.js',import.meta.url),'utf8');
const sandbox={window:{}};
vm.runInNewContext(client,sandbox,{timeout:1000});
const parser=sandbox.window.MadrasahLegacyImport;
test('CSV parser handles BOM, CRLF, quoted commas and embedded line breaks',()=>{
 const rows=parser.parseCsv('\uFEFFsource_row,first_name,last_name,address\r\n2,"Amina","Test","15 Road, Bolton"\r\n3,Bilal,Test,"Apt 3\nBolton"');
 assert.equal(rows.length,3);
 assert.equal(rows[1][3],'15 Road, Bolton');
 assert.equal(rows[2][3],'Apt 3\nBolton');
});
test('legacy data validation allows missing DOB, gender and family contacts without inventing them',()=>{
 const value={source_row:11,first_name:'Example',last_name:'Learner',
  dob:'',gender:'',guardian_name:'',guardian_email:'',guardian_phone:'7500000022',address:'',class_id:''};
 const result=validateLegacyRow(value);
 assert.deepEqual(result.errors,[]);
 assert.equal(result.student.dob,'');
 assert.equal(result.student.gender,'');
 assert.equal(result.student.guardian_phone,'07500000022');
 assert.ok(result.missing.includes('Date of birth'));
 assert.ok(result.missing.includes('Email'));
});
test('invalid or future birth dates are saved blank and visible in review notes',()=>{
 const row={source_row:12,first_name:'Example',last_name:'Learner',dob:'2027-10-23',
  gender:'unknown',guardian_email:'not-an-email'};
 const tested=validateLegacyRow(row);
 assert.deepEqual(tested.errors,[]);
 assert.equal(tested.student.dob,'');
 assert.equal(tested.student.gender,'');
 assert.equal(tested.student.guardian_email,'');
 assert.ok(tested.missing.includes('Date of birth'));
 assert.match(tested.student.review_note,/Unverified DOB/);
 assert.match(tested.student.review_note,/Unverified guardian email/);
 assert.ok(tested.warnings.some(x=>x.includes('Unverified DOB')));
});
test('UK dates, ISO timestamps and Excel date serials are normalised without guessing',()=>{
 assert.equal(normalizeLegacyDob('27/10/2008').dob,'2008-10-27');
 assert.equal(normalizeLegacyDob('7.1.2017').dob,'2017-01-07');
 assert.equal(normalizeLegacyDob('2017-06-09T00:00:00.000Z').dob,'2017-06-09');
 assert.equal(normalizeLegacyDob('45000').dob,'2023-03-15');
 for(const input of ['2017-02-30','2027-10-23','13/0/2019','unknown']){
  const result=normalizeLegacyDob(input);
  assert.equal(result.dob,'',input);
  assert.ok(result.warning.includes('Unverified DOB'),input);
 }
 assert.equal(normalizeLegacyDob('2017-06-09').warning,'');
});
test('85 historic pupils can be previewed with missing or invalid optional details',()=>{
 const batch=Array.from({length:85},(_,i)=>({
  source_row:i+2,first_name:'Pupil'+(i+1),last_name:'Existing',
  dob:i%3===0?'30/02/2017':i%3===1?'27/10/2008':'',
  gender:'',guardian_name:'',guardian_email:'',guardian_phone:'',
  class_id:'',address:''
 }));
 const checked=validateLegacyBatch(batch);
 assert.equal(checked.length,85);
 assert.ok(checked.every(x=>x.errors.length===0));
 assert.equal(checked.filter(x=>x.student.dob==='').length,57);
});
test('possible duplicate pupils and invalid source identity still block import',()=>{
 const row={source_row:20,first_name:'Example',last_name:'Learner',dob:'2017-06-09'};
 const checked=validateLegacyBatch([row,{...row,source_row:21}]);
 assert.ok(checked.every(x=>x.errors.some(y=>y.includes('duplicate'))));
 assert.ok(validateLegacyRow({...row,first_name:''}).errors.some(x=>x.includes('first name')));
 const existing=[{first_name:'Example',last_name:'Learner',dob:'2017-06-09',student_no:'MATT-2026-0001'}];
 assert.equal(matchExistingLegacy(row,existing).length,1);
 assert.equal(matchExistingLegacy({...row,dob:'2020-01-01'},existing).length,0);
 assert.equal(normalizeLegacyPhone('07500 000 111'),'07500 000 111');
});
test('historical class names not found in portal remain unassigned for later allocation',()=>{
 const headers='source_row,first_name,last_name,dob,gender,guardian_name,guardian_email,guardian_phone,address,class_name,review_note';
 const rows=parser.buildRows(headers+'\\n2,Example,Pupil,27/10/2008,,,,,,Previous Class,',[]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].class_id,'');
 assert.ok(rows[0].review_note.includes('Unmatched old class'));
});
test('import UI exposes guarded review and does not trigger parent invitations',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("case'legacy':content=legacyPage()"));
 assert.ok(app.includes('legacy-commit-button'));
 assert.ok(client.includes('IMPORT LEGACY STUDENTS'));
 assert.ok(client.includes('Preview and check duplicates')||app.includes('Preview and check duplicates'));
 assert.ok(!client.includes('/guardians'));
});
