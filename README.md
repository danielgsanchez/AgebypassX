# 🛡️ AgebypassX – v3.2.1

Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

> Refined unified bootstrap interception with safe error handling, performance optimizations, and configurable debug logging for a cleaner developer experience.

---

## 📸 How It Works (v3.2.1)

Instead of relying on branching logic and multiple property definitions, AgebypassX v3.2.1 uses a **single, unified interceptor** for `window.__INITIAL_STATE__` that handles all initialization strategies seamlessly.

During startup it:

* Evaluates how `window.__INITIAL_STATE__` is currently exposed (accessors, data property, or undefined).
* Preserves X's original getter/setter or value in local variables.
* Safely attempts to intercept the property using a single `Object.defineProperty` call wrapped in a `try...catch` block.
* Patches an existing state immediately if it has already been initialized.
* Waits for the first assignment if the state has not yet been created.
* Optimizes flag patching to skip redundant writes if the flag is already `false`.

Currently, the script patches the following locations:

* `featureSwitch.defaultConfig`
* `featureSwitch.user.config`
* `featureSwitch.user`
* `featureSwitch.customOverrides`

Because the interception happens during initialization and is secured against crashes, the script becomes effectively passive and fail-safe once the application has finished bootstrapping.

---

## ✅ Why v3.2.1?

While v3.2.0 introduced adaptive support for multiple bootstrap paths, it relied on separate execution branches and lacked error recovery. 

**v3.2.1 focuses on code cleanliness, safety, and performance.**

Improvements include:

* **Unified Interception Logic:** Removed the premature `return` statement and consolidated the getter/setter wrapper into a single, highly readable block.
* **Safe Fallbacks (Try/Catch):** Wrapped the main interception in a `try...catch` block. If X.com or a browser update makes `__INITIAL_STATE__` non-configurable, the script will log an error gracefully instead of breaking the page's startup sequence.
* **Clean Console (Debug Toggle):** Added a `DEBUG` flag. Informative logs are now hidden by default to avoid console spam for regular users. Only critical errors are shown by default.
* **Optimized Patching:** The `setFlag` function now checks if a flag is already `false` before attempting to reassign it, avoiding unnecessary memory writes.

Supported bootstrap modes remain fully compatible:

* Existing accessor (`get` / `set`)
* Existing data property (`value`)
* Delayed property creation (first assignment)

---

## 🛠️ Troubleshooting

### Debugging

By default, the script operates silently except for critical errors. To view the initialization steps, open the script and change `const DEBUG = false;` to `const DEBUG = true;` at the top.

Open the browser console and look for messages beginning with:

```text
[AgebypassX]
```

A successful initialization will typically resemble one of the following:

**Delayed initialization (currently the most common):**

```text
[AgebypassX] Script started
[AgebypassX] Waiting for first assignment
[AgebypassX] Feature flags patched
[AgebypassX] Initial state intercepted
```

**Existing state:**

```text
[AgebypassX] Script started
[AgebypassX] Patching existing state
[AgebypassX] Feature flags patched
```

*(If the script fails to intercept the state due to site changes, you will see a clear `[AgebypassX] Failed to intercept...` error log.)*

---

## 🔄 Version History

### v3.2.1 – Unified Interception & Safety

* Consolidated the descriptor wrapping and value assignment into a single `Object.defineProperty` block.
* Added `try...catch` security to prevent page breakage if the property becomes immutable.
* Introduced a `DEBUG` flag and helper functions (`log`, `warn`, `error`) to keep the console clean for end-users.
* Micro-optimized `setFlag` to avoid redundant writes when a flag is already set to `false`.
* Extracted the feature flag string into a `FLAG_KEY` constant for easier maintenance.

### v3.2.0 – Adaptive Bootstrap Hook

* Reworked initialization to support every known `__INITIAL_STATE__` bootstrap strategy.
* Automatically handles:
  * Existing accessors.
  * Existing data properties.
  * Delayed property assignment.
* Improved compatibility with recent X deployment changes.
* Simplified initialization flow while preserving original behavior whenever possible.
* Maintains a minimal one-shot footprint.

### v3.1.0 – Bootstrap Wrapper Rewrite

* Replaced descriptor replacement with an accessor wrapper.
* Preserved X's original getter/setter implementation.
* Patched every known location of `rweb_age_assurance_flow_enabled`.
* Eliminated intermittent startup failures that could leave X stuck on the loading screen.
* Added optional debug logging.
