import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {validateLegacyRow,validateLegacyBatch,normalizeLegacyPhone,matchExistingLegacy} from '../src/legacy-students.mjs';
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
test('invalid dates, emails and possible duplicates are blocked',()=>{
 const row={source_row:12,first_name:'Example',last_name:'Learner',dob:'2026-02-31',
  gender:'Male',guardian_email:'not-an-email'};
 const tested=validateLegacyRow(row);
 assert.ok(tested.errors.some(s=>s.includes('date')));
 assert.ok(tested.errors.some(s=>s.includes('email')));
 const items=validateLegacyBatch([
  {...row,source_row:20,dob:'2017-06-09',guardian_email:'valid@example.test'},
  {...row,source_row:21,dob:'2017-06-09',guardian_email:'valid2@example.test'}
 ]);
 assert.ok(items.every(x=>x.errors.some(y=>y.includes('duplicate'))));
 const existing=[{first_name:'Example',last_name:'Learner',dob:'2017-06-09',student_no:'MATT-2026-0001'}];
 assert.equal(matchExistingLegacy({first_name:'Example',last_name:'Learner',dob:'2017-06-09'},existing).length,1);
 assert.equal(matchExistingLegacy({first_name:'Example',last_name:'Learner',dob:'2020-01-01'},existing).length,0);
 assert.equal(normalizeLegacyPhone('07500 000 111'),'07500 000 111');
});
test('import UI exposes guarded review and does not trigger parent invitations',()=>{
 const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("case'legacy':content=legacyPage()"));
 assert.ok(app.includes('legacy-commit-button'));
 assert.ok(client.includes('IMPORT LEGACY STUDENTS'));
 assert.ok(client.includes('Preview and check duplicates')||app.includes('Preview and check duplicates'));
 assert.ok(!client.includes('/guardians'));
});
