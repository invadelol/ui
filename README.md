# @invadelol/ui

The frontend shared by the [Invade](https://invade.lol) desktop app and invade.lol: design tokens
(dark and light), primitives, and every view that displays a match or a profile. A UI change is
made here once and shows in both products.

**Design system:** [DESIGN.md](DESIGN.md) is the art direction for the app, invade.lol and its landing pages: layers, colour, type, recipes, charts, motion and a checklist. Read it before building anything new.

- **Vue 3** components, data in by props, actions out by events. No data fetching, no routing,
  nothing desktop-specific: the host injects strings, image URLs and links.
- **`@invadelol/ui/logic`**: the shared data model (`MatchSummary`, `MatchDetail`, `ProfileView`…),
  formatting, labels, the match story and the adapters from invade.lol's stored matches and
  profiles (`fromCoreMatch()`, `profileFromCore()`, `playedWithFromCore()`). Plain TypeScript, no Vue.
- **CSS**: each component imports its own styles, so a host's bundler loads them with the
  component; `tokens.css` (design tokens, fonts, the dark theme), `tokens-light.css` (the light
  theme) and `style.css` (every component's styles in one file) ship apart. Every class starts with
  `iv-`, so it sits next to Tailwind or any other CSS.

## What's in

| | |
|---|---|
| Primitives | `Button`, `Segmented`, `Tabs`, `Switch`, `Panel`, `Skeleton`, `Icon`, `Logo`, `StarButton`, `Link`, `TrendLine`; CSS-only: `.iv-badge`, `.iv-table`, `.iv-select`, `.iv-form`, `.iv-fig`, `.iv-label`, `.iv-error`, `.iv-empty` |
| Game things | `ChampIcon`, `ItemIcons`, `RunePage`, `RoleIcon`, `ObjectiveIcon`, `RankCrest` (small crests bundled), `PerfDial` |
| Matches | `MatchRow` (+ `MatchRowSkeleton`), `MatchList` (filters, summary, day groups), `MoreMatches` (infinite scroll), `MatchDetailPanel` with its tabs `Scoreboard` (each row opens `PlayerDetail`), `Breakdown`, `GoldChart`, `Timeline`, `BuildTab` (+ `PlayerPicker`) |
| Profile | `ProfileLayout` (and its loading shapes), `PlayerHeader`, `LpGraph`, `ChampionTable`, `RolesPanel`, `PlayedWithPanel` |

Where a view would share its name with a model type (`MatchDetail`, `PlayedWith`), it is a `…Panel`.

## Install

```sh
npm i @invadelol/ui     # or: pnpm add @invadelol/ui / bun add @invadelol/ui
```

`vue` ^3.5 is a peer dependency. The package is ESM, one file per module, so hosts keep their
code splitting.

To try a change before it is released, vendor a build into the host and depend on that folder:

```sh
node scripts/vendor.mjs ../app/vendor/invadelol-ui     # builds, then replaces the folder whole
```

```json
{ "dependencies": { "@invadelol/ui": "file:./vendor/invadelol-ui" } }
```

The desktop app wraps this as `pnpm ui:sync` (its `scripts/sync-ui.mjs`, from `../ui` by default).

## Host setup

```ts
import { createInvadeUi } from '@invadelol/ui'
import '@invadelol/ui/tokens.css'
import '@invadelol/ui/tokens-light.css' // only for the light theme (see Theming)

app.use(
  createInvadeUi({
    t, // (key, params) => string: English keys, the app's locale files
    locale, // Ref<string> or string: numbers, dates, ordinals
    assetUrl: (kind, id) => url, // 'champion' | 'splash' | 'item' | 'spell' | 'rune' | 'runeStyle' | 'profileIcon' | 'rank'
    name: (kind, id) => name, // champion, item, spell, rune and tree names
    linkTo: (target) => href, // { kind: 'player' | 'match' | 'champion', … } → a URL, or undefined
    onOpen: (target, event) => {}, // optional: takes the click (in-app navigation, a router visit)
    viewer, // optional: the viewer's own puuid ("You" in a scoreboard)
    favorites, // optional: { has(key), toggle(favorite) } shows the stars on rows and details
  }),
)
```

`provideInvadeUi(app, options)` does the same without the plugin form. Every option has a default
(English, no images, inert links), so a view always renders. Put the views inside an element with
the `iv-root` class (or set the same font and colour on the page).

The components bring their own styles (`sideEffects` keeps them through tree shaking): a window
that shows an icon loads the icon's few rules, not the match detail's. With server rendering, the
server build bundles the package (Vite: `ssr.noExternal: ['@invadelol/ui']`), as Node cannot import
CSS. A host that wants every style at once, or draws the CSS-only primitives (`.iv-badge`,
`.iv-table`, `.iv-fig`…) in its own markup, imports `@invadelol/ui/style.css` instead and resolves
the components' CSS imports to nothing (invade.lol does, to put the styles in a CSS layer: its
`vite.config.ts`).

**Desktop app** (`src/ui.ts` in the app): `t` / `locale` from its i18n, `assetUrl` from
`https://invade.lol/cdn/<patch>/…` (pinned to its bundled data's patch, so the WebView keeps every
image for good), `name` from its bundled `data/*.json`, `onOpen` navigates in place, `viewer` is
the signed-in player, `favorites` is the app's favorites store.

**invade.lol** (`inertia/app/ui.ts` in core): English only (the package's default strings),
`assetUrl` and `name` from the `/cdn/…` proxy and its name maps (`/cdn/perkstyle/{id}.png` for
`runeStyle`, `/cdn/emblem/{tier}.png` for `rank`), `linkTo` returns real profile URLs (crawlable, open in a new tab), `onOpen` hands the
click to the Inertia router.

### Composables

Inside a component under the plugin:

- `useInvadeUi()`: the host's options (or the defaults).
- `useFormat()`: numbers, percentages, dates, durations and ordinals in the host's language.
- `useNames()`: names and image URLs of champions, items, spells and runes through the host's resolvers.
- `gameFavorite(puuid, label, game)`: the key and contents of a game favorite, for a host's store.

Anywhere (no plugin needed):

- `useStableData(key, load)`: data that stays on screen until its replacement has arrived, for a
  view that reloads when a filter changes. `data` keeps the last answer (and `key` what it was
  for) while the next loads, then swaps in one go; the latest key wins; `load` may answer at once
  (a cache hit), with no pending state. `busy` turns on only when an answer takes over 200 ms, for
  a quiet hint (a slight dim); `ready`, `pending`, `error` and `reload()` cover the rest.
- `useDelayedFlag(source, delay)`: true once `source` has been true for `delay` ms (200 by
  default), so fast answers never show a loading hint.

### Views and slots

- `ProfileLayout`: the profile frame. Slots `header`, `side` (panels beside the feed; above it in
  two columns when narrow; without it the content takes the whole width) and the default slot (the
  feed). `loading` draws the page's own loading shapes instead.
- `MatchList`: filters, summary and day groups. Data loading stays in the host: a row opens the
  `detail` slot right below it (`<template #detail="{ game }">`), where the host loads the game and
  renders `MatchDetailPanel` (`detail: null` while loading, or a partial game it already has with
  `loading`; `error` with a Try again). Its `actions` slot puts the host's own small buttons at
  the end of the tab line (invade.lol's Copy link and match page). With
  `loadMore` (and `more`), older games load as the end of the list comes into view.
- `MoreMatches`: that end of a list, on its own for a host's own list. As it comes into view it
  calls `load()` (the host appends the next page and sets `more`), and keeps loading while the end
  stays in view: stored games load as fast as the list scrolls, with no pacing in the package.
  Only the server limits pages it must ask Riot for; when it holds them back, `load()` resolves
  `{ retryAfterMs }` and the list simply ends there, with no countdown or message. A later reach of
  the end after that window asks once more (no timer, no polling). Skeleton rows while a page is slow,
  "That's every tracked game" once `more` is false, an error with Try again when `load()` throws.
  Key it by player.
- `MatchRow` is its own size container: it drops the matchup, then farm, then items as it narrows,
  and below 520px (a phone, a narrow tile) keeps champion, loadout, short queue name, result,
  duration, K/D/A and score. `compact` is the 44px variant for lists beside other content.
- The scoreboard scrolls inside its panel below 760px instead of squeezing names.

### `@invadelol/ui/logic`

The model, formatting, labels, the match story and the adapters, in plain TypeScript (no Vue, also
importable from a server or a test). The adapters turn invade.lol's stored data into the views' model:

```ts
import { fromCoreMatch, playedWithFromCore, profileFromCore, rankFromCore, summaryOf } from '@invadelol/ui/logic'

const detail = fromCoreMatch(match, { scores: lobbyScores(match) }) // MatchDetail
const row = summaryOf(detail, puuid, match.matchId) // MatchSummary for MatchRow / MatchList
const profile = profileFromCore({ summoner, ranks, mastery, games }) // ProfileView for the profile views
const rank = rankFromCore(coreRank) // Rank
const mates = playedWithFromCore(matches, puuid) // PlayedWith
```

**Paging** (`pager.ts`): older games come in pages of `PAGE_SIZE` (15). The package never paces
them: games a host or server stores cost nothing. Riot's budget is the server's to keep (invade.lol:
a few pages per player and address, then slowly), and it says so by holding a page back.
`endOfList()` is the end's state: `ask()` is false only between a hold and the end of its window.
Tests: `pnpm test`.

### Strings

Components call `t()` with English keys, the same keys as the desktop app's locale files. Every
key the package uses is listed in `@invadelol/ui/keys.json`, for the hosts' locale checks.

## Theming

Dark is the default and all of `tokens.css` (the desktop app only has it). The light theme is
`tokens-light.css`, imported after it: `data-theme="light"` on `<html>` (or `.iv-light` on any
element); `data-theme="system"` follows the system; `.iv-dark` shows a dark piece on a light page.
Tokens keep their semantic names (`--surface-1`, `--text-2`, `--win`, `--loss`, `--brand`…).

## Development

```sh
pnpm install
pnpm story:dev     # Histoire: every component with fixtures, light and dark (toolbar switch)
pnpm typecheck
pnpm build         # dist/: index.js, logic.js, a module and its CSS per component, types,
                   # style.css, tokens.css, tokens-light.css, fonts, keys.json
pnpm story:build   # the static preview, in .histoire/dist
pnpm test          # the logic's unit tests (node --test)
```

CI (`.github/workflows/ci.yml`) runs typecheck, tests, build and the Histoire build on every push
and pull request.

## Releasing

1. Bump `version` in `package.json` (semver: a breaking prop or model change is a major bump once
   past 0.x, a minor one before).
2. Commit, then tag `v<version>` and push the tag.
3. CI checks that the tag matches the version, builds and publishes to npm (`NPM_TOKEN` secret).

Then update the hosts: `npm i @invadelol/ui@<version>` (or re-vendor).

## License

[PolyForm Noncommercial 1.0.0](LICENSE). The Archivo and Geist fonts are under the SIL Open Font
License (`src/styles/fonts/OFL.txt`). League of Legends assets belong to Riot Games; Invade isn't
endorsed by Riot Games.
