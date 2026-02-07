# 🛡️ AgebypassX – v2.1.1  
Bypass **Twitter/X**’s age restrictions and unlock **sensitive media** — all **without compromising your privacy**.

> This is a fork of **AgebypassX** focused on **stability and reliability**, using a refined webpack-gating approach while preserving the original project’s privacy-first philosophy.

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

Your privacy remains fully protected. 🛡️

---

## 📸 How It Works (v2.1.x)

This version uses a **controlled Webpack hydration gate** combined with an **early state patch**:

- Intercepts `window.__INITIAL_STATE__` **before React hydration**
- Disables the age-assurance feature flag **once, at bootstrap**
- Temporarily queues Webpack chunks during initialization
- Releases immediately after patching (with a hard failsafe)

### Why this approach?
- Avoids aggressive global monkey-patching
- Preserves React and Webpack invariants
- Prevents UI freezes and infinite loading states
- Works consistently across normal reloads and hard refreshes

The script self-disables after initialization and does **not** interfere with runtime behavior.

---

## 🛠️ Troubleshooting (v2.1.x)

### Basic Issues
- If sensitive media is still blocked, refresh the page once
- Ensure Tampermonkey is enabled and the script is active
- Tested on **Chromium-based browsers** (Brave, Chrome, Edge)
- Some regions (e.g. UK) may still require VPN or DNS changes

### Important Notes
- This edition **does not include** a UI indicator or debug console
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

### v2.1.1 – Stable Webpack Gate (Fork)
- Refined webpack interception to **preserve array identity**
- Early, one-shot patch of age-assurance feature flag
- Removed permanent global monkey-patching
- Added hard failsafe to prevent UI lockups
- Improved reliability across reloads and cache states

### v2.0.0 – Simplified (Original)
- Initial webpack-based age bypass
- UI indicator and basic state interception

### v1.3.0 – Webpack Edition
- Modern architecture using webpack chunk interception
- Advanced detection, debug API, and animated status indicator
- Multiple fallbacks and enhanced diagnostics

*(Earlier versions unchanged)*

---

## ⭐ Support & Etiquette
If you encounter issues with the **original project**, please report them upstream:  
🔗 https://github.com/Saganaki22/AgebypassX/issues

For fork-specific behavior, maintain notes locally or in your fork’s issue tracker.
