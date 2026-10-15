import { sessionActor,platformActor } from './auth-server';
import { writeStatements } from './persistence';
import { env } from 'cloudflare:workers';
import { collections, defaultSettings, emptyState, roleOf, type Actor, type LibraryState } from './domain';
export async function actorFrom(req:Request):Promise<Actor|null>{
 const user=await sessionActor(req);if(user)return user;
 const count=await env.DB!.prepare('SELECT count(*) n FROM auth_users').first<any>();
 return count?.n?null:platformActor(req);
}
export async function readLibrary(actor:Actor):Promise<LibraryState>{
 if(!env.DB)throw new Error('Banco de dados indisponível. Tente novamente em instantes.');
 await env.DB.prepare('INSERT OR IGNORE INTO library_meta (id,owner_id,revision,lock_token,settings) VALUES (?,?,?,?,?)').bind('grancont',actor.id,0,'',JSON.stringify(defaultSettings)).run();
 const results=await env.DB.batch([env.DB.prepare('SELECT * FROM library_meta WHERE id=?').bind('grancont'),env.DB.prepare('SELECT collection,data FROM library_records')]);
 const meta=results[0].results[0] as any;const s=emptyState(meta.owner_id);s.revision=meta.revision;s.settings={...defaultSettings,...JSON.parse(meta.settings)};
 for(const r of results[1].results as any[]){if(collections.includes(r.collection))s[r.collection as keyof Pick<LibraryState,typeof collections[number]>].push(JSON.parse(r.data));}
 s.activity.sort((a,b)=>b.at.localeCompare(a.at));return s;
}
export function visibleState(s:LibraryState,a:Actor){if(roleOf(s,a)==='admin')return s;return {...s,employees:s.employees.map(e=>({...e,email:e.id===a.employeeId||e.email.toLowerCase()===a.email.toLowerCase()?e.email:'',role:'reader'})),activity:[]};}
export async function persistLibrary(prev:LibraryState,next:LibraryState){
 const db=env.DB!;const statements=writeStatements(prev,next,crypto.randomUUID()).map(s=>db.prepare(s.sql).bind(...s.args));
 const results=await db.batch(statements);return results[0].meta.changes===1;
}
