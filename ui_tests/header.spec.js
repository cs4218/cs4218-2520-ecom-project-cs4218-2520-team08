/* eslint-disable notice/notice */

const { test, expect } = require("@playwright/test");

test.describe("Navigation Header", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.removeItem("cart"));
  });

  test('displays the "Virtual Vault" brand link', async ({ page }) => {
    await page.goto("/");
    const brand = page.getByRole("link", { name: /Virtual Vault/ });
    await expect(brand).toBeVisible();
    await expect(brand).toHaveAttribute("href", "/");
  });

  test("shows Home, Categories, Register, Login, and Cart links for a guest", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Categories" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();
  });

  test('categories dropdown contains an "All Categories" link', async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });
    await expect(
      dropdown.getByRole("link", { name: "All Categories" })
    ).toBeVisible();
  });

  test("categories dropdown lists available categories", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });

    const allLinks = dropdown.locator("a.dropdown-item");
    const totalCount = await allLinks.count();
    expect(totalCount).toBeGreaterThan(1);
  });

  test("clicking a category navigates to that category's product page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });

    const categoryLinks = dropdown.locator("a.dropdown-item").filter({
      hasNotText: "All Categories",
    });
    const firstCategory = categoryLinks.first();
    const categoryName = (await firstCategory.textContent()).trim();
    await firstCategory.click();

    await expect(
      page.getByRole("heading", { name: `Category - ${categoryName}` })
    ).toBeVisible();
  });

  test("cart count shows 0 when cart is empty", async ({ page }) => {
    await page.goto("/");
    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText("0");
  });

  test("cart count updates after adding an item", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".card", { timeout: 10000 });

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText("0");

    await page
      .locator(".card")
      .first()
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    await expect(cartBadge).toHaveText("1");
  });

  test("cart count persists when navigating between pages", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".card", { timeout: 10000 });

    await page
      .locator(".card")
      .first()
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toHaveText("1");

    await page.getByRole("link", { name: "Home" }).click();
    await page.waitForSelector(".card", { timeout: 10000 });

    await expect(cartBadge).toHaveText("1");
  });

  test("search bar is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("searchbox", { name: "Search" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Search" })
    ).toBeVisible();
  });

  test("clicking Cart navigates to the cart page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Cart" }).click();
    expect(page.url()).toContain("/cart");
  });

  test("clicking Home navigates to the homepage", async ({ page }) => {
    await page.goto("/cart");
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
