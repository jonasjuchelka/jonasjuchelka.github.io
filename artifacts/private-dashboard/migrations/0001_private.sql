CREATE SCHEMA IF NOT EXISTS private_area;
CREATE TABLE IF NOT EXISTS private_area.users (
  id uuid PRIMARY KEY, name text NOT NULL, role text NOT NULL CHECK(role IN ('admin','member')),
  blocked boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_area.passkeys (
  id text PRIMARY KEY, user_id uuid NOT NULL REFERENCES private_area.users ON DELETE CASCADE,
  public_key bytea NOT NULL, counter bigint NOT NULL DEFAULT 0, transports text[] NOT NULL DEFAULT '{}',
  device_type text NOT NULL, backed_up boolean NOT NULL, name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_area.sessions (
  id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES private_area.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_area.invitations (
  id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK(role IN ('admin','member')),
  expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE IF NOT EXISTS private_area.challenges (
  token_hash text PRIMARY KEY, challenge text NOT NULL, purpose text NOT NULL,
  user_id uuid, invitation_id uuid REFERENCES private_area.invitations ON DELETE CASCADE,
  session_id uuid REFERENCES private_area.sessions ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS private_area.groups (id uuid PRIMARY KEY, name text UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS private_area.memberships (
  user_id uuid REFERENCES private_area.users ON DELETE CASCADE,
  group_id uuid REFERENCES private_area.groups ON DELETE CASCADE, PRIMARY KEY (user_id,group_id)
);
CREATE TABLE IF NOT EXISTS private_area.tools (
  id uuid PRIMARY KEY, name text NOT NULL, provider text NOT NULL, description text NOT NULL,
  url text NOT NULL CHECK (url LIKE 'https://%'),
  access_type text NOT NULL CHECK(access_type IN ('own_account','team_seat','permitted_shared')),
  instructions text NOT NULL
);
CREATE TABLE IF NOT EXISTS private_area.grants (
  id uuid PRIMARY KEY, tool_id uuid NOT NULL REFERENCES private_area.tools ON DELETE CASCADE,
  user_id uuid REFERENCES private_area.users ON DELETE CASCADE,
  group_id uuid REFERENCES private_area.groups ON DELETE CASCADE,
  CHECK ((user_id IS NULL) <> (group_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS grants_user_unique ON private_area.grants(tool_id,user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS grants_group_unique ON private_area.grants(tool_id,group_id) WHERE group_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS private_area.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES private_area.users ON DELETE SET NULL, event text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private_area.rate_limits (key text PRIMARY KEY, hits int NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS private_area.bootstrap (id int PRIMARY KEY CHECK(id=1), used_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS sessions_expiry ON private_area.sessions(expires_at);
CREATE INDEX IF NOT EXISTS challenges_expiry ON private_area.challenges(expires_at);
