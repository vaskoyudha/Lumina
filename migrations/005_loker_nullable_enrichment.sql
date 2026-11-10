-- Job boards publish neither a company email nor the employer's domain age.
-- Requiring them hid every real posting (764/764 dropped on 2026-11-09) and
-- left only the demo seed visible. Missing enrichment is stored as null and the
-- Sentinel audit treats null as "no identity signal" — never as a clean pass.
alter table loker_postings alter column company_email drop not null;
alter table loker_postings alter column domain_age_days drop not null;
