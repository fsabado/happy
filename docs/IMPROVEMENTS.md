# happy-app Improvement Opportunities

Identified from codebase analysis of `packages/happy-app/sources/`. Ordered by impact.

---

## Performance

### 1. Session list rebuilt too often
**File:** `sync/storage.ts:224–317` (`buildSessionListViewData`)

Called on every state mutation — including unrelated changes like draft updates. Performs O(n·m) date-grouping work every time.

**Fix:** Memoize with precise dependencies; only rebuild when session structure actually changes (not on draft/machine-only mutations).

---

### 2. Feed item O(n²) processing
**File:** `sync/storage.ts:1176–1202` (`applyFeedItems`)

For each incoming item, runs `findIndex()` through the entire existing array + `splice()` (which copies the array). On large batches this is 10–50× slower than necessary.

**Fix:** Build a `Map<repeatKey, index>` upfront, then use `filter` + spread instead of splice-per-item.

```ts
const repeatKeys = new Set(items.map(i => i.repeatKey).filter(Boolean));
const filtered = state.feedItems.filter(i => !repeatKeys.has(i.repeatKey));
const updated = [...filtered, ...items].sort((a, b) => b.counter - a.counter);
```

---

### 3. Deep-equal overuse in session list selector
**File:** `sync/storage.ts:1292` (`useSessionListViewData`)

Uses full recursive deep-equal on arrays of 100+ items on every state update.

**Fix:** Replace with a cheaper structural check (length + id comparison):

```ts
export function useSessionListViewData() {
    return storage(
        (state) => state.sessionListViewData,
        (a, b) => a?.length === b?.length && a?.every((v, i) => v.id === b?.[i].id)
    );
}
```

---

## Reliability / Bug Risk

### 4. Mutable reducer state (Zustand immutability violation)
**File:** `sync/storage.ts:599, 649`

`reducerState` is mutated in-place before being stored. Zustand requires immutable updates — mutations to nested `Map`/`Set` fields won't trigger subscribers, causing missed re-renders on message state changes.

**Fix:** Shallow-copy `reducerState` (and its `Map`/`Set` fields) before passing to reducer.

---

### 5. Artifact encryption key recovery gap
**File:** `sync/sync.ts:1046–1059` (`updateArtifact`)

If a key is evicted from `artifactDataKeys` (memory pressure / GC), the recovery path fetches the artifact but doesn't handle fetch failure — the entire update silently fails.

**Fix:** Extract a `getOrFetchArtifactKey(artifactId)` helper with proper error handling and retry.

---

### 6. Message queue race condition
**File:** `sync/sync.ts:291–338` (`enqueueMessages`)

Two rapid calls can interleave between the `get()` and the async lock acquisition, potentially reordering messages.

**Fix:** Make the queue append atomic before scheduling processing (no async gap between read and write).

---

## Maintainability

### 7. Auth hook duplication
**Files:** `hooks/useConnectAccount.ts`, `hooks/useConnectTerminal.ts`

~90% identical — same QR/barcode scanner logic, same error handling, same flow. Only differ in URL prefix and the final API call.

**Fix:** Extract `useQRConnection(config: QRConnectionConfig)` base hook, parameterize the differences.

---

### 8. Loose TypeScript in machine update handler
**File:** `sync/sync.ts:~2000`

`updateData` fields are accessed directly without runtime validation. A malformed server payload silently corrupts machine state (wrong defaults, missing fields).

**Fix:** Add Zod schema validation at the boundary before merging into state.

---

## Minor / Polish

### 9. Console log spam in production
**File:** `sync/storage.ts:1022–1027` (`applyArtifacts`)

Artifact apply logs (`🗂️ Storage.applyArtifacts: ...`) not guarded by `__DEV__`.

**Fix:**
```ts
if (__DEV__) console.log(`🗂️ Storage.applyArtifacts: ...`);
```
