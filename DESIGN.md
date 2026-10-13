# Invade design system

One art direction (DA) for everything Invade ships: the desktop app, invade.lol (profile, home, match pages) and the landing pages (`/app`). This file is the reference. Read it before you design or build a page, a component or an overlay.

The values live in code, not here: `src/styles/tokens.css` (dark), `src/styles/tokens-light.css` (light) and `src/styles/primitives.css` in this package. The website adds a few page-level materials in `inertia/css/app.css` and `inertia/css/components.css` of invadelol/core. When this file and the code disagree, the code wins; fix this file.

---

## 1. Principles

- **Calm and premium.** Think Linear, Stripe, Raycast: precise, quiet, confident. Nothing shouts.
- **Night ink, lit from above.** Dark is the home theme. Surfaces are translucent sheets catching one soft violet light from the top right. The light theme is a faithful translation, not a different design.
- **Colour only where it means something.** Everything else is ink and white (see §3).
- **Real product, real data.** Show the actual UI and actual numbers. Never invent features or figures. Demo data uses fictional players only.
- **One idea per block.** Short titles, no paragraphs where a number or a row says it.

**Never:**
- neon, glow halos, gradient text, light leaks or blur-in text
- tilted or floating 3D panels, splash-art backgrounds
- red/green decoration
- slogans and rhetorical triads ("Every game, timed, scored and clipped")
- pills with 980px radius, flat translucent "glass" boxes, outlines on all four sides

---

## 2. Layers

From back to front. Each layer has one recipe; don't invent new ones.

| Layer | What it is | Recipe |
|---|---|---|
| **0. Chrome** | Window chrome, sidebar, site header | `--ink-0`, unlit, over the grain. One lit hairline (`--edge`) where the page sheet starts. |
| **1. Ground** | The page backdrop | `--ink-1` + **one** violet light (`--light`) + a fine static grain (`--grain`). Painted once, behind the content (`body::before` on the site, the window on the app). Never per panel. |
| **2. Sheet** | Panels, cards, tables, lists | `.iv-panel`: `background: var(--sheen), var(--surface-1); box-shadow: var(--lit); border-radius: var(--r-md)`. |
| **2b. Lit sheet** | The featured sheet of a page (Performance, the desktop card, a hero card) | `.lit-sheet` (site): the sheet + a radial of the brand light from its top-right corner at `--sheet-light`. One or two per page, not every panel. |
| **3. Row** | Match rows, list rows inside or below a sheet | `--surface-1` + `box-shadow: var(--row)`, `--r-sm`. Match rows get the result edge and tint (§6). |
| **4. Raised** | Buttons, keys, the switch knob | `--btn` + `--btn-shadow`, `--key` + `--key-shadow` (§7). |
| **5. Floating** | Menus, popovers, tooltips, dialogs, overlay windows | Opaque `--solid-1` / `--solid-2` + `--shadow-2` (menus) or `--shadow-3` (dialogs, windows). |
| **Wells** | Inset areas: item slots, chart wells, segmented controls | `--well` or `--inset` + `--inset-shadow`. Empty slot: `--glint`. |

**Rules:**
- **Don't nest sheets.** Surfaces are translucent, so stacking them shows. Inside a sheet, use rows, wells or hairlines (`--line`).
- **Hover** is a wash, never movement: `--glint` or one surface step up (`--surface-2`), with opacity or background only, over `--t-base`. No translateY lift on rows or cards.
- **Captures of the app** (landing, home card) sit in `.app-window` with `.iv-dark` on it: the app's ink in every theme, `--r-lg`, a lit top edge and rim, and `--window-depth` (`--contact` + `--shadow-3`) under it.

---

## 3. Colour

Use tokens only. Never write a raw hex or `rgb()` in a component, except a computed alpha of a token's `-rgb` triple (`rgb(var(--brand-rgb) / 0.12)`).

| Token | Meaning | Use for |
|---|---|---|
| `--ink-0`, `--ink-1` | Night ink | Chrome, page ground |
| `--surface-1…4` | Translucent sheets, in steps | 1 = sheet, 2 = hover or selected, 3 = pressed or strong, 4 = rare |
| `--solid-1`, `--solid-2` | Opaque surfaces | Anything that must hide what's behind: menus, sticky table heads, tooltips |
| `--line`, `--line-2`, `--line-3` | Hairlines | Dividers (1), borders of inputs (2), emphasis (3) |
| `--text-1` | Primary text, figures | Titles, values |
| `--text-2` | Body | Paragraphs, secondary values |
| `--text-3` | Labels, meta, units | "Last 24 h", "LP", column heads |
| `--text-4` | Quiet | Placeholders, disabled, ranks in a list |
| `--brand` (`#7b6dff`), `--brand-hi`, `--brand-a08/16/28` | **Invade itself** | The one primary action, the active place (nav, tab), focus, the viewed player, the light, chart lines. **Never data.** |
| `--win` / `--loss` (blue / red) | Good / bad **for you** | Win/loss, ally/enemy, ahead/behind, gaps (+0.31 / −0.5). Never decoration. |
| `--gold-c` | Gold | Gold amounts, MVP |
| `--tier-*` | Rank tiers | Rank names, crests and their soft tints only |
| `--warn` | Warnings | The rare warning line |

**Light theme:** comes only from `tokens-light.css`, imported after `tokens.css`. White sheets lifted by a soft shadow, the dark grain at half strength, a plain hairline edge. No page-specific theme overrides, no `[data-theme]` forks in components. A dark piece on a light page (an app capture, a game stage) takes `.iv-dark`.

---

## 4. Typography

- **Font:** `var(--font)`: Archivo at normal width, with Geist behind it for Cyrillic. Variable weight. Never another family.
- **Case:** sentence case everywhere ("Best games", not "Best Games"). No all-caps headings, except the app's tiny overlay labels.
- **Figures:** `.iv-fig`, weight 700, `font-stretch: var(--fig)` (92%), tabular, −0.01em, and the engraved mask, which fades the bottom of the glyphs. Units follow in `.iv-unit` / `--text-3`. Every number in a table or list is tabular (`.num`, `.tabular`).
- **Weights:** titles 600 (650 for the largest), body 400–500, labels 500. Never 800+.
- **Tracking:** titles −0.01 to −0.02em; body 0; labels 0.

| Scale | Page title | Section / panel title | Body | Labels / meta |
|---|---|---|---|---|
| **App** | 20px | 14px | 13px | 12px |
| **Site** | 28–32px | 16px | 13–14px | 12–13px |
| **Landing** (`.ap-*` in core) | display 44–64px · h2 30–40px · h3 22–26px | lead 15–17px | 14–15px | 12–13px |

On touch screens, inputs are at least **16px** (iOS zooms otherwise) and text is never under 11px.

---

## 5. Shape and space

- **Radii:**
  - `--r-xs` 3px: tiny chips, inner slots
  - `--r-sm` 5px: controls, badges, rows, item icons
  - `--r-md` 8px: panels, media
  - `--r-lg` 12px: windows, large sheets
  - No other radii, no pills, no cut corners.
- **Spacing:** 4px steps. Common values are 4 · 8 · 12 · 16 · 24 · 32 · 48. Panel padding 16px (14px dense); row height 44px (lists) or 64–72px (match rows); gap between rows 4px; gap between panels 12–16px.
- **Widths:**
  - site content 1040–1240px
  - reading text 640–680px
  - side column 320–360px
- **Layout:** each product keeps its own layout. The website's pages have their own disposition (left profile card, Performance panel, match history); never import the app's layout into the site or the other way round. Share components, not page structure.

---

## 6. Recipes

### Card / panel

```html
<section class="iv-panel">
  <header class="iv-panel-head"><h2>Champions</h2> <span class="meta">Patch 16.20</span></header>
  …rows separated by 1px var(--line)…
</section>
```
Featured: add `.lit-sheet` (site) to catch the light.

### Match row (the app's, everywhere)

- Each game is **its own card**, with `gap: 4px` between cards and no shared panel.
- Background: `linear-gradient(90deg, var(--tint), var(--tint-end) 45%), var(--surface-1)`.
  - win: `--tint: rgb(var(--win-rgb) / .15)`
  - loss: `--tint: rgb(var(--loss-rgb) / .15)`
- A **3px edge** in `--win` / `--loss`, full height, rounded with the card's left corners.
- `box-shadow: var(--row)`, `border-radius: var(--r-sm)`.
- Hover: the `--glint` wash fades in over 180ms.
- Use `MatchRow` from this package when you can; copy this recipe only when you can't.
- Never put result edges on rows inside a rounded panel: the edge bends around the panel's corners.

### List row (players, champions)

- 44px tall, inside a sheet.
- Portrait 30px, `--r-sm`, `--portrait-sm`. Name in `--text-1` 600; `#tag` in `--text-3`.
- Rank: `RankCrest` 16px + the tier name in its `--tier-*` colour.
- Value right-aligned, tabular.
- A tier-tinted row may carry a faint left-to-right tint of `--tier-*` at ≤ 0.06.

### Stat / figure

Label (`--text-3`, 12–13px) above the value (`.iv-fig`, 20–40px), then a unit and an optional gap in `--win` / `--loss`. Sparkline below (§8).

### Buttons and controls (`.iv-btn`)

- **Default:** `.iv-btn`, lit from above with a contact shadow, 30px tall.
- **Variants:** `.sm` 26px, `.lg` 36px, `.ghost` (no fill), `.icon-only`, `.danger`.
- **`.primary`:** the violet gradient. **One per view**, for the main action (Download, Update).
- **Segmented:** `.iv-seg`, an inset well with a raised key (`--key`).
- **Tabs:** `.iv-tabs`, a straight violet underline on the active tab.
- **Badges:** `.iv-badge` (`.brand`, `.win`, `.loss`, `.gold`).
- **Switches:** `.iv-switch`.
- **Selects:** `.iv-select`.
- **Focus:** `--focus` ring. Never remove it.
- **Touch:** controls are at least 40px tall on `(pointer: coarse)`; mouse sizes stay as above.

### Tooltip / menu

`--solid-2`, `--r-sm`, `--shadow-2`, 12px text, a 120ms fade. On touch, a tap shows it; never hover-only.

---

## 7. Data components (this package)

| Need | Use |
|---|---|
| A game's score (0–100, place, MVP/ACE) | `PerfDial` |
| A rank | `RankCrest` (small, inline) / `emblem` prop for the full emblem where designed |
| LP over time | `LpGraph` |
| A trend next to a figure | `TrendLine` (with `span` so noise reads gently) |
| A match in a list | `MatchRow` / `MatchList` / `MoreMatches` |
| A match opened | `MatchDetailPanel` (`Scoreboard`, `PlayerDetail`, `Breakdown`, `GoldChart`, `Timeline`, `BuildTab`) |
| Champions, roles, mates | `ChampionTable`, `RolesPanel`, `PlayedWithPanel` |
| Items, runes, icons | `ItemIcons`, `RunePage`, `ChampIcon`, `RoleIcon`, `ObjectiveIcon` |

Before you write a new component, check this list and the package README. If two hosts need it, it belongs in this package.

---

## 8. Charts

- **One violet line** (`--brand`, 1.5–2px) with a **soft area fade** under it (brand at ~0.18 → 0).
- **Guides** are hairlines that are almost invisible (`--line`); labels are tiny `--text-3`.
- **Markers:** one end dot. On hover: a hairline, a dot and a compact neutral tooltip.
- A target or benchmark is a faint dashed hairline.
- **Never:** red/green fills, win/loss colouring, coloured tier bands, grids or boxes.
- **Domain:** pad it so normal noise looks calm; use monotone interpolation, no overshoot.

---

## 9. Motion

- **Controls:** `--ease` with `--t-fast` 120ms / `--t-base` 180ms / `--t-slow` 240ms. Fades and washes only.
- **Landing scroll motion:** `--ease-glide` / `--ease-settle`, 600–1300ms.
  - text rises 12–20px and fades, line by line, staggered
  - pictures scale from ~0.9 and sharpen
  - figures count up, dial arcs and chart lines draw in
- **Technique:** transforms and opacity only; one rAF loop + IntersectionObserver.
- **No** bounce, flash, parallax circus or hover lifts.
- **`prefers-reduced-motion`:** show the final state, static.

---

## 10. Images

- Every game image goes through invade.lol's proxy: `/cdn/<patch>/<kind>/<id>` (champion, splash, centered, ability, item, spell, perk, perkstyle, profile-icon, emblem). Never ddragon or CommunityDragon directly; CI (`check-cdn`) enforces it in the app.
- **App captures:**
  - real app UI with **fictional names only**: the app's dev mocks hold real Riot IDs, so swap them before you capture
  - WebP/AVIF at 1× and 2× with explicit width and height
  - lazy-load everything but the hero
- **Gameplay:** only the stills already in the site's public assets; never personal recordings.

---

## 11. Mobile and touch

- No horizontal page scroll at 320–1920px. Wide tables scroll inside their own panel, with the name column pinned.
- Tap targets ≥ 40px on touch; inputs 16px; anything shown on hover also shows on tap.
- Below 1024px, side panels stack under the feed. Long feeds load older items on a tap ("Show older games"), so the panels below stay reachable.

---

## 12. Checklist before you ship a page

- [ ] Only tokens: no raw colours, no new radii, no new shadows.
- [ ] The page has one ground with one light; sheets aren't nested; one or two lit sheets at most.
- [ ] One `.primary` button.
- [ ] Type matches the scale for its product (app / site / landing); figures use `.iv-fig`, numbers are tabular.
- [ ] Colour carries meaning (violet = Invade, blue/red = for you, gold, tiers) and nothing else is coloured.
- [ ] Charts are one violet line with a fade.
- [ ] Shared components used where they exist (`MatchRow`, `PerfDial`, `RankCrest`, `LpGraph`…).
- [ ] Looks right in dark **and** light, at 390px and 1440px; no horizontal scroll; touch targets ≥ 40px.
- [ ] Motion respects reduced motion.
- [ ] Images via `/cdn`; fictional names only in demos and captures.
- [ ] The website keeps its own layout; only look and shared components come from the app.
