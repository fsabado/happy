# Technologies you will bump into

!!! abstract "Stack snapshot"
    This table is an **orientation map**, not an exhaustive dependency list. When in doubt, open the relevant `package.json` and search the repo.

| Area | Technologies | Why they show up |
|------|----------------|------------------|
| Language | `TypeScript`, `Node.js` (≥20) | Shared typed codebase across CLI, server, and packages; Node is the primary runtime for dev and server. |
| Package / repo | `Yarn` workspaces v1 | Monorepo installs and scripts; root `package.json` wires shortcuts like `yarn web`. |
| Client app | `Expo`, `React Native`, web export | One codebase for iOS, Android, and browser; native builds via EAS in release scripts. |
| Desktop (optional) | `Tauri` | macOS desktop variant — see `happy-app` Tauri scripts in CONTRIBUTING. |
| Server data | `Prisma`, `PGlite` / Postgres | Persistent storage and migrations; standalone mode can embed PGlite (see server README). |
| Realtime | `WebSocket` wire protocol | Documented under `docs/protocol.md`; clients and server speak the same shapes via `happy-wire`. |
| Crypto | Libraries via app/cli (e.g. libsodium family on native) | E2EE boundaries are described in `docs/encryption.md` — read before changing crypto paths. |
| Testing | `Vitest` (server, app, CLI areas) | Fast TS-native tests; run package-specific `test` scripts. |
| Infra (optional) | `Docker`, `Redis`, `S3`/MinIO | Self-hosted server can swap embedded pieces for external Postgres, Redis, object storage (server README + env tables). |

!!! quote "In short"
    Expect TypeScript everywhere, Expo for the UI, Prisma/PGlite on the server, and Vitest when you run tests.
