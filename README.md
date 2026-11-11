# 🛡️ AgebypassX – v3.3.4

Bypass **Twitter/X**'s client-side age restrictions and unlock **sensitive media** without sending anything to a third party.

> v3.3.4 adds a way out of the empty media tab: when X returns `0 media`, the tab shows a small panel with **Ver todas las fotos**, which opens the profile search (`from:user filter:media`) — the same photos, unfiltered. The diagnostic and the shape-agnostic timeline walk from 3.3.2/3.3.3 are still there.

> v3.3.0 fixes the intermittent case where age-restricted media stayed blurred until you pressed F5. The blur can arrive inside the timeline/direct-post API payload itself, _after_ `__INITIAL_STATE__` has already been patched, so the old version was racing the network.

This project is a fork/rewrite of [Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX). The media-warning and TanStack hydration approach follows [PR #22 by Ivannivi](https://github.com/Saganaki22/AgebypassX/pull/22).

---

## ✅ What v3.3.0 changes

v3.2.1 only intercepted `window.__INITIAL_STATE__` and patched a single flag. That is enough for the age-assurance modal, but not for the media blur:

* X can send `sensitive_media_warning` and `media_visibility_results.blurred_image_interstitial` in the GraphQL response.
* Direct posts keep the payload as a JSON string inside the TanStack/Seroval hydration table (`window.$R.tsr`) and decode it after first paint.
* Both paths happen after `__INITIAL_STATE__`, which explains why a refresh sometimes won the race and sometimes did not.

v3.3.0 adds:

* **Five more feature flags**, not just `rweb_age_assurance_flow_enabled`.
* **Media-warning removal**, only when the payload already contains a usable X CDN media URL.
* **TanStack/Seroval hydration patching**, for the initial and streamed `Result.Ok` entries.
* **`JSON.parse`, `Response.json` and `Object.assign` hooks**, so timeline pages, direct posts and WebSocket updates are covered.
* **`unsafeWindow` support**, so the hooks target the page realm even when the userscript manager runs the script in a sandbox.
* **Targeted walkers**: flags, birthdate and media are only inspected when the object's own keys say they are relevant, with hard scan limits.
* **18 dependency-free tests** and a version-sync check.

---

## ⚙️ How it works

During `document-start` the script installs five hooks on the page realm:

| Hook | What it covers |
| --- | --- |
| `__INITIAL_STATE__` | Server-rendered bootstrap state, whether it already exists or is assigned later |
| `JSON.parse` | WebSocket frames, `response.text()` payloads, page hydration strings |
| `Response.prototype.json` | Timeline, post and search GraphQL responses |
| `Object.assign` | Stores assembled by merging state-like objects |
| `window.$R.tsr` | TanStack/Seroval results for direct posts and streamed chunks |

### Feature flags

```js
rweb_age_assurance_flow_enabled: false
age_verification_gate_enabled: false
sensitive_tweet_warnings_enabled: false
sensitive_media_settings_enabled: true
grok_settings_age_restriction_enabled: false
rweb_mvr_blurred_media_interstitial_enabled: false
```

Flags are handled in all known shapes: plain boolean, `{ value: boolean }`, numeric/string switches, and GraphQL `{ feature: "name", enabled: boolean }` entries. A birthdate of `1990-01-01` is also supplied when the payload exposes a `birthdate` object.

### Media warnings

A warning is removed only when the same payload contains a usable media URL:

* `pbs.twimg.com` for photos, or `pbs.twimg.com` + a `video.twimg.com` variant for videos/GIFs.
* `ext_media_availability.status` must be absent or `Available`.
* Post-level `mediaVisibilityResults` / `media_visibility_results` blurs are removed only if the wrapped tweet has usable media.

If the media is missing, unavailable, or only a video poster is present, the warning is left intact. The script never invents a media URL.

---

## 📦 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) or a compatible manager.
2. Open [`AgebypassX.user.js`](./AgebypassX.user.js) and install it.
3. Reload X.

Updates point at the raw file in this repository:

```text
https://raw.githubusercontent.com/danielgsanchez/AgebypassX/main/AgebypassX.user.js
```

---

## 🛠️ Debugging

Set `const DEBUG = false;` to `true` at the top of the userscript and reload. Console messages are prefixed with `[AgebypassX]`.

By default the script always prints one line on load:

```text
[AgebypassX] v3.3.4 ready
```

With `DEBUG = true` you also get the hook details:

```text
[AgebypassX] Script started
[AgebypassX] Waiting for first assignment
[AgebypassX] State hook ready
[AgebypassX] Initial state intercepted
[AgebypassX] Ready
```

A missing `State hook ready` means X exposed `__INITIAL_STATE__` in a way the script could not wrap; the response hooks still run.

### Profile media tab

On `https://x.com/<user>/media`, the script prints one summary line when a media timeline arrives, whichever hook saw it first (`UserMedia` for the GraphQL call, `hydration` for the page's embedded data):

```text
[AgebypassX] UserMedia: 0 entries, 0 tweets, 0 media
[AgebypassX] hydration: 20 entries, 20 tweets, 30 media
```

The summary walks the entire payload, so timelines nested inside dehydrated state or RSC chunks are counted. Payloads that contain no timeline at all are ignored (with `DEBUG` they show up as `Media payload without a timeline`).

* `0 entries` means X returned an empty media timeline. The photos are being filtered **before they reach the browser**, so no userscript can restore them.
* A non-zero count means the photos did arrive, and the script already removed their warnings. If the grid still looks wrong, enable `DEBUG` and check the `Media flags` line.

The profile timeline (`/user`) and the media tab (`/user/media`) use different endpoints. X can hide sensitive media from the media grid while still returning it, blurred, in the timeline.

### Empty media grid: search fallback

When X returns `0 media`, the script prints:

```text
[AgebypassX] Media tab empty; photos available via search: https://x.com/search?q=from%3A<user>%20filter%3Amedia&f=image
```

and adds a small panel at the top of the tab with **Ver todas las fotos** (that search) and **Abrir el timeline**. The search endpoint is not filtered the same way as the media grid, so the photos are usually all there — including the ones the grid hides. The panel appears only on `/user/media` pages whose media timeline came back empty, and only once per load.

---

## 🧪 Tests

No dependencies are required:

```bash
npm run check   # syntax check
npm test        # 18 tests + version sync
```

The suite covers flags, birthdate spoofing, per-media warnings, post-level wrappers, unavailable media, non-X origins, `Response.json`, profile media diagnostics (plain, empty, nested hydration, unrelated payloads and the search fallback), and TanStack hydration (initial, streamed, malformed, frozen and missing-media cases).

---

## 🔢 Version management

`package.json` and the `@version` header are checked against each other in CI (`tests/smoke.cjs`). When releasing:

1. Bump `@version` in `AgebypassX.user.js`.
2. Bump `version` in `package.json`.
3. Add the entry to [`CHANGELOG.md`](./CHANGELOG.md).
4. Run `npm run check && npm test`.
5. Commit and tag `vX.Y.Z`.

---

## ⚠️ Limitations

* This only bypasses **client-side** gating. Server-side removals or legal blocks cannot be undone from the browser.
* The profile media tab (`/user/media`) is filtered **server-side** for some accounts and regions: X can return an empty timeline even though the same photos are visible in the profile timeline. The `UserMedia: 0 entries` diagnostic line confirms it. The panel's **Ver todas las fotos** search (`from:user filter:media`) usually reaches them; the script cannot invent media X never sent.
* If X changes the flag names or the media payload structure, the script may silently do nothing. Enable `DEBUG` and check the console.
* The script does not modify account settings, cookies or requests; it only edits the data X already sent to your browser.
* `sensitive_media_settings_enabled` is intentionally set to `true`; the other flags are disabled.

---

## 🙏 Credits

* [Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX) — original userscript and feature-flag research.
* [Ivannivi](https://github.com/Ivannivi) — media-warning and TanStack hydration fix in PR #22.
* MIT licensed.
