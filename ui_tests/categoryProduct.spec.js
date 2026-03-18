/* eslint-disable notice/notice */

const { test, expect } = require("@playwright/test");

async function navigateToAnyCategory(page) {
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
  await page.waitForSelector(".category", { timeout: 10000 });
  await page.locator(".category .card").first().waitFor({ timeout: 10000 });
  return categoryName;
}

test.describe("Category Product Page", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => localStorage.removeItem("cart"));
  });

  test("displays the category name as a heading", async ({ page }) => {
    const categoryName = await navigateToAnyCategory(page);
    await expect(
      page.getByRole("heading", { name: `Category - ${categoryName}` })
    ).toBeVisible();
  });

  test("displays a result count", async ({ page }) => {
    await navigateToAnyCategory(page);
    const resultHeading = page.getByRole("heading", { level: 6 });
    const text = await resultHeading.textContent();
    expect(text).toMatch(/\d+ results? found/);
  });

  test("result count uses correct grammar", async ({ page }) => {
    await navigateToAnyCategory(page);
    const resultHeading = page.getByRole("heading", { level: 6 });
    const text = await resultHeading.textContent();
    const match = text.match(/(\d+) (results?) found/);
    expect(match).toBeTruthy();
    const count = parseInt(match[1]);
    if (count === 1) {
      expect(match[2]).toBe("result");
    } else {
      expect(match[2]).toBe("results");
    }
  });

  test("displays at least one product card", async ({ page }) => {
    await navigateToAnyCategory(page);
    const cards = page.locator(".category .card");
    await expect(cards.first()).toBeVisible();
  });

  test("product cards show a name, price, and truncated description", async ({
    page,
  }) => {
    await navigateToAnyCategory(page);
    const cards = page.locator(".category .card");
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

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

  test("product card prices are in USD format", async ({ page }) => {
    await navigateToAnyCategory(page);
    const cards = page.locator(".category .card");
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const priceText = await cards
        .nth(i)
        .locator(".card-price")
        .textContent();
      expect(priceText).toMatch(/\$[\d,]+\.\d{2}/);
    }
  });

  test('product cards have "More Details" and "ADD TO CART" buttons', async ({
    page,
  }) => {
    await navigateToAnyCategory(page);
    const cards = page.locator(".category .card");
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

  test("at most 6 product cards are shown initially", async ({ page }) => {
    await navigateToAnyCategory(page);
    const cards = page.locator(".category .card");
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(6);
  });

  test('"Load more" button appears when there are more than 6 products', async ({
    page,
  }) => {
    await navigateToAnyCategory(page);
    const resultHeading = page.getByRole("heading", { level: 6 });
    const text = await resultHeading.textContent();
    const match = text.match(/(\d+)/);
    const totalProducts = parseInt(match[1]);

    const loadMoreBtn = page.getByRole("button", { name: /Load more/i });
    if (totalProducts > 6) {
      await expect(loadMoreBtn).toBeVisible();
    } else {
      await expect(loadMoreBtn).not.toBeVisible();
    }
  });

  test('clicking "Load more" reveals additional products', async ({
    page,
  }) => {
    await navigateToAnyCategory(page);

    const loadMoreBtn = page.getByRole("button", { name: /Load more/i });
    const isVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    const cardsBefore = await page.locator(".category .card").count();
    await loadMoreBtn.click();
    await page.waitForTimeout(1000);
    const cardsAfter = await page.locator(".category .card").count();
    expect(cardsAfter).toBeGreaterThan(cardsBefore);
  });

  test('clicking "More Details" navigates to a product detail page', async ({
    page,
  }) => {
    await navigateToAnyCategory(page);
    const firstCard = page.locator(".category .card").first();
    await firstCard.getByRole("button", { name: "More Details" }).click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    expect(page.url()).toContain("/product/");
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
  });

  test('clicking "ADD TO CART" increases the cart count and shows a confirmation', async ({
    page,
  }) => {
    await navigateToAnyCategory(page);

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toBeVisible();
    const initialText = await cartBadge.textContent();
    const initialCount = parseInt(initialText) || 0;

    const firstCard = page.locator(".category .card").first();
    await firstCard.getByRole("button", { name: "ADD TO CART" }).click();

    await expect(cartBadge).toHaveText(String(initialCount + 1));
    await expect(page.getByText("Item Added to cart")).toBeVisible();
  });
});
