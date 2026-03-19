// Tsui Yi Wern, A0266070J
const { test, expect } = require("@playwright/test");

const RUN_ID = Date.now();

const TEST_USER = {
  name: "Auth Test User",
  email: `authtest_${RUN_ID}@example.com`,
  password: "TestPassword123",
  phone: "91234567",
  address: "123 Test Street",
  DOB: "1990-01-01",
  answer: "football",
};

const RESET_USER = {
  name: "Reset PW User",
  email: `resetpw_${RUN_ID}@example.com`,
  password: "ResetPwPass123",
  phone: "91234568",
  address: "456 Reset Avenue",
  DOB: "1991-06-15",
  answer: "tennis",
};

async function loginViaUI(page) {
  await page.goto("/login");
  await page.getByPlaceholder(/Enter Your Email/).fill(TEST_USER.email);
  await page.getByPlaceholder("Enter Your Password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(
    page.locator(".navbar").getByText(TEST_USER.name)
  ).toBeVisible({ timeout: 10000 });
}

test.describe("Auth UI: Authentication Flows", () => {
  test.beforeAll(async ({ request }) => {
    await request.post("/api/v1/auth/register", { data: TEST_USER });
    await request.post("/api/v1/auth/register", { data: RESET_USER });
  });

  test("Register page renders correct structure", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText(/Virtual Vault/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "REGISTER FORM" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Email")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Phone")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Address")).toBeVisible();
    await expect(page.locator("#exampleInputDOB1")).toBeVisible();
    await expect(
      page.getByPlaceholder("What is Your Favorite sports")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "REGISTER" })
    ).toBeVisible();
    await expect(page.getByText(/All Rights Reserved/)).toBeVisible();
  });

  test("Successful registration redirects to login page", async ({ page }) => {
    const uniqueEmail = `newuser_${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByPlaceholder("Enter Your Name").fill("New Test User");
    await page.getByPlaceholder("Enter Your Email").fill(uniqueEmail);
    await page.getByPlaceholder("Enter Your Password").fill("Password123");
    await page.getByPlaceholder("Enter Your Phone").fill("91234567");
    await page.getByPlaceholder("Enter Your Address").fill("123 Test St");
    await page.locator("#exampleInputDOB1").fill("1990-01-01");
    await page.getByPlaceholder("What is Your Favorite sports").fill("football");
    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(
      page.getByText("Register Successfully, please login")
    ).toBeVisible({ timeout: 10000 });
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Register form rejects invalid phone number", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("Enter Your Name").fill("Test User");
    await page.getByPlaceholder("Enter Your Email").fill("phonetest@example.com");
    await page.getByPlaceholder("Enter Your Password").fill("Password123");
    await page.getByPlaceholder("Enter Your Phone").fill("not-a-number");
    await page.getByPlaceholder("Enter Your Address").fill("123 Test St");
    await page.locator("#exampleInputDOB1").fill("1990-01-01");
    await page.getByPlaceholder("What is Your Favorite sports").fill("football");
    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(
      page.getByText("Phone number must contain only digits")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/register/);
  });

  test("Register with already-registered email shows API error toast", async ({
    page,
  }) => {
    // TEST_USER was registered in beforeAll — submitting the same email again
    // should trigger the duplicate-email rejection from the API.
    await page.goto("/register");
    await page.getByPlaceholder("Enter Your Name").fill(TEST_USER.name);
    await page.getByPlaceholder("Enter Your Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Enter Your Password").fill(TEST_USER.password);
    await page.getByPlaceholder("Enter Your Phone").fill(TEST_USER.phone);
    await page.getByPlaceholder("Enter Your Address").fill(TEST_USER.address);
    await page.locator("#exampleInputDOB1").fill(TEST_USER.DOB);
    await page.getByPlaceholder("What is Your Favorite sports").fill(TEST_USER.answer);
    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(
      page.getByText(/Already Register please login/i)
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*\/register/);
  });

  test("Register form rejects XSS input in name field", async ({ page }) => {
    await page.goto("/register");
    await page
      .getByPlaceholder("Enter Your Name")
      .fill('<script>alert("xss")</script>');
    await page.getByPlaceholder("Enter Your Email").fill("xsstest@example.com");
    await page.getByPlaceholder("Enter Your Password").fill("Password123");
    await page.getByPlaceholder("Enter Your Phone").fill("91234567");
    await page.getByPlaceholder("Enter Your Address").fill("123 Test St");
    await page.locator("#exampleInputDOB1").fill("1990-01-01");
    await page.getByPlaceholder("What is Your Favorite sports").fill("football");
    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(
      page.getByText("Invalid characters detected")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/register/);
  });


  test("Login page renders correct structure with unauthenticated nav links", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByText(/Virtual Vault/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "LOGIN FORM" })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/Enter Your Email/)
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "LOGIN" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Forgot Password" })
    ).toBeVisible();
    await expect(page.getByText(/All Rights Reserved/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  });

  test("Successful login shows username in header and persists on page reload", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Enter Your Email/).fill(TEST_USER.email);
    await page.getByPlaceholder("Enter Your Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(
      page.locator(".navbar").getByText(TEST_USER.name)
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();

    await page.reload();
    await expect(
      page.locator(".navbar").getByText(TEST_USER.name)
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
  });

  test("Login failure shows error toast and stays on login page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Enter Your Email/).fill(TEST_USER.email);
    await page.getByPlaceholder("Enter Your Password").fill("WrongPassword999");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(
      page.getByText(/Invalid Password/i)
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Login form rejects whitespace-only password without calling API", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Enter Your Email/).fill("user@example.com");
    await page.getByPlaceholder("Enter Your Password").fill("   ");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(
      page.getByText("Password cannot be whitespace only")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Login form rejects XSS in password without calling API", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Enter Your Email/).fill("user@example.com");
    await page
      .getByPlaceholder("Enter Your Password")
      .fill('<script>alert("xss")</script>');
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(
      page.getByText("Invalid characters detected")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Forgot Password button on login page navigates to forgot-password page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Forgot Password" }).click();

    await page.waitForURL(/\/forgot-password/, { timeout: 5000 });
    await expect(
      page.getByRole("heading", { name: "FORGOT PASSWORD FORM" })
    ).toBeVisible();
  });


  test("Forgot Password page renders correct structure", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByText(/Virtual Vault/)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "FORGOT PASSWORD FORM" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Email")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Answer")).toBeVisible();
    await expect(
      page.getByPlaceholder("Enter Your New Password")
    ).toBeVisible();
    await expect(page.getByText(/All Rights Reserved/)).toBeVisible();
  });

  test("Successful password reset shows toast and redirects to login", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("Enter Your Email").fill(RESET_USER.email);
    await page.getByPlaceholder("Enter Your Answer").fill(RESET_USER.answer);
    await page
      .getByPlaceholder("Enter Your New Password")
      .fill("NewResetPassword789");
    await page.getByRole("button", { name: "FORGOT PASSWORD" }).click();

    await expect(
      page.getByText("Password Reset Successfully")
    ).toBeVisible({ timeout: 10000 });
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("Forgot Password failure shows error toast on wrong security answer", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("Enter Your Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Enter Your Answer").fill("wronganswer");
    await page.getByPlaceholder("Enter Your New Password").fill("NewPass456");
    await page.getByRole("button", { name: "FORGOT PASSWORD" }).click();

    await expect(
      page.getByText("Wrong Email Or Answer")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forgot-password/);
  });

  test("Forgot Password form rejects XSS in answer without calling API", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("Enter Your Email").fill("user@example.com");
    await page
      .getByPlaceholder("Enter Your Answer")
      .fill('<script>alert("xss")</script>');
    await page.getByPlaceholder("Enter Your New Password").fill("NewPass123");
    await page.getByRole("button", { name: "FORGOT PASSWORD" }).click();

    await expect(
      page.getByText("Invalid characters detected")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forgot-password/);
  });

  test("Forgot Password form rejects whitespace-only answer without calling API", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("Enter Your Email").fill("user@example.com");
    await page.getByPlaceholder("Enter Your Answer").fill("   ");
    await page.getByPlaceholder("Enter Your New Password").fill("NewPass123");
    await page.getByRole("button", { name: "FORGOT PASSWORD" }).click();

    await expect(
      page.getByText("Answer cannot be whitespace only")
    ).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forgot-password/);
  });


  test("Unauthenticated access to /dashboard/user shows spinner redirect", async ({
    page,
  }) => {
    await page.goto("/dashboard/user");

    await expect(
      page.getByText(/redirecting to you in/i)
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".dashboard")).not.toBeVisible();
  });

  test("Authenticated user can access /dashboard/user and sees profile info", async ({
    page,
  }) => {
    await loginViaUI(page);

    await page.goto("/dashboard/user");
    await page.waitForSelector(".dashboard", { timeout: 10000 });

    await expect(
      page.locator(".dashboard").getByText(TEST_USER.name)
    ).toBeVisible();
    await expect(
      page.locator(".dashboard").getByText(TEST_USER.email)
    ).toBeVisible();
    await expect(page.getByText(/redirecting to you in/i)).not.toBeVisible();
  });

  test("Dashboard shows UserMenu with Profile and Orders navigation links", async ({
    page,
  }) => {
    await loginViaUI(page);

    await page.goto("/dashboard/user");
    await page.waitForSelector(".dashboard", { timeout: 10000 });

    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
  });


  test("Logout clears session, restores nav links, and blocks dashboard access", async ({
    page,
  }) => {
    await loginViaUI(page);

    await expect(
      page.locator(".navbar").getByText(TEST_USER.name)
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();

    await page.locator(".navbar").getByText(TEST_USER.name).click();
    await expect(
      page.getByRole("link", { name: "Logout" })
    ).toBeVisible({ timeout: 3000 });
    await page.getByRole("link", { name: "Logout" }).click();

    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(
      page.locator(".navbar").getByText(TEST_USER.name)
    ).not.toBeVisible();

    await page.goto("/dashboard/user");
    await expect(
      page.getByText(/redirecting to you in/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
