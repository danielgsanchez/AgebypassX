// ==UserScript==
// @name         AgebypassX
// @namespace    https://github.com/Saganaki22/AgebypassX
// @version      3.2.1
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

    const DEBUG = false;
    const log = (...args) => DEBUG && console.log('[AgebypassX]', ...args);
    const warn = (...args) => DEBUG && console.warn('[AgebypassX]', ...args);
    const error = (...args) => console.error('[AgebypassX]', ...args);

    log('Script started');

    const FLAG_KEY = 'rweb_age_assurance_flow_enabled';

    /**
     * Sets a feature flag to false regardless of its storage format.
     * Supports both boolean values and objects with a `value` property.
     */
    function setFlag(container, key) {
        if (!container) return;

        const flag = container[key];

        if (flag && typeof flag === 'object' && 'value' in flag) {
            if (flag.value !== false) flag.value = false;
        } else if (flag !== false) {
            container[key] = false;
        }
    }

    /**
     * Applies the age assurance patch.
     */
    function patchState(state) {
        if (!state?.featureSwitch) {
            warn('featureSwitch not found in state');
            return;
        }

        const fs = state.featureSwitch;
        fs.customOverrides ??= {};

        setFlag(fs.customOverrides, FLAG_KEY);
        setFlag(fs.user, FLAG_KEY);
        setFlag(fs.user?.config, FLAG_KEY);
        setFlag(fs.defaultConfig, FLAG_KEY);

        log('Feature flags patched');
    }

    const descriptor = Object.getOwnPropertyDescriptor(window, '__INITIAL_STATE__');

    let _state;
    let _originalGet, _originalSet;

    if (descriptor) {
        if (descriptor.get && descriptor.set) {
            _originalGet = descriptor.get;
            _originalSet = descriptor.set;
            try {
                _state = _originalGet.call(window);
            } catch (e) {}
        } else if ('value' in descriptor) {
            _state = descriptor.value;
        }
    }

    if (_state) {
        log('Patching existing state');
        patchState(_state);
    } else {
        log('Waiting for first assignment');
    }

    try {
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,
            get() {
                return _originalGet ? _originalGet.call(this) : _state;
            },
            set(newValue) {
                patchState(newValue);
                if (_originalSet) {
                    _originalSet.call(this, newValue);
                } else {
                    _state = newValue;
                }
                log('Initial state intercepted');
            }
        });
    } catch (e) {
        error('Failed to intercept __INITIAL_STATE__. The site might have changed its structure.', e);
    }

})();
