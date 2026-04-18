-- Migration 003: add status column to operations
-- status values: planned | in_progress | completed
-- Default: 'completed' — all existing records were entered after the fact.
-- Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

alter table operations
  add column if not exists status text not null default 'completed'
    check (status in ('planned', 'in_progress', 'completed'));
