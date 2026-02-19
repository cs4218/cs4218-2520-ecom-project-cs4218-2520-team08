import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ProductDetails from "./ProductDetails";

var mockNavigate = jest.fn();
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
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
jest.mock("../styles/ProductDetailsStyles.css", () => ({}));

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

const mockProduct = {
  _id: "1",
  name: "Test Product",
  slug: "test-product",
  description: "A great test product",
  price: 29.99,
  category: { _id: "cat1", name: "Electronics" },
  quantity: 10,
};

const mockRelatedProducts = [
  {
    _id: "2",
    name: "Related Product 1",
    slug: "related-product-1",
    description:
      "This is a related product with a long description that gets truncated",
    price: 19.99,
  },
  {
    _id: "3",
    name: "Related Product 2",
    slug: "related-product-2",
    description:
      "Another related product with a long description that also gets truncated",
    price: 39.99,
  },
];

const renderWithRouter = (slug = "test-product") =>
  render(
    <MemoryRouter initialEntries={[`/product/${slug}`]}>
      <Routes>
        <Route path="/product/:slug" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProductDetails", () => {
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation((...args) => {
        const [firstArg] = args;
        if (
          typeof firstArg === "string" &&
          firstArg.includes("not wrapped in act")
        ) {
          return;
        }
        // keep other console.error output visible
        // eslint-disable-next-line no-console
        console.warn(...args);
      });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering after data fetch", () => {
    it("fetches product on mount and displays name, description, price, category, and heading", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("Related Product 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Product Details")).toBeInTheDocument();
      expect(screen.getByText(/A great test product/)).toBeInTheDocument();
      expect(screen.getByText(/\$29\.99/)).toBeInTheDocument();
      expect(screen.getByText(/Electronics/)).toBeInTheDocument();
    });

    it("renders product image with correct src and alt", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByAltText("Test Product")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });

      const img = screen.getByAltText("Test Product");
      expect(img).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/1"
      );
    });
  });

  describe("Happy-path API calls", () => {
    it("calls get-product with slug on mount", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter("my-slug");

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/my-slug"
        );
      });
      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });
    });

    it("calls related-product after product loads with product id and category id", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/related-product/1/cat1"
        );
      });
      await waitFor(() => {
        expect(screen.getByText("Related Product 1")).toBeInTheDocument();
      });
    });
  });

  describe("Error-path API calls", () => {
    it("renders without crashing when getProduct rejects", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      axios.get.mockRejectedValueOnce(new Error("Network error"));

      renderWithRouter();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByText("Product Details")).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it("when getSimilarProduct rejects, product still renders and shows No Similar Products found", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockRejectedValueOnce(new Error("Related fetch failed"));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Conditional rendering", () => {
    it("shows No Similar Products found when related products array is empty", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
    });

    it("renders a card for each related product with name, truncated description, and formatted price", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByText("Related Product 1")).toBeInTheDocument();
      expect(screen.getByText("Related Product 2")).toBeInTheDocument();
      expect(screen.getByText(/\$19\.99/)).toBeInTheDocument();
      expect(screen.getByText(/\$39\.99/)).toBeInTheDocument();
      expect(
        screen.getByText((content) =>
          content.includes("long description that gets")
        )
      ).toBeInTheDocument();
    });
  });

  describe("Add to Cart — main product", () => {
    it("calls setCart with product when ADD TO CART is clicked", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      expect(mockSetCart).toHaveBeenCalledWith([mockProduct]);
    });

    it("calls localStorage.setItem with cart key and serialised cart", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "cart",
        JSON.stringify([mockProduct])
      );
    });

    it("calls toast.success with Item Added to cart", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: [] } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(/Test Product/)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[0]);

      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });

  describe("Add to Cart — related product", () => {
    it("calls setCart with related product when ADD TO CART on related card is clicked", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Related Product 1")).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[1]);

      expect(mockSetCart).toHaveBeenCalledWith([mockRelatedProducts[0]]);
    });

    it("calls localStorage.setItem and toast.success for related product add", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Related Product 2")).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByText("ADD TO CART");
      fireEvent.click(addToCartButtons[2]);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "cart",
        JSON.stringify([mockRelatedProducts[1]])
      );
      expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });

  describe("Navigation", () => {
    it("calls navigate with product slug when More Details on related product is clicked", async () => {
      axios.get
        .mockResolvedValueOnce({ data: { product: mockProduct } })
        .mockResolvedValueOnce({ data: { products: mockRelatedProducts } });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Related Product 1")).toBeInTheDocument();
      });

      const moreDetailsButtons = screen.getAllByText("More Details");
      fireEvent.click(moreDetailsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/product/related-product-1"
      );
    });
  });

  describe("Edge case", () => {
    it("does not call API when params.slug is undefined", () => {
      render(
        <MemoryRouter initialEntries={["/product"]}>
          <Routes>
            <Route path="/product" element={<ProductDetails />} />
            <Route path="/product/:slug" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      );

      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
