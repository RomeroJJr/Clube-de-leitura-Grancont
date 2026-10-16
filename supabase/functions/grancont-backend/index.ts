import postgres from "npm:postgres@3.4.3";
import { compileQuery } from "../../../lib/postgres-queries.ts";

// The platform JWT check is disabled only because this function verifies a
// separate, server-only 256-bit key. Never expose that key in browser code.
const db = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
class Denied extends Error {}
async function authorized<T>(hash: string, work: (tx: postgres.TransactionSql) => Promise<T>, readOnly = false) {
  return await db.begin(async tx => {
    if (readOnly) await tx`set transaction isolation level repeatable read, read only`;
    await tx`set local role grancont_runtime`;
    await tx`set local search_path = grancont, pg_catalog`;
    await tx`set local statement_timeout = '15s'`;
    const allowed = await tx`select 1 from grancont.gateway_keys where key_hash = ${hash} and active = true`;
    if (!allowed.length) throw new Denied();
    return await work(tx);
  });
}
async function limitedBody(req: Request, max: number) {
  if (Number(req.headers.get("content-length")) > max) throw new RangeError();
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > max) { await reader.cancel(); throw new RangeError(); }
    chunks.push(value);
  }
  const body = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}
function imageType(bytes: Uint8Array) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
Deno.serve(async req => {
  const key = req.headers.get("x-grancont-key") || "";
  if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: "Unauthorized" }, 401);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  try {
    const path = new URL(req.url).pathname.replace(/^.*\/grancont-backend/, "");
    if (path === "/query" && req.method === "POST") {
      const text = new TextDecoder().decode(await limitedBody(req, 10 * 1024 * 1024));
      let queries;
      try {
        const { batch } = JSON.parse(text);
        if (!Array.isArray(batch) || !batch.length || batch.length > 5000) return json({ error: "Invalid batch" }, 400);
        queries = batch.map(compileQuery);
      } catch { return json({ error: "Invalid batch" }, 400); }
      const result = await authorized(hash, async tx => {
        const results = [];
        for (const query of queries) {
          // query.sql is compiled from the fixed allowlist, never raw request SQL.
          const rows = await tx.unsafe(query.sql, query.params);
          results.push({ success: true, results: [...rows], meta: { changes: rows.command === "SELECT" ? 0 : rows.count } });
        }
        return results;
      }, queries.every(query => query.sql.startsWith("SELECT")));
      return json({ success: true, result });
    }
    if (/^\/covers\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(path) && ["GET", "PUT", "DELETE"].includes(req.method)) {
      await authorized(hash, async () => true);
      const secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!secret) throw new Error("Missing storage configuration");
      const headers: Record<string, string> = { apikey: secret };
      if (!secret.startsWith("sb_secret_")) headers.Authorization = `Bearer ${secret}`;
      let body: Uint8Array | undefined;
      if (req.method === "PUT") {
        body = await limitedBody(req, 3 * 1024 * 1024);
        const type = imageType(body); if (!type) return json({ error: "Invalid image" }, 415);
        headers["Content-Type"] = type;
        headers["x-upsert"] = "true";
      }
      const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/grancont-covers${path}`, {
        method: req.method === "PUT" ? "POST" : req.method, headers, body,
        redirect: "error", signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (req.method === "GET" && (response.status === 404 || error.error === "not_found" || error.message === "Object not found")) return new Response(null, { status: 404 });
        throw new Error("Storage request failed");
      }
      if (req.method !== "GET") { await response.body?.cancel(); return json({ success: true }); }
      return new Response(response.body, { headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof Denied) return json({ error: "Unauthorized" }, 401);
    if (error instanceof RangeError) return json({ error: "Request too large" }, 413);
    // Never log SQL, credentials, record contents or storage credentials.
    console.error("Grancont backend request failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Service unavailable" }, 503);
  }
});
