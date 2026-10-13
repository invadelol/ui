/**
 * Data that stays on screen until its replacement has arrived. A view that reloads when a filter
 * changes keeps what it shows while the next answer loads, then swaps in one go: no empty frame,
 * no skeleton, no half-updated mix, no layout jump. Only the first load has nothing to show.
 */
import { getCurrentScope, onScopeDispose, shallowRef, watch, type Ref, type WatchSource } from 'vue'

/** How long an answer may take before a view hints that it is loading (ms). */
export const QUIET_DELAY = 200

/**
 * True once `source` has been true for `delay` ms, false as soon as it is false: a loading hint
 * that fast answers never show (a slight dim, a thin line), so switching quickly stays still.
 */
export function useDelayedFlag(source: WatchSource<boolean>, delay = QUIET_DELAY): Readonly<Ref<boolean>> {
  const flag = shallowRef(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    source,
    (on) => {
      clearTimeout(timer)
      timer = undefined
      if (!on) flag.value = false
      else if (!flag.value) timer = setTimeout(() => (flag.value = true), delay)
    },
    { immediate: true, flush: 'sync' },
  )
  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))
  return flag
}

export interface StableData<K, T> {
  /** The last value that arrived (`undefined` before the first). It stays while the next one loads. */
  data: Readonly<Ref<T | undefined>>
  /** The key `data` belongs to: labels drawn from it always match the data shown. */
  key: Readonly<Ref<K | undefined>>
  /** Something has arrived: until then a view shows its first-load state. */
  ready: Readonly<Ref<boolean>>
  /** An answer for a newer key is on its way. */
  pending: Readonly<Ref<boolean>>
  /** `pending` for longer than `delay`: time for a quiet hint. Fast answers never set it. */
  busy: Readonly<Ref<boolean>>
  /** The latest key failed (`data` keeps the last value that arrived); the next success clears it. */
  error: Readonly<Ref<unknown>>
  /** Loads the latest key again (Retry, a refresh), keeping `data` meanwhile. */
  reload: () => Promise<void>
}

export interface StableOptions<K> {
  /** How long an answer may take before `busy` turns on (ms). */
  delay?: number
  /** Whether two keys ask for the same data (a repeat is not loaded again). Default: equal values,
   *  or arrays and plain objects with equal entries. */
  same?: (a: K, b: K) => boolean
}

const plain = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype
export function sameKey(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
  if (plain(a) && plain(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => Object.is(a[k], b[k]))
  }
  return false
}

const thenable = <T>(x: T | PromiseLike<T>): x is PromiseLike<T> => !!x && typeof (x as PromiseLike<T>).then === 'function'

/**
 * Loads `load(key)` for each `key` the source gives and keeps the last answer on screen until the
 * next one is in. The latest key wins (answers for older keys are dropped). `load` may answer at
 * once (a cache hit, a value computed from data already there): the swap then happens in the same
 * render, with no pending state at all.
 *
 *     const ranks = useStableData(rank, (id) => loadRank(id))
 *     // ranks.data: the file shown; ranks.key: its rank; ranks.busy: dim it a little
 */
export function useStableData<K, T>(source: WatchSource<K>, load: (key: K) => T | PromiseLike<T>, options: StableOptions<K> = {}): StableData<K, T> {
  const { delay = QUIET_DELAY, same = sameKey } = options
  const data = shallowRef<T>()
  const key = shallowRef<K>()
  const ready = shallowRef(false)
  const pending = shallowRef(false)
  const error = shallowRef<unknown>()
  const busy = useDelayedFlag(pending, delay)
  let seq = 0
  /** The key shown or on its way: a repeat of it loads nothing. */
  let latest: { key: K } | null = null

  function commit(k: K, v: T) {
    data.value = v
    key.value = k
    ready.value = true
    error.value = undefined
    pending.value = false
  }
  function fail(e: unknown) {
    error.value = e ?? new Error('failed')
    pending.value = false
  }
  function run(k: K): Promise<void> {
    const my = ++seq
    latest = { key: k }
    let answer: T | PromiseLike<T>
    try {
      answer = load(k)
    } catch (e) {
      fail(e)
      return Promise.resolve()
    }
    if (!thenable(answer)) {
      commit(k, answer)
      return Promise.resolve()
    }
    pending.value = true
    return Promise.resolve(answer).then(
      (v) => void (my === seq && commit(k, v)),
      (e) => void (my === seq && fail(e)),
    )
  }
  watch(source, (k) => void (latest && same(latest.key, k) ? undefined : run(k)), { immediate: true })
  if (getCurrentScope()) onScopeDispose(() => void seq++)
  return { data, key, ready, pending, busy, error, reload: () => (latest ? run(latest.key) : Promise.resolve()) }
}
