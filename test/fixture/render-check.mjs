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
const PAGES = ['/', '/showcase', '/docs', '/bubble', '/bubble-standalone']

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

  // ── The AI bubble (TODO.ai-platform/01 + /02) — the panel path against
  // a STUBBED service (ai-stub.invalid): the streamed answer renders, the
  // citation card renders, the XSS payload stays inert, the anonymous
  // posture is marked, Esc closes, the 44px floor holds — and the context
  // chips: the availability rules, the per-message declaration on the ask
  // body, the honest context line from the echo, the mid-session change. ──
  {
    const expect = (ok, msg) => { if (!ok) failures.push(`bubble: ${msg}`) }
    // The stub echoes context_applied from the DECLARED context (the
    // service's contract, docs/API.md §2.1.1 in the rag repo): none when
    // nothing was declared; the not-in-corpus note for a 999 document;
    // scoped_to when a resolvable doc rode along; the account kind's
    // live echo + the records (TODO.ai-platform/03) — and the honest
    // window-lapsed note when the question asks for it.
    const asked = []
    const sseFor = (body) => {
      const c = body.context
      const accountLive = { kind: 'account', label: 'my account', scoped_to: null, live: { read_at: '2026-08-31T09:00:00Z', stores: ['applications', 'certificates'], records: 2 } }
      const accountRecords = [
        { store: 'applications', id: 'app-1', label: 'Application APP-2026-001 — R 60', url: 'https://demo.oimlsmart.org/app/portal/applications/app-1', status: 'SUBMITTED', detail: 'evaluation in progress; 1 test request dispatched' },
        { store: 'certificates', id: 'cert-1', label: 'Certificate R60/2021-A-EX1-26.01', url: 'https://demo.oimlsmart.org/app/portal/certificates/cert-1', status: 'ISSUED' },
      ]
      const applied = !c
        ? { kind: 'none', scoped_to: null }
        : c.kind === 'account'
          ? (body.query.includes('window lapsed') ? { kind: 'account', label: c.label, scoped_to: null, note: 'live-window-expired' } : accountLive)
          : c.doc && String(c.doc).includes('999')
            ? { kind: c.kind, label: c.label, scoped_to: null, note: 'document-not-in-corpus' }
            : { kind: c.kind, label: c.label, scoped_to: c.doc ? 'OIML R 60:2021' : null }
      return [
        `data: ${JSON.stringify({ type: 'citations', citations: [
          { docidentifier: 'OIML R 60:2017', edition: '2017', clause_title: 'Metrological requirements', status: 'in-force', url: 'https://www.oiml.org/en/publications/r60' },
          { docidentifier: 'OIML V 002', clause_title: 'Stub link policy', url: 'javascript:alert(1)' },
        ], quota: { used: 1, limit: 20 }, context_applied: applied, ...(c?.kind === 'account' && applied.live ? { records: accountRecords } : {}) })}`,
        `data: {"type":"token","v":"R 60 covers **load cells**."}`,
        `data: {"type":"token","v":"<img src=x onerror=window.__xssFired=1>"}`,
        `data: ${JSON.stringify({ type: 'token', v: ' Accuracy `class C3` spans 0 to 5.' })}`,
        `data: ${JSON.stringify({ type: 'done', query_hash: 'abcdef0123456789', follow_ups: ['What is accuracy class C3?'], model: 'stub-model', context_applied: applied })}`,
        ``,
      ].join('\n\n')
    }

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    // The stub service: ask streams; conversations is member-gated (401);
    // the bridge login popup hands a session token via postMessage, then
    // /auth/me + the conversations list answer as the member.
    await ctx.route('https://ai-stub.invalid/api/ask', (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}')
      asked.push(body)
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sseFor(body) })
    })
    await ctx.route('https://ai-stub.invalid/api/conversations', (route) => {
      const auth = route.request().headers()['authorization']
      if (!auth) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unauthorized', message: 'Sign in to sync your conversations across devices' } }) })
      // the member's new conversation (the account legs ask signed-in)
      if (route.request().method() === 'POST') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'conv-member-new' }) })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversations: [{ id: 'conv-member-1', title: 'The platform question', updated_at: '2026-08-30T00:00:00Z', messages: 2 }] }) })
    })
    // the member asks append to the conversation (the account legs) —
    // the stub takes the write, the echo rides along
    await ctx.route('https://ai-stub.invalid/api/conversations/*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }))
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
    // the markdown placeholder collision: a code span coexists with bare
    // digits in the same answer — the digits stay digits, the span
    // renders exactly once
    expect(await panel.getByText('spans 0 to 5').isVisible().catch(() => false), 'bare digits beside a code span stay digits (no placeholder collision)')
    expect((await panel.locator('.ai-md code', { hasText: 'class C3' }).count()) === 1, 'the code span renders exactly once')
    // the citation link policy: only http(s) URLs become links — the
    // stub's javascript: citation renders as text, never as an anchor
    expect(await panel.getByText('OIML V 002').isVisible().catch(() => false), 'the scheme-less citation still renders')
    expect(await panel.locator('a[href^="javascript:"]').count() === 0, 'a javascript: citation URL never becomes a link')

    // ── TODO.ai-platform/02: the context chips ──
    // The row offers what the page published — the fixture publishes a
    // page name + an entity — and None is the default, never ambient.
    const chipNone = panel.getByRole('button', { name: 'None', exact: true })
    const chipPage = panel.getByRole('button', { name: 'This page — the bubble fixture' })
    const chipEntity = panel.getByRole('button', { name: 'This certificate — R60/2021-A-EX1-26.01' })
    const chipDoc = panel.getByRole('button', { name: 'A document…' })
    expect(await chipNone.isVisible().catch(() => false), 'the None chip renders')
    expect((await chipNone.getAttribute('aria-pressed')) === 'true', 'None is the default selection (the panel opens there)')
    expect(await chipPage.isVisible().catch(() => false), 'the page chip renders with the published plain name')
    expect(await chipEntity.isVisible().catch(() => false), 'the entity chip renders with the published entity label')
    expect(await chipDoc.isVisible().catch(() => false), 'the document chip renders')
    // TODO.ai-platform/03: the account chip is member-only — the
    // anonymous visitor is never offered it.
    expect((await panel.getByRole('button', { name: /My account/ }).count()) === 0, 'the account chip is never offered to the anonymous visitor')
    // the first answer (no chip picked) declared nothing and says so
    expect(asked.length === 1 && !('context' in asked[0]), 'no context rides a message the user did not pick')
    expect(await panel.locator('.ai-context-line').first().textContent().then((t) => t?.includes('context: none (general corpus)')).catch(() => false), 'the honest context line: none (general corpus)')

    // Tap the entity chip → the NEXT message declares it; the echo's
    // honest line lands on THAT answer; the first answer keeps its own
    // line (the mid-session change is per message).
    await chipEntity.click()
    expect((await chipEntity.getAttribute('aria-pressed')) === 'true', 'the entity chip selects on tap')
    await pg.getByLabel('Your question').fill('What are its metrological requirements?')
    await pg.getByRole('button', { name: 'Send' }).click()
    await panel.getByText('context: this certificate R60/2021-A-EX1-26.01').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    expect(asked.length === 2 && asked[1].context?.kind === 'entity', 'the entity declaration rides the ask')
    expect(asked[1].context?.label === 'this certificate R60/2021-A-EX1-26.01' && asked[1].context?.doc === 'urn:oiml:pub:r:60-1:2021', 'the entity declaration names the entity + the governing publication')
    expect(await panel.getByText('context: this certificate R60/2021-A-EX1-26.01').isVisible().catch(() => false), 'the honest context line on the entity-grounded answer')
    const lines = await panel.locator('.ai-context-line').allInnerTexts()
    expect(lines.length === 2 && lines[0].includes('none (general corpus)') && lines[1].includes('this certificate'), 'the transcript marks the context per answer across the mid-session change')

    // Esc inside the picker closes the PICKER, not the panel: the
    // keydown must not reach the window listener that closes the panel
    await chipDoc.click()
    await pg.locator('#ai-docpick-input').fill('OIML R 60')
    await pg.locator('#ai-docpick-input').press('Escape')
    await pg.waitForTimeout(300)
    expect(!(await pg.locator('#ai-docpick-input').isVisible().catch(() => false)), 'Esc closes the document picker')
    expect(await panel.isVisible().catch(() => false), 'Esc inside the picker leaves the panel open')

    // The document picker: pick a document the corpus doesn't carry →
    // the echo's note renders the honest degradation.
    await chipDoc.click()
    await pg.locator('#ai-docpick-input').fill('OIML R 999')
    await pg.getByRole('button', { name: 'Pick' }).click()
    expect(await panel.getByRole('button', { name: 'A document — OIML R 999' }).isVisible().catch(() => false), 'the picked document names the chip')
    await pg.getByLabel('Your question').fill('What does it require?')
    await pg.getByRole('button', { name: 'Send' }).click()
    await panel.getByText(/not in the corpus/).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    expect(asked.length === 3 && asked[2].context?.kind === 'document' && asked[2].context?.doc === 'OIML R 999', 'the document declaration rides the ask')
    expect(await panel.getByText(/context: OIML R 999 \(not in the corpus — the general corpus answered\)/).isVisible().catch(() => false), 'the honest degradation line renders from the echo note')

    // The chips degrade honestly: the page unpublishes the entity → the
    // entity chip leaves the row.
    await pg.evaluate(() => window.dispatchEvent(new CustomEvent('oimlsmart:ai-context', { detail: { page: 'the bubble fixture' } })))
    await pg.waitForTimeout(200)
    expect((await panel.getByRole('button', { name: /This certificate/ }).count()) === 0, 'the entity chip disappears when the page stops carrying the entity')

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

    // ── TODO.ai-platform/03: the "my account" chip (members only) ──
    // The chip appears once signed in, honestly labeled; the declaration
    // rides the ask; the echo's live line + the record cards render —
    // and the lapsed window says so.
    await panel.getByRole('button', { name: 'Conversations' }).click() // back to the chat view
    const chipAccount = panel.getByRole('button', { name: 'My account — reads what you can see' })
    expect(await chipAccount.isVisible().catch(() => false), 'the account chip renders for the signed-in member, honestly labeled')
    await chipAccount.click()
    expect((await chipAccount.getAttribute('aria-pressed')) === 'true', 'the account chip selects on tap')
    await pg.getByLabel('Your question').fill('Where is my application?')
    await pg.getByRole('button', { name: 'Send' }).click()
    await panel.getByText(/context: my account \(live/).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const accountAsk = asked.find((b) => b.context?.kind === 'account')
    expect(!!accountAsk && accountAsk.context.label === 'my account', 'the account declaration rides the ask')
    expect(await panel.getByText(/context: my account \(live, read .*\) — 2 records/).isVisible().catch(() => false), 'the live-read line renders from the echo (when + how many)')
    expect(await panel.locator('.ai-recs .ai-rec').count() === 2, 'the record cards render')
    expect(await panel.locator('.ai-rec-link[href="https://demo.oimlsmart.org/app/portal/applications/app-1"]').count() === 1, 'the record card links to the platform record')
    expect(await panel.getByText('evaluation in progress; 1 test request dispatched').isVisible().catch(() => false), 'the record card carries the coarse detail')
    // the honest degradation: the lapsed window says so, never a stale claim
    await pg.getByLabel('Your question').fill('the window lapsed — what is waiting?')
    await pg.getByRole('button', { name: 'Send' }).click()
    await panel.getByText(/not read — the live window lapsed/).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    expect(await panel.getByText(/context: my account \(not read — the live window lapsed; sign in again to refresh\)/).isVisible().catch(() => false), 'the lapsed window is named honestly')
    await ctx.close()
  }

  // The panel in dark scheme: the --ai-* variables resolve through the
  // shell tokens' dark block (supplementary to the layout legs above —
  // a color probe alone proves nothing about a blank page).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.route('https://ai-stub.invalid/**', (route) => route.fulfill({ status: 500, body: 'stub' }))
    await ctx.addInitScript(`
      localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "dark");
      document.documentElement.classList.add(${JSON.stringify(THEME_CLASS)});
    `)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/bubble`, { waitUntil: 'load' })
    await pg.waitForTimeout(400)
    await pg.getByRole('button', { name: 'Open the OIML SMART AI assistant' }).first().click()
    const panel = pg.locator('#ai-bubble-panel')
    const opened = await panel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    if (!opened) failures.push('bubble dark: the panel did not open')
    else {
      const r = await panel.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, h: el.getBoundingClientRect().height }))
      if (r.bg !== 'rgb(19, 35, 61)') failures.push(`bubble dark: the panel background is ${r.bg}, expected the dark paper token (19, 35, 61)`)
      if (r.h < 200) failures.push('bubble dark: the panel has no layout')
    }
    await ctx.close()
  }

  // Soft navigation (ClientRouter) with the panel open: the body-
  // teleported launcher/panel must not survive the swap as orphans.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.route('https://ai-stub.invalid/**', (route) => route.fulfill({ status: 500, body: 'stub' }))
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/bubble`, { waitUntil: 'load' })
    await pg.waitForTimeout(400)
    await pg.getByRole('button', { name: 'Open the OIML SMART AI assistant' }).first().click()
    if (!(await pg.locator('#ai-bubble-panel').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)))
      failures.push('bubble vt: the panel did not open before navigation')
    // an in-origin anchor click (the federation links are front-door
    // absolute by design — none of them navigate within the fixture)
    await pg.evaluate(() => {
      const a = document.createElement('a')
      a.href = '/docs/'
      document.body.appendChild(a)
      a.click()
    })
    await pg.waitForTimeout(1200)
    const after = await pg.evaluate(() => ({
      path: location.pathname,
      panels: document.querySelectorAll('#ai-bubble-panel').length,
      fabs: document.querySelectorAll('.ai-launcher--fab').length,
      roots: document.querySelectorAll('body > .ai-bubble-root').length,
    }))
    if (after.path !== '/docs/' || after.panels > 0 || after.fabs > 0 || after.roots > 0)
      failures.push(`bubble vt: soft navigation left orphaned AI DOM or did not navigate (${JSON.stringify(after)})`)
    await ctx.close()
  }

  // The bubble on a small screen: the FAB carries the launch, the panel
  // is a full sheet — announced modal, and Tab cannot escape behind it.
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
      if ((await panel.getAttribute('aria-modal')) !== 'true')
        failures.push('bubble mobile: the full-screen sheet must announce aria-modal="true"')
      // Tab containment: Shift+Tab from the panel's first focusable
      // wraps to the last — focus never reaches the page behind the sheet
      await panel.getByRole('button', { name: 'Conversations' }).focus()
      await pg.keyboard.press('Shift+Tab')
      await pg.waitForTimeout(200)
      const wrapped = await pg.evaluate(() => {
        const el = document.activeElement
        const panel = document.querySelector('#ai-bubble-panel')
        const focusables = panel ? [...panel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')] : []
        const last = focusables[focusables.length - 1]
        return { isLast: el === last, outsidePanel: !panel?.contains(el), lastTag: last?.tagName ?? 'none' }
      })
      if (!wrapped.isLast) failures.push(`bubble mobile: Shift+Tab did not wrap inside the sheet (outsidePanel=${wrapped.outsidePanel})`)
    }
    await ctx.close()
  }

  // The standalone mount: a property with its own chrome gets the
  // floating launcher at EVERY breakpoint (chrome mode hides the FAB
  // ≥1024) — asserted at desktop width, plus open and Esc-close.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.route('https://ai-stub.invalid/**', (route) => route.fulfill({ status: 500, body: 'stub' }))
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, "light")`)
    const pg = await ctx.newPage()
    await pg.goto(`${BASE}/bubble-standalone`, { waitUntil: 'load' })
    await pg.waitForTimeout(400)
    const fab = pg.locator('.ai-launcher--fab')
    if (!(await fab.isVisible().catch(() => false))) failures.push('standalone: the floating launcher must stay visible at desktop width')
    else {
      await fab.click()
      const panel = pg.locator('#ai-bubble-panel')
      if (!(await panel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false))) failures.push('standalone: the panel did not open')
      else {
        await pg.keyboard.press('Escape')
        await pg.waitForTimeout(400)
        if (await panel.isVisible().catch(() => false)) failures.push('standalone: Escape did not close the panel')
      }
    }
    if (await pg.locator('.ai-launcher--icon').isVisible().catch(() => false)) failures.push('standalone: the header icon must never render without the chrome mount')
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
