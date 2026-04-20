# What is this repo, really?

!!! abstract "Big picture first"
    You are looking at **Happy** — tooling that lets you run AI coding agents (like Claude Code or Codex) from a terminal wrapper, then **continue or supervise** the same work from a phone or browser. The server mostly moves **encrypted blobs** between your devices; it is not meant to read your code.

!!! success "TL;DR"
    Happy = CLI wrapper + local daemon + encrypted sync server + Expo/React Native app (and shared protocol code). Your keys stay on your machines; the cloud relay coordinates without reading message content.

## A · Analogy

Think of the **Happy Server** like a **locked courier locker** in a train station. You put sealed boxes in, other devices pick sealed boxes up. The station does not have your key to open the boxes — it only routes them. **In short:** sync without trusting the relay with plaintext.

## B · Mini glossary (preview)

These terms appear everywhere — the full [Glossary](glossary.md) goes deeper.

| Term | Meaning |
|------|---------|
| **Monorepo** | One git repository with multiple packages (folders under `packages/`) managed together. |
| **Workspace** | Yarn workspaces link those packages so one install and shared tooling work across them. |
| **E2EE** | End-to-end encryption: data is encrypted before it leaves your device; only your devices can decrypt. |
| **Daemon** | A background process on your computer that keeps sessions reachable for remote control. |

## C · Who uses what?

| Role | Typical touchpoints |
|------|---------------------|
| End user | `npm i -g happy`, mobile app, web app |
| Contributor (you) | `yarn install`, `packages/happy-*`, `docs/` |
| Self-hoster | `happy-server` Docker, env vars, `localhost:3005` |

## D · FAQ

??? question "Do I need to clone the repo to use Happy?"
    No. Users install the published CLI and apps. You clone when you want to study or change the source.

??? question "Is this the same as Claude Code?"
    Claude Code is Anthropic’s agent. Happy is a **client and sync layer** around agents like Claude Code or Codex — not a replacement for them.

??? question "Where is the “official” internal documentation?"
    The `docs/` folder in this repo (protocol, API, encryption, deployment). Public user docs live on [happy.engineering](https://happy.engineering/docs/).
