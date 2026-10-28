const $ = s=>document.querySelector(s);
const h = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = p=>'£'+(Number(p||0)/100).toFixed(2);
const fmt = v=>v?new Date((/^\d{4}-\d{2}-\d{2}$/.test(v)?v+'T12:00:00':v)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const today =()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/London'});
const when = n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const initials = n=>String(n||'AT').trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase();
const cap = s=>String(s||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const userCan=(...roles)=>roles.includes(S.user?.role);
const icons={home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',students:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',clipboard:'<rect x="6" y="4" width="12" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M9 11h6M9 15h6"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',cash:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',graduation:'<path d="m2 10 10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5M22 10v7"/>',chart:'<path d="M3 3v18h18M7 16V9M12 16V5M17 16v-6"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2.8 2.8-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2h-4v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1-2.8-2.8.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3v-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1 2.8-2.8.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3h4v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1 2.8 2.8-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1h.2v4h-.2a1.6 1.6 0 0 0-1.5 1z"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',sparkle:'<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9zM19 18l.8 2.2L22 21l-2.2.8L19 24l-.8-2.2L16 21l2.2-.8z"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',logout:'<path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',chevron:'<path d="m9 18 6-6-6-6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',star:'<path d="m12 2 3 7 7 .7-5.3 4.7 1.6 7L12 18l-6.3 3.4 1.6-7L2 9.7 9 9z"/>',filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 8 10-8"/>',folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16h16V8zM14 2v6h6M8 13h8M8 17h6"/>',award:'<circle cx="12" cy="8" r="5"/><path d="m8 12-1 10 5-3 5 3-1-10"/>',repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',trash:'<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',edit:'<path d="M12 20H4v-8L16 0l8 8-12 12z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',upload:'<path d="M12 17V3m-5 5 5-5 5 5M4 17v4h16v-4"/>',refresh:'<path d="M20 11a8 8 0 0 0-14-5l-3 3M3 3v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6"/>'};
const ico=(name,size=18)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.star}</svg>`;
const S={user:null,staffRole:null,familyMode:false,csrf:'',page:'dashboard',data:{},studentId:null,studentTab:'overview',filter:'',modal:null,pending:false,attendanceDate:schoolToday(),attendanceClass:'',classroomClass:'',authMode:'login',search:'',navOpen:{}};
// Keep daily work one click away. Everything else is grouped by task.
const PRIMARY_NAV=[
 ['dashboard','Dashboard','home'],
 ['classroom','My classroom','graduation'],
 ['students','Students','students'],
 ['progress','Progress reports','chart'],
 ['homework','Homework','book'],
 ['attendance','Attendance','clipboard']
];
const NAV_GROUPS=[
 {id:'learning',title:'Learning & character',icon:'award',items:[['behaviour','Behaviour & rewards','award'],['games','Quiz & leaderboard','sparkle']]},
 {id:'school',title:'School management',icon:'graduation',items:[['classes','Classes & enrolment','graduation'],['admissions','Admissions','folder'],['guardians','Parents & guardians','users'],['fees','Fees & payments','cash']]},
 {id:'community',title:'Community',icon:'message',items:[['communications','Communications','message'],['events','Events & announcements','calendar']]},
 {id:'tools',title:'Reports & administration',icon:'chart',items:[['reports','Reports & analytics','chart'],['automation','Automation centre','clock'],['staff','Staff & administration','users'],['settings','Settings & access','settings']]}
];
const allowedPage=p=>{
  if(userCan('admin'))return true;
  if(userCan('staff'))return !['staff','automation','settings'].includes(p);
  if(userCan('teacher'))return !['admissions','guardians','fees','automation','staff','settings'].includes(p);
  return ['dashboard','students','progress','homework','behaviour','attendance','fees','communications','events','games'].includes(p);
};
const titles={classroom:'My classroom',progress:'Progress reports',dashboard:'Dashboard',students:'Students',homework:'Homework & progress',behaviour:'Behaviour & rewards',attendance:'Attendance register',classes:'Classes & enrolment',admissions:'Admissions',fees:'Fees & payments',communications:'Communications',events:'Events & announcements',reports:'Reports & insights',games:'Daily ilm & quiz studio',automation:'Automation centre',staff:'Staff & administration',guardians:'Parents & guardians',settings:'School settings'};
const subtitles={classroom:'A focused workspace for your class.',progress:'Monthly learning assessments and family progress.',dashboard:'A beautiful view of your madrasah, all in one place.',students:'Student profiles, families and learning journeys.',homework:'Assign, monitor and celebrate every step of learning.',behaviour:'A balanced, private record of positive character and concerns.',attendance:'Monitor today’s registers and maintain reliable records.',classes:'Organise pupils, stages and teaching teams.',admissions:'From first enquiry to a warm welcome.',fees:'Transparent accounts and payment records.',communications:'Keep families connected to madrasah life.',events:'Keep your community informed and engaged.',reports:'Explore attendance, homework and learner progress.',games:'Grow knowledge through joyful daily challenges.',automation:'Configure school broadcasts and operational reminders.',staff:'Manage teacher and office accounts securely.',guardians:'View family contacts, invitation delivery and linked pupils.',settings:'Configure policies, contact details and account security.'};
function toast(msg,bad=false){let el=document.createElement('div');el.className=bad?'error':'';el.textContent=msg;$('#toast').append(el);setTimeout(()=>el.remove(),4500);}
async function api(path,opts={}){const config={credentials:'same-origin',headers:{...(opts.body?{'Content-Type':'application/json','x-csrf-token':S.csrf}:{}),...(S.familyMode?{'x-portal-view':'family'}:{}),...(opts.headers||{})},...opts};const res=await fetch('/api'+path,config);let payload={};try{payload=await res.json();}catch{}if(!res.ok){if(res.status===401&&S.user){S.user=null;S.authMode='login';renderAuth();}throw new Error(payload.error||'Request failed');}return payload;}
const post=(path,body,method='POST')=>api(path,{method,body:JSON.stringify(body)});
async function load(keys){await Promise.all(keys.map(async k=>{try{S.data[k]=(await api('/'+k)).items||[];}catch(e){console.warn(k,e);S.data[k]=[];}}));}
function get(k){return S.data[k]||[];}
const sidName=s=>s?`${s.first_name} ${s.last_name}`:'Unknown pupil';
const student=id=>get('students').find(x=>x.id===id);
const learnerOptions=(value='',empty='Choose a student')=>`<option value="">${empty}</option>`+get('students').map(s=>`<option value="${h(s.id)}" ${s.id===value?'selected':''}>${h(sidName(s))} · ${h(s.class_name||'Unassigned')}</option>`).join('');
const classOptions=(value='',empty='Select class')=>`<option value="">${empty}</option>`+get('classes').map(c=>`<option value="${h(c.id)}" ${c.id===value?'selected':''}>${h(c.name)}</option>`).join('');
const userOptions=(value='',roles=[])=>`<option value="">Not linked</option>`+(get('users').length?get('users'):get('contacts')).filter(u=>!roles.length||roles.includes(u.role)).map(u=>`<option value="${h(u.id)}" ${u.id===value?'selected':''}>${h(u.name)} (${h(u.role)})</option>`).join('');
const htmlOptions=(arr,v)=>arr.map(([key,label])=>`<option value="${h(key)}" ${String(key)===String(v)?'selected':''}>${h(label)}</option>`).join('');
const field=(label,name,value='',type='text',extra='',cls='')=>`<div class="field ${cls}"><label for="f-${h(name)}">${h(label)}</label>${type==='textarea'?`<textarea id="f-${h(name)}" name="${h(name)}" ${extra}>${h(value)}</textarea>`:`<input id="f-${h(name)}" name="${h(name)}" type="${h(type)}" value="${h(value)}" ${extra}>`}</div>`;
const select=(label,name,options,extra='',cls='')=>`<div class="field ${cls}"><label for="f-${h(name)}">${h(label)}</label><select id="f-${h(name)}" name="${h(name)}" ${extra}>${options}</select></div>`;
const tag=(text,color='gray')=>`<span class="tag ${color}">${h(text)}</span>`;
const statusTag=(status)=>tag(cap(status),status==='complete'||status==='present'||status==='accepted'||status==='paid'||status==='active'?'green':status==='incomplete'||status==='absent'||status==='declined'?'red':'amber');
const blank=(message='No records to display',subtitle='New entries will appear here.')=>`<div class="empty">${ico('folder',32)}<strong>${h(message)}</strong><span class="small">${h(subtitle)}</span></div>`;
const pagehead=(title,sub,actions='')=>`<div class="page-head"><div><h1>${h(title)}</h1><p>${h(sub)}</p></div><div class="page-actions">${actions}</div></div>`;
function renderAuth(){const mode=S.authMode;const details={setup:['Welcome to your new portal','Create the first administrator to securely activate Madrasah At-Towfiq.'],login:['Welcome back','Sign in to continue your teaching, learning and community journey.'],forgot:['Recover your account','Enter your account email. If an active account exists, we will send a secure password reset link.'], 'forgot-sent':['Check your email','If there is an active account for that address, your password recovery link will arrive shortly. Please also check Spam or Junk.'],reset:['Choose a new password','Set a new password of at least 12 characters. This will sign out other sessions.'], 'reset-success':['Password updated','Your password has been changed successfully. You can now sign in to your madrasah account.'],invite:['Your invitation awaits','Choose your secure password to activate your school account.']}[mode];
 $('#app').innerHTML=`<div class="auth-wrap"><section class="auth-side"><div class="side-identity"><div class="side-monogram">✦</div><div><strong>AT-TOWFIQ</strong><small>MADRASAH MANAGEMENT SYSTEM</small></div></div><div class="auth-showcase"><div class="auth-eyebrow">Rooted in faith. Guided by knowledge.</div><div class="auth-calligraphy" lang="ar">رَبِّ زِدْنِي عِلْمًا</div><h1>Every learner.<br><em>Every step.</em><br>Every possibility.</h1><p>A calm, connected home for our students, teachers and families — nurturing Qur’anic learning, excellent character and meaningful progress.</p></div><div class="auth-foot"><span>✧ Faith · Knowledge · Character</span><span>Crafted for At-Towfiq</span></div></section><section class="auth-right"><div class="auth-card"><img class="auth-logo" src="/assets/at-towfiq-madrasah-logo.png" alt="Madrasah At-Towfiq logo"><span class="welcome">${ico('shield',13)} Secure learning portal</span><h2>${details[0]}</h2><p class="description">${details[1]}</p>${mode==='forgot-sent'||mode==='reset-success'?`<div class="auth-reset-feedback"><span class="auth-reset-icon">${ico('shield',27)}</span><h3>${mode==='forgot-sent'?'A private reset link is on its way':'Your account is ready'}</h3><p>${mode==='forgot-sent'?'For security, we do not confirm whether an email address is registered. The link expires in 30 minutes and works once.':'All previous sessions have been signed out. Use your new password to sign in.'}</p><button type="button" class="btn primary block" data-action="authmode" data-value="login">Return to sign in ${ico('arrow',16)}</button></div>`:`<form class="form-stack" id="auth-form">`}${mode==='forgot-sent'||mode==='reset-success'?'':`${mode==='setup'?`${field('Full name','name','','text','required autocomplete="name"')}${field('Email address','email','','email','required autocomplete="email"')}${field('Administrator password','password','','password','required minlength="12" autocomplete="new-password"')}${field('One-time setup key','setup_key','','password','required autocomplete="off"')}`:mode==='login'?`${field('Email address','email','','email','required autocomplete="username"')}${field('Password','password','','password','required autocomplete="current-password"')}`:mode==='forgot'?field('Email address','email','','email','required autocomplete="email"'):mode==='reset'?`${field('New password','password','','password','required minlength="12" autocomplete="new-password"')}${field('Confirm new password','confirm_password','','password','required minlength="12" autocomplete="new-password"')}`:`${field('New password','password','','password','required minlength="12" autocomplete="new-password"')}`}
 <button class="btn primary block" type="submit" style="min-height:48px;margin-top:5px">${mode==='login'?'Sign in':mode==='setup'?'Create administrator':mode==='forgot'?'Send reset link':mode==='reset'?'Reset password':'Activate my account'} ${ico('arrow',17)}</button></form>`}${mode!=='setup'?`<div class="auth-links"><button type="button" data-action="authmode" data-value="${mode==='login'?'forgot':'login'}">${mode==='login'?'Forgot password?':'Back to sign in'}</button><span>At-Towfiq · Bolton</span></div>`:''}<div class="auth-secure">${ico('shield',15)} Protected accounts · Private student records · Role-based access</div></div></section></div>`;
}
async function boot(){try{const t=new URLSearchParams(location.search);if(t.get('invite')){S.authMode='invite';renderAuth();return;}if(t.get('reset')){S.authMode='reset';renderAuth();return;}const me=await api('/auth/me');S.user=me.user;S.staffRole=S.user?.role;S.familyMode=false;S.csrf=me.csrf;await navigate('dashboard');}catch(err){try{const r=await api('/auth/setup-status');S.authMode=r.needs_setup?'setup':'login';}catch{S.authMode='login';toast('Server not available. Start Wrangler with the D1 database configured.',true);}renderAuth();}}
const navItem=([key,title,icon],sub=false)=>`<button class="nav-link ${sub?'nav-sublink':''} ${S.page===key?'active':''}" data-action="nav" data-value="${key}" ${S.page===key?'aria-current="page"':''}>${ico(icon,17)}<span>${title}</span></button>`;
const navLinks=()=>`<div class="nav-section-title">WORKSPACE</div>`+PRIMARY_NAV.filter(([key])=>allowedPage(key)).map(item=>navItem(item)).join('')+
 `<div class="nav-divider"></div><div class="nav-section-title">EXPLORE</div>`+
 NAV_GROUPS.map(g=>{
  const items=g.items.filter(([key])=>allowedPage(key));
  if(!items.length)return '';
  const expanded=S.navOpen[g.id]??items.some(([key])=>key===S.page);
  return `<div class="nav-group"><button class="nav-group-btn ${expanded?'expanded':''} ${items.some(([key])=>key===S.page)?'has-active':''}" data-action="nav-group" data-group="${g.id}" aria-expanded="${expanded}" aria-controls="nav-items-${g.id}">${ico(g.icon,17)}<span>${g.title}</span><svg class="nav-caret" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button><div id="nav-items-${g.id}" class="nav-submenu" ${expanded?'':'hidden'}>${items.map(item=>navItem(item,true)).join('')}</div></div>`;
 }).join('');
function shell(content){$('#app').innerHTML=`<div class="shell" id="shell"><aside class="sidebar"><div class="side-head"><div class="logo-panel"><img alt="Madrasah At-Towfiq" src="/assets/at-towfiq-madrasah-logo.png"></div><p>Learning & character portal</p></div><nav class="nav-scroll">${navLinks()}</nav><div class="side-foot"><div><div class="avatar">${h(initials(S.user.name))}</div><div><strong>${h(S.user.name)}</strong><p>${cap(S.user.role)} account</p></div></div></div></aside><div class="overlay" data-action="menu"></div><div class="workspace"><header class="topbar"><div class="top-left"><button class="iconbtn mobilemenu" aria-label="Open navigation" data-action="menu">${ico('menu',19)}</button><div><div class="top-title">${h(titles[S.page]||'Madrasah At-Towfiq')}</div><div class="top-caption">Assalamu alaikum, ${h(S.user.name.split(' ')[0])}!</div></div></div><div class="top-right"><button class="iconbtn" aria-label="Global search" title="Search across the madrasah" data-action="global-search">${ico('search',18)}</button><span class="top-pill">${ico('shield',12)} &nbsp; ${S.familyMode?'Family':cap(S.user.role)} portal</span>${S.user.has_family && S.staffRole!=='parent'?`<button class="btn smol family-switch" data-action="family-switch" type="button">${ico('users',15)} ${S.familyMode?'Staff view':'Family view'}</button>`:''}<button class="iconbtn" title="Go to announcements" data-action="nav" data-value="events">${ico('bell',18)}</button><button class="iconbtn" title="Sign out" data-action="logout">${ico('logout',17)}</button><div class="top-user"><div class="avatar">${h(initials(S.user.name))}</div><div><strong>${h(S.user.name)}</strong><span>${cap(S.user.role)}</span></div></div></div></header><main class="main" id="content">${content}<div class="footer-note">© ${new Date().getFullYear()} Madrasah At-Towfiq · Rooted in faith, guided by knowledge · Student information is private.</div></main></div></div>`;}
const pageKeys={dashboard:['students','classes','homework','attendance','behaviour','events','announcements','fees','progress-reports'],classroom:['students','classes','homework','attendance','progress-reports'],progress:['progress-reports','students'],students:['students','classes','users','contacts','homework','behaviour','behaviour-catalog','attendance','fees','progress-reports'],homework:['students','classes','homework'],behaviour:['students','classes','behaviour','behaviour-catalog'],attendance:['students','classes','attendance'],classes:['classes','students','users','contacts'],admissions:['admissions','classes'],fees:['students','fees','payments'],communications:['messages','contacts','students','announcements'],events:['events','announcements'],reports:['reports','students','classes'],games:['quizzes','leaderboard'],automation:['email-log'],staff:['users'],guardians:['guardians'],settings:['settings','email-log','audit']};
async function navigate(page,options={}){if(!allowedPage(page))page='dashboard';S.page=page;S.filter='';S.search='';if(!options.keepStudent)S.studentId=null;$('#shell')?.classList.remove('menu-open');shell(`<div class="surface" style="min-height:230px">${blank('Loading your workspace','Connecting securely to the madrasah database…')}</div>`);try{await load(pageKeys[page]||[]);renderPage();}catch(err){toast(err.message,true);}}
function renderPage(){let content;switch(S.page){case'dashboard':content=dashboard();break;case'classroom':content=classroomPage();break;case'progress':content=progressPage();break;case'students':content=studentsPage();break;case'homework':content=homeworkPage();break;case'behaviour':content=behaviourPage();break;case'attendance':content=attendancePage();break;case'classes':content=classesPage();break;case'admissions':content=admissionsPage();break;case'fees':content=feesPage();break;case'communications':content=communicationPage();break;case'events':content=eventsPage();break;case'reports':content=reportsPage();break;case'games':content=gamesPage();break;case'automation':content=automationPage();break;case'staff':content=staffPage();break;case'guardians':content=guardiansPage();break;case'settings':content=settingsPage();break;default:content=dashboard();}shell(content);}
function metrics(){let students=get('students'),hs=get('homework'),att=get('attendance'),todayAtt=att.filter(x=>x.date===today()),points=get('behaviour').reduce((a,b)=>a+b.points,0),feeBalance=get('fees').reduce((a,f)=>a+f.amount_pence-f.paid_pence,0);return [{label:'Active students',value:students.filter(x=>x.status==='active').length,icon:'students',color:''},{label:'Present today',value:todayAtt.filter(x=>x.status==='present').length,icon:'check',color:'green'},{label:'Pending homework',value:hs.filter(x=>x.status==='incomplete').length,icon:'book',color:'amber'},{label:userCan('parent')?'Outstanding fees':'Net behaviour points',value:userCan('parent')?money(feeBalance):points,icon:userCan('parent')?'cash':'award',color:'rose'}];}
function metricCards(items){return `<div class="cards four">${items.map(m=>`<div class="metric"><div class="metric-top"><span class="metric-label">${h(m.label)}</span><span class="metric-icon ${m.color}">${ico(m.icon,21)}</span></div><div class="metric-value">${h(m.value)}</div><div class="trend">${m.label==='Active students'?'Enrolled learning community':'Up-to-date school records'}</div></div>`).join('')}</div>`;}

const learningLevels={developing:'Developing',progressing:'Progressing',secure:'Secure',excellent:'Excellent'};
const learningAreas={hifdh:'Qur’an memorisation',murajaa:'Qur’an revision',qaaidah:'Qaaidah',islamic_studies:'Islamic Studies'};
const progressPeriodLabel=period=>fmt(period+'-01').replace(/^1 /,'');
function progressReportCards(reports){
 if(!reports.length)return blank('No progress reports yet','Teachers can save monthly drafts and publish a summary for parents when ready.');
 return `<div class="learning-report-grid">${reports.map(r=>{
  const pupil=student(r.student_id);
  const grades=Object.entries(learningAreas).filter(([key])=>r[key]);
  return `<article class="learning-report-card">
   <div class="learning-report-head"><div><span class="caps blue">${h(progressPeriodLabel(r.period))}</span><h3>${h(pupil?sidName(pupil):r.first_name+' '+r.last_name)}</h3><p>${h(r.class_name||pupil?.class_name||'Class not assigned')} · ${h(r.author_name||'Madrasah team')}</p></div>${tag(r.status==='published'?'Published':'Draft',r.status==='published'?'green':'amber')}</div>
   <div class="learning-report-grades">${grades.length?grades.map(([key,label])=>`<div><span>${h(label)}</span><strong>${h(learningLevels[r[key]]||'—')}</strong></div>`).join(''):'<p class="muted small">Subject levels not yet assessed</p>'}</div>
   ${r.summary?`<div class="learning-report-copy"><span class="caps">Teacher's overview</span><p>${h(r.summary)}</p></div>`:''}
   ${r.next_steps?`<div class="learning-report-copy"><span class="caps">Next steps at home</span><p>${h(r.next_steps)}</p></div>`:''}
   ${userCan('admin','staff','teacher')?`<button class="btn smol outline" data-action="modal" data-value="progress-report" data-id="${h(r.id)}">${ico('edit',14)} Edit report</button>`:''}
  </article>`;
 }).join('')}</div>`;
}
function progressPage(){
 const reports=get('progress-reports');
 const published=reports.filter(x=>x.status==='published');
 const drafts=reports.filter(x=>x.status==='draft');
 const children=get('students').filter(x=>x.status==='active');
 return `${pagehead(userCan('parent')?'Your children’s progress':'Learner progress reports',
  userCan('parent')?'Published teacher assessments and suggested next steps for learning at home.':'Write a monthly assessment, save a private draft, then publish to the linked family when ready.',
  userCan('admin','staff','teacher')?`<button class="btn primary" data-action="modal" data-value="progress-report">${ico('plus',16)} New progress report</button>`:'')}
 <div class="cards three learning-report-metrics">
  <div class="metric"><span class="metric-label">Published reports</span><strong class="metric-value">${published.length}</strong><span class="trend">Visible to linked guardians</span></div>
  <div class="metric"><span class="metric-label">${userCan('parent')?'Children with reports':'Draft reports'}</span><strong class="metric-value">${userCan('parent')?new Set(published.map(r=>r.student_id)).size:drafts.length}</strong><span class="trend">${userCan('parent')?'Across your family':'Visible only to authorised staff'}</span></div>
  <div class="metric"><span class="metric-label">Pupils in scope</span><strong class="metric-value">${children.length}</strong><span class="trend">Your authorised learners</span></div>
 </div>
 <div class="notice" style="margin:16px 0">${ico('shield',16)} ${userCan('parent')?'Only published reports for your linked children appear here.':'Draft reports remain private. Publishing makes the report immediately visible to the pupil’s currently linked guardian. Never enter sensitive medical or safeguarding notes in a family report.'}</div>
 ${progressReportCards(reports)}`;
}
function classroomPage(){
 const classes=get('classes');
 const selected=S.classroomClass;
 const students=get('students').filter(s=>s.status==='active'&&(!selected||s.class_id===selected));
 const ids=new Set(students.map(s=>s.id));
 const homework=get('homework').filter(x=>ids.has(x.student_id));
 const attendance=get('attendance').filter(x=>ids.has(x.student_id)&&x.date===schoolToday());
 const reports=get('progress-reports').filter(x=>ids.has(x.student_id));
 const pending=homework.filter(x=>x.status==='incomplete');
 const overdue=pending.filter(x=>x.due_date<schoolToday());
 const absent=attendance.filter(x=>x.status==='absent');
 const now=schoolToday();
 return `${pagehead(userCan('teacher')?'My classroom':'Classroom hub','Daily teaching priorities, homework follow-up and parent-ready progress reports.',
  `<button class="btn primary" data-action="modal" data-value="progress-report">${ico('plus',16)} Write report</button><button class="btn white" data-action="nav" data-value="attendance">${ico('clipboard',16)} Take register</button>`)}
 <section class="classroom-hero"><div><span class="caps">TEACHER WORKSPACE</span><h2>Every pupil. A clearer learning journey.</h2><p>Follow class attendance, homework and Qur’anic learning while keeping family reports separate from private notes.</p></div><span class="classroom-hero-mark" aria-hidden="true">رَبِّ زِدْنِي عِلْمًا</span></section>
 <div class="toolbar classroom-toolbar"><label class="row small strong">Learning class <select class="select-small" data-classroom-class="1"><option value="">All assigned classes</option>${classes.map(c=>`<option value="${h(c.id)}" ${selected===c.id?'selected':''}>${h(c.name)}</option>`).join('')}</select></label><span class="muted small">Showing ${students.length} active pupils</span></div>
 ${metricCards([{label:'Learners',value:students.length,icon:'students'},{label:'Register marked today',value:attendance.length+'/'+students.length,icon:'clipboard',color:'green'},{label:'Overdue homework',value:overdue.length,icon:'clock',color:overdue.length?'rose':'green'},{label:'Draft reports',value:reports.filter(r=>r.status==='draft').length,icon:'file'}])}
 <div class="cards two" style="margin-top:18px">
  <section class="surface"><div class="surface-head"><h3>Follow up learning</h3><button class="btn smol white" data-action="nav" data-value="homework">Homework tracker</button></div>
   ${overdue.length?overdue.slice(0,10).map(x=>`<div class="list-row"><span class="metric-icon rose">${ico('clock',17)}</span><div class="grow"><strong>${h(sidName(student(x.student_id)))}</strong><div class="sub">${h(homeworkTypeLabel[x.type]||cap(x.type))} · Due ${fmt(x.due_date)}</div></div><button class="btn smol outline" data-action="modal" data-value="grade-homework" data-id="${h(x.id)}">Review</button></div>`).join(''):blank('No overdue homework','Outstanding tasks will appear here after their due date.')}</section>
  <section class="surface"><div class="surface-head"><h3>Attendance attention</h3><button class="btn smol white" data-action="nav" data-value="attendance">Open register</button></div>
   ${absent.length?absent.map(a=>`<div class="list-row">${ico('calendar',17)}<div class="grow"><strong>${h(sidName(student(a.student_id)))}</strong><div class="sub">Marked absent today</div></div>${tag('Absent','red')}</div>`).join(''):blank('No recorded absences today','Unmarked pupils are not automatically considered present.')}</section>
 </div>
 <section class="surface" style="margin-top:18px"><div class="surface-head"><h3>Class roster & learning priorities</h3><button class="btn smol white" data-action="nav" data-value="progress">All reports</button></div>
  ${students.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Today</th><th>Homework</th><th>Report</th><th>Actions</th></tr></thead><tbody>${students.map(s=>{
   const todayEntry=attendance.find(a=>a.student_id===s.id);
   const tasks=pending.filter(x=>x.student_id===s.id);
   const latest=reports.filter(r=>r.student_id===s.id).sort((a,b)=>b.period.localeCompare(a.period))[0];
   return `<tr><td class="cell-name">${h(sidName(s))}<div class="cell-sub">${h(s.student_no)}</div></td><td>${h(s.class_name||'—')}</td><td>${todayEntry?statusTag(todayEntry.status):tag('Not marked','amber')}</td><td>${tasks.length} incomplete</td><td>${latest?tag(progressPeriodLabel(latest.period)+' · '+cap(latest.status),latest.status==='published'?'green':'amber'):tag('Not started','gray')}</td><td><div class="row" style="gap:7px"><button class="btn smol white" data-action="classroom-profile" data-id="${h(s.id)}">Profile</button><button class="btn smol outline" data-action="modal" data-value="progress-report" data-id="${h(latest?.id||s.id)}">Report</button></div></td></tr>`;
  }).join('')}</tbody></table></div>`:blank('No pupils in these classes','Assign a pupil to a teaching class first.')}</section>`;
}

function familyDashboard(){
 const children=get('students').filter(s=>s.status==='active');
 const allHomework=get('homework'),attendance=get('attendance'),behaviours=get('behaviour'),fees=get('fees'),reports=get('progress-reports');
 const announcements=get('announcements').slice(0,3);
 const firstName=(S.user.name||'Parent').split(/\s+/)[0];
 const now=today();
 const pending=allHomework.filter(x=>x.status==='incomplete');
 const balance=fees.reduce((sum,x)=>sum+Math.max(0,Number(x.amount_pence||0)-Number(x.paid_pence||0)),0);
 const totalPoints=behaviours.reduce((sum,x)=>sum+Number(x.points||0),0);
 const childCards=children.map(child=>{
  const fullName=sidName(child);
  const hw=allHomework.filter(x=>x.student_id===child.id);
  const remaining=hw.filter(x=>x.status==='incomplete');
  const attended=attendance.filter(x=>x.student_id===child.id);
  const present=attended.filter(x=>x.status==='present').length;
  const points=behaviours.filter(x=>x.student_id===child.id).reduce((sum,x)=>sum+Number(x.points||0),0);
  const latestReport=reports.filter(r=>r.student_id===child.id).sort((a,b)=>b.period.localeCompare(a.period))[0];
  const due=remaining.slice().sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0];
  const dueText=due?'Next due: '+fmt(due.due_date)+' · '+(homeworkTypeLabel[due.type]||cap(due.type)):'No outstanding assignments';
  return `<article class="family-child-card">
    <div class="family-child-top"><div class="family-child-avatar">${h(initials(fullName))}</div><div class="family-child-title"><h3>${h(fullName)}</h3><p>${h(child.student_no||'')} · ${h(child.class_name||'Class not assigned')}</p></div><span class="tag green">Enrolled</span></div>
    <div class="family-child-stats"><div><strong>${remaining.length}</strong><span>Homework pending</span></div><div><strong>${attended.length?Math.round(present/attended.length*100)+'%':'—'}</strong><span>Attendance</span></div><div><strong>${points>0?'+':''}${points}</strong><span>Character points</span></div></div>
    <div class="family-child-next">${ico('book',17)}<span>${h(dueText)}</span></div>
    <div class="family-child-next">${ico('chart',17)}<span>${latestReport?'Latest teacher report: '+h(progressPeriodLabel(latestReport.period)):'No published learning report yet'}</span></div>
    <button type="button" class="btn white" data-action="nav" data-value="progress">Family progress reports ${ico('arrow',15)}</button>
    <button type="button" class="btn outline family-open-profile" data-action="family-student" data-id="${h(child.id)}">View learning profile ${ico('arrow',15)}</button>
   </article>`;
 }).join('');
 const timeline=[
  ...allHomework.map(x=>({id:x.id,studentId:x.student_id,date:x.created_at||x.due_date,kind:'homework',title:(homeworkTypeLabel[x.type]||cap(x.type))+' assigned',subtitle:'Due '+fmt(x.due_date),icon:'book',tone:'blue'})),
  ...behaviours.map(x=>({id:x.id,studentId:x.student_id,date:x.created_at,kind:'behaviour',title:Number(x.points)>0?'+'+x.points+' character points':x.points+' character points',subtitle:x.description||'Behaviour update',icon:'award',tone:Number(x.points)>0?'green':'amber'})),
  ...attendance.map(x=>({id:x.id,studentId:x.student_id,date:x.date,kind:'attendance',title:cap(x.status||'Attendance')+' attendance',subtitle:'Recorded '+fmt(x.date),icon:'check',tone:'blue'}))
 ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
 return `${pagehead('Assalamu alaikum, '+firstName+' ✨','Your family’s learning, attendance and character — together in one secure place.')}
 <div class="family-hero"><div><span class="family-hero-kicker">MADRASAH AT-TOWFIQ · FAMILY PORTAL</span><h2>Every child. Every lesson.<br>One learning journey.</h2><p>Stay informed, celebrate progress and support your children’s Islamic education at home.</p><button class="btn white" data-action="nav" data-value="homework">${ico('book',16)} View homework</button></div><div class="family-hero-art" lang="ar" aria-hidden="true">بِسْمِ اللَّهِ</div></div>
 <div class="family-metrics">${[
  ['Children enrolled',children.length,'students'],
  ['Homework pending',pending.length,'book'],
  ['Character points',(totalPoints>0?'+':'')+totalPoints,'award'],
  ['Outstanding fees',money(balance),'cash']
 ].map(([label,value,icon])=>`<div class="family-stat"><span>${h(label)}</span><div class="family-stat-bottom"><strong>${h(value)}</strong><span class="family-stat-icon">${ico(icon,19)}</span></div></div>`).join('')}</div>
 <section class="family-section"><div class="family-section-head"><div><span class="caps blue">YOUR FAMILY</span><h2>Your children's profiles</h2></div><button class="btn white smol" data-action="nav" data-value="students">Student directory ${ico('arrow',14)}</button></div>
 ${children.length?`<div class="family-child-grid">${childCards}</div>`:`<div class="surface family-empty">${blank('No linked children yet','Please contact the madrasah admissions team if a child is missing from your account.')}</div>`}</section>
 <div class="family-columns">
  <section class="surface family-panel"><div class="surface-head"><h3>Recent learning & character</h3><button class="btn white smol" data-action="nav" data-value="behaviour">View all</button></div>
   ${timeline.length?timeline.map(item=>{
    const child=children.find(s=>s.id===item.studentId);
    return `<div class="family-activity"><span class="family-activity-icon ${item.tone}">${ico(item.icon,17)}</span><div><strong>${h(item.title)}</strong><span>${h(child?sidName(child):'Student')} · ${h(item.subtitle)}</span></div></div>`;
   }).join(''):blank('No learning updates yet','Homework and attendance updates for your family will appear here.')}</section>
  <section class="surface family-panel"><div class="surface-head"><h3>Notices for families</h3><button class="btn white smol" data-action="nav" data-value="events">View notices</button></div>
   ${announcements.length?announcements.map(x=>`<div class="family-activity"><span class="family-activity-icon blue">${ico('bell',17)}</span><div><strong>${h(x.title)}</strong><span>${h(String(x.body||'').slice(0,135))}</span></div></div>`).join(''):blank('No notices currently','Madrasah announcements will be shown here.')}
   <div class="family-contact-note">${ico('shield',16)} Your family’s data is private. Contact the madrasah if an account or pupil association needs correcting.</div>
  </section></div>`;
}
function dashboard(){if(userCan('parent'))return familyDashboard();if(userCan('teacher'))return classroomPage();let s=get('students'),hws=get('homework'),anns=get('announcements').slice(0,4),ev=get('events').filter(e=>e.event_date>=today()).slice(0,3),isAdmin=userCan('admin','staff');return `${pagehead('Assalamu alaikum, '+S.user.name.split(' ')[0]+' ✨','Here is what is happening across your Madrasah today.',isAdmin?`<button class="btn primary" data-action="nav" data-value="admissions">${ico('plus')} New admission</button>`:'')}<div class="welcome-banner"><div><div class="intro">MADRASAH AT-TOWFIQ · BOLTON</div><h2>A brighter future begins <br>with every lesson.</h2><p>Manage learning, inspire good character and strengthen the connection between our dedicated teachers and families.</p><button class="btn white" style="margin-top:20px" data-action="nav" data-value="homework">${ico('book',16)} View homework</button></div><div class="welcome-symbol" lang="ar">﷽</div></div>${metricCards(metrics())}<div class="grid-main"><div class="cards"><section class="surface"><div class="surface-head"><h3>Quick actions</h3><span class="muted tiny">Popular tasks</span></div><div class="quick-grid">${[['students','Student profiles','students'],['homework','Assign homework','book'],['attendance','Mark attendance','clipboard'],['behaviour','Behaviour points','award']].map(([key,t,i])=>`<button data-action="nav" data-value="${key}" class="quick-action"><span class="metric-icon">${ico(i,18)}</span>${t} ${ico('chevron',14)}</button>`).join('')}</div></section><section class="surface"><div class="surface-head"><h3>Homework snapshot</h3><a class="link" data-action="nav" data-value="homework">Open tracker ${ico('arrow',14)}</a></div>${hws.length?`<div class="list-rows">${hws.slice(0,5).map(x=>`<div class="list-row"><span class="metric-icon">${ico(x.type==='murajaa'?'repeat':'book',18)}</span><div class="grow"><strong>${h(cap(x.type))} · ${h(sidName(student(x.student_id)))}</strong><div class="sub">Due ${fmt(x.due_date)}</div></div>${statusTag(x.status)}</div>`).join('')}</div>`:blank('No homework yet','Assignments you create will appear here.')}</section></div><div class="cards"><section class="surface"><div class="surface-head"><h3>Notices & announcements</h3><a class="link" data-action="nav" data-value="events">View all</a></div>${anns.length?anns.map(a=>`<div class="list-row"><span class="metric-icon">${ico('bell',17)}</span><div class="grow"><strong>${h(a.title)}</strong><div class="sub">${h(a.body.slice(0,105))}${a.body.length>105?'…':''}</div></div></div>`).join(''):blank('No announcements','School notices will show here.')}</section><section class="surface"><div class="surface-head"><h3>Upcoming moments</h3><a class="link" data-action="nav" data-value="events">Calendar</a></div>${ev.length?ev.map(e=>`<div class="list-row"><div class="event-cal"><small>${fmt(e.event_date).split(' ')[1]||''}</small><strong>${String(e.event_date).slice(8,10)}</strong></div><div class="grow"><strong>${h(e.title)}</strong><div class="sub">${fmt(e.event_date)} · ${cap(e.category)}</div></div></div>`).join(''):blank('Nothing on the calendar','Add school events to keep families informed.')}</section></div></div>`;}
function studentHeader(s){return `<div class="profile-head"><button class="btn white smol" data-action="student-back">${ico('chevron',13)} Back</button><div class="avatar">${h(initials(sidName(s)))}</div><div class="grow"><h2>${h(sidName(s))}</h2><p>${h(s.student_no)} · ${h(s.class_name||'Unassigned class')} · ${h(s.gender||'Student')}</p></div><span>${statusTag(s.status)}</span>${userCan('admin','staff')?`<button class="btn white smol" data-action="modal" data-value="assign-class" data-id="${h(s.id)}">${ico('graduation',14)} ${s.class_id?'Change class':'Assign class'}</button><button class="btn white smol" data-action="modal" data-value="edit-student" data-id="${h(s.id)}">${ico('edit',14)} Edit profile</button>`:''}</div>`;}
function studentDetail(s){let tab=S.studentTab,hws=get('homework').filter(x=>x.student_id===s.id),bs=get('behaviour').filter(x=>x.student_id===s.id),ats=get('attendance').filter(x=>x.student_id===s.id),fees=get('fees').filter(x=>x.student_id===s.id);const points=bs.reduce((a,b)=>a+b.points,0);let tabs=[['overview','Overview'],['homework','Homework'],['progress','Progress'],['behaviour','Behaviour'],['attendance','Attendance'],['fees','Fees & payments']];return `${studentHeader(s)}<div class="tabs">${tabs.map(([key,label])=>`<button class="tab ${tab===key?'active':''}" data-action="student-tab" data-value="${key}">${label}</button>`).join('')}</div>${tab==='overview'?`<div class="cards two"><section class="surface"><div class="surface-head"><h3>Student information</h3>${userCan('admin','staff')?`<a class="link" data-action="modal" data-value="edit-student" data-id="${h(s.id)}">Edit details</a>`:''}</div><div class="student-info">${[['Student number',s.student_no],['Class',s.class_name||'Not assigned'],['Date of birth',s.dob?fmt(s.dob):'Not provided'],['Gender',s.gender||'Not provided'],['Parent / guardian',s.parent_name||'Not linked'],['Phone',s.phone||'Not provided'],['Home address',s.address||'Not provided'],['Medical / support notes',userCan('admin','staff','teacher')?(s.medical_notes||'None recorded'):'Contact the office for details']].map(([l,v])=>`<div class="info-item"><small>${h(l)}</small><strong>${h(v)}</strong></div>`).join('')}</div></section><div class="cards"><div class="surface"><div class="surface-head"><h3>Learning journey</h3><span class="tag blue">Personal overview</span></div><div class="stat-list"><div class="row"><span>Homework completed</span><strong>${hws.filter(x=>x.status==='complete').length} / ${hws.length}</strong></div><div class="progress"><span style="width:${hws.length?100*hws.filter(x=>x.status==='complete').length/hws.length:0}%"></span></div><div class="row"><span>Attendance present</span><strong>${ats.filter(x=>x.status==='present').length} / ${ats.length}</strong></div><div class="row"><span>Behaviour point balance</span><strong class="${points>=0?'green':'red'}">${points>0?'+':''}${points}</strong></div><div class="row"><span>Unpaid invoices</span><strong>${money(fees.reduce((a,b)=>a+b.amount_pence-b.paid_pence,0))}</strong></div></div></div><div class="callout">${ico('sparkle',30)}<div><h3>Faith · Knowledge · Character</h3><p>Progress is more than marks. Celebrate consistency, excellent manners and growth in Qur’anic learning.</p></div></div></div></div>`:tab==='homework'?`<section class="surface"><div class="surface-head"><h3>Homework and Qur’an progress</h3>${userCan('admin','staff','teacher')?`<button class="btn primary smol" data-action="modal" data-value="add-homework" data-id="${h(s.id)}">${ico('plus',15)} Assign homework</button>`:''}</div>${hws.length?homeworkTable(hws,true):blank('No assignments','Teachers can create Hifdh, Muraja’a, Qaaidah or Islamic Studies homework.')}</section>`:tab==='behaviour'?`<div class="cards two"><section class="surface"><div class="surface-head"><h3>Character & behaviour log</h3>${userCan('admin','staff','teacher')?`<button class="btn primary smol" data-action="modal" data-value="add-behaviour" data-id="${h(s.id)}">${ico('plus',14)} Record</button>`:''}</div>${bs.length?behaviourRows(bs):blank('No behaviour records','Praise and concerns will appear here.')}</section><section class="surface"><h3 style="margin-bottom:18px">Personal points summary</h3><div class="score-banner"><div><div class="caps muted">Current balance</div><p class="small muted" style="margin-top:6px">Private to authorised adults</p></div><strong>${points>0?'+':''}${points}</strong></div><p class="small muted" style="margin-top:19px;line-height:1.8">Individual records include dates, reason, points and teacher comments. Serious safeguarding concerns should also follow the madrasah safeguarding procedure; points alone are not a safeguarding workflow.</p></section></div>`:tab==='progress'?`<section class="surface"><div class="surface-head"><h3>Monthly learning reports</h3>${userCan('admin','staff','teacher')?`<button class="btn primary smol" data-action="modal" data-value="progress-report" data-id="${h(s.id)}">${ico('plus',15)} Write report</button>`:''}</div>${progressReportCards(get('progress-reports').filter(r=>r.student_id===s.id))}</section>`:tab==='attendance'?`<section class="surface"><div class="surface-head"><h3>Attendance history</h3><span class="tag blue">${ats.length} register entries</span></div>${ats.length?`<div class="list-rows">${ats.map(a=>`<div class="list-row">${ico('calendar',17)}<div class="grow"><strong>${fmt(a.date)}</strong><div class="sub">${h(a.note||'Attendance register')}</div></div>${statusTag(a.status)}</div>`).join('')}</div>`:blank('No attendance recorded')}</section>`:`<section class="surface"><div class="surface-head"><h3>Student fee history</h3>${userCan('admin','staff')?`<button class="btn primary smol" data-action="modal" data-value="invoice" data-id="${h(s.id)}">${ico('plus',14)} New invoice</button>`:''}</div>${fees.length?feeTable(fees):blank('No invoices','A fee statement will appear when invoices are issued.')}</section>`}`;}
function studentsPage(){if(S.studentId){const s=student(S.studentId);if(s)return studentDetail(s);S.studentId=null;}let arr=get('students').filter(s=>`${s.first_name} ${s.last_name} ${s.student_no} ${s.class_name}`.toLowerCase().includes(S.search.toLowerCase())).filter(s=>!S.filter||s.class_id===S.filter);return `${pagehead('Student directory','A secure, complete record of every student’s learning journey.',userCan('admin','staff')?`<button class="btn white" data-action="nav" data-value="guardians">${ico('users',16)} Parents & guardians</button><button class="btn primary" data-action="nav" data-value="admissions">${ico('plus',16)} New admission</button>`:'')}<div class="surface"><div class="toolbar"><div class="searchbox">${ico('search',17)}<input placeholder="Search by pupil, ID or class..." data-search="students" value="${h(S.search)}"></div><select class="select-small" data-filter="classes">${classOptions(S.filter,'All classes')}</select><span class="tag blue">${arr.length} pupils</span></div>${arr.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Behaviour</th><th>Status</th><th>Action</th></tr></thead><tbody>${arr.map(s=>{const acts=get('attendance').filter(a=>a.student_id===s.id),rate=acts.length?Math.round(100*acts.filter(x=>x.status==='present').length/acts.length):0;return `<tr><td><div class="row"><div class="avatar">${h(initials(sidName(s)))}</div><div><div class="cell-name">${h(sidName(s))}</div><div class="cell-sub">${h(s.student_no)}</div></div></div></td><td>${s.class_name?h(s.class_name):'<span class="tag amber">Unassigned</span>'}</td><td><span class="tag blue">${acts.length?`${rate}%`:'—'}</span></td><td><strong class="${s.behaviour_score<0?'red':'green'}">${s.behaviour_score>0?'+':''}${s.behaviour_score}</strong></td><td>${statusTag(s.status)}</td><td><div class="class-row-actions"><button class="btn smol outline" data-action="student-profile" data-id="${h(s.id)}">View profile ${ico('chevron',13)}</button>${userCan('admin','staff')?`<button class="btn smol ${s.class_id?'white':'primary'}" data-action="modal" data-value="assign-class" data-id="${h(s.id)}">${ico('graduation',14)} ${s.class_id?'Change class':'Assign class'}</button>`:''}</div></td></tr>`;}).join('')}</tbody></table></div>`:blank('No students found','Only accepted applications appear here. Start with Admissions → New application.')}</div>`;}
const homeworkTypeLabel={hifdh:'Qur’an · Hifdh',murajaa:'Qur’an · Muraja’a',qaaidah:'Qaaidah',islamic_studies:'Islamic Studies'};
function homeworkDetail(x){if(['hifdh','murajaa'].includes(x.type))return `${x.surah_from||'Surah'} ${x.verse_from||''} → ${x.surah_to||'Surah'} ${x.verse_to||''}`;return 'Page '+(x.page_number||'—');}
function homeworkTable(items,inProfile=false){return `<div class="table-scroll"><table class="table"><thead><tr>${inProfile?'':'<th>Student</th>'}<th>Subject & assignment</th><th>Due date</th><th>Status</th><th>Feedback</th><th></th></tr></thead><tbody>${items.map(x=>`<tr>${inProfile?'':`<td><span class="cell-name">${h(x.first_name||student(x.student_id)?.first_name||'')} ${h(x.last_name||student(x.student_id)?.last_name||'')}</span></td>`}<td><div class="cell-name">${h(homeworkTypeLabel[x.type]||x.type)}</div><div class="cell-sub">${h(homeworkDetail(x))}${x.comments?' · '+h(x.comments.slice(0,60)):''}</div></td><td><span class="${x.status==='incomplete'&&x.due_date<today()?'red':''}">${fmt(x.due_date)}</span></td><td>${statusTag(x.status)}</td><td><span class="small muted">${h((x.teacher_feedback||'').slice(0,80)||'—')}</span></td><td>${userCan('admin','staff','teacher')?`<button class="btn smol outline" data-action="modal" data-value="grade-homework" data-id="${h(x.id)}">Update</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;}
function homeworkPage(){let arr=get('homework').filter(x=>!S.filter||x.type===S.filter).filter(x=>`${x.first_name} ${x.last_name} ${x.type}`.toLowerCase().includes(S.search.toLowerCase()));return `${pagehead('Homework & progress','Every lesson, clearly assigned. An authorised teacher or administrator marks homework Complete using Update after reviewing it.',userCan('admin','staff','teacher')?`<button class="btn primary" data-action="modal" data-value="add-homework">${ico('plus',16)} Assign homework</button>`:'')}
<div class="cards four" style="margin-bottom:19px">${[['Hifdh',get('homework').filter(x=>x.type==='hifdh').length,'book'],['Muraja’a',get('homework').filter(x=>x.type==='murajaa').length,'repeat'],['Qaaidah',get('homework').filter(x=>x.type==='qaaidah').length,'file'],['Islamic Studies',get('homework').filter(x=>x.type==='islamic_studies').length,'graduation']].map(([label,n,icon])=>`<div class="metric"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${ico(icon,20)}</span></div><div class="metric-value">${n}</div><span class="trend">Assignments created</span></div>`).join('')}</div><section class="surface"><div class="surface-head"><h3>Assignments tracker</h3><span class="tag blue">${arr.length} records</span></div><div class="toolbar"><div class="searchbox">${ico('search',16)}<input placeholder="Find a student or subject..." data-search="homework" value="${h(S.search)}"></div><select class="select-small" data-filter="subjects"><option value="">All subjects</option>${htmlOptions(Object.entries(homeworkTypeLabel),S.filter)}</select></div>${arr.length?homeworkTable(arr):blank('No assignments yet','Use “Assign homework” to create your first learning task.')}</section>`;}
function behaviourRows(arr){return `<div class="list-rows">${arr.slice(0,70).map(x=>`<div class="list-row"><span class="metric-icon ${x.points>0?'green':'rose'}">${ico(x.points>0?'star':'info',18)}</span><div class="grow"><strong>${h(x.description)}</strong><div class="sub">${fmt(x.created_at)} · ${h(x.recorded_by_name||'Teacher')}${x.notes?' · '+h(x.notes):''}</div></div><strong class="points ${x.points>0?'pos':'neg'}">${x.points>0?'+':''}${x.points}</strong></div>`).join('')}</div>`;}
function behaviourPage(){let arr=get('behaviour'),students=get('students'),positive=arr.filter(x=>x.points>0),negative=arr.filter(x=>x.points<0);return `${pagehead('Behaviour & rewards','Celebrate beautiful manners; document concerns fairly and privately.',userCan('admin','staff','teacher')?`<button class="btn primary" data-action="modal" data-value="add-behaviour">${ico('plus',16)} Add behaviour record</button>`:'')}
<div class="cards three" style="margin-bottom:18px">${[['Positive recognition',positive.length,'star','green'],['Behaviour concerns',negative.length,'shield','rose'],['Net points',arr.reduce((a,b)=>a+b.points,0),'award','']].map(([l,n,i,c])=>`<div class="metric"><div class="metric-top"><span class="metric-label">${l}</span><span class="metric-icon ${c}">${ico(i)}</span></div><strong class="metric-value">${n>0&&l==='Net points'?'+':''}${n}</strong><span class="trend">Visible only to authorised adults</span></div>`).join('')}</div><div class="grid-main"><section class="surface"><div class="surface-head"><h3>Recent behaviour records</h3><span class="tag blue">${arr.length} entries</span></div>${arr.length?behaviourRows(arr):blank('No records','Choose a behaviour from the school catalogue.')}</section><section class="cards"><div class="surface"><h3>Our character framework</h3><p class="muted small" style="margin-top:12px;line-height:1.8">Respect, preparation, kindness, punctuality and accountability. Positive behaviour is recognised with up to +3 points; concerning conduct is recorded from −1 to −5.</p><div class="score-banner" style="margin-top:18px"><span class="caps">Positive actions</span>${tag('+'+positive.reduce((a,b)=>a+b.points,0),'green')}</div><div class="score-banner" style="margin-top:10px;background:#fff0f3"><span class="caps">Points deducted</span>${tag(String(negative.reduce((a,b)=>a+b.points,0)),'red')}</div></div><div class="surface"><h3>Safeguarding note</h3><p class="small muted" style="line-height:1.8;margin-top:14px">Points are a supportive classroom record—not a public ranking or an automatic disciplinary system. Bullying, harassment, threats or harm must also follow the designated safeguarding lead’s procedures.</p></div></section></div>`;}
function schoolToday(){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const value=type=>parts.find(part=>part.type===type)?.value||'';
 return [value('year'),value('month'),value('day')].join('-');
}
function attendancePage(){const date=S.attendanceDate;const students=get('students').filter(s=>s.status==='active'&&(!S.attendanceClass||s.class_id===S.attendanceClass)),a=get('attendance').filter(r=>r.date===date&&students.some(s=>s.id===r.student_id));
 const classChoice=userCan('parent')?'':`<label class="row small strong">Class <select class="select-small" data-attendance-class="1"><option value="">All classes</option>${get('classes').map(cl=>`<option value="${h(cl.id)}" ${S.attendanceClass===cl.id?'selected':''}>${h(cl.name)}</option>`).join('')}</select></label>`;
 return `${pagehead('Attendance register','Select the class and date, then mark only pupils actually checked. Unmarked pupils are not assumed present.',userCan('admin','staff','teacher')?`<button class="btn primary" type="submit" form="attendance-form">${ico('check',16)} Save register</button><button class="btn white" type="button" data-action="attendance-mark-present">${ico('check',16)} Mark unmarked present</button>`:'')}<section class="surface"><div class="surface-head"><h3>Daily register</h3><span class="tag blue">${students.length} students</span></div><div class="toolbar">${classChoice}<label class="row small strong">${ico('calendar',17)} Date <input type="date" class="select-small" id="attendance-date" value="${h(date)}" data-date="attendance"></label><div class="row"><span class="tag blue">${a.filter(x=>students.some(s=>s.id===x.student_id)).length} / ${students.length} marked</span><span class="tag green">${a.filter(x=>x.status==='present').length} present</span><span class="tag amber">${a.filter(x=>x.status==='late').length} late</span><span class="tag red">${a.filter(x=>x.status==='absent').length} absent</span></div></div>${students.length?`<form id="attendance-form"><div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Status</th><th>Notes</th></tr></thead><tbody>${students.map(s=>{const rec=a.find(x=>x.student_id===s.id);return `<tr><td><div class="cell-name">${h(sidName(s))}</div><div class="cell-sub">${h(s.student_no)}</div></td><td>${h(s.class_name||'—')}</td><td><select class="select-small" name="a-${h(s.id)}" ${userCan('parent')?'disabled':''}>${htmlOptions([['','— Not marked —'],['present','✓ Present'],['absent','✕ Absent'],['late','◷ Late'],['excused','Excused']],rec?.status||'')}</select></td><td><input type="text" class="select-small" style="width:100%;max-width:220px" name="n-${h(s.id)}" value="${h(rec?.note||'')}" placeholder="Optional note" ${userCan('parent')?'disabled':''}></td></tr>`;}).join('')}</tbody></table></div>${userCan('admin','staff','teacher')?`<div class="attendance-alert-option"><label><input type="checkbox" name="notify_guardians" value="yes" ${date===schoolToday()?'':'disabled'}> <strong>Email guardians about newly marked absences</strong></label><p>Optional and off by default. Applies only to today's new Absent entries, not late/excused pupils. Only one notice per pupil per day; private attendance notes are never emailed. ${date===schoolToday()?'':'Select today to enable notices.'}</p></div>`:''}</form>`:blank('No students enrolled','Add and assign students before taking attendance.')}</section>`;}
function classesPage(){
 const arr=get('classes'),unassigned=get('students').filter(x=>x.status==='active'&&!x.class_id);
 const action=userCan('admin','staff')?`<button class="btn primary" data-action="modal" data-value="add-class">${ico('plus',16)} Create class</button>`:'';
 return `${pagehead('Classes & enrolment','Create learning groups, assign teachers and allocate pupils to the right class.',action)}
 ${userCan('admin','staff')&&unassigned.length?`<div class="class-allocation-hint">${ico('info',19)} <div><strong>${unassigned.length} pupil${unassigned.length===1?'':'s'} awaiting class assignment</strong><p>Choose <b>Manage pupils</b> on a class card, or <b>Assign class</b> in the student directory.</p></div></div>`:''}
 <div class="cards three">${arr.length?arr.map(c=>`<div class="surface"><div class="row" style="justify-content:space-between"><span class="metric-icon">${ico('graduation',22)}</span>${tag(cap(c.stage),'blue')}</div><h3 style="margin-top:19px">${h(c.name)}</h3><p class="small muted" style="margin-top:8px">${h(c.schedule||'Schedule not assigned')}</p><div class="divider"></div><div class="stat-list"><div class="row"><span class="muted small">Teacher</span><strong class="small">${h(c.teacher_name||'Not assigned')}</strong></div><div class="row"><span class="muted small">Enrolled</span><strong class="small">${c.enrolled} / ${c.capacity}</strong></div></div>
 ${userCan('admin','staff')?`<div class="class-manage-actions"><button class="btn primary block" data-action="modal" data-value="class-roster" data-id="${h(c.id)}">${ico('users',15)} Manage pupils</button><button class="btn outline block" data-action="modal" data-value="edit-class" data-id="${h(c.id)}">${ico('edit',14)} Edit class</button></div>`:''}
 </div>`).join(''):blank('No classes created','Create a learning group such as Foundation or Hifdh before accepting new admissions.')}</div>`;
}
const admissionReference=a=>'MAT-'+String(a.created_at||'').slice(0,4)+'-'+String(a.id||'').replace(/[^a-zA-Z0-9]/g,'').slice(0,10).toUpperCase();
function admissionsPage(){let arr=get('admissions');let reviewing=arr.filter(a=>a.status==='reviewing').length;return `${pagehead('Admissions','A complete application and assessment record for every learner.',`<button class="btn primary" data-action="modal" data-value="admission">${ico('plus',16)} New application</button>`)}
<div class="admissions-intro"><span class="metric-icon">${ico('graduation',22)}</span><div><strong>Family-centred admissions</strong><p>Record the student, parent/guardian and emergency contact, then document previous madrasah experience, current Qur’an or Qaaidah level, and important support or consent information.</p></div><span class="tag blue">${arr.length} applications · ${reviewing} under review</span></div>
<section class="surface"><div class="surface-head"><h3>Applications register</h3>${tag(`${arr.length} records`,'blue')}</div>${arr.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Applicant</th><th>Parent / guardian</th><th>Current level</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead><tbody>${arr.map(a=>`<tr><td class="cell-name">${h(a.child_name)}<div class="cell-sub">${h(admissionReference(a))}</div></td><td>${h(a.guardian_name)}<div class="cell-sub">${h(a.guardian_email)}</div></td><td>${h(admissionLevel(a))}</td><td>${fmt(a.created_at)}</td><td>${statusTag(a.status)}</td><td><div class="admission-actions"><button class="btn tiny outline" data-action="admission-view" data-id="${h(a.id)}">${ico('eye',14)} View</button><button class="btn tiny white" data-action="modal" data-value="edit-admission" data-id="${h(a.id)}">${ico('edit',14)} Edit</button>${a.student_id?`<button class="btn tiny outline" data-action="search-open" data-page="students" data-id="${h(a.student_id)}">${ico('students',14)} View pupil</button>`:''}<select class="select-small" aria-label="Application status for ${h(a.child_name)}" data-admission="${h(a.id)}" ${a.student_id?'disabled title="Enrolled: use student profile to manage pupil"':''}>${htmlOptions([['new','New'],['reviewing','Reviewing'],['accepted','Accepted'],['declined','Declined']],a.status)}</select></div></td></tr>`).join('')}</tbody></table></div>`:blank('No applications yet','Select “New application” to complete the full admission form.')}</section>`;}
function admissionLevel(a){let parts=[];if(a.level_starting)parts.push('Starting now');if(a.level_qaaidah)parts.push('Qaaidah'+(a.qaaidah_page?' · p. '+a.qaaidah_page:''));if(a.level_quran)parts.push('Qur’an'+(a.quran_surah?' · '+a.quran_surah:''));if(a.arabic_read_write)parts.push('Reads / writes Arabic');return parts.join(' · ')||'Not assessed';}
const admissionCheck=(label,name,checked=false)=>`<label class="admission-check"><input type="checkbox" name="${h(name)}" ${checked?'checked':''}><span>${h(label)}</span></label>`;
const admissionSection=(no,label,subtitle,fields)=>`<div class="admission-form-section"><div class="admission-section-head"><span>${no}</span><div><h3>${label}</h3><p>${subtitle}</p></div></div><div class="form-grid">${fields}</div></div>`;
function admissionForm(a={}){
 const v=(k,f='')=>a[k]??f;
 const bool=k=>Number(a[k])===1;
 const previous=htmlOptions([['','Choose'],['no','No'],['yes','Yes'],['unknown','Not known']],v('previous_attended'));
 return `<div class="notice admission-privacy">${ico('shield',18)} Only authorised office staff can access applications. Use this form to transcribe a parent’s application. Do not paste applicants’ details into demo databases or screenshots.</div><input type="hidden" name="id" value="${h(v('id'))}">
 ${admissionSection('01','Student’s details','The child’s identity and home contact information.',
 `${field('Student surname','last_name',v('last_name'),'text','required maxlength="80" autocomplete="off"')}${field('Student forename','first_name',v('first_name'),'text','required maxlength="80" autocomplete="off"')}${field('Date of birth','dob',v('dob'),'date','required')}${select('Gender','gender',htmlOptions([['','Select'],['Male','Male'],['Female','Female'],['Prefer not to say','Prefer not to say']],v('gender')),'required')}${field('Home address','home_address',v('home_address'),'textarea','required maxlength="260"','wide')}${field('Postcode','postcode',v('postcode'),'text','required maxlength="16"')}${field('Home telephone number','home_telephone',v('home_telephone'),'tel')}`)}
 ${admissionSection('02','Parent / guardian details','Primary contact and who to call in an emergency.',
 `${field('Parent / guardian full name','guardian_name',v('guardian_name'),'text','required maxlength="120"')}${select('Relationship to student','guardian_relationship',htmlOptions([['','Select'],['Mother','Mother'],['Father','Father'],['Grandparent','Grandparent'],['Legal guardian','Legal guardian'],['Other','Other']],v('guardian_relationship')),'required')}${field('Parent / guardian mobile','guardian_phone',v('guardian_phone',v('phone')),'tel','required')}${field('Emergency telephone','emergency_phone',v('emergency_phone'),'tel')}${field('Parent / guardian email address','guardian_email',v('guardian_email'),'email','required','wide')}`)}
 ${admissionSection('03','Previous education','Tell us whether the pupil has previously attended another institute or madrasah.',
 `${select('Has the student attended another madrasah before?','previous_attended',previous,'','wide')}${field('Name of previous institute / madrasah','previous_institute',v('previous_institute'),'text','placeholder="Complete when previous attendance is Yes"','wide')}`)}
 ${admissionSection('04','Current Arabic and Qur’an level','Select all that apply. The teacher can confirm the level during assessment.',
 `<div class="admission-levels wide">${admissionCheck('Starting now / beginner','level_starting',bool('level_starting'))}${admissionCheck('Currently studying Qaaidah','level_qaaidah',bool('level_qaaidah'))}${admissionCheck('Currently reading Qur’an','level_quran',bool('level_quran'))}${admissionCheck('Can read and write Arabic','arabic_read_write',bool('arabic_read_write'))}</div>${field('Qaaidah current page number','qaaidah_page',v('qaaidah_page'),'text','placeholder="e.g. page 15"')}${field('Qur’an current surah / passage','quran_surah',v('quran_surah'),'text','placeholder="e.g. Surah Al-Nas"')}`)}
 ${admissionSection('05','Health, learning support & parent/guardian declarations','Record only information necessary for safe participation and appropriate support.',
 `${field('Medical information','medical_information',v('medical_information'),'textarea','placeholder="Relevant medical information, if provided by the parent / guardian"','wide')}${field('Allergies','allergies',v('allergies'),'textarea','placeholder="List known allergies or leave blank if none reported"','wide')}${field('Additional learning needs','additional_learning_needs',v('additional_learning_needs'),'textarea','placeholder="Any support needs the madrasah should know about"','wide')}<div class="wide admission-check-note"><strong>Parent / guardian declaration</strong>${admissionCheck('I consent to emergency first aid where necessary.','consent_first_aid',bool('consent_first_aid'))}${admissionCheck('I consent to appropriate photographs for internal learning records.','consent_photos',bool('consent_photos'))}<p>Record each choice only where the parent or guardian has expressly agreed. Unticked means consent has not been recorded. Photo consent is optional and separate from first-aid consent. The madrasah must provide its privacy notice and safeguarding arrangements.</p></div>${field('Additional notes from parent / office','message',v('message'),'textarea','placeholder="Other details relevant to the application"','wide')}`)}
 `;
}
function admissionDetails(a){if(!a)return;const line=(label,value)=>`<div class="admission-summary-item"><small>${h(label)}</small><strong>${h(value||'—')}</strong></div>`;
 const block=(heading,entries)=>`<section class="admission-summary-section"><h3>${heading}</h3><div class="admission-summary-grid">${entries.map(([k,v])=>line(k,v)).join('')}</div></section>`;
 const yesNo=x=>x?'Yes':'No';
 modal('Application · '+a.child_name,`<div class="admission-detail-lead"><div><span class="caps blue">PUPIL APPLICATION</span><h3>${h(a.child_name)}</h3><p>${h(admissionReference(a))} · Submitted ${fmt(a.created_at)} · ${h(a.status)}</p></div>${statusTag(a.status)}</div>
 ${block('Student', [['Forename',a.first_name],['Surname',a.last_name],['Date of birth',fmt(a.dob)],['Gender',a.gender],['Home address',a.home_address],['Postcode',a.postcode],['Home telephone',a.home_telephone]])}
 ${block('Parent / guardian', [['Name',a.guardian_name],['Relationship',a.guardian_relationship],['Contact mobile',a.guardian_phone],['Emergency telephone',a.emergency_phone],['Email',a.guardian_email]])}
 ${block('Previous madrasah education', [['Attended before?',cap(a.previous_attended)||'—'],['Institute',a.previous_institute]])}
 ${block('Current learning level', [['Learning level',admissionLevel(a)],['Qaaidah page',a.qaaidah_page],['Qur’an surah / passage',a.quran_surah],['Reads and writes Arabic',yesNo(a.arabic_read_write)]])}
 ${block('Health & learning support', [['Medical information',a.medical_information],['Allergies',a.allergies],['Additional learning needs',a.additional_learning_needs]])}
 ${block('Parent / guardian declarations', [['Emergency first aid consent',a.consent_first_aid?'Agreed':'Not recorded'],['Internal learning photographs consent',a.consent_photos?'Agreed':'Not recorded'],['Additional notes',a.message]])}
 <div class="admission-end-actions"><button class="btn primary" data-action="modal" data-value="edit-admission" data-id="${h(a.id)}">${ico('edit',16)} Edit application</button></div>`,false,true);
}

function updateInvoiceTargets(){
 const form=document.getElementById('invoice-form');if(!form)return;
 const mode=form.elements.invoice_mode?.value||'one';
 for(const item of form.querySelectorAll('[data-invoice-mode]'))item.classList.toggle('hide',item.dataset.invoiceMode!==mode);
 const active=get('students').filter(s=>s.status==='active');
 const selected=[...form.querySelectorAll('input[name="invoice_student_ids"]:checked')].length;
 const count=mode==='all'?active.length:mode==='selected'?selected:(form.elements.student_id?.value?1:0);
 const box=form.querySelector('#invoice-target-summary');if(box)box.textContent=`${count} active student${count===1?'':'s'} selected · ${money(Math.round(Number(form.elements.amount?.value||0)*100)*count)} total`;
}
function feeTable(arr){
 const canManage=userCan('admin','staff');
 return `<div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Period</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due</th><th>Actions</th></tr></thead><tbody>${arr.map(f=>{
  const left=Math.max(0,Number(f.amount_pence)-Number(f.paid_pence));
  const overdue=Boolean(left>0&&f.due_date&&f.due_date<today());
  const status=left===0?'Paid':overdue?'Overdue':f.paid_pence>0?'Part paid':'Outstanding';
  const color=left===0?'green':overdue?'red':'amber';
  return `<tr><td><span class="cell-name">${h(f.first_name||student(f.student_id)?.first_name||'')} ${h(f.last_name||student(f.student_id)?.last_name||'')}</span></td>
  <td>${h(f.period)}</td><td>${money(f.amount_pence)}</td><td>${money(f.paid_pence)}</td><td><strong class="${left?'red':'green'}">${money(left)}</strong></td>
  <td>${f.due_date?h(fmt(f.due_date)):'—'}<div class="fee-status-line">${tag(status,color)}</div></td>
  <td>${canManage?`<div class="fee-actions">${left>0?`<button class="btn smol outline" data-action="modal" data-value="payment" data-id="${h(f.id)}">${ico('cash',14)} Record payment</button><button class="btn smol white" data-action="finance-notify" data-id="${h(f.id)}">${ico('mail',14)} Send statement</button>`:`<span class="tiny muted">${ico('check',14)} Settled</span>`}</div>`:left===0?tag('Settled','green'):`<span class="tiny muted">View in portal</span>`}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function feesPage(){
 const f=get('fees'),p=get('payments');
 const charged=f.reduce((a,x)=>a+Number(x.amount_pence||0),0);
 const paid=p.reduce((a,x)=>a+Number(x.amount_pence||0),0);
 const outstanding=Math.max(0,charged-paid);
 const overdue=f.filter(x=>x.due_date&&x.due_date<today()&&Number(x.amount_pence)>Number(x.paid_pence));
 const order=[...f].sort((a,b)=>{
  const isOverdue=x=>x.due_date&&x.due_date<today()&&Number(x.amount_pence)>Number(x.paid_pence);
  if(Boolean(isOverdue(a))!==Boolean(isOverdue(b)))return isOverdue(a)?-1:1;
  return String(b.period).localeCompare(String(a.period));
 });
 const isParent=userCan('parent');
 return `${pagehead(isParent?'My family fee account':'Fees & payments',isParent?'Your family’s invoices, recorded payments and outstanding balances.':'Clear financial records, parent statements and payment acknowledgements.',userCan('admin','staff')?`<button class="btn primary" data-action="modal" data-value="invoice">${ico('plus',16)} Create invoice</button>`:'')}
 ${metricCards([{label:'Total invoiced',value:money(charged),icon:'cash'},{label:'Payments recorded',value:money(paid),icon:'check',color:'green'},{label:'Outstanding balance',value:money(outstanding),icon:'clock',color:'amber'},{label:'Overdue invoices',value:overdue.length,icon:'file',color:overdue.length?'amber':'green'}])}
 ${overdue.length&&userCan('admin','staff')?`<div class="finance-attention">${ico('info',19)} <div><strong>${overdue.length} overdue invoice${overdue.length===1?'':'s'} need attention</strong><p>Review balances below and use Send statement to contact the recorded guardian. This sends a private, non-payment-processing email.</p></div></div>`:''}
 <section class="surface" style="margin-top:19px"><div class="surface-head"><h3>${isParent?'Your fee statements':'Invoice statements'}</h3>${tag(`${f.length} invoices`,'blue')}</div>${f.length?feeTable(order):blank('No invoices issued','New fee statements will appear here.')}</section>
 <div class="notice" style="margin-top:15px">${ico('info',16)} ${isParent?'These are the madrasah’s recorded fee balances. If you have paid but a payment is missing, please contact admissions@attowfiqmasjid.org.':'Payments recorded here are manual ledger entries. Email notices do not collect funds. Stripe and GoCardless are not connected.'}</div>`;
}
function communicationPage(){const messages=get('messages'),contacts=get('contacts'),anns=get('announcements');return `${pagehead('Communications','Announcements, teacher notes and parent correspondence.',(userCan('admin','staff')?`<button class="btn white" data-action="modal" data-value="announcement">${ico('bell',16)} New announcement</button>`:'')+(userCan('admin','staff','teacher')?`<button class="btn primary" data-action="modal" data-value="message">${ico('plus',16)} New message</button>`:''))}<div class="grid-main"><section class="surface"><div class="surface-head"><h3>${userCan('parent')?'My messages':'Sent & received messages'}</h3>${tag(`${messages.length} messages`,'blue')}</div>${messages.length?messages.map(m=>`<div class="list-row"><span class="metric-icon">${ico('mail',18)}</span><div class="grow"><strong>${h(m.subject)}</strong><div class="sub">${h(m.body)} · ${fmt(m.created_at)} ${userCan('admin','staff')?'· To '+h(m.recipient_name||'Recipient'):''}</div></div></div>`).join(''):blank('No messages','Family correspondence will appear here.')}</section><section class="surface"><div class="surface-head"><h3>School noticeboard</h3><button class="btn smol outline" data-action="nav" data-value="events">See events</button></div>${anns.length?anns.slice(0,8).map(a=>`<div class="list-row"><span class="metric-icon">${ico('bell',17)}</span><div class="grow"><strong>${h(a.title)}</strong><div class="sub">${h(a.body.slice(0,160))} · ${fmt(a.created_at)}</div></div></div>`).join(''):blank('Noticeboard is clear')}${userCan('admin','staff','teacher')?`<div class="divider"></div><div class="small muted">Available contacts: ${contacts.length}</div>`:''}</section></div>`;}
function eventsPage(){const e=get('events'),a=get('announcements');return `${pagehead('Events & announcements','Important dates, school notices and celebrations.',userCan('admin','staff')?`<button class="btn white" data-action="modal" data-value="announcement">${ico('bell',16)} Post announcement</button><button class="btn primary" data-action="modal" data-value="event">${ico('plus',16)} Add event</button>`:'')}<div class="cards two"><section class="surface"><div class="surface-head"><h3>Community calendar</h3>${tag(`${e.length} events`,'blue')}</div>${e.length?e.map(x=>`<div class="list-row"><div class="event-cal"><small>${fmt(x.event_date).split(' ')[1]}</small><strong>${x.event_date.slice(-2)}</strong></div><div class="grow"><strong>${h(x.title)}</strong><div class="sub">${h(x.description||cap(x.category))} · ${fmt(x.event_date)}</div></div>${userCan('admin','staff')?`<button class="iconbtn" title="Delete event" data-action="delete-event" data-id="${h(x.id)}">${ico('trash',15)}</button>`:''}</div>`).join(''):blank('No events') }</section><section class="surface"><div class="surface-head"><h3>Announcements</h3>${tag(`${a.length} updates`,'blue')}</div>${a.length?a.map(x=>`<div class="list-row"><span class="metric-icon">${ico('bell',17)}</span><div class="grow"><strong>${h(x.title)}</strong><div class="sub">${h(x.body.slice(0,230))} · ${cap(x.audience)}</div></div>${userCan('admin','staff')?`<button class="iconbtn" title="Delete announcement" data-action="delete-announcement" data-id="${h(x.id)}">${ico('trash',15)}</button>`:''}</div>`).join(''):blank('No announcements')}</section></div>`;}
function reportsPage(){const arr=get('reports'),att=arr.reduce((s,x)=>s+x.attendance_total,0),present=arr.reduce((s,x)=>s+x.present,0),hw=arr.reduce((s,x)=>s+x.homework_total,0),complete=arr.reduce((s,x)=>s+x.homework_complete,0);return `${pagehead('Reports & insights','Actionable insights across learning and community engagement.',`<button class="btn primary" data-action="export-report">${ico('download',16)} Export CSV</button>`)}${metricCards([{label:'Students analysed',value:arr.length,icon:'students'},{label:'Attendance rate',value:att?Math.round(present/att*100)+'%':'—',icon:'chart',color:'green'},{label:'Homework completion',value:hw?Math.round(complete/hw*100)+'%':'—',icon:'book',color:'amber'},{label:'Behaviour score',value:arr.reduce((s,x)=>s+x.behaviour_points,0),icon:'award'}])}<div class="grid-main"><section class="surface"><div class="surface-head"><h3>Class & student performance</h3><span class="tiny muted">Past and present records</span></div>${arr.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Class</th><th>Attendance</th><th>Homework</th><th>Points</th></tr></thead><tbody>${arr.map(x=>`<tr><td class="cell-name">${h(x.first_name)} ${h(x.last_name)}</td><td>${h(x.class_name||'—')}</td><td>${x.attendance_total?Math.round(x.present/x.attendance_total*100)+'%':'—'}</td><td>${x.homework_complete}/${x.homework_total}</td><td><strong class="${x.behaviour_points<0?'red':'green'}">${x.behaviour_points>0?'+':''}${x.behaviour_points}</strong></td></tr>`).join('')}</tbody></table></div>`:blank('No report data')}</section><section class="surface"><div class="surface-head"><h3>Attendance at a glance</h3></div><div class="chartbars">${arr.slice(0,7).map(x=>{const p=x.attendance_total?Math.round(x.present/x.attendance_total*100):0;return `<div class="chart-column"><b>${p}%</b><div class="bar" style="height:${Math.max(p,6)}px"></div><small title="${h(x.first_name)}">${h(x.first_name.slice(0,5))}</small></div>`;}).join('')||'<p class="muted small">Awaiting register data</p>'}</div><div class="divider"></div><p class="muted small">Attendance percentages are calculated only from recorded sessions, not assumed school days. Exports contain personal student data—share securely.</p></section></div>`;}
function gamesPage(){let qs=get('quizzes'),attempts=S.data['quizzes_attempts']||[],board=get('leaderboard');return `${pagehead('Daily ilm & quiz studio','Make Islamic knowledge memorable with joyful questions.',userCan('admin','staff','teacher')?`<button class="btn primary" data-action="modal" data-value="quiz">${ico('plus',16)} Create question</button>`:'')}<div class="grid-main"><div class="cards"><div class="welcome-banner" style="min-height:150px;margin:0"><div><div class="intro">LEARN • REFLECT • GROW</div><h2>Knowledge is a beautiful journey.</h2><p>Choose the correct answer. Earn 10 points for each new successful question.</p></div><div class="welcome-symbol">✦</div></div><section class="surface"><div class="surface-head"><h3>Today’s learning challenges</h3>${tag(`${qs.length} questions`,'blue')}</div>${qs.length?qs.map((q,i)=>{const attempt=attempts.find(x=>x.quiz_id===q.id);return `<div class="list-row"><span class="metric-icon">${ico('sparkle',18)}</span><div class="grow"><strong>${h(q.question)}</strong><div class="sub">${h(q.category)} · Question ${i+1}</div></div>${attempt?tag(attempt.is_correct?'10 points':'Attempted',attempt.is_correct?'green':'amber'):`<button class="btn smol outline" data-action="play-quiz" data-id="${h(q.id)}">Play ${ico('arrow',14)}</button>`}</div>`;}).join(''):blank('No quizzes yet','Teachers can add an Islamic knowledge question.')}</section></div><div class="surface"><div class="surface-head"><h3>Knowledge leaderboard</h3>${ico('award',21)}</div>${board.length?board.map((p,i)=>`<div class="list-row"><span class="event-cal" style="width:35px;padding:8px">${i+1}</span><div class="grow"><strong>${h(p.name)}</strong><div class="sub">${p.played} challenges completed</div></div>${tag(p.points+' pts','blue')}</div>`).join(''):blank('Leaderboard awaits','Complete a quiz to appear here.')}<div class="notice" style="margin-top:15px">The quiz leaderboard is based on participating accounts, not behavioural or disciplinary scores.</div></div></div>`;}
function automationPage(){const emails=get('email-log'),sett=get('settings');return `${pagehead('Automation centre','Set up helpful, respectful messages for your community.',`<button class="btn white" data-action="automation-preview">${ico('eye',16)} Preview Jumu’ah</button>`)}<div class="cards two"><section class="surface"><div class="row"><span class="metric-icon">${ico('calendar',22)}</span><div><h3>Jumu’ah weekly reminder</h3><p class="muted small" style="margin-top:5px">Friday • 08:00 UTC (09:00 BST in summer)</p></div></div><p class="small muted" style="line-height:1.85;margin:17px 0">Send a short reminder to active parents, teachers and staff. Reminders are disabled until explicitly enabled and a verified email provider is configured.</p><button class="btn primary" data-action="automation-preview">Preview & settings ${ico('arrow',15)}</button></section><section class="surface"><div class="row"><span class="metric-icon green">${ico('mail',21)}</span><div><h3>Outgoing email log</h3><p class="small muted" style="margin-top:5px">Resend integration & delivery attempts</p></div></div><div class="divider"></div>${emails.length?emails.slice(0,5).map(x=>`<div class="list-row"><div class="grow"><strong>${h(x.recipient)}</strong><div class="sub">${h(x.subject)} · ${fmt(x.created_at)}</div></div>${statusTag(x.status)}</div>`).join(''):blank('No email attempts','Configure verified sender details to start notifications.')}</section><section class="surface"><h3>Communications roadmap</h3><div class="list-rows" style="margin-top:13px">${[['Parent announcements','Available inside the portal'],['Friday Jumu’ah automation','Scheduled when enabled'],['Failed email viewer','Included'],['WhatsApp-ready posters','Requires a separate publishing service'],['Automatic fee collection','Requires Stripe / GoCardless integration']].map(([n,v])=>`<div class="list-row">${ico('check',15)}<div class="grow"><strong>${n}</strong><div class="sub">${v}</div></div></div>`).join('')}</div></section></div>`;}

function staffPage(){
 const users=get('users').filter(u=>u.role!=='parent');
 return `${pagehead('Staff & administration','Manage administrator, teacher and office accounts.',`<button class="btn primary" data-action="modal" data-value="invite">${ico('plus',16)} Invite staff</button>`)}
 <div class="surface"><div class="surface-head"><h3>Staff directory</h3>${tag(`${users.length} people`,'blue')}</div>
 <div class="table-scroll"><table class="table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>State</th><th>Manage</th></tr></thead><tbody>
 ${users.map(u=>`<tr><td class="cell-name">${h(u.name)}</td><td>${tag(cap(u.role),'blue')}</td><td>${h(u.email)}</td><td>${statusTag(u.active?'active':'inactive')}</td><td><div class="row" style="gap:7px"><button class="btn smol outline" data-action="modal" data-value="edit-user" data-id="${h(u.id)}">${ico('edit',14)} Edit</button>${u.id!==S.user.id?`<button class="btn smol outline" data-action="toggle-user" data-id="${h(u.id)}" data-active="${u.active?0:1}">${u.active?'Deactivate':'Activate'}</button>`:tag('Your account','green')}</div></td></tr>`).join('')}
 </tbody></table></div></div><div class="notice" style="margin-top:15px">Parent and guardian accounts are managed from School management → Parents & guardians. Changing another staff member’s email revokes their old sessions and requires a new one-time activation.</div>`;
}
function guardiansPage(){
 const rows=get('guardians');
 const badge=(r)=>r.link_status==='linked'?'Linked':r.link_status==='pending_activation'?'Linked · activation pending':r.account_id?'Account pending':'Not linked';
 return `${pagehead('Parents & guardians','Family contacts are managed with their enrolled pupils.',`<button class="btn white" data-action="nav" data-value="students">${ico('students',16)} Student directory</button>`)}
 <div class="surface"><div class="surface-head"><h3>Guardian relationships</h3>${tag(`${rows.length} enrolled pupils`,'blue')}</div>
 <p class="small muted" style="margin:0 0 18px">When an application is accepted, its pupil is linked to the recorded guardian account and an email is automatically attempted. New accounts need email activation before sign-in. Staff members who are guardians can switch to Family view without losing their staff access.</p>
 ${rows.length?`<div class="table-scroll"><table class="table"><thead><tr><th>Student</th><th>Parent / guardian</th><th>Contact</th><th>Account</th><th>Action</th></tr></thead><tbody>
 ${rows.map(r=>`<tr><td><strong>${h(r.first_name)} ${h(r.last_name)}</strong><div class="cell-sub">${h(r.student_no)}</div></td>
 <td>${h(r.guardian_name||'Not recorded')}</td><td>${h(r.guardian_email||'—')}<div class="cell-sub">${h(r.guardian_phone||'')}</div></td>
 <td>${tag(badge(r),r.link_status==='linked'?'green':r.activated?'blue':'amber')}</td>
 <td><div class="row" style="gap:7px"><button class="btn smol outline" data-action="guardian-student" data-id="${h(r.student_id)}">View pupil</button>
 ${r.link_status!=='linked'||!r.activated?`<button class="btn smol outline" data-action="invite-guardian" data-id="${h(r.student_id)}">${r.link_status==='not_invited'?'Link & notify':'Retry email'}</button>`:''}</div></td></tr>`).join('')}
 </tbody></table></div>`:blank('No families yet','Accept an admission to create an enrolled student and its guardian contact.')}</div>
 <div class="notice" style="margin-top:15px">No separate parent invitation is required after admission acceptance. The system links the pupil automatically and emails the guardian. Use Link &amp; notify only to repair a historical unlinked record or retry a failed activation email. Confirm guardianship before processing.</div>`;
}
function settingsPage(){const dict=Object.fromEntries(get('settings').map(x=>[x.key,x.value]));const mail=get('email-log'),audit=get('audit');return `${pagehead('School settings & security','Choose your academic defaults, update your password and review audit activity.',`<button class="btn white" data-action="modal" data-value="change-password">${ico('shield',16)} Change password</button>`)}<div class="cards two"><div class="surface"><div class="surface-head"><h3>School configuration</h3><span class="tag blue">Administrator</span></div><form id="settings-form" class="form-grid">${field('Academic year','academic_year',dict.academic_year||'2026/27')}${field('Default monthly fee (£)','monthly_fee_pounds',Number(dict.monthly_fee_pence||3000)/100,'number','min="0" step="0.01"')}${field('School email','school_email',dict.school_email||'','email')}${field('School phone','school_phone',dict.school_phone||'','tel')}${field('School address','school_address',dict.school_address||'','textarea','','wide')}<div class="wide"><button class="btn primary" type="submit">${ico('check',16)} Save settings</button></div></form></div><div class="surface"><h3>Security controls</h3><div class="stat-list" style="margin-top:18px"><div class="row"><span>Session protection</span>${tag('HttpOnly cookie','green')}</div><div class="row"><span>Password security</span>${tag('PBKDF2 / SHA-256','green')}</div><div class="row"><span>Permissions</span>${tag('Role + student scope','green')}</div><div class="row"><span>CSRF protection</span>${tag('Enabled','green')}</div><div class="row"><span>Password recovery</span>${tag('Email provider required','amber')}</div></div><div class="notice" style="margin-top:19px">Before onboarding real children, confirm your safeguarding, UK GDPR privacy notice, retention rules, role access and incident escalation arrangements.</div></div><section class="surface"><div class="surface-head"><h3>Recent audit events</h3></div>${audit.length?audit.slice(0,25).map(a=>`<div class="list-row">${ico('shield',15)}<div class="grow"><strong>${h(a.actor||'System')} · ${h(a.action)} ${h(a.entity)}</strong><div class="sub">${fmt(a.created_at)} ${a.detail?'· '+h(a.detail):''}</div></div></div>`).join(''):blank('Audit log is empty')}</section><section class="surface"><div class="surface-head"><h3>Demo workspace</h3></div><p class="muted small" style="line-height:1.8;margin-bottom:17px">For a first-time preview, create 12 obviously fictional pupils across three classes, sample homework, attendance and one quiz. Use a separate demo database; do not mix demo data with real pupils.</p><span class="muted small">New pupils are added through Admissions only.</span></section></div>`;}
const surahs='Al-Fatihah|Al-Baqarah|Aal-Imran|An-Nisa|Al-Maidah|Al-Anam|Al-Araf|Al-Anfal|At-Tawbah|Yunus|Hud|Yusuf|Ar-Rad|Ibrahim|Al-Hijr|An-Nahl|Al-Isra|Al-Kahf|Maryam|Ta-Ha|Al-Anbiya|Al-Hajj|Al-Muminun|An-Nur|Al-Furqan|Ash-Shuara|An-Naml|Al-Qasas|Al-Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba|Fatir|Ya-Sin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Ash-Shura|Az-Zukhruf|Ad-Dukhan|Al-Jathiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Adh-Dhariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqiah|Al-Hadid|Al-Mujadilah|Al-Hashr|Al-Mumtahanah|As-Saff|Al-Jumuah|Al-Munafiqun|At-Taghabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Maarij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddaththir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba|An-Naziat|Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Inshiqaq|Al-Buruj|At-Tariq|Al-Ala|Al-Ghashiyah|Al-Fajr|Al-Balad|Ash-Shams|Al-Layl|Ad-Duha|Ash-Sharh|At-Tin|Al-Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-Adiyat|Al-Qariah|At-Takathur|Al-Asr|Al-Humazah|Al-Fil|Quraysh|Al-Maun|Al-Kawthar|Al-Kafirun|An-Nasr|Al-Masad|Al-Ikhlas|Al-Falaq|An-Nas'.split('|');

const surahVerseCounts=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
// Standard Kufan 6236-verse numbering; matches the 114-surah dropdown above.
function validateQuranVerses(data){
 const start=surahs.indexOf(String(data.surah_from||'')),end=surahs.indexOf(String(data.surah_to||''));
 if(start<0||end<0)throw Error('Choose valid starting and ending Surahs');
 const from=Number(data.verse_from),to=Number(data.verse_to);
 if(!Number.isInteger(from)||from<1||from>surahVerseCounts[start])
   throw Error('From verse must be between 1 and '+surahVerseCounts[start]+' for '+surahs[start]);
 if(!Number.isInteger(to)||to<1||to>surahVerseCounts[end])
   throw Error('To verse must be between 1 and '+surahVerseCounts[end]+' for '+surahs[end]);
 if(end<start||(start===end&&to<from))throw Error('The ending Surah/verse must not come before the starting one');
}
function updateSurahVerseLimits(){
 const form=document.getElementById('homework-form');if(!form)return;
 const refs=[['surah_from','verse_from'],['surah_to','verse_to']];
 for(const [surahName,verseName] of refs){
  const surah=form.elements[surahName],verse=form.elements[verseName];if(!surah||!verse)continue;
  const index=surahs.indexOf(surah.value),max=index<0?null:surahVerseCounts[index];
  verse.max=max||'6236';verse.min='1';verse.step='1';
  verse.title=max?surah.value+' contains '+max+' verses':'Choose a Surah first';
 }
 const note=form.querySelector('#quran-verse-hint');if(note){
  const from=surahs.indexOf(form.elements.surah_from?.value),to=surahs.indexOf(form.elements.surah_to?.value);
  note.textContent=from<0||to<0?'Choose both Surahs to see permitted verse ranges.':
    'From: '+surahs[from]+' (1–'+surahVerseCounts[from]+') · To: '+surahs[to]+' (1–'+surahVerseCounts[to]+')';
 }
}

function surahSelect(name,label){return select(label,name,`<option value="">Choose surah</option>`+surahs.map((s,i)=>`<option value="${h(s)}">${i+1}. ${h(s)}</option>`).join(''));}
function modal(title,body,form='',large=false,submit='Save changes'){document.querySelector('.modal-overlay')?.remove();const overlay=document.createElement('div');overlay.className='modal-overlay';overlay.innerHTML=`<div class="modal ${large?'large':''}" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-head"><div><div class="caps blue" style="margin-bottom:7px">MADRASAH AT-TOWFIQ</div><h2>${h(title)}</h2></div><button type="button" class="iconbtn" aria-label="Close dialog" data-action="close-modal">${ico('close',19)}</button></div>${form?`<form id="${form}"><div class="modal-body">${body}</div><div class="modal-foot"><button type="button" class="btn white" data-action="close-modal">Cancel</button><button type="submit" class="btn primary">${submit} ${ico('arrow',16)}</button></div></form>`:`<div class="modal-body">${body}</div><div class="modal-foot"><button type="button" class="btn white" data-action="close-modal">Close</button></div>`}</div>`;overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});document.body.append(overlay);const focus=overlay.querySelector('input:not([type="hidden"]),select,textarea,button');if(focus)focus.focus();}

/**
 * Non-blocking, branded action confirmation.
 * Keeps existing edit forms in place (e.g. invoice bulk issue and Jumu'ah preview).
 * A sensitive deletion can require exact typed acknowledgement.
 */
let activeConfirmation=null;
function confirmDialog({title,message,details='',actionLabel='Confirm',tone='info',requiredText='',classChoices=null}) {
 if(activeConfirmation)return Promise.resolve(false); // Ignore parallel clicks; never approve a second action.
 activeConfirmation=new Promise(resolve=>{
  // A single pending dialog prevents accidental parallel confirmations.
  const previous=document.activeElement;
  const overlay=document.createElement('div');
  overlay.className='action-confirm-overlay';
  const serious=tone==='danger'||tone==='warning';
  const safeTone=['info','warning','danger'].includes(tone)?tone:'info';
  overlay.innerHTML=`<div class="action-confirm-dialog tone-${safeTone}" role="alertdialog" aria-modal="true" aria-labelledby="action-confirm-title" aria-describedby="action-confirm-description" tabindex="-1">
    <div class="action-confirm-top">
      <span class="action-confirm-brand">${ico('shield',14)} MADRASAH AT-TOWFIQ</span>
      <button type="button" class="action-confirm-close" data-confirm-choice="cancel" aria-label="Cancel and close">${ico('close',18)}</button>
    </div>
    <div class="action-confirm-content">
      <div class="action-confirm-emblem">${ico(serious?'shield':'check',26)}</div>
      <h2 id="action-confirm-title">${h(title)}</h2>
      <p id="action-confirm-description">${h(message)}</p>
      ${details?`<div class="action-confirm-details">${ico('info',18)}<p>${h(details)}</p></div>`:''}
      ${Array.isArray(classChoices)?`<div class="action-confirm-typed"><label for="action-class-choice">Select a class to complete admission</label><select id="action-class-choice" class="select-small" style="width:100%;padding:12px" required><option value="">Choose a learning class</option>${classChoices.map(c=>`<option value="${h(c.id)}" ${Number(c.enrolled)>=Number(c.capacity)?'disabled':''}>${h(c.name)} (${h(c.enrolled)} / ${h(c.capacity)} places)${Number(c.enrolled)>=Number(c.capacity)?' — Full':''}</option>`).join('')}</select><p>A class must be selected before the pupil can be admitted. Full classes cannot be selected.</p></div>`:''}
      ${requiredText?`<div class="action-confirm-typed"><label for="action-confirm-input">Type <strong>${h(requiredText)}</strong> to authorise this action</label><input id="action-confirm-input" type="text" autocomplete="off" spellcheck="false" placeholder="${h(requiredText)}" aria-describedby="action-confirm-hint" /><p id="action-confirm-hint">This irreversible action requires the exact confirmation word.</p></div>`:''}
    </div>
    <div class="action-confirm-footer">
      <button type="button" class="btn white" data-confirm-choice="cancel">Cancel</button>
      <button type="button" class="btn primary action-confirm-approve ${serious?'action-confirm-caution':''}" data-confirm-choice="approve" ${requiredText||Array.isArray(classChoices)?'disabled':''}>${ico(serious?'shield':'check',16)} ${h(actionLabel)}</button>
    </div>
  </div>`;
  let settled=false;
  const finish=value=>{
   if(settled)return;
   settled=true;
   overlay.remove();
   activeConfirmation=null;
   if(previous?.isConnected&&typeof previous.focus==='function')previous.focus();
   resolve(value);
  };
  const approval=overlay.querySelector('[data-confirm-choice="approve"]');
  const typed=overlay.querySelector('#action-confirm-input');
  typed?.addEventListener('input',()=>{approval.disabled=typed.value.trim()!==requiredText;});
  const classSelect=overlay.querySelector('#action-class-choice');
  classSelect?.addEventListener('change',()=>{approval.disabled=!classSelect.value;});
  overlay.addEventListener('click',e=>{
   const btn=e.target.closest('[data-confirm-choice]');
   if(btn){
    if(btn.dataset.confirmChoice==='approve'&&!btn.disabled)finish(classSelect?classSelect.value:true);
    else if(btn.dataset.confirmChoice==='cancel')finish(false);
   }else if(e.target===overlay)finish(false);
  });
  overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);return;}
   if(e.key==='Tab'){
    const focusables=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')];
    const at=focusables.indexOf(document.activeElement);
    if(e.shiftKey&&at===0){e.preventDefault();focusables.at(-1)?.focus();}
    else if(!e.shiftKey&&at===focusables.length-1){e.preventDefault();focusables[0]?.focus();}
   }
  });
  document.body.append(overlay);
  (typed||overlay.querySelector('[data-confirm-choice="cancel"]'))?.focus();
 });
 return activeConfirmation;
}

function openModal(type,selectedId=''){
 let s=student(selectedId),body='',title='',form='',size=false,submit='Save';
 switch(type){
 case 'edit-student':{
   const edit=true;title=edit?'Edit student profile':'Enrol a new student';form='student-form';size=true;
   body=`<input type="hidden" name="id" value="${h(s?.id||'')}"><div class="form-grid">${field('First name','first_name',s?.first_name||'','text','required')}${field('Last name','last_name',s?.last_name||'','text','required')}${field('Date of birth','dob',s?.dob||'','date')}${select('Gender','gender',htmlOptions([['','Choose'],['Male','Male'],['Female','Female'],['Other','Prefer not to specify']],s?.gender||''))}${select('Assigned class','class_id',classOptions(s?.class_id||''))}${select('Parent / guardian account','parent_id',userOptions(s?.parent_id||'',['parent']))}${field('Family contact phone','phone',s?.phone||'','tel')}${select('Enrolment status','status',htmlOptions([['active','Active'],['inactive','Inactive'],['graduated','Graduated']],s?.status||'active'))}${field('Home address','address',s?.address||'','textarea','','wide')}${field('Medical / support notes (restricted)','medical_notes',s?.medical_notes||'','textarea','','wide')}</div>${edit?`<div class="notice warn" style="margin-top:18px">To permanently delete this pupil and linked records, use the protected delete action below. This is irreversible.</div><button type="button" class="btn danger smol" style="margin-top:12px" data-action="delete-student" data-id="${h(s.id)}">${ico('trash',15)} Delete student permanently</button>`:''}`;submit=edit?'Save student':'Create student';break;}
 case 'assign-class':{
   if(!s)return;
   title='Assign class · '+sidName(s);form='class-assignment-form';submit='Save class assignment';
   const courses=get('classes');
   body=`<input type="hidden" name="student_id" value="${h(s.id)}">
     <div class="class-allocation-summary"><div class="avatar">${h(initials(sidName(s)))}</div><div><strong>${h(sidName(s))}</strong><p>${h(s.student_no||'')} · Current class: ${h(s.class_name||'Unassigned')}</p></div></div>
     ${courses.length?`<div class="field wide"><label for="assign-class-choice">Choose learning class</label><select id="assign-class-choice" name="class_id" required><option value="">Choose a class</option>${courses.map(c=>`<option value="${h(c.id)}" ${s.class_id===c.id?'selected':''} ${Number(c.enrolled)>=Number(c.capacity)&&s.class_id!==c.id?'disabled':''}>${h(c.name)} (${c.enrolled} / ${c.capacity} places)${Number(c.enrolled)>=Number(c.capacity)&&s.class_id!==c.id?' — Full':''}</option>`).join('')}</select></div>
     <div class="notice" style="margin-top:15px">Changing a class updates the student directory and assigned teacher access. Class capacity is checked before saving.</div>`:`<div class="notice warn">No classes exist yet. Create a learning group under <strong>Classes &amp; enrolment</strong> first.</div>`}`;
   break;
 }
 case 'class-roster':{
   const c=get('classes').find(x=>x.id===selectedId);if(!c)return;
   title='Manage pupils · '+c.name;form='class-roster-form';size=true;submit='Allocate selected pupils';
   const pool=get('students').filter(x=>x.class_id===c.id||(x.status==='active'&&!x.class_id));
   const count=pool.filter(x=>x.class_id===c.id).length;
   body=`<input type="hidden" name="class_id" value="${h(c.id)}">
     <div class="class-roster-intro"><div><strong>${h(c.name)}</strong><p>${h(c.stage||'')} · ${count} enrolled / ${h(c.capacity)} places</p></div><span class="tag blue">${count} enrolled</span></div>
     <p class="small muted" style="margin:12px 0 16px">Add unassigned pupils by ticking their names. Current members are locked in this roster to avoid accidental removal; use <b>Change class</b> on their student profile to transfer them.</p>
     <div class="class-roster-list">${pool.length?pool.map(x=>`<label class="class-roster-item"><input type="checkbox" ${x.class_id===c.id?'checked disabled':''} ${x.class_id===c.id?'':'name="student_ids"'} value="${h(x.id)}">${x.class_id===c.id?`<input type="hidden" name="student_ids" value="${h(x.id)}">`:''}<span class="avatar">${h(initials(sidName(x)))}</span><span class="class-roster-name"><strong>${h(sidName(x))}</strong><small>${h(x.student_no||'')} · ${x.class_id===c.id?'Currently enrolled':'Not yet assigned'}</small></span></label>`).join(''):blank('No eligible pupils','Accept an admission to create a pupil record.')}</div>
     <div class="notice" style="margin-top:16px">Class capacity is enforced by the server. No pupil or guardian identities, admissions or fees are changed.</div>`;
   break;
 }
 case 'add-homework':{
   title='Assign personalised homework';form='homework-form';size=true;submit='Assign homework';
   body=`<div class="notice" style="margin-bottom:17px">A teacher can record Hifdh, Muraja’a, Qaaidah or Islamic Studies homework. Each record includes its due date, completion status and feedback.</div><div class="form-grid">${select('Student','student_id',learnerOptions(selectedId),'required')}${select('Subject','type',htmlOptions(Object.entries(homeworkTypeLabel),'hifdh'),'required')}
 <div class="wide" id="surah-fields"><div class="form-grid">${surahSelect('surah_from','From surah')}${field('From verse','verse_from','1','number','min="1" step="1"')}${surahSelect('surah_to','To surah')}${field('To verse','verse_to','7','number','min="1" step="1"')}</div><p id="quran-verse-hint" class="small muted" style="margin-top:9px">Choose both Surahs to see permitted verse ranges.</p></div>
 <div class="wide hide" id="page-fields">${field('Qaaidah / Islamic Studies page number','page_number','','text','placeholder="e.g. 12–14"')}</div>
 ${field('Due by date','due_date',when(7),'date','required')}<div class="field"><span class="strong small">Completion status</span><div class="notice" style="margin-top:9px">Starts as <strong>Incomplete</strong>. After reviewing the work, choose <strong>Update</strong> from the homework tracker to mark it Complete or add teacher feedback.</div></div> ${field('Assignment instructions & comments','comments','','textarea','placeholder="What should the student practise?"','wide')}</div>`;break;}
 case 'grade-homework':{
   let r=get('homework').find(x=>x.id===selectedId);if(!r)return;
   title='Update homework progress';form='grade-homework-form';
   body=`<input type="hidden" name="id" value="${h(r.id)}"><div class="callout" style="margin-bottom:18px">${ico('book',23)}<div><h3>${h(homeworkTypeLabel[r.type])}</h3><p>${h(sidName(student(r.student_id)))} · ${h(homeworkDetail(r))} · Due ${fmt(r.due_date)}</p></div></div><div class="form-grid">${select('Completion status','status',htmlOptions([['incomplete','Incomplete'],['complete','Complete']],r.status),'required','wide')}${field('Teacher feedback & comments','teacher_feedback',r.teacher_feedback||'','textarea','','wide')}</div>`;submit='Update progress';break;}
 case 'add-behaviour':{
   title='Record behaviour & character';form='behaviour-form';size=true;submit='Record behaviour';
   let types=get('behaviour-catalog');body=`<div class="form-grid">${select('Student','student_id',learnerOptions(selectedId),'required','wide')}<div class="wide"><label class="field" style="margin-bottom:12px"><span class="strong small">Choose behaviour from the school policy</span></label><div class="caps green" style="margin:12px 0">GOOD BEHAVIOUR · POSITIVE POINTS</div><div class="catalogue">${types.filter(x=>x.points>0).map(x=>`<label class="cat-option"><span><input type="radio" name="reason_code" value="${h(x.code)}" ${x.code==='punctual'?'checked':''}> ${h(x.label)}</span><b class="points pos">+${x.points}</b></label>`).join('')}</div><div class="caps red" style="margin:23px 0 12px">BEHAVIOUR CONCERNS · DEDUCTIONS</div><div class="catalogue">${types.filter(x=>x.points<0).map(x=>`<label class="cat-option"><span><input type="radio" name="reason_code" value="${h(x.code)}"> ${h(x.label)}</span><b class="points neg">${x.points}</b></label>`).join('')}</div></div>${field('Private staff comments (context and follow-up)','notes','','textarea','placeholder="Describe what happened and any support provided"','wide')}</div>`;break;}
 case 'add-class':case 'edit-class':{
   let edit=type==='edit-class',c=get('classes').find(x=>x.id===selectedId);title=edit?'Edit learning class':'Create learning class';form='class-form';body=`<input type="hidden" name="id" value="${h(c?.id||'')}"><div class="form-grid">${field('Class name','name',c?.name||'','text','required')}${select('Stage','stage',htmlOptions([['Foundation','Foundation'],['Intermediate','Intermediate'],['Advanced','Advanced'],['Hifdh','Hifdh'],['Qaaidah','Qaaidah']],c?.stage||'Foundation'))}${select('Lead teacher','teacher_id',userOptions(c?.teacher_id||'',['teacher']))}${field('Capacity','capacity',c?.capacity||25,'number','min="1" max="1000"')}${field('Learning schedule','schedule',c?.schedule||'','text','placeholder="e.g. Saturday 10:00–13:00"','wide')}</div>`;break;}
 case 'admission':case 'edit-admission':{
   const entry=type==='edit-admission'?get('admissions').find(x=>x.id===selectedId):null;
   if(type==='edit-admission'&&!entry)return;
   title=entry?'Edit student application':'New student application';form='admission-form';size=true;body=admissionForm(entry||{});submit=entry?'Save application changes':'Submit application';break;}
 case 'invoice':{
   const active=get('students').filter(x=>x.status==='active');
   const choices=active.map(x=>`<label class="invoice-choice"><input type="checkbox" name="invoice_student_ids" value="${h(x.id)}"><span>${h(sidName(x))}<small>${h(x.class_name||'Not assigned')}</small></span></label>`).join('');
   title='Issue new fee invoice';form='invoice-form';size=true;
   body=`<div class="notice" style="margin-bottom:16px">Create individual invoices for one student, selected students, or all active students. Existing invoices for the same student and month will not be duplicated. These are manual account records; no money is collected automatically.</div>
    <div class="form-grid">
    ${select('Invoice recipients','invoice_mode',htmlOptions([['one','One student'],['selected','Selected students'],['all','All active students']],'one'),'required','wide')}
    <div class="wide" data-invoice-mode="one">${select('Student','student_id',`<option value="">Choose a student</option>`+active.map(x=>`<option value="${h(x.id)}" ${x.id===selectedId?'selected':''}>${h(sidName(x))} · ${h(x.class_name||'Unassigned')}</option>`).join(''))}</div>
    <div class="wide hide" data-invoice-mode="selected"><span class="strong small">Choose students to invoice</span><div class="invoice-checklist">${choices||'<p class="muted">No active students available.</p>'}</div></div>
    <div class="wide hide" data-invoice-mode="all"><div class="notice">All ${active.length} currently active students will receive individual invoices for this billing period. Inactive and graduated pupils are excluded.</div></div>
    ${field('Billing period','period',today().slice(0,7),'month','required')}${field('Amount per student (£)','amount',30,'number','required min="0.01" step="0.01"')}${field('Payment due','due_date',when(14),'date')}
    <div class="wide invoice-target-summary" id="invoice-target-summary">Choose an invoice recipient</div>
    </div>`;submit='Issue invoices';break;}
 case 'payment':{
   let f=get('fees').find(x=>x.id===selectedId);if(!f)return;title='Record fee payment';form='payment-form';body=`<input type="hidden" name="invoice_id" value="${h(f.id)}"><div class="callout" style="margin-bottom:17px">${ico('cash',23)}<div><h3>${h(f.first_name)} ${h(f.last_name)}</h3><p>${h(f.period)} · Balance ${money(f.amount_pence-f.paid_pence)}</p></div></div><div class="form-grid">${field('Amount received (£)','amount',((f.amount_pence-f.paid_pence)/100).toFixed(2),'number','required min="0.01" step="0.01"')}${select('Payment method','method',htmlOptions([['cash','Cash'],['bank_transfer','Bank transfer'],['card_external','Card (externally processed)'],['other','Other']],'cash'))}${field('Reference / receipt number','reference','','text','','wide')}</div>`;submit='Record payment';break;}
 case 'announcement':{title='Publish an announcement';form='announcement-form';body=`<div class="form-grid">${field('Announcement title','title','','text','required','wide')}${select('Audience','audience',htmlOptions([['all','Everyone'],['parent','Parents'],['teacher','Teachers'],['staff','Staff']],'all'),'','wide')}${field('Message','body','','textarea','required','wide')}</div>`;submit='Publish';break;}
 case 'message':{title='New private message';form='message-form';body=`<div class="form-grid">${select('Recipient','recipient_id',`<option value="">Select a recipient</option>`+get('contacts').map(x=>`<option value="${h(x.id)}">${h(x.name)} · ${cap(x.role)}</option>`).join(''),'required','wide')}${field('Subject','subject','','text','required','wide')}${field('Message','body','','textarea','required','wide')}</div>`;submit='Send in portal';break;}
 case 'event':{title='Add community event';form='event-form';body=`<div class="form-grid">${field('Event name','title','','text','required','wide')}${field('Date','event_date',when(7),'date','required')}${select('Category','category',htmlOptions([['community','Community'],['parents','Parents'],['learning','Learning'],['religious','Islamic occasion']],'community'))}${field('Event details','description','','textarea','','wide')}</div>`;submit='Create event';break;}
 case 'quiz':{title='Create a knowledge question';form='quiz-form';body=`<div class="form-grid">${field('Question','question','','textarea','required','wide')}${['Option A','Option B','Option C','Option D'].map((x,i)=>field(x,'option'+i,'','text','required')).join('')}${select('Correct answer','answer_index',htmlOptions([[0,'A'],[1,'B'],[2,'C'],[3,'D']],0))}${field('Category','category','Islamic Knowledge')}</div>`;submit='Publish question';break;}
 case 'edit-user':{
   const account=get('users').find(u=>u.id===selectedId);if(!account)return;
   title='Edit account details';form='edit-user-form';submit='Save account';size=true;
   body=`<input type="hidden" name="id" value="${h(account.id)}"><div class="form-grid">
     ${field('Full name','name',account.name,'text','required')}
     ${field('Email address','email',account.email,'email','required')}
     ${select('Role','role',htmlOptions([['admin','Administrator'],['staff','Office staff'],['teacher','Teacher']],account.role),'required')}
     ${select('Account state','active',htmlOptions([['true','Active'],['false','Deactivated']],String(!!account.active)),'required')}
     ${account.id===S.user.id?field('Current password (only when changing your own email)','current_password','','password','','wide'):''}
   </div><div class="notice" style="margin-top:14px">An email change for another staff member revokes existing sessions and issues a fresh activation invitation. Passwords are never displayed here.</div>`;break;
 }
 case 'invite':{title='Invite a staff member or guardian';form='invite-form';body=`<div class="notice" style="margin-bottom:15px">New users receive a one-time account activation link valid for 7 days. Verify a parent’s identity and email before inviting them. Accepted pupils with matching guardian emails will link upon activation if not already linked. Do not send pupil information through unsecured messaging apps.</div><div class="form-grid">${field('Full name','name','','text','required')}${field('Email address','email','','email','required')}${select('Access role','role',htmlOptions([['teacher','Teacher'],['staff','Office staff'],['parent','Parent / guardian'],['admin','Administrator']],'teacher'),'','wide')}</div>`;submit='Create invitation';break;}
 case 'change-password':{title='Change your password';form='password-form';body=`${field('Current password','current_password','','password','required')}${field('New password · 12+ characters','new_password','','password','required minlength="12"')}`;break;}

 }
 if(!form)return;modal(title,body,form,size,submit);
 if(form==='invoice-form')updateInvoiceTargets();if(form==='homework-form')updateSurahVerseLimits();
}

function invitationNotice(result,guardianName='parent / guardian'){
 if(result.invitation_url){
  modal('Activation link requires delivery',`<div class="notice warn">The invitation email was not confirmed as sent. Verify the recipient's identity, then share this single-use link securely with <strong>${h(guardianName)}</strong>.</div><div class="field" style="margin-top:16px"><label>Private activation link</label><textarea id="invitation-url" readonly>${h(result.invitation_url)}</textarea></div><button type="button" class="btn primary" style="margin-top:13px" data-action="copy-invite">${ico('file',15)} Copy activation link</button>`);
 } else if(result.invitation_status==='sent'||result.emailed){
   modal('Invitation sent successfully',`<div class="guardian-invite-success"><span class="guardian-invite-success-icon">${ico('check',32)}</span><h3>The parent invitation is on its way</h3><p>A secure account activation email has been accepted by the email provider for <strong>${h(guardianName)}</strong>.</p><div class="guardian-invite-note">${ico('info',19)}<p><strong>What happens next?</strong><span>The parent can open the message and create their password using the one-time link. Please ask them to check their spam folder if the message does not arrive.</span></p></div></div>`);
 } else if(result.invitation_status==='linked_existing'||result.invitation_status==='already_active'||result.invitation_status==='already_linked'){
   const emailMessage=result.email_status==='sent'?'A notification has been accepted by the email provider.':result.email_status==='not_sent'?'The pupil is linked, but the email was not delivered to the provider; review the email log.':'No new activation is needed.';
   modal('Guardian account linked',`<div class="guardian-invite-success"><span class="guardian-invite-success-icon">${ico('check',32)}</span><h3>Child linked successfully</h3><p>The pupil is associated with the existing guardian account. ${result.already_enrolled?'This admission was already enrolled. ':''}There is no need to create a second account or send a new activation link. ${emailMessage}</p><div class="guardian-invite-note">${ico('shield',19)}<p><strong>One account for the whole family</strong><span>The guardian can use their existing login to see all linked children. Staff members who are guardians can select Family view without losing their staff role.</span></p></div></div>`);
 } else if(result.invitation_status==='manual_review'||result.invitation_status==='existing_non_parent_account'){
   toast('Guardian requires manual verification. Review the existing account and pupil link.',true);
 } else if(result.invitation_status){
   toast('Guardian invitation requires attention: '+result.invitation_status.replaceAll('_',' '),true);
 }
}
function csvParse(input){const rows=[];let row=[],cell='',q=false;for(let i=0;i<input.length;i++){const c=input[i];if(c==='"'){if(q&&input[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(v=>v.trim()))rows.push(row);row=[];}else cell+=c;}row.push(cell);if(row.some(v=>v.trim()))rows.push(row);const hdr=rows.shift()?.map(x=>x.trim().toLowerCase())||[];return rows.map(r=>Object.fromEntries(hdr.map((key,i)=>[key,(r[i]||'').trim()])));}
async function action(a,el){const key=el.dataset.value,selectedId=el.dataset.id;
 if(a==='nav-group'){
  const groupId=el.dataset.group;
  if(!NAV_GROUPS.some(g=>g.id===groupId))return;
  const expanded=el.getAttribute('aria-expanded')==='true';
  S.navOpen[groupId]=!expanded;
  el.setAttribute('aria-expanded',String(!expanded));
  el.classList.toggle('expanded',!expanded);
  const menu=document.getElementById('nav-items-'+groupId);
  if(menu)menu.hidden=expanded;
  return;
 }
 if(a==='attendance-mark-present'){
  document.querySelectorAll('#attendance-form select[name^="a-"]').forEach(el=>{if(!el.value)el.value='present';});
  toast('Unmarked pupils set to Present. Review and save the register to record them.');return;
 }
 if(a==='classroom-profile'){await navigate('students');if(!get('students').some(x=>x.id===selectedId))return;S.studentId=selectedId;S.studentTab='overview';renderPage();return;}
 if(a==='nav'){
  const g=NAV_GROUPS.find(g=>g.items.some(([page])=>page===key));
  if(g)S.navOpen[g.id]=true;
  await navigate(key);return;
 }
 if(a==='menu'){$('#shell')?.classList.toggle('menu-open');return;}
 if(a==='family-switch'){
  if(!S.user?.has_family || S.staffRole==='parent')return;
  S.familyMode=!S.familyMode;S.user.role=S.familyMode?'parent':S.staffRole;
  S.data={};S.navOpen={};
  await navigate('dashboard');
  toast(S.familyMode?'Family view: your linked children only':'Staff view restored');
  return;
 }
 if(a==='close-modal'){document.querySelector('.modal-overlay')?.remove();return;}
 if(a==='authmode'){S.authMode=key;renderAuth();return;}
 if(a==='logout'){try{await post('/auth/logout',{});}catch{}S.user=null;S.staffRole=null;S.familyMode=false;S.csrf='';S.authMode='login';S.data={};S.navOpen={};renderAuth();return;}
 if(a==='global-search'){modal('Search the Madrasah',`<div class="searchbox" style="max-width:none">${ico('search',19)}<input id="global-query" placeholder="Search pupils, assignments and classes..." autocomplete="off"></div><div id="global-results" style="margin-top:20px">${blank('Search school records','Results are filtered to records your account can access.')}</div>`,false,true);$('#global-query')?.focus();return;}
 if(a==='search-open'){document.querySelector('.modal-overlay')?.remove();await navigate(el.dataset.page||'students');if(el.dataset.page==='students'){S.studentId=selectedId;S.studentTab='overview';renderPage();}return;}
 if(a==='modal'){if(key==='add-behaviour'&&!get('behaviour-catalog').length)await load(['behaviour-catalog']);openModal(key,selectedId);return;}
 if(a==='admission-view'){admissionDetails(get('admissions').find(x=>x.id===selectedId));return;}
 if(a==='student-profile'){S.studentId=selectedId;S.studentTab='overview';renderPage();return;}
 if(a==='student-back'){S.studentId=null;renderPage();return;}
 if(a==='guardian-student'){await navigate('students');S.studentId=selectedId;S.studentTab='overview';renderPage();return;}
 if(a==='family-student'){await navigate('students');if(!get('students').some(x=>x.id===selectedId))return;S.studentId=selectedId;S.studentTab='overview';renderPage();return;}
 if(a==='invite-guardian'){
  const g=get('guardians').find(x=>x.student_id===selectedId);
  if(!g){toast('Guardian record not found. Reload the directory and try again.',true);return;}
  if(!g.guardian_email){toast('Add the guardian email to the admission record before inviting.',true);return;}
  const name=(g.guardian_name||'').trim();
  const preferred=name.split(/\s+/).filter(Boolean).at(-1)||'Parent';
  const previouslyInvited=Boolean(g.account_id);
  const body=`<input type="hidden" name="student_id" value="${h(g.student_id)}">
    <div class="guardian-invite-hero"><span class="guardian-invite-symbol">${ico('mail',25)}</span>
      <div><p class="guardian-invite-eyebrow">SECURE PARENT ACCESS</p><h3>Welcome a family to the madrasah</h3><p>An account-linking or activation email will be sent automatically from the official madrasah address.</p></div></div>
    <div class="guardian-invite-overview">
      <div><span>STUDENT</span><strong>${h(g.first_name)} ${h(g.last_name)}</strong><small>${h(g.student_no||'')}</small></div>
      <div><span>PARENT / GUARDIAN</span><strong>${h(name||'Not recorded')}</strong><small>Recorded admission contact</small></div>
      <div class="guardian-invite-full"><span>INVITATION WILL BE SENT TO</span><strong>${ico('mail',15)} ${h(g.guardian_email)}</strong></div>
    </div>
    <div class="guardian-invite-greeting"><label for="guardian-greeting-name">Parent's preferred first name</label>
      <input id="guardian-greeting-name" name="greeting_name" maxlength="60" required autocomplete="off" value="${h(preferred)}">
      <p>Check this name before sending. Email greeting: <strong id="guardian-invite-preview">Dear ${h(preferred)},</strong> Edit the name above to make sure it is correct.</p>
    </div>
    <div class="guardian-invite-note">${ico('shield',19)}<p><strong>${previouslyInvited?'This will replace the previous invitation.':'A private, single-use activation link will be created.'}</strong><span>New guardian accounts receive a one-time activation link valid for 7 days. Existing active accounts are linked without changing the password. Verify guardianship and the registered email address first.</span></p></div>`;
  modal(previouslyInvited?'Review guardian email':'Link parent / guardian',body,'guardian-invite-form',false,previouslyInvited?'Retry guardian email':'Link & notify');
  document.querySelector('.modal-overlay')?.classList.add('guardian-invite-overlay');
  document.querySelector('.modal')?.classList.add('guardian-invite-modal');
  return;
 }
 if(a==='student-tab'){S.studentTab=key;if(key==='behaviour'&&!get('behaviour-catalog').length)await load(['behaviour-catalog']);renderPage();return;}
 if(a==='delete-student'){
  const s=student(selectedId);if(!s)return;
  const approved=await confirmDialog({title:'Permanently delete student?',message:'Delete '+sidName(s)+' and all linked school records?',details:'Attendance, homework, behaviour, invoices and payment records will be permanently deleted. This cannot be undone.',actionLabel:'Delete student permanently',tone:'danger',requiredText:'DELETE'});
  if(!approved)return;
  await post('/students',{id:selectedId},'DELETE');document.querySelector('.modal-overlay')?.remove();S.studentId=null;toast('Student and linked records permanently deleted');await navigate('students');return;
 }
 if(a==='finance-notify'){
  const invoice=get('fees').find(x=>x.id===selectedId);
  if(!invoice){toast('Invoice not found. Refresh the fee page.',true);return;}
  const amount=Math.max(0,Number(invoice.amount_pence)-Number(invoice.paid_pence));
  if(!amount){toast('This invoice is already settled; no balance reminder is needed.');return;}
  const name=[invoice.first_name,invoice.last_name].filter(Boolean).join(' ');
  const allowed=await confirmDialog({title:'Email fee statement?',message:'Send a private fee reminder for '+name+'?',details:'Billing month: '+invoice.period+' · Amount outstanding: '+money(amount)+'. The message goes to the current verified guardian contact and does not collect a payment.',actionLabel:'Send fee statement'});
  if(!allowed)return;
  const result=await post('/fees/notify',{invoice_id:selectedId});
  toast(result.notification_status==='sent'?'Fee statement accepted for email delivery':result.notification_status==='no_guardian_email'?'Fee statement could not be sent: the pupil has no eligible guardian email.':result.notification_status==='already_paid'?'This invoice is now paid. No reminder sent.':'The statement was not emailed. Check the Resend/email log.',result.notification_status!=='sent');
  return;
 }
 if(a==='delete-event'){
  if(!await confirmDialog({title:'Delete this event?',message:'Remove this event from the madrasah calendar?',details:'The event will no longer appear in the portal.',actionLabel:'Delete event',tone:'danger'}))return;
  await post('/events',{id:selectedId},'DELETE');toast('Event deleted');await navigate('events');return;
 }
 if(a==='delete-announcement'){
  if(!await confirmDialog({title:'Delete this announcement?',message:'Remove this announcement from the portal?',details:'Families and staff will no longer see this announcement.',actionLabel:'Delete announcement',tone:'danger'}))return;
  await post('/announcements',{id:selectedId},'DELETE');toast('Announcement deleted');await navigate('events');return;
 }
 if(a==='toggle-user'){
  const account=get('users').find(u=>u.id===selectedId),enable=el.dataset.active==='1';
  if(!await confirmDialog({title:enable?'Activate staff account?':'Deactivate staff account?',message:(enable?'Restore access for ':'Suspend access for ')+(account?.name||'this user')+'?',details:enable?'This person will be able to access their authorised portal role.':'This person will be prevented from signing in until reactivated.',actionLabel:enable?'Activate account':'Deactivate account',tone:enable?'info':'warning'}))return;
  await post('/users',{id:selectedId,active:enable},'PATCH');toast('Account updated');await navigate('staff');return;
 }
 if(a==='demo-seed'){
  if(!await confirmDialog({title:'Create demonstration records?',message:'Add fictional pupils, homework and attendance to the current database?',details:'Never use demo data in a production madrasah database. This feature may be blocked by the server.',actionLabel:'Create demonstration data',tone:'warning'}))return;
  const r=await post('/demo-seed',{});toast(`Created ${r.students} fictional student profiles`);await navigate('dashboard');return;
 }
 if(a==='export-report'){let rows=get('reports');let out=[['Student ID','First name','Last name','Class','Present','Attendance sessions','Homework complete','Homework total','Behaviour points'],...rows.map(x=>[x.student_no,x.first_name,x.last_name,x.class_name,x.present,x.attendance_total,x.homework_complete,x.homework_total,x.behaviour_points])].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');const blob=new Blob([out],{type:'text/csv;charset=utf-8;'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='at-towfiq-student-report-'+today()+'.csv';link.click();URL.revokeObjectURL(link.href);toast('Report downloaded. Please handle student data securely.');return;}
 if(a==='play-quiz'){const q=get('quizzes').find(x=>x.id===selectedId);if(!q)return;modal('Knowledge challenge',`<p style="font:normal 22px/1.45 Georgia,serif;margin-bottom:19px">${h(q.question)}</p><div class="caps muted" style="margin-bottom:9px">CHOOSE ONE ANSWER</div>${q.options.map((o,i)=>`<button type="button" class="games-choice" data-action="answer-quiz" data-id="${h(q.id)}" data-answer="${i}"><span>${String.fromCharCode(65+i)}. ${h(o)}</span>${ico('chevron',16)}</button>`).join('')}`);return;}
 if(a==='answer-quiz'){const result=await post('/quizzes/answer',{quiz_id:selectedId,answer_index:Number(el.dataset.answer)});document.querySelector('.modal-overlay')?.remove();toast(result.correct?'Masha’Allah! +10 points earned.':'Thank you for trying! Review the lesson and try another question.');await navigate('games');return;}
 if(a==='automation-preview'){const info=await api('/automation/preview');const settings=await api('/settings');const set=Object.fromEntries(settings.items.map(x=>[x.key,x.value]));modal('Jumu’ah automation',`<div class="notice">Preview before emailing ${info.recipient_count} active staff, teachers and parents. Sending needs a verified Resend sender and an API key.</div><form id="automation-form" class="form-grid" style="margin-top:18px">${select('Weekly reminders enabled?','jumah_enabled',htmlOptions([['false','No (disabled)'],['true','Yes (send every Friday)']],String(info.enabled)),'','wide')}${field('Message','jumah_message',info.body,'textarea','','wide')}<button class="btn primary wide" type="submit">Save reminder settings</button></form><div class="divider"></div><div class="surface" style="box-shadow:none"><p class="caps blue">EMAIL PREVIEW</p><h3 style="margin:12px 0">${h(info.subject)}</h3><p class="muted" style="line-height:1.8">${h(info.body)}</p></div><button class="btn outline" data-action="send-jumah">${ico('mail',16)} Send test broadcast to all recipients now</button>`,false,true);return;}
 if(a==='send-jumah'){
  if(!await confirmDialog({title:'Send Jumu’ah broadcast?',message:'Email all active teachers, office staff and parent accounts?',details:'This is a real broadcast to every eligible recipient, not a single test message. Check the content and recipient count before continuing.',actionLabel:'Send broadcast to all',tone:'warning'}))return;
  const r=await post('/automation/send',{confirm:'SEND_JUMAH'});toast(`${r.sent} of ${r.total} reminder emails sent`);document.querySelector('.modal-overlay')?.remove();await navigate('automation');return;
 }
}
function notificationResultMessage(result,recordType){
 const label=recordType==='homework'?'Homework assignment':'Behaviour points';
 if(result.notification_status==='sent')return label+' saved · parent email accepted for delivery';
 if(result.notification_status==='no_guardian_email')return label+' saved · no eligible guardian email found; check the student/guardian record';
 return label+' saved · parent notification not sent; check the email log in Settings';
}
async function submitForm(form){const formId=form.getAttribute('id'),raw=Object.fromEntries(new FormData(form).entries());const close=()=>document.querySelector('.modal-overlay')?.remove();let refresh=S.page;
 if(formId==='auth-form'){
  const mode=S.authMode;let endpoint=mode==='login'?'/auth/login':mode==='setup'?'/auth/setup':mode==='forgot'?'/auth/forgot':mode==='invite'?'/auth/accept-invite':'/auth/reset';const args={...raw};if(mode==='invite')args.token=new URLSearchParams(location.search).get('invite');if(mode==='reset')args.token=new URLSearchParams(location.search).get('reset');if(mode==='reset'&&args.password!==args.confirm_password)throw Error('The two passwords must match.');
  const r=await post(endpoint,args);
  if(mode==='forgot'){S.authMode='forgot-sent';renderAuth();return;}
  if(mode==='reset'){history.replaceState({},'',location.pathname);S.authMode='reset-success';renderAuth();return;}
  if(mode==='invite')history.replaceState({},'',location.pathname);S.user=r.user;S.staffRole=S.user?.role;S.familyMode=false;S.csrf=r.csrf;toast('Welcome to Madrasah At-Towfiq!');await navigate('dashboard');return;
 }
 if(formId==='student-form'){let {id:studentId,...payload}=raw;for(const k of ['class_id','parent_id','dob'])if(payload[k]==='')payload[k]=null;if(!studentId)throw Error('New students must be enrolled from Admissions');await post('/students',{...payload,id:studentId},'PATCH');toast('Student profile updated');}
 else if(formId==='homework-form'){if(['hifdh','murajaa'].includes(raw.type))validateQuranVerses(raw);if(raw.type==='qaaidah'||raw.type==='islamic_studies'){raw.surah_from='';raw.surah_to='';raw.verse_from=null;raw.verse_to=null;}const result=await post('/homework',raw);toast(notificationResultMessage(result,'homework'),result.notification_status!=='sent');}
 else if(formId==='grade-homework-form'){await post('/homework',raw,'PATCH');toast('Homework progress updated');}
 else if(formId==='behaviour-form'){if(!raw.reason_code)throw Error('Select a behaviour reason');const result=await post('/behaviour',raw);toast(notificationResultMessage(result,'behaviour'),result.notification_status!=='sent');}
 else if(formId==='class-form'){let {id:cid,...rest}=raw;await post('/classes',cid?{...rest,id:cid}:rest,cid?'PATCH':'POST');toast('Class saved');}
 else if(formId==='class-assignment-form'){
  if(!raw.class_id)throw Error('Choose a class before saving this pupil.');
  await post('/students',{id:raw.student_id,class_id:raw.class_id},'PATCH');toast('Class assignment saved successfully');
 }
 else if(formId==='class-roster-form'){
  const student_ids=new FormData(form).getAll('student_ids');
  const course=get('classes').find(x=>x.id===raw.class_id);
  if(course && student_ids.length>Number(course.capacity))throw Error('You selected '+student_ids.length+' pupils, but this class has only '+course.capacity+' places.');
  const result=await post('/classes/enrolment',{class_id:raw.class_id,student_ids},'PATCH');
  toast(result.assigned+' pupils assigned to '+(course?.name||'the class'));
 }
 else if(formId==='admission-form'){for(const k of ['level_starting','level_qaaidah','level_quran','arabic_read_write','consent_first_aid','consent_photos'])raw[k]=form.elements[k]?.checked?1:0;const aid=raw.id;delete raw.id;if(raw.previous_attended==='yes'&&!raw.previous_institute.trim())throw Error('Please enter the previous institute / madrasah name');const result=await post('/admissions',aid?{...raw,id:aid,update_details:true}:raw,aid?'PATCH':'POST');
 if(aid){toast('Application details updated');}
 else if(result.acknowledgement_status==='sent'){toast('Application recorded · receipt email accepted for delivery · '+result.reference);}
 else{toast('Application recorded · email acknowledgement not sent. Check the email log or Resend configuration.',true);}}
 else if(formId==='invoice-form'){
  const mode=raw.invoice_mode||'one';const ids=[...new FormData(form).getAll('invoice_student_ids')];
  const candidates=get('students').filter(x=>x.status==='active');
  const count=mode==='all'?candidates.length:mode==='selected'?ids.length:raw.student_id?1:0;
  if(!count)throw Error('Select at least one active student.');
  const amount_pence=Math.round(Number(raw.amount)*100);
  if(!Number.isSafeInteger(amount_pence)||amount_pence<1)throw Error('Enter a valid positive invoice amount.');
  if(mode==='one'){
    const result=await post('/fees',{student_id:raw.student_id,period:raw.period,due_date:raw.due_date,amount_pence});toast(result.notification_status==='sent'?'Invoice issued · guardian email accepted for delivery':result.notification_status==='no_guardian_email'?'Invoice saved · no eligible guardian contact for email':'Invoice saved · email not sent; check Resend/email log',result.notification_status!=='sent');
  }else{
    const total=money(amount_pence*count);
    if(!await confirmDialog({title:'Issue '+count+' invoices?',message:money(amount_pence)+' per pupil · '+total+' in total for '+raw.period+'.',details:'Existing invoices for the selected billing month will be skipped. Review the total and selection before issuing. This cannot be undone from this screen.',actionLabel:'Issue '+count+' invoices',tone:'warning'}))return;
    const result=await post('/fees/bulk',{mode,student_ids:mode==='selected'?ids:[],period:raw.period,due_date:raw.due_date,amount_pence,confirm:'ISSUE_BULK_INVOICES'});
    toast(`Issued ${result.created} invoices · ${result.skipped} already existed. Individual email reminders can be sent from the fee statements table.`);
  }
 }
 else if(formId==='payment-form'){const result=await post('/payments',{invoice_id:raw.invoice_id,amount_pence:Math.round(Number(raw.amount)*100),method:raw.method,reference:raw.reference});toast(result.notification_status==='sent'?'Payment recorded · receipt email accepted for delivery':result.notification_status==='no_guardian_email'?'Payment recorded · no eligible guardian email for receipt':'Payment recorded · receipt email not sent; check Resend/email log',result.notification_status!=='sent');}
 else if(formId==='announcement-form'){await post('/announcements',raw);toast('Announcement published');}
 else if(formId==='message-form'){await post('/messages',raw);toast('Message sent to recipient’s portal inbox');}
 else if(formId==='event-form'){await post('/events',raw);toast('Event created');}
 else if(formId==='quiz-form'){await post('/quizzes',{question:raw.question,options:[raw.option0,raw.option1,raw.option2,raw.option3],answer_index:Number(raw.answer_index),category:raw.category});toast('Quiz question published');}
 else if(formId==='edit-user-form'){
   raw.active=raw.active==='true';
   const result=await post('/users',raw,'PATCH');close();await navigate('staff');
   if(result.invitation_url){invitationNotice(result,raw.name);}else toast(result.emailed?'Updated account — verification email sent':'Staff account updated');
   return;
 }
 else if(formId==='guardian-invite-form'){
   const guardian=get('guardians').find(x=>x.student_id===raw.student_id);
   if(!raw.greeting_name?.trim())throw Error('Enter the parent’s preferred first name.');
   const result=await post('/guardians',{student_id:raw.student_id,greeting_name:raw.greeting_name.trim()});
   document.querySelector('.modal-overlay')?.remove();
   await navigate('guardians');
   invitationNotice(result,guardian?.guardian_name||'parent / guardian');
   return;
 }
 else if(formId==='invite-form'){const r=await post('/users',raw);close();if(r.invitation_url){modal('Invitation created',`<div class="notice">Outgoing email is not configured. Share this one-time activation URL privately with <strong>${h(raw.name)}</strong>.</div><div class="field" style="margin-top:16px"><label>Secure invitation URL</label><textarea id="invitation-url" readonly>${h(r.invitation_url)}</textarea></div><button type="button" class="btn primary" style="margin-top:13px" data-action="copy-invite">${ico('file',15)} Copy invitation link</button>`);}else toast('Invitation sent by email');await load(['users']);renderPage();return;}
 else if(formId==='password-form'){await post('/auth/password',raw);toast('Your password has been changed');}
else if(formId==='attendance-form'){
  const pupils=get('students').filter(s=>s.status==='active'&&(!S.attendanceClass||s.class_id===S.attendanceClass));
  const fd=new FormData(form);
  const records=pupils.map(p=>({student_id:p.id,date:S.attendanceDate,status:fd.get('a-'+p.id)||'',note:fd.get('n-'+p.id)||''})).filter(r=>r.status);
  if(!records.length)throw Error('Choose at least one pupil status before saving.');
  if(records.length>100)throw Error('Select a single class or smaller register; save at most 100 pupils at once.');
  const result=await post('/attendance',{records,notify_guardians:fd.has('notify_guardians')});
  const alerts=result.alert_results||{};
  const notice=fd.has('notify_guardians')?(' · Absence emails: '+(alerts.sent||0)+' accepted'+(alerts.not_sent||alerts.no_guardian_email?' · '+((alerts.not_sent||0)+(alerts.no_guardian_email||0))+' not delivered':'')+(alerts.already_attempted?' · '+alerts.already_attempted+' previously attempted':'') ):'';
  toast(result.count+' attendance entries saved'+notice,Boolean((alerts.not_sent||0)+(alerts.no_guardian_email||0)));
 }
 else if(formId==='settings-form'){const toSave={...raw,monthly_fee_pence:String(Math.round(Number(raw.monthly_fee_pounds)*100))};delete toSave.monthly_fee_pounds;for(const [key,value] of Object.entries(toSave))await post('/settings',{key,value});toast('School settings saved');}
 else if(formId==='automation-form'){await post('/settings',{key:'jumah_enabled',value:raw.jumah_enabled});await post('/settings',{key:'jumah_message',value:raw.jumah_message});toast('Jumu’ah reminder settings saved. Check the verified sender before enabling.');}
 close();if(S.studentId && ['student-form','homework-form','grade-homework-form','behaviour-form','payment-form','invoice-form'].includes(formId)){await navigate('students',{keepStudent:true});}else await navigate(refresh);
}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;try{if(a==='copy-invite'){const v=$('#invitation-url');await navigator.clipboard.writeText(v.value);toast('Invitation link copied');return;}await action(a,el);}catch(err){toast(err.message,true);console.error(err);}});
document.addEventListener('submit',async e=>{const form=e.target;if(!['auth-form','student-form','homework-form','grade-homework-form','behaviour-form','class-form','class-assignment-form','class-roster-form','admission-form','invoice-form','payment-form','announcement-form','message-form','event-form','quiz-form','invite-form','guardian-invite-form','edit-user-form','password-form','attendance-form','progress-report-form','settings-form','automation-form'].includes(form.getAttribute('id')))return;e.preventDefault();const button=form.querySelector('button[type=submit]');if(button?.disabled)return;if(button)button.disabled=true;try{await submitForm(form);}catch(err){toast(err.message,true);console.error(err);}finally{if(button)button.disabled=false;}});
document.addEventListener('input',e=>{if(e.target.closest('#homework-form')&&['verse_from','verse_to'].includes(e.target.name))updateSurahVerseLimits();if(e.target.name==='greeting_name'&&e.target.closest('#guardian-invite-form')){const preview=$('#guardian-invite-preview');if(preview)preview.textContent='Dear '+(e.target.value.trim()||'Parent')+',';}});
document.addEventListener('change',async e=>{const el=e.target;if(el.closest('#invoice-form'))updateInvoiceTargets();if(el.closest('#homework-form')&&(['surah_from','surah_to','verse_from','verse_to'].includes(el.name)))updateSurahVerseLimits();if(el.name==='type'&&el.closest('#homework-form')){const surah=['hifdh','murajaa'].includes(el.value);$('#surah-fields')?.classList.toggle('hide',!surah);$('#page-fields')?.classList.toggle('hide',surah);}if(el.dataset.date==='attendance'){S.attendanceDate=el.value;await navigate('attendance');}if(el.dataset.attendanceClass!==undefined){S.attendanceClass=el.value;renderPage();return;}if(el.dataset.classroomClass!==undefined){S.classroomClass=el.value;renderPage();return;}if(el.dataset.filter){S.filter=el.value;renderPage();}if(el.dataset.admission){try{
  const application=get('admissions').find(x=>x.id===el.dataset.admission);
  let classId='';
  if(el.value==='accepted'){
   if(!get('classes').length){
    toast('Create a class under Classes & enrolment before approving admissions.',true);
    el.value=application?.status||'new';return;
   }
   classId=await confirmDialog({title:'Accept & allocate pupil to class',message:'Accept '+(application?.child_name||'this applicant')+' and create their enrolled student profile?',details:'Choose a class to continue. Admission allocates a permanent registration number, links the guardian and automatically sends the family notification. No new pupil can remain unassigned.',actionLabel:'Accept & enrol pupil',tone:'info',classChoices:get('classes')});
   if(!classId){el.value=application?.status||'new';return;}
  }
  const result=await post('/admissions',{id:el.dataset.admission,status:el.value,...(classId?{class_id:classId}:{})},'PATCH');
  // The admission was committed by the server. Do not report a subsequent
  // email/status popup or page refresh issue as a failed enrolment.
  toast(result.enrolled?'Application accepted — pupil enrolled successfully':'Admission status updated');
  try{await navigate('admissions');}
  catch(refreshErr){console.warn('Admission saved; directory refresh failed',refreshErr);toast('Admission saved successfully. Refresh the directory to see the latest status.',false);}
  if(result.enrolled){
   try{invitationNotice(result,application?.guardian_name||'guardian');}
   catch(noticeErr){console.warn('Admission saved; confirmation dialog failed',noticeErr);toast('Pupil enrolled and guardian relationship saved. Check Parents & guardians for email status.',false);}
  }
 }catch(err){
  toast('Admission change was not completed: '+err.message,true);
  const application=get('admissions').find(x=>x.id===el.dataset.admission);
  if(application)el.value=application.status;
 }}});
let globalSearchTimer=null;
document.addEventListener('input',e=>{const el=e.target;if(el.closest('#invoice-form'))updateInvoiceTargets();if(el.id==='global-query'){clearTimeout(globalSearchTimer);globalSearchTimer=setTimeout(async()=>{const q=el.value.trim(),results=$('#global-results');if(!results)return;if(q.length<2){results.innerHTML=blank('Type at least two characters');return;}try{const r=await api('/search?q='+encodeURIComponent(q));results.innerHTML=`${r.students.map(s=>`<button class="quick-action" style="width:100%;margin:6px 0" data-action="search-open" data-page="students" data-id="${h(s.id)}">${ico('students',18)} ${h(s.first_name+' '+s.last_name)} · ${h(s.student_no)} · ${h(s.class_name||'Unassigned')}</button>`).join('')}${r.homework.map(w=>`<button class="quick-action" style="width:100%;margin:6px 0" data-action="search-open" data-page="homework">${ico('book',18)} ${h(cap(w.type))} · ${h(w.first_name+' '+w.last_name)} · ${fmt(w.due_date)}</button>`).join('')}${r.classes.map(c=>`<button class="quick-action" style="width:100%;margin:6px 0" data-action="search-open" data-page="classes">${ico('graduation',18)} ${h(c.name)} · ${h(c.stage)}</button>`).join('')}`||blank('No matching records');}catch(error){results.innerHTML=blank('Search unavailable',error.message);}},300);return;}if(el.dataset.search){const v=el.value;S.search=v;const pos=el.selectionStart;renderPage();const field=$('[data-search="'+el.dataset.search+'"]');if(field){field.focus();field.setSelectionRange(pos,pos);}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.modal-overlay')?.remove();});
// Correctly retain per-user quiz attempts returned alongside the current quiz feed.
const _load=load;load=async function(keys){await Promise.all(keys.map(async k=>{try{const data=await api('/'+k);S.data[k]=data.items||[];if(k==='quizzes')S.data.quizzes_attempts=data.attempts||[];}catch(err){S.data[k]=[];console.warn('Unable to load',k,err);}}));};
boot();