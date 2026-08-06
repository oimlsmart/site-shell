#!/usr/bin/env node
/**
 * export-chrome.mjs — extracts the federation chrome (header, footer,
 * the head's asset tags, the theme-init script) from the fixture's
 * chrome-export page into dist-chrome/, for injection into
 * foreign-built sites (TODO.fix/07). Run AFTER the fixture build:
 *
 *   node scripts/export-chrome.mjs [fixtureDist] [outDir]
 *
 * Defaults: test/fixture/dist → dist-chrome (both relative to the
 * site-shell package root, resolved from this script's location).
 *
 * Emits:
 *   dist-chrome/header.html   the <header> markup (astro-islands incl.)
 *   dist-chrome/footer.html   the <footer> markup
 *   dist-chrome/head.html     the <link>/<script> asset tags + theme init
 *   dist-chrome/_astro/**     the hashed assets the tags reference
 *   dist-chrome/manifest.json the file list + the build's commit
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURE_DIST = process.argv[2] ?? join(PKG, 'test/fixture/dist')
const OUT = process.argv[3] ?? join(PKG, 'dist-chrome')

const page = readFileSync(join(FIXTURE_DIST, 'chrome-export/index.html'), 'utf8')

function between(text, name) {
  const start = text.indexOf(`<!-- chrome-${name}:start -->`)
  const end = text.indexOf(`<!-- chrome-${name}:end -->`)
  if (start < 0 || end < 0) throw new Error(`chrome-${name} markers not found`)
  return text.slice(start, end).replace(`<!-- chrome-${name}:start -->`, '').trim()
}

// The head's stylesheet links plus every inline <script> in the
// document: Astro inlines the island runtime, the hydration bootstrap,
// and the theme init as attribute-less scripts. Component chunks stay
// external (/_astro/*.js, copied below); their URLs are rewritten by
// the consumer to its own base path.
const head = page.slice(page.indexOf('<head>'), page.indexOf('</head>'))
const styleTags = [...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m => m[0])
const inlineScripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[0])
if (inlineScripts.length === 0) throw new Error('no inline scripts found (island runtime missing)')

const header = between(page, 'header')
const footer = between(page, 'footer')

// Asset URLs in the fragments are emitted root-relative (the fixture
// builds with base '/'); consumers rewrite them to their own base.
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'header.html'), header + '\n')
writeFileSync(join(OUT, 'footer.html'), footer + '\n')
writeFileSync(join(OUT, 'head.html'), [...styleTags, ...inlineScripts].join('\n') + '\n')

const astroAssets = join(FIXTURE_DIST, '_astro')
if (existsSync(astroAssets)) {
  mkdirSync(join(OUT, '_astro'), { recursive: true })
  cpSync(astroAssets, join(OUT, '_astro'), { recursive: true })
}

let commit = 'unknown'
try { commit = execSync('git rev-parse --short HEAD', { cwd: PKG }).toString().trim() } catch {}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  generated: new Date().toISOString(),
  commit,
  files: ['header.html', 'footer.html', 'head.html', '_astro/'],
}, null, 2) + '\n')

console.log(`chrome exported to ${OUT} (commit ${commit})`)
