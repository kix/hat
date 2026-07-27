# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-07-27

### Security

- Resolved a high-severity `brace-expansion` advisory
  ([GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg),
  DoS via unbounded expansion) pulled in transitively through the
  `vite-plugin-pwa` build chain. Pinned `brace-expansion` to `5.0.8` via an
  npm `overrides` entry and refreshed `postcss` and `fast-uri` to their
  patched releases. `npm audit` now reports 0 vulnerabilities. All fixes are
  build-time dev dependencies; `vite-plugin-pwa` was kept at 1.3.0 rather than
  taking the `npm audit fix --force` downgrade, and the production build is
  unchanged.

## [1.0.0] - 2026-07-27

### Changed

- Rebalanced the word-picking difficulty in `src/utils/shuffle.ts` so the
  difficulty slider behaves consistently and applies non-linearly:
  - The slider is now read as a **percentile** into the hardness-ranked
    dictionary rather than compared against a raw hardness score. Word hardness
    is heavily clustered (the dictionary has almost no genuinely easy words and
    a long hard tail), so the old linear comparison left roughly the bottom 40%
    of the slider doing nothing; equal slider moves now shift difficulty by
    roughly equal amounts across the whole range.
  - Word **length** now contributes on a logarithmic curve, so 4 → 8 letters
    matters far more than 12 → 16, instead of every extra character counting
    equally.
  - The sampling weight now falls off **exponentially** (log-linear) around the
    target difficulty, replacing the spiky `1/distance` reciprocal, with a
    single `DIFFICULTY_BANDWIDTH` knob controlling the spread.

[1.0.1]: https://github.com/kix/hat/releases/tag/v1.0.1
[1.0.0]: https://github.com/kix/hat/releases/tag/v1.0.0
