// Screenshots of every screen at three viewports into docs/screens, plus the
// Open Graph banner into public/og.png. Needs a running e2e preview:
//   npm run build:e2e && npx vite preview --port 4174 --mode e2e
//   node scripts/screens.mjs
import { mkdirSync } from 'node:fs'
import { chromium, devices } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:4174'
const OUT = 'docs/screens'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  ['phone-360', { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['phone-412', { ...devices['Pixel 7'], viewport: { width: 412, height: 915 } }],
  ['desktop', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }],
]

const GAMES = ['thruster-abort', 'catch-comet', 'orbit-tracker', 'constellation', 'dead-reckoning', 'signal-drift', 'fuel-mix', 'fermi-line', 'doomsday', 'aliens', 'vanishing-walls', 'void-beast', 'alt-colour', 'star-sticks', 'riddle-bank', 'isobar-wind']

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] })
try {
  for (const [name, opts] of process.env.OG_ONLY ? [] : VIEWPORTS) {
    const ctx = await browser.newContext(opts)
    const page = await ctx.newPage()
    const shot = async (label) => {
      await page.waitForTimeout(1600)
      await page.screenshot({ path: `${OUT}/${name}-${label}.png` })
    }
    await page.goto(`${BASE}/?dev=1&forcegl=1&date=2026-11-20`)
    await page.getByTestId('launch').waitFor()
    await shot('01-home')
    await page.getByRole('button', { name: 'Settings' }).click()
    await shot('02-settings')
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByTestId('launch').click()
    let k = 0
    for (;;) {
      await page.getByTestId('round-start').waitFor()
      if (k === 0) await shot('03-round-intro')
      const title = (await page.locator('.intro h1').innerText()).toLowerCase().replace(/[^a-z]+/g, '-')
      await page.getByTestId('round-start').click()
      await page.waitForTimeout(1600)
      await shot(`04-play-${String(k).padStart(2, '0')}-${title}`)
      await page.evaluate(() => dispatchEvent(new CustomEvent('orbit:dev-skip')))
      await page.getByTestId('round-next').waitFor()
      if (k === 0) await shot('05-feedback')
      const label = await page.getByTestId('round-next').innerText()
      await page.getByTestId('round-next').click()
      k++
      if (/debrief/i.test(label)) break
    }
    await shot('06-debrief')
    await page.getByTestId('debrief-done').click()
    await shot('07-lock')
    await page.getByRole('button', { name: 'Stats and logbook' }).first().click()
    await shot('08-logbook')
    if (name === 'phone-412') {
      for (const g of GAMES) {
        await page.goto(`${BASE}/dev/game?id=${g}&d=0.5&seed=screens`)
        await page.waitForTimeout(1500)
        await page.screenshot({ path: `${OUT}/game-${g}.png` })
      }
    }
    await ctx.close()
  }
  const og = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  const p = await og.newPage()
  await p.goto(`${BASE}/dev/og?forcegl=1`)
  await p.waitForTimeout(1500)
  await p.screenshot({ path: 'public/og.png' })
  console.log('screens written')
} finally {
  await browser.close()
}
