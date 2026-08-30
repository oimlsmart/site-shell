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
const PAGES = ['/', '/showcase', '/docs', '/bubble']

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

  // The account chip (the signin slot) is identity, not navigation: its
  // avatar must stay visible at EVERY breakpoint — it used to collapse
  // with the lg: nav, hiding the logged-in user's profile photo below
  // 1024px — and the overlay must not offer "Sign in" to a signed-in user.
  for (const width of [375, 900, 1280]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/showcase`, { waitUntil: 'load' })
    await pg.waitForTimeout(300)
    const avatar = await pg.evaluate(() => {
      const el = document.querySelector('#account-avatar')
      if (!el) return null
      const box = el.getBoundingClientRect()
      return { display: getComputedStyle(el).display, w: box.width, h: box.height }
    })
    if (avatar === null) failures.push(`account chip @${width}w: #account-avatar missing from the page (signin slot not threaded)`)
    else if (avatar.display === 'none' || avatar.w < 24 || avatar.h < 24)
      failures.push(`account chip @${width}w: the profile photo is not visible (${avatar.display}, ${Math.round(avatar.w)}x${Math.round(avatar.h)}) — identity UI collapsed with the nav`)
    await ctx.close()
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/showcase`, { waitUntil: 'load' })
    await pg.waitForTimeout(300)
    await pg.getByRole('button', { name: 'Open menu' }).click()
    const dialog = pg.locator('[role="dialog"][aria-modal="true"]')
    const opened = await dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    if (opened && (await dialog.locator('.shell-signin').count()) > 0)
      failures.push('account chip: the overlay offers "Sign in" to a signed-in user (showSignIn not threaded)')
    await ctx.close()
  }

  // ── The AI bubble (TODO.ai-platform/01) — the panel path against a
  // STUBBED service (ai-stub.invalid): the streamed answer renders, the
  // citation card renders, the XSS payload stays inert, the anonymous
  // posture is marked, Esc closes, the 44px floor holds. ──
  {
    const expect = (ok, msg) => { if (!ok) failures.push(`bubble: ${msg}`) }
    const sse = [
      `data: {"type":"citations","citations":[{"docidentifier":"OIML R 60:2017","edition":"2017","clause_title":"Metrological requirements","status":"in-force","url":"https://www.oiml.org/en/publications/r60"}],"quota":{"used":1,"limit":20}}`,
      `data: {"type":"token","v":"R 60 covers **load cells**."}`,
      `data: {"type":"token","v":"<img src=x onerror=window.__xssFired=1>"}`,
      `data: {"type":"done","query_hash":"abcdef0123456789","follow_ups":["What is accuracy class C3?"],"model":"stub-model"}`,
      ``,
    ].join('\n\n')

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    // The stub service: ask streams; conversations is member-gated (401);
    // the bridge login popup hands a session token via postMessage, then
    // /auth/me + the conversations list answer as the member.
    await ctx.route('https://ai-stub.invalid/api/ask', (route) =>
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse }))
    await ctx.route('https://ai-stub.invalid/api/conversations', (route) => {
      const auth = route.request().headers()['authorization']
      if (!auth) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unauthorized', message: 'Sign in to sync your conversations across devices' } }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [{ id: 'conv-member-1', title: 'The platform question', updated_at: '2026-08-30T00:00:00Z', messages: 2 }] }) })
    })
    await ctx.route('https://ai-stub.invalid/auth/me', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, name: 'R. Tse', email: 'r.tse@example.org', roles: [], tier: 'member', sign_in_available: true }) }))
    await ctx.route('https://ai-stub.invalid/auth/login*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><title>stub confirm</title><script>
          window.opener && window.opener.postMessage({ type: 'oimlsmart-ai-session', token: 'stub-token', name: 'R. Tse', expiresAt: Date.now() + 86400000 }, ${JSON.stringify(BASE)})
        </script>`,
      }))
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/bubble`, { waitUntil: 'load' })
    await pg.waitForTimeout(400) // the island hydrates

    const launcher = pg.getByRole('button', { name: 'Open the OIML SMART AI assistant' }).first()
    expect(await launcher.isVisible(), 'the launcher is visible on the flagged page (desktop: the header icon)')
    const box = await launcher.boundingBox()
    expect(!!box && box.width >= 44 && box.height >= 44, `the launcher honors the 44px touch floor (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box'})`)
    await launcher.click()
    const panel = pg.locator('#ai-bubble-panel[role="dialog"]')
    expect(await panel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false), 'the panel opens as a labelled dialog')
    expect(await panel.getByText('Anonymous — public corpus').isVisible().catch(() => false), 'the anonymous posture is honestly marked')

    await pg.getByLabel('Your question').fill('What does R 60 cover?')
    await pg.getByRole('button', { name: 'Send' }).click()
    expect(await panel.getByText('R 60 covers').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false), 'the streamed answer renders')
    expect(await panel.locator('.ai-md strong', { hasText: 'load cells' }).count() === 1, 'the answer markdown renders (bold)')
    expect(await panel.getByText('<img src=x onerror=window.__xssFired=1>').count() === 1, 'the XSS payload renders as inert text')
    expect(await pg.evaluate(() => window.__xssFired === undefined), 'the XSS payload never executed')
    expect(await panel.locator('img[src="x"]').count() === 0, 'no injected element landed in the DOM')
    expect(await panel.getByText('OIML R 60:2017').isVisible().catch(() => false), 'the citation card renders the docidentifier')
    expect(await panel.getByText('Metrological requirements').isVisible().catch(() => false), 'the citation card renders the clause title')
    expect(await panel.getByRole('button', { name: 'What is accuracy class C3?' }).isVisible().catch(() => false), 'the follow-up chip renders')

    // Esc closes; focus returns to the launcher
    await pg.keyboard.press('Escape')
    await pg.waitForTimeout(300)
    expect(await panel.isVisible().catch(() => false) === false, 'Escape closes the panel')

    // The member bridge: the sessions view signs in via the popup, then
    // the server conversation list renders.
    await launcher.click()
    await panel.getByRole('button', { name: 'Conversations' }).click()
    const popupPromise = pg.waitForEvent('popup')
    await panel.getByRole('button', { name: 'Sign in to sync conversations' }).click()
    const popup = await popupPromise
    await popup.waitForLoadState()
    expect(await panel.getByText('Signed in as R. Tse').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false), 'the bridge sign-in lands the member session')
    expect(await panel.getByText('The platform question').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false), 'the member conversation list renders from the service')
    await ctx.close()
  }

  // The bubble on a small screen: the FAB carries the launch, the panel
  // is a full sheet.
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 700 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    await ctx.route('https://ai-stub.invalid/**', (route) => route.fulfill({ status: 500, body: 'stub' }))
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/bubble`, { waitUntil: 'load' })
    await pg.waitForTimeout(400)
    const fab = pg.getByRole('button', { name: 'Open the OIML SMART AI assistant' }).first()
    if (!(await fab.isVisible().catch(() => false))) failures.push('bubble mobile: the floating launcher is not visible')
    else {
      await fab.click()
      const panel = pg.locator('#ai-bubble-panel')
      const box = await panel.boundingBox()
      if (!box || Math.abs(box.width - 375) > 2 || Math.abs(box.height - 700) > 2)
        failures.push(`bubble mobile: the panel is not a full sheet (${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'no box'})`)
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
console.log(`render check passed: ${PAGES.length} page(s) × light + dark lay out, the logos swap, the mobile dialog opens and Esc-closes, the AI bubble answers against the stub with citations + the XSS payload inert, screenshots in artifacts/`)
