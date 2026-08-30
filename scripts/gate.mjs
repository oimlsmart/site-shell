#!/usr/bin/env node
// The gate — one entry point for "the chrome still works", run over the
// built fixture: the compile checks (header, brand, tokens, threaded
// props, the MobileNav logo regression, the showcase components, the
// a11y legs), the theme guard, and the chrome-export pipeline (export →
// apply → idempotence). ci.yml and release.yml run exactly this (then
// gate:render), so the PR proof and the publish proof cannot drift
// apart — they had: at the 0.1.2 tag the release gate was missing two
// legs ci.yml already had.
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { runThemeGuard } from './guard.mjs'
import { LEGAL, SERVICES, SITE } from '../src/data/site.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'test/fixture/dist')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('gate: test/fixture/dist is not built — run the fixture build first (cd test/fixture && npm run build)')
  process.exit(1)
}

const failures = []
const check = (ok, label) => { if (!ok) failures.push(label) }
const read = (...p) => readFileSync(join(DIST, ...p), 'utf8')

const indexHtml = read('index.html')
const showcaseHtml = read('showcase', 'index.html')
const docsHtml = read('docs', 'index.html')
const assetNames = readdirSync(join(DIST, '_astro'))
const css = assetNames.filter(f => f.endsWith('.css')).map(f => read('_astro', f)).join('\n')
const mobileNav = assetNames.filter(f => /^MobileNav\..*\.js$/.test(f)).map(f => read('_astro', f)).join('\n')

check(indexHtml.includes('site-nav'), 'the federation header (site-nav) compiled into the page')
check(indexHtml.includes('OIML SMART'), 'the brand compiled into the page')
check(css.includes('color-brand'), 'the design tokens compiled into the output')
check(indexHtml.includes('href="/auth/login"'), 'the threaded signInHref compiled into the page')
check(indexHtml.includes('Skip to content') && /href="#main"/.test(indexHtml), 'the skip-to-content link present')
check(/<main[^>]*id="main"/.test(indexHtml), 'main carries id="main" (the skip link target)')
check(/aria-label="Primary"/.test(indexHtml), 'the federation nav landmark labelled')
check(/aria-label="Sections"/.test(indexHtml), 'the minisite nav landmark labelled')
check(docsHtml.includes('aria-label="Documentation"'), 'the docs nav landmark labelled')
check(indexHtml.includes(`href="${LEGAL.privacy}"`), 'the footer Privacy legal link compiled into the page (from the site constants leaf)')
check(indexHtml.includes(`href="${LEGAL.terms}"`), 'the footer Terms legal link compiled into the page (from the site constants leaf)')
check(indexHtml.includes(`href="${SITE.url}/recs"`), 'federation nav links are front-door absolute (resolve from any origin)')
check(indexHtml.includes(`href="${SITE.url}/pilot"`), 'the footer programme links are front-door absolute')
check(indexHtml.includes(`href="${SERVICES.status}"`), 'the footer Service status link compiled into the page (from the site constants leaf)')
check(showcaseHtml.includes(`href="${SITE.url}/pilot"`), 'the internal banner link is front-door absolute')
check(/MobileNav\.[A-Za-z0-9_-]+\.js/.test(indexHtml) && indexHtml.includes('https://www.oimlsmart.org/smart-logo-light.svg'), 'the mobile nav island rides the absolute brand logo URLs (serialized props)')
check(!/src:"\/smart-logo/.test(mobileNav), 'the mobile nav carries no relative logo paths (the 2026-08-24 regression)')
check(showcaseHtml.includes('tier-toggle'), 'TierToggle mounted on the showcase page')
check(showcaseHtml.includes('component-logo'), 'ComponentLogo mounted on the showcase page')
check(showcaseHtml.includes('DRAFT'), 'the internal banner mounted on the showcase page (<Base internal>)')
check(showcaseHtml.includes('account-chip') && showcaseHtml.includes('account-avatar'), 'the signin slot threads the account chip into the header')
{
  // The AI bubble (TODO.ai-platform/01): flag-gated per property. The
  // bubble fixture mounts it (against the stub origin); every other
  // fixture page is flagless and must NOT carry it.
  const bubbleHtml = read('bubble', 'index.html')
  check(bubbleHtml.includes('aria-label="Open the OIML SMART AI assistant"'), 'the AI launcher compiled into the bubble fixture page')
  check(bubbleHtml.includes('ai-stub.invalid'), 'the bubble serialized the configured service origin')
  check(!indexHtml.includes('aria-label="Open the OIML SMART AI assistant"'), 'the AI launcher stays OFF by default (the flagless index page)')
  check(!docsHtml.includes('aria-label="Open the OIML SMART AI assistant"'), 'the AI launcher stays OFF on the flagless docs page')
}
{
  const first = docsHtml.indexOf('guides/first')
  const second = docsHtml.indexOf('guides/second')
  const third = docsHtml.indexOf('guides/third')
  check(first >= 0 && second > first && third > second, 'DocsSidebar mounts the docs collection with docs-sort ordering applied')
}

failures.push(...runThemeGuard(DIST))

// --- the chrome-export pipeline: export → apply → idempotence. The
// --- scripts ship in the tarball; this is their proof.
{
  const run = (script, ...args) =>
    spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], { encoding: 'utf8' })

  const exported = run('export-chrome.mjs', DIST)
  if (exported.status !== 0) {
    failures.push(`chrome export failed: ${(exported.stderr || exported.stdout || '').trim()}`)
  } else {
    // A minimal foreign page — no chrome of its own, like the sites
    // apply-chrome exists for (the glossarist/Jekyll pipelines).
    const scratch = mkdtempSync(join(tmpdir(), 'chrome-smoke-'))
    const siteDist = join(scratch, 'site')
    mkdirSync(siteDist)
    writeFileSync(join(siteDist, 'index.html'),
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>foreign</title></head><body><h1>a foreign page</h1></body></html>')

    const applied = run('apply-chrome.mjs', ROOT, siteDist, '/smoke')
    if (applied.status !== 0) {
      failures.push(`chrome apply failed: ${(applied.stderr || applied.stdout || '').trim()}`)
    } else {
      const page = readFileSync(join(siteDist, 'index.html'), 'utf8')
      check(page.includes('site-nav'), 'chrome pipeline: the header fragment injected into the foreign page')
      check(page.includes('href="/smoke/_astro/'), 'chrome pipeline: asset URLs rewritten to the apply base')
      check(readdirSync(join(siteDist, '_astro')).some(f => /^app-media\..*\.css$/.test(f)), 'chrome pipeline: the split responsive-variant stylesheet landed')
      const again = run('apply-chrome.mjs', ROOT, siteDist, '/smoke')
      check(again.status === 0 && /applied to 0 pages/.test(again.stdout), 'chrome pipeline: apply is idempotent (second run injects nothing)')
    }
  }
}

if (failures.length) {
  console.error(`gate FAILED (${failures.length}):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('gate passed: chrome + showcase compiled, brand threaded, theme guard clean, chrome pipeline proven')
