# Observability & deployment

## Health

HTTP routes include **health checks** (see **`enableMonitoring`** / routes) — **`docs/backend-architecture.md`** references **`/health`** for DB connectivity.

## Metrics

- **Dedicated metrics server** — `startMetricsServer()` from **`sources/app/monitoring/metrics.ts`**.
- **Prometheus-style** **`/metrics`** endpoint.
- **HTTP** request counters / histograms via Fastify hooks (`enableMonitoring`).
- **WebSocket** connection gauges and event counters — **`metrics2.ts`**.

Scrape metrics from your orchestration layer (Prometheus, Grafana Agent, etc.).

## Logging

**`sources/utils/log.ts`** — structured logging used across API and WebSocket. Tune log level via env if supported in your deployment.

## Docker (self-host)

From **`packages/happy-server/README.md`**:

```bash
docker build -t happy-server -f Dockerfile .
docker run -p 3005:3005 \
  -e HANDY_MASTER_SECRET=<your-secret> \
  -v happy-data:/data \
  happy-server
```

- **PGlite** + local files inside **`/data`** — no mandatory Postgres/Redis/S3.
- **`PUBLIC_URL`** — must reflect how clients reach the server for generated file URLs.

Optional external **`DATABASE_URL`**, **`REDIS_URL`**, **`S3_*`** — see README table.

**Deeper infra:** **`docs/deployment.md`**.

## GitHub Actions (if you fork the site repo)

The **documentation website** (`happy.engineering`) is built from **`slopus/slopus.github.io`** (Next.js + Nextra), **not** from `happy-server` alone. This package ships as **container** or **Node process** on your infra.

## Production checklist (conceptual)

| Item | Why |
|------|-----|
| Strong **`HANDY_MASTER_SECRET`** | Root of server-side crypto |
| **TLS** at edge | Protect tokens in transit |
| **Backups** of Postgres / PGlite volume | Data durability |
| **Resource limits** | WebSocket memory scales with connections |
| **Version** endpoint | Clients call **`POST /v1/version`** — keep compatibility in mind |

## Tests

```bash
yarn workspace happy-server test
```

**Vitest** — add tests when changing sync, auth, or storage invariants.

---

**Previous:** [← Security](05-security-and-confidentiality.md) · **Back to:** [Overview →](index.md)
