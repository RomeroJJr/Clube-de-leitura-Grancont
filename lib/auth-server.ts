import {env} from 'cloudflare:workers';
import {normalizeLogin,passwordHash,randomToken,safeEqual,sha256} from './auth-crypto';
import type {Actor} from './domain';
const COOKIE='__Host-grancont_session';export const SESSION_HOURS=8;
export function platformActor(req:Request):Actor|null{const id=req.headers.get('oai-authenticated-user-id');if(!id)return null;let name=req.headers.get('oai-authenticated-user-full-name')||req.headers.get('oai-authenticated-user-email')?.split('@')[0]||'Proprietário';if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')try{name=decodeURIComponent(name);}catch{}return {id,email:req.headers.get('oai-authenticated-user-email')||'',name};}
export function cookieToken(req:Request){return (req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export const clearSessionCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function checkOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(req.url).origin)throw new Error('Solicitação de origem inválida.');}
export async function sessionActor(req:Request):Promise<Actor|null>{
 const token=cookieToken(req);if(!token||!/^[0-9a-f]{64}$/.test(token))return null;
 const row=await env.DB!.prepare('SELECT u.id,u.display_name,u.email,u.role,u.employee_id,u.username FROM auth_sessions s JOIN auth_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await sha256(token),Date.now()).first<any>();
 return row?{id:row.id,name:row.display_name,email:row.email,authRole:row.role,employeeId:row.employee_id,username:row.username}:null;
}
export async function createSession(userId:string){const token=randomToken(),now=Date.now();await env.DB!.batch([env.DB!.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(now),env.DB!.prepare('INSERT INTO auth_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token),userId,now+SESSION_HOURS*3600000,new Date().toISOString()),env.DB!.prepare('UPDATE auth_users SET last_login=? WHERE id=?').bind(new Date().toISOString(),userId)]);return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS*3600}`;}
export async function requireAdmin(req:Request){const actor=await sessionActor(req);if(!actor||actor.authRole!=='admin')throw new Error('Acesso restrito aos administradores.');return actor;}
export async function hashNewPassword(password:string){if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('A senha deve ter entre 10 e 128 caracteres.');if(!env.AUTH_PASSWORD_PEPPER)throw new Error('A autenticação ainda está sendo configurada.');const salt=randomToken();return {salt,hash:await passwordHash(password,salt,env.AUTH_PASSWORD_PEPPER)};}
export async function login(req:Request,username:string,password:string){
 if(typeof username!=='string'||username.length>100||typeof password!=='string'||password.length>128)throw new Error('Nome ou senha incorretos.');
 if(!env.AUTH_PASSWORD_PEPPER)throw new Error('A autenticação ainda está sendo configurada.');const name=normalizeLogin(username);const now=Date.now();const windowMs=15*60*1000;
 const keys=[{key:await sha256('account:'+name),limit:5},{key:await sha256('ip:'+(req.headers.get('cf-connecting-ip')||'private-access')),limit:25}];
 for(const k of keys){const a=await env.DB!.prepare('SELECT attempts,window_start FROM auth_attempts WHERE key=?').bind(k.key).first<any>();if(a&&now-a.window_start<windowMs&&a.attempts>=k.limit)throw new Error('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');}
 const user=await env.DB!.prepare('SELECT * FROM auth_users WHERE username=?').bind(name).first<any>();const actual=await passwordHash(password,user?.salt||'missing-account-fixed-comparison-salt',env.AUTH_PASSWORD_PEPPER);
 if(!user||!user.active||!safeEqual(actual,user.password_hash)){
  await env.DB!.batch(keys.map(k=>env.DB!.prepare('INSERT INTO auth_attempts (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END').bind(k.key,now,now-windowMs,now-windowMs)));
  throw new Error('Nome ou senha incorretos.');
 }
 await env.DB!.prepare('DELETE FROM auth_attempts WHERE key=?').bind(keys[0].key).run();return {cookie:await createSession(user.id),user:{id:user.id,name:user.display_name,username:user.username,role:user.role}};
}
export async function logout(req:Request){const token=cookieToken(req);if(token)await env.DB!.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await sha256(token)).run();return clearSessionCookie();}
