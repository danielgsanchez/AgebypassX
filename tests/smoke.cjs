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
        logs: []
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

test('reports an empty UserMedia timeline', async () => {
    const page = load();

    const data = {
        data: {
            user: {
                result: {
                    __typename: 'User',
                    timeline_v2: { timeline: { instructions: [] } }
                }
            }
        }
    };

    const response = new page.Response(
        data,
        'https://api.x.com/i/api/graphql/example/UserMedia'
    );

    await response.json();

    assert.ok(
        page.logs.some(entry =>
            entry[0] === 'info' &&
            entry[1] === '[AgebypassX] UserMedia: 0 entries, 0 tweets, 0 media'
        ),
        'expected the empty UserMedia summary line'
    );
});

test('reports the media count that X actually sent', async () => {
    const page = load();

    const data = {
        data: {
            user: {
                result: {
                    __typename: 'User',
                    timeline_v2: {
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
                }
            }
        }
    };

    const response = new page.Response(
        data,
        'https://api.x.com/i/api/graphql/example/UserMedia'
    );

    const parsed = await response.json();
    const media = parsed.data.user.result.timeline_v2.timeline
        .instructions[0].entries[0].content.itemContent
        .tweet_results.result.legacy.extended_entities.media[0];

    assert.equal(media.sensitive_media_warning, undefined);
    assert.ok(
        page.logs.some(entry =>
            entry[0] === 'info' &&
            entry[1] === '[AgebypassX] UserMedia: 1 entries, 1 tweets, 1 media'
        ),
        'expected the UserMedia summary with one item'
    );
});
