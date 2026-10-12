import { readFileSync, readdirSync } from 'node:fs'
import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin, type Rollup } from 'vite'
import vue from '@vitejs/plugin-vue'

const src = fileURLToPath(new URL('./src/', import.meta.url))

/**
 * What ships beside the bundle, as-is: `tokens.css` (dark) with its fonts, `tokens-light.css` (the
 * light block, repeated under `data-theme="system"` for a light system preference), and
 * `keys.json`, every string key the views translate (`t('…')` / `tk('…')`), for the hosts' locale
 * checks.
 */
function extras(): Plugin {
  return {
    name: 'invade-ui-extras',
    apply: 'build',
    generateBundle() {
      const light = readFileSync(`${src}styles/tokens-light.css`, 'utf8')
      const block = /\[data-theme='light'\],\n\.iv-light \{\n([\s\S]*?)\n\}/.exec(light)?.[1]
      if (!block) throw new Error('tokens-light.css: light block not found')
      const system = `@media (prefers-color-scheme: light) {\n  [data-theme='system'] {\n${block.replace(/^/gm, '  ')}\n  }\n}\n`
      this.emitFile({ type: 'asset', fileName: 'tokens.css', source: readFileSync(`${src}styles/tokens.css`, 'utf8') })
      this.emitFile({ type: 'asset', fileName: 'tokens-light.css', source: `${light}\n${system}` })
      for (const font of readdirSync(`${src}styles/fonts`)) {
        this.emitFile({ type: 'asset', fileName: `fonts/${font}`, source: readFileSync(`${src}styles/fonts/${font}`) })
      }
      this.emitFile({ type: 'asset', fileName: 'keys.json', source: `${JSON.stringify(keys(), null, 1)}\n` })
    },
  }
}

/**
 * CSS per component: library mode writes each module's CSS beside it but drops the import, so put
 * it back at the top of the module that defines the component (`import './MatchRow.css'`), and a
 * host's bundler loads a component's styles exactly when it uses the component. A `<style>` block
 * is imported by the SFC's facade (`X.vue`), which importers skip for the script (`X.vue?vue&type=
 * script…`), so Vite lists that CSS on every importer instead (`index.js` would load them all): it
 * goes to the script's module only. Also writes `style.css`, every file in one, for hosts that
 * take all the styles at once.
 */
function cssImports(): Plugin {
  return {
    name: 'invade-ui-css-imports',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
      const cssOf = (c: Rollup.OutputChunk) => [...(c.viteMetadata?.importedCss ?? [])]
      const owner = new Map<string, string>()
      for (const facade of chunks) {
        const sfc = facade.moduleIds.find((id) => id.endsWith('.vue'))
        const script = sfc && chunks.find((c) => c.moduleIds.some((id) => id.startsWith(`${sfc}?vue&type=script`)))
        if (script) for (const f of cssOf(facade)) owner.set(f, script.fileName)
      }
      const own = new Map<string, string[]>()
      for (const chunk of chunks) {
        const css = cssOf(chunk).filter((f) => !owner.has(f))
        for (const [f, o] of owner) if (o === chunk.fileName) css.push(f)
        own.set(chunk.fileName, css)
        if (!css.length) continue
        const dir = posix.dirname(chunk.fileName)
        chunk.code = css.map((f) => `import '${posix.relative(dir, f).replace(/^(?!\.)/, './')}';\n`).join('') + chunk.code
        // The added lines come first: shift the source map by as many lines.
        const map = bundle[`${chunk.fileName}.map`]
        if (map?.type === 'asset') {
          const json = JSON.parse(String(map.source))
          map.source = JSON.stringify({ ...json, mappings: ';'.repeat(css.length) + json.mappings })
        }
      }
      const order = new Set<string>()
      const seen = new Set<string>()
      const visit = (file: string) => {
        if (seen.has(file) || !own.has(file)) return
        seen.add(file)
        for (const f of own.get(file)!) order.add(f)
        ;(bundle[file] as Rollup.OutputChunk).imports.forEach(visit)
      }
      visit('index.js')
      // The shared sheets first, then the components' own, as the single file always was.
      const all = [...order].sort((a, b) => Number(!a.startsWith('styles/')) - Number(!b.startsWith('styles/')))
      this.emitFile({ type: 'asset', fileName: 'style.css', source: all.map((f) => (bundle[f] as Rollup.OutputAsset).source).join('') })
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
  plugins: [vue(), extras(), cssImports()],
  build: {
    target: 'es2022',
    lib: {
      entry: { index: `${src}index.ts`, logic: `${src}logic/index.ts` },
      formats: ['es'],
    },
    // One file per module, so a host's bundler splits the views across its own chunks (a page that
    // shows an icon does not load the match detail).
    rollupOptions: { external: ['vue'], output: { preserveModules: true, preserveModulesRoot: 'src', entryFileNames: '[name].js' } },
    cssCodeSplit: true,
    sourcemap: true,
    reportCompressedSize: false,
  },
})
