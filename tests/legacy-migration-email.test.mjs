import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyMigrationEmail,LEGACY_MIGRATION_SUBJECT} from '../src/legacy-migration-email.mjs';

test('branded migration email lists siblings and their MATT registration numbers',()=>{
 const html=legacyMigrationEmail({guardianName:'Maryam Sample',
  children:[{first_name:'Amina',last_name:'Sample',student_no:'MATT-2026-0001'},
            {first_name:'Musa',last_name:'Sample',student_no:'MATT-2026-0002'}]});
 assert.match(LEGACY_MIGRATION_SUBJECT,/child.s record/);
 assert.match(html,/Amina Sample/);
 assert.match(html,/Musa Sample/);
 assert.match(html,/MATT-2026-0001/);
 assert.match(html,/MATT-2026-0002/);
 assert.match(html,/portal\.attowfiqmasjid\.org/);
 assert.match(html,/24 Punch Street/);
 assert.match(html,/media\(max-width:620px\)/);
 assert.match(html,/do <strong>not<\/strong> need to submit a new admission/);
 assert.ok(!html.includes('password='));
});
test('email escapes all imported guardian and child names',()=>{
 const html=legacyMigrationEmail({guardianName:'<script>alert(1)</script>',
  children:[{first_name:'<img src=x>',last_name:'A & B',student_no:'MATT-2026-0001'}]});
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img src=x>'));
 assert.ok(html.includes('&lt;img src=x&gt;'));
 assert.ok(html.includes('A &amp; B'));
});
