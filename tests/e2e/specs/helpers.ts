import { expect, type Page } from "@playwright/test";

export const DEMO = {
  customer: {
    email: "customer@onlinemall.test",
    password: "Customer#2026Secure",
    home: "/",
  },
  worker: {
    email: "worker@onlinemall.test",
    password: "Worker#2026Secure",
    home: "/worker/orders",
  },
  admin: {
    email: "admin@onlinemall.test",
    password: "Admin#2026Secure",
    home: "/admin/accounts",
  },
} as const;

type DemoUser = (typeof DEMO)[keyof typeof DEMO];

/**
 * Collects client-side failures that matter for a deployment:
 *  - uncaught JS exceptions (pageerror)
 *  - CORS / mixed-content console errors (these are exactly the failure modes
 *    that appear when a split deployment is misconfigured)
 * Resource-loading noise (remote images, favicons) is ignored on purpose.
 */
export function watchClientErrors(page: Page): string[] {
  const issues: string[] = [];

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/CORS|Access-Control|Mixed Content|blocked by CORS policy/i.test(text)) {
      issues.push(`console: ${text}`);
    }
  });

  return issues;
}

export function expectNoClientErrors(issues: string[]): void {
  expect(issues, `client errors detected:\n${issues.join("\n")}`).toEqual([]);
}

export async function loginAs(page: Page, user: DemoUser): Promise<void> {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
  await page.getByPlaceholder("Email or Phone Number").fill(user.email);
  await page.getByPlaceholder("Password").fill(user.password);
  await page.getByRole("button", { name: /^Log In$/i }).click();

  await page.waitForURL(
    (url) => url.pathname === user.home || url.pathname === `${user.home}/`,
    { timeout: 30_000 },
  );
  await expect(page.getByRole("button", { name: /^Logout$/i }).first()).toBeVisible({
    timeout: 20_000,
  });
}

/** Guest catalogue: API-driven grid + detail page + direct deep link. */
export async function guestCatalogueFlow(page: Page): Promise<void> {
  await page.goto("/guest/products");
  await expect(page.getByText(/Showing Results/i)).toBeVisible({ timeout: 25_000 });

  const firstViewProduct = page.getByRole("button", { name: /View Product/i }).first();
  await expect(firstViewProduct).toBeVisible({ timeout: 25_000 });
  await firstViewProduct.click();

  await expect(page).toHaveURL(/\/guest\/products\/[^/]+$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /Add to Cart/i }).first()).toBeVisible({
    timeout: 20_000,
  });

  // Deep link: a full page load on the product URL must work too (SPA fallback).
  const productUrl = page.url();
  await page.goto(productUrl);
  await expect(page.getByRole("button", { name: /Add to Cart/i }).first()).toBeVisible({
    timeout: 20_000,
  });
}

/** Customer: add an in-stock item to the cart, check out, then cancel. */
export async function addToCartAndCheckout(page: Page): Promise<void> {
  await page.goto("/products");
  await expect(page.getByText(/Showing Results/i)).toBeVisible({ timeout: 25_000 });

  const addButton = page.locator('button:has-text("Add to Cart"):not([disabled])').first();
  await expect(addButton).toBeVisible({ timeout: 25_000 });
  await addButton.click();
  await expect(page.getByText(/Added .*to cart/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/cart");
  await expect(page.getByText(/Select All/i)).toBeVisible({ timeout: 20_000 });
  const checkout = page.getByRole("button", { name: /Check out/i });
  await expect(checkout).toBeVisible({ timeout: 20_000 });

  await checkout.click();
  // Cart switches to the Orders tab after a successful checkout.
  await expect(page.getByText(/Active Orders/i)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText(/Order #/i).first()).toBeVisible({ timeout: 25_000 });

  const cancel = page.getByRole("button", { name: /Cancel Order/i }).first();
  await expect(cancel).toBeVisible({ timeout: 20_000 });
  await cancel.click();
  await expect(page.getByText(/has been cancelled/i)).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /History/i }).first().click();
  await expect(page.getByText(/Order History/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Order #/i).first()).toBeVisible({ timeout: 20_000 });
}

/** Admin: dashboard loads and the private ID scans render from authenticated blobs. */
export async function adminAccountsFlow(page: Page): Promise<void> {
  await page.goto("/admin/accounts");
  await expect(page.getByRole("heading", { name: /Accounts Center/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: /Pending Accounts/i })).toBeVisible({
    timeout: 20_000,
  });

  const viewId = page.getByRole("button", { name: /^View ID$/i }).first();
  await expect(viewId).toBeVisible({ timeout: 25_000 });
  await viewId.click();

  const dialog = page.getByRole("dialog", { name: /Verification IDs/i });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  // The scan is fetched through the API client (cookie or Bearer) and rendered
  // from a blob: URL — an <img src> to the protected route would 401.
  await expect(dialog.locator('img[src^="blob:"]').first()).toBeVisible({ timeout: 25_000 });

  await page.getByRole("button", { name: /Close/i }).last().click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: /Customer Accounts/i }).click();
  await expect(page.getByText(/Customer ID:/i).first()).toBeVisible({ timeout: 25_000 });
}

/** Worker: order queue loads for every status tab. */
export async function workerOrdersFlow(page: Page): Promise<void> {
  await page.goto("/worker/orders");
  await expect(page.getByRole("heading", { name: /Orders Center/i })).toBeVisible({
    timeout: 20_000,
  });

  await expect(page.locator("text=/Order #|No pending orders/i").first()).toBeVisible({
    timeout: 25_000,
  });

  await page.getByRole("button", { name: /^Ready/i }).first().click();
  await expect(page.locator("text=/Order #|No ready orders/i").first()).toBeVisible({
    timeout: 25_000,
  });

  await page.getByRole("button", { name: /^Claimed/i }).first().click();
  await expect(page.locator("text=/Order #|No claimed orders/i").first()).toBeVisible({
    timeout: 25_000,
  });
}

/** Logout from the header; protected routes must bounce to /login afterwards. */
export async function logoutAndVerifyGuard(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Logout$/i }).first().click();
  await page.waitForURL(/\/login$/, { timeout: 20_000 });

  await page.goto("/profile");
  await page.waitForURL(/\/login$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: /^Log In$/i })).toBeVisible();
}
