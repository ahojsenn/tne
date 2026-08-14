import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 * // require('dotenv').config();
 */

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* One worker everywhere: the specs share a single dev server that compiles on
   * demand, and under three workers it stops accepting connections — tests then
   * fail with ERR_CONNECTION_REFUSED, noise that looks exactly like a real
   * regression. (The Google Sheets round-trips that used to compound this are
   * gone; see webServer.env below. Raising this may now be feasible, but it
   * needs to be tried on its own rather than assumed.) */
  workers: 1,
  /* Playwright's default is 5s, which is not enough here: the dev server
   * compiles routes on demand, and a first visit to a page was measured at
   * ~7s before its onMounted request even fires. Assertions that waited on
   * something behind a cold page load therefore failed intermittently — noise
   * that reads as a regression. This only affects how long a failing
   * expectation waits; passing ones are unaffected. */
  expect: { timeout: 10000 },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    // Firefox and WebKit require `npx playwright install` — uncomment to enable:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Server is started by the test script (scripts/test.sh) */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    /* Off, so the suite can never silently attach to a dev server someone
     * started by hand — that server would talk to the real dev spreadsheet
     * and reintroduce exactly the coupling this backend removes. */
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      /* The whole suite runs against an in-memory sheet backend. See
       * server/utils/sheetsMemory.ts — the specs used to register, confirm and
       * delete real accounts in one shared dev spreadsheet, which made them
       * slow and intermittently red under cumulative API pressure. */
      SHEETS_BACKEND: 'memory',
      /* Sessions need a secret to sign cookies. With the sheet backend gone,
       * this was the last thing standing between the suite and running with no
       * credentials at all — so fall back to a fixed test value. A real secret
       * is still used when one is provided. */
      SESSION_SECRET: process.env.SESSION_SECRET ?? 'playwright-e2e-session-secret-not-for-production',
      /* The gameconsole password gate. verify.post.ts prefers this over the
       * adminPasswd in the config sheet, so the console is reachable in tests
       * without any spreadsheet. */
      ADMIN_PASSWORD: 'playwright-console',
    },
  },
});
