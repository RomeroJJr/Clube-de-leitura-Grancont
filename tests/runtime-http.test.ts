import test from "node:test";
import assert from "node:assert/strict";
import { createD1Client, createR2Client } from "../lib/runtime-http";

const config = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_D1_DATABASE_ID: "00000000-0000-4000-8000-000000000001",
  CLOUDFLARE_API_TOKEN: "test-only-token",
  R2_BUCKET_NAME: "test-covers",
  R2_ACCESS_KEY_ID: "test-only-key",
  R2_SECRET_ACCESS_KEY: "test-only-secret",
};

test("D1 sends parameterized operations in one transaction request", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const request = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Response.json({ success: true, result: [
      { success: true, results: [], meta: { changes: 1 } },
      { success: true, results: [{ revision: 9 }], meta: { changes: 0 } },
    ] });
  }) as typeof fetch;
  const db = createD1Client(config, request);
  const statement = db.prepare("UPDATE library_meta SET revision=? WHERE id=?");
  const result = await db.batch([statement.bind(9, "grancont"), db.prepare("SELECT revision FROM library_meta")]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\//);
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { batch: [
    { sql: statement.sql, params: [9, "grancont"] },
    { sql: "SELECT revision FROM library_meta", params: [] },
  ] });
  assert.deepEqual(statement.params, []);
  assert.equal(result[0].meta.changes, 1);
  assert.equal(result[1].results[0].revision, 9);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.redirect, "error");
});

test("D1 first handles values and an empty result", async () => {
  let rows: Record<string, unknown>[] = [{ n: 0, label: "" }];
  const request = (async () => Response.json({ success: true, result: [{ success: true, results: rows, meta: { changes: 0 } }] })) as typeof fetch;
  const db = createD1Client(config, request);
  assert.equal(await db.prepare("SELECT 0 AS n").first("n"), 0);
  assert.equal(await db.prepare("SELECT '' AS label").first("label"), "");
  rows = [];
  assert.equal(await db.prepare("SELECT id FROM auth_users").first(), null);
});

test("D1 fails closed without configuration and does not leak provider errors", async () => {
  let calls = 0;
  const request = (async () => { calls++; return Response.json({ success: false, errors: [{ message: "private record and SQL" }] }, { status: 403 }); }) as typeof fetch;
  await assert.rejects(createD1Client({}, request).prepare("SELECT 1").all(), /ainda não foi configurado/);
  assert.equal(calls, 0);
  await assert.rejects(createD1Client(config, request).prepare("SELECT 1").all(), error => {
    assert.equal((error as Error).message, "Não foi possível acessar o banco de dados. Tente novamente.");
    return true;
  });
  assert.equal(calls, 1);
});

test("D1 rejects partial batches and never automatically retries writes", async () => {
  let calls = 0;
  const request = (async () => { calls++; return Response.json({ success: true, result: [{ success: true, results: [], meta: {} }] }); }) as typeof fetch;
  const db = createD1Client(config, request);
  await assert.rejects(db.batch([db.prepare("UPDATE a SET n=1"), db.prepare("UPDATE b SET n=1")]));
  assert.equal(calls, 1);
  assert.throws(() => db.prepare("SELECT ?").bind(undefined));
});

test("R2 sends signed, private object requests and preserves content bytes", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const request = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("image", { headers: { "content-type": "image/png" } });
  }) as typeof fetch;
  const bucket = createR2Client(config, request);
  const key = "covers/00000000-0000-4000-8000-000000000001";
  const bytes = new TextEncoder().encode("image").buffer;
  await bucket.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
  const object = await bucket.get(key);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.body, bytes);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[1].init.method, "GET");
  assert.equal(object?.httpMetadata.contentType, "image/png");
  const headers = new Headers(calls[0].init.headers);
  assert.match(headers.get("Authorization")!, /^AWS4-HMAC-SHA256 Credential=test-only-key\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/);
  assert.equal(headers.get("Content-Type"), "image/png");
  assert.equal(calls[0].url, `https://${config.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/test-covers/${key}`);
  assert.equal(calls[0].init.redirect, "error");
  assert.ok(!JSON.stringify(calls).includes(config.R2_SECRET_ACCESS_KEY));
  await assert.rejects(bucket.get("../private"));
  assert.equal(calls.length, 2);
});

test("R2 returns null only for missing objects", async () => {
  let status = 404;
  const bucket = createR2Client(config, (async () => new Response(null, { status })) as typeof fetch);
  const key = "covers/00000000-0000-4000-8000-000000000001";
  assert.equal(await bucket.get(key), null);
  status = 403;
  await assert.rejects(bucket.get(key), /Não foi possível carregar/);
});

test("Node runtime reuses bindings when preparing and submitting a transaction", async () => {
  const originalFetch = globalThis.fetch;
  const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  let calls = 0;
  try {
    Object.assign(process.env, config);
    globalThis.fetch = (async () => {
      calls++;
      return Response.json({ success: true, result: [
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
      ] });
    }) as typeof fetch;
    const { env, TRUST_PLATFORM_AUTH } = await import("../lib/runtime-vercel");
    assert.equal(TRUST_PLATFORM_AUTH, false);
    assert.equal(env.TRANSITION_IMPORT_KEY, undefined);
    assert.equal(env.DB, env.DB);
    const result = await env.DB!.batch([
      env.DB!.prepare("DELETE FROM auth_sessions WHERE expires_at<?").bind(1),
      env.DB!.prepare("UPDATE auth_users SET last_login=? WHERE id=?").bind("2026-10-15", "test"),
    ]);
    assert.equal(calls, 1);
    assert.equal(result.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
