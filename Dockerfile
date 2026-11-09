# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.22.2-bookworm-slim

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Migration runner and SQL files are runtime deployment assets.
# Shared TypeScript validation for the Node 24 content seed/import command.
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/content ./src/lib/content
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/simulasi ./src/lib/simulasi
COPY --from=builder --chown=nextjs:nodejs /app/src/data/modul-schema.ts ./src/data/modul-schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
# The vendored scanner and its writable data root. The engine is a child
# process under the same non-root user; it needs read access to `scanner/` and
# write access to `.scan-data`.
COPY --from=builder --chown=nextjs:nodejs /app/scanner ./scanner
# scan.mjs imports js-yaml at runtime. It is a root dependency, but no src/
# module imports it, so standalone tracing omits it. Copy it explicitly.
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules/js-yaml ./node_modules/js-yaml
RUN mkdir -p /app/.scan-data && chown nextjs:nodejs /app/.scan-data
ENV LOKER_SCAN_DATA_DIR=/app/.scan-data
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
