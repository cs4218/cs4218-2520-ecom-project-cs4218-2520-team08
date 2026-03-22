// Kamat Shivangi Prashant, A0319665R
const { test, expect } = require("@playwright/test");

const ADMIN_USER = {
  email: "admin@example.com",
  password: "adminpassword"
};

const REGULAR_USER = {
  email: "user@example.com", 
  password: "userpassword"
};

const RUN_ID = Date.now();

// Helper to login
async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder(/Enter Your Email/i).fill(ADMIN_USER.email);
  await page.getByPlaceholder(/Enter Your Password/i).fill(ADMIN_USER.password);
  await page.getByRole("button", { name: /LOGIN/i }).click();
  await page.waitForSelector(".navbar .nav-item.dropdown", { timeout: 10000 });
}

async function loginAsUser(page) {
  await page.goto("/login");
  await page.getByPlaceholder(/Enter Your Email/i).fill(REGULAR_USER.email);
  await page.getByPlaceholder(/Enter Your Password/i).fill(REGULAR_USER.password);
  await page.getByRole("button", { name: /LOGIN/i }).click();
  await page.waitForSelector(".navbar .nav-item.dropdown", { timeout: 10000 });
}

test.describe("UI (E2E) Tests: Admin CRUD", () => {
    
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.removeItem("cart"));
  });

  test("1. Admin Category CRUD Lifecycle", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/create-category");
    
    // Create new category
    const catName = `TestCategory_${RUN_ID}`;
    await page.getByPlaceholder(/Enter new category/i).fill(catName);
    await page.getByRole("button", { name: /Submit/i }).click();

    await expect(page.locator("table").getByText(catName)).toBeVisible({ timeout: 5000 });

    // Update the category
    const updatedCatName = `${catName}_Updated`;
    const row = page.locator("tr", { hasText: catName });
    await row.getByRole("button", { name: /Edit/i }).click();
    
    // Fill the modal input
    const modalInput = page.locator(".modal-content input");
    await modalInput.fill(updatedCatName);
    await page.locator(".modal-content").getByRole("button", { name: /Submit/i }).click();

    // Verify updated category appears
    await expect(page.locator("table").getByText(updatedCatName)).toBeVisible({ timeout: 5000 });

    // Delete the category
    const updatedRow = page.locator("tr", { hasText: updatedCatName });
    await updatedRow.getByRole("button", { name: /Delete/i }).click();

    // Verify it is removed
    await expect(page.locator("table").getByText(updatedCatName)).not.toBeVisible();
  });

  test("2. Admin Category Visible on Storefront", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);
    
    await page.goto("/dashboard/admin/create-category");
    const catName = `StorefrontCat_${RUN_ID}`;
    await page.getByPlaceholder(/Enter new category/i).fill(catName);
    await page.getByRole("button", { name: /Submit/i }).click();
    await expect(page.locator("table").getByText(catName)).toBeVisible({ timeout: 5000 });

    // Go to storefront Home and check Categories dropdown
    await page.goto("/");
    await page.getByRole("button", { name: /Categories/i }).click();
    await expect(page.locator('.dropdown-menu').getByRole("link", { name: catName, exact: true })).toBeVisible();

    // Go to /categories page
    await page.goto("/categories");
    await expect(page.locator('.container').getByRole("link", { name: catName })).toBeVisible();
  });

  test("3. Admin Product Creation -> Product List", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/create-product");

    const prodName = `TestProduct_${RUN_ID}`;
    await page.getByPlaceholder(/write a name/i).fill(prodName);
    await page.getByPlaceholder(/write a description/i).fill("A very nice product description");
    await page.getByPlaceholder(/write a Price/i).fill("100");
    await page.getByPlaceholder(/write a quantity/i).fill("50");
    
    await page.locator(".ant-select-selector").first().click();
    // Click the first category option
    await page.locator(".ant-select-item").first().click();
    
    // We skip image upload as Playwright fileChooser can be tricky without a reliable input
    
    await page.getByRole("button", { name: /CREATE PRODUCT/i }).click();

    await page.waitForURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
    await expect(page.getByText(prodName)).toBeVisible();
  });

  test("4. Admin Product Update Flow", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/products");
    
    const productLink = page.locator(".product-link").first();
    await productLink.click();
    
    await page.waitForTimeout(2000); // Wait for pre-population

    const newName = `UpdatedProduct_${RUN_ID}`;
    const nameInput = page.getByPlaceholder(/write a name/i);
    await nameInput.fill(newName);
    
    await page.getByRole("button", { name: /UPDATE PRODUCT/i }).click();

    await page.waitForURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
    await expect(page.locator(".product-link").getByText(newName)).toBeVisible();
  });

  test("5. Admin Product Delete Flow", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/products");
    
    const firstProduct = page.locator(".product-link").first();
    // Just verify the card exists, grab inner text might fail if empty, let's assume one product exists
    const prodName = await firstProduct.locator('.card-title').innerText();
    
    await firstProduct.click();

    page.on("dialog", dialog => dialog.accept());
    
    await page.getByRole("button", { name: /DELETE PRODUCT/i }).click();

    await page.waitForURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
    await expect(page.getByText(prodName)).not.toBeVisible();
  });

  test("6. Admin Orders View and Status Change", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/orders");

    await expect(page.getByRole("heading", { name: /All Orders/i, exact: true })).toBeVisible();

    const selects = page.locator(".ant-select-selector");
    if (await selects.count() > 0) {
      await selects.first().click();
      await page.locator('.ant-select-item').getByText("Shipped").click();
      
      await expect(page.locator(".ant-select-selection-item").first()).toHaveText("Shipped");
    }
  });

  test("7. Admin Dashboard -> Menu Navigation", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);
    await page.goto("/dashboard/admin");

    const menuLinks = [
      { name: "Create Category", expectedUrl: "/dashboard/admin/create-category" },
      { name: "Create Product", expectedUrl: "/dashboard/admin/create-product" },
      { name: "Products", expectedUrl: "/dashboard/admin/products" },
      { name: "Orders", expectedUrl: "/dashboard/admin/orders" },
    ];

    for (const link of menuLinks) {
      await page.locator(".dashboard-menu").getByRole("link", { name: link.name, exact: true }).click();
      await page.waitForURL(new RegExp(link.expectedUrl), { timeout: 5000 });
      await expect(page.locator(".dashboard-menu")).toBeVisible();
    }
  });

  test("8. Admin vs User Dashboard Routing", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    
    await loginAsAdmin(page);
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/.*\/dashboard\/admin/);
    await expect(page.locator(".dashboard-menu").getByRole("link", { name: "Create Category" })).toBeVisible();
    
    // Logout
    await page.locator(".navbar .dropdown-toggle").click();
    await page.getByRole("link", { name: "Logout" }).click();
    
    // Login as User
    await loginAsUser(page);
    await page.goto("/dashboard/user");
    await expect(page).toHaveURL(/.*\/dashboard\/user/);
    await expect(page.locator(".dashboard-menu").getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.locator(".dashboard-menu").getByRole("link", { name: "Orders" })).toBeVisible();
  });

  test("9. Admin Creates Category -> User Browses It", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);
    await page.goto("/dashboard/admin/create-category");

    const catName = `BrowseCat_${RUN_ID}`;
    await page.getByPlaceholder(/Enter new category/i).fill(catName);
    await page.getByRole("button", { name: /Submit/i }).click();
    await expect(page.locator("table").getByText(catName)).toBeVisible({ timeout: 5000 });

    await page.locator(".navbar .dropdown-toggle").click();
    await page.getByRole("link", { name: "Logout" }).click();
    
    await loginAsUser(page);
    await page.goto("/");
    await page.locator('.navbar').getByRole("button", { name: /Categories/i }).click();
    await page.locator('.dropdown-menu').getByRole("link", { name: catName, exact: true }).click();

    await expect(page.getByRole("heading", { name: new RegExp(`Category - ${catName}`, "i") })).toBeVisible();
  });

  test("10. Admin Product Update Reflects on Storefront", async ({ page }) => {
    // Kamat Shivangi Prashant, A0319665R
    await loginAsAdmin(page);
    await page.goto("/dashboard/admin/products");
    
    const productLink = page.locator(".product-link").first();
    await productLink.click();
    
    await page.waitForTimeout(2000);
    const updatedName = `StoreUpdated_${RUN_ID}`;
    await page.getByPlaceholder(/write a name/i).fill(updatedName);
    await page.getByRole("button", { name: /UPDATE PRODUCT/i }).click();

    await page.waitForURL(/\/dashboard\/admin\/products/, { timeout: 10000 });
    
    await page.goto("/");
    await expect(page.locator('.card', {hasText: updatedName}).first()).toBeVisible({ timeout: 5000 });

    const productCard = page.locator(".card", { hasText: updatedName });
    await productCard.getByRole("button", { name: /ADD TO CART/i }).click();

    await page.goto("/cart");
    // Wait for cart item
    await expect(page.locator('.row', {hasText: updatedName}).first()).toBeVisible();
  });
});
