import { createHash, createHmac } from "node:crypto";

type Config = Record<string, string | undefined>;
type Param = string | number | null;
type Query = { sql: string; params: Param[] };
type QueryResult<T = Record<string, unknown>> = {
  results: T[];
  success: boolean;
  meta: { changes: number; [key: string]: unknown };
};

function required(config: Config, keys: string[]) {
  if (keys.some(key => !config[key])) {
    throw new Error("O serviço de dados ainda não foi configurado nesta hospedagem.");
  }
}

export function createD1Client(config: Config, request: typeof fetch = fetch) {
  async function query(queries: Query[]): Promise<QueryResult[]> {
    required(config, ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_API_TOKEN"]);
    const account = config.CLOUDFLARE_ACCOUNT_ID!;
    const database = config.CLOUDFLARE_D1_DATABASE_ID!;
    if (!/^[a-f0-9]{32}$/i.test(account) || !/^[a-f0-9-]{36}$/i.test(database)) {
      throw new Error("A configuração do banco de dados é inválida.");
    }
    // One API batch preserves D1 transaction semantics. Never fan out writes or
    // retry an ambiguous timeout: that could duplicate an operation.
    const response = await request(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ batch: queries }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => null) as { success?: boolean; result?: QueryResult[] } | null;
    if (!response.ok || !data?.success || !Array.isArray(data.result) ||
        data.result.length !== queries.length || data.result.some((r: QueryResult) => !r.success)) {
      // Provider errors can include SQL and record values; never expose them.
      throw new Error("Não foi possível acessar o banco de dados. Tente novamente.");
    }
    return data.result.map((r: QueryResult) => ({ ...r, results: r.results ?? [], meta: { ...r.meta, changes: r.meta?.changes ?? 0 } }));
  }

  class Statement {
    constructor(readonly sql: string, readonly params: Param[] = []) {}
    bind(...values: unknown[]) {
      if (values.some(v => v !== null && typeof v !== "string" && (typeof v !== "number" || !Number.isFinite(v)))) {
        throw new Error("Parâmetro de banco de dados inválido.");
      }
      return new Statement(this.sql, values as Param[]);
    }
    async all<T = Record<string, unknown>>() { return (await query([this]))[0] as QueryResult<T>; }
    async run<T = Record<string, unknown>>() { return this.all<T>(); }
    async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
      const row = (await this.all<Record<string, unknown>>()).results[0];
      if (!row) return null;
      if (column && !(column in row)) throw new Error("Coluna não encontrada.");
      return (column ? row[column] : row) as T;
    }
  }

  return {
    prepare(sql: string) { return new Statement(sql); },
    async batch<T = Record<string, unknown>>(statements: Statement[]) {
      if (!statements.every(s => s instanceof Statement)) throw new Error("Lote de banco inválido.");
      if (!statements.length) return [];
      return query(statements) as Promise<QueryResult<T>[]>;
    },
  };
}

const hash = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Uint8Array, value: string) => createHmac("sha256", key).update(value).digest();

export function createR2Client(config: Config, request: typeof fetch = fetch) {
  async function objectRequest(key: string, method: "GET" | "PUT", body?: ArrayBuffer, contentType?: string) {
    required(config, ["CLOUDFLARE_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
    if (!/^[a-f0-9]{32}$/i.test(config.CLOUDFLARE_ACCOUNT_ID!) ||
        !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.R2_BUCKET_NAME!) ||
        !/^covers\/[a-f0-9-]{36}$/.test(key)) {
      throw new Error("A configuração de armazenamento ou a capa é inválida.");
    }
    const host = `${config.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const path = `/${config.R2_BUCKET_NAME}/${key}`;
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const date = timestamp.slice(0, 8);
    const digest = hash(body ? new Uint8Array(body) : "");
    const scope = `${date}/auto/s3/aws4_request`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonical = [method, path, "", `host:${host}\nx-amz-content-sha256:${digest}\nx-amz-date:${timestamp}\n`, signedHeaders, digest].join("\n");
    const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.R2_SECRET_ACCESS_KEY}`, date), "auto"), "s3"), "aws4_request");
    const signature = hmac(signingKey, `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${hash(canonical)}`).toString("hex");
    return request(`https://${host}${path}`, {
      method,
      body,
      headers: {
        Authorization: `AWS4-HMAC-SHA256 Credential=${config.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        "x-amz-date": timestamp,
        "x-amz-content-sha256": digest,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
    });
  }
  return {
    async get(key: string) {
      const response = await objectRequest(key, "GET");
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Não foi possível carregar a capa.");
      return { body: response.body, httpMetadata: { contentType: response.headers.get("content-type") ?? "application/octet-stream" } };
    },
    async put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
      const response = await objectRequest(key, "PUT", body, options?.httpMetadata?.contentType);
      if (!response.ok) throw new Error("Não foi possível salvar a capa.");
      return { key };
    },
  };
}
