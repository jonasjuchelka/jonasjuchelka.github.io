import pg from "pg";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
  await pool.query(`DELETE FROM private_area.challenges WHERE expires_at<now();
    DELETE FROM private_area.sessions WHERE expires_at<now();
    DELETE FROM private_area.invitations WHERE expires_at<now()-interval '7 days';
    DELETE FROM private_area.audit WHERE created_at<now()-interval '30 days';
    DELETE FROM private_area.rate_limits WHERE expires_at<now();`);
} finally {await pool.end();}
