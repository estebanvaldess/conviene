-- SPEC 02 — Perfil por RUT + Onboarding incremental schema.
create table if not exists profile_recalc_queue (
  rut text primary key,
  reason text not null default 'purchase_orders_changed',
  queued_at timestamptz default now(),
  processed_at timestamptz
);
alter table profile_recalc_queue enable row level security;
create index if not exists profile_recalc_queue_pending_idx on profile_recalc_queue (queued_at) where processed_at is null;

create or replace function enqueue_profile_recalc_from_po() returns trigger language plpgsql security definer as $$
begin
  insert into profile_recalc_queue(rut, reason) values (new.supplier_rut, 'purchase_orders_changed')
  on conflict (rut) do update set queued_at = now(), processed_at = null, reason = excluded.reason;
  return new;
end; $$;
drop trigger if exists purchase_orders_profile_recalc on purchase_orders;
create trigger purchase_orders_profile_recalc after insert or update on purchase_orders for each row execute function enqueue_profile_recalc_from_po();
