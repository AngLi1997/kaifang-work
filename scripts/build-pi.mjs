import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const projectRoot = resolve(import.meta.dirname, '..')
const piRoot = join(projectRoot, 'vendor', 'pi')
const piPackage = join(piRoot, 'packages', 'coding-agent', 'package.json')
const piDist = join(piRoot, 'packages', 'coding-agent', 'dist')
const chordDist = join(piRoot, 'packages', 'chord', 'dist')
const chordPackage = join(piRoot, 'packages', 'chord', 'package.json')
const outputDir = join(projectRoot, 'resources', 'pi')
const sdkEntry = join(projectRoot, 'scripts', 'pi-sdk-entry.mjs')

if (!existsSync(piPackage)) {
  throw new Error('找不到 vendor/pi，请先执行 git subtree add 或恢复 Pi 源码')
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const codingAgentLink = join(piRoot, 'node_modules', '@earendil-works', 'pi-coding-agent')

if (!existsSync(codingAgentLink)) {
  execFileSync(npmCommand, ['ci', '--ignore-scripts'], { cwd: piRoot, stdio: 'inherit' })
}

execFileSync(npmCommand, ['run', 'build:offline'], { cwd: piRoot, stdio: 'inherit' })

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
await writeFile(
  join(outputDir, 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2),
  'utf8'
)

const esbuildCommand = join(
  piRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'
)
execFileSync(
  esbuildCommand,
  [
    sdkEntry,
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--banner:js=import { createRequire as __kaifangCreateRequire } from "node:module"; const require = __kaifangCreateRequire(import.meta.url);',
    '--external:cross-spawn',
    '--external:proper-lockfile',
    '--external:jiti/static',
    '--external:@mariozechner/clipboard',
    '--external:@silvia-odwyer/photon-node',
    '--outfile=' + join(outputDir, 'sdk.js')
  ],
  { cwd: projectRoot, stdio: 'inherit' }
)

if (!existsSync(join(outputDir, 'sdk.js'))) {
  throw new Error('Pi 构建完成但缺少 SDK 入口')
}

// These packages rely on Node's runtime module loading and cannot be safely
// flattened into the ESM bundle. Copy the small dependency closure beside it
// so both development and packaged Electron builds resolve them locally.
const runtimePackages = new Set([
  'cross-spawn',
  'proper-lockfile',
  'jiti',
  '@mariozechner/clipboard',
  '@silvia-odwyer/photon-node'
])
const copiedPackages = new Set()
const pendingPackages = [...runtimePackages]

while (pendingPackages.length > 0) {
  const packageName = pendingPackages.pop()
  if (!packageName || copiedPackages.has(packageName)) continue

  const source = join(piRoot, 'node_modules', packageName)
  if (!existsSync(source)) continue

  const packageSource = realpathSync(source)
  const packageOutput = join(outputDir, 'node_modules', packageName)
  await mkdir(dirname(packageOutput), { recursive: true })
  await cp(packageSource, packageOutput, {
    recursive: true,
    dereference: true
  })
  copiedPackages.add(packageName)

  const packageJson = JSON.parse(await readFile(join(packageSource, 'package.json'), 'utf8'))
  for (const dependencyName of Object.keys({
    ...packageJson.dependencies,
    ...packageJson.optionalDependencies
  })) {
    if (!copiedPackages.has(dependencyName)) pendingPackages.push(dependencyName)
  }
}

// The SDK resolves a few official package resources relative to dist/.
// Keep these paths aligned with Pi's Node.js layout so resource loading and
// future non-interactive features (for example HTML export) continue to work.
for (const relativePath of [
  'modes/interactive/theme',
  'modes/interactive/assets',
  'core/export-html'
]) {
  await cp(join(piDist, relativePath), join(outputDir, 'dist', relativePath), {
    recursive: true
  })
}

// Pi's release bundle intentionally leaves Chord external. Package only that
// small runtime dependency beside the SDK; the rest of the vendor tree is
// excluded from the Electron application package.
const chordOutput = join(outputDir, 'node_modules', '@earendil-works', 'chord')
await mkdir(chordOutput, { recursive: true })
await cp(chordDist, join(chordOutput, 'dist'), { recursive: true })
await cp(chordPackage, join(chordOutput, 'package.json'))

console.log(`Pi bundle copied to ${outputDir}`)
