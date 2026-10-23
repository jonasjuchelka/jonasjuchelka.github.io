-- Optional logo address per tool (https URL or a path on this site). Additive and idempotent.
ALTER TABLE private_area.tools ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';
