#!/bin/sh
set -eu
umask 077

cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
backup_dir=${LUMINA_BACKUP_DIR:-/srv/lumina-backups}
case "$backup_dir" in /*) ;; *) echo 'Backup directory must be absolute.' >&2; exit 1 ;; esac
mkdir -p "$backup_dir"
backup_file="$backup_dir/lumina-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f -- "$backup_file.partial"' EXIT HUP INT TERM
docker compose --env-file .env.production exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file.partial"
test -s "$backup_file.partial"
mv -- "$backup_file.partial" "$backup_file"
# These names are generated above; keep the seven most recent successful dumps.
ls -1t "$backup_dir"/lumina-*.dump | tail -n +8 | while IFS= read -r old_backup; do
  rm -f -- "$old_backup"
done
printf 'Backup created: %s\n' "$backup_file"
