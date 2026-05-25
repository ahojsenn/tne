import { test, expect } from '@playwright/test';

test('reset throw statistics', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('tne-console-auth', '1')
  })
  await page.goto('/gameconsole')
  await expect(page.getByRole('button', { name: 'forget all the previous data' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'forget all the previous data' }).click()
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0')
})