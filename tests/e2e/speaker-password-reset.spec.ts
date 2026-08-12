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

    await expect(page).toHaveURL('/speaker/login?reset=1', { timeout: 10000 })
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
    await expect(page).toHaveURL('/speaker/login?reset=1', { timeout: 10000 })

    // Try to reuse the same token
    await page.goto(`/speaker/reset-password?token=${token}`)
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 })
  })

  test('invalid token shows an error', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/reset-password?token=totally-invalid-token')
    // 20s, matching the sibling test below: this budget covers loading and
    // compiling the page in the dev server before onMounted can even fire the
    // request, which was measured at ~7s cold. The lookup itself takes ~10ms.
    // The old 5s only ever passed because the spreadsheet round-trips in
    // earlier tests gave Vite time to finish compiling in the background.
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 20000 })
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

  test('the reset form stays hidden until the token has been verified', { tag: '@issue-24' }, async ({ page }) => {
    await page.goto('/speaker/reset-password?token=totally-invalid-token')
    // Verifying hits the spreadsheet and takes seconds — during that time the
    // user must see a pending state, never a form that is about to disappear.
    await expect(page.locator('.alert-info')).toBeVisible({ timeout: 5000 })
    await expect(page.getByLabel('New password', { exact: true })).toBeHidden()
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.alert-info')).toBeHidden()
  })
})

test('forgot-password rate-limits repeated requests for the same email @issue-24', async () => {
  // Own email so the counter is independent of the suite above. The dev cap is
  // 8 per 15 min (3 in production) — see forgot-password.post.ts.
  test.setTimeout(90000) // 8 accepted requests, each doing a spreadsheet lookup

  const email = `playwright-ratelimit-${Date.now()}@test.example`
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })

  const statuses: number[] = []
  for (let i = 0; i < 9; i++) {
    const res = await ctx.post('/api/speaker/forgot-password', { data: { email } })
    statuses.push(res.status())
  }
  await ctx.dispose()

  expect(statuses.slice(0, 8)).toEqual(Array(8).fill(200))
  expect(statuses[8]).toBe(429)
})
