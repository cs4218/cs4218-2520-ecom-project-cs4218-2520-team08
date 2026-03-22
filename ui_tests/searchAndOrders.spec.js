// Yeo Zi Yi, A0266292X
const { test, expect } = require("@playwright/test");
const path = require("path");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const RUN_ID = Date.now();

const BUYER = {
  name: "UI Buyer",
  email: `ui_buyer_${RUN_ID}@example.com`,
  password: "BuyerPass123",
  phone: "91234001",
  address: "1 Buyer Road",
  DOB: "1992-02-02",
  answer: "swimming",
};

const ADMIN = {
  name: "UI Admin",
  email: `ui_admin_${RUN_ID}@example.com`,
  password: "AdminPass123",
  phone: "91234002",
  address: "2 Admin Lane",
  DOB: "1993-03-03",
  answer: "basketball",
};

/** Updated in the Profile test; later buyer logins assert this navbar label. */
let buyerNavbarName = BUYER.name;

/** After optional password-rotation test, buyer logins use this (updateProfile + hash). */
let buyerPassword = BUYER.password;

function mongoUri() {
  const raw = process.env.MONGO_URL;
  if (!raw) return null;
  return String(raw).trim();
}

async function withMongo(fn) {
  const uri = mongoUri();
  if (!uri) {
    throw new Error("MONGO_URL is not set; cannot seed admin role or orders.");
  }
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    await fn(db);
  } finally {
    await client.close();
  }
}

async function setUserRole(email, role) {
  await withMongo(async (db) => {
    await db.collection("users").updateOne(
      { email: email.toLowerCase() },
      { $set: { role } }
    );
  });
}

async function insertOrderForBuyer(buyerId, productIds) {
  let insertedId;
  await withMongo(async (db) => {
    const res = await db.collection("orders").insertOne({
      products: productIds.map((id) => new ObjectId(id)),
      payment: { success: true },
      buyer: new ObjectId(buyerId),
      status: "Not Process",
    });
    insertedId = res.insertedId;
  });
  return insertedId;
}

async function loginViaUI(page, email, password, expectedNameInNavbar) {
  await page.goto("/login");
  await page.getByPlaceholder(/Enter Your Email/).fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(
    page.locator(".navbar").getByText(expectedNameInNavbar)
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
}

test.describe.configure({ mode: "serial", timeout: 60_000 });

test.describe("Profile, orders, search & admin", () => {
  let productId;
  let seededProductName;
  let productNameWord;
  let buyerUserId;
  let orderId;

  test.beforeAll(async ({ request }) => {
    const regBuyer = await request.post("/api/v1/auth/register", { data: BUYER });
    expect(regBuyer.ok()).toBeTruthy();
    const regAdmin = await request.post("/api/v1/auth/register", { data: ADMIN });
    expect(regAdmin.ok()).toBeTruthy();

    await setUserRole(ADMIN.email, 1);

    const loginBuyer = await request.post("/api/v1/auth/login", {
      data: { email: BUYER.email, password: BUYER.password },
    });
    expect(loginBuyer.ok()).toBeTruthy();
    const buyerJson = await loginBuyer.json();
    buyerUserId = buyerJson.user._id;

    const productsRes = await request.get("/api/v1/product/get-product");
    expect(productsRes.ok()).toBeTruthy();
    const productsJson = await productsRes.json();
    const first = productsJson.products?.[0];
    if (!first?._id) {
      throw new Error("No products in DB; seed products before running this spec.");
    }
    productId = first._id;
    seededProductName = String(first.name || "").trim();
    productNameWord = String(first.name || "product")
      .trim()
      .split(/\s+/)[0];

    orderId = await insertOrderForBuyer(buyerUserId, [productId]);
    expect(orderId).toBeTruthy();
  });

  test.describe("User profile & orders", () => {
    test("Profile page shows form structure, then update persists via API", async ({
      page,
    }) => {
      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);

      await page.goto("/dashboard/user/profile");
      await expect(page).toHaveTitle(/Your Profile/i);
      await expect(page.getByText(/Virtual Vault/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "USER PROFILE" })).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Email ")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Email ")).toBeDisabled();
      await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Phone")).toBeVisible();
      await expect(page.getByPlaceholder("Enter Your Address")).toBeVisible();
      await expect(page.getByRole("button", { name: "UPDATE" })).toBeVisible();
      await expect(page.getByText(/All Rights Reserved/)).toBeVisible();

      const newName = `Updated Buyer ${RUN_ID}`;
      const newPhone = "99887766";
      const newAddress = "99 New Street";

      await page.getByPlaceholder("Enter Your Name").fill(newName);
      await page.getByPlaceholder("Enter Your Phone").fill(newPhone);
      await page.getByPlaceholder("Enter Your Address").fill(newAddress);
      await page.getByRole("button", { name: "UPDATE" }).click();

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator(".navbar").getByText(newName)).toBeVisible();
      buyerNavbarName = newName;
    });

    test("User dashboard exposes Profile and Orders links in UserMenu", async ({
      page,
    }) => {
      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);

      await page.goto("/dashboard/user");
      await page.waitForSelector(".dashboard", { timeout: 10000 });

      await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
    });

    test("Orders: UserMenu → /orders, getOrders loads row, quantity and product from orderModel data", async ({
      page,
    }) => {
      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);

      await page.goto("/dashboard/user");
      await page.waitForSelector(".dashboard", { timeout: 10000 });

      const ordersLoaded = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/auth/orders") &&
          res.request().method() === "GET" &&
          res.ok()
      );
      await page.getByRole("link", { name: "Orders" }).click();
      await ordersLoaded;

      await expect(page).toHaveTitle(/Your Orders/i);
      await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();

      await expect(page.locator("table.table th", { hasText: "Status" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "Not Process", exact: true })).toBeVisible();
      const firstRow = page.locator("table.table tbody tr").first();
      await expect(firstRow.locator("td").nth(2)).not.toHaveText("");
      await expect(page.getByRole("cell", { name: "Success", exact: true })).toBeVisible();
      await expect(firstRow.locator("td").nth(5)).toHaveText("1");

      await expect(page.getByText(seededProductName, { exact: false }).first()).toBeVisible({
        timeout: 10000,
      });
    });

    test("Profile password update (updateProfile) then logout + login with new password", async ({
      page,
    }) => {
      const rotatedPw = `Rot${RUN_ID}Pass9`;

      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);
      await page.goto("/dashboard/user/profile");

      const profilePut = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/auth/profile") &&
          res.request().method() === "PUT" &&
          res.ok()
      );
      await page.getByPlaceholder("Enter Your Password").fill(rotatedPw);
      await page.getByRole("button", { name: "UPDATE", exact: true }).click();
      await profilePut;

      await expect(page.getByText("Profile Updated Successfully")).toBeVisible({
        timeout: 10000,
      });

      await page.locator(".navbar").getByText(buyerNavbarName).click();
      await page.getByRole("link", { name: "Logout" }).click();
      await page.waitForURL(/\/login/, { timeout: 10000 });

      buyerPassword = rotatedPw;
      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);
    });
  });

  test.describe("Header SearchInput and Search results page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => localStorage.removeItem("cart"));
    });

    test("SearchInput uses role=search form; results page sets title and shows cards", async ({
      page,
    }) => {
      await page.waitForSelector(".home-page .card", { timeout: 10000 });

      await expect(page.locator('form[role="search"]')).toBeVisible();
      const searchInput = page.getByPlaceholder("Search");
      await expect(searchInput).toBeVisible();

      const searchReq = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/product/search/") &&
          res.request().method() === "GET" &&
          res.ok()
      );
      await searchInput.fill(productNameWord);
      await page.getByRole("button", { name: "Search" }).click();
      await searchReq;

      await page.waitForURL(/\/search/, { timeout: 10000 });
      await expect(page).toHaveTitle(/Search results/i);
      await expect(page.getByRole("heading", { name: "Search Resuts" })).toBeVisible();
      await expect(page.getByText(/Found \d+/)).toBeVisible();
      await expect(page.locator(".container .card").first()).toBeVisible();
    });

    test("Search with no matches shows empty state copy", async ({ page }) => {
      await page.waitForSelector(".home-page .card", { timeout: 10000 });

      await page.getByPlaceholder("Search").fill(`___no_match_${RUN_ID}___`);
      await page.getByRole("button", { name: "Search" }).click();

      await page.waitForURL(/\/search/, { timeout: 10000 });
      await expect(page.getByText("No Products Found")).toBeVisible();
    });

    test("Search page cold load: empty search context shows No Products Found", async ({
      page,
    }) => {
      await page.goto("/search");
      await expect(page.getByRole("heading", { name: "Search Resuts" })).toBeVisible();
      await expect(page.getByText("No Products Found")).toBeVisible();
    });
  });

  test.describe("Admin Users and AdminOrders", () => {
    test("Admin Users page renders heading inside admin layout", async ({ page }) => {
      await loginViaUI(page, ADMIN.email, ADMIN.password, ADMIN.name);

      const adminAuthDone = page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/auth/admin-auth") && res.status() === 200
      );
      await page.goto("/dashboard/admin/users");
      await adminAuthDone;
      // Users.js has no .dashboard wrapper (unlike AdminOrders); wait on real content.
      await expect(page.getByRole("heading", { name: "All Users" })).toBeVisible({
        timeout: 15000,
      });
      await expect(page).toHaveTitle(/Dashboard - All Users/i);
      await expect(page.getByRole("link", { name: "Create Category" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
    });

    test("Buyer hitting admin route sees spinner countdown then login", async ({
      page,
    }) => {
      await loginViaUI(page, BUYER.email, buyerPassword, buyerNavbarName);

      await page.goto("/dashboard/admin/users");
      await expect(page.getByText(/redirecting to you in/i)).toBeVisible({
        timeout: 5000,
      });
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
});
