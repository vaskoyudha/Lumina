# Deploy Lumina on one VPS

Single-host MVP topology: Next.js standalone, PostgreSQL 18 on a persistent named volume, and Caddy as the only service publishing web ports. App uses port 3000; PostgreSQL uses 5432, neither published on the host. Only Caddy publishes 80/443.

Pinned official release tags are Node `24.22.2-bookworm-slim`, PostgreSQL `18.6`, Caddy `2.11.9-alpine`. PostgreSQL 18.6 is the latest 18.x release tag verified for this work. Review updates before a release; do not use `latest`. Sources: [Node tags](https://hub.docker.com/_/node/tags), [PostgreSQL 18.6](https://hub.docker.com/layers/library/postgres/18.6/images/sha256-9770878138a2e83abcb10856d30cc3f24dae0d317bb956db6ab9159de6c3c80d), [Caddy tags](https://hub.docker.com/_/caddy).

Next's self-hosting guide recommends a reverse proxy and streaming support end-to-end. Caddy sets `flush_interval -1`; its response header timeout is 25 seconds for the app's 20-second upstream deadline. Runtime secrets pass through Compose only, never Docker build arguments or image layers. The final app image runs as UID 1001. See [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting) and [Next Docker deployment](https://nextjs.org/docs/app/getting-started/deploying#docker).

## Before first start

1. Provision a Linux VPS (initial estimate: 2 vCPU / 4 GB RAM), Docker Engine with Compose v2, a domain, and DNS records. Allow inbound TCP 80/443 and UDP 443; restrict SSH separately.
2. Copy `.env.example` to `.env.production` on the VPS. Keep it private (mode `0600`) and out of source control. Required values: `DOMAIN`, `AUTH_URL`, `POSTGRES_DB`, `POSTGRES_PASSWORD`, and `APP_DB_PASSWORD`. Set `AUTH_URL` to the canonical HTTPS origin with no path. The bootstrap superuser is `postgres`; the app uses the separate non-superuser `lumina_app` role. Every command below uses `--env-file .env.production` to match the env template.
3. Generate two strong distinct passwords. Use hex-only values for both because Compose embeds `APP_DB_PASSWORD` in the app's PostgreSQL URL. Never use the bootstrap credential for the app. Google and LLM credentials are optional; no LLM settings means offline fallback.
4. Register `https://<DOMAIN>/api/auth/google/callback` in Google OAuth settings.
5. Review image tags in `compose.yaml` and `Dockerfile`. Build the selected commit on the VPS or a compatible Linux runner:

   ```sh
   docker compose --env-file .env.production build app
   ```

   Save the prior app image/tag before each release. Do not pass secrets to `docker build`.

## First deployment and cutover

The PostgreSQL init hook creates restricted login role `lumina_app` and grants connection and schema object creation. Bootstrap user remains superuser-only. Init hooks run only while the named database volume is empty.

```sh
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production ps db
# Wait until db reports healthy.
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production run --rm --no-deps app npm run db:seed
# Import existing SQLite accounts if needed; see below.
docker compose --env-file .env.production up -d app proxy
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 app proxy
curl -fsS "https://${DOMAIN}/api/health"
```

Health should return 200 only if the app can run `SELECT 1`; it must not depend on AI. Check HTTPS issuance, then test registration, logout/login after restart, Google OAuth if configured, companion streaming, and unauthenticated `/darurat`.

### First SQLite to PostgreSQL cutover

Check whether `data/auth.sqlite` contains real accounts. For a clean install, use an empty PostgreSQL database and skip import. To keep accounts, stop the SQLite app and account writes, then create a consistent backup using Node 24 (including committed WAL data):

```sh
node --input-type=module -e 'import {DatabaseSync,backup} from "node:sqlite"; const db=new DatabaseSync("data/auth.sqlite",{readOnly:true}); await backup(db,"/srv/private/auth-cutover.sqlite"); db.close();'
docker compose --env-file .env.production run --rm --no-deps \
  -v /srv/private/auth-cutover.sqlite:/import/auth.sqlite:ro \
  app npm run db:import-sqlite -- /import/auth.sqlite
```

Create `/srv/private` with restricted permissions first and allow the container UID 1001 to read this backup. Import preserves users, UUIDs, password hashes, and Google subjects only. Sessions/state are discarded; users sign in again. A conflict rolls back the entire import. Keep the SQLite source and backup until login verification and PostgreSQL backup succeed. The local SQLite snapshot had zero users when inspected. `db:cleanup` only removes expired PostgreSQL sessions/state/limit counters; it never removes the SQLite source.

## Updates and rollback

Use a unique image tag per release so rebuilding cannot overwrite the rollback image:

```sh
sh deploy/backup.sh
export APP_IMAGE="lumina:$(git rev-parse --short HEAD)"
docker compose --env-file .env.production build app
docker compose --env-file .env.production run --rm --no-deps app npm run db:migrate
docker compose --env-file .env.production up -d --no-build app proxy
# Persist the successful APP_IMAGE value in .env.production.
# Roll back later using the actual previous PostgreSQL-compatible image tag:
APP_IMAGE=lumina:PREVIOUS_RELEASE docker compose --env-file .env.production up -d --no-build app
```

Use additive, backward-compatible migrations so the previous app image can run against the newer schema. Later rollback restores the prior PostgreSQL-compatible app image; do not downgrade/drop schema. During initial SQLite cutover, switching to SQLite is safe only before PostgreSQL accepts new account changes. After reopening traffic, rollback must stay on PostgreSQL so new accounts are retained.

### Loker scanner

The image carries `scanner/` and creates `/app/.scan-data` owned by UID 1001.
`LOKER_SCAN_DATA_DIR` defaults to that path; do not mount it read-only. The
loker tables arrive through `npm run db:migrate` (`002_loker.sql`), like every
other migration. A scan is triggered from the signed-in companion and runs in
the background; no extra service or volume is required.

## Backups and restore drill

Take a daily logical backup, retain at least seven recent copies, and copy one off VPS. A volume or live directory copy is not a logical backup. Protect backup files like credentials; they contain account identities and password hashes.

`sh deploy/backup.sh` creates a dump atomically and retains seven successful dumps under `/srv/lumina-backups`. Add cron using the absolute checkout path, for example `0 2 * * * cd /srv/lumina && sh deploy/backup.sh`. Copy a successful dump to your private off-VPS destination after each backup. Expiry cleanup can run hourly: `0 * * * * cd /srv/lumina && docker compose --env-file .env.production run --rm --no-deps app npm run db:cleanup`.

```sh
umask 077
mkdir -p /srv/lumina-backups
docker compose --env-file .env.production exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "/srv/lumina-backups/lumina-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Before the event, restore to an isolated temporary database, never production:

```sh
docker compose --env-file .env.production exec db createdb -U postgres -O lumina_app lumina_restore_drill
docker compose --env-file .env.production exec -T db pg_restore -U postgres -d lumina_restore_drill --no-owner --no-privileges --role=lumina_app < /srv/lumina-backups/CHOOSE_A_BACKUP.dump
docker compose --env-file .env.production exec db psql -U postgres -d lumina_restore_drill -c 'SET ROLE lumina_app; SELECT count(*) AS users, count(password_hash) AS password_accounts, count(google_sub) AS google_accounts FROM users;'
docker compose --env-file .env.production exec db dropdb -U postgres lumina_restore_drill
```

Compare IDs and password hashes privately with the source and verify app-role access before dropping the drill database. Record restore time. For an actual production restore, stop the app, preserve a fresh pre-restore backup, restore into a new empty app-owned database, switch the app URL, run migrations and test login before reopening traffic. Retain the prior database until verification succeeds; do not run a destructive restore over the live database.

## Proxy trust, logs, and operations

Compose has an internal app-to-database network, a separate internal app-to-proxy network, and app-only outbound network. Caddy cannot reach the database; app egress is required for Google and optional AI services. `TRUST_PROXY=true` is set only for app in this topology. Caddy overwrites client-supplied forwarding values with the observed remote address and sets external host/protocol for HTTPS redirects and Server Action origin checks. App may trust `X-Lumina-Client-IP` only under this setting. Revisit the trust boundary before adding another proxy/CDN.

Caddy access logging is disabled. Its runtime error logger also removes request URI and headers, because reverse-proxy failures can otherwise include OAuth callback codes/state in error logs. Keep app logs metadata-only and never enable body dumps. Compose caps each container's JSON logs at 10 MB x 5 files. Protect the Caddy data volume containing certificates.

The DB health check gates app startup; app health gates proxy startup. Inspect with `docker compose ps` and bounded `docker compose logs --tail=100`; start order alone does not establish database readiness.
