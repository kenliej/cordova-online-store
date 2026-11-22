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
 * cPanel + Vercel deployment shape: the SPA is served from its own origin and
 * the API lives under /omc-backend on a different origin, so the client uses
 * Bearer tokens (POST /auth/token) and CORS.
 */
test.describe("cPanel build — split origin, Bearer tokens", () => {
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

  test("login stores a Bearer token, sends Authorization and survives reload", async ({ page }) => {
    await loginAs(page, DEMO.customer);

    const storedToken = await page.evaluate(
      () => localStorage.getItem("omc.auth.token") ?? sessionStorage.getItem("omc.auth.token"),
    );
    expect(storedToken, "the Bearer token should be persisted client-side").toBeTruthy();

    // Cross-origin token auth must not rely on cookies.
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).not.toMatch(/laravel_session|XSRF-TOKEN/);

    // On reload the app bootstraps the session with Authorization: Bearer ...
    const meRequest = page.waitForRequest(
      (request) => request.url().includes("/api/auth/me") && Boolean(request.headers()["authorization"]),
      { timeout: 25_000 },
    );
    await page.reload();
    const captured = await meRequest;
    expect(captured.headers()["authorization"]).toMatch(/^Bearer /);

    await expect(page.getByRole("button", { name: /^Logout$/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("customer can add to cart, check out and cancel an order over CORS", async ({ page }) => {
    await loginAs(page, DEMO.customer);
    await addToCartAndCheckout(page);
  });

  test("admin can view private ID scans with the Bearer token", async ({ page }) => {
    await loginAs(page, DEMO.admin);
    await adminAccountsFlow(page);
  });

  test("worker can browse the order queue tabs", async ({ page }) => {
    await loginAs(page, DEMO.worker);
    await workerOrdersFlow(page);
  });

  test("logout revokes/clears the token and protects customer routes", async ({ page }) => {
    await loginAs(page, DEMO.customer);
    await logoutAndVerifyGuard(page);

    const storedToken = await page.evaluate(
      () => localStorage.getItem("omc.auth.token") ?? sessionStorage.getItem("omc.auth.token"),
    );
    expect(storedToken).toBeNull();
  });
});
