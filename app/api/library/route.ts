import { applyAction, roleOf } from '@/lib/domain';
import { actorFrom, readLibrary, persistLibrary, visibleState } from '@/lib/server-library';
export const dynamic='force-dynamic';
const response=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(req:Request){
 const actor=await actorFrom(req);if(!actor)return response({error:'Entre com sua conta para acessar a biblioteca.',localSignIn:true},401);
 try{const state=await readLibrary(actor);const role=roleOf(state,actor);if(!role)return response({error:'Seu acesso precisa ser autorizado pela administração.'},403);return response({state:visibleState(state,actor),user:{...actor,role}});}catch(e){console.error('Library read failed',e instanceof Error?e.message:'unknown');return response({error:'Não foi possível carregar a biblioteca. Tente novamente.'},503);}
}
export async function POST(req:Request){
 const actor=await actorFrom(req);if(!actor)return response({error:'Sessão encerrada. Entre novamente.'},401);
 if(req.headers.get('origin')&&new URL(req.headers.get('origin')!).origin!==new URL(req.url).origin)return response({error:'Origem inválida.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return response({error:'Formato de solicitação inválido.'},415);
 try{
  const text=await req.text();if(text.length>4_000_000)return response({error:'O arquivo ultrapassa o limite de 4 MB. Divida a importação.'},413);
  const input=JSON.parse(text),prev=await readLibrary(actor);if(!roleOf(prev,actor))return response({error:'Acesso não autorizado.'},403);
  if(!Number.isInteger(input.revision)||input.revision!==prev.revision)return response({error:'A biblioteca foi atualizada em outra sessão. Os dados foram recarregados; confira e tente novamente.',conflict:true},409);
  const next=applyAction(prev,input.action,actor);
  if(!await persistLibrary(prev,next))return response({error:'Outro registro foi salvo ao mesmo tempo. Atualize e tente novamente.',conflict:true},409);
  return response({state:visibleState(next,actor),message:next.activity[0].message});
 }catch(e:any){if(e.name==='ZodError')return response({error:e.issues.map((x:any)=>`${x.path.join('.')}: ${x.message}`).join(' · ')},400);return response({error:e instanceof SyntaxError?'JSON inválido. Revise o arquivo.':e.message||'Não foi possível salvar.'},400);}
}
