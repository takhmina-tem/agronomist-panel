-- Migration 002: add timestamps to fields + compound analytics index
-- Adds created_at / updated_at to fields per CLAUDE.md database design principles.
-- Adds compound index (field_id, operation_type) for per-field analytics queries.
-- All statements are idempotent.

alter table fields
  add column if not exists created_at  timestamptz not null default now(),
  add column if not exists updated_at  timestamptz not null default now();

-- Used by per-field analytics: filter operations by type for a single field
create index if not exists idx_operations_field_type
  on operations(field_id, operation_type);
