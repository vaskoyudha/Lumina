# Operations

This is the operator's view: how to build, deploy, migrate, verify, back up,
restore, and troubleshoot Lumina. Product and security context is in
[overview.md](overview.md) and [security-privacy.md](security-privacy.md).

---

## 1. Environments

| Environment | App | Database | Notes |
| --- | --- | --- | --- |
| Local | `npm run dev` (Turbopack) | Local PostgreSQL | `.env.local`. |
| Test | Jest | Separate DB ending `_test` | `TEST_DATABASE_URL`. |
| Production (portable) | Docker Compose, Caddy | PostgreSQL 18.6 container | `compose.yaml`. |
| Production (current live VPS) | systemd `lumina.service`, `next start` on 127.0.0.1:3000 | Native PostgreSQL on 127.0.0.1:5432 | nginx terminates TLS for `https://luminaaa.web.id`. |

A `git pull` never rebuilds anything. `next start` serves the baked `.next`
directory. Source, build, service, and public HTTP are four separate layers;
verify each one.

---

## 2. Requirements

- Node.js **24 or newer** (`package.json` engines).
- npm.
- PostgreSQL 18.x for production parity; any recent PostgreSQL for development.
- Docker Engine + Compose v2 for the container path.
- A domain with DNS pointing at the host for TLS.
- Git.

Sizing estimate: 2 vCPU / 4 GB RAM for the single-host MVP. The scanner is the
most variable CPU/network consumer.

---

## 3. Local development

```bash
git clone https://github.com/vaskoyudha/Lumina.git
cd Lumina
npm ci
cp .env.example .env.local
# edit DATABASE_URL, AUTH_URL=http://localhost:3000
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Optional:

- Google OAuth: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; register
  `http://localhost:3000/api/auth/google/callback`.
- LLM: set `LUMINA_LLM_URL`, `LUMINA_LLM_MODEL`, `LUMINA_LLM_KEY`.
- Link verification: set `URLVET_API_URL` or `off`.
- Demo account: set `LUMINA_DEMO_EMAIL` and `LUMINA_DEMO_PASSWORD`.

Without an LLM, the app is fully functional with template fallbacks.

---

## 4. Environment reference

### 4.1 Core

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. |
| `TEST_DATABASE_URL` | No | — | Integration test DB; name must end `_test`. |
| `AUTH_URL` | Yes for OAuth | — | Canonical public origin, HTTPS in production. |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client. |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth secret. |
| `NODE_ENV` | Auto | — | `production` enables Secure cookies. |

### 4.2 AI

| Variable | Default | Purpose |
| --- | --- | --- |
| `LUMINA_LLM_URL` | — | OpenAI-compatible base URL. Empty disables AI routes. |
| `LUMINA_LLM_MODEL` | — | Model name. |
| `LUMINA_LLM_KEY` | — | Bearer token. |
| `LUMINA_AI_GLOBAL_LIMIT` | 200 (Compose 100) | Global AI requests per minute. |

### 4.3 Features

| Variable | Default | Purpose |
| --- | --- | --- |
| `URLVET_API_URL` | public `https://api.url.vet` | Link scanner base URL; `off` disables. |
| `VERIFY_LINK` | off | Enables `/api/verify-link` network checks. |
| `VERIFY_FILE` | off | Enables `/api/verify-file` hash reputation. |
| `LOKER_SCAN_DATA_DIR` | `<cwd>/.scan-data` | Scanner data root; must be writable. |
| `LOKER_PREWARM_INTERVAL_MS` | 21600000 (6 h) | Prewarm cadence; `0` disables. |
| `COMMUNITY_MODERATOR_IDS` | empty | Comma-separated account UUIDs. |
| `LUMINA_DEMO_EMAIL` | empty | Server-held demo account email. |
| `LUMINA_DEMO_PASSWORD` | empty | Server-held demo password. |
| `TRUST_PROXY` | false | Trust `X-Lumina-Client-IP`; only behind a header-overwriting proxy. |

### 4.4 Compose only

| Variable | Required | Purpose |
| --- | --- | --- |
| `DOMAIN` | Yes | Caddy site address. |
| `POSTGRES_DB` | Yes | Database name. |
| `POSTGRES_PASSWORD` | Yes | Superuser password. |
| `APP_DB_PASSWORD` | Yes | `lumina_app` role password; hex only because it is embedded in a URL. |
| `APP_IMAGE` | `lumina:local` | Release tag for rollback. |

Generate passwords with `openssl rand -hex 32`. Use distinct values for
`POSTGRES_PASSWORD` and `APP_DB_PASSWORD`.

---

## 5. Container deployment

### 5.1 First deploy

```bash
cp .env.example .env.production
chmod 600 .env.production
# fill DOMAIN, AUTH_URL, POSTGRES_DB, POSTGRES_PASSWORD, APP_DB_PASSWORD

docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production ps db   # wait for healthy
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production run --rm --no-deps app npm run db:seed
docker compose --env-file .env.production up -d app proxy
docker compose --env-file .env.production logs --tail=100 app proxy
curl -fsS "https://${DOMAIN}/api/health"
```

The DB init hook creates `lumina_app` only while the data volume is empty.
The app runs as UID 1001. Only Caddy publishes 80/443.

### 5.2 Release

```bash
sh deploy/backup.sh
export APP_IMAGE="lumina:$(git rev-parse --short HEAD)"
docker compose --env-file .env.production build app
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production up -d --no-build app proxy
# persist APP_IMAGE in .env.production
```

Order matters:

1. Back up first.
2. Build an immutable tag.
3. Migrate additively.
4. Replace the app.
5. Verify health and a representative page.

Migrations are a separate release step. The app never creates tables.

### 5.3 Rollback

```bash
APP_IMAGE=lumina:PREVIOUS_RELEASE \
  docker compose --env-file .env.production up -d --no-build app
```

Rollback restores the previous image; it does **not** downgrade the schema.
Migrations must remain backward-compatible so the previous image can run
against the newer schema. Do not drop columns or tables during a release
window.

### 5.4 Native/systemd deployment (current live)

Layout:

- Checkout: `/opt/lumina` on `main`.
- Env: `/opt/lumina/.env.local`.
- Service: `lumina.service` runs `next start -H 127.0.0.1 -p 3000`.
- Reverse proxy: nginx terminates TLS.
- Database: native PostgreSQL, database `lumina`, role `lumina_app`.

Deploy:

```bash
cd /opt/lumina
git fetch origin --prune
git pull --ff-only origin main
npm ci
npm run db:migrate
npm run db:seed        # only when content changed; default preserves rows
systemctl stop lumina.service
npm run build
systemctl start lumina.service
systemctl is-active lumina.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
```

Stop the service before `next build`. Building into the `.next` that
`next start` is serving can crash the service and leave `.next/lock`.

DB-only changes need no restart: Next queries PostgreSQL per request. Code
changes need a build and restart.

---

## 6. Migrations and seeds

```bash
npm run db:migrate
```

- Applies `migrations/*.sql` in filename order.
- Takes advisory lock `7368412`.
- Records each filename in `schema_migrations`.
- Prints nothing on success.

Verify, don't assume:

```bash
psql "$DATABASE_URL" -c "select version, applied_at from schema_migrations order by version;"
psql "$DATABASE_URL" -c "\dt"
```

### Content

```bash
npm run db:seed
npm run db:seed -- content/competition.json --replace
npm run db:seed -- modul-10.json --replace
```

`--replace` updates only rows named in the file. The importer validates the
whole bundle and rolls back on any error. It also verifies that every module's
`scenarioId` exists.

### Cleanup

```bash
npm run db:cleanup
```

Deletes expired sessions, OAuth states, rate counters, and abandoned intrusion
timers older than a day. It never deletes accounts, content, progress, or
results.

### SQLite cutover

```bash
node --input-type=module -e 'import {DatabaseSync,backup} from "node:sqlite"; const db=new DatabaseSync("data/auth.sqlite",{readOnly:true}); await backup(db,"/srv/private/auth-cutover.sqlite"); db.close();'
npm run db:import-sqlite -- /srv/private/auth-cutover.sqlite
```

The import preserves users, UUIDs, password hashes, and Google subjects. A
conflict aborts the whole transaction. Sessions are not imported.

---

## 7. Health and verification

`GET /api/health` returns 200 only if `SELECT 1` completes within 2 seconds.
It does not check the LLM, url.vet, or the scanner.

Verification ladder:

```bash
# source
git -C /opt/lumina status -sb
git -C /opt/lumina rev-parse HEAD
git -C /opt/lumina rev-parse origin/main

# build freshness
stat -c %y /opt/lumina/.next
git -C /opt/lumina log -1 --format=%ci

# service
systemctl is-active lumina.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health

# public
curl -s -o /dev/null -w '%{http_code}\n' https://luminaaa.web.id/
curl -s -o /dev/null -w '%{http_code}\n' https://luminaaa.web.id/api/health

# schema/content
psql "$DATABASE_URL" -c "select count(*) from learning_modules;"
psql "$DATABASE_URL" -c "select count(*) from simulation_scenarios;"
```

For "is the live site current?", use a commit-unique signal:

- A new route: an endpoint absent from the old build returns 404; the new build
  returns its real status.
- A new UI label: extract script tags from the served page, fetch the chunks,
  and grep for the label. Dialogs are client-rendered, so the label will not be
  in the HTML.
- If the marker passes, the browser tab is stale: hard reload
  (`Ctrl+Shift+R`) or use a private window.

---

## 8. Backups and restore

### Backup

`sh deploy/backup.sh` creates an atomic dump and keeps seven under
`/srv/lumina-backups`. Manual equivalent:

```bash
umask 077
mkdir -p /srv/lumina-backups
docker compose --env-file .env.production exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "/srv/lumina-backups/lumina-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

A volume copy or live directory copy is not a logical backup. Copy one dump
off the VPS. Backups contain account identities and password hashes; protect
them like credentials.

Suggested cron:

```cron
0 2 * * * cd /srv/lumina && sh deploy/backup.sh
0 * * * * cd /srv/lumina && docker compose --env-file .env.production run --rm --no-deps app npm run db:cleanup
```

### Restore drill

Restore to an isolated database, never production:

```bash
docker compose --env-file .env.production exec db \
  createdb -U postgres -O lumina_app lumina_restore_drill
docker compose --env-file .env.production exec -T db \
  pg_restore -U postgres -d lumina_restore_drill --no-owner --no-privileges \
  --role=lumina_app < /srv/lumina-backups/CHOOSE_A_BACKUP.dump
docker compose --env-file .env.production exec db \
  psql -U postgres -d lumina_restore_drill -c \
  'SET ROLE lumina_app; SELECT count(*) AS users, count(password_hash) AS passwords, count(google_sub) AS google FROM users;'
docker compose --env-file .env.production exec db dropdb -U postgres lumina_restore_drill
```

Compare IDs and hashes privately, verify app-role access, and record restore
time. For a real restore: stop the app, take a fresh pre-restore backup, restore
into a new empty app-owned database, switch the URL, run migrations, test login,
then reopen traffic. Keep the prior database until verification succeeds.

---

## 9. Logging and observability

- Compose uses the JSON file driver, 10 MB × 5 per container.
- Caddy access logs are disabled; its error logger removes URI and headers.
- App logs should be metadata-only. Never log bodies, cookies, OAuth codes, or
  message text.
- `/api/health` is the liveness/readiness signal.
- The job card polls `/api/loker/scan/status`; `loker_scan_runs` is the durable
  record of crawls.
- There is no APM, metrics endpoint, or alerting in the repository. Add it at
  the infrastructure layer if needed.

Useful checks:

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 app
docker compose --env-file .env.production logs --tail=100 proxy
journalctl -u lumina.service -n 100 --no-pager
```

---

## 10. Troubleshooting

| Symptom | Likely cause | Check / fix |
| --- | --- | --- |
| Site shows old UI after deploy | Browser kept old bundle, or build not refreshed | Use a commit-unique marker; hard reload; check `.next` mtime and service start time. |
| `npm run build` fails with `.next/lock` | Another build is running, or service is serving while building | Stop the service, remove the stale lock only if no build process exists, rebuild. |
| `/api/health` 503 | Database unreachable or slow | Check service, `DATABASE_URL`, PostgreSQL, network; health is DB-only. |
| Login works but learning pages fail | Migrations missing | Compare `migrations/*.sql` with `schema_migrations`. |
| `db:migrate` prints nothing | Normal on success; not proof | Query `schema_migrations` and a resulting table. |
| `db:seed` says `--replace` missing | Bare `-- --replace` is read as a filename | Use `npm run db:seed -- content/competition.json --replace`. |
| Community feed empty but no error | `community_posts` is user-generated | Expected on a fresh DB; seed demo only for local demos. |
| Community feed says "Komunitas tidak tersedia" | Query failure | Check DB and migrations. |
| Job card says "belum dipindai" | No successful scan yet | Wait for prewarm or press "Pindai ulang"; check `loker_scan_runs`. |
| Scan returns 409 | Another scan holds the advisory lock | Wait; never run two crawls. |
| AI routes 503 `not-configured` | LLM URL/model empty | Configure the provider or accept template fallback. |
| AI routes 503 `upstream-timeout` | Provider slow | Check endpoint/model; deadlines are 20 s (45 s vision). |
| Vision returns 502 | Provider returned no text | Ask the user for a clearer image; filename-only check remains. |
| Link verify 503 `not-configured` | `URLVET_API_URL=off` or unset with no public access | Configure a scanner or leave offline. |
| Horizontal scroll at 380 px | Grid/flex child expanded by long token | Add `min-w-0` and `overflow-x-hidden`. |
| Profile menu navigates to `/profil` | Regression | Menus must open `ProfileDialog`; `/profil` is only a fallback. |
| Session disappears after restart | Expected if DB session expired/revoked | 24 h expiry; log in again. |
| Password change logs out other devices | Intended | All other sessions are revoked. |

---

## 11. Incident playbook

### Suspected credential leak

1. Rotate `POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `LUMINA_LLM_KEY`,
   `GOOGLE_CLIENT_SECRET`, and any url.vet keys.
2. `ALTER ROLE lumina_app WITH PASSWORD ...` and update `DATABASE_URL`.
3. Revoke all sessions (`DELETE FROM sessions;`) if account takeover is possible.
4. Rebuild/restart with the new environment.
5. Review logs for unusual auth or AI traffic; rotate backups out of reach if
   the host is compromised.

### Database corruption or failed migration

1. Stop the app.
2. Take a fresh copy if possible.
3. Restore the last verified dump into a new database.
4. Run migrations and verify `schema_migrations`.
5. Test login and one learning/community page.
6. Switch `DATABASE_URL` and restart.
7. Keep the failed database for forensics.

### Provider outage

- AI: template fallback; no action required unless the outage is prolonged.
- Google: email/password still works.
- Job boards/RDAP: scans fail honestly; old corpus remains searchable.
- url.vet: link verification returns 503; offline Link Agent still works.

### Abuse spike

1. Identify the bucket (`auth_attempts` keys are hashed).
2. Lower `LUMINA_AI_GLOBAL_LIMIT` or block at the proxy.
3. If a single account is abusive, revoke its sessions and moderate content.
4. Do not disable `/api/health`; it is the deploy signal.

---

## 12. Operational limits

1. There is no horizontal scaling design: the job advisory lock assumes one
   database, and the scanner writes to a local data directory.
2. The app pool is five connections per process; size PostgreSQL accordingly.
3. The scanner's first in-container run still needs an end-to-end check.
4. Backups and off-VPS copies are process, not code.
5. Real Google OAuth and TLS issuance need environment-specific verification.
6. There is no built-in metrics or alerting stack.
