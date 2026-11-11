// Strict pure validation for administrator-only legacy school-roster imports.
// Never invent DOB, gender, class or guardian information. This is not
// the ordinary admissions flow and must not send automatic invitations.
const clean=(value,max=250)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const nameKey=row=>[row.first_name,row.last_name].map(s=>clean(s,100).toLocaleLowerCase('en-GB')).join('|');
export function validLegacyDate(value){
 const s=clean(value,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s&&
  s>='1900-01-01'&&s<=new Date().toISOString().slice(0,10);
}
export function normalizeLegacyPhone(value){
 const source=clean(value,40);
 const digits=source.replace(/[^0-9]/g,'');
 if(digits.length===10&&digits.startsWith('7'))return '0'+digits;
 if(digits.length===12&&digits.startsWith('44'))return '0'+digits.slice(2);
 return source;
}
export function validateLegacyRow(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const student={
  source_row:Number(r.source_row),
  first_name:clean(r.first_name,80),
  last_name:clean(r.last_name,80),
  dob:clean(r.dob,10),gender:clean(r.gender,32),
  guardian_name:clean(r.guardian_name,120),
  guardian_email:clean(r.guardian_email,254).toLowerCase(),
  guardian_phone:normalizeLegacyPhone(r.guardian_phone),
  address:clean(r.address,260),class_id:clean(r.class_id,100),
  review_note:clean(r.review_note,500)
 };
 const errors=[];
 if(!Number.isSafeInteger(student.source_row)||student.source_row<2||student.source_row>100000)
  errors.push('Invalid original spreadsheet row');
 for(const field of ['first_name','last_name']){
  if(!student[field])errors.push('Missing student '+field.replace('_',' '));
  if(/[<>]/.test(student[field]))errors.push('Invalid student name');
 }
 if(student.dob&&!validLegacyDate(student.dob))errors.push('Invalid date of birth');
 if(student.gender&&!['Male','Female','Prefer not to say'].includes(student.gender))
  errors.push('Gender must be Male, Female, Prefer not to say or blank');
 if(student.guardian_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.guardian_email))
  errors.push('Invalid guardian email');
 if(student.guardian_phone&&(student.guardian_phone.length>35||/[<>]/.test(student.guardian_phone)))
  errors.push('Invalid phone number');
 if(/[<>]/.test(student.guardian_name)||/[<>]/.test(student.address))
  errors.push('Invalid contact details');
 const missing=[];
 for(const [key,label] of [
  ['dob','Date of birth'],['gender','Gender'],['guardian_name','Guardian name'],
  ['guardian_email','Email'],['guardian_phone','Phone'],['address','Address'],['class_id','Class']
 ])if(!student[key])missing.push(label);
 const warnings=[];
 if(student.review_note)warnings.push(student.review_note);
 if(missing.length)warnings.push('Missing: '+missing.join(', '));
 return {student,errors,warnings,missing,name_key:nameKey(student)};
}
export function matchExistingLegacy(student,existing){
 return existing.filter(s=>
  nameKey(s)===nameKey(student)&&(!s.dob||!student.dob||s.dob===student.dob)
 );
}
export function validateLegacyBatch(items){
 if(!Array.isArray(items)||items.length<1||items.length>100)
  throw new Error('Select 1 to 100 legacy pupils in a batch');
 const checked=items.map(validateLegacyRow);
 const rows=new Set(),same=new Map();
 for(const result of checked){
  const {student,errors}=result;
  if(rows.has(student.source_row))errors.push('Duplicate source row');
  rows.add(student.source_row);
  const key=result.name_key+'|'+(student.dob||'?');
  if(same.has(key)){
   errors.push('Possible duplicate pupil within this file');
   checked[same.get(key)].errors.push('Possible duplicate pupil within this file');
  }else same.set(key,checked.indexOf(result));
 }
 return checked;
}
