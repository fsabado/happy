# Packages and what they own

!!! abstract "Monorepo map"
    The repository root is a **Yarn workspaces monorepo**. Each package below has its own `package.json`.

### happy-app — Mobile + web client

**Expo / React Native** UI, web via Expo, optional **Tauri** for macOS desktop. This is what users tap and see.

`packages/happy-app`

### happy-cli — CLI (published as `happy`)

Wraps **Claude Code**, **Codex**, and other agents; starts sessions, QR pairing, **daemon** integration.

`packages/happy-cli`

### happy-server — Backend relay

**HTTP + WebSocket**; stores ciphertext and routes real-time updates. Can run embedded **PGlite** or external DB.

`packages/happy-server`

### happy-agent — Remote agent tooling

CLI for creating, sending, and monitoring remote sessions (see package README for commands).

`packages/happy-agent`

### happy-wire — Shared protocol types

Schemas and types shared between clients and server so payloads stay **consistent**.

`packages/happy-wire`

### happy-app-logs — App log tooling

Helper package for log workflows (see root script `app-logs`).

`packages/happy-app-logs`

!!! note "Also explore"
    **`docs/`** for protocol and architecture; **`environments/`** for local dev environment orchestration; **`scripts/`** for release and postinstall hooks.

## Root shortcuts (from `package.json`)

| Script | Points at |
|--------|-----------|
| `yarn web` | `happy-app` web dev |
| `yarn cli` | `workspace happy cli` |
| `yarn env:*` | Environment manager under `environments/` |
