import { defineConfig } from '@playwright/test'

// Test-engineer owned configuration for the sdd-workitem-5 acceptance suite.
// It deliberately does not reuse the documentation tree test collection: only the two
// task files are collected, one Chromium worker, no retries, no browser download.
//
// ENVIRONMENT ADAPTATION (round 2, environment only — no assertion, case count, timeout or
// selector semantics are changed by this block):
//   The installed @playwright/test is 1.59.1, whose browsers.json expects chromium revision
//   1217. This machine only has chromium-1234 installed (PM verified), so Playwright aborts
//   with "Executable doesn't exist at .../chromium-1217/..." before any test runs.
//   `npx playwright install chromium` is not available here (the download path was declined),
//   therefore the browser that IS installed is referenced explicitly through
//   use.launchOptions.executablePath. PM already proved this exact binary launches under
//   playwright.chromium.launch({ executablePath }) and returns real page content.
//   Override with PLAYWRIGHT_CHROMIUM_EXECUTABLE when the browser revision changes.
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  || 'C:/Users/HUAWEI/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'

export default defineConfig({
  testDir: '../e2e',
  testMatch: ['sdd-workitem-5.e2e.js', 'sdd-workitem-5.regression.e2e.js'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [['list']],
  outputDir: '../.playwright-cli/_tasks/sdd-workitem-5/playwright-output',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    headless: true,
    // Environment adaptation: point the runner at the chromium revision that actually exists
    // on this machine (see CHROMIUM_EXECUTABLE above). Nothing else about the run changes.
    launchOptions: { executablePath: CHROMIUM_EXECUTABLE },
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20000,
    navigationTimeout: 30000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  }
})
