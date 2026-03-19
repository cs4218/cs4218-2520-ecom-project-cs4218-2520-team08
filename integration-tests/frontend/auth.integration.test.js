import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Login from "../../client/src/pages/Auth/Login";
import Register from "../../client/src/pages/Auth/Register";
import ForgotPassword from "../../client/src/pages/Auth/ForgotPassword";
import Layout from "../../client/src/components/Layout";
import Dashboard from "../../client/src/pages/user/Dashboard";
import PrivateRoute from "../../client/src/components/Routes/Private";
import { AuthProvider } from "../../client/src/context/auth";
import { CartProvider } from "../../client/src/context/cart";
import { SearchProvider } from "../../client/src/context/search";

jest.mock("axios");
jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  const toast = Object.assign(jest.fn(), { success, error });
  return {
    __esModule: true,
    default: toast,
    Toaster: () => null,
    success,
    error,
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const localStorageData = {};
const localStorageMock = {
  getItem: jest.fn((key) => localStorageData[key] ?? null),
  setItem: jest.fn((key, value) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  }),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

const renderWithProviders = (ui, { route = "/" } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Routes>
              <Route path="*" element={ui} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard/user" element={<Dashboard />} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

const waitForAsyncUpdates = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 0)));

let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  axios.get.mockImplementation((url) => {
    if (url.includes("/get-category")) {
      return Promise.resolve({ data: { success: true, category: [] } });
    }
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// Tsui Yi Wern, A0266070J
describe("Frontend Integration: Auth Components", () => {
  describe("Login page within full Layout", () => {
    it("renders Header, Footer, and Login form together", async () => {
      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();

      expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /LOGIN/i })).toBeInTheDocument();

      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });

    it("shows Register and Login nav links when no user is authenticated", async () => {
      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getAllByText("Login").length).toBeGreaterThan(0);
    });
  });

  describe("Login success and auth context update", () => {
    it("after successful login the Header shows the username and hides Login link", async () => {
      const mockUser = { _id: "u1", name: "Jane Doe", email: "jane@example.com", role: 0 };
      axios.post.mockResolvedValueOnce({
        data: { success: true, message: "login successfully", user: mockUser, token: "fake-token" },
      });

      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      expect(screen.getAllByText("Login").length).toBeGreaterThan(0);

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /LOGIN/i }));

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      });

      expect(screen.queryByRole("link", { name: /^Login$/ })).not.toBeInTheDocument();
    });

    it("saves auth data to localStorage after successful login", async () => {
      const mockUser = { _id: "u1", name: "Jane Doe", email: "jane@example.com", role: 0 };
      axios.post.mockResolvedValueOnce({
        data: { success: true, message: "login successfully", user: mockUser, token: "fake-token" },
      });

      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /LOGIN/i }));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "auth",
          expect.stringContaining("Jane Doe")
        );
      });
    });

    it("shows error toast when login response indicates failure", async () => {
      const { default: toast } = require("react-hot-toast");
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Invalid Password" },
      });

      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "jane@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "wrongpassword" },
      });
      fireEvent.click(screen.getByRole("button", { name: /LOGIN/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid Password");
      });
    });
  });

  describe("Login form validation", () => {
    it("shows error toast for whitespace-only password and does not call API", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "   " },
      });
      fireEvent.click(screen.getByRole("button", { name: /LOGIN/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Password cannot be whitespace only");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error toast for XSS in password and does not call API", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<Login />, { route: "/login" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: '<script>alert("xss")</script>' },
      });
      fireEvent.click(screen.getByRole("button", { name: /LOGIN/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("Forgot Password button navigates to the forgot-password page", async () => {
      render(
        <MemoryRouter initialEntries={["/login"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/forgot-password"
                    element={<div data-testid="forgot-password-page">Forgot Password</div>}
                  />
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitForAsyncUpdates();

      fireEvent.click(screen.getByRole("button", { name: /Forgot Password/i }));

      await waitFor(() => {
        expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
      });
    });
  });

  describe("ForgotPassword page", () => {
    it("renders form within Layout with Header and Footer", async () => {
      renderWithProviders(<ForgotPassword />, { route: "/forgot-password" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText("FORGOT PASSWORD FORM")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your Answer")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter Your New Password")).toBeInTheDocument();
      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });

    it("shows success toast and navigates to login page after successful reset", async () => {
      const { default: toast } = require("react-hot-toast");
      axios.post.mockResolvedValueOnce({
        data: { success: true, message: "Password Reset Successfully" },
      });

      render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Answer"), {
        target: { value: "football" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /FORGOT PASSWORD/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Password Reset Successfully");
      });
      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
    });

    it("shows error toast when reset fails", async () => {
      const { default: toast } = require("react-hot-toast");
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Wrong Email Or Answer" },
      });

      renderWithProviders(<ForgotPassword />, { route: "/forgot-password" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Answer"), {
        target: { value: "wronganswer" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /FORGOT PASSWORD/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Wrong Email Or Answer");
      });
    });

    it("shows error toast for XSS in answer and does not call API", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<ForgotPassword />, { route: "/forgot-password" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Answer"), {
        target: { value: '<script>alert("xss")</script>' },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpass123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /FORGOT PASSWORD/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error toast for whitespace-only answer and does not call API", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<ForgotPassword />, { route: "/forgot-password" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Answer"), {
        target: { value: "   " },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpass123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /FORGOT PASSWORD/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Answer cannot be whitespace only");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe("Private route access control", () => {
    it("renders Spinner countdown when no auth token is present in context", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route element={<PrivateRoute />}>
                    <Route
                      path="/dashboard/user"
                      element={<div data-testid="protected-content">Protected</div>}
                    />
                  </Route>
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitForAsyncUpdates();

      expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("does not call user-auth API when no token exists in context", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route element={<PrivateRoute />}>
                    <Route
                      path="/dashboard/user"
                      element={<div data-testid="protected-content">Protected</div>}
                    />
                  </Route>
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitForAsyncUpdates();

      const authApiCalls = axios.get.mock.calls.filter((c) => c[0].includes("user-auth"));
      expect(authApiCalls).toHaveLength(0);
    });

    it("renders protected content when auth API returns ok: true", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u1", name: "Alice", email: "alice@example.com", role: 0 },
        token: "valid-token",
      });
      axios.get.mockImplementation((url) => {
        if (url.includes("/user-auth")) return Promise.resolve({ data: { ok: true } });
        if (url.includes("/get-category")) return Promise.resolve({ data: { success: true, category: [] } });
        return Promise.resolve({ data: {} });
      });

      render(
        <MemoryRouter initialEntries={["/dashboard/user"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route element={<PrivateRoute />}>
                    <Route
                      path="/dashboard/user"
                      element={<div data-testid="protected-content">Protected</div>}
                    />
                  </Route>
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      });
      expect(screen.queryByText(/redirecting to you in/i)).not.toBeInTheDocument();
    });
  });

  describe("Register form validation", () => {
    it("shows error toast for XSS input in name without making an API call", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<Register />, { route: "/register" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: '<script>alert("xss")</script>' },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "xss@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "pass123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "12345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "1990-01-01" },
      });
      fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "football" },
      });
      fireEvent.click(screen.getByRole("button", { name: /REGISTER/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("shows error toast for invalid phone number without making an API call", async () => {
      const { default: toast } = require("react-hot-toast");
      renderWithProviders(<Register />, { route: "/register" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "not-a-number" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Main Street" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "1990-01-01" },
      });
      fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "basketball" },
      });
      fireEvent.click(screen.getByRole("button", { name: /REGISTER/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Phone number must contain only digits");
      });
      expect(axios.post).not.toHaveBeenCalled();
    });

    it("renders Register form within Layout with Header and Footer", async () => {
      renderWithProviders(<Register />, { route: "/register" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });

    it("calls axios.post on valid form submission", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      renderWithProviders(<Register />, { route: "/register" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "12345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Main Street" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "1990-01-01" },
      });
      fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "basketball" },
      });
      fireEvent.click(screen.getByRole("button", { name: /REGISTER/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/register",
          expect.objectContaining({ name: "John Doe", email: "john@example.com" })
        );
      });
    });

    it("shows success toast and navigates to login page after successful registration", async () => {
      const { default: toast } = require("react-hot-toast");
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      render(
        <MemoryRouter initialEntries={["/register"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route path="/register" element={<Register />} />
                  <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "12345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Main Street" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "1990-01-01" },
      });
      fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "basketball" },
      });
      fireEvent.click(screen.getByRole("button", { name: /REGISTER/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Register Successfully, please login");
      });
      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
    });

    it("shows error toast when registration fails with an API error message", async () => {
      const { default: toast } = require("react-hot-toast");
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Already Register please login" },
      });

      renderWithProviders(<Register />, { route: "/register" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
        target: { value: "john@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "12345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Main Street" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
        target: { value: "1990-01-01" },
      });
      fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "basketball" },
      });
      fireEvent.click(screen.getByRole("button", { name: /REGISTER/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Already Register please login");
      });
    });
  });

  describe("Dashboard and user menu rendering", () => {
    it("renders user's profile info from auth context on Dashboard", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: {
          _id: "u1",
          name: "Alice Smith",
          email: "alice@example.com",
          address: "456 Park Ave",
          phone: "98765432",
          DOB: "1995-06-15",
          role: 0,
        },
        token: "valid-token",
      });
      axios.get.mockImplementation((url) => {
        if (url.includes("/get-category")) return Promise.resolve({ data: { success: true, category: [] } });
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(<Dashboard />, { route: "/dashboard/user" });
      await waitForAsyncUpdates();

      expect(screen.getByRole("heading", { name: "Alice Smith" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "alice@example.com" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "456 Park Ave" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "98765432" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "1995-06-15" })).toBeInTheDocument();
    });

    it("renders UserMenu with Profile and Orders navigation links on Dashboard", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u1", name: "Bob", email: "bob@example.com", role: 0 },
        token: "valid-token",
      });
      axios.get.mockImplementation((url) => {
        if (url.includes("/get-category")) return Promise.resolve({ data: { success: true, category: [] } });
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(<Dashboard />, { route: "/dashboard/user" });
      await waitForAsyncUpdates();

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
    });
  });

  describe("Logout flow", () => {
    it("after logout the username disappears and Login link reappears", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u1", name: "Jane Doe", email: "jane@example.com", role: 0 },
        token: "valid-token",
      });

      renderWithProviders(<Layout title="Test"><p>content</p></Layout>);
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: /^Login$/ })).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Logout"));

      await waitFor(() => {
        expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      });
      expect(screen.getByRole("link", { name: /^Login$/ })).toBeInTheDocument();
    });

    it("removes auth from localStorage on logout", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u1", name: "Jane Doe", email: "jane@example.com", role: 0 },
        token: "valid-token",
      });

      renderWithProviders(<Layout title="Test"><p>content</p></Layout>);
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Logout"));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("auth");
    });
  });

  describe("Auth session persistence from localStorage", () => {
    it("restores user and token from localStorage on initial render", async () => {
      const storedAuth = {
        user: { _id: "u2", name: "Stored User", email: "stored@example.com", role: 0 },
        token: "stored-token",
      };
      localStorageData["auth"] = JSON.stringify(storedAuth);

      const TestConsumer = () => {
        const { useAuth } = require("../../client/src/context/auth");
        const [auth] = useAuth();
        return (
          <div>
            <span data-testid="user-name">{auth?.user?.name || "no-user"}</span>
            <span data-testid="token">{auth?.token || "no-token"}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <TestConsumer />
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-name")).toHaveTextContent("Stored User");
      });
      expect(screen.getByTestId("token")).toHaveTextContent("stored-token");
    });

    it("Header shows the username from localStorage auth on first render", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u3", name: "Persisted User", email: "persisted@example.com", role: 0 },
        token: "persisted-token",
      });

      renderWithProviders(<Layout title="Test"><p>content</p></Layout>);
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText("Persisted User")).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: /^Login$/ })).not.toBeInTheDocument();
    });
  });
});
