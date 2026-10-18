<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { FavoriteFolder, FavoriteProfile } from '../logic/accounts'
import { useInvadeUi } from '../context'
import { tierColor } from '../logic/labels'
import Button from './Button.vue'
import Icon from './Icon.vue'
import RankCrest from './RankCrest.vue'
import '../styles/accounts.css'

/**
 * Favorite players, sorted into folders (a Clash team, a duo…), synced by the host. `strip` sits
 * above a match history: folder tabs and a few tiles. `list` is the full manager: a folder rail
 * and one row per player. Folders are created and renamed in place; a player's menu moves it
 * between folders or removes it.
 */
const props = withDefaults(
  defineProps<{
    folders: FavoriteFolder[]
    profiles: FavoriteProfile[]
    status?: string
    layout?: 'strip' | 'list'
    busy?: boolean
    /** Tiles shown in the strip before "Show all". */
    limit?: number
    /** The strip's title (default: Favorites). */
    title?: string
  }>(),
  { status: '', layout: 'strip', limit: 8, title: '' },
)
const emit = defineEmits<{
  open: [profile: FavoriteProfile]
  create: [name: string]
  rename: [id: string, name: string]
  removeFolder: [id: string]
  move: [puuid: string, folderId: string | null]
  remove: [puuid: string]
  search: []
}>()
const { assetUrl, t } = useInvadeUi()

const selected = ref<string>('all')
const all = ref(false)
const folder = computed(() => props.folders.find((f) => f.id === selected.value) ?? null)
const inFolder = computed(() => (selected.value === 'all' ? props.profiles : props.profiles.filter((p) => p.folderId === selected.value)))
const visible = computed(() => (props.layout === 'strip' && !all.value ? inFolder.value.slice(0, props.limit) : inFolder.value))
const hidden = computed(() => inFolder.value.length - visible.value.length)
const count = (id: string) => props.profiles.filter((p) => p.folderId === id).length
const folderName = (id: string | null) => props.folders.find((f) => f.id === id)?.name ?? ''

function pick(id: string) {
  selected.value = id
  all.value = false
  menu.value = null
}

/* Folder names are edited in place: `editing` is 'new' or a folder id. */
const editing = ref<string | null>(null)
const draft = ref('')
const error = ref('')
const field = ref<HTMLInputElement[] | HTMLInputElement | null>(null)
async function edit(id: string | 'new') {
  editing.value = id
  draft.value = id === 'new' ? '' : folderName(id)
  error.value = ''
  menu.value = null
  await nextTick()
  const el = Array.isArray(field.value) ? field.value[0] : field.value
  el?.focus()
  el?.select()
}
function save() {
  const id = editing.value
  if (!id) return
  const name = draft.value.trim()
  if (!name) return cancel()
  if (props.folders.some((f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase())) {
    error.value = t('You already have a folder with this name')
    return
  }
  if (id === 'new') emit('create', name)
  else if (name !== folderName(id)) emit('rename', id, name)
  cancel()
}
function cancel() {
  editing.value = null
  error.value = ''
}
function dropFolder(id: string) {
  emit('removeFolder', id)
  if (selected.value === id) selected.value = 'all'
  menu.value = null
}

/* One floating menu at a time: a player's ('p:<puuid>') or a folder's ('f:<id>'). */
const menu = ref<string | null>(null)
function toggle(key: string) {
  menu.value = menu.value === key ? null : key
}
function outside(e: PointerEvent) {
  if (menu.value && !(e.target as Element | null)?.closest?.('.iv-fav-menu, .iv-fav-more')) menu.value = null
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
function move(p: FavoriteProfile, id: string | null) {
  if (p.folderId !== id) emit('move', p.puuid, id)
  menu.value = null
}
function remove(p: FavoriteProfile) {
  emit('remove', p.puuid)
  menu.value = null
}

const tierName = (p: FavoriteProfile) =>
  p.tier ? p.tier.charAt(0) + p.tier.slice(1).toLowerCase() + (p.division && !/MASTER|CHALLENGER/.test(p.tier) ? ' ' + p.division : '') : ''
const region = (p: FavoriteProfile) => p.platform.replace(/\d+$/, '')
</script>

<template>
  <section class="iv-favs" :class="`iv-favs-${layout}`" :aria-label="t('Favorite players')" @keydown.esc="menu = null">
    <!-- Strip: a title, the folders as tabs, and a few tiles. -->
    <template v-if="layout === 'strip'">
      <header class="iv-favs-head">
        <h2><Icon name="star" :size="14" />{{ title || t('Favorites') }}</h2>
        <span v-if="status" class="iv-favs-status" role="status">{{ status }}</span>
      </header>
      <nav class="iv-favs-tabs" :aria-label="t('Folders')">
        <button type="button" :class="{ on: selected === 'all' }" :aria-pressed="selected === 'all'" @click="pick('all')">
          {{ t('All') }}<small>{{ profiles.length }}</small>
        </button>
        <template v-for="f in folders" :key="f.id">
          <form v-if="editing === f.id" class="iv-favs-name" @submit.prevent="save">
            <input ref="field" v-model="draft" maxlength="40" :aria-label="t('Folder name')" @keydown.esc.stop="cancel" @blur="save" />
          </form>
          <button v-else type="button" :class="{ on: selected === f.id }" :aria-pressed="selected === f.id" @click="pick(f.id)" @dblclick="edit(f.id)">
            {{ f.name }}<small>{{ count(f.id) }}</small>
          </button>
        </template>
        <form v-if="editing === 'new'" class="iv-favs-name" @submit.prevent="save">
          <input ref="field" v-model="draft" maxlength="40" :placeholder="t('Folder name')" :aria-label="t('Folder name')" @keydown.esc.stop="cancel" @blur="save" />
        </form>
        <button v-else type="button" class="iv-favs-new" :disabled="busy" :title="t('New folder')" @click="edit('new')">
          <Icon name="plus" :size="13" /><span>{{ t('Folder') }}</span>
        </button>
        <span v-if="folder && editing !== folder.id" class="iv-fav-anchor iv-favs-folder-more">
          <button type="button" class="iv-fav-more" :aria-label="`${t('Folder options')} · ${folder.name}`" :aria-expanded="menu === 'f:' + folder.id" @click="toggle('f:' + folder.id)">
            <Icon name="more" :size="15" />
          </button>
          <div v-if="menu === 'f:' + folder.id" class="iv-fav-menu right" role="menu">
            <button type="button" role="menuitem" @click="edit(folder.id)"><Icon name="pencil" :size="13" />{{ t('Rename') }}</button>
            <button type="button" role="menuitem" class="danger" @click="dropFolder(folder.id)"><Icon name="trash" :size="13" />{{ t('Delete folder') }}</button>
            <p>{{ t('Players in it stay in your favorites.') }}</p>
          </div>
        </span>
      </nav>
      <p v-if="error" class="iv-favs-error" role="alert">{{ error }}</p>

      <div v-if="!visible.length" class="iv-favs-empty">
        <p>{{ profiles.length ? t('Nobody in {folder} yet. Use a player’s menu to move them here.', { folder: folder?.name ?? '' }) : t('Star a player on their profile to keep them here.') }}</p>
        <Button v-if="!profiles.length" variant="ghost" size="sm" @click="$emit('search')"><Icon name="search" :size="13" />{{ t('Find a player') }}</Button>
      </div>
      <ul v-else class="iv-favs-tiles">
        <li v-for="p in visible" :key="p.puuid" class="iv-fav-tile" :class="{ menu: menu === 'p:' + p.puuid }">
          <button type="button" class="iv-fav-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
          <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="34" height="34" />
          <span class="iv-fav-who">
            <b>{{ p.gameName }}</b>
            <small v-if="p.tier"><RankCrest :tier="p.tier" :size="13" /><span :style="{ color: tierColor(p.tier) }">{{ tierName(p) }}</span></small>
            <small v-else>#{{ p.tagLine }}</small>
          </span>
          <span class="iv-fav-anchor">
            <button type="button" class="iv-fav-more" :aria-label="`${t('Options')} · ${p.gameName}`" :aria-expanded="menu === 'p:' + p.puuid" @click="toggle('p:' + p.puuid)">
              <Icon name="more" :size="15" />
            </button>
            <div v-if="menu === 'p:' + p.puuid" class="iv-fav-menu right" role="menu">
              <span class="iv-fav-menu-label">{{ t('Move to') }}</span>
              <button type="button" role="menuitemradio" :aria-checked="!p.folderId" @click="move(p, null)">{{ t('No folder') }}<Icon v-if="!p.folderId" name="check" :size="13" /></button>
              <button v-for="f in folders" :key="f.id" type="button" role="menuitemradio" :aria-checked="p.folderId === f.id" @click="move(p, f.id)">
                {{ f.name }}<Icon v-if="p.folderId === f.id" name="check" :size="13" />
              </button>
              <hr />
              <button type="button" role="menuitem" class="danger" @click="remove(p)"><Icon name="star" :size="13" />{{ t('Remove from favorites') }}</button>
            </div>
          </span>
        </li>
        <li v-if="hidden > 0" class="iv-fav-tile iv-fav-more-tile">
          <button type="button" class="iv-fav-hit" @click="all = true" />
          <span>{{ t('+{n} more', { n: hidden }) }}</span>
        </li>
      </ul>
    </template>

    <!-- List: the folder rail, then one row per player. -->
    <template v-else>
      <nav class="iv-favs-rail" :aria-label="t('Folders')">
        <button type="button" :class="{ on: selected === 'all' }" :aria-pressed="selected === 'all'" @click="pick('all')">
          <Icon name="users" :size="14" />{{ t('All players') }}<small>{{ profiles.length }}</small>
        </button>
        <template v-for="f in folders" :key="f.id">
          <form v-if="editing === f.id" class="iv-favs-name" @submit.prevent="save">
            <input ref="field" v-model="draft" maxlength="40" :aria-label="t('Folder name')" @keydown.esc.stop="cancel" @blur="save" />
          </form>
          <span v-else class="iv-favs-rail-item iv-fav-anchor" :class="{ on: selected === f.id }">
            <button type="button" :aria-pressed="selected === f.id" @click="pick(f.id)" @dblclick="edit(f.id)">
              <Icon name="folder" :size="14" />{{ f.name }}<small>{{ count(f.id) }}</small>
            </button>
            <button type="button" class="iv-fav-more" :aria-label="`${t('Folder options')} · ${f.name}`" :aria-expanded="menu === 'f:' + f.id" @click="toggle('f:' + f.id)">
              <Icon name="more" :size="15" />
            </button>
            <div v-if="menu === 'f:' + f.id" class="iv-fav-menu" role="menu">
              <button type="button" role="menuitem" @click="edit(f.id)"><Icon name="pencil" :size="13" />{{ t('Rename') }}</button>
              <button type="button" role="menuitem" class="danger" @click="dropFolder(f.id)"><Icon name="trash" :size="13" />{{ t('Delete folder') }}</button>
              <p>{{ t('Players in it stay in your favorites.') }}</p>
            </div>
          </span>
        </template>
        <form v-if="editing === 'new'" class="iv-favs-name" @submit.prevent="save">
          <input ref="field" v-model="draft" maxlength="40" :placeholder="t('Folder name')" :aria-label="t('Folder name')" @keydown.esc.stop="cancel" @blur="save" />
        </form>
        <button v-else type="button" class="iv-favs-new" :disabled="busy" @click="edit('new')"><Icon name="plus" :size="14" />{{ t('New folder') }}</button>
        <p v-if="error" class="iv-favs-error" role="alert">{{ error }}</p>
      </nav>

      <div class="iv-favs-body">
        <header class="iv-favs-head">
          <h2>{{ folder ? folder.name : t('All players') }}</h2>
          <span v-if="status" class="iv-favs-status" role="status">{{ status }}</span>
        </header>
        <div v-if="!visible.length" class="iv-favs-empty">
          <p>{{ profiles.length ? t('Nobody in {folder} yet. Use a player’s menu to move them here.', { folder: folder?.name ?? '' }) : t('Star a player on their profile to keep them here.') }}</p>
          <Button v-if="!profiles.length" variant="ghost" size="sm" @click="$emit('search')"><Icon name="search" :size="13" />{{ t('Find a player') }}</Button>
        </div>
        <ul v-else class="iv-favs-rows">
          <li v-for="p in visible" :key="p.puuid" class="iv-fav-row" :class="{ menu: menu === 'p:' + p.puuid }">
            <button type="button" class="iv-fav-hit" :aria-label="`${t('Open profile')} · ${p.gameName}#${p.tagLine}`" @click="$emit('open', p)" />
            <img :src="assetUrl('profileIcon', p.profileIconId ?? 1)" alt="" width="32" height="32" />
            <span class="iv-fav-who">
              <b>{{ p.gameName }}<small>#{{ p.tagLine }}</small></b>
              <small>{{ region(p) }}<template v-if="selected === 'all' && p.folderId"><i>·</i><Icon name="folder" :size="11" />{{ folderName(p.folderId) }}</template></small>
            </span>
            <span class="iv-fav-rank">
              <template v-if="p.tier"><RankCrest :tier="p.tier" :size="18" /><b :style="{ color: tierColor(p.tier) }">{{ tierName(p) }}</b><small v-if="p.lp != null">{{ p.lp }} {{ t('LP') }}</small></template>
            </span>
            <span class="iv-fav-anchor">
              <button type="button" class="iv-fav-more" :aria-label="`${t('Options')} · ${p.gameName}`" :aria-expanded="menu === 'p:' + p.puuid" @click="toggle('p:' + p.puuid)">
                <Icon name="more" :size="15" />
              </button>
              <div v-if="menu === 'p:' + p.puuid" class="iv-fav-menu right" role="menu">
                <span class="iv-fav-menu-label">{{ t('Move to') }}</span>
                <button type="button" role="menuitemradio" :aria-checked="!p.folderId" @click="move(p, null)">{{ t('No folder') }}<Icon v-if="!p.folderId" name="check" :size="13" /></button>
                <button v-for="f in folders" :key="f.id" type="button" role="menuitemradio" :aria-checked="p.folderId === f.id" @click="move(p, f.id)">
                  {{ f.name }}<Icon v-if="p.folderId === f.id" name="check" :size="13" />
                </button>
                <hr />
                <button type="button" role="menuitem" class="danger" @click="remove(p)"><Icon name="star" :size="13" />{{ t('Remove from favorites') }}</button>
              </div>
            </span>
            <Icon name="right" :size="15" class="iv-fav-go" />
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
