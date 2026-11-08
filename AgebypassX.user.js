// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      3.3.1
// @description  Age bypass and sensitive-media unlock for X.com
// @author       Saganaki22
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @homepageURL  https://github.com/danielgsanchez/AgebypassX
// @supportURL   https://github.com/danielgsanchez/AgebypassX/issues
// @updateURL    https://raw.githubusercontent.com/danielgsanchez/AgebypassX/main/AgebypassX.user.js
// @downloadURL  https://raw.githubusercontent.com/danielgsanchez/AgebypassX/main/AgebypassX.user.js
// @connect      none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = false;
    const VERSION = '3.3.1';
    const log = (...args) => DEBUG && console.log('[AgebypassX]', ...args);
    const warn = (...args) => DEBUG && console.warn('[AgebypassX]', ...args);
    const error = (...args) => console.error('[AgebypassX]', ...args);

    // Some managers run userscripts in a sandbox where `window` is not the
    // page's window. Hooking that object would patch nothing the site sees.
    const win = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
    const doc = win.document;

    // -----------------------------------------------------------------------
    // Targets
    // -----------------------------------------------------------------------
    const FLAGS = Object.freeze({
        rweb_age_assurance_flow_enabled: false,
        age_verification_gate_enabled: false,
        sensitive_tweet_warnings_enabled: false,
        sensitive_media_settings_enabled: true,
        grok_settings_age_restriction_enabled: false,
        rweb_mvr_blurred_media_interstitial_enabled: false
    });

    const FLAG_NAMES = Object.keys(FLAGS);
    const FLAG_KEYS = new Set(FLAG_NAMES.concat('feature'));

    const MEDIA_KEYS = new Set([
        'sensitive_media_warning',
        'blurred_image_interstitial',
        'media_visibility_results',
        'mediaVisibilityResults',
        'media_results'
    ]);

    const BIRTHDATE = Object.freeze({ year: 1990, month: 1, day: 1 });

    const MEDIA_WARNING_RE = /sensitive_media_warning|blurred_image_interstitial/;
    const FLAG_TEXT_RE = new RegExp(FLAG_NAMES.join('|') + '|birthdate|featureSwitch');
    const ANY_TARGET_RE = new RegExp(FLAG_TEXT_RE.source + '|' + MEDIA_WARNING_RE.source);

    const LIMITS = Object.freeze({
        fullScan: 200000,
        mediaScan: 50000,
        featureSwitch: 5000,
        jsonDepth: 8,
        responseText: 4 * 1024 * 1024
    });

    const hasOwn = Object.prototype.hasOwnProperty;

    // -----------------------------------------------------------------------
    // Small helpers
    // -----------------------------------------------------------------------
    function coerceLike(sample, desired) {
        // Switches are stored as boolean, 1/0 or "true"/"false".
        if (typeof sample === 'string') return String(desired);
        if (typeof sample === 'number') return desired ? 1 : 0;
        return desired;
    }

    function coerceScalarLike(sample, desired) {
        // Keep the numeric year a year (1/0 coercion would destroy it).
        if (typeof sample === 'string') return String(desired);
        if (typeof sample === 'number') return Number(desired);
        return desired;
    }

    function write(obj, key, value) {
        try {
            obj[key] = value;
            return obj[key] === value;
        } catch (e) {
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Feature flags + birthdate
    // -----------------------------------------------------------------------
    function patchFlags(obj) {
        for (let i = 0; i < FLAG_NAMES.length; i++) {
            const key = FLAG_NAMES[i];

            try {
                if (!(key in obj) || obj[key] === undefined) continue;

                const current = obj[key];

                // Both `flag: true` and `flag: { value: true }` are used.
                if (current && typeof current === 'object' && 'value' in current) {
                    const next = coerceLike(current.value, FLAGS[key]);
                    if (current.value !== next) write(current, 'value', next);
                } else {
                    const next = coerceLike(current, FLAGS[key]);
                    if (current !== next) write(obj, key, next);
                }
            } catch (e) {
                warn('Flag patch failed:', key, e);
            }
        }

        // GraphQL sends switches as { feature: "name", enabled: bool }.
        try {
            const name = obj.feature;
            if (typeof name === 'string' && hasOwn.call(FLAGS, name) && 'enabled' in obj) {
                const next = coerceLike(obj.enabled, FLAGS[name]);
                if (obj.enabled !== next) write(obj, 'enabled', next);
            }
        } catch (e) {}
    }

    function patchBirthdate(obj) {
        try {
            const b = obj.birthdate;
            if (!b || typeof b !== 'object') return;

            const fields = [
                ['year', BIRTHDATE.year],
                ['month', BIRTHDATE.month],
                ['day', BIRTHDATE.day]
            ];

            for (let i = 0; i < fields.length; i++) {
                const key = fields[i][0];
                const next = coerceScalarLike(b[key], fields[i][1]);
                if (b[key] !== next) write(b, key, next);
            }
        } catch (e) {}
    }

    // -----------------------------------------------------------------------
    // Sensitive-media blur removal
    //
    // X can send the blur in the API payload itself, after __INITIAL_STATE__
    // has already been patched. This is the part that made the script only
    // work on some refreshes.
    // -----------------------------------------------------------------------
    let removedWarnings = 0;

    function dropWarning(owner, key) {
        if (!owner || typeof owner !== 'object' || !hasOwn.call(owner, key)) return;
        try {
            if (Reflect.deleteProperty(owner, key)) removedWarnings++;
        } catch (e) {}
    }

    function hasUsableMedia(media) {
        if (!media || typeof media !== 'object') return false;

        const url = media.media_url_https;
        if (typeof url !== 'string' || !/^https:\/\/(?:pbs|video)\.twimg\.com\//.test(url)) return false;

        if (media.type && media.type !== 'photo' && media.type !== 'video' && media.type !== 'animated_gif') {
            return false;
        }

        const availability = media.ext_media_availability && media.ext_media_availability.status;
        if (availability && availability !== 'Available') return false;

        if (media.type === 'video' || media.type === 'animated_gif') {
            const variants = media.video_info && media.video_info.variants;
            if (!Array.isArray(variants) ||
                !variants.some(v => v && /^https:\/\/video\.twimg\.com\//.test(v.url))) {
                return false;
            }
        }

        return true;
    }

    function patchMedia(obj) {
        // The blur may be attached to the post wrapper instead of the media.
        const visibility = obj.media_visibility_results || obj.mediaVisibilityResults;

        if (visibility && visibility.blurred_image_interstitial) {
            const tweet = obj.tweet;
            const modernMedia = tweet && tweet.media_entities2;
            const legacyMedia = tweet && tweet.legacy &&
                tweet.legacy.extended_entities && tweet.legacy.extended_entities.media;

            const media = Array.isArray(modernMedia) && modernMedia.length ? modernMedia : legacyMedia;

            if (Array.isArray(media) && media.length && media.every(hasUsableMedia)) {
                dropWarning(visibility, 'blurred_image_interstitial');
            }
        }

        // Per-media warnings, only when the media URL is actually usable.
        if (!hasUsableMedia(obj)) return;

        dropWarning(obj, 'sensitive_media_warning');
        dropWarning(obj, 'blurred_image_interstitial');
        dropWarning(obj.media_visibility_results, 'blurred_image_interstitial');

        const result = obj.media_results && obj.media_results.result;
        if (result) dropWarning(result.media_visibility_results, 'blurred_image_interstitial');
    }

    // -----------------------------------------------------------------------
    // Walkers
    //
    // One single pass over each object: trigger the expensive patchers only
    // when the object's own keys say they may be relevant.
    // -----------------------------------------------------------------------
    function patchNode(obj, keys) {
        let needsFlags = false;
        let needsMedia = false;
        let needsBirthdate = false;

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (FLAG_KEYS.has(key)) needsFlags = true;
            else if (key === 'birthdate') needsBirthdate = true;
            else if (MEDIA_KEYS.has(key)) needsMedia = true;
        }

        if (needsFlags) patchFlags(obj);
        if (needsBirthdate) patchBirthdate(obj);
        if (needsMedia) patchMedia(obj);
    }

    function isTraversable(value, visited) {
        if (!value || typeof value !== 'object') return false;
        if (visited.has(value)) return false;
        if (value === win || value === doc) return false;
        if (win.Node && value instanceof win.Node) return false;
        return true;
    }

    /**
     * @param {object} root
     * @param {'all'|'media'} mode
     * @param {number} maxNodes
     */
    function patch(root, mode = 'all', maxNodes = mode === 'media' ? LIMITS.mediaScan : LIMITS.fullScan) {
        if (!root || typeof root !== 'object') return;

        const visited = new WeakSet();
        const stack = [root];
        let remaining = maxNodes;

        while (stack.length) {
            const obj = stack.pop();

            if (!isTraversable(obj, visited)) continue;
            visited.add(obj);

            if (--remaining < 0) {
                warn('Scan limit reached');
                break;
            }

            let keys;
            try {
                keys = Object.keys(obj);
            } catch (e) {
                continue;
            }

            if (mode === 'media') {
                for (let i = 0; i < keys.length; i++) {
                    if (MEDIA_KEYS.has(keys[i])) {
                        patchMedia(obj);
                        break;
                    }
                }
            } else {
                patchNode(obj, keys);
            }

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key === 'window' || key === 'document' || key === 'parent' || key === 'top') continue;

                let child;
                try {
                    child = obj[key];
                } catch (e) {
                    continue;
                }

                if (child && typeof child === 'object') stack.push(child);
            }
        }
    }

    // Used only for non-X API responses, where flags are unusual.
    function hasFlagsNearby(obj, depth, seen = new WeakMap()) {
        if (!obj || typeof obj !== 'object' || depth < 0) return false;
        if (seen.has(obj) && seen.get(obj) >= depth) return false;
        seen.set(obj, depth);

        let keys;
        try {
            keys = Object.keys(obj);
        } catch (e) {
            return false;
        }

        for (let i = 0; i < keys.length; i++) {
            if (FLAG_KEYS.has(keys[i]) || keys[i] === 'birthdate' || keys[i] === 'featureSwitch') {
                return true;
            }
        }

        if (depth === 0) return false;

        for (let i = 0; i < keys.length; i++) {
            let child;
            try {
                child = obj[keys[i]];
            } catch (e) {
                continue;
            }
            if (child && typeof child === 'object' && hasFlagsNearby(child, depth - 1, seen)) return true;
        }

        return false;
    }

    function spoofAs(nativeFn, fn, name) {
        try {
            Object.defineProperty(fn, 'length', { value: nativeFn.length, configurable: true });
        } catch (e) {}
        try {
            Object.defineProperty(fn, 'name', { value: name, configurable: true });
        } catch (e) {}
    }

    // -----------------------------------------------------------------------
    // Hook 1: __INITIAL_STATE__
    // -----------------------------------------------------------------------
    (function hookInitialState() {
        let state;

        try {
            const descriptor = Object.getOwnPropertyDescriptor(win, '__INITIAL_STATE__');

            if (descriptor) {
                if (typeof descriptor.get === 'function') {
                    try {
                        state = descriptor.get.call(win);
                    } catch (e) {
                        error('Could not read __INITIAL_STATE__', e);
                        return;
                    }
                } else if ('value' in descriptor) {
                    state = descriptor.value;
                }
            }

            if (state && typeof state === 'object') {
                log('Patching existing state');
                patchState(state);
            }

            const originalGet = descriptor && descriptor.get;
            const originalSet = descriptor && descriptor.set;

            Object.defineProperty(win, '__INITIAL_STATE__', {
                configurable: true,
                enumerable: true,
                get() {
                    return originalGet ? originalGet.call(this) : state;
                },
                set(value) {
                    if (value && typeof value === 'object') {
                        try {
                            patchState(value);
                        } catch (e) {
                            error('Could not patch __INITIAL_STATE__', e);
                        }
                    }

                    if (originalSet) originalSet.call(this, value);
                    else state = value;
                }
            });

            log(state ? 'State hook ready' : 'Waiting for first assignment');
        } catch (e) {
            // Non-configurable property: the captured state is still patched,
            // and the response hooks keep working.
            error('Could not install __INITIAL_STATE__ hook', e);
        }
    })();

    function patchState(state) {
        if (!state || typeof state !== 'object') return;

        // Flags live under featureSwitch; walking only that branch avoids
        // touching the (large) entities/timeline parts of the state.
        if (state.featureSwitch) {
            patch(state.featureSwitch, 'all', LIMITS.featureSwitch);
        } else {
            patch(state);
        }

        if (state.user) {
            patchFlags(state.user);
            if (state.user.config) patchFlags(state.user.config);
            patchBirthdate(state.user);
        }

        patchBirthdate(state);
    }

    // -----------------------------------------------------------------------
    // Hook 2: JSON.parse (WebSocket frames, response.text(), page hydration)
    // -----------------------------------------------------------------------
    let nativeJSON;

    (function hookJsonParse() {
        const json = win.JSON;
        const nativeParse = json.parse;
        const nativeStringify = json.stringify;

        function parse(text, reviver) {
            const result = nativeParse.apply(this, arguments);

            try {
                if (result && typeof result === 'object' && typeof text === 'string' && ANY_TARGET_RE.test(text)) {
                    patch(result, FLAG_TEXT_RE.test(text) ? 'all' : 'media');
                }
            } catch (e) {
                warn('JSON.parse patch failed', e);
            }

            return result;
        }

        spoofAs(nativeParse, parse, 'parse');
        json.parse = parse;

        // Kept for the hydration hook (avoids re-entering the patched parse).
        nativeJSON = { parse: nativeParse, stringify: nativeStringify };
    })();

    // -----------------------------------------------------------------------
    // Hook 3: Object.assign
    // -----------------------------------------------------------------------
    (function hookObjectAssign() {
        try {
            const pageObject = win.Object;
            const nativeAssign = pageObject.assign;

            function assign(target) {
                const result = nativeAssign.apply(this, arguments);

                try {
                    if (target && typeof target === 'object' &&
                        (target.featureSwitch || target.entities || target.users)) {
                        patch(target);
                    }
                } catch (e) {
                    warn('Object.assign patch failed', e);
                }

                return result;
            }

            spoofAs(nativeAssign, assign, 'assign');
            pageObject.assign = assign;
        } catch (e) {
            warn('Could not hook Object.assign', e);
        }
    })();

    // -----------------------------------------------------------------------
    // Hook 4: Response.prototype.json
    // -----------------------------------------------------------------------
    function isXApiUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' &&
                /^(?:api\.|www\.)?(?:x|twitter)\.com$/.test(url.hostname) &&
                /^\/(?:i\/api\/|graphql\/|1\.1\/|2\/)/.test(url.pathname);
        } catch (e) {
            return false;
        }
    }

    (function hookResponseJson() {
        try {
            const responseProto = win.Response && win.Response.prototype;
            if (!responseProto || typeof responseProto.json !== 'function') return;

            const nativeJson = responseProto.json;

            function json() {
                const response = this;

                return nativeJson.apply(this, arguments).then(data => {
                    try {
                        if (!data || typeof data !== 'object') return data;

                        // X API payloads always get the media pass; the flags
                        // are checked only when they plausibly appear.
                        if (isXApiUrl(response.url)) {
                            patch(data, 'all');
                        } else if (hasFlagsNearby(data, 3)) {
                            patch(data);
                        }
                    } catch (e) {
                        warn('Response.json patch failed', e);
                    }

                    return data;
                });
            }

            spoofAs(nativeJson, json, 'json');
            responseProto.json = json;
        } catch (e) {
            warn('Could not hook Response.json', e);
        }
    })();

    // -----------------------------------------------------------------------
    // Hook 5: TanStack/Seroval hydration table (window.$R.tsr)
    //
    // Direct post pages keep the API payload as a JSON string in a
    // "Result.Ok" entry and decode it after first paint. This is the race
    // that left media blurred until a refresh.
    // -----------------------------------------------------------------------
    function patchHydrationResult(result) {
        try {
            if (!result || typeof result !== 'object' || result.kind !== 'Result.Ok') return;

            const field = Object.getOwnPropertyDescriptor(result, 'value');
            if (!field || !field.writable || typeof field.value !== 'string') return;
            if (field.value.length > LIMITS.responseText) return;
            if (!MEDIA_WARNING_RE.test(field.value)) return;

            let data;
            try {
                data = nativeJSON.parse(field.value);
            } catch (e) {
                return;
            }

            if (!data || typeof data !== 'object') return;

            const before = removedWarnings;
            patch(data, 'media');

            if (removedWarnings !== before) {
                try {
                    result.value = nativeJSON.stringify(data);
                } catch (e) {}
            }
        } catch (e) {
            // Leave unexpected or immutable results untouched.
        }
    }

    (function hookHydrationTable() {
        const hooked = new WeakSet();
        const ProxyCtor = win.Proxy;
        const ReflectObj = win.Reflect;

        function watchTable(table) {
            if (!Array.isArray(table)) return table;

            table.forEach(patchHydrationResult);

            if (!ProxyCtor) return table;

            return new ProxyCtor(table, {
                set(target, key, value) {
                    try {
                        patchHydrationResult(value);
                    } catch (e) {}
                    return ReflectObj.set(target, key, value);
                }
            });
        }

        function install(references) {
            if (!references || typeof references !== 'object') return references;
            if (hooked.has(references)) return references;
            hooked.add(references);

            const existing = Object.getOwnPropertyDescriptor(references, 'tsr');

            if (!existing) {
                let table;
                try {
                    Object.defineProperty(references, 'tsr', {
                        configurable: true,
                        enumerable: true,
                        get() {
                            return table;
                        },
                        set(value) {
                            table = watchTable(value);
                        }
                    });
                } catch (e) {
                    warn('Could not define $R.tsr', e);
                }
                return references;
            }

            if ('value' in existing) {
                const watched = watchTable(existing.value);

                if (existing.writable) {
                    try {
                        Object.defineProperty(references, 'tsr', {
                            configurable: existing.configurable !== false,
                            enumerable: existing.enumerable !== false,
                            writable: true,
                            value: watched
                        });
                    } catch (e) {
                        warn('Could not replace existing $R.tsr', e);
                    }
                }

                return references;
            }

            try {
                let table = existing.get ? existing.get.call(references) : undefined;

                Object.defineProperty(references, 'tsr', {
                    configurable: true,
                    enumerable: existing.enumerable !== false,
                    get() {
                        return table;
                    },
                    set(value) {
                        table = watchTable(value);
                    }
                });
            } catch (e) {
                warn('Could not wrap $R.tsr', e);
            }

            return references;
        }

        try {
            let references = win.$R;

            if (!references || typeof references !== 'object') references = {};

            install(references);

            // X may replace $R during bootstrap.
            Object.defineProperty(win, '$R', {
                configurable: true,
                enumerable: true,
                get() {
                    return references;
                },
                set(value) {
                    references = (value && typeof value === 'object') ? install(value) : value;
                }
            });
        } catch (e) {
            warn('Could not install $R hook', e);
        }
    })();

    // One line is always printed so users can confirm the script loaded.
    // Everything else stays behind DEBUG.
    console.info('[AgebypassX] v' + VERSION + ' ready');
    log('Ready');
})();
