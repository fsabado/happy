# Happy Extension Phase 1 — Implementation Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Surface GLM + OpenRouter in the happy-app agent selector, and add a live statusline (model, tokens, cost, git branch, cwd, active tool, pending approvals, session duration) to the session screen.

**Architecture:** Phase 1 uses no new protocol — the CLI adapters for GLM and OpenRouter are already fully wired in `index.ts` (lines 418–497). The statusline reads from session state already available in `storageTypes.ts` (`Session.metadata`, `Session.latestUsage`, `GitStatus`). Two new React Native components (`StatusTopBar`, `StatusBottomBar`) are added to the session screen. A `useSessionStatus` hook aggregates all fields.

**Tech Stack:** React Native / Expo, TypeScript, NativeWind (Tailwind), existing happy-app state (`storageTypes.ts`, session storage hooks), `react-native-webview` (Phase 3, not this phase).

---

## Context: What Already Exists

Before coding anything, understand the current state:

- **CLI (done):** `packages/happy-cli/src/glm/runGlm.ts` and `packages/happy-cli/src/openrouter/runOpenRouter.ts` fully implemented. `index.ts` dispatch at lines 418–497 registers both commands.
- **App types:** `MachineMetadataSchema` in `storageTypes.ts` already includes `cliAvailability: { glm, openrouter, ... }`. `Session` has `latestUsage`, `metadata.currentModelCode`, `metadata.flavor`, and `gitStatus`.
- **Pattern reference:** `VoiceAssistantStatusBar.tsx` — an existing status bar component. Follow its structure (React.memo, NativeWind classes, tap handler).
- **Session screen:** `packages/happy-app/sources/app/(app)/session/[id].tsx` — add statusline here.

---

## Task 1: Audit GLM + OpenRouter in the App

**Goal:** Confirm whether GLM and OpenRouter already appear in the agent selector after `happy connect glm/openrouter`. If not, identify exactly what's missing.

**Files:**
- Read: `packages/happy-app/sources/app/(app)/new/index.tsx` (1548 lines)
- Read: `packages/happy-app/sources/sync/storageTypes.ts` (lines 131–162, `MachineMetadataSchema`)

**Step 1: Read the agent selector logic**

```bash
grep -n "glm\|openrouter\|cliAvailability\|flavor" \
  packages/happy-app/sources/app/(app)/new/index.tsx | head -40
```

Expected: Either GLM/OpenRouter are already rendered from `cliAvailability`, or there's a hardcoded list that needs updating.

**Step 2: Check CLI availability detection**

```bash
grep -n "glm\|openrouter" \
  packages/happy-cli/src/utils/detectCLI.ts
```

Expected: `glm` and `openrouter` are detected as available CLI commands.

**Step 3: Run a test session (if machine available)**

```bash
cd packages/happy-cli && node dist/index.js glm --help 2>&1 | head -5
```

Record findings before proceeding to Task 2.

---

## Task 2: Surface GLM in App Agent Selector (if not already shown)

> Skip this task if Task 1 confirms GLM already appears in the selector.

**Files:**
- Modify: `packages/happy-app/sources/app/(app)/new/index.tsx`

**Step 1: Find where agents are listed**

```bash
grep -n "claude\|codex\|gemini\|openclaw" \
  packages/happy-app/sources/app/(app)/new/index.tsx | head -20
```

**Step 2: Add GLM to the list**

Follow the exact same pattern used for `codex` or `openclaw`. The entry needs:
- Display name: `"GLM"` or `"GLM-4"`
- flavor value: `"glm"`
- Availability check: `machine.metadata?.cliAvailability?.glm`
- Icon: use existing model icon pattern (or default)

Example pattern (adjust line numbers from Step 1 grep):
```tsx
// After the OpenClaw entry, add:
{machine.metadata?.cliAvailability?.glm && (
  <AgentOption
    flavor="glm"
    label="GLM"
    subtitle="Zhipu AI"
    onSelect={() => setFlavor('glm')}
    selected={flavor === 'glm'}
  />
)}
```

**Step 3: Commit**

```bash
git add packages/happy-app/sources/app/(app)/new/index.tsx
git commit -m "feat(app): add GLM to agent selector"
```

---

## Task 3: Surface OpenRouter in App Agent Selector (if not already shown)

> Skip if Task 1 confirms OpenRouter already appears.

**Files:**
- Modify: `packages/happy-app/sources/app/(app)/new/index.tsx`

**Step 1: Add OpenRouter entry**

Same pattern as Task 2. OpenRouter needs a model input field since it supports 200+ models.

```tsx
{machine.metadata?.cliAvailability?.openrouter && (
  <AgentOption
    flavor="openrouter"
    label="OpenRouter"
    subtitle="200+ models"
    onSelect={() => setFlavor('openrouter')}
    selected={flavor === 'openrouter'}
  />
)}
```

If a model input is needed (user can specify `openai/gpt-4o` etc.), add a `TextInput` that appears when `flavor === 'openrouter'`:

```tsx
{flavor === 'openrouter' && (
  <TextInput
    placeholder="Model ID (e.g. openai/gpt-4o)"
    value={openrouterModel}
    onChangeText={setOpenrouterModel}
    autoCapitalize="none"
    autoCorrect={false}
    style={{ ... }}
  />
)}
```

**Step 2: Pass model to session start**

Find where the new session command is constructed and append `--model <openrouterModel>` when flavor is `openrouter` and a model is provided.

**Step 3: Commit**

```bash
git add packages/happy-app/sources/app/(app)/new/index.tsx
git commit -m "feat(app): add OpenRouter to agent selector with model input"
```

---

## Task 4: Model Cost Rate Table

**Goal:** Create a static lookup table mapping model IDs to per-token costs. Used by the statusline cost display.

**Files:**
- Create: `packages/happy-app/sources/constants/modelRates.ts`

**Step 1: Create the file**

```typescript
// packages/happy-app/sources/constants/modelRates.ts

export interface ModelRate {
  inputPer1k: number   // USD per 1k input tokens
  outputPer1k: number  // USD per 1k output tokens
}

export const MODEL_RATES: Record<string, ModelRate> = {
  // Anthropic
  'claude-opus-4-6':          { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'claude-sonnet-4-6':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-haiku-4-5':         { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'claude-sonnet-4-5':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-3-7-sonnet':        { inputPer1k: 0.003,   outputPer1k: 0.015 },
  // OpenAI
  'gpt-4o':                   { inputPer1k: 0.0025,  outputPer1k: 0.01 },
  'gpt-4o-mini':              { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'o1':                       { inputPer1k: 0.015,   outputPer1k: 0.06 },
  'o3-mini':                  { inputPer1k: 0.0011,  outputPer1k: 0.0044 },
  // Google
  'gemini-2.5-pro':           { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-2.0-flash':         { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  // Zhipu GLM
  'glm-4':                    { inputPer1k: 0.0014,  outputPer1k: 0.0014 },
  'glm-4-flash':              { inputPer1k: 0.00007, outputPer1k: 0.00007 },
}

export function estimateCost(
  modelCode: string,
  inputTokens: number,
  outputTokens: number,
): number | null {
  // Normalize model code: strip date suffixes like -20241022
  const normalized = modelCode.replace(/-\d{8}$/, '')
  const rate = MODEL_RATES[modelCode] ?? MODEL_RATES[normalized]
  if (!rate) return null
  return (inputTokens / 1000) * rate.inputPer1k
       + (outputTokens / 1000) * rate.outputPer1k
}

export function formatCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`   // millicents
  if (usd < 0.01)  return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(3)}`
}
```

**Step 2: Verify the file parses**

```bash
cd packages/happy-app && npx tsc --noEmit 2>&1 | grep modelRates
```

Expected: no errors.

**Step 3: Commit**

```bash
git add packages/happy-app/sources/constants/modelRates.ts
git commit -m "feat(app): add model token cost rate table"
```

---

## Task 5: `useSessionStatus` Hook

**Goal:** A single hook that derives all statusline fields from existing session state.

**Files:**
- Create: `packages/happy-app/sources/hooks/useSessionStatus.ts`
- Read first: `packages/happy-app/sources/sync/storageTypes.ts` (understand `Session`, `GitStatus`, `latestUsage`)

**Step 1: Understand the session state shape**

From `storageTypes.ts`, the `Session` type has:
- `metadata.currentModelCode` — model ID string
- `metadata.flavor` — agent type (`'claude' | 'glm' | 'openrouter' | ...`)
- `metadata.path` — working directory
- `latestUsage` — `{ input: number, output: number, cacheRead?: number }` or similar
- `gitStatus` — `GitStatus` with `branch`, `isDirty`, `modified`, etc.
- `createdAt` — session start timestamp
- `thinking` — boolean (agent is currently thinking)
- `todos` — pending approval items

Check exact field names:
```bash
grep -n "latestUsage\|gitStatus\|createdAt\|thinking\|todos\|permissionMode" \
  packages/happy-app/sources/sync/storageTypes.ts
```

**Step 2: Find how session state is accessed in existing components**

```bash
grep -rn "useSession\|session\." \
  packages/happy-app/sources/components/ChatHeaderView.tsx | head -20
grep -rn "useSession\|getSession\|session\b" \
  packages/happy-app/sources/app/(app)/session/\[id\].tsx | head -20
```

Use the same pattern for accessing session state in the hook.

**Step 3: Create the hook**

```typescript
// packages/happy-app/sources/hooks/useSessionStatus.ts
import { useMemo } from 'react'
import { estimateCost, formatCost } from '../constants/modelRates'

export interface SessionStatus {
  // Top bar
  modelCode: string | null
  flavor: string | null
  cwd: string | null
  branch: string | null
  isDirty: boolean
  // Bottom bar
  activeTool: string | null
  inputTokens: number
  outputTokens: number
  costDisplay: string | null   // formatted, e.g. "$0.012"
  durationSecs: number
  pendingApprovals: number
  isThinking: boolean
}

export function useSessionStatus(session: any /* Session type */): SessionStatus {
  return useMemo(() => {
    const metadata = session?.metadata ?? {}
    const gitStatus = session?.gitStatus ?? null
    const usage = session?.latestUsage ?? { input: 0, output: 0 }
    const todos = session?.todos ?? []
    const pendingApprovals = todos.filter((t: any) => t.status === 'pending').length

    // Duration
    const createdAt = session?.createdAt ?? Date.now()
    const durationSecs = Math.floor((Date.now() - createdAt) / 1000)

    // Cost
    const modelCode = metadata.currentModelCode ?? null
    const rawCost = modelCode
      ? estimateCost(modelCode, usage.input ?? 0, usage.output ?? 0)
      : null
    const costDisplay = rawCost != null ? formatCost(rawCost) : null

    // Active tool — derived from last message tool_use (Phase 2 will get this from events)
    // For now, show 'thinking' when agent is thinking
    const activeTool = session?.thinking ? 'thinking' : null

    return {
      modelCode,
      flavor: metadata.flavor ?? null,
      cwd: metadata.path ?? null,
      branch: gitStatus?.branch ?? null,
      isDirty: gitStatus?.isDirty ?? false,
      activeTool,
      inputTokens: usage.input ?? 0,
      outputTokens: usage.output ?? 0,
      costDisplay,
      durationSecs,
      pendingApprovals,
      isThinking: session?.thinking ?? false,
    }
  }, [session])
}

export function formatDuration(secs: number): string {
  if (secs < 60)   return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m${secs % 60}s`
  return `${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}
```

**Step 4: Verify no type errors**

```bash
cd packages/happy-app && npx tsc --noEmit 2>&1 | grep useSessionStatus
```

**Step 5: Commit**

```bash
git add packages/happy-app/sources/hooks/useSessionStatus.ts
git commit -m "feat(app): add useSessionStatus hook for statusline data"
```

---

## Task 6: `StatusTopBar` Component

**Goal:** Top status bar showing model, git branch, and cwd.

**Files:**
- Create: `packages/happy-app/sources/components/StatusTopBar.tsx`
- Reference: `packages/happy-app/sources/components/VoiceAssistantStatusBar.tsx` (follow its structure)

**Step 1: Check theme tokens used by VoiceAssistantStatusBar**

```bash
grep -n "className\|style\|color\|bg-\|text-" \
  packages/happy-app/sources/components/VoiceAssistantStatusBar.tsx | head -20
```

Use the same NativeWind class names and theme tokens.

**Step 2: Create the component**

```tsx
// packages/happy-app/sources/components/StatusTopBar.tsx
import React, { memo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { StyledText } from './StyledText'
import type { SessionStatus } from '../hooks/useSessionStatus'

interface Props {
  status: SessionStatus
  onPress?: (field: 'model' | 'branch' | 'cwd') => void
}

export const StatusTopBar = memo(function StatusTopBar({ status, onPress }: Props) {
  const { modelCode, branch, isDirty, cwd } = status

  // Truncate cwd: show last 2 path segments
  const shortCwd = cwd
    ? cwd.replace(/^\/home\/[^/]+/, '~').split('/').slice(-2).join('/')
    : null

  const branchLabel = branch
    ? isDirty ? `${branch}*` : branch
    : null

  return (
    <View className="flex-row items-center px-3 py-1 gap-2 bg-surface border-b border-border">
      {modelCode && (
        <TouchableOpacity onPress={() => onPress?.('model')} hitSlop={8}>
          <StyledText className="text-xs text-muted font-mono" numberOfLines={1}>
            {modelCode}
          </StyledText>
        </TouchableOpacity>
      )}
      {branchLabel && (
        <>
          <StyledText className="text-xs text-muted">·</StyledText>
          <TouchableOpacity onPress={() => onPress?.('branch')} hitSlop={8}>
            <StyledText
              className={`text-xs font-mono ${isDirty ? 'text-warning' : 'text-muted'}`}
              numberOfLines={1}
            >
              {branchLabel}
            </StyledText>
          </TouchableOpacity>
        </>
      )}
      {shortCwd && (
        <>
          <StyledText className="text-xs text-muted">·</StyledText>
          <TouchableOpacity
            onPress={() => onPress?.('cwd')}
            hitSlop={8}
            className="flex-1"
          >
            <StyledText className="text-xs text-muted font-mono" numberOfLines={1}>
              {shortCwd}
            </StyledText>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
})
```

**Step 3: Verify no type errors**

```bash
cd packages/happy-app && npx tsc --noEmit 2>&1 | grep StatusTopBar
```

**Step 4: Commit**

```bash
git add packages/happy-app/sources/components/StatusTopBar.tsx
git commit -m "feat(app): add StatusTopBar component"
```

---

## Task 7: `StatusBottomBar` Component

**Goal:** Bottom status bar showing active tool, tokens, cost, duration, pending approvals.

**Files:**
- Create: `packages/happy-app/sources/components/StatusBottomBar.tsx`

**Step 1: Create the component**

```tsx
// packages/happy-app/sources/components/StatusBottomBar.tsx
import React, { memo, useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { StyledText } from './StyledText'
import type { SessionStatus } from '../hooks/useSessionStatus'
import { formatDuration, formatTokens } from '../hooks/useSessionStatus'

interface Props {
  status: SessionStatus
  onPressApprovals?: () => void
  onPressTokens?: () => void
}

export const StatusBottomBar = memo(function StatusBottomBar({
  status,
  onPressApprovals,
  onPressTokens,
}: Props) {
  const {
    activeTool,
    inputTokens,
    outputTokens,
    costDisplay,
    durationSecs: initialDuration,
    pendingApprovals,
    isThinking,
  } = status

  // Live duration counter — ticks every second
  const [elapsed, setElapsed] = useState(initialDuration)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  // Reset when session changes
  useEffect(() => { setElapsed(initialDuration) }, [initialDuration])

  const totalTokens = inputTokens + outputTokens

  return (
    <View className="flex-row items-center justify-between px-3 py-1 bg-surface border-t border-border">
      {/* Left: active tool */}
      <View className="flex-row items-center gap-1">
        {activeTool ? (
          <StyledText className="text-xs text-accent font-mono" numberOfLines={1}>
            ↳ {activeTool}
          </StyledText>
        ) : (
          <StyledText className="text-xs text-muted">idle</StyledText>
        )}
      </View>

      {/* Right: tokens · cost · duration · approvals */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity onPress={onPressTokens} hitSlop={8}>
          <StyledText className="text-xs text-muted font-mono">
            {formatTokens(totalTokens)} tok
          </StyledText>
        </TouchableOpacity>

        {costDisplay && (
          <>
            <StyledText className="text-xs text-muted">·</StyledText>
            <StyledText className="text-xs text-muted font-mono">
              {costDisplay}
            </StyledText>
          </>
        )}

        <StyledText className="text-xs text-muted">·</StyledText>
        <StyledText className="text-xs text-muted font-mono">
          {formatDuration(elapsed)}
        </StyledText>

        {pendingApprovals > 0 && (
          <>
            <StyledText className="text-xs text-muted">·</StyledText>
            <TouchableOpacity onPress={onPressApprovals} hitSlop={8}>
              <StyledText className="text-xs text-warning font-mono">
                △ {pendingApprovals}
              </StyledText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
})
```

**Step 2: Verify no type errors**

```bash
cd packages/happy-app && npx tsc --noEmit 2>&1 | grep StatusBottomBar
```

**Step 3: Commit**

```bash
git add packages/happy-app/sources/components/StatusBottomBar.tsx
git commit -m "feat(app): add StatusBottomBar component"
```

---

## Task 8: Wire Statusline into Session Screen

**Goal:** Add `StatusTopBar` and `StatusBottomBar` to the session screen.

**Files:**
- Modify: `packages/happy-app/sources/app/(app)/session/[id].tsx`

**Step 1: Read the session screen**

```bash
head -100 "packages/happy-app/sources/app/(app)/session/[id].tsx"
grep -n "return\|View\|ChatList\|VoiceAssistant\|header\|footer" \
  "packages/happy-app/sources/app/(app)/session/[id].tsx" | head -30
```

**Step 2: Find the session object**

```bash
grep -n "session\b\|useSession\|sessionId" \
  "packages/happy-app/sources/app/(app)/session/[id].tsx" | head -20
```

**Step 3: Add the statusline**

At the top of the component:
```tsx
import { StatusTopBar } from '../../../components/StatusTopBar'
import { StatusBottomBar } from '../../../components/StatusBottomBar'
import { useSessionStatus } from '../../../hooks/useSessionStatus'
```

Inside the component (after the session object is available):
```tsx
const status = useSessionStatus(session)
```

In the JSX, wrap the existing content:
```tsx
<View className="flex-1">
  <StatusTopBar
    status={status}
    onPress={(field) => {
      // TODO: show detail sheet
    }}
  />

  {/* existing chat list / messages */}
  <ChatList ... />

  <StatusBottomBar
    status={status}
    onPressApprovals={() => {
      // scroll to or highlight pending approval messages
    }}
    onPressTokens={() => {
      // TODO: show token detail sheet
    }}
  />
</View>
```

**Step 4: Test on web**

```bash
cd packages/happy-app && npx expo start --web
```

Open a session. Confirm:
- StatusTopBar appears at top with model name, branch, cwd
- StatusBottomBar appears at bottom with tokens, cost, duration
- No layout breaks on narrow and wide viewports

**Step 5: Commit**

```bash
git add "packages/happy-app/sources/app/(app)/session/[id].tsx"
git commit -m "feat(app): integrate statusline bars into session screen"
```

---

## Task 9: Statusline Detail Sheets (tap to expand)

**Goal:** Tapping a statusline item opens a bottom sheet with full detail.

**Files:**
- Create: `packages/happy-app/sources/components/StatusDetailSheet.tsx`
- Modify: `packages/happy-app/sources/app/(app)/session/[id].tsx`

**Step 1: Find the existing bottom sheet pattern**

```bash
grep -rn "BottomSheet\|bottomSheet\|modal\|sheet" \
  packages/happy-app/sources/components/ | grep -v ".test." | head -10
```

Use whatever bottom sheet library/component is already in use.

**Step 2: Create the detail sheet**

```tsx
// packages/happy-app/sources/components/StatusDetailSheet.tsx
import React from 'react'
import { View, ScrollView } from 'react-native'
import { StyledText } from './StyledText'
import type { SessionStatus } from '../hooks/useSessionStatus'
import { formatTokens, formatDuration } from '../hooks/useSessionStatus'

type Field = 'model' | 'branch' | 'cwd' | 'tokens' | 'approvals'

interface Props {
  field: Field | null
  status: SessionStatus
  onClose: () => void
}

export function StatusDetailSheet({ field, status, onClose }: Props) {
  if (!field) return null

  return (
    <View className="p-4 gap-3">
      {field === 'tokens' && (
        <>
          <StyledText className="text-sm font-semibold">Token Usage</StyledText>
          <Row label="Input"  value={formatTokens(status.inputTokens)} />
          <Row label="Output" value={formatTokens(status.outputTokens)} />
          <Row label="Total"  value={formatTokens(status.inputTokens + status.outputTokens)} />
          {status.costDisplay && (
            <Row label="Est. cost" value={status.costDisplay} />
          )}
        </>
      )}
      {field === 'branch' && (
        <>
          <StyledText className="text-sm font-semibold">Git Status</StyledText>
          <Row label="Branch" value={status.branch ?? 'unknown'} />
          <Row label="Dirty"  value={status.isDirty ? 'Yes' : 'No'} />
        </>
      )}
      {field === 'cwd' && (
        <>
          <StyledText className="text-sm font-semibold">Working Directory</StyledText>
          <StyledText className="text-xs font-mono text-muted">{status.cwd}</StyledText>
        </>
      )}
      {field === 'model' && (
        <>
          <StyledText className="text-sm font-semibold">Model</StyledText>
          <Row label="Model"  value={status.modelCode ?? 'unknown'} />
          <Row label="Agent"  value={status.flavor ?? 'unknown'} />
          <Row label="Uptime" value={formatDuration(status.durationSecs)} />
        </>
      )}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <StyledText className="text-xs text-muted">{label}</StyledText>
      <StyledText className="text-xs font-mono">{value}</StyledText>
    </View>
  )
}
```

**Step 3: Wire into session screen**

Add state for which field is open:
```tsx
const [detailField, setDetailField] = useState<'model' | 'branch' | 'cwd' | 'tokens' | 'approvals' | null>(null)
```

Pass to StatusTopBar:
```tsx
<StatusTopBar
  status={status}
  onPress={(field) => setDetailField(field)}
/>
```

Render the sheet (use existing modal/bottom-sheet pattern):
```tsx
<StatusDetailSheet
  field={detailField}
  status={status}
  onClose={() => setDetailField(null)}
/>
```

**Step 4: Commit**

```bash
git add packages/happy-app/sources/components/StatusDetailSheet.tsx
git add "packages/happy-app/sources/app/(app)/session/[id].tsx"
git commit -m "feat(app): add statusline detail sheets for tap-to-expand"
```

---

## Task 10: End-to-End Test

**Goal:** Verify everything works together in a live session.

**Step 1: Start a session via GLM or OpenRouter**

```bash
# Ensure API key is set
export ZHIPU_API_KEY=your_key_here
cd packages/happy-cli
node dist/index.js glm
```

**Step 2: Open the web app and navigate to the session**

```bash
cd packages/happy-app && npx expo start --web
```

Confirm:
- [ ] GLM / OpenRouter appear in the agent selector on the "New Session" screen
- [ ] StatusTopBar shows model name, git branch, cwd
- [ ] StatusBottomBar shows token count, cost estimate, elapsed time
- [ ] Pending approvals badge (`△ N`) appears when agent requests permission
- [ ] Tapping a statusline item opens the correct detail sheet
- [ ] Duration counter ticks live (updates every second)
- [ ] No layout issues on mobile-sized viewport (375px wide)

**Step 3: Commit any fixes found during testing**

---

## Summary

| Task | Files | Estimated Size |
|---|---|---|
| 1: Audit GLM/OpenRouter in app | read-only | — |
| 2: Surface GLM in selector | `new/index.tsx` | ~10 lines |
| 3: Surface OpenRouter in selector | `new/index.tsx` | ~20 lines |
| 4: Cost rate table | new `modelRates.ts` | ~50 lines |
| 5: `useSessionStatus` hook | new `useSessionStatus.ts` | ~70 lines |
| 6: `StatusTopBar` component | new `StatusTopBar.tsx` | ~60 lines |
| 7: `StatusBottomBar` component | new `StatusBottomBar.tsx` | ~80 lines |
| 8: Wire into session screen | `[id].tsx` | ~15 lines |
| 9: Detail sheets | new `StatusDetailSheet.tsx` + `[id].tsx` | ~70 lines |
| 10: E2E test | — | — |

Total new code: ~375 lines across 6 new files + 3 modified files.

---

## Phase 2 Preview (not in scope here)

Once Phase 1 ships, replace the `useSessionStatus` hook's data sources:
- `activeTool`: currently `session.thinking` → becomes `tool.start` event
- Token counts: currently `session.latestUsage` → becomes `token.usage` event
- Git status: currently `session.gitStatus` → becomes `vcs.updated` event

No UI changes required — just swap the hook's internals.

See `docs/plans/2026-04-02-happy-extension-design.md` for Phase 2 and Phase 3 design.
