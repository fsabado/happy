# Run and develop locally

!!! abstract "From zero to hacking"
    Here is the **happy path** from clone to a working dev environment. Commands are copied from `docs/CONTRIBUTING.md` — if something drifts, trust the repo.

## Prerequisites

- **Node.js ≥ 20** — LTS is a good choice.
- **Yarn 1.x** — `npm install -g yarn`; root declares `yarn@1.22.22`.
- **Git** — for clone, branches, PRs.

## Clone and install

```bash
git clone https://github.com/slopus/happy.git
cd happy
yarn install
```

The root `postinstall` script may run extra setup — let it finish.

## Happy App (Expo)

```bash
yarn workspace happy-app start
yarn web
yarn workspace happy-app ios:dev
yarn workspace happy-app android:dev
yarn workspace happy-app typecheck
```

Use `yarn web` from the root as a shortcut for the web dev server.

## Happy CLI

```bash
yarn workspace happy build
yarn workspace happy test
yarn workspace happy dev
```

For a **global** `happy-dev` symlink without replacing published `happy`, use `yarn link:dev` inside `packages/happy-cli` per CONTRIBUTING.

## Happy Server (local)

```bash
yarn workspace happy-server standalone:dev
```

Listens on **localhost:3005** by default. To point the app at it:

```bash
EXPO_PUBLIC_HAPPY_SERVER_URL=http://localhost:3005 yarn workspace happy-app start
```

## Desktop (macOS Tauri)

```bash
yarn workspace happy-app tauri:dev
```

!!! warning "Note"
    Tauri workflows are for macOS contributors — skip on Linux/WSL if you only need mobile/web/server.
