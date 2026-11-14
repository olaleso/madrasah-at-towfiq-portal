import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyOnboardingHtml} from '../src/worker.js';

const children=[
 {first_name:'Amina',last_name:'Sample',student_no:'MATT-2026-0001'},
 {first_name:'Musa',last_name:'Sample',student_no:'MATT-2026-0002'}
];
test('follow-up explicitly continues the migration notice and lists siblings',()=>{
 const html=legacyOnboardingHtml('Maryam Sample',children,'https://portal.attowfiqmasjid.org/?invite=sample-token');
 assert.match(html,/Following our earlier email confirming the transfer of existing student records/);
 assert.match(html,/MATT-2026-0001/);
 assert.match(html,/MATT-2026-0002/);
 assert.match(html,/Activate my parent account/);
 assert.match(html,/invite=sample-token/);
 assert.match(html,/expires in 7 days/);
 assert.doesNotMatch(html,/application submitted for/);
});
test('existing accounts receive sign-in instructions, not activation links',()=>{
 const html=legacyOnboardingHtml('Maryam',children,'',true);
 assert.match(html,/existing password/);
 assert.match(html,/Family view/);
 assert.match(html,/Open my family portal/);
 assert.doesNotMatch(html,/invite=/);
});
test('follow-up escapes guardian and child names',()=>{
 const html=legacyOnboardingHtml('<script>',[
 {first_name:'<img>',last_name:'Sample',student_no:'MATT-2026-0003'}]);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<img>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;img&gt;/);
});

test('existing active guardian gets optional secure 30-minute reset link',()=>{
 const html=legacyOnboardingHtml('Parent',children,'',false,
 'https://portal.attowfiqmasjid.org/?reset=test-token');
 assert.match(html,/Set or reset my password/);
 assert.match(html,/reset=test-token/);
 assert.match(html,/30 minutes/);
 assert.match(html,/existing password remains valid/);
 assert.doesNotMatch(html,/invite=/);
});

test('legacy profile save closes its modal before refreshing student details',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const {resolve,dirname}=await import('node:path');
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const source=readFileSync(resolve(root,'public/app.js'),'utf8');
 const branch=source.match(/if\(formId==='legacy-completion-form'\)\{([\s\S]*?)\n \}/);
 assert.ok(branch,'legacy completion handler exists');
 assert.match(branch[1],/await post\('\/legacy-students\/profile',raw,'PATCH'\);/);
 assert.match(branch[1],/close\(\);\s*await navigate\(/);
});

test('parent completion banner ignores unassigned class while admin still tracks it',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const {resolve,dirname}=await import('node:path');
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 const worker=readFileSync(resolve(root,'src/worker.js'),'utf8');
 const app=readFileSync(resolve(root,'public/app.js'),'utf8');
 assert.match(worker,/AS legacy_parent_incomplete/);
 assert.match(worker,/s\.class_id IS NULL OR s\.parent_id IS NULL/);
 assert.match(app,/legacyPending=children\.filter\(s=>s\.legacy_imported&&s\.legacy_parent_incomplete\)/);
 assert.match(app,/userCan\('parent'\)\?s\.legacy_parent_incomplete:s\.legacy_incomplete/);
});

test('existing-account follow-up puts password recovery above portal sign-in',()=>{
 const html=legacyOnboardingHtml('Maryam',children,'',false,
  'https://portal.attowfiqmasjid.org/?reset=example');
 const reset=html.indexOf('>Set or reset my password</a>');
 const portal=html.indexOf('>Open my family portal</a>');
 assert.ok(reset>=0&&portal>=0&&reset<portal,
  'Password recovery should appear before portal sign-in');
});
