<script setup lang="ts">
import type { AccountProfile } from "../logic/accounts";
import { useInvadeUi } from "../context";
import Button from "./Button.vue";
import Icon from "./Icon.vue";
import RankCrest from "./RankCrest.vue";
import "../styles/accounts.css";
defineProps<{
  accounts: AccountProfile[];
  mainPuuid: string | null;
  busy?: boolean;
}>();
defineEmits<{
  main: [puuid: string];
  open: [profile: AccountProfile];
  verify: [];
}>();
const { assetUrl, t } = useInvadeUi();
const rank = (p: AccountProfile) =>
  p.tier
    ? p.tier.charAt(0) +
      p.tier.slice(1).toLowerCase() +
      (p.division ? " " + p.division : "")
    : t("Unranked");
</script>
<template>
  <section class="iv-panel iv-accounts iv-account-dossier">
    <header class="iv-accounts-head">
      <div>
        <h2>
          {{ t("Your League accounts") }}<small>{{ accounts.length }}</small>
        </h2>
        <p>{{ t("Verified through the Invade desktop app.") }}</p>
      </div>
      <Button size="sm" @click="$emit('verify')"
        ><Icon name="plus" :size="13" />{{ t("Add account") }}</Button
      >
    </header>
    <div v-if="!accounts.length" class="iv-accounts-empty">
      <Icon name="users" :size="24" />
      <h3>{{ t("Add your first League account") }}</h3>
      <p>
        {{
          t(
            "Sign in to League while Invade is running. The app verifies the account you are using.",
          )
        }}
      </p>
      <Button @click="$emit('verify')"
        >{{ t("Connect the desktop app") }}<Icon name="next" :size="14"
      /></Button>
    </div>
    <template v-else
      ><div class="iv-account-columns" aria-hidden="true">
        <span>{{ t("Account") }}</span
        ><span>{{ t("Solo/Duo") }}</span
        ><span />
      </div>
      <div
        v-for="p in accounts"
        :key="p.puuid"
        class="iv-account-row"
        :class="{ 'iv-account-row-main': p.puuid === mainPuuid }"
      >
        <button
          type="button"
          class="iv-account-player"
          @click="$emit('open', p)"
        >
          <img
            :src="assetUrl('profileIcon', p.profileIconId ?? 1)"
            alt=""
            width="32"
            height="32"
          /><span
            ><b
              >{{ p.gameName }}<small>#{{ p.tagLine }}</small></b
            ><em
              >{{ p.platform.replace(/1$/, "") }}<i>·</i
              ><Icon name="shield" :size="11" />{{ t("Verified") }}</em
            ></span
          ></button
        ><span class="iv-account-tier"
          ><RankCrest :tier="p.tier" :size="24" /><span
            :style="{
              color: p.tier ? `var(--tier-${p.tier.toLowerCase()})` : undefined,
            }"
            >{{ rank(p) }}<small v-if="p.lp != null">{{ p.lp }} LP</small></span
          ></span
        ><span v-if="p.puuid === mainPuuid" class="iv-badge brand">{{
          t("Main account")
        }}</span
        ><Button
          v-else
          variant="ghost"
          size="sm"
          :disabled="busy"
          @click="$emit('main', p.puuid)"
          >{{ t("Set as main") }}</Button
        >
      </div></template
    >
    <footer v-if="accounts.length" class="iv-account-dossier-note">
      {{ t("Your main opens first. Switching profiles does not change it.") }}
    </footer>
  </section>
</template>
