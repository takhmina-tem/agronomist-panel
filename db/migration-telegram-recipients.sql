-- Migration: add telegram_recipients table
--
-- SAFETY:
--   - CREATE TABLE IF NOT EXISTS  → idempotent, safe to run multiple times
--   - No ALTER TABLE on existing tables
--   - No DROP, TRUNCATE, DELETE
--   - No seed / demo data
--   - Completely independent new table; existing data is never touched
--
-- Run once against production Neon DB before deploying the Telegram feature:
--   psql $DATABASE_URL -f db/migration-telegram-recipients.sql

CREATE TABLE IF NOT EXISTS telegram_recipients (
  id         serial      PRIMARY KEY,
  chat_id    text        UNIQUE NOT NULL,
  label      text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
