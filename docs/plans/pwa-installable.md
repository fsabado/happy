# Plan: Make happy-app Installable as a PWA

## Goal

Make the web deployment at `happy.fsabado.com` installable as a PWA on desktop Chrome/Edge, Android Chrome, and iOS Safari. Scope is limited to the **installable shell** — rich offline sync, background sync, and push notifications are explicitly out of scope for v1.

## Success Criteria

1. Chrome DevTools → Application → Manifest shows a valid manifest with no errors.
2. Chrome's "Install app" button appears in the address bar on `happy.fsabado.com`.
3. Lighthouse PWA audit passes the "Installable" category (manifest + service worker + HTTPS).
4. Installed app launches in standalone window (no browser chrome) with correct icon, name, and theme color.
5. On Android/Chrome, "Add to Home Screen" produces an installed app icon.
6. On iOS Safari, "Add to Home Screen" produces an icon with the correct 180×180 apple-touch-icon (install UX is weaker on iOS, acceptable).
7. Running the web build offline (after one successful load) still serves the app shell and renders the UI — even if sync fails to connect. No "can't be reached" browser error page.
8. No regression in the mobile web app flow (QR-based sign-in remains usable, even if the camera path is unavailable).
9. `pnpm typecheck` passes.
10. GitHub Pages deploy still succeeds on push to `fsabado-main`.

## Non-Goals (v1)

- Offline-first sync / IndexedDB message queue.
- Background sync API / push notifications on web.
- Native file share target / URL handlers / protocol handlers.
- LiveKit voice on web (verify it still works if already functional, don't fix if broken).
- QR camera scanner on web (fall back to paste-URL already discussed).

---

## Context: What Exists Today

| Area | Current state | Relevant files |
|------|---------------|----------------|
| Web build | Expo Router SPA via metro bundler, output `single` | [packages/happy-app/app.config.js:85-89](../../packages/happy-app/app.config.js#L85-L89) |
| HTML template | Minimal `+html.tsx` with viewport meta only | [packages/happy-app/sources/app/+html.tsx](../../packages/happy-app/sources/app/+html.tsx) |
| Static assets served on web | `public/` directory — already contains `canvaskit.wasm`, `favicon-active.ico`, `.well-known/` for app-links | [packages/happy-app/public/](../../packages/happy-app/public/) |
| Icons | Source `icon.png` is 1024×1024 RGBA PNG. Adaptive + monochrome + favicon variants exist | [packages/happy-app/sources/assets/images/](../../packages/happy-app/sources/assets/images/) |
| Deploy | GitHub Actions → Pages on push to `fsabado-main` (CNAME `happy.fsabado.com`). Workflow already copies `index.html` → `404.html` for SPA routing | [.github/workflows/pages.yml](../../.github/workflows/pages.yml) |
| QR scanner (web blocker) | `useConnectAccount` / `useConnectTerminal` call `CameraView.launchScanner()` unconditionally | [packages/happy-app/sources/hooks/useConnectAccount.ts:55-57](../../packages/happy-app/sources/hooks/useConnectAccount.ts#L55-L57), [packages/happy-app/sources/hooks/useConnectTerminal.ts:57-65](../../packages/happy-app/sources/hooks/useConnectTerminal.ts#L57-L65) |

**Key fact:** Expo web copies everything from `packages/happy-app/public/` into `dist/` at the root — so any file placed under `public/` is served from `https://happy.fsabado.com/<filename>` with no extra config. This is where manifest, service worker, and PWA icons go.

---

## Implementation Plan

Each step below is independently verifiable. The implementing agent should run `pnpm typecheck` after each code change, and should deploy to a branch or preview environment before merging to confirm steps 1–4 visually.

### Step 1 — Generate PWA icon set

**Why:** The Web App Manifest requires specific sizes (192×192 and 512×512 at minimum; 512×512 maskable recommended). Apple touch icon is 180×180.

**What:**

1. From `packages/happy-app/sources/assets/images/icon.png` (1024×1024), produce:
   - `public/icons/icon-192.png` (192×192)
   - `public/icons/icon-512.png` (512×512)
   - `public/icons/icon-512-maskable.png` (512×512, with safe-zone padding — the logo sized so the inner 80% is visible when a circular mask is applied)
   - `public/icons/apple-touch-icon.png` (180×180)
2. Use the macOS-style rounded-icon source if one exists; otherwise use `icon.png` directly.
3. Commit all generated PNGs — do not add a build step.

**How:** Use `sharp` via a one-off script, OR generate offline with ImageMagick (`convert icon.png -resize 192x192 icon-192.png`), OR use an online PWA asset generator. Pick the simplest path — this is a one-time operation.

**Verification:** `file packages/happy-app/public/icons/icon-192.png` reports 192×192, same for the others.

---

### Step 2 — Write the Web App Manifest

**File to create:** `packages/happy-app/public/manifest.webmanifest`

**Contents:**

```json
{
  "name": "Happy",
  "short_name": "Happy",
  "description": "Remote control and monitor your Claude Code, Codex, and other AI coding agents.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#18171C",
  "lang": "en",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Notes for the implementer:**

- `theme_color: #18171C` matches the Android adaptive icon background in `app.config.js:52`. If the app has a strong dark-mode identity, this makes the title bar look native.
- `display: standalone` gives a windowed feel without fullscreen override — the current web UI doesn't assume fullscreen so this is safer than `fullscreen`.
- Do **not** use `start_url: "/index.html"` — GitHub Pages serves `/` correctly and using the filename causes confusing double-entry behavior on iOS.
- The description should be kept under 200 chars.

**Verification:** Open `https://happy.fsabado.com/manifest.webmanifest` post-deploy and confirm it serves with `Content-Type: application/manifest+json` (GitHub Pages usually serves this correctly based on extension).

---

### Step 3 — Wire the manifest and theme tags into the HTML head

**File to modify:** `packages/happy-app/sources/app/+html.tsx`

**Add inside `<head>`:**

```tsx
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#18171C" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Happy" />
<meta name="mobile-web-app-capable" content="yes" />
```

**Do not touch:**

- `ScrollViewStyleReset` — it's intentional for the RN-on-web scroll model.
- The inline `responsiveBackground` style — it handles first-paint flash before Unistyles loads.

**Verification:** View-source on the deployed page and confirm the `<link rel="manifest">` and `<link rel="apple-touch-icon">` tags are present before `<body>`.

---

### Step 4 — Add a minimal service worker

**Why:** Installability requires a registered service worker with a fetch handler. We don't need aggressive caching — just enough to satisfy the PWA install criteria and keep the app shell loading when offline.

**File to create:** `packages/happy-app/public/sw.js`

**Strategy:** Network-first with cache fallback for navigation requests; cache-first for hashed static assets (Expo's `_expo/static/...` paths use content hashes so they're safe to cache long-term).

```js
const CACHE_VERSION = 'happy-v1';
const PRECACHE = [
    '/',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Only handle GET requests.
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Never cache or intercept API / websocket / cross-origin requests.
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;
    if (url.pathname.startsWith('/socket.io/')) return;

    // Navigation (HTML) requests → network first, fall back to cached root.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/'))
        );
        return;
    }

    // Hashed static assets → cache first.
    if (url.pathname.startsWith('/_expo/static/')) {
        event.respondWith(
            caches.match(req).then((hit) => {
                if (hit) return hit;
                return fetch(req).then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
                    return res;
                });
            })
        );
        return;
    }

    // Everything else → network, then cache fallback.
    event.respondWith(
        fetch(req).catch(() => caches.match(req))
    );
});
```

**Note on API / socket paths:** The agent should confirm the actual backend origin. If backend is on a different origin (likely — it uses `EXPO_PUBLIC_HAPPY_SERVER_URL`), the `url.origin !== self.location.origin` check already excludes it. The `/api/` and `/socket.io/` guards are defense-in-depth in case backend is ever same-origin.

**Verification:** In DevTools → Application → Service Workers, `sw.js` is registered and shows "activated and running". Disable network, reload — app shell still loads.

---

### Step 5 — Register the service worker from the app

**Why:** The browser won't auto-register `/sw.js`. It must be registered from a script that runs on every page load.

**Approach:** Register from a web-only entry point. The simplest location is inside `+html.tsx` as an inline script that runs before the React bundle loads.

**File to modify:** `packages/happy-app/sources/app/+html.tsx`

**Add inside `<head>` after the other tags from Step 3:**

```tsx
<script
    dangerouslySetInnerHTML={{
        __html: `
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('SW registration failed', err);
        });
    });
}
`,
    }}
/>
```

**Why inline and not a TS module:**

- `+html.tsx` runs at static render time on Node — the script body is emitted into the HTML and runs in the browser at page load. This keeps registration out of the React tree entirely.
- Putting SW registration inside a React component couples it to hydration timing, which is fragile.

**Verification:** Hard-reload the deployed page, check DevTools → Application → Service Workers shows the registration.

---

### Step 6 — Unblock web sign-in (camera fallback)

**Problem:** `useConnectAccount` and `useConnectTerminal` both call `CameraView.launchScanner()` unconditionally. On web this throws or silently no-ops, leaving new-web-user sign-in broken.

**Fix:** Guard camera calls behind `Platform.OS !== 'web'` and expose a paste-URL path as the primary web flow. Both hooks already export `connectWithUrl(url)` and `processAuthUrl(url)` — the UI just needs to surface a text input on web.

**Files to modify:**

1. [packages/happy-app/sources/hooks/useConnectAccount.ts:52-61](../../packages/happy-app/sources/hooks/useConnectAccount.ts#L52-L61)
2. [packages/happy-app/sources/hooks/useConnectTerminal.ts:57-66](../../packages/happy-app/sources/hooks/useConnectTerminal.ts#L57-L66)

In each, wrap the `CameraView.launchScanner()` block with:

```ts
if (Platform.OS === 'web') {
    // Camera scanner unavailable on web; caller must use connectWithUrl.
    return;
}
```

Also wrap the `React.useEffect` that calls `CameraView.onModernBarcodeScanned(...)` with the same guard — `CameraView.isModernBarcodeScannerAvailable` is likely falsy on web anyway, but make it explicit.

**UI work (pair with implementer):** Find the screens that call `connectAccount()` / `connectTerminal()` (search for these names) and, on web, render a text input + paste-URL button instead of the "scan" CTA. Minimum viable UX: a single input that accepts a full `happy://...` URL and calls `connectWithUrl(url)`.

**Not in scope here:** BarcodeDetector Web API. Implementing a browser QR scanner is its own project.

**Verification:** On web, clicking "Connect" shows a paste-URL input. Submitting a valid URL completes the flow. Running `pnpm typecheck` passes.

---

### Step 7 — Confirm the GitHub Actions workflow publishes the new files

**File to review (not modify unless needed):** [.github/workflows/pages.yml](../../.github/workflows/pages.yml)

Expo web's `expo export --platform web --output-dir dist` copies everything from `public/` to `dist/` at the root. That means:

- `public/manifest.webmanifest` → `dist/manifest.webmanifest` → served at `/manifest.webmanifest`
- `public/sw.js` → `dist/sw.js` → served at `/sw.js`
- `public/icons/*.png` → `dist/icons/*.png`

**Verification:** Locally run:

```bash
pnpm --filter happy-app exec expo export --platform web --output-dir dist
ls packages/happy-app/dist/manifest.webmanifest packages/happy-app/dist/sw.js packages/happy-app/dist/icons/
```

All four should exist. If they don't, Expo's `public/` copy step is misconfigured — in that case, add an explicit `cp -r packages/happy-app/public/* packages/happy-app/dist/` step to the workflow after `expo export`.

**One caveat:** The `sw.js` must be served with `Content-Type: application/javascript` and a scope at `/`. GitHub Pages handles this correctly for `.js` files, but if anything fails, check the response headers at `https://happy.fsabado.com/sw.js`.

---

### Step 8 — Validate end-to-end

Deploy to `fsabado-main` (or a staging branch) and run:

1. **Lighthouse PWA audit** (Chrome DevTools → Lighthouse → Mobile → PWA). Must show green "Installable" and green "PWA Optimized" categories.
2. **Manual install** on desktop Chrome: "Install Happy" in address bar → launches standalone window with correct icon.
3. **Android Chrome**: Visit the URL, menu → "Install app". Confirm home-screen icon is the 192px variant (not the generic globe).
4. **iOS Safari**: Visit → Share → "Add to Home Screen". Confirm the 180×180 apple-touch-icon shows up (not a blurry fallback).
5. **Offline shell**: Load once, disconnect network, reload. App shell should render (spinner or error UI, not Chrome's "can't be reached" page).
6. **Regression**: On mobile Safari with network, confirm the existing sign-in flow still works (camera path on native apps is untouched because changes are gated to `Platform.OS === 'web'`).

---

## Rollback

Everything is additive. If something goes wrong post-deploy:

- **Manifest issue:** Delete `<link rel="manifest">` from `+html.tsx`. Browsers will stop recognizing it as installable but the site continues to work.
- **Service worker issue:** Ship a replacement `sw.js` that calls `self.registration.unregister()` and `caches.keys().then(keys => keys.forEach(k => caches.delete(k)))` in its `activate` handler. This cleans up stuck SWs on user devices. Commit this as `sw-kill.js` in advance if you're nervous — deploy by renaming to `sw.js`.
- **Icon issue:** Revert the PNG commit.
- **Sign-in regression on web:** Revert Step 6.

---

## Open Questions for the Implementer

1. **Theme color.** `#18171C` is pulled from the Android adaptive icon background. If the design team has a canonical brand color, use that instead — this only affects the title bar tint of the installed PWA.
2. **App name.** Manifest uses "Happy". If the production web build is branded differently (e.g. with the ElevenLabs integration), confirm the naming.
3. **Paste-URL UI (Step 6).** Exact placement depends on the current sign-in screen design. May need to consult existing mobile-web behavior or design lead — but a plain `TextInput` + "Connect" button is acceptable for v1.
4. **`@livekit/react-native` on web.** Out of scope here, but if the voice feature currently crashes on web (unrelated to PWA work), add a follow-up. The PWA work does not depend on voice working.

---

## Estimated Effort

| Step | Effort |
|------|--------|
| 1. Icon generation | 30 min |
| 2. Manifest | 30 min |
| 3. HTML head tags | 15 min |
| 4. Service worker | 90 min (write + test) |
| 5. SW registration | 15 min |
| 6. Web sign-in fallback | 120 min (hooks + one UI screen) |
| 7. Workflow verification | 30 min |
| 8. Validation | 60 min |
| **Total** | **~6–7 hours** |

This is the "installable shell" scope. True offline support (Step omitted) is another 8–12 hours of IndexedDB/queue work on top.
