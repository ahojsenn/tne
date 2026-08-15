import { test, expect, request as playwrightRequest, type Browser, type Page } from '@playwright/test'

const STAMP = Date.now()
const PRESENTER = { email: `playwright-live-a-${STAMP}@test.example`, name: 'Live Presenter' }
const BYSTANDER = { email: `playwright-live-b-${STAMP}@test.example`, name: 'Live Bystander' }
const PW = 'TestPass123!'
const CONSOLE_PASSWORD = 'playwright-console' // matches playwright.config.ts

async function registerAndConfirm(page: Page, who: { email: string; name: string }) {
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill(who.name)
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password', { exact: true }).fill(PW)
  await page.getByLabel('Confirm password').fill(PW)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.get(`/api/speaker/test-confirm-token?email=${encodeURIComponent(who.email)}`)
  expect(res.ok()).toBeTruthy()
  const { confirmToken } = await res.json()
  await ctx.dispose()

  await page.goto(`/speaker/confirm?token=${confirmToken}`)
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 })
}

/** Each speaker needs their own context — sessions are cookie-based. */
async function loggedInDashboard(browser: Browser, who: { email: string }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/speaker/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password').fill(PW)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/speaker/dashboard', { timeout: 10000 })
  return { context, page }
}

async function openConsole(browser: Browser) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/gameconsole')
  await page.locator('.auth-input').fill(CONSOLE_PASSWORD)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.locator('.talk-control')).toBeVisible({ timeout: 10000 })
  return { context, page }
}

test.describe.serial('Live talk stats @issue-13', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await registerAndConfirm(page, PRESENTER)
    await registerAndConfirm(page, BYSTANDER)
    await page.close()
  })

  test('the endpoint refuses anyone who is not logged in', async ({ page }) => {
    const res = await page.request.get('/api/speaker/talk-stats')
    expect(res.status()).toBe(401)
  })

  test('off stage, the dashboard says so and shows no numbers', async ({ browser }) => {
    const { context, page } = await loggedInDashboard(browser, PRESENTER)

    await expect(page.locator('.live-title')).toContainText('Not on stage', { timeout: 10000 })
    await expect(page.locator('.live-total')).toHaveCount(0)
    await expect(page.locator('.live-hint')).toBeVisible()

    await context.close()
  })

  test('going on stage flips the dashboard to live without a reload', async ({ browser }) => {
    const speaker = await loggedInDashboard(browser, PRESENTER)
    await expect(speaker.page.locator('.live-title')).toContainText('Not on stage', { timeout: 10000 })

    const console_ = await openConsole(browser)
    await console_.page.locator('.talk-speaker', { hasText: PRESENTER.name }).click()
    await expect(console_.page.locator('.talk-live')).toBeVisible({ timeout: 10000 })

    // The dashboard polls; no reload, no interaction.
    await expect(speaker.page.locator('.live-title')).toContainText('you are on stage', { timeout: 15000 })
    await expect(speaker.page.locator('.live-total-n')).toHaveText('0')

    await console_.context.close()
    await speaker.context.close()
  })

  test('throws show up in the speaker\'s live tally', async ({ browser }) => {
    const speaker = await loggedInDashboard(browser, PRESENTER)
    await expect(speaker.page.locator('.live-title')).toContainText('you are on stage', { timeout: 15000 })

    const audience = await browser.newPage()
    await audience.goto('/throw')
    await expect(audience.locator('.talk-banner')).toBeVisible({ timeout: 10000 })
    await audience.locator('#tomato').click()
    await audience.locator('#tomato').click()
    await audience.locator('#star').click()

    await expect(speaker.page.locator('.live-total-n')).toHaveText('3', { timeout: 15000 })

    const counts = speaker.page.locator('.live-item')
    await expect(counts.filter({ has: speaker.page.locator('img[alt="tomato"]') })).toContainText('2')
    await expect(counts.filter({ has: speaker.page.locator('img[alt="star"]') })).toContainText('1')
    await expect(counts.filter({ has: speaker.page.locator('img[alt="egg"]') })).toContainText('0')

    await audience.close()
    await speaker.context.close()
  })

  test('another speaker cannot see the numbers', async ({ browser }) => {
    const other = await loggedInDashboard(browser, BYSTANDER)

    // Someone else's talk is running, but for this speaker it reads exactly
    // like no talk at all — same shape, no counts.
    const res = await other.page.request.get('/api/speaker/talk-stats')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.onStage).toBe(false)
    expect(body.counts).toEqual({})
    expect(body.total).toBe(0)
    expect(body.startedAt).toBeNull()

    await expect(other.page.locator('.live-title')).toContainText('Not on stage', { timeout: 10000 })
    await expect(other.page.locator('.live-total')).toHaveCount(0)

    await other.context.close()
  })

  test('ending the talk takes the dashboard back off stage', async ({ browser }) => {
    const speaker = await loggedInDashboard(browser, PRESENTER)
    await expect(speaker.page.locator('.live-title')).toContainText('you are on stage', { timeout: 15000 })

    const console_ = await openConsole(browser)
    await console_.page.getByRole('button', { name: 'End talk' }).click()
    await expect(console_.page.locator('.talk-none')).toBeVisible({ timeout: 10000 })

    await expect(speaker.page.locator('.live-title')).toContainText('Not on stage', { timeout: 15000 })
    await expect(speaker.page.locator('.live-total')).toHaveCount(0)

    await console_.context.close()
    await speaker.context.close()
  })
})
