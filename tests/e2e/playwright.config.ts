import { defineConfig } from "@playwright/test";

/**
 * Browser E2E tests for the two deployment shapes:
 *
 *   docker-same-origin  -> http://127.0.0.1:8080 (built SPA + proxied API, cookie auth)
 *   cpanel-split        -> http://127.0.0.1:8091 (static SPA + cPanel-style API, token auth)
 *
 * Both URLs can be overridden for deployed environments:
 *   E2E_SAME_ORIGIN_URL=https://your-docker-host npx playwright test --project=docker-same-origin
 *   E2E_SPLIT_ORIGIN_URL=https://your-vercel-app  npx playwright test --project=cpanel-split
 *
 * Browser selection: system Chrome by default (no download needed locally).
 * For CI, run `npx playwright install chromium` and set PLAYWRIGHT_CHANNEL=bundled.
 */
const sameOriginURL = process.env.E2E_SAME_ORIGIN_URL || "http://127.0.0.1:8080";
const splitOriginURL = process.env.E2E_SPLIT_ORIGIN_URL || "http://127.0.0.1:8091";

const channel = process.env.PLAYWRIGHT_CHANNEL ?? "chrome";
const browserOptions = channel === "bundled" ? {} : { channel };

export default defineConfig({
  testDir: "./specs",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  outputDir: "../../test-results/artifacts",
  use: {
    ...browserOptions,
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "docker-same-origin",
      testMatch: /same-origin\.spec\.ts/,
      use: { baseURL: sameOriginURL },
    },
    {
      name: "cpanel-split",
      testMatch: /split-origin\.spec\.ts/,
      use: { baseURL: splitOriginURL },
    },
  ],
});
