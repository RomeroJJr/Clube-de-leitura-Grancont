import { env } from 'cloudflare:workers';
import { actorFrom, readLibrary } from '@/lib/server-library';
import { roleOf } from '@/lib/domain';
export async function POST(req:Request){
 const actor=await actorFrom(req);if(!actor)return Response.json({error:'Entre novamente.'},{status:401});
 if(req.headers.get('origin')&&new URL(req.headers.get('origin')!).origin!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{const state=await readLibrary(actor);if(roleOf(state,actor)!=='admin')return Response.json({error:'Acesso restrito à administração.'},{status:403});
 const bytes=await req.arrayBuffer();if(bytes.byteLength>3*1024*1024)return Response.json({error:'Use uma imagem de até 3 MB.'},{status:413});
 const b=new Uint8Array(bytes);let type='';if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)type='image/png';else if(b[0]===255&&b[1]===216&&b[2]===255)type='image/jpeg';else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')type='image/webp';
 if(!type)return Response.json({error:'Envie uma imagem PNG, JPEG ou WebP.'},{status:415});if(!env.BUCKET)throw new Error('Armazenamento indisponível.');
 const id=crypto.randomUUID();await env.BUCKET.put('covers/'+id,bytes,{httpMetadata:{contentType:type}});return Response.json({url:'/api/covers?id='+id});
 }catch{return Response.json({error:'Não foi possível enviar a capa. Tente novamente.'},{status:500});}
}
export async function GET(req:Request){
 const actor=await actorFrom(req);if(!actor)return new Response(null,{status:401});const s=await readLibrary(actor);if(!roleOf(s,actor))return new Response(null,{status:403});
 const id=new URL(req.url).searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:400});const object=await env.BUCKET?.get('covers/'+id);if(!object)return new Response(null,{status:404});return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
