-- Optional detail documentation per tool (plan, price, long text). Additive and idempotent.
ALTER TABLE private_area.tools ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT '';
ALTER TABLE private_area.tools ADD COLUMN IF NOT EXISTS price text NOT NULL DEFAULT '';
ALTER TABLE private_area.tools ADD COLUMN IF NOT EXISTS details text NOT NULL DEFAULT '';
