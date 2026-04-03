# Happy Extension Implementation Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Add GLM + OpenRouter agent support and a live statusline (model, tokens, cost, git branch, cwd, active tool, pending approvals, session duration) to happy's web and mobile UI.

**Architecture:** Phase 1 is additive — wire the existing CLI stubs into the app's agent selector, and add two new StatusBar components that derive their state from the existing sync/session state. No protocol changes. Phase 2 (event bus refactor) is a separate plan.

**Tech Stack:** TypeScript, React Native / Expo, Unistyles, Expo Router, Vitest. See `packages/happy-cli/CLAUDE.md` and `packages/happy-app/CLAUDE.md` for all conventions before touching any file.

**Design doc:** `docs/plans/2026-04-02-happy-extension-design.md`

---

## Conventions Cheatsheet (read before starting)

- **Styles:** `StyleSheet.create` from `react-native-unistyles`, styles at bottom of file
- **Strings:** Always `t('key')` — add to ALL 9 language files when adding new keys
- **Errors:** Never `Alert`, always `Modal` from `@/modal`
- **Async actions:** Use `useHappyAction` for button-triggered async ops
- **Navigation:** `expo-router` API only, never `react-navigation` directly
- **Commits:** `git-commit` skill for all commits
- **Tests:** Vitest, colocated `.test.ts`, no mocking — real calls only
- **Imports:** All imports at top of file, never mid-code
- **Typecheck:** `yarn typecheck` after every task

---

## Task 1: Audit GLM + OpenRouter CLI wiring

**Goal:** Confirm what's complete and what's missing before touching anything.

**Files to read:**
- `packages/happy-cli/src/glm/runGlm.ts`
- `packages/happy-cli/src/glm/glmTypes.ts`
- `packages/happy-cli/src/openrouter/runOpenRouter.ts`
- `packages/happy-cli/src/openrouter/openrouterTypes.ts`
- `packages/happy-cli/src/commands/connect/authenticateGlm.ts`
- `packages/happy-cli/src/commands/connect/authenticateOpenRouter.ts`
- `packages/happy-cli/src/index.ts` lines 418–500 (dispatch blocks)

**Step 1: Read and note what's present**

Check each file exists and note anything missing compared to the `codex` adapter pattern:
```bash
ls packages/happy-cli/src/glm/
ls packages/happy-cli/src/openrouter/
ls packages/happy-cli/src/codex/
```

**Step 2: Compare against working codex adapter**

The `codex` adapter has: `runCodex.ts`, `cliArgs.ts`, `types.ts` + connect auth. Note which of these GLM/OpenRouter are missing.

**Step 3: Verify dispatch blocks in index.ts**

Lines 418–500 in `packages/happy-cli/src/index.ts` — confirm `glm` and `openrouter` subcommands are wired (they should be based on help text at line 810–814). Document exact gap.

**Expected outcome:** A written list of what's missing. If both adapters are fully wired already, Task 2 becomes a verification task only.

---

## Task 2: Complete GLM CLI adapter

**Files:**
- Modify: `packages/happy-cli/src/glm/runGlm.ts` (if incomplete)
- Modify: `packages/happy-cli/src/glm/glmTypes.ts` (if incomplete)

**Step 1: Verify runGlm calls runClaude correctly**

`runGlm.ts` must follow this pattern (already partially done):
```typescript
await runClaude(opts.credentials, {
  startedBy: opts.startedBy,
  flavor: 'glm',
  claudeEnvVars: {
    ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
    ANTHROPIC_MODEL: model,
    ANTHROPIC_AUTH_TOKEN: apiKey,
  },
});
```

**Step 2: Verify model validation**

`glmTypes.ts` should export `GLM_VALID_MODELS` and `GLM_DEFAULT_MODEL`. Confirm the `--model` flag in `index.ts` validates against `GLM_VALID_MODELS`. If not, add:
```typescript
// In index.ts glm dispatch block, after parsing --model flag:
if (model && !GLM_VALID_MODELS.includes(model as GlmModel)) {
  console.error(chalk.red(`Invalid GLM model: ${model}`));
  console.error(`Available: ${GLM_VALID_MODELS.join(', ')}`);
  process.exit(1);
}
```

**Step 3: Manual smoke test**
```bash
cd packages/happy-cli
ZHIPU_API_KEY=test ./bin/happy.mjs glm --help 2>&1 | head -5
# Should show help, not crash
```

**Step 4: Commit**
```bash
# Use git-commit skill
```

---

## Task 3: Complete OpenRouter CLI adapter

**Files:**
- Modify: `packages/happy-cli/src/openrouter/runOpenRouter.ts` (if incomplete)
- Modify: `packages/happy-cli/src/openrouter/openrouterTypes.ts` (if incomplete)

**Step 1: Verify runOpenRouter calls runClaude correctly**

`runOpenRouter.ts` must follow the same pattern:
```typescript
await runClaude(opts.credentials, {
  startedBy: opts.startedBy,
  flavor: 'openrouter',
  claudeEnvVars: {
    ANTHROPIC_BASE_URL: 'https://openrouter.ai/api',
    ANTHROPIC_MODEL: model,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_API_KEY: '',  // prevent fallback to Anthropic
  },
});
```

**Step 2: Verify HTTP-Referer headers are passed**

OpenRouter recommends `HTTP-Referer` and `X-Title` headers. Check if `runClaude` supports extra headers. If not, note as a known limitation — do not add complexity now.

**Step 3: Manual smoke test**
```bash
cd packages/happy-cli
OPENROUTER_API_KEY=test ./bin/happy.mjs openrouter --help 2>&1 | head -5
```

**Step 4: Commit**

---

## Task 4: Add GLM + OpenRouter to app agent selector

**Goal:** Both agents appear in the "new session" agent picker in happy-app alongside Claude/Codex/Gemini.

**Files to read first:**
- `packages/happy-app/sources/components/modelModeOptions.ts` — understand `AgentFlavor` and model mode functions
- `packages/happy-app/sources/app/(app)/new/` — find the new session screen
- `packages/happy-app/sources/components/SearchableListSelector.tsx` — likely used for agent picker

**Files to modify:**
- `packages/happy-app/sources/components/modelModeOptions.ts`
- New session screen (find path by reading `app/(app)/new/`)
- `packages/happy-app/sources/text/translations/en.ts` + all 8 other language files

**Step 1: Add GLM model modes**

In `modelModeOptions.ts`, add after `getClaudeModelModes()`:
```typescript
export function getGlmModelModes(): ModelMode[] {
    return [
        { key: 'glm-4.6', name: 'GLM-4.6', description: 'default' },
        { key: 'glm-4-plus', name: 'GLM-4-Plus', description: 'most capable' },
        { key: 'glm-4-flash', name: 'GLM-4-Flash', description: 'fast' },
        { key: 'glm-z1-plus', name: 'GLM-Z1-Plus', description: 'reasoning' },
        { key: 'glm-z1-flash', name: 'GLM-Z1-Flash', description: 'fast reasoning' },
    ];
}
```

**Step 2: Add OpenRouter model input**

OpenRouter supports 200+ models via free-text slug. Add:
```typescript
export const OPENROUTER_DEFAULT_MODEL = 'stepfun/step-3.5-flash:free';

// OpenRouter uses free-text model entry, not a fixed list
export function getOpenRouterModelModes(): ModelMode[] {
    return [
        { key: OPENROUTER_DEFAULT_MODEL, name: 'step-3.5-flash (free)', description: 'default' },
        { key: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI' },
        { key: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Anthropic' },
        { key: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Google' },
        { key: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Meta, free' },
    ];
}
```

**Step 3: Update AgentFlavor type**

In `modelModeOptions.ts`:
```typescript
// Before:
export type AgentFlavor = 'claude' | 'codex' | 'gemini' | string | null | undefined;

// After: (string already covers it, but add explicit literals for type safety in switches)
export type AgentFlavor = 'claude' | 'codex' | 'gemini' | 'glm' | 'openrouter' | string | null | undefined;
```

**Step 4: Wire into getPermissionModes / getModelModes helpers**

Find the switch/if-chain in `modelModeOptions.ts` that dispatches to `getClaudePermissionModes`, `getCodexPermissionModes`, etc. Add GLM and OpenRouter cases. GLM can reuse Claude permission modes (it runs via Claude Code). OpenRouter too.

**Step 5: Add translation keys**

In `sources/text/translations/en.ts`, find the `agentInput` section and add:
```typescript
glmPermissionMode: {
    default: 'Default',
    plan: 'Plan only',
    dontAsk: 'Auto-approve',
    acceptEdits: 'Accept edits',
    bypassPermissions: 'Bypass',
},
openrouterPermissionMode: {
    default: 'Default',
    plan: 'Plan only',
    dontAsk: 'Auto-approve',
    acceptEdits: 'Accept edits',
    bypassPermissions: 'Bypass',
},
```

Then add matching keys to all 8 other language files (`ru`, `pl`, `es`, `ca`, `it`, `pt`, `ja`, `zh-Hans`). Use the i18n-translator agent for accurate translations.

**Step 6: Find and update new session screen**

Read `packages/happy-app/sources/app/(app)/new/` to find where agents are listed. Add `glm` and `openrouter` entries in the same format as existing agents.

**Step 7: Typecheck**
```bash
cd packages/happy-app && yarn typecheck
```

**Step 8: Commit**

---

## Task 5: Create `useSessionStatus` hook

**Goal:** A single hook that aggregates all statusline fields from existing session/sync state.

**File:**
- Create: `packages/happy-app/sources/hooks/useSessionStatus.ts`

**Step 1: Read existing session state types**
```bash
# Find where session state lives
grep -rn "agentName\|agentFlavor\|inputTokens\|outputTokens\|gitBranch\|currentDirectory" \
  packages/happy-app/sources/sync/ | head -30
```

Read `packages/happy-app/sources/sync/types.ts` fully — this is the source of truth for all session fields.

**Step 2: Write the hook**

```typescript
// packages/happy-app/sources/hooks/useSessionStatus.ts
/**
 * Aggregates all statusline fields from session sync state.
 * Phase 1: derives values by parsing existing state.
 * Phase 2: will switch to typed event bus subscriptions.
 */
import * as React from 'react';
import { useSessionState } from '@/sync/useSessionState'; // find actual import

export interface SessionStatus {
    // Agent
    agentFlavor: string | null;
    modelName: string | null;
    // Tokens + cost
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    // Git
    gitBranch: string | null;
    gitDirty: boolean;
    // Working dir
    cwd: string | null;
    // Active tool
    activeTool: string | null;
    // Approvals
    pendingApprovals: number;
    // Duration
    sessionStartedAt: number | null;
    elapsedSeconds: number;
}

export function useSessionStatus(sessionId: string): SessionStatus {
    // Read from sync state — adjust import path to match actual sync API
    const session = useSessionState(sessionId);

    const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

    React.useEffect(() => {
        if (!session?.startedAt) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - session.startedAt) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [session?.startedAt]);

    // Derive cost — import from constants/modelRates.ts (Task 6)
    const estimatedCostUsd = React.useMemo(() => {
        // Placeholder until modelRates.ts exists
        return 0;
    }, []);

    return {
        agentFlavor: session?.agentFlavor ?? null,
        modelName: session?.modelName ?? null,
        inputTokens: session?.inputTokens ?? 0,
        outputTokens: session?.outputTokens ?? 0,
        estimatedCostUsd,
        gitBranch: session?.gitBranch ?? null,
        gitDirty: session?.gitDirty ?? false,
        cwd: session?.cwd ?? null,
        activeTool: session?.activeTool ?? null,
        pendingApprovals: session?.pendingApprovals ?? 0,
        sessionStartedAt: session?.startedAt ?? null,
        elapsedSeconds,
    };
}
```

> **Note:** The exact field names from `sync/types.ts` will differ. Adapt the field access to match what's actually in session state. If a field doesn't exist yet (e.g. `gitBranch`), return `null` and leave a TODO comment — do not add new sync fields in this task.

**Step 3: Typecheck**
```bash
cd packages/happy-app && yarn typecheck
```

**Step 4: Commit**

---

## Task 6: Create model cost rates table

**Goal:** Map model IDs to input/output cost per 1k tokens for the cost estimate in the statusline.

**File:**
- Create: `packages/happy-app/sources/constants/modelRates.ts`

**Step 1: Write the rates table**

```typescript
// packages/happy-app/sources/constants/modelRates.ts
/**
 * Token cost rates per 1k tokens in USD.
 * Update when providers change pricing — no app release needed (OTA update).
 * Sources: provider pricing pages, April 2026.
 */

export interface ModelRate {
    inputPer1k: number;
    outputPer1k: number;
}

export const MODEL_RATES: Record<string, ModelRate> = {
    // Anthropic
    'claude-opus-4-6':       { inputPer1k: 0.015,  outputPer1k: 0.075  },
    'claude-sonnet-4-6':     { inputPer1k: 0.003,  outputPer1k: 0.015  },
    'claude-haiku-4-5':      { inputPer1k: 0.00025, outputPer1k: 0.00125 },
    // OpenAI
    'gpt-4o':                { inputPer1k: 0.0025, outputPer1k: 0.01   },
    'gpt-4o-mini':           { inputPer1k: 0.00015,outputPer1k: 0.0006 },
    // Google
    'gemini-2.5-pro':        { inputPer1k: 0.00125,outputPer1k: 0.01   },
    'gemini-2.5-flash':      { inputPer1k: 0.0001, outputPer1k: 0.0004 },
    'gemini-2.5-flash-lite': { inputPer1k: 0.00005,outputPer1k: 0.0002 },
    // GLM (Zhipu AI)
    'glm-4.6':               { inputPer1k: 0.001,  outputPer1k: 0.001  },
    'glm-4-plus':            { inputPer1k: 0.007,  outputPer1k: 0.007  },
    'glm-4-flash':           { inputPer1k: 0.0001, outputPer1k: 0.0001 },
    // OpenRouter models vary — use 0 as fallback (unknown cost)
};

export function getModelRate(modelId: string): ModelRate {
    // Try exact match first, then prefix match (e.g. "claude-sonnet-4-6-20251022")
    if (MODEL_RATES[modelId]) return MODEL_RATES[modelId];
    const prefix = Object.keys(MODEL_RATES).find(k => modelId.startsWith(k));
    return prefix ? MODEL_RATES[prefix] : { inputPer1k: 0, outputPer1k: 0 };
}

export function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
    const rate = getModelRate(modelId);
    return (inputTokens / 1000) * rate.inputPer1k + (outputTokens / 1000) * rate.outputPer1k;
}
```

**Step 2: Wire into `useSessionStatus`**

Update `packages/happy-app/sources/hooks/useSessionStatus.ts`:
```typescript
import { estimateCostUsd } from '@/constants/modelRates';

// In useMemo:
const estimatedCostUsd = React.useMemo(() => {
    if (!session?.modelName) return 0;
    return estimateCostUsd(session.modelName, session.inputTokens ?? 0, session.outputTokens ?? 0);
}, [session?.modelName, session?.inputTokens, session?.outputTokens]);
```

**Step 3: Write unit test**

Create `packages/happy-app/sources/constants/modelRates.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { estimateCostUsd, getModelRate } from './modelRates';

describe('estimateCostUsd', () => {
    it('returns correct cost for known model', () => {
        // 1000 input + 500 output for claude-sonnet-4-6
        // input: 1000/1000 * 0.003 = 0.003
        // output: 500/1000 * 0.015 = 0.0075
        // total: 0.0105
        expect(estimateCostUsd('claude-sonnet-4-6', 1000, 500)).toBeCloseTo(0.0105);
    });

    it('returns 0 for unknown model', () => {
        expect(estimateCostUsd('unknown-model-xyz', 1000, 1000)).toBe(0);
    });

    it('matches by prefix for versioned model IDs', () => {
        const rate = getModelRate('claude-sonnet-4-6-20251022');
        expect(rate.inputPer1k).toBe(0.003);
    });
});
```

**Step 4: Run test**
```bash
cd packages/happy-app && yarn test sources/constants/modelRates.test.ts
```
Expected: all pass.

**Step 5: Typecheck + commit**

---

## Task 7: Build `StatusTopBar` component

**Goal:** Top status bar showing model name, git branch (with `*` for dirty), and cwd.

**File:**
- Create: `packages/happy-app/sources/components/StatusTopBar.tsx`

**Step 1: Add translation keys**

In `sources/text/translations/en.ts`, find or add to `session` section:
```typescript
statusBar: {
    dirtyBranch: '{{branch}}*',
    noBranch: 'no branch',
    unknownModel: 'unknown model',
    unknownDir: '~',
}
```
Add to all 9 language files.

**Step 2: Write the component**

```typescript
// packages/happy-app/sources/components/StatusTopBar.tsx
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';
import type { SessionStatus } from '@/hooks/useSessionStatus';

interface StatusTopBarProps {
    status: SessionStatus;
    onPress?: () => void;
}

export const StatusTopBar = React.memo(({ status, onPress }: StatusTopBarProps) => {
    const branchLabel = status.gitBranch
        ? status.gitDirty
            ? `${status.gitBranch}*`
            : status.gitBranch
        : t('session.statusBar.noBranch');

    const cwdLabel = status.cwd
        ? status.cwd.replace(/^\/home\/[^/]+/, '~')
        : t('session.statusBar.unknownDir');

    const modelLabel = status.modelName ?? t('session.statusBar.unknownModel');

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Text style={styles.item} numberOfLines={1}>{modelLabel}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.item} numberOfLines={1}>{branchLabel}</Text>
            <Text style={styles.separator}>·</Text>
            <Text style={styles.itemCwd} numberOfLines={1}>{cwdLabel}</Text>
        </Pressable>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.margins.md,
        paddingVertical: 4,
        backgroundColor: theme.colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 4,
    },
    item: {
        fontSize: 11,
        color: theme.colors.typographySecondary,
        fontFamily: 'monospace',
    },
    itemCwd: {
        fontSize: 11,
        color: theme.colors.typographySecondary,
        fontFamily: 'monospace',
        flexShrink: 1,
    },
    separator: {
        fontSize: 11,
        color: theme.colors.typographyTertiary,
    },
}));
```

**Step 3: Typecheck**
```bash
cd packages/happy-app && yarn typecheck
```

**Step 4: Commit**

---

## Task 8: Build `StatusBottomBar` component

**Goal:** Bottom status bar showing active tool, tokens, cost, elapsed time, pending approvals.

**File:**
- Create: `packages/happy-app/sources/components/StatusBottomBar.tsx`

**Step 1: Add translation keys** in `en.ts` + all languages:
```typescript
statusBar: {
    // (add to existing statusBar section from Task 7)
    activeTool: '↳ {{tool}}',
    idle: 'idle',
    tokens: '{{count}} tok',
    cost: '${{amount}}',
    duration: '{{minutes}}:{{seconds}}',
    pendingApprovals: '△ {{count}}',
}
```

**Step 2: Write the component**

```typescript
// packages/happy-app/sources/components/StatusBottomBar.tsx
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';
import type { SessionStatus } from '@/hooks/useSessionStatus';

interface StatusBottomBarProps {
    status: SessionStatus;
    onApprovalPress?: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCost(usd: number): string {
    if (usd === 0) return '$0.000';
    if (usd < 0.001) return `$${usd.toFixed(5)}`;
    return `$${usd.toFixed(3)}`;
}

export const StatusBottomBar = React.memo(({ status, onApprovalPress }: StatusBottomBarProps) => {
    const toolLabel = status.activeTool ? `↳ ${status.activeTool}` : 'idle';
    const tokenLabel = `${(status.inputTokens + status.outputTokens).toLocaleString()} tok`;
    const costLabel = formatCost(status.estimatedCostUsd);
    const durationLabel = formatDuration(status.elapsedSeconds);
    const hasPending = status.pendingApprovals > 0;

    return (
        <View style={styles.container}>
            <Text style={styles.tool} numberOfLines={1}>{toolLabel}</Text>
            <View style={styles.right}>
                <Text style={styles.item}>{tokenLabel}</Text>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.item}>{costLabel}</Text>
                <Text style={styles.separator}>·</Text>
                <Text style={styles.item}>{durationLabel}</Text>
                {hasPending && (
                    <>
                        <Text style={styles.separator}>·</Text>
                        <Pressable onPress={onApprovalPress}>
                            <Text style={styles.approvals}>△ {status.pendingApprovals}</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.margins.md,
        paddingVertical: 4,
        backgroundColor: theme.colors.backgroundSecondary,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    tool: {
        fontSize: 11,
        color: theme.colors.typographySecondary,
        fontFamily: 'monospace',
        flexShrink: 1,
        marginRight: 8,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    item: {
        fontSize: 11,
        color: theme.colors.typographySecondary,
        fontFamily: 'monospace',
    },
    separator: {
        fontSize: 11,
        color: theme.colors.typographyTertiary,
    },
    approvals: {
        fontSize: 11,
        color: theme.colors.warning ?? '#F59E0B',
        fontFamily: 'monospace',
        fontWeight: '600',
    },
}));
```

**Step 3: Typecheck + commit**

---

## Task 9: Integrate status bars into session screen

**Goal:** Mount `StatusTopBar` and `StatusBottomBar` in the active session view.

**Step 1: Find the session screen**
```bash
ls packages/happy-app/sources/app/(app)/session/
# Also check:
grep -rn "ChatList\|AgentInput\|session.*screen" \
  packages/happy-app/sources/app/(app)/ | head -20
```

**Step 2: Read the session screen file fully**

Understand the existing layout before touching anything.

**Step 3: Add `useSessionStatus` + render bars**

Find the outermost View in the session screen. Wrap content with:

```typescript
// At top of component (after existing hooks):
const status = useSessionStatus(sessionId);  // use actual sessionId from route params

// In JSX, wrapping the existing chat layout:
<View style={styles.screen}>
    <StatusTopBar
        status={status}
        onPress={() => {/* detail sheet — future */}}
    />
    <View style={styles.chat}>
        {/* existing chat content unchanged */}
    </View>
    <StatusBottomBar
        status={status}
        onApprovalPress={() => {/* navigate to approvals — future */}}
    />
</View>
```

> **Important:** Do not change the existing chat layout. Only wrap it. If the session screen already has a header/footer structure, add the bars adjacent to it — do not replace anything.

**Step 4: Typecheck**
```bash
cd packages/happy-app && yarn typecheck
```

**Step 5: Run on web to visually verify**
```bash
cd packages/happy-app && yarn web
```
Open browser. Start a session. Confirm both bars appear and show data.

**Step 6: Commit**

---

## Task 10: Update CHANGELOG + final typecheck

**Goal:** Document the changes for in-app changelog.

**Step 1: Update `packages/happy-app/CHANGELOG.md`**

Add new entry at top:
```markdown
## Version [N+1] - 2026-04-02

This update adds GLM and OpenRouter agent support and introduces the session statusline.

- Added GLM (Zhipu AI) as a supported agent — start with `happy glm` or `happy glm --model glm-4-plus`
- Added OpenRouter support — access 200+ models via `happy openrouter --model openai/gpt-4o`
- Added session statusline showing model, git branch, working directory, token usage, cost estimate, active tool, elapsed time, and pending approvals
```

**Step 2: Regenerate changelog JSON**
```bash
cd packages/happy-app
npx tsx sources/scripts/parseChangelog.ts
```

**Step 3: Final typecheck across both packages**
```bash
cd packages/happy-cli && yarn typecheck
cd packages/happy-app && yarn typecheck
```

**Step 4: Final commit**

---

## Known Gaps (do not fix in this plan)

These are deferred to Phase 2 (event bus refactor):

| Gap | Why deferred |
|---|---|
| `gitBranch`, `gitDirty`, `activeTool` may not exist in sync state | Need event bus to propagate these from CLI |
| Token counts may be 0 if not in current sync protocol | Need `token.usage` event type |
| Cost estimate is approximate | Good enough for now |
| Approval badge doesn't navigate anywhere | Navigation wired in Phase 2 |

For any field not available in current session state, render `null`/`0` silently — do not show error states in the statusline.

---

## File Map Summary

```
packages/happy-cli/src/
  glm/runGlm.ts                     ← Task 2 (verify/complete)
  glm/glmTypes.ts                   ← Task 2 (verify/complete)
  openrouter/runOpenRouter.ts       ← Task 3 (verify/complete)
  openrouter/openrouterTypes.ts     ← Task 3 (verify/complete)
  index.ts                          ← Task 2+3 (model validation)

packages/happy-app/sources/
  components/modelModeOptions.ts    ← Task 4
  components/StatusTopBar.tsx       ← Task 7 (new)
  components/StatusBottomBar.tsx    ← Task 8 (new)
  hooks/useSessionStatus.ts         ← Task 5 (new)
  constants/modelRates.ts           ← Task 6 (new)
  constants/modelRates.test.ts      ← Task 6 (new)
  app/(app)/session/<screen>.tsx    ← Task 9
  text/translations/en.ts           ← Task 4+7+8
  text/translations/{ru,pl,es,ca,it,pt,ja,zh-Hans}.ts  ← Task 4+7+8
  CHANGELOG.md                      ← Task 10
  sources/changelog/changelog.json  ← Task 10
```
