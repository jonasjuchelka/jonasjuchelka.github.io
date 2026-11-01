-- Shared logins per tool (encrypted with CREDENTIALS_KEY on the server) and 6-hour access links.
-- Additive and idempotent.
CREATE TABLE IF NOT EXISTS private_area.tool_credentials (
  tool_id uuid PRIMARY KEY REFERENCES private_area.tools(id) ON DELETE CASCADE,
  secret_box text NOT NULL,              -- AES-256-GCM, tool id bound as additional data
  fields text[] NOT NULL DEFAULT '{}',   -- which fields are set (no values), for the admin view
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_area.access_links (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,       -- sha256 of the link token
  token_box text NOT NULL,               -- token encrypted, so the same link can be reopened
  tool_id uuid NOT NULL REFERENCES private_area.tools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES private_area.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES private_area.sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  views integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS access_links_session_tool ON private_area.access_links(session_id, tool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS access_links_created ON private_area.access_links(created_at DESC);
