/* Persistent local SQLite preview. Demo server only; not suitable for public exposure. Node 22+. */
import fs from 'node:fs';
import {resolve, relative, isAbsolute, join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/worker.js';
// fileURLToPath handles Windows drive letters and spaces correctly; URL.pathname does not.
const root=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
if(!fs.existsSync(resolve(root,'index.html')))throw new Error(`Portal homepage not found in ${root}. Please extract the entire ZIP before running preview.`);
// Save the local preview outside the extracted project. New ZIP versions can
// therefore reuse the same accounts, students and sessions without importing data.
// AT_TOWFIQ_DATA_DIR overrides the storage folder (e.g. for test isolation).
const base=process.env.AT_TOWFIQ_DATA_DIR || join(
 process.env.LOCALAPPDATA || process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'),
 'MadrasahAtTowfiq'
);
fs.mkdirSync(base,{recursive:true,mode:0o700});
const databasePath=join(base,'portal-preview.sqlite');
const sqlite=new DatabaseSync(databasePath);
sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
// Versioned, transactional upgrades preserve data on subsequent releases.
// These are schema migrations, NOT a database reset.
const schemaVersion=sqlite.prepare('PRAGMA user_version').get().user_version;
if(schemaVersion>2) throw new Error(`This portal build cannot open newer database schema version ${schemaVersion}.`);
if(schemaVersion<2){
 sqlite.exec('BEGIN IMMEDIATE;');
 try {
  if(schemaVersion<1){
   sqlite.exec(fs.readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));
   sqlite.exec('PRAGMA user_version=1;');
  }
  if(schemaVersion<2){
   sqlite.exec(fs.readFileSync(new URL('../migrations/0002_expanded_admissions.sql',import.meta.url),'utf8'));
   sqlite.exec('PRAGMA user_version=2;');
  }
  sqlite.exec('COMMIT;');
 }catch(err){ sqlite.exec('ROLLBACK;'); sqlite.close(); throw err; }
}

const DB={prepare(sql){const stmt=sqlite.prepare(sql);return {bind(...params){return {first(){return stmt.get(...params)||null;},all(){return{results:stmt.all(...params)};},run(){return stmt.run(...params);}};}};}};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const ASSETS={async fetch(req){
 let requested;
 try { requested=decodeURIComponent(new URL(req.url).pathname); }
 catch { return new Response('Invalid URL',{status:400}); }
 const target=requested==='/'?'index.html':requested.replace(/^\/+/, '');
 const safe=resolve(root,target);
 const rel=relative(root,safe);
 if(rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))return new Response('Not found',{status:404});
 try {
  const data=fs.readFileSync(safe);
  const ext=safe.slice(safe.lastIndexOf('.'));
  return new Response(data,{headers:{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store'}});
 } catch {return new Response('Not found',{status:404});}
}};
const SETUP_KEY=crypto.randomBytes(24).toString('hex');
const env={DB,ASSETS,SETUP_KEY,EMAIL_FROM:'notifications@example.org',SCHOOL_NAME:'Madrasah At-Towfiq'};
const port=Number(process.env.PORT || 8787);
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const request=new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),duplex:'half'});const reply=await worker.fetch(request,env);res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));}catch(err){console.error(err);res.writeHead(500);res.end('Local preview error');}}).listen(port,'127.0.0.1',()=>{
 console.log('\nMadrasah At-Towfiq — PERSISTENT LOCAL PREVIEW');
 console.log(`Open http://127.0.0.1:${port}/`);
 console.log(`Local data: ${databasePath}`);
 const admins=sqlite.prepare("SELECT COUNT(*) AS total FROM users WHERE role='admin'").get().total;
 if(admins) console.log('Existing administrator found. Sign in using your original email and password.');
 else console.log(`First-run setup key: ${SETUP_KEY}`);
 console.log('CTRL+C to stop. LOCAL TEST ONLY; do not enter real pupil information.\n');
});