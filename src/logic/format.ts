/**
 * Figures for display. Locale-aware functions take the UI language last (`en` by default); views
 * call them through `useFormat()`, which passes the host's language.
 */

const formatters = new Map<string, Intl.NumberFormat>()
/** Locale-aware number: `num(1234.5, 1, 'fr')` → "1 234,5". */
export function num(n: number, digits = 0, locale = 'en'): string {
  const key = `${locale}|${digits}`
  let f = formatters.get(key)
  if (!f) formatters.set(key, (f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })))
  return f.format(n)
}

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** 2340 -> "+2.3k", -800 -> "-800" */
export function signedGold(n: number, locale = 'en'): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  const a = Math.abs(n)
  return sign + (a >= 1000 ? `${num(a / 1000, 1, locale)}k` : num(a, 0, locale))
}

export function pct(x: number, locale = 'en'): string {
  return `${num(Math.round(x * 100), 0, locale)}%`
}

/** 1532 -> "1.5k", 240000 -> "240k", 12 -> "12" */
export function compact(n: number, locale = 'en'): string {
  if (n >= 100_000) return `${num(Math.round(n / 1000), 0, locale)}k`
  if (n >= 1000) return `${num(n / 1000, 1, locale)}k`
  return num(n, 0, locale)
}

/** Placement as an ordinal in the UI language: "3rd" (en), "3e" (fr), "#3" elsewhere. */
export function ordinal(n: number, locale = 'en'): string {
  if (locale === 'en') {
    const tens = n % 100
    const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
    return `${n}${suffix}`
  }
  if (locale === 'fr') return n === 1 ? '1er' : `${n}e`
  return `#${n}`
}

/** Invade score for display: the engine scores 0‥10, every surface shows 0‥100. */
export const score100 = (s: number) => Math.round(Math.max(0, Math.min(10, s)) * 10)

/** KDA ratio: "3.25", "∞" without deaths. */
export const kdaRatio = (k: number, d: number, a: number, locale = 'en') => (d === 0 ? (k + a > 0 ? '∞' : '0') : num((k + a) / d, 2, locale))

/** "+19", "−21", "±0" with a real minus sign. */
export const signedLp = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}`

/** "3 days ago", "2 h ago"… from an epoch-millisecond time. */
export function ago(ms: number, locale = 'en'): string {
  const s = (ms - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  const a = Math.abs(s)
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day')
  return rtf.format(Math.round(s / (86400 * 30)), 'month')
}

/** Day header for grouped game lists: "Today", "Yesterday", else "Monday 21 September" in the UI language. */
export function dayLabel(ms: number, todayLabel: string, yesterdayLabel: string, locale = 'en'): string {
  const d = new Date(ms)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const diff = Math.round((start.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000)
  if (diff <= 0) return todayLabel
  if (diff === 1) return yesterdayLabel
  const sameYear = d.getFullYear() === start.getFullYear()
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' }).format(d)
}

/** Local calendar day of an epoch-ms time, for grouping. */
export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
