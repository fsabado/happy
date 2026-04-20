# Deploy and related surfaces

!!! abstract "Ship it (carefully)"
    “Deploy” means different things for the **server**, the **mobile/web app**, and the **documentation website**. This page separates them so you do not mix commands.

## Happy Server (self-host)

The server README documents a **Docker** image and required env vars such as `HANDY_MASTER_SECRET`. Embedded **PGlite** and local filesystem storage keep small deployments simple.

```bash
docker build -t happy-server -f Dockerfile .
docker run -p 3005:3005 \
  -e HANDY_MASTER_SECRET=<your-secret> \
  -v happy-data:/data \
  happy-server
```

Deep infra detail: `docs/deployment.md` in this repo.

!!! tip "Architecture"
    For a full walkthrough of runtime, API, sockets, and storage, see the **[Happy Server](happy-server/index.md)** section of this learn site.

## Happy App (stores & OTA)

Production releases use **EAS** workflows defined in `happy-app` (see `package.json` scripts like `release:build:appstore`, `eas update` for OTA). You will need Expo/EAS credentials and Apple/Google setup — not something you can fully reproduce from docs alone.

- Multiple **APP_ENV** variants: development, preview, production.
- **Tauri** build scripts for desktop artifacts.

## Published CLI

End users install `npm install -g happy`. Release automation lives under `scripts/release.cjs` at the monorepo root — read it when you cut versions.

## Public documentation site

User-facing docs at [happy.engineering/docs/](https://happy.engineering/docs/) are edited in a **separate repository** (`slopus.github.io`) per the main README — do not assume this repo’s `docs/` folder is what renders there verbatim.
