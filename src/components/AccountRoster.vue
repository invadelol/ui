<script setup lang="ts">
import type { AccountProfile } from '../logic/accounts'
import { useInvadeUi } from '../context'
import { tierColor } from '../logic/labels'
import Button from './Button.vue'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'
import '../styles/accounts.css'

/**
 * The League accounts of an Invade account, one row each. The main one (opened first on the site
 * and in the app) carries a badge; another row can take its place. `verify` asks the host to add
 * an account: only the desktop app can prove one.
 */
defineProps<{ accounts: AccountProfile[]; mainPuuid: string | null; busy?: boolean }>()
defineEmits<{ main: [puuid: string]; open: [profile: AccountProfile]; verify: [] }>()
const { assetUrl, t } = useInvadeUi()

const region = (p: AccountProfile) => p.platform.replace(/\d+$/, '')
const tierName = (p: AccountProfile) =>
  p.tier ? p.tier.charAt(0) + p.tier.slice(1).toLowerCase() + (p.division && !/MASTER|CHALLENGER/.test(p.tier) ? ' ' + p.division : '') : t('Unranked')
</script>

<template>
  <section class="iv-panel iv-pf-panel iv-acc">
    <header class="iv-panel-head">
      <h3>{{ t('League accounts') }}</h3>
      <span class="meta">{{ accounts.length }}</span>
      <span class="actions">
        <Button variant="ghost" size="sm" :disabled="busy" @click="$emit('verify')"><Icon name="plus" :size="13" />{{ t('Add account') }}</Button>
      </span>
    </header>
    <ul v-if="accounts.length" class="iv-acc-rows">
      <li v-for="p in accounts" :key="p.puuid">
        <button type="button" class="iv-acc-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
        <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="30" height="30" />
        <span class="iv-acc-who">
          <b>{{ p.gameName }}<small>#{{ p.tagLine }}</small></b>
          <small v-if="region(p)">{{ region(p) }}</small>
        </span>
        <span class="iv-acc-rank">
          <RankCrest :tier="p.tier" :size="16" />
          <b :style="{ color: p.tier ? tierColor(p.tier) : undefined }">{{ tierName(p) }}</b>
          <small v-if="p.tier && p.lp != null">{{ p.lp }} {{ t('LP') }}</small>
        </span>
        <span class="iv-acc-main">
          <span v-if="p.puuid === mainPuuid" class="iv-badge brand">{{ t('Main') }}</span>
          <Button v-else class="iv-acc-make" variant="ghost" size="sm" :disabled="busy" @click="$emit('main', p.puuid)">{{ t('Make main') }}</Button>
        </span>
      </li>
    </ul>
    <p v-else class="iv-pf-note">{{ t('No League account linked yet.') }}</p>
  </section>
</template>
