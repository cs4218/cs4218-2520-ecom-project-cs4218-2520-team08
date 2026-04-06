import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import SearchInput from "../../client/src/components/Form/SearchInput";
import Search from "../../client/src/pages/Search";
import Profile from "../../client/src/pages/user/Profile";
import Orders from "../../client/src/pages/user/Orders";
import Layout from "../../client/src/components/Layout";
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
              <Route path="/search" element={<Search />} />
              <Route path="/dashboard/user/profile" element={<Profile />} />
              <Route path="/dashboard/user/orders" element={<Orders />} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

const waitForAsyncUpdates = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);

  axios.get.mockImplementation((url) => {
    if (url.includes("/get-category")) {
      return Promise.resolve({ data: { success: true, category: [] } });
    }
    return Promise.resolve({ data: {} });
  });
});

describe("Frontend Integration: Search + Profile + Orders", () => {
  // Yeo Zi Yi, A0266292X
  describe("SearchInput + SearchProvider + Search page", () => {
    it("typing keyword and submitting updates shared search context and renders results on Search page", async () => {
      const results = [
        { _id: "p1", name: "Alpha", description: "Alpha description long enough", price: 10 },
        { _id: "p2", name: "Beta", description: "Beta description long enough", price: 20 },
      ];
      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/search/widget")) {
          return Promise.resolve({ data: results });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(
        <Layout title="Home">
          <p>home</p>
        </Layout>,
        { route: "/" }
      );
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Search"), {
        target: { value: "widget" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Alpha")).toBeInTheDocument();
      });
      expect(screen.getByText("Beta")).toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/widget");
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Profile page + auth context update", () => {
    it("submitting profile update updates auth context and localStorage", async () => {
      const { default: toast } = require("react-hot-toast");
      localStorageData["auth"] = JSON.stringify({
        user: {
          _id: "u1",
          name: "Old Name",
          email: "user@example.com",
          phone: "11111111",
          address: "Old Address",
          role: 0,
        },
        token: "valid-token",
      });

      axios.put.mockResolvedValueOnce({
        data: {
          updatedUser: {
            _id: "u1",
            name: "New Name",
            email: "user@example.com",
            phone: "99999999",
            address: "New Address",
            role: 0,
          },
        },
      });

      renderWithProviders(<Profile />, { route: "/dashboard/user/profile" });
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "New Name" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
        target: { value: "99999999" },
      });
      fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
        target: { value: "New Address" },
      });
      fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
      });
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          name: "New Name",
          phone: "99999999",
          address: "New Address",
        })
      );

      const stored = JSON.parse(localStorageData["auth"]);
      expect(stored.user.name).toBe("New Name");
      expect(stored.user.phone).toBe("99999999");
      expect(stored.user.address).toBe("New Address");
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Orders page with populated data", () => {
    it("renders order tables and product cards with images/names/prices and formatted date", async () => {
      localStorageData["auth"] = JSON.stringify({
        user: { _id: "u1", name: "Buyer", email: "buyer@example.com", role: 0 },
        token: "valid-token",
      });

      const orders = [
        {
          _id: "o1",
          status: "Shipped",
          buyer: { _id: "u1", name: "Buyer" },
          createAt: new Date(Date.now() - 60_000).toISOString(),
          payment: { success: true },
          products: [
            {
              _id: "p1",
              name: "Phone",
              description: "Phone description long enough for substring",
              price: 999,
            },
          ],
        },
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/auth/orders")) {
          return Promise.resolve({ data: orders });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithProviders(<Orders />, { route: "/dashboard/user/orders" });

      await waitFor(() => {
        expect(screen.getByText("All Orders")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
      });

      await waitFor(() => {
        expect(screen.getByText("Shipped")).toBeInTheDocument();
      });
      expect(screen.getAllByText("Buyer").length).toBeGreaterThan(0);
      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("Phone")).toBeInTheDocument();
      expect(screen.getByText(/Price : 999/)).toBeInTheDocument();

      const img = screen.getByAltText("Phone");
      expect(img.getAttribute("src")).toBe("/api/v1/product/product-photo/p1");

      await waitFor(() => {
        expect(screen.getByText(/ago$/i)).toBeInTheDocument();
      });
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Search results display with product cards", () => {
    it('renders each result as a card with name/description/price and "More Details" + "ADD TO CART" buttons', async () => {
      const results = [
        {
          _id: "p10",
          name: "Card Product",
          description: "This description is definitely longer than thirty characters.",
          price: 123,
        },
      ];

      axios.get.mockImplementation((url) => {
        if (url.includes("/api/v1/product/search/card")) {
          return Promise.resolve({ data: results });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <MemoryRouter initialEntries={["/"]}>
          <AuthProvider>
            <CartProvider>
              <SearchProvider>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <div>
                        <SearchInput />
                      </div>
                    }
                  />
                  <Route path="/search" element={<Search />} />
                </Routes>
              </SearchProvider>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      await waitForAsyncUpdates();

      fireEvent.change(screen.getByPlaceholderText("Search"), {
        target: { value: "card" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Card Product")).toBeInTheDocument();
      });
      expect(screen.getByText("$ 123")).toBeInTheDocument();
      expect(screen.getByText(/This description is definitely/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "More Details" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "ADD TO CART" })).toBeInTheDocument();
    });
  });

  describe("Layout integration sanity", () => {
    it("renders Header + Footer around children", async () => {
      renderWithProviders(
        <Layout title="Test">
          <p>child</p>
        </Layout>
      );
      await waitForAsyncUpdates();

      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText("child")).toBeInTheDocument();
      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });
  });
});

