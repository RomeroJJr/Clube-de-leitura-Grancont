import { createD1Client, createR2Client } from "./runtime-http";

// Server-only configuration, read lazily so builds never query production data.
export const TRUST_PLATFORM_AUTH = false;
// Bindings must retain identity: callers prepare statements through env.DB
// and submit them through a later env.DB access in the same transaction.
const database = createD1Client(process.env);
const bucket = createR2Client(process.env);
export const env: Cloudflare.Env = {
  DB: database as unknown as D1Database,
  BUCKET: bucket as unknown as R2Bucket,
  get AUTH_PASSWORD_PEPPER() { return process.env.AUTH_PASSWORD_PEPPER; },
  // The one-time Sites migration endpoint stays disabled on external hosting.
  get TRANSITION_IMPORT_KEY() { return undefined; },
};
