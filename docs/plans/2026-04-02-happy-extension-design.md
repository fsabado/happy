# Happy Extension — Design Document

**Date:** 2026-04-02
**Status:** Approved
**Approach:** Ship quick wins first (Phase 1), then migrate to typed event bus (Phase 2), then interactive HTML rendering (Phase 3).

---

## Background

Happy is a fork of [slopus/happy](https://github.com/slopus/happy) — the only open-source, store-published (App Store + Play Store), end-to-end encrypted mobile + web bridge for AI coding agents. We own the full stack and diverge freely.

**Current support:** Claude Code, OpenAI Codex, Gemini CLI, OpenClaw
**Tech:** React Native / Expo (happy-app), Node.js (happy-cli, happy-server), TypeScript

### Research basis

All design decisions are informed by deep analysis of:
- `~/src/opencode` — typed event bus, statusline pattern, session metadata
- `~/src/openclaw` — skills platform, channel routing, canvas, cron/webhooks
- `~/src/pi-mono` — unified LLM API (`pi-ai`), agent runtime (`pi-agent-core`), web UI components (`pi-web-ui`)
- `~/src/happy/packages/happy-cli/src/` — existing GLM + OpenRouter stubs

Full analysis docs: `~/src/github-notes/`

---

## Goals

1. **Full remote control** from web and mobile — monitor, review diffs, approve tool calls, kick off tasks, manage multiple sessions
2. **GLM + OpenRouter support** — surface already-stubbed adapters
3. **Statusline** — model, tokens, cost, git branch, cwd, active tool, pending approvals, session duration visible at a glance
4. **Interactive HTML rendering** — agent-generated HTML artifacts rendered inline, fully tappable/interactive
5. **Architecture** — event-bus foundation that makes every future feature clean

---

## Non-Goals (this version)

- Plugin / skills marketplace
- Multi-channel messaging (Slack, Telegram, etc.)
- Cron scheduler / webhook ingress
- Voice mode
- Canvas workspace
- LSP integration

---

## Phase 1 — Quick Wins

### 1A: GLM + OpenRouter Agent Support

**What exists:** `packages/happy-cli/src/glm/` and `packages/happy-cli/src/openrouter/` directories already present alongside working `claude/`, `codex/`, `gemini/` adapters.

**Work:**
1. Audit existing stubs against the working adapter pattern:
   ```
   src/<agent>/
     index.ts     ← start agent process, hook into happy bridge
     parser.ts    ← parse agent stdout → happy message format
     config.ts    ← API key / auth config
   ```
2. Complete missing pieces in `src/glm/` and `src/openrouter/`
3. Wire into CLI command dispatch:
   - `happy glm` → GLM-4 via Zhipu AI
   - `happy openrouter <model>` → any model via OpenRouter
4. Auth:
   - GLM: `ZHIPUAI_API_KEY`, OpenAI-compatible endpoint (`https://open.bigmodel.cn/api/paas/v4/`)
   - OpenRouter: `OPENROUTER_API_KEY`, OpenAI-compatible endpoint (`https://openrouter.ai/api/v1`)
   - Both are API-key-only — no OAuth needed
5. Add GLM + OpenRouter to agent selector in happy-app (same dropdown as Claude/Codex/Gemini)

**Reference:** `packages/happy-cli/src/gemini/` (simplest working adapter — use as template)

---

### 1B: Statusline

Add a persistent two-zone status bar to the session screen. No new protocol — reads from state already available in happy-app.

**Data sources:**

| Field | Source |
|---|---|
| Model name | session config |
| Token usage | parsed from agent output stream |
| Estimated cost | token count × model rate table |
| Git branch | parsed from agent output / shell command |
| Uncommitted changes | `*` suffix on branch when dirty |
| Current working directory | session metadata |
| Active tool | last tool event in message stream |
| Pending approvals | approval queue length |
| Session duration | `Date.now() - session.startedAt` |

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  claude-sonnet-4-5  ·  main*  ·  ~/src/myproject        │  ← StatusTopBar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [chat messages]                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ↳ bash  ·  1,240 tok  ·  $0.003  ·  0:42  ·  △ 2     │  ← StatusBottomBar
└─────────────────────────────────────────────────────────┘
```

**Top bar:** model name, git branch (`*` = dirty), cwd (truncated)
**Bottom bar:** active tool (with `↳` prefix), tokens, cost, elapsed time, pending approvals (`△ N` in amber when > 0)

**Interactions:**
- Tap any field → detail sheet (full token breakdown, full path, approval list)
- `△ N` badge pulses when new approval arrives

**Components:**
- `StatusTopBar.tsx` — new component
- `StatusBottomBar.tsx` — new component
- `useSessionStatus.ts` — hook aggregating all status fields from existing session state
- Both render on web and mobile via Expo (single codebase)

**Cost rate table:** store as `src/constants/modelRates.ts` — map of model ID → `{ inputPer1k, outputPer1k }`. Updatable without app release.

---

## Phase 2 — Typed Event Bus (Architecture Refactor)

**Trigger:** After Phase 1 ships. Refactor the bridge protocol when the polling/parsing approach shows its limits.

**Pattern:** Adopt opencode's proven SSE event bus — every state change is a typed event; all clients are pure subscribers.

```typescript
// happy-server emits over encrypted bridge:
{ type: "session.status",    properties: { model, cwd, branch, dirty, ahead, behind } }
{ type: "token.usage",       properties: { input, output, total, cost } }
{ type: "tool.executing",    properties: { name, args, startedAt } }
{ type: "tool.completed",    properties: { name, duration, exitCode } }
{ type: "permission.asked",  properties: { id, tool, command, cwd } }
{ type: "permission.replied",properties: { id, approved } }
{ type: "artifact.html",     properties: { id, html, title, interactive } }
{ type: "vcs.updated",       properties: { branch, dirty, ahead, behind } }
{ type: "session.idle",      properties: { id } }
{ type: "session.end",       properties: { id, summary } }
```

**Migration path:**
- Phase 1 statusline parses agent stdout (tactical, works now)
- Phase 2 replaces parsing with event subscriptions (clean, extensible)
- No UI changes required — `useSessionStatus` hook just changes its data source

**Reference:** `~/src/opencode/packages/opencode/src/bus/index.ts`

---

## Phase 3 — Interactive HTML Rendering

**Depends on:** Phase 2 event bus (`artifact.html` event)

### Mobile (React Native)

When `artifact.html` event arrives:
- Render inline in chat as a tappable preview card (height-constrained)
- Tap → expand to full-screen `WebView` (`react-native-webview`)
- HTML injected directly into WebView via `injectedJavaScript` + `source.html`
- `postMessage` bridge for agent↔UI two-way communication
- "Open full screen" / "Share" / "Download" actions in header

### Web

When `artifact.html` event arrives:
- Render inline as sandboxed `<iframe>` (CSP restricted)
- Side panel for wide viewports (same as pi-web-ui ChatPanel)
- Full-screen overlay for narrow viewports

### Security (both platforms)

Adopt pi-web-ui's `SandboxedIframe` + `RuntimeMessageRouter` pattern:
- CSP: `sandbox="allow-scripts"` — no top navigation, no form submission, no same-origin
- `postMessage` origin filtering — only accept messages from known artifact IDs
- No access to device APIs, local storage, or cookies
- Console capture: inject `ConsoleRuntimeProvider` to surface `console.log` in chat

**Reference:**
- `~/src/pi-mono/packages/web-ui/src/components/SandboxedIframe.ts`
- `~/src/pi-mono/packages/web-ui/src/tools/artifacts/HtmlArtifact.ts`

---

## Future Considerations (not in scope)

These were identified during research but deferred:

| Feature | Source to study | When |
|---|---|---|
| Skills system | `~/src/openclaw/skills/` + `SKILL.md` pattern | After Phase 3 |
| Cron scheduler | `~/src/openclaw/src/cron/` | After Phase 3 |
| Webhook ingress | `~/src/openclaw/src/hooks/` | After Phase 3 |
| Multi-channel (Slack, Telegram) | `~/src/openclaw/src/channels/` | v2 |
| Canvas workspace | `~/src/openclaw/src/canvas-host/` | v2 |
| Voice mode | `~/src/openclaw/src/gateway/voicewake.ts` | v2 |
| MCP bidirectional bridge | `~/src/openclaw/src/mcp/` | After Phase 2 |
| pi-agent-core session management | `~/src/pi-mono/packages/agent/` | After Phase 2 |
| Security audit | `~/src/openclaw/src/infra/security-audit.ts` | After Phase 2 |

---

## File Map (happy repo)

```
packages/
  happy-cli/src/
    glm/              ← Phase 1A: complete existing stub
    openrouter/       ← Phase 1A: complete existing stub
  happy-app/sources/
    components/
      StatusTopBar.tsx       ← Phase 1B: new
      StatusBottomBar.tsx    ← Phase 1B: new
      ArtifactView.tsx       ← Phase 3: new (inline card)
      ArtifactFullScreen.tsx ← Phase 3: new (full-screen WebView)
    hooks/
      useSessionStatus.ts    ← Phase 1B: new (Phase 2: swap data source)
    constants/
      modelRates.ts          ← Phase 1B: new (token cost table)
```

---

## Success Criteria

| Phase | Done when |
|---|---|
| 1A | `happy glm` and `happy openrouter gpt-4o` start sessions visible in the mobile app |
| 1B | Statusline visible on session screen (web + mobile) with all 8 fields live |
| 2 | Bridge protocol emits typed events; statusline hook reads events not parsed stdout |
| 3 | Agent-generated HTML renders in chat; user can tap and interact with it on mobile |
