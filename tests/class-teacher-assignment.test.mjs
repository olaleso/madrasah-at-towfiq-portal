import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');

test('each class card has a dedicated teacher assignment action and a modal',()=>{
 assert.match(app,/data-value="assign-teacher" data-id="\$\{h\(c\.id\)\}"/);
 assert.match(app,/case 'assign-teacher':/);
 assert.match(app,/form='class-teacher-form'/);
 assert.match(app,/classTeacherOptions\(c\.teacher_id\|\|''\)/);
 assert.match(app,/class-teacher-form'\)\{await post\('\/classes\/teacher'/);
});
test('teacher list loads via an administrator and staff-accessible dedicated endpoint',()=>{
 assert.match(app,/classes:\['classes','classes\/teachers','students'/);
 assert.match(worker,/if\(path==='\/api\/classes\/teachers'&&method==='GET'\)/);
 assert.match(worker,/WHERE role='teacher' AND active=1 ORDER BY name/);
});
test('teacher assignment checks permissions, account status and class timetable',()=>{
 assert.match(worker,/if\(path==='\/api\/classes\/teacher'&&method==='PATCH'\)/);
 assert.match(worker,/const teacherId=await checkedClassTeacher\(b\.teacher_id,classId\)/);
 assert.match(worker,/SELECT id FROM users WHERE id=\? AND role='teacher' AND active=1/);
 assert.match(worker,/other\.starts_at<mine\.ends_at/);
 assert.match(worker,/other\.ends_at>mine\.starts_at/);
 assert.match(worker,/assign_class_teacher/);
});

test('staff directory exposes deletion for inactive teachers only with typed confirmation',()=>{
 assert.match(app,/u\.role==='teacher'&&!u\.active/);
 assert.match(app,/data-action="delete-teacher"/);
 assert.match(app,/requiredText:target\.email/);
 assert.match(app,/confirmation:'DELETE TEACHER'/);
 assert.match(worker,/if\(method==='DELETE'\)\{\s*const b=await input\(req\)/);
 assert.match(worker,/target\.role!=='teacher'/);
 assert.match(worker,/Number\(target\.active\)!==0/);
 assert.match(worker,/PRAGMA foreign_key_list/);
 assert.match(worker,/DELETE FROM users WHERE id=\? AND role='teacher' AND active=0/);
});
