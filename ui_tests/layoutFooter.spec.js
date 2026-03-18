/* eslint-disable notice/notice */

const { test, expect } = require("@playwright/test");

test.describe("Page Layout and Footer", () => {
  test("every page has a navigation bar, content area, and footer", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".footer")).toBeVisible();
  });

  test("product detail page has the default page title", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".card", { timeout: 10000 });
    await page
      .locator(".card")
      .first()
      .getByRole("button", { name: "More Details" })
      .click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    await expect(page).toHaveTitle("Ecommerce app - shop now");
  });

  test('"All Categories" page has a custom page title', async ({ page }) => {
    await page.goto("/categories");
    await expect(page).toHaveTitle("All Categories");
  });

  test("footer displays copyright text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("All Rights Reserved © TestingComp")
    ).toBeVisible();
  });

  test('footer "About" link navigates to the About page', async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(".footer").getByRole("link", { name: "About" }).click();
    expect(page.url()).toContain("/about");
  });

  test('footer "Contact" link navigates to the Contact page', async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator(".footer")
      .getByRole("link", { name: "Contact" })
      .click();
    expect(page.url()).toContain("/contact");
  });

  test('footer "Privacy Policy" link navigates to the Privacy Policy page', async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator(".footer")
      .getByRole("link", { name: "Privacy Policy" })
      .click();
    expect(page.url()).toContain("/policy");
  });
});
