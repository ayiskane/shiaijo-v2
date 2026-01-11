import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Renbu|Shiaijo/i);
});

test("admin shell renders", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.getByText(/Dashboard/i)).toBeVisible();
});
