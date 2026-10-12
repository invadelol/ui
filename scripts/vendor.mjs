#!/usr/bin/env node
/**
 * Builds the package and copies an installable copy of it (package.json, dist, LICENSE) to a
 * folder, for hosts that use it before it is on npm:
 *
 *   node scripts/vendor.mjs ../app/vendor/invadelol-ui
 *
 * then `"@invadelol/ui": "file:./vendor/invadelol-ui"` in the host. The folder is replaced
 * whole; source maps are left out (they point at sources the host does not have).
 */
import { execSync } from 'node:child_process'
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
if (!target) {
  console.error('usage: node scripts/vendor.mjs <target folder>')
  process.exit(1)
}
const out = resolve(target.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'))
if (out === root || root.startsWith(`${out}/`)) throw new Error(`refusing to replace ${out}`)

if (!process.argv.includes('--no-build')) execSync('pnpm build', { cwd: root, stdio: 'inherit' })

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
for (const key of ['scripts', 'devDependencies', 'packageManager', 'publishConfig']) delete pkg[key]

rmSync(out, { recursive: true, force: true })
cpSync(join(root, 'dist'), join(out, 'dist'), { recursive: true, filter: (src) => !src.endsWith('.map') })
for (const file of readdirSync(join(out, 'dist'), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.js'))) {
  const path = join(out, 'dist', file)
  writeFileSync(path, readFileSync(path, 'utf8').replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n'))
}
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'))
writeFileSync(join(out, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`@invadelol/ui ${pkg.version} → ${out}`)
