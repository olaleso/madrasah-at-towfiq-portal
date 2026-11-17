// Family billing calculations. Monetary amounts are always integer pence.
// The student invoice and payment ledger remains authoritative.
export function groupFamilyFeeRows(rows){
 const byFamily=new Map();
 for(const row of rows){
  const guardian=String(row.guardian_id||'');
  const period=String(row.period||'');
  const key=(guardian||'unlinked:'+row.student_id)+'|'+period;
  let group=byFamily.get(key);
  if(!group){
   group={
    key,guardian_id:guardian||null,guardian_name:row.guardian_name||'Guardian not linked',
    guardian_email:row.guardian_email||'',period,
    family_invoice_id:null,invoice_number:null,formal:false,
    total_pence:0,paid_pence:0,balance_pence:0,due_date:null,
    requires_review:!guardian,lines:[]
   };
   byFamily.set(key,group);
  }
  const amount=Number(row.amount_pence||0),paid=Number(row.paid_pence||0);
  if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(paid)||amount<0||paid<0)
   throw Error('Invalid amount in student ledger');
  const mismatch=Boolean(row.family_invoice_id&&row.family_guardian_id!==guardian);
  if(mismatch)group.requires_review=true;
  if(row.family_invoice_id&&!mismatch){
   group.family_invoice_id=row.family_invoice_id;
   group.invoice_number=row.invoice_number||null;
   group.formal=true;
  }
  const line={
   invoice_id:row.invoice_id,student_id:row.student_id,
   student_no:row.student_no||'',student_name:[row.first_name,row.last_name].filter(Boolean).join(' '),
   amount_pence:amount,paid_pence:paid,balance_pence:Math.max(0,amount-paid),
   due_date:row.due_date||null
  };
  group.lines.push(line);
  group.total_pence+=amount;
  group.paid_pence+=paid;
  group.balance_pence+=line.balance_pence;
  if(line.due_date&&(!group.due_date||line.due_date<group.due_date))group.due_date=line.due_date;
 }
 return [...byFamily.values()].map(g=>{
  g.lines.sort((a,b)=>a.student_name.localeCompare(b.student_name));
  return g;
 }).sort((a,b)=>b.period.localeCompare(a.period)||a.guardian_name.localeCompare(b.guardian_name));
}
export function allocateFamilyPayment(lines,value){
 const amount=Number(value);
 if(!Number.isSafeInteger(amount)||amount<1)throw Error('Enter a valid payment amount');
 const sorted=[...lines].sort((a,b)=>String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'))||
  String(a.invoice_id).localeCompare(String(b.invoice_id)));
 const outstanding=sorted.reduce((sum,line)=>sum+Math.max(0,Number(line.balance_pence||0)),0);
 if(amount>outstanding)throw Error('Payment exceeds this family invoice balance');
 let remaining=amount;
 const allocations=[];
 for(const line of sorted){
  if(!remaining)break;
  const portion=Math.min(remaining,Math.max(0,Number(line.balance_pence||0)));
  if(portion){allocations.push({invoice_id:line.invoice_id,student_id:line.student_id,amount_pence:portion});remaining-=portion;}
 }
 if(remaining)throw Error('Unable to allocate the full payment');
 return allocations;
}
