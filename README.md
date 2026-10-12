# @invadelol/ui

The frontend shared by the [Invade](https://invade.lol) desktop app and invade.lol: design tokens
(dark and light), primitives, and every view that displays a match or a profile. A UI change is
made here once and shows in both products.

- **Vue 3** components, data in by props, actions out by events. No data fetching, no routing,
  nothing desktop-specific: the host injects strings, image URLs and links.
- **`@invadelol/ui/logic`**: the shared data model (`MatchSummary`, `MatchDetail`, `ProfileView`…),
  formatting, labels, the match story and the adapters from invade.lol's stored matches and
  profiles (`fromCoreMatch()`, `profileFromCore()`, `playedWithFromCore()`). Plain TypeScript, no Vue.
- **CSS**: `tokens.css` (design tokens, fonts, themes) and `style.css` (everything the components
  draw). Every class starts with `iv-`, so it sits next to Tailwind or any other CSS.

## What's in

| | |
|---|---|
| Primitives | `Button`, `Segmented`, `Tabs`, `Switch`, `Panel`, `Skeleton`, `Icon`, `Logo`, `StarButton`, `Link`, `TrendLine`; CSS-only: `.iv-badge`, `.iv-table`, `.iv-select`, `.iv-form`, `.iv-fig`, `.iv-label`, `.iv-error`, `.iv-empty` |
| Game things | `ChampIcon`, `ItemIcons`, `RunePage`, `RoleIcon`, `ObjectiveIcon`, `RankCrest` (small crests bundled), `PerfDial` |
| Matches | `MatchRow` (+ `MatchRowSkeleton`), `MatchList` (filters, summary, day groups), `MatchDetailPanel` with its tabs `Scoreboard`, `Breakdown`, `GoldChart`, `Timeline`, `BuildTab` (+ `PlayerPicker`) |
| Profile | `ProfileLayout` (and its loading shapes), `PlayerHeader`, `LpGraph`, `ChampionTable`, `RolesPanel`, `PlayedWithPanel` |

Where a view would share its name with a model type (`MatchDetail`, `PlayedWith`), it is a `…Panel`.

## Install

Until the package is on npm, hosts use a vendored build:

```sh
# in this repo
node scripts/vendor.mjs ~/private/invade/vendor/invadelol-ui
```

```json
{ "dependencies": { "@invadelol/ui": "file:./vendor/invadelol-ui" } }
```

Once published: `pnpm add @invadelol/ui` (`vue` ^3.5 is a peer dependency).

## Host setup

```ts
import { createInvadeUi } from '@invadelol/ui'
import '@invadelol/ui/tokens.css'
import '@invadelol/ui/style.css'

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

Every option has a default (English, no images, inert links), so a view always renders. Put the
views inside an element with the `iv-root` class (or set the same font and colour on the page).

**Desktop app**: `t` / `locale` from `src/i18n.ts`, `assetUrl` and `name` from Data Dragon and the
bundled `data/*.json`, `onOpen` navigates in place, `favorites` is the app's favorites store.

**invade.lol**: `assetUrl` maps to the `/cdn/…` proxy (`/cdn/perkstyle/{id}.png` for `runeStyle`),
`linkTo` returns the real URLs (crawlable, open in a new tab), `onOpen` hands the visit to the
Inertia router. Stored matches go through the adapter:

```ts
import { fromCoreMatch, profileFromCore, summaryOf } from '@invadelol/ui/logic'

const detail = fromCoreMatch(match, { scores: lobbyScores(match) }) // MatchDetail
const row = summaryOf(detail, puuid, match.matchId) // MatchSummary for MatchRow / MatchList
const profile = profileFromCore({ summoner, ranks, mastery, games }) // ProfileView for the profile views
```

Data loading stays in the host: `MatchList` renders the open game through its `detail` slot
(`<template #detail="{ game }">`), where the host loads it and renders `MatchDetailPanel`
(`detail: null` while loading, `error` with a Try again).

### Strings

Components call `t()` with English keys, the same keys as the desktop app's locale files. Every
key the package uses is listed in `@invadelol/ui/keys.json`, for the hosts' locale checks.

## Theming

Dark is the default. Light: `data-theme="light"` on `<html>` (or `.iv-light` on any element);
`data-theme="system"` follows the system; `.iv-dark` shows a dark piece on a light page. Tokens
keep their semantic names (`--surface-1`, `--text-2`, `--win`, `--loss`, `--brand`…).

## Development

```sh
pnpm install
pnpm story:dev     # Histoire: every component with fixtures, light and dark (toolbar switch)
pnpm typecheck
pnpm build         # dist/: index.js, logic.js, types, style.css, tokens.css, fonts, keys.json
pnpm story:build   # the static preview, in .histoire/dist
```

CI runs the same checks; a `v*` tag publishes to npm once the `NPM_TOKEN` secret exists.

## License

[PolyForm Noncommercial 1.0.0](LICENSE). The Archivo and Geist fonts are under the SIL Open Font
License (`src/styles/fonts/OFL.txt`). League of Legends assets belong to Riot Games; Invade isn't
endorsed by Riot Games.
