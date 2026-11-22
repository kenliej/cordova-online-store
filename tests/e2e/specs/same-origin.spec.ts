import { expect, test } from "@playwright/test";
import {
  DEMO,
  addToCartAndCheckout,
  adminAccountsFlow,
  expectNoClientErrors,
  guestCatalogueFlow,
  loginAs,
  logoutAndVerifyGuard,
  watchClientErrors,
  workerOrdersFlow,
} from "./helpers";

/**
 * Docker / nginx deployment shape: SPA and API on one origin, Sanctum session
 * cookie auth (no Bearer tokens in the browser).
 */
test.describe("Docker build — same origin, cookie auth", () => {
  let clientIssues: string[] = [];

  test.beforeEach(async ({ page }) => {
    clientIssues = watchClientErrors(page);
  });

  test.afterEach(async () => {
    expectNoClientErrors(clientIssues);
  });

  test("guest catalogue, product detail and SPA deep links work", async ({ page }) => {
    await guestCatalogueFlow(page);
  });

  test("customer session is cookie-based and survives a reload", async ({ page }) => {
    await loginAs(page, DEMO.customer);

    const stored = await page.evaluate(() => ({
      local: localStorage.getItem("omc.auth.token"),
      session: sessionStorage.getItem("omc.auth.token"),
    }));
    expect(stored.local).toBeNull();
    expect(stored.session).toBeNull();

    await page.reload();
    await expect(page.getByRole("button", { name: /^Logout$/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("customer can add to cart, check out and cancel an order", async ({ page }) => {
    await loginAs(page, DEMO.customer);
    await addToCartAndCheckout(page);
  });

  test("admin can open the dashboard and view private ID scans", async ({ page }) => {
    await loginAs(page, DEMO.admin);
    await adminAccountsFlow(page);
  });

  test("worker can browse the order queue tabs", async ({ page }) => {
    await loginAs(page, DEMO.worker);
    await workerOrdersFlow(page);
  });

  test("logout ends the session and protects customer routes", async ({ page }) => {
    await loginAs(page, DEMO.customer);
    await logoutAndVerifyGuard(page);
  });
});
