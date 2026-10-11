/**
 * Story previews: the package's tokens and styles, a host that resolves images to Data Dragon (as
 * the desktop app does), and the theme following Histoire's light / dark switch.
 */
import { defineSetupVue3 } from '@histoire/plugin-vue'
import { provideInvadeUi, type AssetKind, type NameKind } from '../src'
import '../src/styles/tokens.css'
import './stories.css'
import champions from './data/champions.json'
import runes from './data/runes.json'
import spells from './data/spells.json'

const CDN = 'https://ddragon.leagueoflegends.com/cdn/'
const V = '16.19.1'
const champ: Record<string, { key: string; name: string }> = champions
const rune: Record<string, { name: string; icon?: string }> = runes
const spell: Record<string, { name: string; icon: string }> = spells

function assetUrl(kind: AssetKind, id: number | string): string | undefined {
  switch (kind) {
    case 'champion':
      return champ[id] && `${CDN}${V}/img/champion/${champ[id].key}.png`
    case 'splash':
      return champ[id] && `${CDN}img/champion/splash/${champ[id].key}_0.jpg`
    case 'item':
      return `${CDN}${V}/img/item/${id}.png`
    case 'spell':
      return spell[id] && `${CDN}${V}/img/spell/${spell[id].icon}`
    case 'rune':
    case 'runeStyle':
      return rune[id]?.icon && `${CDN}img/${rune[id].icon}`
    case 'profileIcon':
      return `${CDN}${V}/img/profileicon/${id}.png`
    default:
      return undefined
  }
}
const name = (kind: NameKind, id: number) => (kind === 'champion' ? champ[id]?.name : kind === 'spell' ? spell[id]?.name : kind === 'item' ? undefined : rune[id]?.name)

/** Histoire marks dark mode with a class on <html>; the tokens read `data-theme`. */
function followTheme() {
  const root = document.documentElement
  const sync = () => (root.dataset.theme = root.classList.contains('dark') ? 'dark' : 'light')
  sync()
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] })
}

export const setupVue3 = defineSetupVue3(({ app }) => {
  if (typeof document !== 'undefined') followTheme()
  provideInvadeUi(app, { assetUrl, name, linkTo: (to) => (to.kind === 'player' ? `#player/${to.puuid}` : undefined), viewer: 'mock-self' })
})
