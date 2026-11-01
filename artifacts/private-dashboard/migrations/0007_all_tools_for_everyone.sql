-- Default: every tool is available to everyone. The group "Freunde" holds all users and all tools.
-- Additive and idempotent. Single grants can still be removed under Administration.
INSERT INTO private_area.groups(id,name) VALUES (gen_random_uuid(),'Freunde') ON CONFLICT DO NOTHING;
INSERT INTO private_area.memberships(user_id,group_id)
  SELECT u.id,g.id FROM private_area.users u CROSS JOIN private_area.groups g WHERE g.name='Freunde'
ON CONFLICT DO NOTHING;
INSERT INTO private_area.grants(id,tool_id,group_id)
  SELECT gen_random_uuid(),t.id,g.id FROM private_area.tools t CROSS JOIN private_area.groups g WHERE g.name='Freunde'
ON CONFLICT DO NOTHING;
