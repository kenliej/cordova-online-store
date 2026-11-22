import { expect, test } from "@playwright/test";
import {
  DEMO,
  expectNoClientErrors,
  guestCatalogueFlow,
  loginAs,
  watchClientErrors,
} from "./helpers";

/**
 * Local development mode: Vite dev server (http://127.0.0.1:5173) proxying
 * /api → VITE_PROXY_TARGET (normally the Docker nginx backend on :8080 or
 * `php artisan serve` on :8000). This is the "backend in Docker, frontend
 * locally" workflow — cookie auth, single browser origin.
 *
 * Start the pieces first (see docs/TESTING-BOTH-BUILDS.md), then:
 *   npx playwright test --project=vite-dev
 */
test.describe("Local Vite dev + proxied backend", () => {
  let clientIssues: string[] = [];

  test.beforeEach(async ({ page }) => {
    clientIssues = watchClientErrors(page);
  });

  test.afterEach(async () => {
    expectNoClientErrors(clientIssues);
  });

  test("guest catalogue loads through the dev proxy", async ({ page }) => {
    await guestCatalogueFlow(page);
  });

  test("customer can log in and use the cart through the dev proxy", async ({ page }) => {
    await loginAs(page, DEMO.customer);

    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).not.toMatch(/omc\.auth\.token/);

    await page.goto("/products");
    await expect(page.getByText(/Showing Results/i)).toBeVisible({ timeout: 25_000 });

    const addButton = page.locator('button:has-text("Add to Cart"):not([disabled])').first();
    await expect(addButton).toBeVisible({ timeout: 25_000 });
    await addButton.click();
    await expect(page.getByText(/Added .*to cart/i)).toBeVisible({ timeout: 10_000 });

    await page.goto("/cart");
    await expect(page.getByText(/Select All/i)).toBeVisible({ timeout: 20_000 });
  });
});
