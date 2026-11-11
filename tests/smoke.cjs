'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const SOURCE = fs.readFileSync(
    path.join(__dirname, '..', 'AgebypassX.user.js'),
    'utf8'
);

const PACKAGE = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

test('package.json version matches the userscript header', () => {
    const match = SOURCE.match(/^\/\/ @version\s+(\S+)\s*$/m);

    assert.ok(match, 'missing @version in userscript header');
    assert.equal(match[1], PACKAGE.version);

    const constant = SOURCE.match(/const VERSION = '([^']+)';/);
    assert.ok(constant, 'missing VERSION constant');
    assert.equal(constant[1], PACKAGE.version);
});

test('prints one startup line and no errors on a clean load', () => {
    const page = load();

    assert.deepEqual(page.logs, [
        ['info', '[AgebypassX] v' + PACKAGE.version + ' ready']
    ]);
});

// Minimal page realm: enough for the userscript to install its hooks
// without pulling in a DOM library.
function createPage() {
    const page = {
        JSON: { parse: JSON.parse, stringify: JSON.stringify },
        Object: { assign: Object.assign },
        Response: function Response(data, url) {
            this._data = data;
            this.url = url;
        },
        Proxy,
        Reflect,
        Node: class Node {},
        document: {},
        logs: [],
        intervals: []
    };

    page.setInterval = fn => {
        page.intervals.push(fn);
        return page.intervals.length;
    };

    page.console = {
        log: (...args) => page.logs.push(['log', ...args]),
        info: (...args) => page.logs.push(['info', ...args]),
        warn: (...args) => page.logs.push(['warn', ...args]),
        error: (...args) => page.logs.push(['error', ...args])
    };

    page.Response.prototype.json = function () {
        return Promise.resolve(this._data);
    };

    return page;
}

function load() {
    const page = createPage();

    const context = {
        unsafeWindow: page,
        window: page,
        document: page.document,
        console: page.console,
        JSON: page.JSON,
        Object,
        Array,
        Set,
        WeakSet,
        WeakMap,
        Proxy,
        Reflect,
        URL,
        RegExp,
        String,
        Number,
        Promise,
        Error
    };

    vm.runInNewContext(SOURCE, context, { filename: 'AgebypassX.user.js' });
    return page;
}

function photo(extra = {}) {
    return {
        type: 'photo',
        media_url_https: 'https://pbs.twimg.com/media/example.jpg',
        ...extra
    };
}

function playableVideo(extra = {}) {
    return {
        type: 'video',
        media_url_https: 'https://pbs.twimg.com/media/poster.jpg',
        video_info: {
            variants: [
                { url: 'https://video.twimg.com/example.mp4' }
            ]
        },
        ...extra
    };
}

function withWarning(media, extra = {}) {
    return {
        ...media,
        sensitive_media_warning: { adult_content: true },
        media_visibility_results: {
            blurred_image_interstitial: { reason: 'Sensitive' },
            other: 7
        },
        ...extra
    };
}

// Minimal DOM: enough for the media card (createElement, querySelector,
// querySelectorAll, insertBefore and removeChild).
function createNode(tagName) {
    const node = {
        tagName,
        parentNode: null,
        children: [],
        attrs: {},
        style: {},
        textContent: '',
        get firstChild() {
            return node.children[0] || null;
        },
        get isConnected() {
            let current = node;
            while (current.parentNode) current = current.parentNode;
            return current.__root === true;
        },
        setAttribute(name, value) {
            node.attrs[name] = String(value);
        },
        appendChild(child) {
            return node.insertBefore(child, null);
        },
        insertBefore(child, reference) {
            if (child.parentNode) child.parentNode.removeChild(child);
            const index = reference ? node.children.indexOf(reference) : -1;
            if (index >= 0) node.children.splice(index, 0, child);
            else node.children.push(child);
            child.parentNode = node;
            return child;
        },
        removeChild(child) {
            const index = node.children.indexOf(child);
            if (index >= 0) node.children.splice(index, 1);
            child.parentNode = null;
            return child;
        }
    };

    return node;
}

function attachFakeDom(page) {
    const root = createNode('#document');
    root.__root = true;

    let primaryColumn = createNode('div');
    primaryColumn.attrs['data-testid'] = 'primaryColumn';
    root.appendChild(primaryColumn);

    let emptyState = createNode('div');
    emptyState.attrs['data-testid'] = 'emptyState';
    primaryColumn.appendChild(emptyState);

    function collect(node, selector, found) {
        if (selector === '[data-agebypassx="media-fallback"]' &&
            node.attrs && node.attrs['data-agebypassx'] === 'media-fallback') {
            found.push(node);
        }

        for (let i = 0; i < node.children.length; i++) collect(node.children[i], selector, found);
    }

    Object.assign(page.document, {
        documentElement: root,
        createElement: tagName => createNode(tagName),
        querySelector(selector) {
            if (selector === '[data-testid="emptyState"]') {
                return emptyState && emptyState.isConnected ? emptyState : null;
            }
            if (selector === '[data-testid="primaryColumn"]') {
                return primaryColumn.isConnected ? primaryColumn : null;
            }

            const found = [];
            collect(root, selector, found);
            return found[0] || null;
        },
        querySelectorAll(selector) {
            const found = [];
            collect(root, selector, found);
            return found;
        }
    });

    return {
        root,
        get primaryColumn() {
            return primaryColumn;
        },
        setEmptyState(present) {
            if (present) {
                if (!emptyState || !emptyState.isConnected) {
                    emptyState = createNode('div');
                    emptyState.attrs['data-testid'] = 'emptyState';
                    primaryColumn.appendChild(emptyState);
                }
                return;
            }

            if (emptyState && emptyState.parentNode) {
                emptyState.parentNode.removeChild(emptyState);
            }
        },
        // Simulates React replacing the whole column after a re-render.
        rerenderColumn(withEmptyState) {
            if (primaryColumn.parentNode) primaryColumn.parentNode.removeChild(primaryColumn);

            primaryColumn = createNode('div');
            primaryColumn.attrs['data-testid'] = 'primaryColumn';
            root.appendChild(primaryColumn);

            emptyState = null;
            if (withEmptyState) this.setEmptyState(true);
            return primaryColumn;
        },
        panels() {
            const found = [];
            collect(root, '[data-agebypassx="media-fallback"]', found);
            return found;
        }
    };
}

test('patches every known flag in direct, wrapped and feature-array form', () => {
    const page = load();

    page.__INITIAL_STATE__ = {
        featureSwitch: {
            defaultConfig: {
                rweb_age_assurance_flow_enabled: true,
                age_verification_gate_enabled: { value: true }
            },
            user: {
                config: {
                    sensitive_tweet_warnings_enabled: 1,
                    sensitive_media_settings_enabled: 0,
                    grok_settings_age_restriction_enabled: 'true'
                }
            },
            customOverrides: {
                rweb_mvr_blurred_media_interstitial_enabled: true
            }
        },
        user: {
            birthdate: { year: 2005, month: 6, day: 15 }
        }
    };

    const fs = page.__INITIAL_STATE__.featureSwitch;

    assert.equal(fs.defaultConfig.rweb_age_assurance_flow_enabled, false);
    assert.equal(fs.defaultConfig.age_verification_gate_enabled.value, false);
    assert.equal(fs.user.config.sensitive_tweet_warnings_enabled, 0);
    assert.equal(fs.user.config.sensitive_media_settings_enabled, 1);
    assert.equal(fs.user.config.grok_settings_age_restriction_enabled, 'false');
    assert.equal(fs.customOverrides.rweb_mvr_blurred_media_interstitial_enabled, false);

    assert.deepEqual(page.__INITIAL_STATE__.user.birthdate, {
        year: 1990,
        month: 1,
        day: 1
    });
});

test('patches GraphQL-style { feature, enabled } switches', () => {
    const page = load();

    const parsed = page.JSON.parse(JSON.stringify({
        feature: 'sensitive_tweet_warnings_enabled',
        enabled: true
    }));

    assert.equal(parsed.enabled, false);
});

test('removes per-media warnings and keeps the rest of the visibility object', () => {
    const page = load();

    const parsed = page.JSON.parse(JSON.stringify({
        media: withWarning(photo())
    }));

    assert.equal(parsed.media.sensitive_media_warning, undefined);
    assert.equal(parsed.media.media_visibility_results.blurred_image_interstitial, undefined);
    assert.equal(parsed.media.media_visibility_results.other, 7);
    assert.equal(parsed.media.media_url_https, 'https://pbs.twimg.com/media/example.jpg');
});

test('keeps warnings when the media is unavailable', () => {
    const page = load();

    for (const media of [
        { ...withWarning(photo()), media_url_https: undefined },
        withWarning(photo(), { media_url_https: 'https://example.org/media.jpg' }),
        withWarning(photo(), { ext_media_availability: { status: 'Unavailable' } }),
        withWarning({ type: 'video', media_url_https: 'https://pbs.twimg.com/media/poster.jpg' })
    ]) {
        const parsed = page.JSON.parse(JSON.stringify(media));

        assert.equal(parsed.sensitive_media_warning.adult_content, true);
        assert.equal(
            parsed.media_visibility_results.blurred_image_interstitial.reason,
            'Sensitive'
        );
    }
});

test('removes a post-level blur when the wrapper already has usable media', () => {
    const page = load();

    const parsed = page.JSON.parse(JSON.stringify({
        __typename: 'TweetWithVisibilityResults',
        tweet: { media_entities2: [playableVideo()] },
        mediaVisibilityResults: {
            blurred_image_interstitial: {
                interstitial_action: 'AgeVerificationPrompt'
            },
            other: 'keep'
        },
        tweetInterstitial: { text: 'separate notice' }
    }));

    assert.equal(
        parsed.mediaVisibilityResults.blurred_image_interstitial,
        undefined
    );
    assert.equal(parsed.mediaVisibilityResults.other, 'keep');
    assert.equal(parsed.tweetInterstitial.text, 'separate notice');
});

test('keeps a post-level blur when the wrapper has no usable media', () => {
    const page = load();

    for (const post of [
        {
            __typename: 'TweetWithVisibilityResults',
            tweet: { media_entities2: [] },
            mediaVisibilityResults: { blurred_image_interstitial: { a: 1 } }
        },
        {
            __typename: 'TweetWithVisibilityResults',
            tweet: {
                media_entities2: [
                    { type: 'video', media_url_https: 'https://pbs.twimg.com/media/poster.jpg' }
                ]
            },
            mediaVisibilityResults: { blurred_image_interstitial: { a: 1 } }
        }
    ]) {
        const parsed = page.JSON.parse(JSON.stringify(post));
        assert.ok(parsed.mediaVisibilityResults.blurred_image_interstitial);
    }
});

test('cleans X API Response.json payloads below the shallow probe', async () => {
    const page = load();

    const data = {
        data: {
            timeline: {
                instructions: [{
                    entries: [{
                        content: {
                            itemContent: {
                                tweet_results: {
                                    result: {
                                        legacy: {
                                            extended_entities: {
                                                media: [withWarning(photo())]
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }]
                }]
            }
        }
    };

    const response = new page.Response(
        data,
        'https://api.x.com/graphql/example/HomeLatestTimelineQuery'
    );

    const parsed = await response.json();
    const media = parsed.data.timeline.instructions[0].entries[0]
        .content.itemContent.tweet_results.result.legacy.extended_entities.media[0];

    assert.equal(media.sensitive_media_warning, undefined);
    assert.equal(media.media_visibility_results.blurred_image_interstitial, undefined);
    assert.equal(media.media_visibility_results.other, 7);
});

test('does not touch warnings from other origins', async () => {
    const page = load();

    const data = { media: withWarning(photo()) };
    const response = new page.Response(
        data,
        'https://example.org/i/api/graphql/example/TweetDetail'
    );

    const parsed = await response.json();

    assert.equal(parsed.media.sensitive_media_warning.adult_content, true);
    assert.ok(parsed.media.media_visibility_results.blurred_image_interstitial);
});

test('patches initial and streamed TanStack hydration results', () => {
    const page = load();

    const payload = JSON.stringify({
        data: { tweetResult: { tweet: { media_entities2: [photo()] } } }
    });

    const withBlur = JSON.stringify({
        data: {
            tweetResult: {
                __typename: 'TweetWithVisibilityResults',
                tweet: { media_entities2: [photo()] },
                mediaVisibilityResults: { blurred_image_interstitial: { a: 1 } }
            }
        }
    });

    page.$R.tsr = [];

    // Initial dehydrated result.
    page.$R.tsr.push({ kind: 'Result.Ok', value: withBlur });

    // Streamed chunk.
    page.$R.tsr.push({ kind: 'Result.Ok', value: withBlur });

    for (const result of page.$R.tsr) {
        const parsed = page.JSON.parse(result.value);
        assert.equal(
            parsed.data.tweetResult.mediaVisibilityResults.blurred_image_interstitial,
            undefined
        );
    }

    // Unrelated payloads are left byte-for-byte untouched.
    const untouched = { kind: 'Result.Ok', value: payload };
    page.$R.tsr.push(untouched);
    assert.equal(untouched.value, payload);
});

test('leaves malformed, failed and missing-media hydration results alone', () => {
    const page = load();

    const missing = JSON.stringify({
        data: {
            tweetResult: {
                __typename: 'TweetWithVisibilityResults',
                tweet: { media_entities2: [] },
                mediaVisibilityResults: { blurred_image_interstitial: { a: 1 } }
            }
        }
    });

    page.$R.tsr = [];

    const results = [
        { kind: 'Result.Ok', value: '{"blurred_image_interstitial":' },
        { kind: 'Result.Error', value: missing },
        Object.freeze({ kind: 'Result.Ok', value: missing }),
        { kind: 'Result.Ok', value: missing }
    ];

    const original = results.map(result => result.value);
    page.$R.tsr.push(...results);

    assert.deepEqual(results.map(result => result.value), original);
});

test('shows the media card on an empty media tab', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());

    const panels = dom.panels();
    assert.equal(panels.length, 1);
    assert.equal(panels[0].parentNode, dom.primaryColumn);
    assert.equal(dom.primaryColumn.children[0], panels[0], 'expected the card above the empty state');
    assert.ok(page.logs.some(entry =>
        entry[0] === 'info' &&
        entry[1] === '[AgebypassX] Media tab empty; photos available via search: ' +
            'https://x.com/search?q=from%3Aexample_user%20filter%3Amedia&f=image'
    ));
});

test('does not show the card when the grid has content', () => {
    const page = load();
    const dom = attachFakeDom(page);
    dom.setEmptyState(false);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());

    assert.equal(dom.panels().length, 0);
    assert.ok(!page.logs.some(entry => String(entry[1]).includes('Media tab empty')));
});

test('keeps a single card across repeated checks', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    for (let i = 0; i < 5; i++) page.intervals.forEach(check => check());

    assert.equal(dom.panels().length, 1);

    const lines = page.logs.filter(entry => String(entry[1]).includes('Media tab empty'));
    assert.equal(lines.length, 1, 'expected a single log line');
});

test('removes the card when the photos arrive', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());
    assert.equal(dom.panels().length, 1);

    dom.setEmptyState(false);
    page.intervals.forEach(check => check());

    assert.equal(dom.panels().length, 0);
});

test('removes the card when leaving the media tab', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());
    assert.equal(dom.panels().length, 1);

    page.location.pathname = '/example_user';
    page.intervals.forEach(check => check());

    assert.equal(dom.panels().length, 0);
});

test('rebuilds the card for another profile', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());
    assert.equal(dom.panels().length, 1);

    page.location.pathname = '/other_user/media';
    page.intervals.forEach(check => check());

    const panels = dom.panels();
    assert.equal(panels.length, 1);
    assert.equal(
        panels[0].children[2].children[0].href,
        'https://x.com/search?q=from%3Aother_user%20filter%3Amedia&f=image'
    );
});

test('re-inserts the card after React re-renders the empty state', () => {
    const page = load();
    const dom = attachFakeDom(page);
    page.location = { pathname: '/example_user/media', origin: 'https://x.com' };

    page.intervals.forEach(check => check());
    assert.equal(dom.panels().length, 1);

    const column = dom.rerenderColumn(true);
    page.intervals.forEach(check => check());

    const panels = dom.panels();
    assert.equal(panels.length, 1);
    assert.equal(panels[0].parentNode, column);
    assert.equal(column.children[0], panels[0], 'expected the card above the new empty state');

    const lines = page.logs.filter(entry => String(entry[1]).includes('Media tab empty'));
    assert.equal(lines.length, 1, 're-inserting must not log again');
});
