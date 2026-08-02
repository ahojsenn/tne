import { test, expect, request as playwrightRequest } from '@playwright/test'

/**
 * Guards the promise the rest of the suite relies on: walking register →
 * confirm → password reset → delete against a dev server hands nothing to SMTP,
 * even though both mail-sending flows are exercised. The counter is per server
 * process, so the assertion holds regardless of when this test runs.
 */
test('dev server delivers no mail while register/reset/delete run', async () => {
  test.setTimeout(60000) // every step is a spreadsheet round-trip

  const email = `playwright-nomail-${Date.now()}@test.example`
  const password = 'TestPass123!'
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })

  const before = await ctx.get('/api/speaker/test-mail-stats')
  expect(before.ok()).toBeTruthy()
  const { devSendEnabled } = await before.json()
  test.skip(devSendEnabled, 'MAIL_DEV_SEND=1 — this server is deliberately delivering')

  // Registration: sends the confirmation mail.
  const registered = await ctx.post('/api/speaker/register', {
    data: { email, displayName: 'No Mail Speaker', password, confirmPassword: password },
  })
  expect(registered.ok()).toBeTruthy()

  // The link is still available to tests even though nothing was delivered.
  const tokenRes = await ctx.get(`/api/speaker/test-confirm-token?email=${encodeURIComponent(email)}`)
  expect(tokenRes.ok()).toBeTruthy()
  const { confirmToken } = await tokenRes.json()
  expect((await ctx.get(`/api/speaker/confirm?token=${confirmToken}`)).ok()).toBeTruthy()

  // Password reset: only active accounts get a mail, hence the confirm above.
  expect((await ctx.post('/api/speaker/forgot-password', { data: { email } })).ok()).toBeTruthy()
  const resetRes = await ctx.get(`/api/speaker/test-reset-token?email=${encodeURIComponent(email)}`)
  expect(resetRes.ok()).toBeTruthy()

  const after = await ctx.get('/api/speaker/test-mail-stats')
  expect((await after.json()).delivered).toBe(0)

  // Cleanup: leave no row behind, like the other specs.
  expect((await ctx.post('/api/speaker/login', { data: { email, password } })).ok()).toBeTruthy()
  expect((await ctx.post('/api/speaker/delete')).ok()).toBeTruthy()
  await ctx.dispose()
})
