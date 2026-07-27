# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-27

### Added

- **Daily Telegram game summaries.** Players who log in via Telegram can opt
  in (from their profile) to a once-daily direct message digesting the games
  they played the day before, with a link to a shareable summary page.
  - New shareable, read-only summary page addressed by `?summary=<uuid>`,
    where any participant can open the link and — if logged in via Telegram —
    see their own rows highlighted.
  - Backend is a Supabase migration (`supabase db push`) that adds a
    `pg_cron` job calling `build_and_send_daily_summaries()`, which groups
    each opted-in user's prior-day games into a `game_summaries` row and DMs
    the link via the Telegram Bot API through the `http` extension. The bot
    token is read from Supabase Vault and never ships to the client.
  - Games now persist a `teams_data` roster snapshot so the summary page
    renders faithfully; the game-over screen was refactored to share its
    rendering with the new page (no behavior change).
  - New `VITE_TELEGRAM_BOT_USERNAME` env var powers the "press Start" deep
    link required by Telegram's rule that bots cannot cold-message users.
  - Project is now Supabase-CLI-managed (`supabase/config.toml`); the schema
    change ships as a timestamped migration. See `supabase_setup.md` §8 for
    the one-time deploy steps (enable `pg_cron`/`http`, store the bot token in
    Vault, set `app_base_url`, schedule the cron).

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

[1.1.0]: https://github.com/kix/hat/releases/tag/v1.1.0
[1.0.1]: https://github.com/kix/hat/releases/tag/v1.0.1
[1.0.0]: https://github.com/kix/hat/releases/tag/v1.0.0
