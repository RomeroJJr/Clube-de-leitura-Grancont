// Explicit server-side allowlist. Incoming SQL is never executed directly.
export const applicationQueries = [
  "SELECT u.id,u.display_name,u.email,u.role,u.employee_id,u.username FROM auth_sessions s JOIN auth_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
  "DELETE FROM auth_sessions WHERE expires_at<?",
  "INSERT INTO auth_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)",
  "UPDATE auth_users SET last_login=? WHERE id=?",
  "SELECT attempts,window_start FROM auth_attempts WHERE key=?",
  "SELECT * FROM auth_users WHERE username=?",
  "INSERT INTO auth_attempts (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END, window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END",
  "DELETE FROM auth_attempts WHERE key=?",
  "DELETE FROM auth_sessions WHERE token_hash=?",
  "SELECT count(*) n FROM auth_users",
  "INSERT OR IGNORE INTO library_meta (id,owner_id,revision,lock_token,settings) VALUES (?,?,?,?,?)",
  "SELECT * FROM library_meta WHERE id=?",
  "SELECT collection,data FROM library_records",
  "UPDATE library_meta SET revision=?,lock_token=?,settings=? WHERE id=? AND revision=?",
  "INSERT INTO library_records (collection,id,data) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data",
  "DELETE FROM library_records WHERE collection=? AND id=? AND EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)",
  "SELECT u.id,u.username,u.display_name,u.email,u.employee_id,u.role,u.active,u.created_at,u.last_login,u.password_changed_at,(SELECT count(*) FROM auth_sessions s WHERE s.user_id=u.id AND s.expires_at>?) sessions FROM auth_users u ORDER BY u.created_at",
  "SELECT id,summary,applied_at FROM migration_runs ORDER BY applied_at DESC",
  "SELECT * FROM auth_users WHERE id=?",
  "SELECT id FROM auth_users WHERE employee_id=? AND id<>?",
  "SELECT id FROM auth_users WHERE username=? AND id<>?",
  "UPDATE auth_users SET username=?,display_name=?,email=?,employee_id=?,role=?,active=? WHERE id=? AND EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)",
  "DELETE FROM auth_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)",
  "INSERT INTO auth_users (id,username,display_name,email,employee_id,role,active,salt,password_hash,created_at,password_changed_at) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)",
  "SELECT id,display_name FROM auth_users WHERE id=?",
  "UPDATE auth_users SET salt=?,password_hash=?,password_changed_at=? WHERE id=? AND EXISTS (SELECT 1 FROM library_meta WHERE id=? AND lock_token=?)",
  "SELECT id FROM auth_users WHERE platform_user_id=? AND active=1",
  "UPDATE auth_users SET salt=?,password_hash=?,password_changed_at=? WHERE id=?",
  "DELETE FROM auth_sessions WHERE user_id=?"
] as const;

const normalize = (sql: string) => sql.trim().replace(/\s+/g, " ");
function postgresQuery(sql: string) {
  let result = sql.replace("INSERT OR IGNORE INTO", "INSERT INTO");
  if (sql.startsWith("INSERT OR IGNORE")) result += " ON CONFLICT (id) DO NOTHING";
  result = result.replaceAll("count(*)", "count(*)::integer");
  if (sql.startsWith("INSERT INTO auth_attempts")) {
    result = result.replaceAll("WHEN window_start", "WHEN auth_attempts.window_start")
      .replace("ELSE attempts+1", "ELSE auth_attempts.attempts+1")
      .replace("ELSE window_start END", "ELSE auth_attempts.window_start END");
  }
  let index = 0;
  result = result.replace(/\?/g, () => "$" + (++index));
  // INSERT ... SELECT otherwise resolves untyped PostgreSQL parameters as text.
  if (sql.startsWith("INSERT INTO auth_users")) result = result.replace("$7,", "$7::integer,");
  return { sql: result, parameterCount: index };
}
const allowed = new Map(applicationQueries.map(sql => [normalize(sql), postgresQuery(sql)]));
export type DatabaseQuery = { sql: string; params: (string | number | null)[] };
export function compileQuery(value: unknown): DatabaseQuery {
  if (!value || typeof value !== "object") throw new Error("Invalid query");
  const query = value as DatabaseQuery;
  if (typeof query.sql !== "string") throw new Error("Invalid query");
  const compiled = allowed.get(normalize(query.sql));
  if (!compiled || !Array.isArray(query.params) || query.params.length !== compiled.parameterCount ||
      query.params.some(v => v !== null && typeof v !== "string" && (typeof v !== "number" || !Number.isFinite(v)))) {
    throw new Error("Invalid query");
  }
  return { sql: compiled.sql, params: query.params };
}
