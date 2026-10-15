import {env} from '@/lib/runtime-env';
import {safeEqual,sha256,normalizeLogin} from '@/lib/auth-crypto';
import {hashNewPassword} from '@/lib/auth-server';
import {convertLegacyExport} from '@/lib/legacy-import';
import {applyAction,type Actor} from '@/lib/domain';
import {readLibrary} from '@/lib/server-library';
import {writeStatements} from '@/lib/persistence';
const RUN='grancont-transition-2026-10-14';
const SOURCE_HASH='e3a928e8ff593032649dff1da913a4783fd0105002ba0c37cebddf2e399aeb05';
const reply=(d:any,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 if(!env.TRANSITION_IMPORT_KEY||!safeEqual(req.headers.get('x-grancont-transition')||'',env.TRANSITION_IMPORT_KEY))return reply({error:'Operação não autorizada.'},403);
 try{
  const previous=await env.DB!.prepare('SELECT summary,applied_at FROM migration_runs WHERE id=?').bind(RUN).first<any>();if(previous)return reply({ok:true,alreadyApplied:true,summary:JSON.parse(previous.summary),appliedAt:previous.applied_at});
  const text=await req.text();if(text.length>200000)return reply({error:'Arquivo excede o limite desta migração.'},413);const input=JSON.parse(text);if(typeof input.sourceText!=='string'||await sha256(input.sourceText)!==SOURCE_HASH)throw new Error('O arquivo não corresponde ao banco autorizado para a transição.');
  const raw=JSON.parse(input.sourceText);const {data,summary}=convertLegacyExport(raw);const meta=await env.DB!.prepare('SELECT owner_id FROM library_meta WHERE id=?').bind('grancont').first<any>();if(!meta)throw new Error('A biblioteca precisa ser inicializada pelo proprietário.');
  if(!Array.isArray(input.accounts)||input.accounts.length!==2)throw new Error('São necessários os dois acessos autorizados.');
  const adminActor:Actor={id:'service:authorized-transition',name:'Migração autorizada · Grancont',email:'',authRole:'admin'};const prev=await readLibrary(adminActor);const next=applyAction(prev,{type:'import',data},adminActor);const token=crypto.randomUUID();const now=new Date().toISOString();
  const romero=next.employees.find(e=>e.id==='mt06x425z33pu');if(!romero)throw new Error('Cadastro de Romero não encontrado.');romero.role='admin';
  const specs=[{id:'admin-romero',username:'romero',displayName:'Romero Júnior',employeeId:romero.id,email:romero.email,platformId:meta.owner_id},{id:'admin-ana-beatriz',username:'ana beatriz',displayName:'Ana Beatriz',employeeId:'',email:'',platformId:null}];
  const statements=writeStatements(prev,next,token);
  for(const spec of specs){const inputAccount=input.accounts.find((a:any)=>normalizeLogin(a.username)===spec.username);if(!inputAccount)throw new Error('Um dos nomes de acesso está ausente.');const p=await hashNewPassword(inputAccount.password);statements.push({sql:'INSERT INTO auth_users (id,username,display_name,employee_id,email,role,salt,password_hash,active,platform_user_id,created_at,password_changed_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)',args:[spec.id,spec.username,spec.displayName,spec.employeeId,spec.email,'admin',p.salt,p.hash,1,spec.platformId as any,now,now,'grancont',token]});}
  statements.push({sql:'INSERT INTO migration_runs (id,source_hash,summary,applied_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)',args:[RUN,SOURCE_HASH,JSON.stringify(summary),now,'grancont',token]});
  const result=await env.DB!.batch(statements.map(x=>env.DB!.prepare(x.sql).bind(...x.args)));if(result[0].meta.changes!==1)return reply({error:'A biblioteca mudou durante a transição. Tente novamente.',conflict:true},409);
  return reply({ok:true,summary,accounts:specs.map(s=>({username:s.username,name:s.displayName})),appliedAt:now});
 }catch(e:any){return reply({error:e.name==='ZodError'?e.issues.map((i:any)=>i.path.join('.')+': '+i.message).join('; '):e.message||'Falha na migração.'},400);}
}
