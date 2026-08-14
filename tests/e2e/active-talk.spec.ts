import { test, expect, request as playwrightRequest, type Page } from '@playwright/test'

const TEST_EMAIL = `playwright-talk-${Date.now()}@test.example`
const TEST_NAME = 'Playwright Talk Speaker'
const TEST_PASSWORD = 'TestPass123!'
const CONSOLE_PASSWORD = 'playwright-console' // matches playwright.config.ts

async function registerAndConfirm(page: Page) {
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill(TEST_NAME)
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.get(`/api/speaker/test-confirm-token?email=${encodeURIComponent(TEST_EMAIL)}`)
  expect(res.ok()).toBeTruthy()
  const { confirmToken } = await res.json()
  await ctx.dispose()

  await page.goto(`/speaker/confirm?token=${confirmToken}`)
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 })
}

async function openConsole(page: Page) {
  await page.goto('/gameconsole')
  await page.locator('.auth-input').fill(CONSOLE_PASSWORD)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.locator('.talk-control')).toBeVisible({ timeout: 10000 })
}

async function lastThrows(page: Page, n = 5) {
  const res = await page.request.get(`/api/talk/test-last-throws?n=${n}`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()).throws as Array<{ text: string; clientId: string; talkId?: string }>
}

test.describe.serial('Active talk @issue-12', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await registerAndConfirm(page)
    await page.close()
  })

  test('the console lists confirmed speakers and starts with an empty stage', async ({ page }) => {
    await openConsole(page)
    await expect(page.locator('.talk-none')).toBeVisible()
    await expect(page.locator('.talk-speaker', { hasText: TEST_NAME })).toBeVisible({ timeout: 10000 })
  })

  test('throwing with nobody on stage carries no talk id', async ({ page }) => {
    await page.goto('/throw')
    await expect(page.locator('.talk-banner')).toHaveCount(0)

    await page.locator('#tomato').click()
    await expect.poll(async () => (await lastThrows(page)).length).toBeGreaterThan(0)

    const latest = (await lastThrows(page)).at(-1)!
    expect(latest.talkId).toBeUndefined()
  })

  test('activating a speaker puts them on stage and shows them on /throw', async ({ browser }) => {
    const consolePage = await browser.newPage()
    await openConsole(consolePage)

    // Open the throw page first, so the live update can be observed on a page
    // that was already loaded — joining mid-talk is covered separately below.
    const throwPage = await browser.newPage()
    await throwPage.goto('/throw')
    await expect(throwPage.locator('.talk-banner')).toHaveCount(0)

    await consolePage.locator('.talk-speaker', { hasText: TEST_NAME }).click()

    await expect(consolePage.locator('.talk-live')).toBeVisible({ timeout: 10000 })
    await expect(consolePage.locator('.talk-name')).toContainText(TEST_NAME)
    // No reload — the open page reacts to the broadcast.
    await expect(throwPage.locator('.talk-banner')).toBeVisible({ timeout: 10000 })
    await expect(throwPage.locator('.talk-hero')).toContainText(TEST_NAME)

    await throwPage.close()
    await consolePage.close()
  })

  test('a client joining mid-talk sees the active speaker', async ({ page }) => {
    await page.goto('/throw')
    await expect(page.locator('.talk-hero')).toContainText(TEST_NAME, { timeout: 10000 })
  })

  test('throws during a talk carry that talk id', async ({ page }) => {
    await page.goto('/throw')
    await expect(page.locator('.talk-banner')).toBeVisible({ timeout: 10000 })

    const before = (await lastThrows(page)).length
    await page.locator('#tomato').click()
    await expect.poll(async () => (await lastThrows(page)).length).toBeGreaterThan(before - 1)

    const latest = (await lastThrows(page)).at(-1)!
    expect(latest.talkId).toBeTruthy()
  })

  // Spoofing is covered in throw-attribution.spec.ts: the socket is only
  // reachable through the Nuxt context, so a browser test cannot hand-craft a
  // payload, and one that tried would pass vacuously.

  test('ending the talk clears the stage and the banner', async ({ browser }) => {
    const consolePage = await browser.newPage()
    await openConsole(consolePage)
    await expect(consolePage.locator('.talk-live')).toBeVisible({ timeout: 10000 })

    const throwPage = await browser.newPage()
    await throwPage.goto('/throw')
    await expect(throwPage.locator('.talk-banner')).toBeVisible({ timeout: 10000 })

    await consolePage.getByRole('button', { name: 'End talk' }).click()

    await expect(consolePage.locator('.talk-none')).toBeVisible({ timeout: 10000 })
    await expect(throwPage.locator('.talk-banner')).toHaveCount(0, { timeout: 10000 })

    await throwPage.close()
    await consolePage.close()
  })

  test('after the talk, throws are unattributed again', async ({ page }) => {
    await page.goto('/throw')
    await expect(page.locator('.talk-banner')).toHaveCount(0)

    await page.locator('#tomato').click()
    await expect.poll(async () => (await lastThrows(page)).at(-1)?.text).toBeTruthy()

    expect((await lastThrows(page)).at(-1)!.talkId).toBeUndefined()
  })
})
