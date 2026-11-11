# 🛡️ AgebypassX

[![tests](https://github.com/danielgsanchez/AgebypassX/actions/workflows/test.yml/badge.svg)](https://github.com/danielgsanchez/AgebypassX/actions/workflows/test.yml)
[![latest tag](https://img.shields.io/github/v/tag/danielgsanchez/AgebypassX)](https://github.com/danielgsanchez/AgebypassX/tags)

Bypass **Twitter/X**'s client-side age restrictions and unlock **sensitive media** without sending anything to a third party.

A fork/rewrite of [Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX). The original script patched `__INITIAL_STATE__`; this one also patches the payloads X sends *after* that state, which is where the blur actually lives.

---

## ✨ Features

* **Age-assurance modal** — flips the six known flags in every shape X uses: boolean, `{ value }`, numeric/string, and GraphQL `{ feature, enabled }`.
* **Sensitive-media blur** — removes `sensitive_media_warning` and `media_visibility_results.blurred_image_interstitial`, only when the same payload contains a usable X CDN media URL.
* **Late payloads** — timeline, profile and direct-post responses are patched as they arrive, so the blur does not survive until a manual refresh.
* **Direct posts** — TanStack/Seroval hydration entries (`window.$R.tsr`) are patched before the router reads them, including streamed `Result.Ok` chunks.
* **Empty media tab fallback** — when X returns no photos for `/user/media`, a small panel links to the profile search, which reaches the same photos.
* **Zero network requests** — the script only edits data X already sent to your browser. No telemetry, no third-party endpoints, `@connect none`.

---

## 📦 Install

1. Install [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/) or a compatible userscript manager.
2. Open [`AgebypassX.user.js`](./AgebypassX.user.js) and install it.
3. Reload X.

The metadata already points at the raw file, so managers update automatically:

```text
https://raw.githubusercontent.com/danielgsanchez/AgebypassX/main/AgebypassX.user.js
```

After a reload the console shows one line with the running version:

```text
[AgebypassX] vX.Y.Z ready
```

---

## ⚙️ How it works

At `document-start` the script installs five hooks on the page realm:

| Hook | What it covers |
| --- | --- |
| `__INITIAL_STATE__` | Server-rendered bootstrap state, whether it already exists or is assigned later |
| `JSON.parse` | WebSocket frames, `response.text()` payloads, page hydration strings |
| `Response.prototype.json` | Timeline, post and search GraphQL responses |
| `Object.assign` | Stores assembled by merging state-like objects |
| `window.$R.tsr` | TanStack/Seroval results for direct posts and streamed chunks |

Hooks target `unsafeWindow`, so they land on the page realm even when the manager sandboxes the script.

### Feature flags

```js
rweb_age_assurance_flow_enabled: false
age_verification_gate_enabled: false
sensitive_tweet_warnings_enabled: false
sensitive_media_settings_enabled: true
grok_settings_age_restriction_enabled: false
rweb_mvr_blurred_media_interstitial_enabled: false
```

A birthdate of `1990-01-01` is supplied when the payload exposes a `birthdate` object. This only affects the data X sends to the browser; the account's real birthdate is untouched.

### Media warnings

A warning is removed only when the same payload contains a usable media URL:

* `pbs.twimg.com` for photos, or `pbs.twimg.com` + a `video.twimg.com` variant for videos/GIFs.
* `ext_media_availability.status` must be absent or `Available`.
* Post-level `mediaVisibilityResults` / `media_visibility_results` blurs are removed only if the wrapped tweet has usable media.

If the media is missing, unavailable, or only a video poster is present, the warning is left intact. The script never invents a media URL. Flag, birthdate and media walkers are targeted and capped, so unrelated timeline data is not scanned.

---

## 🖼️ The media tab

The media grid (`/user/media`) uses a different endpoint from the profile timeline (`/user`). X can return an **empty grid** for some accounts and regions even though the timeline still has the photos. That is a server-side filter, not a blur, and no userscript can bring back media X never sent.

On that page the script prints a summary as soon as the media timeline arrives:

```text
[AgebypassX] UserMedia: 0 entries, 0 tweets, 0 media
[AgebypassX] hydration: 20 entries, 20 tweets, 30 media
```

The summary walks the whole payload, so timelines nested in dehydrated state or RSC chunks are counted too.

| Output | Meaning |
| --- | --- |
| `0 entries` | X returned an empty timeline. The photos were filtered before reaching the browser. |
| `media > 0` | The photos arrived and their warnings were already removed. |

When the grid is empty, the script adds a panel at the top of the tab:

* **See all photos** — opens `https://x.com/search?q=from:<user> filter:media&f=image`.
* **Open the timeline** — opens the profile.

The search endpoint is not filtered the same way as the grid, so it usually reaches the photos the grid hides. The panel appears only on `/user/media` pages whose timeline came back empty, once per load, and its text is English.

If the search is empty too, check the search settings (three-dot menu → **Search settings**) and disable **Hide sensitive content**.

---

## 🛠️ Debugging

Set `const DEBUG = false;` to `true` at the top of the userscript and reload. Console messages are prefixed with `[AgebypassX]`.

With `DEBUG` on you also get the hook details:

```text
[AgebypassX] Patching existing state
[AgebypassX] State hook ready
[AgebypassX] Ready
```

or, when the state is assigned later:

```text
[AgebypassX] Waiting for first assignment
[AgebypassX] State hook ready
[AgebypassX] Ready
```

A missing `State hook ready` means X exposed `__INITIAL_STATE__` in a way the script could not wrap; the response hooks still run.

For media pages, `DEBUG` also lists each item's `type`, `possibly_sensitive`, warning/blur flags and `ext_media_availability`. Payloads that carry no timeline log `Media payload without a timeline` and are otherwise ignored.

---

## 🧪 Tests

No dependencies are required:

```bash
npm run check   # syntax check
npm test        # 18 tests + version sync
```

The suite covers flags, birthdate spoofing, per-media warnings, post-level wrappers, unavailable media, non-X origins, `Response.json`, profile media diagnostics (plain, empty, nested hydration, unrelated payloads and the search fallback), and TanStack hydration (initial, streamed, malformed, frozen and missing-media cases).

CI runs the same suite on Node.js 22 and 24; 22 is the minimum supported runtime.

---

## 🔢 Releasing

`package.json` and the `@version` header are checked against each other in CI (`tests/smoke.cjs`). To release:

1. Bump `@version` in `AgebypassX.user.js`.
2. Bump `version` in `package.json`.
3. Add the entry to [`CHANGELOG.md`](./CHANGELOG.md).
4. Run `npm run check && npm test`.
5. Commit, tag `vX.Y.Z` and push with `--tags`.

Release history lives in [`CHANGELOG.md`](./CHANGELOG.md).

---

## ⚠️ Limitations

* This only bypasses **client-side** gating. Server-side removals or legal blocks cannot be undone from the browser.
* The media grid is filtered **server-side** for some accounts and regions. The diagnostic line confirms it; the panel's search usually works around it.
* If X changes the flag names or the media payload structure, the script may silently do nothing. Enable `DEBUG` and check the console.
* The script does not modify account settings, cookies or requests; it only edits the data X already sent to your browser.
* `sensitive_media_settings_enabled` is intentionally set to `true`; the other flags are disabled.

---

## 🙏 Credits

* [Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX) — original userscript and feature-flag research.
* [Ivannivi](https://github.com/Ivannivi) — media-warning and TanStack hydration fix in [PR #22](https://github.com/Saganaki22/AgebypassX/pull/22).
* MIT licensed.
