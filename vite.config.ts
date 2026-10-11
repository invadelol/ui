import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

const src = fileURLToPath(new URL('./src/', import.meta.url))

/**
 * What ships beside the bundle, as-is: `tokens.css` with its fonts (the light block repeated under
 * `data-theme="system"` for a light system preference), and `keys.json`, every string key the views
 * translate (`t('…')` / `tk('…')`), for the hosts' locale checks.
 */
function extras(): Plugin {
  return {
    name: 'invade-ui-extras',
    apply: 'build',
    generateBundle() {
      const tokens = readFileSync(`${src}styles/tokens.css`, 'utf8')
      const light = /\[data-theme='light'\],\n\.iv-light \{\n([\s\S]*?)\n\}/.exec(tokens)?.[1]
      if (!light) throw new Error('tokens.css: light block not found')
      const system = `@media (prefers-color-scheme: light) {\n  [data-theme='system'] {\n${light.replace(/^/gm, '  ')}\n  }\n}\n`
      this.emitFile({ type: 'asset', fileName: 'tokens.css', source: `${tokens}\n${system}` })
      for (const font of readdirSync(`${src}styles/fonts`)) {
        this.emitFile({ type: 'asset', fileName: `fonts/${font}`, source: readFileSync(`${src}styles/fonts/${font}`) })
      }
      this.emitFile({ type: 'asset', fileName: 'keys.json', source: `${JSON.stringify(keys(), null, 1)}\n` })
    },
  }
}

/** String keys of `t('…')` and `tk('…')` calls (the same scan as the app's `scripts/i18n.mjs`). */
function keys() {
  const found = new Set<string>()
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}${e.name}/`) : /\.(ts|vue)$/.test(e.name) ? [`${dir}${e.name}`] : []))
  for (const file of files(src)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/\b(?:t|tk)\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\$])*)\1/g)) found.add(m[2].replace(/\\(.)/g, '$1'))
  }
  return [...found].sort((a, b) => a.localeCompare(b, 'en'))
}

export default defineConfig({
  plugins: [vue(), extras()],
  build: {
    target: 'es2022',
    lib: {
      entry: { index: `${src}index.ts`, logic: `${src}logic/index.ts` },
      formats: ['es'],
      cssFileName: 'style',
    },
    rollupOptions: { external: ['vue'] },
    cssCodeSplit: false,
    sourcemap: true,
    reportCompressedSize: false,
  },
})
