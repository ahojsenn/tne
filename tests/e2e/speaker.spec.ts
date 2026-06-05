import { test, expect, request as playwrightRequest } from '@playwright/test'

const TEST_EMAIL = `playwright-${Date.now()}@test.example`
const TEST_NAME = 'Playwright Speaker'
const TEST_PASSWORD = 'TestPass123!'

async function register(page: any, email = TEST_EMAIL) {
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill(TEST_NAME)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
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
  await expect(page.locator('.welcome')).toContainText(TEST_NAME)
}

async function deleteAccount(page: any) {
  await page.getByRole('button', { name: /Delete Account/ }).click()
  await expect(page.locator('.confirm-text')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Yes, delete my account' }).click()
  await expect(page).toHaveURL('/speaker/register', { timeout: 10000 })
}

// Run serially — tests share the same test email
test.describe.serial('Speaker auth flow', () => {
  test('register and confirm email', async ({ page }) => {
    await register(page)
    await confirmEmail(page)
    await expect(page.locator('a[href="/speaker/login"]')).toBeVisible()
  })

  test('login shows dashboard', async ({ page }) => {
    await login(page)
  })

  test('logout redirects to login and blocks dashboard access', async ({ page }) => {
    await login(page)
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL('/speaker/login', { timeout: 10000 })

    await page.goto('/speaker/dashboard')
    await expect(page).toHaveURL('/speaker/login', { timeout: 10000 })
  })

  test('cannot login with wrong password', async ({ page }) => {
    await page.goto('/speaker/login')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('.alert-error')).toContainText('Invalid credentials', { timeout: 5000 })
  })

  test('delete account and re-register with same email', async ({ page }) => {
    await login(page)
    await deleteAccount(page)

    // Same email can register again
    await register(page)
    await confirmEmail(page)

    // Cleanup
    await login(page)
    await deleteAccount(page)
  })
})

test('cannot login with unconfirmed account', async ({ page }) => {
  const email = `playwright-unconfirmed-${Date.now()}@test.example`
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill('Unconfirmed User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByLabel('Confirm password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

  await page.goto('/speaker/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page.locator('.alert-error')).toContainText('Invalid credentials', { timeout: 5000 })

  // Cleanup: confirm and delete
  await confirmEmail(page, email)
  await login(page, email)
  await deleteAccount(page)
})
