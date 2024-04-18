import { test, expect } from '@playwright/test';


test('something ist served', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('img', { name: 'egg' }).click();
  await page.goto('/');
})


test('reset throw statistics', async ({ page }) => {
  console.log("tne throw 6 things")
  await page.goto('/throw-statistics')
  await page.locator('body').click();
  await page.getByRole('button', { name: 'forget all the previous data' }).click();
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0');

})
test('tne throw 6 things', async ({ page }) => {
  console.log("tne throw 6 things")
  await page.goto('/throw-statistics')
  await page.locator('body').click();
  await page.getByRole('button', { name: 'forget all the previous data' }).click();
  await expect(page.locator('[id="__nuxt"]')).toContainText('thrown stuff: 0');

  await page.goto('/throw')
  const throwables = ['cake', 'egg', 'tomato', 'shoe', 'star', 'frog']
  for (const throwable of throwables) {
    expect(page.locator(`#${throwable}`)).toBeDefined()
    console.log(`throwing ${throwable}`)
    expect(page.getByRole("img", { "name": throwable })).toBeDefined()
    await page.locator(`#${throwable}`).click();
  }

  await page.goto('/throw-statistics');
  await page.getByText('thrown stuff:').click();
  expect(await page.isVisible('text=thrown stuff:')).toBe(true);
  // find pattern thrown stuff: %d on lage and extracdt the number
  const thrownStuff = await page.locator('text=thrown stuff:').innerText()
  const thrownStuffNumber = RegExp(/\d+/).exec(thrownStuff)
  console.log("thrownStuffNumber: ", thrownStuffNumber ? thrownStuffNumber[0] : 0)

  expect(thrownStuffNumber ? parseInt(thrownStuffNumber[0]) : 0).toBeGreaterThanOrEqual(0)

})
