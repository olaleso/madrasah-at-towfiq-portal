// Public masjid content is deliberately separate from the madrasah's private events.
// An administrator may switch the entire Phase 1 experience off at any time.
// The data remains intact when disabled. No D1 migration is required.
export const COMMUNITY_KEY='masjid_phase1_community_v1';
export const COMMUNITY_LIMIT=40;

export const DEFAULT_COMMUNITY={enabled:false,items:[]};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const validTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const short=(value,max)=>String(value??'').trim().slice(0,max);
const hasMarkup=value=>/[<>]/.test(value);

export async function loadCommunity(db){
 const row=await db.prepare('SELECT value FROM school_settings WHERE key=?').bind(COMMUNITY_KEY).first();
 if(!row?.value)return {enabled:false,items:[]};
 const state=JSON.parse(row.value);
 if(typeof state!=='object'||state===null||!Array.isArray(state.items))throw Error('Invalid community content data');
 return {enabled:state.enabled===true,items:state.items.slice(0,COMMUNITY_LIMIT)};
}
export async function saveCommunity(db,state){
 const value=JSON.stringify({enabled:state.enabled===true,items:state.items.slice(0,COMMUNITY_LIMIT)});
 await db.prepare('INSERT INTO school_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
   .bind(COMMUNITY_KEY,value).run();
}
export function validateCommunityEntry(data,old,now=new Date()){
 const kind=data.kind==='event'?'event':data.kind==='announcement'?'announcement':null;
 if(!kind)throw Error('Choose Event or Announcement');
 const title=short(data.title,121),body=short(data.body,1201);
 if(title.length<5||title.length>120||body.length<10||body.length>1200)throw Error('Title or description is missing or too long');
 if(hasMarkup(title)||hasMarkup(body))throw Error('Remove HTML markup from public content');
 const event_date=kind==='event'?short(data.event_date,20):'';
 const event_time=kind==='event'?short(data.event_time,10):'';
 const location=kind==='event'?short(data.location,160):'';
 const expires_on=kind==='announcement'?short(data.expires_on,20):'';
 if(kind==='event'&&!validDate(event_date))throw Error('Enter a valid event date');
 if(event_time&&!validTime(event_time))throw Error('Use a 24-hour event time (HH:MM)');
 if(expires_on&&!validDate(expires_on))throw Error('Enter a valid announcement expiry date');
 if(hasMarkup(location))throw Error('Invalid event location');
 return {
  id:old?.id||crypto.randomUUID(),kind,title,body,event_date,event_time,location,expires_on,
  published:data.published===true,pinned:data.pinned===true,
  created_at:old?.created_at||now.toISOString(),updated_at:now.toISOString()
 };
}
export function londonDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=k=>parts.find(p=>p.type===k)?.value||'';
 return part('year')+'-'+part('month')+'-'+part('day');
}
export function publicCommunity(state,now=new Date()){
 if(!state.enabled)return {enabled:false,events:[],announcements:[]};
 const today=londonDay(now);
 const valid=state.items.filter(x=>x?.published===true);
 const events=valid.filter(x=>x.kind==='event'&&validDate(x.event_date)&&x.event_date>=today)
   .sort((a,b)=>(a.event_date+a.event_time).localeCompare(b.event_date+b.event_time)).slice(0,9);
 const announcements=valid.filter(x=>x.kind==='announcement'&&(!x.expires_on||x.expires_on>=today))
   .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,5);
 const clean=x=>({
  id:x.id,kind:x.kind,title:x.title,body:x.body,
  ...(x.kind==='event'?{event_date:x.event_date,event_time:x.event_time,location:x.location}:
    {expires_on:x.expires_on,pinned:x.pinned===true})
 });
 return {enabled:true,events:events.map(clean),announcements:announcements.map(clean)};
}
