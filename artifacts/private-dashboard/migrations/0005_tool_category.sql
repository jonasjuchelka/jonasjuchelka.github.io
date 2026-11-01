-- One optional category per tool, local logos, and four shared tools. Additive and idempotent.
-- Run BEFORE deploying the code that reads tools.category.
ALTER TABLE private_area.tools ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
DO $$ BEGIN
  ALTER TABLE private_area.tools ADD CONSTRAINT tools_category_known
    CHECK (category IN ('','ki','entwicklung','cloud','daten','testing','sicherheit','domains','lernen','design'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ElevenLabs: category KI and the local logo (only if nothing was set by hand).
UPDATE private_area.tools SET category='ki' WHERE lower(name)='elevenlabs' AND category='';
UPDATE private_area.tools SET logo_url='/logos/elevenlabs.svg' WHERE lower(name)='elevenlabs' AND logo_url='';

-- New shared-login tools. Not granted to anyone yet: grant them under Administration.
INSERT INTO private_area.tools(id,name,provider,description,url,access_type,instructions,category,logo_url)
SELECT gen_random_uuid(),v.name,v.provider,v.description,v.url,'permitted_shared',v.instructions,v.category,v.logo_url
FROM (VALUES
  ('Cursor','Anysphere','KI-Code-Editor mit Agent und Autocomplete.','https://cursor.com','Logindaten im Passworttresor.','entwicklung','/logos/cursor.svg'),
  ('OpenAI Console','OpenAI','API-Schlüssel, Playground und Nutzung der OpenAI-API.','https://platform.openai.com','Logindaten im Passworttresor.','ki','/logos/openai.svg'),
  ('Supabase','Supabase','Postgres-Datenbank, Auth und Storage als Backend.','https://supabase.com/dashboard','Logindaten im Passworttresor.','daten','/logos/supabase.svg'),
  ('Freestyle','Freestyle','Cloud-Infrastruktur für KI-generierte Apps.','https://freestyle.sh','Logindaten im Passworttresor.','cloud','')
) AS v(name,provider,description,url,instructions,category,logo_url)
WHERE NOT EXISTS (SELECT 1 FROM private_area.tools t WHERE lower(t.name)=lower(v.name));
