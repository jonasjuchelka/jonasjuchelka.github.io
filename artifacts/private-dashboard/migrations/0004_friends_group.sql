-- Group "Freunde" with all existing team-seat tools. Additive and idempotent.
INSERT INTO private_area.groups(id,name) VALUES (gen_random_uuid(),'Freunde') ON CONFLICT DO NOTHING;
INSERT INTO private_area.grants(id,tool_id,group_id)
  SELECT gen_random_uuid(),t.id,g.id FROM private_area.tools t CROSS JOIN private_area.groups g
  WHERE g.name='Freunde' AND t.access_type='team_seat'
ON CONFLICT DO NOTHING;
