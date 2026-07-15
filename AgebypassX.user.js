// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      3.1.0
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
    function setFlag(container, key, location) {
        if (!container) {
            console.log(`[AgebypassX] ${location}: container not found`);
            return;
        }

        // Create the override if it does not exist.
        if (!(key in container)) {
            console.log(`[AgebypassX] ${location}: creating ${key}`);
            container[key] = false;
            return;
        }

        const flag = container[key];

        if (
            flag &&
            typeof flag === 'object' &&
            'value' in flag
        ) {
            console.log(
                `[AgebypassX] ${location}: ${key}.value ${flag.value} -> false`
            );

            flag.value = false;
        } else {
            console.log(
                `[AgebypassX] ${location}: ${key} ${flag} -> false`
            );

            container[key] = false;
        }
    }

    /**
     * Applies the patch to every known location where the feature
     * flag may be stored.
     */
    function patchState(state) {
        console.log('[AgebypassX] patchState()');

        if (!state?.featureSwitch) {
            console.warn('[AgebypassX] featureSwitch not found');
            return;
        }

        const fs = state.featureSwitch;

        // Ensure the overrides object exists.
        fs.customOverrides ??= {};

        setFlag(
            fs.customOverrides,
            'rweb_age_assurance_flow_enabled',
            'customOverrides'
        );

        setFlag(
            fs.user,
            'rweb_age_assurance_flow_enabled',
            'user'
        );

        setFlag(
            fs.user?.config,
            'rweb_age_assurance_flow_enabled',
            'user.config'
        );

        setFlag(
            fs.defaultConfig,
            'rweb_age_assurance_flow_enabled',
            'defaultConfig'
        );

        console.log('[AgebypassX] Final values:', {
            override: fs.customOverrides?.rweb_age_assurance_flow_enabled,
            user: fs.user?.rweb_age_assurance_flow_enabled,
            userConfig:
                fs.user?.config?.rweb_age_assurance_flow_enabled?.value,
            default:
                fs.defaultConfig?.rweb_age_assurance_flow_enabled?.value,
        });
    }

    const descriptor = Object.getOwnPropertyDescriptor(
        window,
        '__INITIAL_STATE__'
    );

    console.log('[AgebypassX] Descriptor:', descriptor);

    if (
        descriptor &&
        typeof descriptor.get === 'function' &&
        typeof descriptor.set === 'function'
    ) {
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,

            get() {
                return descriptor.get.call(this);
            },

            set(value) {
                console.log('[AgebypassX] __INITIAL_STATE__ assigned');

                try {
                    patchState(value);
                } catch (e) {
                    console.error('[AgebypassX] patchState failed:', e);
                }

                const result = descriptor.set.call(this, value);

                console.log('[AgebypassX] Original setter executed');

                return result;
            }
        });

        console.log('[AgebypassX] Wrapper installed');
    } else {
        console.warn(
            '[AgebypassX] __INITIAL_STATE__ is not an accessor property',
            descriptor
        );
    }
})();
