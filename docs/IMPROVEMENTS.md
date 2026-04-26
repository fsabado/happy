# happy-app Improvement Opportunities

Identified from codebase analysis of `packages/happy-app/sources/`. Each item below has been verified against the current code.

---

## Performance

### 1. Session list rebuilt on unrelated mutations

**File:** `sync/storage.ts:224–317` (`buildSessionListViewData`), callers at lines 525, 898, 999, 1017, 1086

`buildSessionListViewData` walks all sessions and re-groups them by date (O(n) with Date allocations per session). It's called from paths that don't change list structure — notably `updateSessionDraft` (line 898), which only mutates a single session's draft text.

Because the function returns a brand-new array every call, the consumer selector (`useSessionListViewData`, line 1292) has to wrap itself in `useDeepEqual` to prevent downstream re-renders — a workaround for the root cause.

**Fix:**

- Skip the rebuild when only draft content changed (drafts don't affect grouping or sort order).
- Once rebuilds are gated to real structural changes, the `useDeepEqual` wrapper on the selector can be dropped in favor of reference equality.

---

### 2. Feed item O(n²) processing

**File:** `sync/storage.ts:1176–1202` (`applyFeedItems`)

For each incoming item, runs `findIndex()` over the existing array and `splice()` (which shifts all trailing elements). On batches this is O(n·m).

**Fix:** Precompute the set of incoming `repeatKey`s, filter the existing array once, then append + sort.

```ts
const incomingRepeatKeys = new Set(
    items.map(i => i.repeatKey).filter((k): k is string => !!k)
);
const filtered = state.feedItems.filter(i =>
    !i.repeatKey || !incomingRepeatKeys.has(i.repeatKey)
);
const updated = [...filtered, ...items].sort((a, b) => b.counter - a.counter);
```

---

## Reliability / Bug Risk

### 3. Mutable `reducerState` (fragility, not a present bug)

**File:** `sync/storage.ts:599, 649`

The reducer mutates `reducerState` in place (the inline comment at line 649 acknowledges this: *"Explicitly include the mutated reducer state"*). Currently this is safe because the outer `sessionMessages[sessionId]` object is recreated via spread on every message update, so Zustand subscribers see a new root reference and re-run.

The fragility: if any future selector reads `reducerState` via identity comparison (e.g. `useShallow`, `fast-deep-equal` short-circuit on same reference), it will silently miss updates. The `Map`/`Set` fields inside (`toolIdToMessageId`, `sidechains`) are particularly easy to misuse.

**Fix:** Treat `reducerState` as immutable. Shallow-copy it (and its `Map`/`Set` fields) before calling the reducer, and have the reducer return a new state object instead of mutating.

---

## Maintainability

### 4. Auth hook duplication

**Files:** `hooks/useConnectAccount.ts`, `hooks/useConnectTerminal.ts`

~90% identical code: identical barcode scanner lifecycle, identical error/loading handling, identical iOS scanner-dismiss logic. They differ in:

- URL prefix (`happy:///account?` vs `happy://terminal?`)
- Final API call (`authAccountApprove` vs `authApprove`) — terminal flow also bundles a v2 response with `sync.encryption.contentDataKey`
- Success/error i18n keys

**Fix:** Extract a base hook parameterized by a config object:

```ts
interface QRConnectionConfig {
    urlPrefix: string;
    approve: (token: string, publicKey: Uint8Array, secret: Uint8Array) => Promise<Response>;
    successMessageKey: string;
    failureMessageKey: string;
}
export function useQRConnection(config: QRConnectionConfig) { /* shared logic */ }
```

The terminal-specific v2 bundle can be built inside its `approve` implementation.

---

## Minor / Polish

### 5. Console log spam in production

**File:** `sync/storage.ts:1022, 1027` (`applyArtifacts`)

```ts
console.log(`🗂️ Storage.applyArtifacts: Applying ${artifacts.length} artifacts`);
// ...
console.log(`🗂️ Storage.applyArtifacts: Total artifacts after merge: ...`);
```

Not guarded by `__DEV__`, so they run in production builds.

**Fix:** Gate with `__DEV__` or remove entirely — the info can be obtained from Zustand devtools if needed in dev.

---

## Items removed after verification

The following candidates were evaluated and rejected because the concerns do not hold up against the current code:

- **Artifact key recovery gap** (`sync/sync.ts:1046–1059`) — The recovery path correctly throws on decrypt failure (line 1054–1056) and errors propagate via the surrounding `try/catch`. Not a silent failure.
- **Message queue race condition** (`sync/sync.ts:291–338`) — JavaScript is single-threaded and `enqueueMessages` contains no `await`, so the get-then-push is atomic. The `.finally()` block at line 331–337 correctly handles the drain-empty-but-flag-still-set window by re-scheduling.
- **Loose TypeScript on machine update** (`sync/sync.ts:~2000`) — `handleUpdate` already validates incoming payloads at the boundary via `ApiUpdateContainerSchema.safeParse(update)` (line 1772). Zod validation is in place.
