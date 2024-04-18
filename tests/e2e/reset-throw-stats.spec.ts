import { test, expect } from '@playwright/test';

test('reset throw statistics', async ({ page }) => {
  console.log("tne throw 6 things")
  await page.goto('/throw-statistics')
  await page.locator('body').click()
  await page.getByRole('button', { name: 'forget all the previous data' }).click();
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0');
})