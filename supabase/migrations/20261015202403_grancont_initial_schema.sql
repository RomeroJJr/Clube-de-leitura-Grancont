-- Private application schema: no direct browser/PostgREST access.
create schema grancont;
revoke all on schema grancont from public, anon, authenticated;
create role grancont_runtime nologin noinherit;
grant grancont_runtime to postgres;
grant usage on schema grancont to grancont_runtime;

create table grancont.library_meta (
  id text primary key,
  owner_id text not null,
  revision integer not null default 0 check (revision >= 0),
  lock_token text not null default '',
  settings text not null
);
create table grancont.library_records (
  collection text not null,
  id text not null,
  data text not null,
  primary key (collection, id)
);
create table grancont.auth_users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  employee_id text not null default '',
  email text not null default '',
  role text not null default 'reader' check (role in ('admin', 'reader')),
  salt text not null,
  password_hash text not null,
  active integer not null default 1 check (active in (0, 1)),
  platform_user_id text,
  created_at text not null,
  last_login text,
  password_changed_at text not null
);
create table grancont.auth_sessions (
  token_hash text primary key,
  user_id text not null references grancont.auth_users(id) on delete cascade,
  expires_at bigint not null,
  created_at text not null
);
create index auth_sessions_user_idx on grancont.auth_sessions(user_id);
create index auth_sessions_expires_idx on grancont.auth_sessions(expires_at);
create table grancont.auth_attempts (
  key text primary key,
  attempts integer not null default 0,
  window_start bigint not null
);
create table grancont.migration_runs (
  id text primary key,
  source_hash text not null,
  summary text not null,
  applied_at text not null
);
create table grancont.gateway_keys (
  key_hash text primary key check (length(key_hash) = 64),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

revoke all on all tables in schema grancont from public, anon, authenticated;
grant select, insert, update, delete on grancont.library_meta, grancont.library_records,
  grancont.auth_users, grancont.auth_sessions, grancont.auth_attempts to grancont_runtime;
grant select on grancont.migration_runs, grancont.gateway_keys to grancont_runtime;

alter table grancont.library_meta enable row level security;
alter table grancont.library_records enable row level security;
alter table grancont.auth_users enable row level security;
alter table grancont.auth_sessions enable row level security;
alter table grancont.auth_attempts enable row level security;
alter table grancont.migration_runs enable row level security;
alter table grancont.gateway_keys enable row level security;
create policy runtime_access on grancont.library_meta to grancont_runtime using (true) with check (true);
create policy runtime_access on grancont.library_records to grancont_runtime using (true) with check (true);
create policy runtime_access on grancont.auth_users to grancont_runtime using (true) with check (true);
create policy runtime_access on grancont.auth_sessions to grancont_runtime using (true) with check (true);
create policy runtime_access on grancont.auth_attempts to grancont_runtime using (true) with check (true);
create policy runtime_read on grancont.migration_runs for select to grancont_runtime using (true);
create policy runtime_read on grancont.gateway_keys for select to grancont_runtime using (true);

-- Object contents are written only through the Storage API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('grancont-covers', 'grancont-covers', false, 3145728, array['image/png','image/jpeg','image/webp']);
