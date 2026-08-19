ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users FOR SELECT
  USING (auth_user_id = current_setting('app.auth_user_id', true));
CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (auth_user_id = current_setting('app.auth_user_id', true));
CREATE POLICY users_update ON users FOR UPDATE
  USING (auth_user_id = current_setting('app.auth_user_id', true));
