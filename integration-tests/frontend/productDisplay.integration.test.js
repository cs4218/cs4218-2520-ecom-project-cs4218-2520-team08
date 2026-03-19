// Yeo Zi Yi, A0266292X
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import ProductDetails from "../../client/src/pages/ProductDetails";
import CategoryProduct from "../../client/src/pages/CategoryProduct";
import Layout from "../../client/src/components/Layout";
import { AuthProvider } from "../../client/src/context/auth";
import { CartProvider } from "../../client/src/context/cart";
import { SearchProvider } from "../../client/src/context/search";

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

const sampleProduct = {
  _id: "prod1",
  name: "Test Widget",
  slug: "test-widget",
  description: "A high-quality test widget for testing purposes",
  price: 49.99,
  category: { _id: "cat1", name: "Electronics", slug: "electronics" },
  quantity: 10,
};

const sampleRelatedProducts = [
  { _id: "rel1", name: "Related Alpha", slug: "related-alpha", description: "Alpha product description for related items display", price: 29.99, category: { _id: "cat1", name: "Electronics" } },
  { _id: "rel2", name: "Related Beta", slug: "related-beta", description: "Beta product description for related items display here", price: 39.99, category: { _id: "cat1", name: "Electronics" } },
  { _id: "rel3", name: "Related Gamma", slug: "related-gamma", description: "Gamma product description for related items display here", price: 59.99, category: { _id: "cat1", name: "Electronics" } },
];

const sampleCategory = { _id: "cat1", name: "Electronics", slug: "electronics" };

const makeCategoryProducts = (count) =>
  Array.from({ length: count }, (_, i) => ({
    _id: `cprod${i + 1}`,
    name: `Category Product ${i + 1}`,
    slug: `category-product-${i + 1}`,
    description: `Description for category product number ${i + 1} with enough text`,
    price: 10 + i * 5,
    category: sampleCategory,
    quantity: i + 1,
  }));

const renderWithProviders = (ui, { route = "/" } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Routes>
              <Route path="*" element={ui} />
              <Route path="/product/:slug" element={<ProductDetails />} />
              <Route path="/category/:slug" element={<CategoryProduct />} />
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
});

// Keagan Pang, A0258729L
describe("Frontend Integration: Product Display", () => {
  describe("ProductDetails page + related products", () => {
    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/get-product/")) {
          return Promise.resolve({
            data: { success: true, product: sampleProduct },
          });
        }
        if (url.includes("/related-product/")) {
          return Promise.resolve({
            data: { success: true, products: sampleRelatedProducts },
          });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it("renders product details with name, description, price, and category", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Name : Test Widget/)).toBeInTheDocument();
      expect(screen.getByText(/Description : A high-quality test widget/)).toBeInTheDocument();
      expect(screen.getByText(/\$49\.99/)).toBeInTheDocument();
      expect(screen.getByText(/Category : Electronics/)).toBeInTheDocument();
      expect(screen.getByText("Related Alpha")).toBeInTheDocument();
    });

    it("renders related product cards with names and prices", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(screen.getByText("Related Alpha")).toBeInTheDocument();
      expect(screen.getByText("Related Beta")).toBeInTheDocument();
      expect(screen.getByText("Related Gamma")).toBeInTheDocument();
      expect(screen.getByText("$29.99")).toBeInTheDocument();
      expect(screen.getByText("$39.99")).toBeInTheDocument();
      expect(screen.getByText("$59.99")).toBeInTheDocument();
    });

    it("renders Header and Footer within Layout", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Name : Test Widget/)).toBeInTheDocument();
      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });

    it("calls the product and related-product API endpoints", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-widget");
      expect(axios.get).toHaveBeenCalledWith(
        `/api/v1/product/related-product/${sampleProduct._id}/${sampleProduct.category._id}`
      );
    });
  });

    describe("CategoryProduct page + pagination", () => {
    const eightProducts = makeCategoryProducts(8);

    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/product-category/")) {
          return Promise.resolve({
            data: { success: true, category: sampleCategory, products: eightProducts },
          });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it("renders category name and result count", async () => {
      renderWithProviders(<CategoryProduct />, { route: "/category/electronics" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Category - Electronics/)).toBeInTheDocument();
      expect(screen.getByText(/8 results found/)).toBeInTheDocument();
    });

    it("initially shows only 6 product cards", async () => {
      renderWithProviders(<CategoryProduct />, { route: "/category/electronics" });
      await waitForAsyncUpdates();

      for (let i = 1; i <= 6; i++) {
        expect(screen.getByText(`Category Product ${i}`)).toBeInTheDocument();
      }
      expect(screen.queryByText("Category Product 7")).not.toBeInTheDocument();
      expect(screen.queryByText("Category Product 8")).not.toBeInTheDocument();
    });

    it("shows Load more button and reveals remaining products on click", async () => {
      renderWithProviders(<CategoryProduct />, { route: "/category/electronics" });
      await waitForAsyncUpdates();

      expect(screen.getByRole("button", { name: /Load more/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Load more/i }));

      expect(screen.getByText("Category Product 7")).toBeInTheDocument();
      expect(screen.getByText("Category Product 8")).toBeInTheDocument();
    });

    it("hides Load more button after all products are shown", async () => {
      renderWithProviders(<CategoryProduct />, { route: "/category/electronics" });
      await waitForAsyncUpdates();

      expect(screen.getByRole("button", { name: /Load more/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Load more/i }));

      expect(screen.queryByRole("button", { name: /Load more/i })).not.toBeInTheDocument();
    });
  });

  describe("Add to cart from ProductDetails updates Header badge", () => {
    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/get-product/")) {
          return Promise.resolve({
            data: { success: true, product: sampleProduct },
          });
        }
        if (url.includes("/related-product/")) {
          return Promise.resolve({
            data: { success: true, products: [] },
          });
        }
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it("clicking ADD TO CART updates cart badge in Header", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Name : Test Widget/)).toBeInTheDocument();

      const addBtn = screen.getByRole("button", { name: /ADD TO CART/i });
      fireEvent.click(addBtn);

      const badge = document.querySelector(".ant-badge-count");
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe("1");
    });

    it("clicking ADD TO CART updates localStorage", async () => {
      renderWithProviders(<ProductDetails />, { route: "/product/test-widget" });
      await waitForAsyncUpdates();

      expect(screen.getByText(/Name : Test Widget/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /ADD TO CART/i }));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "cart",
        expect.stringContaining("Test Widget")
      );
    });
  });

  describe("Layout composes Header + content + Footer", () => {
    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        if (url.includes("/get-category")) {
          return Promise.resolve({ data: { success: true, category: [] } });
        }
        return Promise.resolve({ data: {} });
      });
    });

    it("renders Header with nav links", async () => {
      renderWithProviders(
        <Layout title="Test Page">
          <p>child content here</p>
        </Layout>
      );
      await waitForAsyncUpdates();

      expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Cart")).toBeInTheDocument();
    });

    it("renders Footer with links", async () => {
      renderWithProviders(
        <Layout title="Test Page">
          <p>child content here</p>
        </Layout>
      );
      await waitForAsyncUpdates();

      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
      expect(screen.getByText("About")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    });

    it("renders children in the main area", async () => {
      renderWithProviders(
        <Layout title="Test Page">
          <p>child content here</p>
        </Layout>
      );
      await waitForAsyncUpdates();

      expect(screen.getByText("child content here")).toBeInTheDocument();
    });

    it("shows Register and Login links when no user is authenticated", async () => {
      renderWithProviders(
        <Layout title="Test Page">
          <p>content</p>
        </Layout>
      );
      await waitForAsyncUpdates();

      expect(screen.getByText("Register")).toBeInTheDocument();
      expect(screen.getByText("Login")).toBeInTheDocument();
    });
  });
});
