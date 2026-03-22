// Lee Seng Kitt - Cart Management and Category Shopping
const { test, expect } = require('@playwright/test');

const RUN_ID = Date.now();

// Pre-seeded test user for authenticated tests
const TEST_USER = {
  name: 'Cart Test User',
  email: `carttest_${RUN_ID}@example.com`,
  password: 'CartTestPass123',
  phone: '91234567',
  address: '123 Cart Street',
  DOB: '1995-03-15',
  answer: 'basketball',
};

/**
 * Helper: Login via UI with the pre-registered test user.
 */
async function loginViaUI(page) {
  await page.goto('/login');
  await page.getByPlaceholder(/Enter Your Email/).fill(TEST_USER.email);
  await page.getByPlaceholder('Enter Your Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await expect(page.locator('.navbar').getByText(TEST_USER.name)).toBeVisible({ timeout: 10000 });
}

test.describe('Cart Management and Category Shopping', () => {
  // Register the test user once before all tests in the suite
  test.beforeAll(async ({ request }) => {
    await request.post('/api/v1/auth/register', { data: TEST_USER });
  });

  // Clear cart from localStorage before each test to ensure isolation
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('cart'));
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 1: Multi-Item Cart -> Remove Item -> Verify Total
  // ──────────────────────────────────────────────────────────────────────
  test('Multi-Item Cart -> Remove Item -> Verify Total', async ({ page }) => {
    // Wait for homepage products to load
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // Grab the names and prices of the first two products
    const firstCard = page.locator('.home-page .card').nth(0);
    const secondCard = page.locator('.home-page .card').nth(1);

    const firstName = await firstCard.locator('.card-title').first().textContent();
    const secondName = await secondCard.locator('.card-title').first().textContent();

    const firstPriceText = await firstCard.locator('.card-price').textContent();
    const secondPriceText = await secondCard.locator('.card-price').textContent();
    const firstPrice = parseFloat(firstPriceText.replace(/[^0-9.]/g, ''));
    const secondPrice = parseFloat(secondPriceText.replace(/[^0-9.]/g, ''));

    // Add both products to cart
    await firstCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);
    await secondCard.getByRole('button', { name: 'ADD TO CART' }).click();

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify both items displayed
    await expect(page.locator('.cart-page .col-md-4 p').filter({ hasText: firstName.trim() }).first()).toBeVisible();
    await expect(page.locator('.cart-page .col-md-4 p').filter({ hasText: secondName.trim() }).first()).toBeVisible();

    // Verify total is sum of both
    const totalText = await page.locator('.cart-summary h4').textContent();
    const expectedTotal = (firstPrice + secondPrice).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(totalText).toContain(expectedTotal);

    // Remove the first item
    const removeButtons = page.locator('.cart-page .btn-danger');
    await removeButtons.first().click();

    // Wait for the cart to update
    await page.waitForTimeout(500);

    // Verify first item is gone, second remains
    // After removal, only one card should remain
    const remainingCards = page.locator('.cart-page .card');
    await expect(remainingCards).toHaveCount(1);
    await expect(page.locator('.cart-page .col-md-4 p').filter({ hasText: secondName.trim() }).first()).toBeVisible();

    // Verify updated total
    const updatedTotalText = await page.locator('.cart-summary h4').textContent();
    const expectedUpdatedTotal = secondPrice.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(updatedTotalText).toContain(expectedUpdatedTotal);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 2: Cart Persistence Across Navigation
  // ──────────────────────────────────────────────────────────────────────
  test('Cart Persistence Across Navigation', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // Add a product from homepage
    const productCard = page.locator('.home-page .card').first();
    const productName = await productCard.locator('.card-title').first().textContent();
    await productCard.getByRole('button', { name: 'ADD TO CART' }).click();

    // Verify cart badge shows 1
    const cartBadge = page.locator('.ant-badge sup');
    await expect(cartBadge).toHaveText('1');

    // Navigate to /categories and check badge persists
    await page.goto('/categories');
    await expect(cartBadge).toHaveText('1');

    // Navigate to /about and check badge persists
    await page.goto('/about');
    await expect(cartBadge).toHaveText('1');

    // Navigate to /cart and verify product is still listed
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });
    await expect(page.locator('.cart-page .col-md-4 p').filter({ hasText: productName.trim() }).first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 3: Add Items from Different Pages
  // ──────────────────────────────────────────────────────────────────────
  test('Add Items from Different Pages', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // 1) Add from homepage
    const homepageCard = page.locator('.home-page .card').first();
    await homepageCard.getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);

    // 2) Navigate to product details via "More Details" and add from there
    const secondCard = page.locator('.home-page .card').nth(1);
    await secondCard.getByRole('button', { name: 'More Details' }).click();
    await page.waitForSelector('.product-details', { timeout: 10000 });
    await page.locator('.product-details-info').getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);

    // 3) Navigate to a category page and add from there
    await page.getByRole('link', { name: 'Categories' }).click();
    const dropdown = page.locator('.dropdown-menu.show');
    await dropdown.waitFor({ timeout: 5000 });
    const categoryLinks = dropdown.locator('a.dropdown-item').filter({ hasNotText: 'All Categories' });
    await categoryLinks.first().click();
    await page.locator('.category .card').first().waitFor({ timeout: 10000 });
    await page.locator('.category .card').first().getByRole('button', { name: 'ADD TO CART' }).click();

    // Verify cart badge shows 3
    const cartBadge = page.locator('.ant-badge sup');
    await expect(cartBadge).toHaveText('3');

    // Navigate to cart and verify all 3 items present
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    const cartItems = page.locator('.cart-page .card');
    await expect(cartItems).toHaveCount(3);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 4: Guest Cart Experience
  // ──────────────────────────────────────────────────────────────────────
  test('Guest Cart Experience', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // As guest, add a product
    await page.locator('.home-page .card').first().getByRole('button', { name: 'ADD TO CART' }).click();

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify greeting says "Hello Guest"
    await expect(page.locator('.cart-page h1')).toContainText('Hello Guest');

    // Verify "please login to checkout" message
    await expect(page.locator('.cart-page')).toContainText('please login to checkout');

    // Verify "Plase Login to checkout" button is visible (note: typo is intentional)
    await expect(page.getByRole('button', { name: 'Plase Login to checkout' })).toBeVisible();

    // Verify no payment section (no "Make Payment" button or DropIn)
    await expect(page.getByRole('button', { name: 'Make Payment' })).not.toBeVisible();

    // Verify the added item is displayed with a "Remove" button
    const cartItems = page.locator('.cart-page .card');
    await expect(cartItems).toHaveCount(1);
    await expect(page.locator('.cart-page .btn-danger').first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 5: Cart Item Count Accuracy
  // ──────────────────────────────────────────────────────────────────────
  test('Cart Item Count Accuracy', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // Get the first product's price
    const firstCard = page.locator('.home-page .card').first();
    const priceText = await firstCard.locator('.card-price').textContent();
    const singlePrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    // Click "ADD TO CART" on the same product 3 times
    for (let i = 0; i < 3; i++) {
      await firstCard.getByRole('button', { name: 'ADD TO CART' }).click();
      await page.waitForTimeout(300);
    }

    // Verify cart badge shows 3
    const cartBadge = page.locator('.ant-badge sup');
    await expect(cartBadge).toHaveText('3');

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify 3 item cards displayed
    const cartItems = page.locator('.cart-page .card');
    await expect(cartItems).toHaveCount(3);

    // Verify total is 3x the price
    const totalText = await page.locator('.cart-summary h4').textContent();
    const expectedTotal = (singlePrice * 3).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(totalText).toContain(expectedTotal);

    // Remove one item
    await page.locator('.cart-page .btn-danger').first().click();
    await page.waitForTimeout(500);

    // Verify badge drops to 2
    await expect(cartBadge).toHaveText('2');

    // Verify total updates
    const updatedTotalText = await page.locator('.cart-summary h4').textContent();
    const expectedUpdatedTotal = (singlePrice * 2).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    expect(updatedTotalText).toContain(expectedUpdatedTotal);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 6: Categories Page -> Shop Multiple Categories
  // ──────────────────────────────────────────────────────────────────────
  test('Categories Page -> Shop Multiple Categories', async ({ page }) => {
    // Navigate to /categories
    await page.goto('/categories');
    const categoryLinks = page.locator('.container a.btn');
    await categoryLinks.first().waitFor({ timeout: 10000 });
    const categoryCount = await categoryLinks.count();
    expect(categoryCount).toBeGreaterThanOrEqual(2);

    // Click first category
    const firstCategoryName = (await categoryLinks.first().textContent()).trim();
    await categoryLinks.first().click();
    await page.locator('.category .card').first().waitFor({ timeout: 10000 });

    // Add a product from first category
    await page.locator('.category .card').first().getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);

    // Navigate back to /categories
    await page.goto('/categories');
    await categoryLinks.first().waitFor({ timeout: 10000 });

    // Click second category
    const secondCategoryName = (await categoryLinks.nth(1).textContent()).trim();
    expect(firstCategoryName).not.toBe(secondCategoryName);
    await categoryLinks.nth(1).click();
    await page.locator('.category .card').first().waitFor({ timeout: 10000 });

    // Add a product from second category
    await page.locator('.category .card').first().getByRole('button', { name: 'ADD TO CART' }).click();
    await page.waitForTimeout(500);

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify both items are present
    const cartItems = page.locator('.cart-page .card');
    await expect(cartItems).toHaveCount(2);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 7: Empty Cart State
  // ──────────────────────────────────────────────────────────────────────
  test('Empty Cart State', async ({ page }) => {
    // Ensure cart is empty (already cleared in beforeEach)
    await page.goto('/cart');
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify "Your Cart Is Empty" message
    await expect(page.locator('.cart-page')).toContainText('Your Cart Is Empty');

    // Verify total shows $0.00
    const totalText = await page.locator('.cart-summary h4').textContent();
    expect(totalText).toContain('$0.00');
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 8: Cart to Login Flow (Guest)
  // ──────────────────────────────────────────────────────────────────────
  test('Cart to Login Flow (Guest)', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // As guest, add a product
    await page.locator('.home-page .card').first().getByRole('button', { name: 'ADD TO CART' }).click();

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Click "Plase Login to checkout" button
    await page.getByRole('button', { name: 'Plase Login to checkout' }).click();

    // Verify navigation to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 9: Add to Cart from Product Details -> Verify in Cart
  // ──────────────────────────────────────────────────────────────────────
  test('Add to Cart from Product Details -> Verify in Cart', async ({ page }) => {
    await page.waitForSelector('.home-page .card', { timeout: 10000 });

    // Click "More Details" on a product
    await page.locator('.home-page .card').first().getByRole('button', { name: 'More Details' }).click();
    await page.waitForSelector('.product-details', { timeout: 10000 });

    // Extract product name and price from product details page
    const nameField = await page.locator('.product-details-info h6').filter({ hasText: /^Name/ }).textContent();
    const capturedName = nameField.replace(/^Name\s*:\s*/, '').trim();

    const priceField = await page
      .locator('.product-details-info h6')
      .filter({ hasText: /^Price/ })
      .textContent();

    // Click "ADD TO CART"
    await page.locator('.product-details-info').getByRole('button', { name: 'ADD TO CART' }).click();

    // Navigate to cart
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    // Verify the product appears with correct name
    await expect(page.locator('.cart-page').getByText(capturedName, { exact: true })).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Test 10: Cart Badge Reflects Adds from Category Pages
  // ──────────────────────────────────────────────────────────────────────
  test('Cart Badge Reflects Adds from Category Pages', async ({ page }) => {
    // Navigate to a category page via the Categories dropdown
    await page.waitForSelector('.home-page .card', { timeout: 10000 });
    await page.getByRole('link', { name: 'Categories' }).click();
    const dropdown = page.locator('.dropdown-menu.show');
    await dropdown.waitFor({ timeout: 5000 });
    const categoryLinks = dropdown.locator('a.dropdown-item').filter({ hasNotText: 'All Categories' });
    await categoryLinks.first().click();
    await page.locator('.category .card').first().waitFor({ timeout: 10000 });

    const cartBadge = page.locator('.ant-badge sup');

    // Click "ADD TO CART" on the first product
    await page.locator('.category .card').nth(0).getByRole('button', { name: 'ADD TO CART' }).click();
    await expect(cartBadge).toHaveText('1');

    // Click "ADD TO CART" on the second product (if exists)
    const cardCount = await page.locator('.category .card').count();
    if (cardCount >= 2) {
      await page.locator('.category .card').nth(1).getByRole('button', { name: 'ADD TO CART' }).click();
      await expect(cartBadge).toHaveText('2');
    }

    // Navigate to cart and verify items are listed
    await page.getByRole('link', { name: 'Cart' }).click();
    await page.waitForSelector('.cart-page', { timeout: 10000 });

    const expectedCount = cardCount >= 2 ? 2 : 1;
    const cartItems = page.locator('.cart-page .card');
    await expect(cartItems).toHaveCount(expectedCount);
  });
});
