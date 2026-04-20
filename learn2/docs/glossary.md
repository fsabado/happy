# Glossary

!!! abstract "Definitions first"
    **Use this page as a dictionary** while you read code and docs. If we use a term in other learn pages, it should appear here.

## Core product { #core }

Happy
:   Open-source **client + CLI + sync server** for using AI coding agents (e.g. Claude Code, Codex) from multiple devices with encrypted sync.

Claude Code / Codex
:   Third-party **agent CLIs** that Happy wraps — Happy is not a replacement for them.

Happy CLI (`happy`)
:   The published command-line tool in `packages/happy-cli`; starts sessions, manages daemon/auth, wraps agents.

Daemon
:   Background process on your machine so **remote clients** can interact with sessions without a foreground terminal always open.

## Repository & build { #repo }

Monorepo
:   Single repository containing multiple publishable or private packages under `packages/`.

Yarn workspace
:   Yarn feature linking workspaces so `yarn install` at the root installs all package dependencies.

Workspace package
:   One of `happy-app`, `happy-cli` (named `happy`), `happy-server`, etc.

EAS (Expo Application Services)
:   Cloud builds and OTA updates for Expo apps — see release scripts in `happy-app/package.json`.

Tauri
:   Framework used for optional **macOS desktop** builds of the app.

## Security & sync { #security }

E2EE (end-to-end encryption)
:   Encryption on the client so the **server relays ciphertext** without reading content — see `docs/encryption.md`.

Wire protocol
:   Message formats and rules for WebSocket communication — `docs/protocol.md`.

happy-wire
:   Shared **types/schemas** for protocol payloads between clients and server.

Session protocol
:   Encrypted chat/event protocol unifying client behavior — see `docs/session-protocol.md`.

## Runtime & operations { #runtime }

PGlite
:   Embedded Postgres used in **standalone** server deployments without an external database.

Prisma
:   ORM and migration tool used by the server for schema management.

Standalone mode
:   Server entry that bundles storage suitable for single-container/self-host setups — `standalone:dev` for local dev.

Vitest
:   Test runner used across packages for unit/integration tests in TypeScript.
