/**
 * What the host gives the views: strings, the UI language, where images live, where links go and,
 * optionally, a favorites store. Both hosts resolve images to invade.lol's `/cdn` proxy; the app
 * navigates in place, the website to real URLs. Every option has a default, so a view renders (in
 * English, without images) even with nothing provided.
 */
import { inject, isRef, shallowRef, type App, type InjectionKey, type Ref } from 'vue'
import { english, type Translate } from './logic/i18n'
import * as f from './logic/format'
import type { MatchSummary } from './logic/types'

/** Images the views draw. `rank` is the full crest of a tier (`gold`); small crests are bundled. */
export type AssetKind = 'champion' | 'splash' | 'item' | 'spell' | 'rune' | 'runeStyle' | 'profileIcon' | 'rank'
/** Things with a display name. */
export type NameKind = 'champion' | 'item' | 'spell' | 'rune' | 'runeStyle'

/** Where a link goes. */
export type LinkTarget =
  | { kind: 'player'; puuid: string; gameName?: string; tagLine?: string }
  | { kind: 'match'; gameId: number; matchId?: string | null; puuid?: string }
  | { kind: 'champion'; id: number }

/** A game saved to favorites: what its row shows offline, and the ids that open it again. */
export type GameFavorite = Pick<
  MatchSummary,
  'gameId' | 'matchId' | 'queueId' | 'championId' | 'win' | 'remake' | 'kills' | 'deaths' | 'assists' | 'creation' | 'duration'
> & { key: string; kind: 'game'; label: string; puuid: string }

export interface InvadeUiOptions {
  /** Translates an English key and fills `{name}` placeholders. Reactive if the host's is. */
  t?: Translate
  /** UI language (`en`, `fr`…), for numbers, dates and ordinals. */
  locale?: Ref<string> | string
  /** Image URL of an asset; `undefined` draws an empty well. */
  assetUrl?: (kind: AssetKind, id: number | string) => string | undefined
  /** Display name of a champion, item, spell or rune. */
  name?: (kind: NameKind, id: number) => string | undefined
  /** `href` of a link target; without one the link renders as a button. */
  linkTo?: (target: LinkTarget) => string | undefined
  /** Handles a click on a link (in-app navigation, a router visit); the default navigation is then prevented. */
  onOpen?: (target: LinkTarget, event: MouseEvent) => void
  /** The viewer's own puuid (marks "You" in a scoreboard). */
  viewer?: Ref<string | null | undefined> | string | null
  /** Favorites: a star on rows and the match detail when provided. `has` may be reactive. */
  favorites?: { has: (key: string) => boolean; toggle: (favorite: GameFavorite) => void }
}

export interface InvadeUi {
  t: Translate
  locale: Ref<string>
  assetUrl: (kind: AssetKind, id: number | string) => string | undefined
  name: (kind: NameKind, id: number) => string
  linkTo: (target: LinkTarget) => string | undefined
  onOpen: InvadeUiOptions['onOpen']
  viewer: Ref<string | null | undefined>
  favorites: InvadeUiOptions['favorites']
}

const KEY: InjectionKey<InvadeUi> = Symbol('invade-ui')

function resolve(o: InvadeUiOptions): InvadeUi {
  return {
    t: o.t ?? english,
    locale: isRef(o.locale) ? o.locale : shallowRef(o.locale ?? 'en'),
    assetUrl: o.assetUrl ?? (() => undefined),
    name: (kind, id) => o.name?.(kind, id) || (kind === 'champion' ? `#${id}` : String(id)),
    linkTo: o.linkTo ?? (() => undefined),
    onOpen: o.onOpen,
    viewer: isRef(o.viewer) ? o.viewer : shallowRef(o.viewer ?? null),
    favorites: o.favorites,
  }
}
const fallback = resolve({})

/** Installs the host's options for every view of `app`. */
export function provideInvadeUi(app: App, options: InvadeUiOptions) {
  app.provide(KEY, resolve(options))
}

/** The same, as a plugin: `app.use(createInvadeUi({ … }))`. */
export const createInvadeUi = (options: InvadeUiOptions) => ({ install: (app: App) => provideInvadeUi(app, options) })

/** The host's options (defaults when none were provided). */
export const useInvadeUi = (): InvadeUi => inject(KEY, fallback)

/**
 * Formatting in the host's language. Each function reads the language when called, so templates
 * re-render when it changes.
 */
export function useFormat() {
  const { locale, t } = useInvadeUi()
  return {
    num: (n: number, digits = 0) => f.num(n, digits, locale.value),
    pct: (x: number) => f.pct(x, locale.value),
    compact: (n: number) => f.compact(n, locale.value),
    signedGold: (n: number) => f.signedGold(n, locale.value),
    ordinal: (n: number) => f.ordinal(n, locale.value),
    kdaRatio: (k: number, d: number, a: number) => f.kdaRatio(k, d, a, locale.value),
    ago: (ms: number) => f.ago(ms, locale.value),
    dayLabel: (ms: number) => f.dayLabel(ms, t('Today'), t('Yesterday'), locale.value),
    date: (ms: number, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale.value, opts).format(ms),
    mmss: f.mmss,
    score100: f.score100,
    signedLp: f.signedLp,
  }
}

/** The key and contents of a game favorite. */
export function gameFavorite(puuid: string, label: string, g: Omit<GameFavorite, 'key' | 'kind' | 'label' | 'puuid'>): GameFavorite {
  return {
    key: `game:${puuid}:${g.gameId}`,
    kind: 'game',
    label,
    puuid,
    gameId: g.gameId,
    matchId: g.matchId,
    queueId: g.queueId,
    championId: g.championId,
    win: g.win,
    remake: g.remake,
    kills: g.kills,
    deaths: g.deaths,
    assists: g.assists,
    creation: g.creation,
    duration: g.duration,
  }
}

/** Names and image URLs of game things, through the host's resolvers. */
export const useNames = () => {
  const ui = useInvadeUi()
  return {
    champName: (id: number) => ui.name('champion', id),
    champIcon: (id: number) => ui.assetUrl('champion', id),
    runeName: (id: number) => ui.name('rune', id),
    styleName: (id: number) => ui.name('runeStyle', id),
    spellName: (id: number) => ui.name('spell', id),
    runeIcon: (id: number) => ui.assetUrl('rune', id),
    styleIcon: (id: number) => ui.assetUrl('runeStyle', id),
    spellIcon: (id: number) => ui.assetUrl('spell', id),
    itemIcon: (id: number) => ui.assetUrl('item', id),
  }
}
