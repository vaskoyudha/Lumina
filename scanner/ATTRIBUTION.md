# Vendored career-ops engine

`scanner/` is a byte-identical copy of the career-ops engine
(https://github.com/career-ops-hq/career-ops), MIT licensed,
© 2026 Santiago Fernández de Valderrama.

It is vendored from Careevo (`/home/vyns/Documents/github/careevo/engine`)
because Lumina orchestrates the engine as a subprocess rather than
reimplementing its scan rules. Only `scan.mjs` is invoked.

`scanner/portals.yml` is Careevo's Indonesian seed
(`src/lib/career-ops/portals-careevo.yml`), copied write-once into the data
root on first run.

Do not edit files under `scanner/`. Add a new file outside it instead.
