// Branded, responsive guardian notice for existing pupils moved to the portal.
// Transport happens separately. This template does not create parent accounts,
// grant portal access, or claim that all pupil information has been verified.
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const LEGACY_MIGRATION_SUBJECT='Your child’s record is moving to Madrasah At-Towfiq’s new portal';
export function legacyMigrationEmail({guardianName='',children=[],schoolEmail='admissions@attowfiqmasjid.org'}={}){
 const first=String(guardianName||'').trim().split(/\s+/)[0]||'Parent / Guardian';
 const rows=children.map(child=>{
  const pupil=[child.first_name,child.last_name].filter(Boolean).join(' ').trim();
  return `<tr><td style="padding:12px 16px;border-bottom:1px solid #e3eaf4;font:600 14px Arial,sans-serif;color:#1b3255">${e(pupil)}</td><td style="padding:12px 16px;border-bottom:1px solid #e3eaf4;font:13px Arial,sans-serif;color:#48627f;text-align:right;white-space:nowrap">${e(child.student_no)}</td></tr>`;
 }).join('');
 const email=e(schoolEmail);
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to the new Madrasah At-Towfiq portal</title>
<style>@media(max-width:620px){.wrap{width:100%!important}.pad{padding:25px 21px!important}.btn{display:block!important;text-align:center!important}.foot{padding:20px!important}}</style>
</head><body style="margin:0;padding:0;background:#edf2f8;color:#233853;font-family:Arial,Helvetica,sans-serif">
<span style="display:none!important;max-height:0;overflow:hidden;opacity:0">An update about your child’s madrasah records and the next steps for families.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf2f8"><tr><td align="center" style="padding:36px 14px">
<table role="presentation" class="wrap" width="590" cellpadding="0" cellspacing="0" style="width:590px;max-width:100%;border-radius:18px;overflow:hidden;background:#fff;border:1px solid #dde6f3">
<tr><td style="padding:31px 28px 27px;text-align:center;background:#112d58">
<img src="https://portal.attowfiqmasjid.org/assets/at-towfiq-madrasah-logo.png" width="176" alt="Madrasah At-Towfiq" style="display:block;width:176px;max-width:75%;height:auto;margin:0 auto 17px;padding:8px;background:#fff;border-radius:9px">
<p style="margin:0;color:#dbbd7e;font-size:11px;letter-spacing:2.5px;font-weight:bold">MADRASAH AT-TOWFIQ · BOLTON</p>
<p lang="ar" dir="rtl" style="margin:18px 0 0;color:#ffffff;font-size:24px;line-height:1.7">السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ</p>
</td></tr>
<tr><td class="pad" style="padding:35px 42px 30px">
<p style="margin:0 0 12px;color:#9b7a3e;font-size:11px;letter-spacing:2px;font-weight:bold">A NEW CHAPTER FOR OUR MADRASAH</p>
<h1 style="margin:0 0 18px;font:normal 30px/1.25 Georgia,'Times New Roman',serif;color:#15315a">Welcome to our new family portal</h1>
<p style="margin:0 0 17px;font-size:15px;line-height:1.8;color:#465d7a">Assalāmu ʿalaykum, <strong>${e(first)}</strong>,</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#465d7a">We are pleased to let you know that Madrasah At-Towfiq is moving its existing student records to a new, secure management system. Our aim is to make school communication, learning updates and administration easier for families.</p>
<p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#15315a">Student record${children.length===1?'':'s'} included in this update</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3eaf4;border-radius:8px;overflow:hidden;border-collapse:separate;border-spacing:0">
<thead><tr><th scope="col" style="padding:11px 16px;background:#f1f5fb;text-align:left;font:600 12px Arial,sans-serif;color:#536a87">Student</th><th scope="col" style="padding:11px 16px;background:#f1f5fb;text-align:right;font:600 12px Arial,sans-serif;color:#536a87">Registration no.</th></tr></thead><tbody>${rows}</tbody></table>
<div style="margin:24px 0;padding:18px 20px;border-left:4px solid #c6a25b;border-radius:5px;background:#f8f5ed">
<p style="margin:0 0 9px;font-weight:bold;font-size:14px;color:#2b415d">What happens next?</p>
<p style="margin:0;font-size:14px;line-height:1.75;color:#54667a">Our office will verify parent or guardian details before providing access. Once your account has been linked and activated, you can review your child’s records and complete information that is currently missing, such as contact, health and learning-support details.</p></div>
<p style="margin:0 0 23px;font-size:14px;line-height:1.75;color:#52677f">You do <strong>not</strong> need to submit a new admission application. Your child’s registration has been carried forward. No new password or login invitation is contained in this email.</p>
<p style="text-align:center;margin:0 0 23px"><a class="btn" href="https://portal.attowfiqmasjid.org/" style="display:inline-block;background:#24559a;color:#fff;text-decoration:none;border-radius:8px;padding:15px 25px;font-size:14px;font-weight:bold">Visit the Madrasah portal</a></p>
<p style="margin:0;font-size:14px;line-height:1.7;color:#52677f">If the details above are incorrect, or you have questions, please contact the madrasah office at <a href="mailto:${email}" style="color:#1c549f;text-decoration:underline">${email}</a>. Please do not send medical or safeguarding information by ordinary email.</p>
<p style="margin:22px 0 0;color:#26456f;font-size:14px;line-height:1.75">Jazākum Allāhu khayran,<br><strong>Madrasah At-Towfiq Administration</strong></p>
</td></tr>
<tr><td class="foot" style="padding:24px 34px;text-align:center;background:#f3f6fb;border-top:1px solid #e2e9f3">
<p style="margin:0 0 7px;font-size:12px;font-weight:bold;color:#233e62">Madrasah At-Towfiq</p>
<p style="margin:0;font-size:12px;line-height:1.8;color:#6b7c90">24 Punch Street, Bolton, BL3 5BJ, United Kingdom<br>
<a href="https://attowfiqmasjid.org" style="color:#365b8a">attowfiqmasjid.org</a></p>
<p style="margin:10px 0 0;font-size:11px;color:#8391a2">This is a service notification about an existing pupil’s record. Please contact us if it reached you in error.</p>
</td></tr></table></td></tr></table></body></html>`;
}
