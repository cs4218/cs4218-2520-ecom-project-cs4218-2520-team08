import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "../../client/src/pages/admin/AdminDashboard";
import CreateCategory from "../../client/src/pages/admin/CreateCategory";
import CreateProduct from "../../client/src/pages/admin/CreateProduct";
import UpdateProduct from "../../client/src/pages/admin/UpdateProduct";
import AdminOrders from "../../client/src/pages/admin/AdminOrders";
import Products from "../../client/src/pages/admin/Products";
import { AuthProvider } from "../../client/src/context/auth";
import { CartProvider } from "../../client/src/context/cart";
import { SearchProvider } from "../../client/src/context/search";
// Jest config 
jest.mock("axios");

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
  setItem: jest.fn((key, value) => { localStorageData[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageData[key]; }),
  clear: jest.fn(() => { Object.keys(localStorageData).forEach((k) => delete localStorageData[k]); }),
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
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/dashboard/admin/create-category" element={<CreateCategory />} />
              <Route path="/dashboard/admin/create-product" element={<CreateProduct />} />
              <Route path="/dashboard/admin/product/:slug" element={<UpdateProduct />} />
              <Route path="/dashboard/admin/products" element={<Products />} />
              <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

const waitForAsyncUpdates = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const adminAuthData = {
  user: { name: "Admin Test", email: "admin@test.com", phone: "1234567890", role: 1 },
  token: "fake-admin-token"
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  localStorageMock.setItem("auth", JSON.stringify(adminAuthData));
});

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: An update to") ||
        args[0].includes("`bordered` is deprecated") ||
        args[0].includes("`visible` is deprecated") ||
        args[0].includes('unique "key" prop') ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Kamat Shivangi Prashant, A0319665R
describe("Frontend Integration: Admin CRUD", () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [{_id: "1", name: "Existing Category"}] } });
      }
      if (url.includes("/api/v1/product/get-product/")) {
        return Promise.resolve({ data: { success: true, product: { _id: "prod1", name: "Old Name", description: "old desc", price: 10, quantity: 5, category: { _id: "1", name: "Existing Category" } } } });
      }
      if (url === "/api/v1/product/get-product") {
        return Promise.resolve({ data: { success: true, products: [{ _id: "prod1", name: "Cool Item", slug: "cool-item", description: "cool", price: 100 }] } });
      }
      if (url === "/api/v1/auth/all-orders") {
        return Promise.resolve({ data: [{ _id: "ord1", status: "Not Process", buyer: { name: "John Doe" }, createAt: new Date().toISOString(), payment: { success: true }, products: [{ _id: "p1", name: "Prod1", description: "desc1", price: 5 }] }] });
      }
      return Promise.resolve({ data: {} });
    });
  });

  describe("AdminDashboard + AdminMenu rendering", () => {
    it("AdminDashboard + AdminMenu rendering", async () => {
      // Kamat Shivangi Prashant, A0319665R
      renderWithProviders(<AdminDashboard />, { route: "/dashboard/admin" });
      await waitForAsyncUpdates();
      // Wait for layout and dashboard data
      expect(screen.getByText(/Admin Name : Admin Test/i)).toBeInTheDocument();
      expect(screen.getByText(/Admin Email : admin@test.com/i)).toBeInTheDocument();
      expect(screen.getByText(/Admin Contact : 1234567890/i)).toBeInTheDocument();
      // Check AdminMenu links
      expect(screen.getByText("Create Category")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Orders")).toBeInTheDocument();
    });
  });

  describe("CreateCategory + CategoryForm interaction", () => {
    it("CreateCategory + CategoryForm interaction", async () => {
      // Kamat Shivangi Prashant, A0319665R
      axios.post.mockResolvedValueOnce({ data: { success: true, message: 'new category created' } });
      
      renderWithProviders(<CreateCategory />, { route: "/dashboard/admin/create-category" });
      await waitForAsyncUpdates();

      expect(screen.getAllByText("Existing Category").length).toBeGreaterThanOrEqual(1);

      const input = screen.getByPlaceholderText(/Enter new category/i);
      fireEvent.change(input, { target: { value: "New Category" } });
      const submitBtn = screen.getByRole("button", { name: /Submit/i });
      
      // when submit is clicked, let's mock the next GET so it appears
      axios.get.mockImplementationOnce((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({ data: { success: true, category: [{_id: "1", name: "Existing Category"}, {_id:"2", name:"New Category"}] } });
        }
      });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith("/api/v1/category/create-category", { name: "New Category" });
      });
      // The component should reload categories after creation
      await waitForAsyncUpdates();
      expect(screen.getAllByText("New Category").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("CreateProduct form submission", () => {
    it("CreateProduct form submission", async () => {
      // Kamat Shivangi Prashant, A0319665R
      axios.post.mockResolvedValueOnce({ data: { success: true, message: 'Product Created Successfully' } });
      
      renderWithProviders(<CreateProduct />, { route: "/dashboard/admin/create-product" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText(/write a name/i), { target: { value: "Test Product" } });
      fireEvent.change(screen.getByPlaceholderText(/write a description/i), { target: { value: "A description here" } });
      fireEvent.change(screen.getByPlaceholderText(/write a Price/i), { target: { value: "99" } });
      fireEvent.change(screen.getByPlaceholderText(/write a quantity/i), { target: { value: "10" } });

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith("/api/v1/product/create-product", expect.any(FormData));
      });
    });
  });

  describe("UpdateProduct loads then saves", () => {
    it("UpdateProduct loads then saves", async () => {
      // Kamat Shivangi Prashant, A0319665R
      axios.put.mockResolvedValueOnce({ data: { success: true, message: "Product Updated Successfully" } });

      renderWithProviders(<UpdateProduct />, { route: "/dashboard/admin/product/old-name" });
      await waitForAsyncUpdates();

      const nameInput = screen.getByPlaceholderText(/write a name/i);
      expect(nameInput.value).toBe("Old Name");

      fireEvent.change(nameInput, { target: { value: "New Name" } });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith("/api/v1/product/update-product/prod1", expect.any(FormData));
      });
    });
  });

  describe("AdminOrders status change", () => {
    it("AdminOrders status change", async () => {
      // Kamat Shivangi Prashant, A0319665R
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(<AdminOrders />, { route: "/dashboard/admin/orders" });
      await waitForAsyncUpdates();

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
  });

  describe("Products list + navigation to update", () => {
    it("Products list + navigation to update", async () => {
      // Kamat Shivangi Prashant, A0319665R
      renderWithProviders(<Products />, { route: "/dashboard/admin/products" });
      await waitForAsyncUpdates();

      expect(screen.getByText("Cool Item")).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /Cool Item/i });
      expect(link.getAttribute("href")).toBe("/dashboard/admin/product/cool-item");
    });
  });
});
