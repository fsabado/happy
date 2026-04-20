---
title: Hub
---

# Learn the Happy codebase

!!! abstract "Coach visual explainer"
    **Happy** is an open-source mobile and web client for Claude Code and Codex, with a CLI wrapper and an encrypted sync server. These pages are a beginner-friendly tour of the repo: how it fits together, what each package does, and how to run and test it locally.

    A static HTML version of the same guide lives at `learn/coach-visual-explainer/` in the repo.

## 1. Your learning plan

Follow this order the first time through. **Each step is its own page** so you can pause between them.

1. **Start here** — Big picture and mental model (5–10 min).
2. **How it works** — CLI, daemon, server, app, and encryption boundaries.
3. **Components** — Monorepo packages and what owns what.
4. **Technologies** — Languages, frameworks, and why they appear.
5. **Glossary** — Terms you will see in docs and code.
6. **Run & develop** — Install, workspaces, and day-to-day commands.
7. **Testing** — Where tests live and common commands.
8. **Deploy** — Server Docker, app releases, and where public docs live.
9. **Happy Server** — Full multi-page guide: runtime, HTTP, WebSockets, DB, security, ops (`happy-server/`).

!!! tip "Coach tip"
    If a word confuses you, jump to [Glossary](glossary.md), then come back. You are not expected to memorize anything on the first pass.

## 2. Topic pages

| Page | Description |
|------|-------------|
| [01 · Start here](start-here.md) | Mental model |
| [02 · How it works](how-it-works.md) | Flow & security |
| [03 · Components](components.md) | Packages |
| [04 · Technologies](technologies.md) | Stack |
| [05 · Glossary](glossary.md) | Jargon |
| [06 · Run & develop](run-and-develop.md) | Setup |
| [07 · Testing](testing.md) | Vitest & more |
| [08 · Deploy](deploy.md) | Server & app |
| [Happy Server — full guide](happy-server/index.md) | Deep dive: `packages/happy-server` (multi-page) |

## 3. How to use this guide

- Use the **left navigation** (or search) to move between topics.
- Cross-check anything critical against the real repo: `docs/`, `README.md`, and `docs/CONTRIBUTING.md`.

---

<small>Theme inspired by Catppuccin Macchiato · Local learning — not a substitute for upstream docs.</small>
