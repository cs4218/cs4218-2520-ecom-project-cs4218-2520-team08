import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Products from "./Products";

// ---- mocks ----
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

function renderProductsPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/products"]}>
      <Routes>
        <Route path="/dashboard/admin/products" element={<Products />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Admin Products page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls GET /get-product on mount and renders products (success path)", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: [
          {
            _id: "p1",
            name: "MacBook",
            slug: "macbook",
            description: "Laptop",
          },
          {
            _id: "p2",
            name: "iPhone",
            slug: "iphone",
            description: "Phone",
          },
        ],
      },
    });

    renderProductsPage();

    expect(screen.getByText("All Products List")).toBeInTheDocument();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product")
    );

    // Cards content
    expect(screen.getByText("MacBook")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("iPhone")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();

    // Links go to the right admin edit route
    const macbookLink = screen.getByRole("link", { name: /macbook/i });
    expect(macbookLink).toHaveAttribute(
      "href",
      "/dashboard/admin/product/macbook"
    );

    const iphoneLink = screen.getByRole("link", { name: /iphone/i });
    expect(iphoneLink).toHaveAttribute(
      "href",
      "/dashboard/admin/product/iphone"
    );

    // Images have correct src
    expect(screen.getByAltText("MacBook")).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1"
    );
    expect(screen.getByAltText("iPhone")).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p2"
    );
  });

  test("renders header when products list is empty (empty partition)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { products: [] },
    });

    renderProductsPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(screen.getByText("All Products List")).toBeInTheDocument();
    // no product links
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  test("shows toast error if GET fails (catch branch)", async () => {
    axios.get.mockRejectedValueOnce(new Error("network error"));

    renderProductsPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith("Someething Went Wrong");
  });
});
