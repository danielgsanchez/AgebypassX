# 🛡️ AgebypassX – v3.1.0

Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

> Completely redesigned initialization hook focused on **maximum compatibility and stability**, preserving X's original bootstrap process while applying the age-assurance patch as early as possible.

---

## 🚀 Quick Setup Guide (Recommended)

1. Install **Tampermonkey** (if not already installed).
2. Install the **AgebypassX** userscript.
3. Open X/Twitter — the bypass activates automatically during page load. ✅

> ℹ️ The script runs silently in the background and requires no user interaction.

---

## 🔒 Privacy Matters

Like the original AgebypassX, this version:

* **Does NOT** send your data anywhere.
* **Does NOT** modify your account, cookies, or local storage.
* **Does NOT** include analytics, ads, or tracking.
* Runs entirely **locally** inside your browser via Tampermonkey.

---

## 📸 How It Works (v3.1.0)

Instead of replacing X's internal state, this version **wraps the original `window.__INITIAL_STATE__` accessor**.

During initialization it:

* Preserves X's original getter/setter.
* Intercepts the first assignment to `window.__INITIAL_STATE__`.
* Patches every known copy of the age-assurance feature flag before X processes the state.
* Lets X continue its normal initialization without altering its bootstrap flow.

Currently, the script patches:

* `featureSwitch.defaultConfig`
* `featureSwitch.user.config`
* `featureSwitch.user`
* `featureSwitch.customOverrides`

This approach avoids interfering with X's internal startup logic while remaining compatible with recent platform changes.

---

## ✅ Why v3.1.0?

Earlier implementations replaced the original property descriptor, which occasionally prevented X from completing its initialization, leaving the application stuck on the loading logo.

Version **3.1.0** instead **wraps the original accessor** and delegates back to X after applying the patch, providing a much safer and more reliable solution.

Benefits include:

* Preserves X's original initialization.
* No Webpack interception.
* No polling.
* No timers.
* No runtime monkey-patching after startup.
* Minimal performance impact.

Once initialization completes, the script becomes effectively passive.

---

## 🛠️ Troubleshooting

### Basic Issues

* Refresh the page once if sensitive media is still blocked.
* Ensure Tampermonkey is enabled and the script is active.
* Tested primarily on Chromium-based browsers (Chrome, Brave, Edge).
* Some regions (such as the UK) may still require a VPN or DNS workaround due to local legislation.

### Debugging

Open the browser console and look for messages beginning with:

```text
[AgebypassX]
```

A successful initialization should resemble:

```text
[AgebypassX] Script started
[AgebypassX] Wrapper installed
[AgebypassX] patchState()
[AgebypassX] Final values:
```

If these messages are missing, verify that the userscript is enabled and matches the current X/Twitter URL.

---

## 🧑‍💻 Source Code

Original project by **Saganaki22**:

🔗 [https://github.com/Saganaki22/AgebypassX](https://github.com/Saganaki22/AgebypassX)

This edition preserves the original project's goals, license, and privacy-first philosophy while modernizing the initialization strategy for improved reliability.

---

## 📜 License

Licensed under the **MIT License**.

Free to inspect, audit, fork, and modify.

---

## 🔄 Version History

### v3.1.0 – Bootstrap Wrapper Rewrite

* Replaced descriptor replacement with an accessor wrapper.
* Preserves X's original getter/setter implementation.
* Patches every known location of `rweb_age_assurance_flow_enabled`.
* Eliminates intermittent startup failures that could leave X stuck on the loading screen.
* Improved compatibility with recent X bootstrap changes.
* Added optional debug logging.
* Maintains a minimal, one-shot initialization footprint.

### v3.0.0 – Initialization Rewrite

* Removed Webpack chunk interception entirely.
* Introduced early `__INITIAL_STATE__` interception.
* Simplified initialization logic.
* Removed polling and fallback timers.

### v2.1.1 – Stable Webpack Gate (Fork)

* Refined Webpack interception while preserving array identity.
* Early one-shot feature flag patching.
* Removed permanent monkey-patching.
* Added failsafe protections.
* Improved reload reliability.

*(Earlier versions unchanged.)*

---

## ⭐ Support

If you encounter issues with the **original project**, please report them upstream:

🔗 [https://github.com/Saganaki22/AgebypassX/issues](https://github.com/Saganaki22/AgebypassX/issues)

Issues specific to this implementation can be reported through this repository's issue tracker.
