type Config = Record<string, string | undefined>;
type Param = string | number | null;
type Query = { sql: string; params: Param[] };
type Result<T = Record<string, unknown>> = { success: boolean; results: T[]; meta: { changes: number } };

/** Server-only transport. The Edge Function authenticates this server and
 * executes an explicit query allowlist in one PostgreSQL transaction per batch. */
export function createSupabaseRuntime(config: Config, request: typeof fetch = fetch) {
  async function call(path: string, init: RequestInit) {
    const base = config.GRANCONT_BACKEND_URL;
    const key = config.GRANCONT_BACKEND_KEY;
    if (!base || !/^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/grancont-backend$/.test(base) ||
        !key || !/^[a-f0-9]{64}$/.test(key)) {
      throw new Error("O serviço de dados ainda não foi configurado nesta hospedagem.");
    }
    return request(base + path, {
      ...init,
      headers: { ...init.headers, "X-Grancont-Key": key },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25_000),
    });
  }
  async function query(batch: Query[]): Promise<Result[]> {
    const response = await call("/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch }) });
    const data = await response.json().catch(() => null) as { success?: boolean; result?: Result[] } | null;
    if (!response.ok || !data?.success || !Array.isArray(data.result) || data.result.length !== batch.length ||
        data.result.some((r: Result) => !r.success || !Array.isArray(r.results) || !Number.isInteger(r.meta?.changes))) {
      throw new Error("Não foi possível acessar o banco de dados. Tente novamente.");
    }
    return data.result;
  }
  class Statement {
    constructor(readonly sql: string, readonly params: Param[] = []) {}
    bind(...values: unknown[]) {
      if (values.some(v => v !== null && typeof v !== "string" && (typeof v !== "number" || !Number.isFinite(v)))) {
        throw new Error("Parâmetro de banco de dados inválido.");
      }
      return new Statement(this.sql, values as Param[]);
    }
    async all<T = Record<string, unknown>>() { return (await query([this]))[0] as Result<T>; }
    async run<T = Record<string, unknown>>() { return this.all<T>(); }
    async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
      const row = (await this.all()).results[0];
      if (!row) return null;
      if (column && !(column in row)) throw new Error("Coluna não encontrada.");
      return (column ? row[column] : row) as T;
    }
  }
  const validKey = (key: string) => {
    if (!/^covers\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key)) throw new Error("Capa inválida.");
    return "/" + key;
  };
  return {
    DB: {
      prepare(sql: string) { return new Statement(sql); },
      async batch<T = Record<string, unknown>>(statements: Statement[]) {
        if (!statements.every(s => s instanceof Statement)) throw new Error("Lote de banco inválido.");
        return statements.length ? query(statements) as Promise<Result<T>[]> : [];
      },
    },
    BUCKET: {
      async get(key: string) {
        const response = await call(validKey(key), { method: "GET" });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Não foi possível carregar a capa.");
        return { body: response.body, httpMetadata: { contentType: response.headers.get("content-type") || "image/jpeg" } };
      },
      async put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
        const response = await call(validKey(key), { method: "PUT", body, headers: { "Content-Type": options?.httpMetadata?.contentType || "application/octet-stream" } });
        if (!response.ok) throw new Error("Não foi possível salvar a capa.");
        return { key };
      },
    },
  };
}
