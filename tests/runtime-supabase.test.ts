import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSupabaseRuntime} from '../lib/runtime-supabase';
import {applicationQueries,compileQuery} from '../lib/postgres-queries';

const config={GRANCONT_BACKEND_URL:'https://testproject.supabase.co/functions/v1/grancont-backend',GRANCONT_BACKEND_KEY:'1'.repeat(64)};
test('the allowlist covers application queries and rejects arbitrary SQL and malformed parameters',()=>{
  const files=['lib/auth-server.ts','lib/server-library.ts','lib/persistence.ts','app/api/admin/route.ts','app/api/auth/route.ts'];
  for(const file of files)for(const m of readFileSync(file,'utf8').matchAll(/(?:prepare\(|sql:)\s*'([^']+)'/g)){
    assert.ok((applicationQueries as readonly string[]).includes(m[1]),`Missing query in ${file}`);
    const query=compileQuery({sql:m[1],params:Array((m[1].match(/\?/g)||[]).length).fill('value')});
    assert.equal(query.sql.includes('?'),false);
  }
  assert.throws(()=>compileQuery({sql:'SELECT * FROM grancont.gateway_keys',params:[]}));
  assert.throws(()=>compileQuery({sql:applicationQueries[0],params:[]}));
  assert.throws(()=>compileQuery({sql:applicationQueries[0],params:[{},NaN]}));
});
test('one request preserves batch order, change counts and bindings, with no retry',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];
  const {DB}=createSupabaseRuntime(config,async(url,init)=>{
    calls.push({url:String(url),init:init!});
    return Response.json({success:true,result:[{success:true,results:[],meta:{changes:1}},{success:true,results:[],meta:{changes:0}}]});
  });
  const result=await DB.batch([DB.prepare('UPDATE x SET value=?').bind(1),DB.prepare('DELETE FROM x WHERE value=?').bind(2)]);
  assert.deepEqual(result.map(r=>r.meta.changes),[1,0]);assert.equal(calls.length,1);
  assert.equal(calls[0].init.redirect,'error');assert.equal(calls[0].init.cache,'no-store');
  assert.deepEqual(JSON.parse(String(calls[0].init.body)).batch.map((q:any)=>q.params),[[1],[2]]);
  const other=createSupabaseRuntime(config).DB;
  await assert.rejects(DB.batch([other.prepare('SELECT 1')]),/Lote/);
  assert.throws(()=>DB.prepare('x').bind(Infinity),/Parâmetro/);
});
test('provider error details are hidden and missing configuration never sends credentials',async()=>{
  let calls=0;
  const request:typeof fetch=async()=>{calls++;return Response.json({error:'secret SQL record'},{status:503});};
  await assert.rejects(createSupabaseRuntime(config,request).DB.prepare('x').all(),/Não foi possível acessar/);
  assert.equal(calls,1);
  await assert.rejects(createSupabaseRuntime({...config,GRANCONT_BACKEND_URL:'https://attacker.example'},request).DB.prepare('x').all(),/configurado/);
  assert.equal(calls,1);
});
test('private cover storage validates paths and preserves image metadata',async()=>{
  const {BUCKET}=createSupabaseRuntime(config,async()=>new Response(new Uint8Array([1,2]),{headers:{'Content-Type':'image/png'}}));
  await assert.rejects(BUCKET.get('covers/../secret'),/inválida/);
  const cover=await BUCKET.get('covers/11111111-1111-4111-8111-111111111111');
  assert.equal(cover?.httpMetadata.contentType,'image/png');
  const missing=createSupabaseRuntime(config,async()=>new Response(null,{status:404}));
  assert.equal(await missing.BUCKET.get('covers/11111111-1111-4111-8111-111111111111'),null);
});
