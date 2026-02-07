// ==UserScript==
// @name         AgebypassX – Webpack Edition
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      2.1.1
// @description  Modern age bypass for X.com using stable webpack chunk gating
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

    let released = false;
    let queued = [];
    let ok = true;

    /**********************************************************************
     * Patch age flag
     **********************************************************************/
    function patchAgeFlag(state) {
        try {
            const overrides = state?.featureSwitch?.customOverrides;
            if (overrides && overrides.rweb_age_assurance_flow_enabled !== false) {
                overrides.rweb_age_assurance_flow_enabled = false;
                console.log('[AgebypassX] Age flow disabled');
                return true;
            }
        } catch {
            ok = false;
        }
        return false;
    }

    /**********************************************************************
     * __INITIAL_STATE__ hook (one-shot)
     **********************************************************************/
    let stateValue;
    Object.defineProperty(window, '__INITIAL_STATE__', {
        configurable: true,
        get() {
            return stateValue;
        },
        set(v) {
            patchAgeFlag(v);
            stateValue = v;
        }
    });

    /**********************************************************************
     * Webpack chunk gate — SAFE VERSION
     **********************************************************************/
    function gateChunkArray(arr) {
        if (arr.__agebypassx_gated) return;

        arr.__agebypassx_gated = true;

        const originalPush = arr.push.bind(arr);

        arr.push = function (...chunks) {
            if (!released) {
                queued.push(...chunks);
                return arr.length;
            }
            return originalPush(...chunks);
        };

        console.log('[AgebypassX] Webpack gate installed');
    }

    // If array already exists
    if (Array.isArray(window.webpackChunk_twitter_web_client)) {
        gateChunkArray(window.webpackChunk_twitter_web_client);
    }

    // Intercept future assignment
    Object.defineProperty(window, 'webpackChunk_twitter_web_client', {
        configurable: true,
        set(arr) {
            gateChunkArray(arr);
            Object.defineProperty(window, 'webpackChunk_twitter_web_client', {
                value: arr,
                writable: false,
                configurable: false
            });
        },
        get() {
            return undefined;
        }
    });

    /**********************************************************************
     * Release logic
     **********************************************************************/
    function release(reason) {
        if (released) return;
        released = true;

        try {
            const arr = window.webpackChunk_twitter_web_client;
            if (arr && queued.length) {
                queued.forEach(c => Array.prototype.push.call(arr, c));
                queued = [];
            }
            console.log('[AgebypassX] Released:', reason);
        } catch (e) {
            console.error('[AgebypassX] Release error', e);
        }
    }

    // Release as soon as state exists
    const statePoll = setInterval(() => {
        if (stateValue) {
            clearInterval(statePoll);
            release('state patched');
        }
    }, 0);

    // Absolute failsafe
    setTimeout(() => release('watchdog'), 1200);
})();
