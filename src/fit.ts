/**
 * Groups of `StatLabel`s that hide their names together (a table head, a duel), so a row never
 * mixes icons with and without names. A group is tight while any of its labels does not fit. A
 * view calls `provideStatGroups()` once; its labels then join a group by name.
 */
import { inject, provide, reactive, type InjectionKey } from 'vue'

export type StatGroups = Map<string, Set<symbol>>
const KEY: InjectionKey<StatGroups> = Symbol('iv-stat-groups')

export function provideStatGroups() {
  const groups: StatGroups = reactive(new Map())
  provide(KEY, groups)
  return groups
}

export const useStatGroups = () => inject(KEY, null)
