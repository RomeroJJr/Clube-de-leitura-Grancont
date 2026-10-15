import { createD1Client, createR2Client } from "./runtime-http";

// Server-only configuration, read lazily so builds never query production data.
export const TRUST_PLATFORM_AUTH = false;
export const env: Cloudflare.Env = {
  get DB() {
    return createD1Client(process.env) as unknown as D1Database;
  },
  get BUCKET() {
    return createR2Client(process.env) as unknown as R2Bucket;
  },
  get AUTH_PASSWORD_PEPPER() { return process.env.AUTH_PASSWORD_PEPPER; },
  // The one-time Sites migration endpoint stays disabled on external hosting.
  get TRANSITION_IMPORT_KEY() { return undefined; },
};
