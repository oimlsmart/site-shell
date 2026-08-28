// The render leg of the gate: the built site must actually lay out in
// BOTH color schemes, on every fixture page. The 0.1.2 blanking sailed
// through every static grep because a display:none page still contains
// all its markup — and getComputedStyle color probes pass on hidden
// elements. Only layout geometry and hit-testing catch it. The scheme is
// pinned through the package's own exported storage key, so this test
// and the theme runtime cannot drift apart. Run after `npm run build`.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import net from 'node:net'
import { chromium } from 'playwright'
// The plain-.mjs constants leaf — importing the package root here would
// pull .astro re-exports that plain node cannot load.
import { THEME_STORAGE_KEY, THEME_CLASS } from '@oimlsmart/site-shell/data/theme.mjs'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}`
const PAGES = ['/', '/showcase', '/docs']

function waitForPort(port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const attempt = () => {
      const s = net.connect(port, '127.0.0.1')
      s.once('connect', () => { s.destroy(); resolve() })
      s.once('error', () => {
        s.destroy()
        if (Date.now() - started > timeoutMs) reject(new Error('astro preview never came up'))
        else setTimeout(attempt, 150)
      })
    }
    attempt()
  })
}

const preview = spawn('node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] })
let previewLog = ''
preview.stdout.on('data', (d) => { previewLog += d })
preview.stderr.on('data', (d) => { previewLog += d })

const failures = []
const shots = {}

try {
  await waitForPort(PORT)
  const browser = await chromium.launch()

  for (const page of PAGES) {
    const pageName = page === '/' ? 'index' : page.replace(/^\//, '').replace(/\//g, '-')

    for (const scheme of ['light', 'dark']) {
      const isDark = scheme === 'dark'
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      // Pin the theme before any page script runs: the FOUC bootstrap and
      // the ThemeToggle island both defer to localStorage, so the scheme
      // under test is deterministic regardless of prefers-color-scheme.
      await ctx.addInitScript(`
        localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, ${JSON.stringify(scheme)});
        document.documentElement.classList.toggle(${JSON.stringify(THEME_CLASS)}, ${isDark});
      `)
      const pg = await ctx.newPage()
      await pg.goto(`${BASE}${page}`, { waitUntil: 'load' })
      await pg.waitForTimeout(300) // let the Vue islands hydrate

      const r = await pg.evaluate(() => {
        const html = document.documentElement
        const header = document.querySelector('header.site-nav')
        const logoLight = document.querySelector('.nav-brand img.logo-light')
        const logoDark = document.querySelector('.nav-brand img.logo-dark')
        const center = document.elementFromPoint(640, 400)
        return {
          htmlHasDark: html.classList.contains('dark'),
          htmlDisplay: getComputedStyle(html).display,
          bodyHeight: document.body.getBoundingClientRect().height,
          headerDisplay: header ? getComputedStyle(header).display : null,
          centerInsideBody: !!center && (center === document.body || document.body.contains(center)),
          logoLightDisplay: logoLight ? getComputedStyle(logoLight).display : null,
          logoDarkDisplay: logoDark ? getComputedStyle(logoDark).display : null,
        }
      })

      const where = `${pageName} ${scheme}`
      const expect = (ok, msg) => { if (!ok) failures.push(`${where}: ${msg}`) }

      expect(r.htmlDisplay !== 'none', `computed display on <html> is "${r.htmlDisplay}" — the page itself is display:none in this scheme`)
      expect(r.bodyHeight > 400, `body height is ${r.bodyHeight}px — the page has no layout`)
      expect(r.centerInsideBody, 'elementFromPoint at the viewport center missed <body> — the page renders blank')
      expect(r.headerDisplay !== null, 'the federation header (header.site-nav) is missing from the page')
      expect(r.headerDisplay !== 'none', 'the federation header is not displayed')
      expect(r.logoLightDisplay !== null, 'the header light logo (.nav-brand img.logo-light) is missing')
      expect(r.logoDarkDisplay !== null, 'the header dark logo (.nav-brand img.logo-dark) is missing')
      expect(r.htmlHasDark === isDark, `html.dark is ${r.htmlHasDark ? 'set' : 'not set'} — the scheme did not apply`)

      if (isDark) {
        expect(r.logoDarkDisplay !== 'none', 'the dark logo is hidden in dark mode — the light/dark swap broke')
        expect(r.logoLightDisplay === 'none', 'the light logo shows in dark mode')
      } else {
        expect(r.logoLightDisplay !== 'none', 'the light logo is hidden in light mode')
        expect(r.logoDarkDisplay === 'none', 'the dark logo shows in light mode')
      }

      mkdirSync('artifacts', { recursive: true })
      shots[`${pageName}-${scheme}`] = await pg.screenshot({ path: `artifacts/${pageName}-${scheme}.png` })
      await ctx.close()
    }

    if (shots[`${pageName}-light`] && shots[`${pageName}-dark`] && shots[`${pageName}-light`].equals(shots[`${pageName}-dark`]))
      failures.push(`${pageName}: light and dark screenshots are byte-identical — the color scheme is not visually applied`)
  }

  // The mobile overlay must behave as a dialog: semantics, Esc, focus.
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/`, { waitUntil: 'load' })
    await pg.waitForTimeout(300) // let the MobileNav island hydrate
    await pg.getByRole('button', { name: 'Open menu' }).click()
    const dialog = pg.locator('[role="dialog"][aria-modal="true"]')
    const opened = await dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    if (!opened) failures.push('mobile: the overlay did not open as role="dialog" aria-modal="true"')
    else {
      await pg.keyboard.press('Escape')
      await pg.waitForTimeout(500)
      if (await dialog.isVisible().catch(() => false)) failures.push('mobile: Escape did not close the overlay dialog')
    }
    await ctx.close()
  }

  await browser.close()
} catch (err) {
  failures.push(`harness error: ${err.message}\nastro preview log:\n${previewLog}`)
} finally {
  preview.kill('SIGTERM')
}

if (failures.length) {
  console.error('render check FAILED:')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(`render check passed: ${PAGES.length} page(s) × light + dark lay out, the logos swap, the mobile dialog opens and Esc-closes, screenshots in artifacts/`)
