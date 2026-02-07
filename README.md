# 🛡️ AgebypassX – v3.0.0
Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

> Complete rewrite focused on **stability and reliability**, fixing the cold start / refresh failures of previous versions while preserving the original project's privacy-first philosophy.

---

## 🚀 Quick Setup Guide (Recommended)
1. Install **Tampermonkey** (if not already installed).
2. Install the **AgebypassX** userscript.
3. Open X/Twitter — the bypass activates automatically during page load. ✅

> ℹ️ This edition runs silently in the background and does not require user interaction.

---

## 🔒 Privacy Matters
Like the original AgebypassX, this version:
- **Does NOT** send your data anywhere.
- **Does NOT** modify your account, cookies, or local storage.
- **Does NOT** include analytics, ads, or tracking.
- Runs entirely **locally** via Tampermonkey.

---

## 📸 How It Works (v3.0.0)

This version uses an **early state interception** approach:

- Captures any pre-existing `window.__INITIAL_STATE__` **before** overwriting the property
- Installs a getter/setter pair to intercept future assignments
- Disables the `rweb_age_assurance_flow_enabled` feature flag in both cases
- Handles both cold starts (state set later by inline script) and refreshes (state already present from cached HTML)

### Why this approach?
- Previous versions used Webpack chunk gating, which was unnecessary and fragile
- The v2.x bug was that `Object.defineProperty` destroyed the existing state on refresh, causing the app to crash reading `undefined`
- This version preserves the existing state value before installing the hook
- No chunk gating, no polling, no failsafe timers — just a clean one-shot patch

The script becomes inert after initialization and does **not** interfere with runtime behavior.

---

## 🛠️ Troubleshooting

### Basic Issues
- If sensitive media is still blocked, refresh the page once
- Ensure Tampermonkey is enabled and the script is active
- Tested on **Chromium-based browsers** (Brave, Chrome, Edge)
- Some regions (e.g. UK) may still require VPN or DNS changes

### Important Notes
- Check the browser console for `[AgebypassX]` messages to confirm the script is running
- No manual interaction is required
- If X/Twitter changes its bootstrap architecture, an update may be required

---

## 🧑‍💻 Source Code
Original project by **Saganaki22**:
🔗 https://github.com/Saganaki22/AgebypassX

This fork preserves the original license and intent, with internal architectural refinements for stability.

---

## 📜 License
Licensed under the [MIT License](https://opensource.org/licenses/MIT).
Free to audit, fork, and modify.

---

## 🔄 Version History

### v3.0.0 – Complete Rewrite
- Removed Webpack chunk gating entirely (unnecessary)
- Fixed the core bug: `Object.defineProperty` was destroying pre-existing state on refresh
- Preserves existing `__INITIAL_STATE__` value before installing getter/setter
- Works reliably on both cold start and refresh
- Minimal footprint: no timers, no polling, no chunk interception

### v2.1.1 – Stable Webpack Gate (Fork)
- Refined webpack interception to **preserve array identity**
- Early, one-shot patch of age-assurance feature flag
- Removed permanent global monkey-patching
- Added hard failsafe to prevent UI lockups
- Improved reliability across reloads and cache states

*(Earlier versions unchanged)*

---

## ⭐ Support
If you encounter issues with the **original project**, please report them upstream:
🔗 https://github.com/Saganaki22/AgebypassX/issues

For fork-specific behavior, maintain notes locally or in your fork's issue tracker.
