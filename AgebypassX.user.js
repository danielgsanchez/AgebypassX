// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      3.0.0
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

    function patchState(state) {
        if (!state) return;
        try {
            const overrides = state?.featureSwitch?.customOverrides;
            if (overrides) {
                overrides.rweb_age_assurance_flow_enabled = false;
                console.log('[AgebypassX] Age flow disabled');
            }
        } catch (e) {
            console.error('[AgebypassX] Patch error:', e);
        }
    }

    const descriptor = Object.getOwnPropertyDescriptor(window, '__INITIAL_STATE__');
    let stateVal = descriptor?.value;

    if (stateVal) {
        patchState(stateVal);
        console.log('[AgebypassX] Patched pre-existing state');
    }

    Object.defineProperty(window, '__INITIAL_STATE__', {
        configurable: true,
        get() {
            return stateVal;
        },
        set(v) {
            patchState(v);
            stateVal = v;
        }
    });

    console.log('[AgebypassX] Installed');
})();
