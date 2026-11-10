-- Only server receipt time is trusted when accepting a timer-based failure.
CREATE TABLE simulation_intrusion_timers (
  attempt_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id text NOT NULL REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX simulation_intrusion_timers_started ON simulation_intrusion_timers(started_at);
