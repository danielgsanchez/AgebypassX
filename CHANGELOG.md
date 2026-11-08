# Changelog

All notable changes to this fork are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- CI now uses `actions/checkout@v7` and `actions/setup-node@v7` (Node 24 action runtime), removing the Node 20 deprecation warnings.
- Test matrix is Node.js 22 and 24; the minimum supported test runtime is Node.js 22.

## [3.3.0] – 2026-11-08

### Fixed

- Age-restricted media no longer stays blurred until a manual refresh.
- Media warnings delivered inside GraphQL responses (`sensitive_media_warning`, `media_visibility_results.blurred_image_interstitial`) are removed when the payload contains usable X media.
- Direct posts now work on first load: TanStack/Seroval hydration entries in `window.$R.tsr` are patched before the router reads them, including streamed `Result.Ok` chunks.
- The script no longer races `__INITIAL_STATE__`; late-arriving API payloads are covered by response hooks.

### Added

- Hooks for `JSON.parse`, `Response.prototype.json` and `Object.assign`.
- Patching of all six known age/sensitive-media flags, in boolean, `{ value }`, numeric/string and GraphQL `{ feature, enabled }` forms.
- Birthdate spoofing (`1990-01-01`) when a payload exposes a `birthdate` object.
- `unsafeWindow` support for sandboxed userscript managers.
- Targeted walkers with hard scan limits, so unrelated state and timeline data are not walked unnecessarily.
- Dependency-free test suite (`tests/smoke.cjs`) and a version-sync check.
- GitHub Actions workflow for Node.js 20, 22 and 24.

### Changed

- Update/download URLs now point at this fork.
- README rewritten to document the actual response-level behavior.

### Credits

- Media-warning and TanStack hydration approach based on [Saganaki22/AgebypassX PR #22](https://github.com/Saganaki22/AgebypassX/pull/22) by [Ivannivi](https://github.com/Ivannivi).

## [3.2.1]

- Unified `__INITIAL_STATE__` interception.
- Added safe fallbacks and the `DEBUG` toggle.
- Avoided redundant flag writes.

## [3.2.0]

- Adaptive bootstrap hook for accessor, data-property and delayed assignments.
- Improved compatibility with X deployment changes.

## [3.1.0]

- Replaced descriptor replacement with an accessor wrapper.
- Preserved X's original getter/setter.
