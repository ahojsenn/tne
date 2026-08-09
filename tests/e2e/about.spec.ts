import { test, expect } from '@playwright/test'

// Deliberately stateless: this touches neither Google Sheets nor the speaker
// account flow, so it cannot contribute to the flakiness those specs have.

test.describe('About page', () => {
  test('/api/version answers with the expected shape', async ({ request }) => {
    const res = await request.get('/api/version')
    expect(res.ok()).toBeTruthy()

    const body = await res.json()
    for (const key of ['version', 'release', 'commit', 'commitShort', 'builtAt', 'isDev']) {
      expect(body).toHaveProperty(key)
    }
    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)

    // Running against a dev server there is no RELEASE_INFO, so the endpoint
    // must degrade to "dev" rather than erroring.
    if (body.isDev) {
      expect(body.version).toBe('dev')
      expect(body.release).toBeNull()
    } else {
      expect(body.release).toBeTruthy()
    }
  })

  test('renders the version and does not error', async ({ page }) => {
    await page.goto('/about')

    await expect(page.locator('.about-title')).toBeVisible()
    await expect(page.locator('.version-badge')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.version-badge')).not.toBeEmpty()
    await expect(page.locator('.error')).toHaveCount(0)
  })

  // app.vue sets `color: white` globally via .bodyClassNoGame, so any text on
  // this card that forgets an explicit colour renders white-on-white and
  // silently disappears. That happened during development and the DOM-based
  // assertions above did not catch it — the text was present, just invisible.
  test('card text actually contrasts with the card background', async ({ page }) => {
    await page.goto('/about')
    await page.waitForSelector('.version-badge')

    const cardBg = await page.locator('.about-card').evaluate(
      el => getComputedStyle(el).backgroundColor,
    )

    // A deployed build renders the .facts table; a dev build renders .dev-note
    // instead, so check whichever body text this build actually shows.
    const bodyText = (await page.locator('.facts dd').count()) ? '.facts dd' : '.dev-note'

    for (const selector of ['.about-title', bodyText]) {
      const colour = await page.locator(selector).first().evaluate(
        el => getComputedStyle(el).color,
      )
      expect(colour, `${selector} must not match the card background`).not.toBe(cardBg)
    }
  })

  test('is reachable from the nav menu', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav-toggle').click()
    await page.getByRole('link', { name: /About/ }).click()
    await expect(page).toHaveURL('/about')
    await expect(page.locator('.about-title')).toBeVisible()
  })
})
