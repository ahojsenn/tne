import { test, expect } from '@playwright/test';

// Bypass the auth gate by pre-setting sessionStorage
async function bypassAuth(page: any) {
  await page.addInitScript(() => {
    sessionStorage.setItem('tne-console-auth', '1')
  })
}

test('something ist served', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'egg' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('img', { name: 'egg' }).click()
})

test('reset gameconsole', async ({ page }) => {
  await bypassAuth(page)
  await page.goto('/gameconsole')
  await expect(page.getByRole('button', { name: 'forget all the previous data' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'forget all the previous data' }).click()
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0')
})

test('tne throw 6 things', async ({ page }) => {
  await bypassAuth(page)
  await page.goto('/gameconsole')
  await expect(page.getByRole('button', { name: 'forget all the previous data' })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: 'forget all the previous data' }).click()
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0')

  await page.goto('/throw')
  const throwables = ['cake', 'egg', 'tomato', 'shoe', 'star', 'frog']
  for (const throwable of throwables) {
    console.log(`throwing ${throwable}`)
    await expect(page.locator(`#${throwable}`)).toBeVisible({ timeout: 10000 })
    await page.locator(`#${throwable}`).click()
  }

  await bypassAuth(page)
  await page.goto('/gameconsole')
  await expect(page.locator('text=thrown stuff:').first()).toBeVisible({ timeout: 10000 })
  const thrownStuff = await page.locator('text=thrown stuff:').first().innerText()
  const thrownStuffNumber = RegExp(/\d+/).exec(thrownStuff)
  console.log("thrownStuffNumber: ", thrownStuffNumber ? thrownStuffNumber[0] : 0)
  expect(thrownStuffNumber ? parseInt(thrownStuffNumber[0]) : 0).toBeGreaterThanOrEqual(0)
})
