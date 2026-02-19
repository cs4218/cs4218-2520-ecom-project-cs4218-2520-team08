import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import CategoryProduct from "./CategoryProduct";

var mockNavigate = jest.fn();
var mockParams = { slug: "electronics" };
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

const mockSetCart = jest.fn();
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));
jest.mock("../context/cart", () => ({
  useCart: jest.fn(() => [[], mockSetCart]),
}));
jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);
jest.mock("../styles/CategoryProductStyles.css", () => ({}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return { matches: false, addListener: () => {}, removeListener: () => {} };
  };

const mockCategory = { _id: "cat1", name: "Electronics" };

const mockProducts = [
  {
    _id: "1",
    name: "Product A",
    slug: "product-a",
    description:
      "A long description for product A that will be truncated at sixty chars",
    price: 19.99,
  },
  {
    _id: "2",
    name: "Product B",
    slug: "product-b",
    description:
      "A long description for product B that will be truncated at sixty chars",
    price: 29.99,
  },
];

const mockManyProducts = Array.from({ length: 8 }, (_, i) => ({
  _id: `${i + 1}`,
  name: `Product ${i + 1}`,
  slug: `product-${i + 1}`,
  description:
    "A description that is long enough to be truncated by substring",
  price: 9.99 + i,
}));

const renderWithRouter = (slug = "electronics") => {
  mockParams = { slug };
  return render(
    <MemoryRouter initialEntries={[`/category/${slug}`]}>
      <Routes>
        <Route path="/category/:slug" element={<CategoryProduct />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("CategoryProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { slug: "electronics" };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Rendering after data fetch", () => {
    it("displays category name and result count after fetch resolves", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      // Act
      renderWithRouter("electronics");

      await waitFor(() => {
        expect(screen.getByText(/Category - Electronics/)).toBeInTheDocument();
      });

      // Assert
      expect(screen.getByText("2 result found")).toBeInTheDocument();
    });

    it("renders product cards with name, truncated description, and formatted price", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Product A")).toBeInTheDocument();
      });

      // Assert
      expect(screen.getByText("Product B")).toBeInTheDocument();
      expect(screen.getByText(/\$19\.99/)).toBeInTheDocument();
      expect(screen.getByText(/\$29\.99/)).toBeInTheDocument();
      expect(
        screen.getByText((content) =>
          content.includes("A long description for product A that will be truncat")
        )
      ).toBeInTheDocument();
    });

    it("renders product images with correct src and alt", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByAltText("Product A")).toBeInTheDocument();
      });

      // Assert
      const img = screen.getByAltText("Product A");
      expect(img).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/1"
      );
    });
  });

  describe("Happy-path API", () => {
    it("calls correct endpoint on mount", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      // Act
      renderWithRouter("electronics");

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-category/electronics"
        );
      });

      // Assert
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error-path API", () => {
    it("renders gracefully when fetch rejects", async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // Assert
      expect(screen.getByText(/result found/)).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe("Conditional rendering", () => {
    it("shows 0 result found when products is empty", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: [], category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("0 result found")).toBeInTheDocument();
      });

      // Assert
      expect(screen.queryByText("Product A")).not.toBeInTheDocument();
    });

    it("does not show Loadmore when products length <= 6", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Product A")).toBeInTheDocument();
      });

      // Assert
      expect(screen.queryByText("Loadmore")).not.toBeInTheDocument();
    });

    it("shows Loadmore when products length > 6", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockManyProducts, category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });

      // Assert
      expect(screen.getByText("Load more")).toBeInTheDocument();
    });

    it("shows Loading ... label while refetch is in progress and products already exist", async () => {
      // Arrange
      let resolveSecondRequest;
      const secondRequestPromise = new Promise((resolve) => {
        resolveSecondRequest = resolve;
      });
      axios.get
        .mockResolvedValueOnce({
          data: { products: mockManyProducts, category: mockCategory },
        })
        .mockImplementationOnce(() => secondRequestPromise);

      // Act
      const { rerender } = renderWithRouter("electronics");
      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });

      mockParams = { slug: "electronics-new" };
      rerender(
        <MemoryRouter initialEntries={["/category/electronics-new"]}>
          <Routes>
            <Route path="/category/:slug" element={<CategoryProduct />} />
          </Routes>
        </MemoryRouter>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Loading ...")).toBeInTheDocument();
      });

      resolveSecondRequest({
        data: { products: mockManyProducts, category: mockCategory },
      });

      // ensure all async state updates settle before test exits
      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });
    });
  });

  describe("Pagination (Load more)", () => {
    it("clicking Loadmore reveals more products", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockManyProducts, category: mockCategory },
      });

      // Act
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Load more")).toBeInTheDocument();
      });

      // Assert: initially only 6 products visible (Product 1..6)
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 6")).toBeInTheDocument();
      expect(screen.queryByText("Product 7")).not.toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByText("Load more"));

      // Assert: after click, all 8 visible
      await waitFor(() => {
        expect(screen.getByText("Product 7")).toBeInTheDocument();
      });
      expect(screen.getByText("Product 8")).toBeInTheDocument();
    });
  });

  describe("Add to Cart", () => {
    it("clicking ADD TO CART calls setCart, localStorage.setItem, and toast.success", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Product A")).toBeInTheDocument();
      });

      // Act
      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      // Assert
      expect(mockSetCart).toHaveBeenCalledWith([mockProducts[0]]);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "cart",
        JSON.stringify([mockProducts[0]])
      );
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });

  describe("Navigation", () => {
    it("clicking More Details navigates to product detail page", async () => {
      // Arrange
      axios.get.mockResolvedValueOnce({
        data: { products: mockProducts, category: mockCategory },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Product A")).toBeInTheDocument();
      });

      // Act
      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[0]);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("/product/product-a");
    });
  });

  describe("Edge case", () => {
    it("does not call API when params.slug is undefined", () => {
      // Arrange & Act
      mockParams = {};
      render(
        <MemoryRouter initialEntries={["/category"]}>
          <Routes>
            <Route path="/category" element={<CategoryProduct />} />
            <Route path="/category/:slug" element={<CategoryProduct />} />
          </Routes>
        </MemoryRouter>
      );

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
