# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.13] - 2026-07-28

### Fixed

- **Telegram ID Database Conflicts.** Updated the `register_telegram_user` DB function to lookup users by their `telegram_id` metadata (rather than strict email matches), and programmatically cleans up any duplicate legacy notification profile rows. This prevents `duplicate key value violates unique constraint "unique_telegram_id"` errors when migrating users from old domain schemes.

## [1.6.12] - 2026-07-28

### Fixed

- **Supabase Generated Column Error.** Omitted the `confirmed_at` column from the manual INSERT statement in the `register_telegram_user` DB function. In newer versions of Supabase GoTrue, `confirmed_at` is a generated column, so trying to insert values into it triggers database validation errors.

## [1.6.11] - 2026-07-28

### Fixed

- **Bypassed Email Signup Rate Limits.** Created and integrated a `register_telegram_user` security definer database function that registers or updates Telegram users directly in the `auth.users` table with confirmed status (`email_confirmed_at` and `confirmed_at` set to `now()`). This bypasses GoTrue's SMTP signup confirmation emails, completely preventing "email rate limit exceeded" errors for OIDC users.

## [1.6.10] - 2026-07-28

### Fixed

- **Mock Email Domain Validation.** Changed the generated mock email domain from `telegram.hat` (using an invalid `.hat` TLD which is rejected by Supabase Auth / GoTrue's format validation library) to the universally valid `telegram.com` domain.

## [1.6.9] - 2026-07-28

### Fixed

- **Game Participant Mapping in History.** Mapped local player IDs (like generic string IDs generated during setup) to their actual Supabase user UUIDs inside the `history_data` JSONB structure (`describerId` and `guesserId`) before saving the game results. This ensures daily summaries and user statistics are compiled correctly for both local and online players.
- **Auto-Mapping Current User in Setup.** Added the currently logged-in user to the connected participants pool during team configuration, allowing autocomplete/type matching to automatically link the local player slot to their Supabase user account ID in the frontend context.

## [1.6.8] - 2026-07-28

### Added

- **Improved Telegram Linking UX.** Made the instruction text warning to open the Telegram Bot and press "Start" always visible (under a dashed divider), and dynamically displays the bot handle (e.g. `@bot_username`) so the bot is easy to find.

## [1.6.7] - 2026-07-28

### Fixed

- **Telegram OIDC Account Duplication.** Replaced the anonymous login with a stable, deterministic credential login flow linked to the user's real Telegram ID. This ensures users sign in to their existing account instead of creating duplicate anonymous profiles upon clearing browser sessions.
- **Telegram ID Extraction.** Added fallback checks (`decoded.id` / `decoded.telegram_id`) to retrieve the raw numeric Telegram user ID from the OIDC claims token, falling back to the JWT `sub` pairwise identifier only when necessary.

## [1.6.5] - 2026-07-28

### Added

- **Report Bug Link in Footer.** Added a bug reporting link pointing directly to the GitHub Issues creation page. Fully localized into Russian and English.

## [1.6.4] - 2026-07-28

### Added

- **Version Footer and Support Link.** Display the current package version in the app footer along with a support (Tribute) donation link. Fully localized into Russian and English.

## [1.6.3] - 2026-07-28

### Added

- **Google Analytics.** Injected Google tag (gtag.js) script into the index.html head for page tracking and telemetry.

## [1.6.2] - 2026-07-28

### Added

- **Landing page how-to-play description.** Added a dedicated card explaining the rules and setup instructions of the game. Fully localized into Russian and English.

## [1.6.1] - 2026-07-28

### Removed

- **Google Login integration.** Disabled Google Sign-In options from both the main landing page and the auth popover dropdown.

## [1.6.0] - 2026-07-28

### Added

- **Web NFC Name Collecting & Lobby Sharing.** Integrated Web NFC (`NDEFReader` API) to support sharing and joining local game sessions.
  - **Lobby sharing**: Write the active room join URL directly to any blank NFC card/sticker. Guests tap their phone to the card to instantly join the room.
  - **Player name scanning**: Tapping the NFC button next to a player slot prompts the host to scan a player's card/badge, automatically populating their name into the slot.
  - Fully translated NFC dialog states and error handling for Russian and English.
- **Cinematic Theme Switch Animation.** Added a premium circular ripple reveal animation when switching light/dark color modes, utilizing the modern `View Transitions API` (`document.startViewTransition`) with performance-optimized CSS clip-path masks.

## [1.5.1] - 2026-07-28

### Fixed

- **Session loading race condition.** Fixed a bug where `saveGameResult` would run before the Supabase auth session resolved, causing games to be saved with `currentUserId` as `undefined` and missing participant connections.

## [1.5.0] - 2026-07-28

### Added

- **QR-code lobby joining for local games.** Hosts of local (Pass & Play) games can now open a dynamic lobby displaying a QR code. Other players scan the QR code to connect their device, enter their name, and join the local lobby on the host's screen.
  - Automatically fetches client-side UUIDs of connected guests so their game results and achievements save directly to their profiles.
  - Added **Autocomplete integration** on team player cards, letting the host easily pick from connected guests.
  - Added **Auto-distribute button** that assigns all connected players to team slots sequentially.
  - Created a dedicated **Guest Waiting Screen** for players who join a local lobby, keeping them synced in real-time.

## [1.4.1] - 2026-07-28

### Fixed

- **Localization and pluralization support** for the new Game Over statistics screen in both Russian and English. Plurals for fouls are correctly handled (e.g., "1 foul" / "2 fouls" in English, "1 нарушение" / "2 нарушения" / "5 нарушений" in Russian).

## [1.4.0] - 2026-07-28

### Added

- **Word Packs and Custom Lists.** Players can now choose between:
  - "All words" (complete 50,000+ nouns dictionary).
  - "Frequent (top)" (lightweight top-3000 most common nouns, perfect for quick/easy games).
  - "Custom list" (import custom words via comma or newline separator directly in the lobby settings, with automatic count clamping).
- **Detailed Game Over Nominations & Statistics.** Added dedicated cards for:
  - ⚡️ Fastest Guess (fastest single correct guess).
  - ⏳ Slowest Guess (slowest single correct guess).
  - 🕵️‍♂️ Theft of the Century (Кражи века) — list of words stolen by another team after the active team failed (due to timeout, skip, or foul).
  - 🚨 Rule Breakers (Фолы) — list of players who violated word-explanation rules.
- **Dramatic End-of-Round Confetti.** Replaced simple confetti with a 3-second multi-stage cross-confetti cascade.

### Fixed

- Resolved Supabase `400 (Bad Request)` on `user_states` upsert by removing the redundant `onConflict` parameter.
- Resolved Supabase `23503 (Foreign Key Constraint)` on `game_participants` by ensuring random client-side UUIDs from local players are not treated as authenticated user IDs.
- Database setup script robustness: made all policies and triggers safe for repeat runs with pre-creation `DROP POLICY/TRIGGER IF EXISTS` cleanups.

## [1.3.0] - 2026-07-27

### Added

- **English version.** The whole app can now run in English, switchable via a
  RU/EN toggle in the header (persisted, defaults to the browser language).
  - Full UI internationalization: a lightweight in-house `i18n` layer
    (`useI18n`/`t()` for components, `tr()` for the state machine and utils)
    with a complete RU + EN message catalog. Every user-facing string was
    migrated — screens, buttons, placeholders, aria-labels, alerts, and
    multiplayer/validation messages.
  - A generated **English word dictionary** (`src/data/dictionaryEn.ts`,
    ~11.4k common nouns from WordNet scored by Zipf frequency via
    rspeer/wordfreq, difficulty-tiered and family-friendly filtered), loaded
    in place of the Russian list when the language is English. Generator
    script: `scripts/generate_english_dictionary.py`.
  - Language-aware team-name generation (English adjectives + the English
    dictionary), default player names, and date formatting.
- Word cards now use the theme text color instead of hardcoded black, so they
  render correctly in dark mode.

## [1.2.0] - 2026-07-27

### Added

- **Share a finished game to Telegram.** The game-over screen now has a
  "Поделиться в Telegram" button (plus copy-link) that links to a shareable,
  read-only `?game=<uuid>` page rendering that single game — reusing the same
  view as the game-over screen and highlighting a logged-in viewer's own rows.
  The Telegram button opens Telegram's native share composer, so the user
  picks the chat and sends it themselves (no bot delivery involved). Backed by
  a new `get_game(uuid)` `SECURITY DEFINER` RPC (migration
  `20260727203815_share_single_game.sql`) so the link resolves for any viewer,
  logged in or not; `saveGameResult` now returns the new game id to enable it.
- **Night mode.** A light/dark theme toggle in the landing header, defaulting
  to the OS preference (`auto`) and persisted across sessions. A pre-mount
  script applies the saved scheme before React renders, so there's no
  theme flash on load.

## [1.1.1] - 2026-07-27

### Fixed

- Shared summary links now render for **logged-out** viewers. `get_game_summary`
  now returns the games and participants directly as JSON (it is `SECURITY
  DEFINER`, so it bypasses table grants) instead of leaving the client to
  re-read `public.games` — which `anon` has no SELECT grant on, so a
  not-logged-in visitor previously got a `42501 permission denied` after the
  digest loaded. Adds forward migration
  `20260727202125_summary_rpc_returns_games.sql` (drops and recreates the
  function, since the return type changed from `table` to `jsonb`); the
  frontend now consumes the single RPC payload.

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

[1.6.13]: https://github.com/kix/hat/releases/tag/v1.6.13
[1.6.12]: https://github.com/kix/hat/releases/tag/v1.6.12
[1.6.11]: https://github.com/kix/hat/releases/tag/v1.6.11
[1.6.10]: https://github.com/kix/hat/releases/tag/v1.6.10
[1.6.9]: https://github.com/kix/hat/releases/tag/v1.6.9
[1.6.8]: https://github.com/kix/hat/releases/tag/v1.6.8
[1.6.7]: https://github.com/kix/hat/releases/tag/v1.6.7
[1.6.5]: https://github.com/kix/hat/releases/tag/v1.6.5
[1.6.4]: https://github.com/kix/hat/releases/tag/v1.6.4
[1.6.3]: https://github.com/kix/hat/releases/tag/v1.6.3
[1.6.2]: https://github.com/kix/hat/releases/tag/v1.6.2
[1.6.1]: https://github.com/kix/hat/releases/tag/v1.6.1
[1.6.0]: https://github.com/kix/hat/releases/tag/v1.6.0
[1.5.1]: https://github.com/kix/hat/releases/tag/v1.5.1
[1.5.0]: https://github.com/kix/hat/releases/tag/v1.5.0
[1.4.1]: https://github.com/kix/hat/releases/tag/v1.4.1
[1.4.0]: https://github.com/kix/hat/releases/tag/v1.4.0
[1.3.0]: https://github.com/kix/hat/releases/tag/v1.3.0
[1.2.0]: https://github.com/kix/hat/releases/tag/v1.2.0
[1.1.1]: https://github.com/kix/hat/releases/tag/v1.1.1
[1.1.0]: https://github.com/kix/hat/releases/tag/v1.1.0
[1.0.1]: https://github.com/kix/hat/releases/tag/v1.0.1
[1.0.0]: https://github.com/kix/hat/releases/tag/v1.0.0
