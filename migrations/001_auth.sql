CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL UNIQUE CHECK (email = lower(email)), nama text NOT NULL, password_hash text, google_sub text UNIQUE, created_at timestamptz NOT NULL);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE oauth_states (state_hash text PRIMARY KEY, verifier text NOT NULL, nonce text NOT NULL, intent text NOT NULL CHECK (intent IN ('masuk','daftar')), expires_at timestamptz NOT NULL);
CREATE TABLE auth_attempts (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX oauth_states_expiry ON oauth_states(expires_at);
CREATE INDEX auth_attempts_expiry ON auth_attempts(expires_at);
