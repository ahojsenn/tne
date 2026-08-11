import { test, expect, request as playwrightRequest } from '@playwright/test'

const TEST_EMAIL = `playwright-hero-${Date.now()}@test.example`
const TEST_NAME = 'Playwright Hero Speaker'
const TEST_PASSWORD = 'TestPass123!'

async function register(page: any, email = TEST_EMAIL) {
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill(TEST_NAME)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })
}

async function confirmEmail(page: any, email = TEST_EMAIL) {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.get(`/api/speaker/test-confirm-token?email=${encodeURIComponent(email)}`)
  expect(res.ok()).toBeTruthy()
  const { confirmToken } = await res.json()
  await ctx.dispose()
  await page.goto(`/speaker/confirm?token=${confirmToken}`)
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 })
}

async function login(page: any, email = TEST_EMAIL) {
  await page.goto('/speaker/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/speaker/dashboard', { timeout: 10000 })
}

async function deleteAccount(page: any) {
  await page.goto('/speaker/dashboard')
  await page.getByRole('button', { name: /Delete Account/ }).click()
  await expect(page.locator('.confirm-text')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Yes, delete my account' }).click()
  await expect(page).toHaveURL('/speaker/register', { timeout: 10000 })
}

// Run serially — all tests share the same registered account
test.describe.serial('Speaker hero customisation', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await register(page)
    await confirmEmail(page)
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await login(page)
    await deleteAccount(page)
    await page.close()
  })

  test('dashboard shows hero section with current hero name', async ({ page }) => {
    await login(page)
    await expect(page.locator('.hero-section')).toBeVisible()
    await expect(page.locator('.hero-section')).toContainText('Hero')
  })

  test('hero section has a Change Hero button', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('button', { name: /Change Hero/i })).toBeVisible()
  })

  test('clicking Change Hero reveals the hero picker with a list of heroes', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    // Should contain well-known hero names from the superheroes list
    await expect(page.locator('.hero-picker')).toContainText('Spider-Man')
    await expect(page.locator('.hero-picker')).toContainText('Wonder Woman')
    await expect(page.locator('.hero-picker')).toContainText('Thor')
  })

  test('hero picker has a search/filter input', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.hero-search')).toBeVisible()
  })

  test('search input filters the hero list', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    await page.locator('.hero-search').fill('Spider')
    await expect(page.locator('.hero-picker')).toContainText('Spider-Man')
    await expect(page.locator('.hero-picker')).not.toContainText('Thor')
  })

  test('can select a hero and save', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    await page.locator('.hero-picker').getByText('Spider-Man').click()
    await page.getByRole('button', { name: /Save/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.hero-section')).toContainText('Spider-Man')
  })

  test('hero name persists after logout and re-login', async ({ page }) => {
    await login(page)
    // Spider-Man was saved in the previous test
    await expect(page.locator('.hero-section')).toContainText('Spider-Man')
  })

  test('API /api/speaker/me returns heroName', async ({ page }) => {
    await login(page)
    const response = await page.request.get('/api/speaker/me')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('heroName')
    expect(data.heroName).toBe('Spider-Man')
  })

  test('can change hero name to a different hero', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    await page.locator('.hero-picker').getByText('Thor').click()
    await page.getByRole('button', { name: /Save/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.hero-section')).toContainText('Thor')
  })

  test('cancelling the picker does not change the saved hero', async ({ page }) => {
    await login(page)
    // Current hero is Thor from previous test
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })
    await page.locator('.hero-picker').getByText('Wolverine').click()
    await page.getByRole('button', { name: /Cancel/i }).click()
    await expect(page.locator('.hero-picker')).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('.hero-section')).toContainText('Thor')
    await expect(page.locator('.hero-section')).not.toContainText('Wolverine')
  })

  // --- personal, free-text hero names (#35) --------------------------------

  const PERSONAL_NAME = 'Captain Kommitment'

  test('can save a personal name that is not in the suggestion list', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await expect(page.locator('.hero-picker')).toBeVisible({ timeout: 5000 })

    await page.locator('.hero-search').fill(PERSONAL_NAME)
    await page.getByRole('button', { name: /^Save$/i }).click()

    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.hero-section')).toContainText(PERSONAL_NAME)
  })

  test('the personal name survives logout and re-login', async ({ page }) => {
    await login(page)
    await expect(page.locator('.hero-section')).toContainText(PERSONAL_NAME)

    const response = await page.request.get('/api/speaker/me')
    expect(response.ok()).toBeTruthy()
    expect((await response.json()).heroName).toBe(PERSONAL_NAME)
  })

  test('surrounding whitespace is trimmed away', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await page.locator('.hero-search').fill('   Doctor Deploy   ')
    await page.getByRole('button', { name: /^Save$/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 })

    const response = await page.request.get('/api/speaker/me')
    expect((await response.json()).heroName).toBe('Doctor Deploy')
  })

  test('a too-long name cannot be saved from the UI', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: /Change Hero/i }).click()
    await page.locator('.hero-search').fill('a'.repeat(24))

    await expect(page.locator('.hero-error')).toContainText('at most 23')
    await expect(page.getByRole('button', { name: /^Save$/i })).toBeDisabled()
  })

  test('the API rejects an invalid name regardless of the UI', async ({ page }) => {
    await login(page)

    const tooLong = await page.request.put('/api/speaker/hero', {
      data: { heroName: 'a'.repeat(24) },
    })
    expect(tooLong.status()).toBe(400)

    const tooShort = await page.request.put('/api/speaker/hero', { data: { heroName: 'a' } })
    expect(tooShort.status()).toBe(400)

    const blank = await page.request.put('/api/speaker/hero', { data: { heroName: '   ' } })
    expect(blank.status()).toBe(400)

    // The rejected calls must not have changed the stored name.
    const me = await page.request.get('/api/speaker/me')
    expect((await me.json()).heroName).toBe('Doctor Deploy')
  })
})
