/* eslint-disable notice/notice */

const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3000";

async function navigateToAnyProductDetail(page) {
  await page.goto("/");
  await page.waitForSelector(".card", { timeout: 10000 });
  const firstMoreDetails = page
    .locator(".card")
    .first()
    .getByRole("button", { name: "More Details" });
  await firstMoreDetails.click();
  await page.waitForSelector(".product-details", { timeout: 10000 });
}

test.describe("Product Detail Page", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.removeItem("cart"));
  });

  test('displays "Product Details" heading', async ({ page }) => {
    await navigateToAnyProductDetail(page);
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
  });

  test("displays product name, description, price, and category", async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    const infoSection = page.locator(".product-details-info");
    const fields = infoSection.getByRole("heading", { level: 6 });

    await expect(fields).toHaveCount(4);

    const texts = await fields.allTextContents();
    expect(texts.some((t) => t.startsWith("Name"))).toBeTruthy();
    expect(texts.some((t) => t.startsWith("Description"))).toBeTruthy();
    expect(texts.some((t) => t.startsWith("Price"))).toBeTruthy();
    expect(texts.some((t) => t.startsWith("Category"))).toBeTruthy();
  });

  test("price is displayed in USD currency format", async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const priceField = page
      .locator(".product-details-info")
      .getByRole("heading", { level: 6 })
      .filter({ hasText: "Price" });
    const priceText = await priceField.textContent();
    expect(priceText).toMatch(/\$[\d,]+\.\d{2}/);
  });

  test("displays product image", async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const productImage = page.locator(".product-details img.card-img-top");
    await expect(productImage).toBeVisible();
    const alt = await productImage.getAttribute("alt");
    expect(alt).toBeTruthy();
  });

  test('displays "ADD TO CART" button', async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const addToCartBtn = page
      .locator(".product-details-info")
      .getByRole("button", { name: "ADD TO CART" });
    await expect(addToCartBtn).toBeVisible();
  });

  test('clicking "ADD TO CART" increases the cart count', async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toBeVisible();
    const initialText = await cartBadge.textContent();
    const initialCount = parseInt(initialText) || 0;

    await page
      .locator(".product-details-info")
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    await expect(cartBadge).toHaveText(String(initialCount + 1));
  });

  test('clicking "ADD TO CART" shows a confirmation message', async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    await page
      .locator(".product-details-info")
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    await expect(page.getByText("Item Added to cart")).toBeVisible();
  });

  test('displays a "Similar Products" section', async ({ page }) => {
    await navigateToAnyProductDetail(page);
    await expect(
      page.getByRole("heading", { name: /Similar Products/ })
    ).toBeVisible();
  });

  test("at most 3 similar products are shown", async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const similarSection = page.locator(".similar-products");
    const cards = similarSection.locator(".card");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count).toBeLessThanOrEqual(3);
  });

  test("similar product cards show a name, price, and truncated description", async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    const similarSection = page.locator(".similar-products");
    await page.waitForTimeout(2000);
    const cards = similarSection.locator(".card");
    const count = await cards.count();

    if (count === 0) {
      await expect(page.getByText("No Similar Products found")).toBeVisible();
      return;
    }

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const name = card.locator(".card-title").first();
      await expect(name).toBeVisible();
      const nameText = await name.textContent();
      expect(nameText.length).toBeGreaterThan(0);

      const price = card.locator(".card-price");
      await expect(price).toBeVisible();

      const desc = card.locator(".card-text");
      const descText = await desc.textContent();
      expect(descText).toContain("...");
    }
  });

  test("similar product cards show price in USD format", async ({ page }) => {
    await navigateToAnyProductDetail(page);
    const similarSection = page.locator(".similar-products");
    const cards = similarSection.locator(".card");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const priceText = await cards
        .nth(i)
        .locator(".card-price")
        .textContent();
      expect(priceText).toMatch(/\$[\d,]+\.\d{2}/);
    }
  });

  test('similar product cards have "More Details" and "ADD TO CART" buttons', async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    const similarSection = page.locator(".similar-products");
    const cards = similarSection.locator(".card");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(
        card.getByRole("button", { name: "More Details" })
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: "ADD TO CART" })
      ).toBeVisible();
    }
  });

  test('clicking "More Details" on a similar product navigates to that product\'s page', async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    const originalUrl = page.url();
    const similarSection = page.locator(".similar-products");
    const cards = similarSection.locator(".card");
    const count = await cards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await cards.first().getByRole("button", { name: "More Details" }).click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    expect(page.url()).not.toBe(originalUrl);
    expect(page.url()).toContain("/product/");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
  });

  test('clicking "ADD TO CART" on a similar product increases the cart count', async ({
    page,
  }) => {
    await navigateToAnyProductDetail(page);
    const similarSection = page.locator(".similar-products");
    const cards = similarSection.locator(".card");
    const count = await cards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toBeVisible();
    const initialText = await cartBadge.textContent();
    const initialCount = parseInt(initialText) || 0;

    await cards.first().getByRole("button", { name: "ADD TO CART" }).click();

    await expect(cartBadge).toHaveText(String(initialCount + 1));
  });

  test('page title is "Ecommerce app - shop now"', async ({ page }) => {
    await navigateToAnyProductDetail(page);
    await expect(page).toHaveTitle("Ecommerce app - shop now");
  });
});
