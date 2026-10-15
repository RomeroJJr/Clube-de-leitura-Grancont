declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AUTH_PASSWORD_PEPPER?: string;
    TRANSITION_IMPORT_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
