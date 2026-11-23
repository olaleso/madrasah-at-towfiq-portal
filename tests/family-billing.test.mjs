import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {groupFamilyFeeRows,allocateFamilyPayment} from '../src/family-billing.mjs';
const row=(invoice_id,student_id,guardian_id,period,amount,paid,other={})=>({
 invoice_id,student_id,guardian_id,period,amount_pence:amount,paid_pence:paid,
 first_name:student_id,last_name:'Example',student_no:'MATT-2026-0001',
 guardian_name:guardian_id||'No guardian',guardian_email:'parent@example.test',...other
});
test('group family invoices by guardian identity and period, not surname or email',()=>{
 const groups=groupFamilyFeeRows([
  row('a','Mary','parent-1','2026-11',3000,1000),
  row('b','Ali','parent-1','2026-11',3000,2000),
  row('c','Ali','parent-2','2026-11',3000,0),
  row('d','Mary','parent-1','2026-12',3000,0)
 ]);
 assert.equal(groups.length,3);
 const siblings=groups.find(g=>g.guardian_id==='parent-1'&&g.period==='2026-11');
 assert.equal(siblings.lines.length,2);
 assert.equal(siblings.total_pence,6000);
 assert.equal(siblings.paid_pence,3000);
 assert.equal(siblings.balance_pence,3000);
});
test('legacy invoices remain visible as a grouped statement without generating charges',()=>{
 const groups=groupFamilyFeeRows([
  row('x','One','parent-1','2025-10',3000,3000),
  row('y','Two','parent-1','2025-10',3000,0)
 ]);
 assert.equal(groups[0].formal,false);
 assert.equal(groups[0].invoice_number,null);
 assert.equal(groups[0].balance_pence,3000);
});
test('formal family invoice retains its issued reference',()=>{
 const groups=groupFamilyFeeRows([row('x','Child','parent-1','2026-11',3000,0,{
  family_invoice_id:'family-a',family_guardian_id:'parent-1',invoice_number:'MAT-FAM-202611-123'
 })]);
 assert.equal(groups[0].formal,true);
 assert.equal(groups[0].invoice_number,'MAT-FAM-202611-123');
 assert.equal(groups[0].requires_review,false);
});
test('mismatched linked guardian requires review',()=>{
 const groups=groupFamilyFeeRows([row('x','Child','parent-new','2026-11',3000,0,{
  family_invoice_id:'family-old',family_guardian_id:'parent-old',invoice_number:'FAM-OLD'
 })]);
 assert.equal(groups[0].requires_review,true);
 assert.equal(groups[0].formal,false);
});
test('unlinked pupils are not silently grouped under a guessed parent',()=>{
 const groups=groupFamilyFeeRows([row('x','One',null,'2026-11',3000,0),row('y','Two',null,'2026-11',3000,0)]);
 assert.equal(groups.length,2);
 assert.ok(groups.every(g=>g.requires_review));
});
test('family payment allocation draws from oldest outstanding student charges',()=>{
 const lines=[
  {invoice_id:'newer',student_id:'s2',due_date:'2026-12-01',balance_pence:3000},
  {invoice_id:'older',student_id:'s1',due_date:'2026-11-01',balance_pence:3000}
 ];
 assert.deepEqual(allocateFamilyPayment(lines,4500),[
  {invoice_id:'older',student_id:'s1',amount_pence:3000},
  {invoice_id:'newer',student_id:'s2',amount_pence:1500}
 ]);
 assert.equal(lines[0].balance_pence,3000,'Pure allocation does not mutate ledger');
});
test('payment cannot exceed outstanding balance',()=>{
 assert.throws(()=>allocateFamilyPayment([{invoice_id:'x',student_id:'s',balance_pence:500}],600),/exceeds/);
 assert.throws(()=>allocateFamilyPayment([{invoice_id:'x',student_id:'s',balance_pence:500}],0),/valid payment/);
});
test('family invoice UI and secure endpoints are registered',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../src/worker.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const pdf=readFileSync(new URL('../public/family-invoice.js',import.meta.url),'utf8');
 assert.match(app,/fees\/families\/eligible/);
 assert.match(app,/MadrasahFamilyBilling\?\.mount/);
 assert.match(worker,/if\(path==='\/api\/fees\/families\/issue'/);
 assert.match(worker,/if\(path==='\/api\/fees\/families\/payments'/);
 assert.match(worker,/if\(path==='\/api\/fees\/families\/notify'/);
 assert.match(worker,/requireRole\(user,'admin','staff'\)/);
 assert.match(html,/family-billing\.js/);
 assert.match(html,/family-invoice\.js/);
 assert.match(pdf,/new Blob\(parts,\{type:'application\/pdf'\}\)/);
});

test('fees page renders one unified family-and-student invoice section',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const family=readFileSync(new URL('../public/family-billing.js',import.meta.url),'utf8');
 const feesPage=app.slice(app.indexOf('function feesPage(){'),app.indexOf('const compliancePolicyCategories='));
 assert.match(feesPage,/MadrasahFamilyBilling\?\.html/);
 assert.doesNotMatch(feesPage,/Detailed student invoice ledger/);
 assert.match(family,/Invoices &amp; payments/);
 assert.match(family,/data-family-row/);
 assert.match(family,/data-action="cash-settle"/);
 assert.match(family,/data-action="finance-notify"/);
 assert.match(family,/data-action="modal" data-value="payment"/);
 assert.match(family,/group\.formal/);
});
