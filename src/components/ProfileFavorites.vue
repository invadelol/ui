<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { FavoriteFolder, FavoriteProfile } from '../logic/accounts'
import { useInvadeUi } from '../context'
import { tierColor } from '../logic/labels'
import Button from './Button.vue'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import StarButton from './StarButton.vue'
import '../styles/base.css'
import '../styles/primitives.css'
import '../styles/profile.css'
import '../styles/accounts.css'

/**
 * Favorite players, filtered by folder. `strip` sits above a match history: the players as a
 * grid of rows that open their profile, and a Manage link. `list` manages them: folders are
 * created, renamed and deleted from the head, and each row moves its player or removes it.
 */
const props = withDefaults(
  defineProps<{ folders: FavoriteFolder[]; profiles: FavoriteProfile[]; layout?: 'strip' | 'list'; busy?: boolean; title?: string }>(),
  { layout: 'strip', title: '' },
)
const emit = defineEmits<{
  open: [profile: FavoriteProfile]
  create: [name: string]
  rename: [id: string, name: string]
  removeFolder: [id: string]
  move: [puuid: string, folderId: string | null]
  remove: [puuid: string]
  search: []
  manage: []
}>()
const { assetUrl, t } = useInvadeUi()

const selected = ref('all')
const folder = computed(() => props.folders.find((f) => f.id === selected.value) ?? null)
const visible = computed(() => (folder.value ? props.profiles.filter((p) => p.folderId === folder.value!.id) : props.profiles))
const count = (id: string) => props.profiles.filter((p) => p.folderId === id).length

/* A folder name, typed in the head: `editing` is 'new' or the folder's id. */
const editing = ref<string | null>(null)
const draft = ref('')
const error = ref('')
const input = ref<HTMLInputElement | null>(null)
async function edit(id: string) {
  editing.value = id
  draft.value = id === 'new' ? '' : (folder.value?.name ?? '')
  error.value = ''
  await nextTick()
  input.value?.focus()
}
function save() {
  const id = editing.value
  const name = draft.value.trim()
  if (!id || !name) return void (editing.value = null)
  if (props.folders.some((f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase())) {
    error.value = t('You already have a folder with this name')
    return
  }
  if (id === 'new') emit('create', name)
  else emit('rename', id, name)
  editing.value = null
}
function drop() {
  if (!folder.value) return
  emit('removeFolder', folder.value.id)
  selected.value = 'all'
}

const region = (p: FavoriteProfile) => p.platform.replace(/\d+$/, '')
const tierName = (p: FavoriteProfile) =>
  p.tier ? p.tier.charAt(0) + p.tier.slice(1).toLowerCase() + (p.division && !/MASTER|CHALLENGER/.test(p.tier) ? ' ' + p.division : '') : ''
</script>

<template>
  <section class="iv-panel iv-pf-panel iv-favs" :class="`iv-favs-${layout}`">
    <header class="iv-panel-head">
      <h3>{{ title || t('Favorites') }}</h3>
      <span class="meta">{{ profiles.length }}</span>
      <span class="actions">
        <template v-if="layout === 'list' && !editing">
          <template v-if="folder">
            <Button variant="ghost" size="sm" :disabled="busy" @click="edit(folder.id)">{{ t('Rename') }}</Button>
            <Button variant="ghost" size="sm" :disabled="busy" @click="drop">{{ t('Delete folder') }}</Button>
          </template>
          <Button variant="ghost" size="sm" :disabled="busy" @click="edit('new')"><Icon name="plus" :size="13" />{{ t('New folder') }}</Button>
        </template>
        <Button v-else-if="layout === 'strip'" variant="ghost" size="sm" @click="$emit('manage')">{{ t('Manage') }}</Button>
      </span>
    </header>

    <form v-if="editing" class="iv-favs-form" @submit.prevent="save" @keydown.esc="editing = null">
      <input ref="input" v-model="draft" maxlength="40" :placeholder="t('Folder name')" :aria-label="t('Folder name')" />
      <Button size="sm" type="submit" :disabled="busy">{{ editing === 'new' ? t('Create') : t('Save') }}</Button>
      <Button variant="ghost" size="sm" @click="editing = null">{{ t('Cancel') }}</Button>
      <small v-if="error" role="alert">{{ error }}</small>
    </form>

    <div v-if="folders.length" class="iv-seg sm iv-favs-folders" role="group" :aria-label="t('Folders')">
      <button type="button" :class="{ on: selected === 'all' }" :aria-pressed="selected === 'all'" @click="selected = 'all'">
        {{ t('All') }} <small>{{ profiles.length }}</small>
      </button>
      <button v-for="f in folders" :key="f.id" type="button" :class="{ on: selected === f.id }" :aria-pressed="selected === f.id" @click="selected = f.id">
        {{ f.name }} <small>{{ count(f.id) }}</small>
      </button>
    </div>

    <ul v-if="visible.length" class="iv-favs-rows">
      <li v-for="p in visible" :key="p.puuid">
        <button type="button" class="iv-acc-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
        <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="30" height="30" loading="lazy" />
        <span class="iv-acc-who">
          <b>{{ p.gameName }}<small>#{{ p.tagLine }}</small></b>
          <small v-if="p.tier" class="iv-favs-tier"><RankCrest :tier="p.tier" :size="12" /><span :style="{ color: tierColor(p.tier) }">{{ tierName(p) }}</span></small>
          <small v-else-if="region(p)">{{ region(p) }}</small>
        </span>
        <template v-if="layout === 'list'">
          <select class="iv-select iv-favs-move" :value="p.folderId ?? ''" :disabled="busy" :aria-label="`${t('Folder')} · ${p.gameName}`" @change="$emit('move', p.puuid, ($event.target as HTMLSelectElement).value || null)">
            <option value="">{{ t('No folder') }}</option>
            <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
          <StarButton class="iv-favs-star" saved :label="p.gameName" @toggle="$emit('remove', p.puuid)" />
        </template>
      </li>
    </ul>
    <p v-else class="iv-pf-note">
      {{ profiles.length ? t('No players in this folder.') : t('No favorite players yet.') }}
      <Button v-if="!profiles.length" variant="ghost" size="sm" @click="$emit('search')"><Icon name="search" :size="13" />{{ t('Find a player') }}</Button>
    </p>
  </section>
</template>
