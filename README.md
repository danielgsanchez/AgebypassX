# 🛡️ AgebypassX – v3.2.0

Bypass **Twitter/X**'s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

> Redesigned bootstrap interception that automatically adapts to X's initialization strategy, providing maximum compatibility while remaining lightweight and privacy-friendly.

---

## 📸 How It Works (v3.2.0)

Instead of relying on a single bootstrap mechanism, AgebypassX automatically adapts to **all currently known initialization strategies** used by X.

During startup it:

* Detects how `window.__INITIAL_STATE__` is exposed.
* Preserves X's original accessor whenever one already exists.
* Patches an existing state immediately if it has already been initialized.
* Waits for the first assignment if the state has not yet been created.
* Disables the age-assurance feature flag before X consumes the state.

Currently, the script patches the following locations:

* `featureSwitch.defaultConfig`
* `featureSwitch.user.config`
* `featureSwitch.user`
* `featureSwitch.customOverrides`

Because the interception happens during initialization, the script becomes effectively passive once the application has finished bootstrapping.

---

## ✅ Why v3.2.0?

Recent X updates introduced multiple bootstrap paths depending on browser, cache state, and deployment.

Instead of assuming a single implementation, **v3.2.0 automatically supports all currently observed variants**.

Supported bootstrap modes:

* Existing accessor (`get` / `set`)
* Existing data property (`value`)
* Delayed property creation (first assignment)

Benefits include:

* Preserves X's original initialization whenever possible.
* Compatible with multiple bootstrap implementations.
* No Webpack interception.
* No polling.
* No timers.
* No runtime monkey-patching after initialization.
* Minimal performance impact.

---

## 🛠️ Troubleshooting

### Debugging

Open the browser console and look for messages beginning with:

```text
[AgebypassX]
```

A successful initialization will typically resemble one of the following:

**Delayed initialization (currently the most common):**

```text
[AgebypassX] Script started
[AgebypassX] Descriptor: undefined
[AgebypassX] Waiting for first assignment
[AgebypassX] Feature flags patched
[AgebypassX] Initial state intercepted
```

**Existing state:**

```text
[AgebypassX] Script started
[AgebypassX] Descriptor: {...}
[AgebypassX] Patching existing state
[AgebypassX] Feature flags patched
```

**Accessor-based initialization:**

```text
[AgebypassX] Script started
[AgebypassX] Descriptor: { get, set }
[AgebypassX] Wrapping existing accessor
[AgebypassX] Feature flags patched
```

---

## 🔄 Version History

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
