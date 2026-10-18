<script setup lang="ts">
import { computed, ref } from "vue";
import type { FavoriteFolder, FavoriteProfile } from "../logic/accounts";
import { useInvadeUi } from "../context";
import Button from "./Button.vue";
import Icon from "./Icon.vue";
import RankCrest from "./RankCrest.vue";
import "../styles/accounts.css";

const props = withDefaults(
  defineProps<{
    folders: FavoriteFolder[];
    profiles: FavoriteProfile[];
    status?: string;
    layout?: "strip" | "list";
    busy?: boolean;
  }>(),
  { status: "", layout: "strip" },
);
const emit = defineEmits<{
  open: [profile: FavoriteProfile];
  create: [name: string];
  rename: [id: string, name: string];
  removeFolder: [id: string];
  move: [puuid: string, folderId: string | null];
  remove: [puuid: string];
  search: [];
}>();
const { assetUrl, t } = useInvadeUi();
const selected = ref("all");
const editing = ref(false);
const editingId = ref<string | null>(null);
const selectedFolder = computed(() =>
  props.folders.find((f) => f.id === selected.value),
);
const name = ref("");
const error = ref("");
const menu = ref<string | null>(null);
function dismiss() {
  menu.value = null;
  editing.value = false;
}
function moveProfile(puuid: string, folderId: string | null) {
  emit("move", puuid, folderId);
  menu.value = null;
}
function removeProfile(puuid: string) {
  emit("remove", puuid);
  menu.value = null;
}
const visible = computed(() =>
  props.profiles.filter(
    (p) => selected.value === "all" || p.folderId === selected.value,
  ),
);
const count = (id: string) =>
  props.profiles.filter((p) => p.folderId === id).length;
function startCreate() {
  editingId.value = null;
  name.value = "";
  error.value = "";
  editing.value = !editing.value;
}
function startRename() {
  if (!selectedFolder.value) return;
  editingId.value = selectedFolder.value.id;
  name.value = selectedFolder.value.name;
  error.value = "";
  editing.value = true;
}
function deleteFolder() {
  if (!selectedFolder.value) return;
  emit("removeFolder", selectedFolder.value.id);
  selected.value = "all";
  editing.value = false;
}
function create() {
  const value = name.value.trim();
  if (!value) {
    error.value = t("Enter a folder name");
    return;
  }
  if (
    props.folders.some(
      (f) =>
        f.id !== editingId.value &&
        f.name.toLowerCase() === value.toLowerCase(),
    )
  ) {
    error.value = t("This folder already exists");
    return;
  }
  if (editingId.value) emit("rename", editingId.value, value);
  else emit("create", value);
  name.value = "";
  editing.value = false;
  error.value = "";
}
</script>
<template>
  <section
    class="iv-panel iv-favorite-profiles"
    :class="`iv-favorites-${layout}`"
    aria-label="Favorite profiles"
    @keydown.esc="dismiss"
  >
    <header class="iv-favorites-head">
      <h2>
        <Icon name="star" :size="15" />{{ t("Favorites")
        }}<small>{{ profiles.length }}</small>
      </h2>
      <span v-if="status" class="iv-favorites-status" role="status"
        ><Icon
          :name="status.toLowerCase().includes('offline') ? 'clock' : 'check'"
          :size="12"
        />{{ status }}</span
      ><Button variant="ghost" size="sm" @click="startCreate"
        ><Icon name="folder" :size="14" />{{ t("New folder") }}</Button
      >
    </header>
    <form v-if="editing" class="iv-folder-create" @submit.prevent="create">
      <label :for="`iv-folder-${layout}`">{{ t("Folder name") }}</label>
      <div>
        <input
          :id="`iv-folder-${layout}`"
          v-model="name"
          maxlength="40"
          :placeholder="t('e.g. Clash team')"
          autofocus
        /><Button type="submit" :disabled="busy">{{
          editingId ? t("Save") : t("Create")
        }}</Button
        ><Button variant="ghost" @click="editing = false">{{
          t("Cancel")
        }}</Button>
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
    </form>
    <nav class="iv-favorites-folders" :aria-label="t('Favorite folders')">
      <button
        type="button"
        :class="{ on: selected === 'all' }"
        :aria-pressed="selected === 'all'"
        @click="selected = 'all'"
      >
        {{ t("All profiles") }}<small>{{ profiles.length }}</small></button
      ><button
        v-for="folder in folders"
        :key="folder.id"
        type="button"
        :class="{ on: selected === folder.id }"
        :aria-pressed="selected === folder.id"
        @click="selected = folder.id"
      >
        <Icon name="folder" :size="13" />{{ folder.name
        }}<small>{{ count(folder.id) }}</small>
      </button>
      <span v-if="selectedFolder" class="iv-folder-actions">
        <Button
          variant="ghost"
          size="sm"
          :disabled="busy"
          @click="startRename"
          >{{ t("Rename folder") }}</Button
        >
        <Button
          variant="ghost"
          size="sm"
          icon-only
          :disabled="busy"
          :aria-label="t('Delete folder, keep profiles')"
          @click="deleteFolder"
          ><Icon name="trash" :size="13"
        /></Button>
      </span>
    </nav>
    <div v-if="!visible.length" class="iv-favorites-empty">
      <p>
        {{
          profiles.length
            ? t("No profiles in this folder yet.")
            : t(
                "Keep a team, a duo or a profile close. Star any player to save them here.",
              )
        }}
      </p>
      <Button variant="ghost" size="sm" @click="$emit('search')"
        ><Icon name="search" :size="14" />{{ t("Find a profile") }}</Button
      >
    </div>
    <div v-else class="iv-favorites-people">
      <div
        v-for="profile in visible"
        :key="profile.puuid"
        class="iv-favorite-person"
      >
        <button
          type="button"
          class="iv-favorite-open"
          @click="$emit('open', profile)"
        >
          <img
            :src="assetUrl('profileIcon', profile.profileIconId ?? 1)"
            alt=""
            width="32"
            height="32"
          /><span
            ><b>{{ profile.gameName }}</b
            ><small
              >#{{ profile.tagLine }}<i>·</i
              >{{ profile.platform.replace(/1$/, "") }}</small
            ></span
          >
        </button>
        <span v-if="layout === 'list' && profile.tier" class="iv-favorite-rank"
          ><RankCrest :tier="profile.tier" :size="18" />{{
            profile.tier.charAt(0) + profile.tier.slice(1).toLowerCase()
          }}
          {{ profile.division }}</span
        >
        <div class="iv-favorite-options">
          <Button
            variant="ghost"
            size="sm"
            icon-only
            :aria-label="`${t('Organize favorite')} · ${profile.gameName}`"
            :aria-expanded="menu === profile.puuid"
            @click="menu = menu === profile.puuid ? null : profile.puuid"
            ><Icon name="down" :size="12"
          /></Button>
          <div v-if="menu === profile.puuid" class="iv-favorite-menu">
            <span>{{ t("Move to folder") }}</span
            ><button type="button" @click="moveProfile(profile.puuid, null)">
              {{ t("No folder")
              }}<Icon
                v-if="!profile.folderId"
                name="check"
                :size="12"
              /></button
            ><button
              v-for="folder in folders"
              :key="folder.id"
              type="button"
              @click="moveProfile(profile.puuid, folder.id)"
            >
              <Icon name="folder" :size="13" />{{ folder.name
              }}<Icon
                v-if="profile.folderId === folder.id"
                name="check"
                :size="12"
              /></button
            ><button
              type="button"
              class="iv-favorite-remove"
              @click="removeProfile(profile.puuid)"
            >
              <Icon name="star" :size="13" />{{ t("Remove favorite") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
