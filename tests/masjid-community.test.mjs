import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMUNITY_KEY, loadCommunity,saveCommunity,validateCommunityEntry,publicCommunity,londonDay
} from '../src/masjid-community.mjs';

// Minimal school_settings-shaped D1 mock. No private student data is accessed.
function memoryDb(){
 const map=new Map();
 return {
  prepare(query){
   return {bind(...args){return {
    async first(){assert.match(query,/SELECT value FROM school_settings/);return map.has(args[0])?{value:map.get(args[0])}:null;},
    async run(){assert.match(query,/INSERT INTO school_settings/);map.set(args[0],args[1]);return {success:true};}
   };}};
  },
  get:key=>map.get(key)
 };
}
test('Phase 1 is off on a fresh or missing database setting',async()=>{
 const db=memoryDb();
 assert.deepEqual(await loadCommunity(db),{enabled:false,items:[]});
 assert.deepEqual(publicCommunity(await loadCommunity(db),new Date('2026-10-31T12:00:00Z')),
   {enabled:false,events:[],announcements:[]});
});
test('Events and notices appear only when explicitly enabled and published',async()=>{
 const db=memoryDb(),now=new Date('2026-10-31T12:00:00Z');
 const upcoming=validateCommunityEntry({kind:'event',title:'Community Lecture',body:'Confirmed beneficial talk at the masjid',event_date:'2026-11-03',event_time:'18:30',location:'Main prayer hall',published:true},null,now);
 const expired=validateCommunityEntry({kind:'event',title:'Previous Gathering',body:'This event took place earlier this month',event_date:'2026-10-01',published:true},null,now);
 const notice=validateCommunityEntry({kind:'announcement',title:'Important Notice',body:'Updated visitor information for the community',published:true,pinned:true,expires_on:'2026-11-20'},null,now);
 const privateItem=validateCommunityEntry({kind:'announcement',title:'Private Draft',body:'This entry must never appear publicly',published:false},null,now);
 const state={enabled:false,items:[upcoming,expired,notice,privateItem]};
 await saveCommunity(db,state);
 assert.ok(db.get(COMMUNITY_KEY));
 assert.deepEqual(publicCommunity(await loadCommunity(db),now).events,[]);
 state.enabled=true;
 await saveCommunity(db,state);
 const result=publicCommunity(await loadCommunity(db),now);
 assert.equal(result.enabled,true);
 assert.deepEqual(result.events.map(x=>x.title),['Community Lecture']);
 assert.deepEqual(result.announcements.map(x=>x.title),['Important Notice']);
 assert.equal(result.events[0].event_time,'18:30');
 state.enabled=false;await saveCommunity(db,state);
 assert.equal((await loadCommunity(db)).items.length,4,'Instant rollback preserves all draft and published records');
 assert.equal(publicCommunity(await loadCommunity(db),now).enabled,false);
});
test('Bad public dates and HTML markup cannot be saved',()=>{
 assert.throws(()=>validateCommunityEntry({kind:'event',title:'Community Event',body:'Confirmed details provided here',event_date:'2026-02-30'},null),/valid event date/);
 assert.throws(()=>validateCommunityEntry({kind:'announcement',title:'<script>alert(1)</script>',body:'A valid notice message'},null),/HTML|Title/);
 assert.throws(()=>validateCommunityEntry({kind:'event',title:'Prayer Class',body:'A confirmed public class event',event_date:'2026-11-04',event_time:'26:30'},null),/24-hour/);
});
test('UK local date is used for public event cutoffs',()=>{
 assert.equal(londonDay(new Date('2026-10-31T23:30:00Z')),'2026-10-31');
 assert.equal(londonDay(new Date('2026-07-01T23:30:00Z')),'2026-07-02');
});
