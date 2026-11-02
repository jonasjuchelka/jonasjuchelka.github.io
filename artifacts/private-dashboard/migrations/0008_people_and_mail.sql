-- First name, last name and e-mail for people; permanent deletion as a tombstone; mail log.
-- Additive and idempotent. `name` stays as the display name ("Vorname Nachname").

ALTER TABLE private_area.users
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- Deleted people are always blocked as well, so every existing "NOT blocked" check keeps them out.
ALTER TABLE private_area.users DROP CONSTRAINT IF EXISTS users_deleted_is_blocked;
ALTER TABLE private_area.users ADD CONSTRAINT users_deleted_is_blocked CHECK (deleted_at IS NULL OR blocked);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON private_area.users (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE private_area.invitations
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES private_area.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backfill: split the existing display name at the first space.
UPDATE private_area.users SET first_name = split_part(name, ' ', 1),
  last_name = btrim(substr(name, length(split_part(name, ' ', 1)) + 1)) WHERE first_name = '';
UPDATE private_area.invitations SET first_name = split_part(name, ' ', 1),
  last_name = btrim(substr(name, length(split_part(name, ' ', 1)) + 1)) WHERE first_name = '';

-- Link already redeemed invitations to their person, where the name is unambiguous.
UPDATE private_area.invitations i SET user_id = u.id FROM private_area.users u
  WHERE i.used_at IS NOT NULL AND i.user_id IS NULL AND u.name = i.name
    AND (SELECT count(*) FROM private_area.users x WHERE x.name = i.name) = 1;

-- Which mail went to whom, and whether Resend accepted it. No addresses or contents are stored here.
CREATE TABLE IF NOT EXISTS private_area.mail_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('invite', 'new_tool')),
  user_id uuid REFERENCES private_area.users ON DELETE SET NULL,
  invitation_id uuid REFERENCES private_area.invitations ON DELETE SET NULL,
  tool_id uuid REFERENCES private_area.tools ON DELETE SET NULL,
  tool_name text NOT NULL DEFAULT '',
  ok boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mail_log_created ON private_area.mail_log (created_at DESC);
