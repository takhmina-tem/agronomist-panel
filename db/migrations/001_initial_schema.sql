-- Migration 001: initial schema
-- Promoted from db/init.sql; adds schema_migrations tracking table.
-- All statements are idempotent (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS).

-- ── Migration tracking ────────────────────────────────────────────────────────
create table if not exists schema_migrations (
  version    text        primary key,
  applied_at timestamptz not null default now()
);

-- ── Reference tables ──────────────────────────────────────────────────────────

create table if not exists varieties (
  id                   serial primary key,
  name                 text not null,
  maturity_group       text not null,
  purpose_type         text not null,  -- столовый | чипсы | фри
  yield_potential_t_ha numeric(6,2) not null default 0
);

create table if not exists fertilizers (
  id               serial primary key,
  name             text not null,
  fertilizer_type  text not null,
  n_pct            numeric(5,2) not null default 0,
  p_pct            numeric(5,2) not null default 0,
  k_pct            numeric(5,2) not null default 0,
  purpose_note     text
);

-- ── Core domain tables ────────────────────────────────────────────────────────

create table if not exists fields (
  id             serial primary key,
  name           text not null,
  area_ha        numeric(8,2) not null,
  variety_id     integer not null references varieties(id),
  current_phase  text not null,
  disease_status integer not null default 0 check (disease_status between 0 and 5)
);

-- operations: single table with JSONB payload per operation_type.
-- operation_type values: planting | inspection | fertilizer | irrigation |
--                        crop_protection | desiccation | harvest | storage
create table if not exists operations (
  id              serial primary key,
  field_id        integer not null references fields(id) on delete cascade,
  operation_type  text not null,
  operation_date  date not null,
  title           text not null,
  notes           text,
  payload         jsonb not null default '{}',
  photo_url       text,
  created_at      timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Used by timeline queries: all operations for a field, newest first
create index if not exists idx_operations_field_date
  on operations(field_id, operation_date desc);

-- Used by analytics queries that filter by operation type globally
create index if not exists idx_operations_type
  on operations(operation_type);
