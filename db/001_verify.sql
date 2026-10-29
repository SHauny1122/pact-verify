-- Run once in the Supabase SQL Editor. Only the server-side Postgres connection
-- can access this schema; there are no browser-facing RLS policies or API keys.
CREATE SCHEMA IF NOT EXISTS pact_verify;
REVOKE ALL ON SCHEMA pact_verify FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS pact_verify.sessions (
  id text PRIMARY KEY CHECK (id ~ '^VERIFY-[A-F0-9]{8,32}$'),
  created_at timestamptz NOT NULL,
  record jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA pact_verify FROM PUBLIC, anon, authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS verify_authorization_unique
  ON pact_verify.sessions ((record->>'authorizationId'))
  WHERE record ? 'authorizationId';
CREATE UNIQUE INDEX IF NOT EXISTS verify_capture_unique
  ON pact_verify.sessions ((record->>'captureId'))
  WHERE record ? 'captureId';
