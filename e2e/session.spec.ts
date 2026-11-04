import { expect, test, type Page } from '@playwright/test'

/** Collect console errors and warnings; the run must stay clean. */
function watchConsole(page: Page): string[] {
  const bad: string[] = []
  page.on('console', (m) => {
    // Headless Chrome's software GL driver reports its own frame read-backs. That is not app code.
    if (/GL Driver Message/.test(m.text())) return
    if (m.type() === 'error' || m.type() === 'warning') bad.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => bad.push('pageerror: ' + e.message))
  return bad
}

async function playSession(page: Page): Promise<number> {
  await page.getByTestId('launch').click()
  let rounds = 0
  for (let k = 0; k < 14; k++) {
    await page.getByTestId('round-start').click()
    // Let the game actually run for a moment before skipping.
    await page.waitForTimeout(700)
    await page.evaluate(() => dispatchEvent(new CustomEvent('orbit:dev-skip')))
    const next = page.getByTestId('round-next')
    await expect(next).toBeVisible()
    rounds++
    const label = await next.innerText()
    await next.click()
    if (/debrief/i.test(label)) break
  }
  return rounds
}

test('full session from launch to lock', async ({ page }) => {
  const bad = watchConsole(page)
  await page.goto('/?dev=1&date=2026-11-10')
  const rounds = await playSession(page)
  expect(rounds).toBeGreaterThanOrEqual(6)
  await expect(page.getByTestId('debrief-done')).toBeVisible()
  await page.getByTestId('debrief-done').click()
  await expect(page.getByTestId('lock-screen')).toBeVisible()
  await expect(page.getByTestId('countdown')).toHaveText(/\d\d:\d\d:\d\d/)

  // Reloading keeps the lock.
  await page.reload()
  await expect(page.getByTestId('lock-screen')).toBeVisible()
  // Stats and settings stay reachable while locked; playing does not.
  await page.getByRole('button', { name: 'Stats and logbook' }).click()
  await expect(page.getByRole('heading', { name: 'Logbook' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByTestId('launch')).toHaveCount(0)
  expect(bad).toEqual([])
})

test('resume after reload mid-session keeps progress', async ({ page }) => {
  await page.goto('/?dev=1&date=2026-11-11')
  await page.getByTestId('launch').click()
  await page.getByTestId('round-start').click()
  await page.waitForTimeout(500)
  await page.evaluate(() => dispatchEvent(new CustomEvent('orbit:dev-skip')))
  await page.getByTestId('round-next').click()
  await page.reload()
  await expect(page.getByTestId('launch')).toHaveText(/Resume mission/)
  await page.getByTestId('launch').click()
  await expect(page.getByTestId('round-start')).toBeVisible()
})

test('install manifest is valid', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel=manifest]').getAttribute('href')
  expect(href).toBeTruthy()
  const m = await (await request.get(href!)).json()
  expect(m.name).toContain('ORBIT')
  expect(m.display).toBe('standalone')
  expect(m.start_url).toBe('/')
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
  for (const i of m.icons) expect((await request.get(i.src)).ok()).toBe(true)
})

test('works offline after first load', async ({ page, context }) => {
  const bad = watchConsole(page)
  await page.goto('/?dev=1&date=2026-11-12')
  await expect(page.getByTestId('launch')).toBeVisible()
  // Wait for the service worker to take control and finish precaching.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }))
    return !!reg.active
  })
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('launch')).toBeVisible()
  const rounds = await playSession(page)
  expect(rounds).toBeGreaterThanOrEqual(6)
  await expect(page.getByTestId('debrief-done')).toBeVisible()
  await context.setOffline(false)
  expect(bad.filter((b) => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(b))).toEqual([])
})
