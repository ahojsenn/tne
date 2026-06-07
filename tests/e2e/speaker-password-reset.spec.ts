import { test, expect, request as playwrightRequest } from '@playwright/test'

// Run with: npx playwright test --grep @issue-24
// or:       npx playwright test tests/e2e/speaker-password-reset.spec.ts

const TEST_EMAIL = `playwright-reset-${Date.now()}@test.example`
const TEST_NAME = 'Reset Test Speaker'
const ORIGINAL_PASSWORD = 'OriginalPass1!'
const NEW_PASSWORD = 'NewSecurePass2!'

// --- Helpers (mirrors speaker.spec.ts conventions) ---

async function register(page: any) {
  await page.goto('/speaker/register')
  await page.getByLabel('Display name').fill(TEST_NAME)
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(ORIGINAL_PASSWORD)
  await page.getByLabel('Confirm password').fill(ORIGINAL_PASSWORD)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })
}

async function confirmEmail(page: any) {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.get(`/api/speaker/test-confirm-token?email=${encodeURIComponent(TEST_EMAIL)}`)
  expect(res.ok()).toBeTruthy()
  const { confirmToken } = await res.json()
  await ctx.dispose()
  await page.goto(`/speaker/confirm?token=${confirmToken}`)
  await expect(page.locator('.alert-success')).toBeVisible({ timeout: 10000 })
}

async function login(page: any, password = ORIGINAL_PASSWORD) {
  await page.goto('/speaker/login')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/speaker/dashboard', { timeout: 10000 })
}

async function deleteAccount(page: any) {
  await page.getByRole('button', { name: /Delete Account/ }).click()
  await expect(page.locator('.confirm-text')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Yes, delete my account' }).click()
  await expect(page).toHaveURL('/speaker/register', { timeout: 10000 })
}

async function getResetToken(email = TEST_EMAIL): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
  const res = await ctx.get(`/api/speaker/test-reset-token?email=${encodeURIComponent(email)}`)
  expect(res.ok()).toBeTruthy()
  const { resetToken } = await res.json()
  await ctx.dispose()
  return resetToken
}

// --- Setup: register + confirm a speaker account once for this suite ---

test.describe.serial('Password reset flow @issue-24', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await register(page)
    await confirmEmail(page)
    await page.close()
  })

  test.afterAll(async ({ browser }) => {
    // Clean up: login with new password (reset changes it) and delete account
    const page = await browser.newPage()
    await login(page, NEW_PASSWORD)
    await deleteAccount(page)
    await page.close()
  })

  test('login page has a "Forgot password?" link', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/login')
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
  })

  test('"Forgot password?" link navigates to the forgot-password page', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/login')
    await page.getByRole('link', { name: /forgot password/i }).click()
    await expect(page).toHaveURL('/speaker/forgot-password', { timeout: 5000 })
  })

  test('forgot-password page shows an email input and submit button', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/forgot-password')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('submitting a registered email shows a success message', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })
  })

  test('submitting an unknown email also shows success (no user enumeration)', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill('nobody@notreal.example')
    await page.getByRole('button', { name: /send/i }).click()
    // Must show success regardless — never reveal whether email is registered
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })
  })

  test('reset link navigates to reset-password page', { tag: '@issue-24' }, async ({ page }) => {
    // Request a token first
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

    const token = await getResetToken()
    await page.goto(`/speaker/reset-password?token=${token}`)
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel('Confirm new password')).toBeVisible()
  })

  test('valid token + matching passwords resets successfully and redirects to login', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

    const token = await getResetToken()
    await page.goto(`/speaker/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Confirm new password').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /reset/i }).click()

    await expect(page).toHaveURL('/speaker/login', { timeout: 10000 })
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 })
  })

  test('can login with the new password after reset', { tag: '@issue-24' }, async ({ page }) => {
    await login(page, NEW_PASSWORD)
  })

  test('old password no longer works after reset', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/login')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(ORIGINAL_PASSWORD)
    await page.getByRole('button', { name: 'Login' }).click()
    await expect(page.locator('.alert-error')).toContainText('Invalid credentials', { timeout: 5000 })
  })

  test('used reset token cannot be reused', { tag: '@issue-24' }, async ({ page }) => {
    // Token was already consumed in the reset test above
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

    const token = await getResetToken()
    // Use the token once
    await page.goto(`/speaker/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Confirm new password').fill(NEW_PASSWORD)
    await page.getByRole('button', { name: /reset/i }).click()
    await expect(page).toHaveURL('/speaker/login', { timeout: 10000 })

    // Try to reuse the same token
    await page.goto(`/speaker/reset-password?token=${token}`)
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 })
  })

  test('invalid token shows an error', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/reset-password?token=totally-invalid-token')
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 })
  })

  test('mismatched passwords show a validation error', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/forgot-password')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 15000 })

    const token = await getResetToken()
    await page.goto(`/speaker/reset-password?token=${token}`)
    await page.getByLabel('New password', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Confirm new password').fill('DifferentPass9!')
    await page.getByRole('button', { name: /reset/i }).click()
    await expect(page.locator('.field-error, .alert-error')).toBeVisible({ timeout: 5000 })
  })
})
