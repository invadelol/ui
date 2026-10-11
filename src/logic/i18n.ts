/**
 * Strings. The English text is the key (`t('Win rate')`, `t('{n} games', { n })`), the same keys the
 * desktop app's locale files hold: the host passes its own `t`, and without one the package speaks
 * English. Every key the package uses is listed in `dist/keys.json`.
 */

export type Params = Record<string, string | number>
export type Translate = (key: string, params?: Params) => string

const PARAM = /\{(\w+)\}/g

/** Fills `{name}` placeholders. */
export const fill = (s: string, params?: Params) => (params ? s.replace(PARAM, (m, k: string) => (k in params ? String(params[k]) : m)) : s)

/** The default `t`: English, placeholders filled. */
export const english: Translate = fill

/**
 * Marks English text that is translated later with `t(x)` (labels in tables and arrays), so key
 * extractors find it. Returns its argument unchanged.
 */
export const tk = <S extends string>(s: S) => s
