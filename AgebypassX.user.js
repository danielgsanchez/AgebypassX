// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      3.2.0
// @description  Age bypass for X.com
// @author       Saganaki22
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/Saganaki22/AgebypassX
// @supportURL   https://github.com/Saganaki22/AgebypassX/issues
// @updateURL    https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @downloadURL  https://greasyfork.org/scripts/547244-agebypassx-tampermonkey-edition/code/AgebypassX.user.js
// @connect      none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    console.log('[AgebypassX] Script started');

    /**
     * Sets a feature flag to false regardless of its storage format.
     * Supports both boolean values and objects with a `value` property.
     */
    function setFlag(container, key) {
        if (!container) {
            return;
        }

        if (!(key in container)) {
            container[key] = false;
            return;
        }

        const flag = container[key];

        if (
            flag &&
            typeof flag === 'object' &&
            'value' in flag
        ) {
            flag.value = false;
        } else {
            container[key] = false;
        }
    }

    /**
     * Applies the age assurance patch.
     */
    function patchState(state) {
        if (!state?.featureSwitch) {
            console.warn('[AgebypassX] featureSwitch not found');
            return;
        }

        const fs = state.featureSwitch;

        // Ensure the overrides container exists.
        fs.customOverrides ??= {};

        setFlag(fs.customOverrides, 'rweb_age_assurance_flow_enabled');
        setFlag(fs.user, 'rweb_age_assurance_flow_enabled');
        setFlag(fs.user?.config, 'rweb_age_assurance_flow_enabled');
        setFlag(fs.defaultConfig, 'rweb_age_assurance_flow_enabled');

        console.log('[AgebypassX] Feature flags patched');
    }

    const descriptor = Object.getOwnPropertyDescriptor(
        window,
        '__INITIAL_STATE__'
    );

    console.log('[AgebypassX] Descriptor:', descriptor);

    // Preserve the original accessor if one already exists.
    if (descriptor?.get && descriptor?.set) {
        console.log('[AgebypassX] Wrapping existing accessor');

        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,

            get() {
                return descriptor.get.call(this);
            },

            set(value) {
                patchState(value);
                return descriptor.set.call(this, value);
            }
        });

        return;
    }

    // Reuse the existing state if present; otherwise wait for
    // the first assignment performed by X.
    let state =
        descriptor && 'value' in descriptor
            ? descriptor.value
            : undefined;

    if (state) {
        console.log('[AgebypassX] Patching existing state');
        patchState(state);
    } else {
        console.log('[AgebypassX] Waiting for first assignment');
    }

    Object.defineProperty(window, '__INITIAL_STATE__', {
        configurable: true,
        enumerable: true,

        get() {
            return state;
        },

        set(value) {
            // Patch the incoming state before storing it.
            patchState(value);

            state = value;

            console.log('[AgebypassX] Initial state intercepted');
        }
    });

})();
