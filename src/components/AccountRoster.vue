<script setup lang="ts">
import { computed } from 'vue'
import type { AccountProfile } from '../logic/accounts'
import { useFormat, useInvadeUi } from '../context'
import { tierColor } from '../logic/labels'
import Button from './Button.vue'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import '../styles/accounts.css'

/**
 * The League accounts of one Invade account. The main one leads (it opens first on invade.lol and
 * in the app); the others follow as rows that can take its place. `pending` are accounts the host
 * has seen but that aren't verified yet (the app: accounts signed in on this computer), and
 * `current` the one signed in to League right now: only that one can be verified. The `extra`
 * slot adds the host's own figures to a row (the app: games saved, most played).
 */
const props = defineProps<{
  accounts: AccountProfile[]
  mainPuuid: string | null
  pending?: AccountProfile[]
  current?: string | null
  busy?: boolean
}>()
defineEmits<{
  main: [puuid: string]
  open: [profile: AccountProfile]
  verify: []
}>()
defineSlots<{ extra?: (p: { profile: AccountProfile }) => unknown }>()
const { assetUrl, t } = useInvadeUi()
const { date } = useFormat()

const main = computed(() => props.accounts.find((a) => a.puuid === props.mainPuuid) ?? null)
const others = computed(() => props.accounts.filter((a) => a.puuid !== props.mainPuuid))
const pending = computed(() => (props.pending ?? []).filter((p) => !props.accounts.some((a) => a.puuid === p.puuid)))
const currentPending = computed(() => pending.value.some((p) => p.puuid === props.current))
/** Only the account signed in to League can be added. `current` undefined: the host can't tell (the site), so it explains how. */
const canAdd = computed(() => props.current === undefined || (!!props.current && !props.accounts.some((a) => a.puuid === props.current)))

const region = (p: AccountProfile) => p.platform.replace(/\d+$/, '')
const tierName = (p: AccountProfile) =>
  p.tier ? p.tier.charAt(0) + p.tier.slice(1).toLowerCase() + (p.division && !/MASTER|CHALLENGER/.test(p.tier) ? ' ' + p.division : '') : t('Unranked')
const verified = (p: AccountProfile) => (p.verifiedAt ? t('Verified {when}', { when: date(Date.parse(p.verifiedAt), { day: 'numeric', month: 'short' }) }) : t('Verified'))
</script>

<template>
  <section class="iv-roster" :aria-busy="busy">
    <!-- The main account: the one Invade opens first. -->
    <article v-if="main" class="iv-panel iv-roster-main" :style="{ '--tier': main.tier ? tierColor(main.tier) : 'var(--text-4)' }">
      <button type="button" class="iv-roster-hit" :aria-label="`${t('Open profile')} · ${main.gameName}#${main.tagLine}`" @click="$emit('open', main)" />
      <img class="iv-roster-main-icon" :src="assetUrl('profileIcon', main.profileIconId ?? 1)" alt="" width="64" height="64" />
      <div class="iv-roster-main-who">
        <span class="iv-roster-kicker"><Icon name="crown" :size="12" />{{ t('Main account') }}</span>
        <h3>{{ main.gameName }}<small>#{{ main.tagLine }}</small></h3>
        <p>
          <span v-if="region(main)">{{ region(main) }}</span><span><Icon name="shield" :size="11" />{{ verified(main) }}</span
          ><span v-if="main.puuid === current" class="iv-roster-live">{{ t('In League now') }}</span>
        </p>
        <slot name="extra" :profile="main" />
      </div>
      <div class="iv-roster-main-rank">
        <RankCrest :tier="main.tier" :size="main.tier ? 56 : 36" emblem />
        <span>
          <b :style="{ color: main.tier ? tierColor(main.tier) : undefined }">{{ tierName(main) }}</b>
          <small v-if="main.lp != null && main.tier">{{ main.lp }} {{ t('LP') }}</small>
          <small v-else>{{ t('Solo/Duo') }}</small>
        </span>
      </div>
      <Icon name="right" :size="16" class="iv-roster-go" />
    </article>

    <div v-if="others.length || pending.length || !main" class="iv-panel iv-roster-rest">
      <h3 v-if="main && (others.length || pending.length)" class="iv-roster-label">{{ t('Other accounts') }}</h3>
      <ul v-if="others.length || pending.length" class="iv-roster-list">
        <li v-for="p in others" :key="p.puuid" class="iv-roster-row">
          <button type="button" class="iv-roster-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
          <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="36" height="36" />
          <span class="iv-roster-who">
            <b>{{ p.gameName }}<small>#{{ p.tagLine }}</small></b>
            <em><template v-if="region(p)">{{ region(p) }}<i>·</i></template><Icon name="shield" :size="11" />{{ t('Verified') }}<template v-if="p.puuid === current"><i>·</i><span class="iv-roster-live">{{ t('In League now') }}</span></template></em>
          </span>
          <span class="iv-roster-extra"><slot name="extra" :profile="p" /></span>
          <span class="iv-roster-rank">
            <RankCrest :tier="p.tier" :size="22" />
            <span>
              <b :style="{ color: p.tier ? tierColor(p.tier) : undefined }">{{ tierName(p) }}</b>
              <small v-if="p.lp != null && p.tier">{{ p.lp }} {{ t('LP') }}</small>
            </span>
          </span>
          <Button class="iv-roster-make" variant="ghost" size="sm" :disabled="busy" @click="$emit('main', p.puuid)">
            <Icon name="crown" :size="13" />{{ t('Make main') }}
          </Button>
        </li>
        <!-- Seen by the host, not verified yet. -->
        <li v-for="p in pending" :key="p.puuid" class="iv-roster-row pending">
          <button type="button" class="iv-roster-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
          <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="36" height="36" />
          <span class="iv-roster-who">
            <b>{{ p.gameName }}<small>#{{ p.tagLine }}</small></b>
            <em><template v-if="region(p)">{{ region(p) }}<i>·</i></template>{{ p.puuid === current ? t('Signed in to League') : t('Not linked yet') }}</em>
          </span>
          <span class="iv-roster-extra"><slot name="extra" :profile="p" /></span>
          <span class="iv-roster-rank">
            <RankCrest :tier="p.tier" :size="22" />
            <span>
              <b :style="{ color: p.tier ? tierColor(p.tier) : undefined }">{{ tierName(p) }}</b>
              <small v-if="p.lp != null && p.tier">{{ p.lp }} {{ t('LP') }}</small>
            </span>
          </span>
          <Button v-if="p.puuid === current" class="iv-roster-link" size="sm" :disabled="busy" @click="$emit('verify')">
            <Icon name="plus" :size="13" />{{ t('Link') }}
          </Button>
          <span v-else class="iv-roster-hint" :title="t('Sign in to League with this account to link it.')">{{ t('Sign in to link') }}</span>
        </li>
      </ul>

      <!-- How an account joins: proof comes from the League client, never from a claim. -->
      <div v-if="!currentPending" class="iv-roster-add" :class="{ alone: !others.length && !pending.length }">
        <span class="iv-roster-add-mark"><Icon name="plus" :size="16" /></span>
        <span class="iv-roster-add-copy">
          <b>{{ accounts.length ? t('Add another account') : t('Add your League account') }}</b>
          <small v-if="canAdd">{{ t('Sign in to League with it while Invade is open. The app checks that it’s yours.') }}</small>
          <small v-else>{{ t('Sign in to League with it and it shows up here, ready to link.') }}</small>
        </span>
        <Button v-if="canAdd" size="sm" :disabled="busy" @click="$emit('verify')">{{ t('Add account') }}</Button>
      </div>
    </div>
  </section>
</template>
