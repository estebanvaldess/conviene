-- SPEC 01 — Ingesta diaria / Espejo local · Conviene
-- Base schema with RLS, monthly events partitioning, and retention helpers.

create extension if not exists pgcrypto;

create table if not exists purchase_orders (
  code text primary key,
  status_code int,
  tender_code text,
  supplier_rut text not null,
  supplier_name text,
  supplier_mp_code text,
  supplier_region text,
  supplier_activity text,
  supplier_is_natural_person boolean,
  buyer_org_code text,
  buyer_org_name text,
  buyer_region text,
  buyer_unit_rut text,
  total_net numeric, tax numeric, total numeric, currency text,
  created_at_mp timestamptz, sent_at timestamptz,
  accepted_at timestamptz, cancelled_at timestamptz,
  supplier_rating numeric,
  raw jsonb not null,
  ingested_at timestamptz default now()
);
create index if not exists purchase_orders_supplier_rut_idx on purchase_orders (supplier_rut);
create index if not exists purchase_orders_buyer_org_code_idx on purchase_orders (buyer_org_code);

create table if not exists purchase_order_items (
  id bigint generated always as identity primary key,
  po_code text references purchase_orders(code) on delete cascade,
  onu_code text, onu_category text,
  product_name text, spec_text text,
  qty numeric, unit_price numeric, total numeric
);
create index if not exists purchase_order_items_onu_code_idx on purchase_order_items (onu_code);
create index if not exists purchase_order_items_po_code_idx on purchase_order_items (po_code);

create table if not exists tenders (
  code text primary key,
  type text,
  status text,
  name text, description text,
  buyer_org_code text, buyer_org_name text, buyer_region text,
  amount_estimated numeric, currency text,
  published_at timestamptz, closes_at timestamptz, questions_until timestamptz,
  last_modified_mp timestamptz,
  guarantee_required boolean,
  guarantee_amount numeric,
  admissibility_raw jsonb,
  items_text text,
  fts tsvector generated always as (
    to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(items_text,''))
  ) stored,
  raw jsonb not null,
  ingested_at timestamptz default now()
);
create index if not exists tenders_fts_idx on tenders using gin (fts);
create index if not exists tenders_closes_at_open_idx on tenders (closes_at) where status = 'open';

create table if not exists tender_items (
  id bigint generated always as identity primary key,
  tender_code text references tenders(code) on delete cascade,
  onu_code text, product_name text, qty numeric, spec_text text
);
create index if not exists tender_items_onu_code_idx on tender_items (onu_code);
create index if not exists tender_items_tender_code_idx on tender_items (tender_code);

create table if not exists companies (
  rut text primary key,
  name text,
  tier text check (tier in ('pleno','delgado','declarativo','persona_natural')),
  profile jsonb,
  declared_profile jsonb,
  oc_count_24m int default 0,
  last_oc_at timestamptz,
  profile_built_at timestamptz,
  opt_out boolean default false,
  is_natural_person boolean default false
);

create table if not exists users (
  id uuid primary key references auth.users(id),
  email text not null,
  company_rut text references companies(rut),
  plan text default 'free' check (plan in ('free','fundador','pro','business')),
  digest_enabled boolean default false,
  digest_email_bounces int default 0,
  policy_version_accepted text,
  policy_accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists matches (
  id bigint generated always as identity primary key,
  tender_code text references tenders(code),
  company_rut text references companies(rut),
  score int check (score between 0 and 100),
  factors jsonb not null,
  status text default 'active' check (status in ('active','saved','discarded','closed')),
  upgraded_since_last_digest boolean default false,
  scored_at timestamptz default now(),
  rescored_at timestamptz,
  unique (tender_code, company_rut)
);
create index if not exists matches_company_rut_score_idx on matches (company_rut, score desc);

create table if not exists checklists (
  tender_code text primary key references tenders(code),
  items jsonb not null,
  degraded boolean default false,
  built_at timestamptz default now()
);

create table if not exists events (
  id bigint generated always as identity,
  user_id uuid,
  session_id text,
  type text not null,
  payload jsonb,
  created_at timestamptz default now(),
  primary key (id, created_at)
) partition by range (created_at);
create index if not exists events_type_created_at_idx on events (type, created_at);
create index if not exists events_user_id_created_at_idx on events (user_id, created_at);

create or replace function ensure_events_partition(partition_month date) returns void language plpgsql security definer as $$
declare start_at timestamptz; end_at timestamptz; partition_name text;
begin
  start_at := date_trunc('month', partition_month)::timestamptz;
  end_at := start_at + interval '1 month';
  partition_name := 'events_' || to_char(start_at, 'YYYY_MM');
  execute format('create table if not exists %I partition of events for values from (%L) to (%L)', partition_name, start_at, end_at);
end; $$;
select ensure_events_partition((now() at time zone 'America/Santiago')::date);
select ensure_events_partition(((now() at time zone 'America/Santiago')::date + interval '1 month')::date);
select ensure_events_partition(((now() at time zone 'America/Santiago')::date + interval '2 months')::date);
select ensure_events_partition(((now() at time zone 'America/Santiago')::date + interval '3 months')::date);

create table if not exists feedback (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  match_id bigint references matches(id) on delete set null,
  vote int check (vote in (1,-1)),
  factors_snapshot jsonb not null,
  comment text,
  created_at timestamptz default now()
);

create table if not exists ingest_runs (
  id bigint generated always as identity primary key,
  run_date date not null,
  source text check (source in ('api_oc','api_tenders','datos_abiertos')),
  req_count int, ok_count int, fail_count int,
  duration_ms int, cursor text,
  created_at timestamptz default now()
);
create table if not exists ingest_retry (
  code text, source text, attempts int default 0,
  next_retry_at timestamptz,
  primary key (code, source)
);
create table if not exists digests (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  run_date date not null,
  kind text default 'daily' check (kind in ('daily','empty','weekly','early_close')),
  sent_at timestamptz,
  items jsonb,
  opened_at timestamptz,
  clicked jsonb,
  unique (user_id, run_date, kind)
);
create table if not exists tender_notifications (
  user_id uuid references users(id), tender_code text references tenders(code),
  type text check (type in ('early_close')), sent_at timestamptz default now(),
  primary key (user_id, tender_code, type)
);
create table if not exists buyer_stats (buyer_org_code text, month date, debutant_rate numeric, sample_size int, espejo_depth_months int, primary key (buyer_org_code, month));
create table if not exists events_summary (month date, type text, count bigint, primary key (month, type));
create table if not exists onu_taxonomy (family_code text primary key, label text not null, freq bigint default 0);
create table if not exists arco_requests (
  id bigint generated always as identity primary key,
  requested_at timestamptz default now(),
  type text check (type in ('acceso','rectificacion','supresion','oposicion','portabilidad')),
  subject_rut text, channel text,
  status text default 'pendiente' check (status in ('pendiente','en_proceso','resuelto','rechazado')),
  resolved_at timestamptz, notes text
);
create table if not exists pii_access_log (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  subject text,
  detail jsonb,
  created_at timestamptz default now()
);

create or replace function anonymize_old_lead_events() returns bigint language plpgsql security definer as $$
declare changed bigint;
begin
  update events
  set payload = jsonb_set(coalesce(payload, '{}'::jsonb) - 'rut', '{rut_hash}', to_jsonb(encode(digest(coalesce(payload->>'rut',''), 'sha256'), 'hex')))
  where user_id is null and payload ? 'rut' and created_at < now() - interval '12 months';
  get diagnostics changed = row_count;
  return changed;
end; $$;

create or replace function summarize_and_delete_old_events() returns bigint language plpgsql security definer as $$
declare deleted bigint;
begin
  insert into events_summary(month, type, count)
  select date_trunc('month', created_at)::date, type, count(*) from events
  where created_at < now() - interval '24 months'
  group by 1, 2
  on conflict (month, type) do update set count = events_summary.count + excluded.count;
  delete from events where created_at < now() - interval '24 months';
  get diagnostics deleted = row_count;
  return deleted;
end; $$;

alter table purchase_orders enable row level security; alter table purchase_order_items enable row level security;
alter table tenders enable row level security; alter table tender_items enable row level security; alter table companies enable row level security;
alter table checklists enable row level security; alter table users enable row level security; alter table matches enable row level security;
alter table feedback enable row level security; alter table digests enable row level security; alter table events enable row level security;
alter table ingest_runs enable row level security; alter table ingest_retry enable row level security; alter table tender_notifications enable row level security;
alter table buyer_stats enable row level security; alter table events_summary enable row level security; alter table onu_taxonomy enable row level security;
alter table arco_requests enable row level security; alter table pii_access_log enable row level security;

create policy users_own_select on users for select using (id = auth.uid());
create policy users_own_update on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy matches_own_select on matches for select using (exists (select 1 from users u where u.id = auth.uid() and u.company_rut = matches.company_rut));
create policy feedback_own_select on feedback for select using (user_id = auth.uid());
create policy feedback_own_insert on feedback for insert with check (user_id = auth.uid());
create policy digests_own_select on digests for select using (user_id = auth.uid());
-- All mirror/ops tables intentionally have no anon/auth policies: service role only.
