// Keagan Pang, A0258729L
const { test, expect } = require("@playwright/test");

test.describe("Product Discovery and Cross-Page Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart"));
  });

  test("Homepage -> Product Details -> Similar Products -> Navigate", async ({
    page,
  }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const firstCard = page.locator(".home-page .card").first();
    await firstCard.getByRole("button", { name: "More Details" }).click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();

    const detailFields = page.locator(".product-details-info h6");
    await expect(detailFields.filter({ hasText: /^Name/ })).toBeVisible();
    await expect(
      detailFields.filter({ hasText: /^Description/ })
    ).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Price/ })).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Category/ })).toBeVisible();

    const priceText = await detailFields
      .filter({ hasText: /^Price/ })
      .textContent();
    expect(priceText).toMatch(/\$[\d,]+\.\d{2}/);

    await expect(
      page.getByRole("heading", { name: /Similar Products/ })
    ).toBeVisible();

    const similarCards = page.locator(".similar-products .card");
    const similarCount = await similarCards.count();

    if (similarCount > 0) {
      const originalUrl = page.url();

      await similarCards
        .first()
        .getByRole("button", { name: "More Details" })
        .click();

      await page.waitForURL((url) => url.toString() !== originalUrl, {
        timeout: 10000,
      });
      await page.waitForSelector(".product-details-info h6", {
        timeout: 10000,
      });
      await page.waitForTimeout(500);

      expect(page.url()).not.toBe(originalUrl);
      await expect(
        page.getByRole("heading", { name: "Product Details" })
      ).toBeVisible();
      await expect(
        detailFields.filter({ hasText: /^Name/ })
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("No Similar Products found")
      ).toBeVisible();
    }
  });

  test("Category Dropdown -> Category Page -> Product Details -> Cart", async ({
    page,
  }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });

    const categoryLinks = dropdown
      .locator("a.dropdown-item")
      .filter({ hasNotText: "All Categories" });
    const categoryCount = await categoryLinks.count();
    expect(categoryCount).toBeGreaterThan(0);

    const chosenCategoryName = (
      await categoryLinks.first().textContent()
    ).trim();
    await categoryLinks.first().click();

    await page.locator(".category .card").first().waitFor({ timeout: 10000 });
    await expect(
      page.getByRole("heading", {
        level: 4,
        name: `Category - ${chosenCategoryName}`,
      })
    ).toBeVisible();
    const resultText = await page
      .getByRole("heading", { level: 6 })
      .textContent();
    expect(resultText).toMatch(/\d+ results? found/);

    const firstCatCard = page.locator(".category .card").first();
    await firstCatCard.getByRole("button", { name: "More Details" }).click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    const nameLocator = page
      .locator(".product-details-info h6")
      .filter({ hasText: /^Name/ });
    await expect(nameLocator).toHaveText(/^Name\s*:\s*\S+/, {
      timeout: 10000,
    });
    const productNameField = await nameLocator.textContent();
    const productName = productNameField.replace(/^Name\s*:\s*/, "").trim();

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toHaveText("0");

    await page
      .locator(".product-details-info")
      .getByRole("button", { name: "ADD TO CART" })
      .click();
    await expect(cartBadge).toHaveText("1");

    await page.getByRole("link", { name: "Cart" }).click();
    await page.waitForSelector(".cart-page", { timeout: 10000 });

    await expect(
      page.locator(".cart-page").getByText(productName, { exact: true })
    ).toBeVisible();
  });

  test("Homepage Category Filter -> Product Details", async ({ page }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const initialCount = await page.locator(".home-page .card").count();

    const firstCheckbox = page.locator(".filters .ant-checkbox-input").first();
    const checkboxLabel = await page
      .locator(".filters .ant-checkbox-wrapper")
      .first()
      .textContent();
    const categoryName = checkboxLabel.trim();

    await firstCheckbox.check();

    await page.waitForFunction(
      (prevCount) => {
        const cards = document.querySelectorAll(".home-page .card");
        return cards.length > 0 && cards.length !== prevCount;
      },
      initialCount,
      { timeout: 10000 }
    );

    const firstFilteredCard = page.locator(".home-page .card").first();
    await firstFilteredCard
      .getByRole("button", { name: "More Details" })
      .click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    const categoryLocator = page
      .locator(".product-details-info h6")
      .filter({ hasText: /^Category/ });
    await expect(categoryLocator).toHaveText(/^Category\s*:\s*\S+/, {
      timeout: 10000,
    });
    const categoryField = await categoryLocator.textContent();
    const displayedCategory = categoryField
      .replace(/^Category\s*:\s*/, "")
      .trim();
    expect(displayedCategory).toBe(categoryName);
  });

  test("Homepage Price Filter -> Verify Filtered Products", async ({
    page,
  }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const initialCount = await page.locator(".home-page .card").count();

    const firstPriceRadio = page.locator(".filters .ant-radio-input").first();
    const firstPriceLabel = await page
      .locator(".filters .ant-radio-wrapper")
      .first()
      .textContent();

    const rangeMatch = firstPriceLabel.match(/\$(\d+)\s*to\s*(\d+)/);
    let minPrice, maxPrice;
    if (rangeMatch) {
      minPrice = parseInt(rangeMatch[1]);
      maxPrice = parseInt(rangeMatch[2]);
    } else if (firstPriceLabel.includes("or more")) {
      const moreMatch = firstPriceLabel.match(/\$(\d+)/);
      minPrice = parseInt(moreMatch[1]);
      maxPrice = Infinity;
    }

    await firstPriceRadio.check();

    await page.waitForFunction(
      (prevCount) => {
        const cards = document.querySelectorAll(".home-page .card");
        return cards.length > 0 && cards.length !== prevCount;
      },
      initialCount,
      { timeout: 10000 }
    );

    const priceHeadings = page.locator(".home-page .card .card-price");
    const priceCount = await priceHeadings.count();
    expect(priceCount).toBeGreaterThan(0);

    for (let i = 0; i < priceCount; i++) {
      const priceText = await priceHeadings.nth(i).textContent();
      const numericPrice = parseFloat(priceText.replace(/[^0-9.]/g, ""));
      expect(numericPrice).toBeGreaterThanOrEqual(minPrice);
      if (maxPrice !== Infinity) {
        expect(numericPrice).toBeLessThanOrEqual(maxPrice);
      }
    }
  });

  test("Homepage Load More -> Browse New Products", async ({ page }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const initialCards = page.locator(".home-page .card");
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThanOrEqual(6);

    const loadMoreBtn = page.locator("button.loadmore");
    const loadMoreVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (loadMoreVisible) {
      await loadMoreBtn.click();
      await page.waitForTimeout(2000);
      const newCount = await page.locator(".home-page .card").count();
      expect(newCount).toBeGreaterThan(initialCount);
    }

    const lastCard = page.locator(".home-page .card").last();
    await lastCard.getByRole("button", { name: "More Details" }).click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
    const detailFields = page.locator(".product-details-info h6");
    await expect(detailFields.filter({ hasText: /^Name/ })).toBeVisible();
    await expect(
      detailFields.filter({ hasText: /^Description/ })
    ).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Price/ })).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Category/ })).toBeVisible();
  });

  test("All Categories Page -> Category -> Product Details", async ({
    page,
  }) => {
    await page.goto("/categories");

    const categoryLinks = page.locator(".container a.btn");
    await categoryLinks.first().waitFor({ timeout: 10000 });
    const categoryCount = await categoryLinks.count();
    expect(categoryCount).toBeGreaterThan(0);

    const chosenCategoryName = (
      await categoryLinks.first().textContent()
    ).trim();
    await categoryLinks.first().click();

    await page.locator(".category .card").first().waitFor({ timeout: 10000 });

    await expect(
      page.getByRole("heading", {
        level: 4,
        name: `Category - ${chosenCategoryName}`,
      })
    ).toBeVisible();

    const productCards = page.locator(".category .card");
    const productCount = await productCards.count();
    expect(productCount).toBeGreaterThan(0);

    await productCards
      .first()
      .getByRole("button", { name: "More Details" })
      .click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible();
    const detailFields = page.locator(".product-details-info h6");
    await expect(detailFields.filter({ hasText: /^Name/ })).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Price/ })).toBeVisible();
    await expect(detailFields.filter({ hasText: /^Category/ })).toBeVisible();
  });

  test("Product Details Add to Cart -> Cart Verification", async ({
    page,
  }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    await page
      .locator(".home-page .card")
      .first()
      .getByRole("button", { name: "More Details" })
      .click();
    await page.waitForSelector(".product-details", { timeout: 10000 });

    const nameField = await page
      .locator(".product-details-info h6")
      .filter({ hasText: /^Name/ })
      .textContent();
    const capturedName = nameField.replace(/^Name\s*:\s*/, "").trim();

    const cartBadge = page.locator(".ant-badge sup");
    await expect(cartBadge).toHaveText("0");

    await page
      .locator(".product-details-info")
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    await expect(page.getByText("Item Added to cart")).toBeVisible();
    await expect(cartBadge).toHaveText("1");

    await page.getByRole("link", { name: "Cart" }).click();
    await page.waitForSelector(".cart-page", { timeout: 10000 });

    await expect(
      page.locator(".cart-page").getByText(capturedName, { exact: true })
    ).toBeVisible();
  });

  test("Category Product Pagination", async ({ page }) => {
    await page.waitForSelector(".card", { timeout: 10000 });

    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });

    const categoryLinks = dropdown
      .locator("a.dropdown-item")
      .filter({ hasNotText: "All Categories" });
    await categoryLinks.first().click();

    await page.locator(".category .card").first().waitFor({ timeout: 10000 });

    const cards = page.locator(".category .card");
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThanOrEqual(6);

    const loadMoreBtn = page.getByRole("button", { name: /Load more/i });
    const loadMoreVisible = await loadMoreBtn.isVisible().catch(() => false);

    if (loadMoreVisible) {
      await loadMoreBtn.click();
      await page.waitForTimeout(1000);
      const newCount = await cards.count();
      expect(newCount).toBeGreaterThan(initialCount);
    }

    const allCards = page.locator(".category .card");
    const totalCount = await allCards.count();
    for (let i = 0; i < totalCount; i++) {
      const card = allCards.nth(i);
      await expect(card.locator(".card-title").first()).toBeVisible();
      await expect(card.locator(".card-price")).toBeVisible();
      await expect(card.locator(".card-text")).toBeVisible();
      await expect(
        card.getByRole("button", { name: "More Details" })
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: "ADD TO CART" })
      ).toBeVisible();
    }
  });

  test("Cross-Category Navigation", async ({ page }) => {
    await page.waitForSelector(".card", { timeout: 10000 });

    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown = page.locator(".dropdown-menu.show");
    await dropdown.waitFor({ timeout: 5000 });

    const categoryLinks = dropdown
      .locator("a.dropdown-item")
      .filter({ hasNotText: "All Categories" });
    const categoryCount = await categoryLinks.count();
    expect(categoryCount).toBeGreaterThanOrEqual(2);

    const firstCategoryName = (
      await categoryLinks.nth(0).textContent()
    ).trim();
    await categoryLinks.nth(0).click();

    await page.locator(".category .card").first().waitFor({ timeout: 10000 });
    const firstHeading = await page.locator(".category h4").textContent();
    expect(firstHeading).toContain(`Category - ${firstCategoryName}`);

    await page.getByRole("link", { name: "Categories" }).click();
    const dropdown2 = page.locator(".dropdown-menu.show");
    await dropdown2.waitFor({ timeout: 5000 });

    const categoryLinks2 = dropdown2
      .locator("a.dropdown-item")
      .filter({ hasNotText: "All Categories" });
    const secondCategoryName = (
      await categoryLinks2.nth(1).textContent()
    ).trim();
    await categoryLinks2.nth(1).click();

    await expect(page.locator(".category h4")).toContainText(
      `Category - ${secondCategoryName}`,
      { timeout: 10000 }
    );
    await page.locator(".category .card").first().waitFor({ timeout: 10000 });
    const secondHeading = await page.locator(".category h4").textContent();

    expect(firstCategoryName).not.toBe(secondCategoryName);
    expect(firstHeading).not.toBe(secondHeading);
  });

  test("Homepage Reset Filters", async ({ page }) => {
    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const initialCount = await page.locator(".home-page .card").count();

    const firstCheckbox = page.locator(".filters .ant-checkbox-input").first();
    await firstCheckbox.check();

    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    await page.getByRole("button", { name: "RESET FILTERS" }).click();

    await page.waitForSelector(".home-page .card", { timeout: 10000 });

    const resetCount = await page.locator(".home-page .card").count();
    expect(resetCount).toBe(initialCount);

    const checkboxes = page.locator(".filters .ant-checkbox-input");
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });
});
