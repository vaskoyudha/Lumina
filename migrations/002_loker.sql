create table loker_scan_runs (
  id              bigserial primary key,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running', -- running | ok | failed
  found           int  not null default 0,
  added           int  not null default 0,
  dropped         int  not null default 0,
  provider_errors jsonb not null default '[]',
  exit_code       int,
  triggered_by    text
);

create table loker_postings (
  url_key          text primary key,
  run_id           bigint references loker_scan_runs(id) on delete set null,
  title            text not null,
  company          text not null,
  location         text,
  salary_min       bigint,
  salary_max       bigint,
  salary_currency  text,
  tags             text[] not null default '{}',
  description      text not null,
  apply_url        text,
  source           text not null,
  posted_at        date,
  company_email    text not null,
  domain_age_days  int  not null,
  employer_known   boolean not null,
  sentinel_status  text not null,
  sentinel_flags   text[] not null default '{}',
  trust_score      int  not null,
  trust_level      text not null,
  lumina_score     int  not null,
  lumina_risk      text not null,
  lumina_signals   jsonb not null,
  fetched_at       timestamptz not null default now()
);

create table loker_domain_cache (
  domain     text primary key,
  age_days   int,
  status     text not null, -- ok | unknown | error
  checked_at timestamptz not null default now()
);

create index loker_postings_posted_at_idx on loker_postings (posted_at desc nulls last);
create index loker_postings_sentinel_idx  on loker_postings (sentinel_status);
create index loker_postings_tags_idx      on loker_postings using gin (tags);
