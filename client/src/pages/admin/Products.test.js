// client/src/pages/admin/Products.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...rest }) => (
    <a href={to} data-testid="product-link" {...rest}>
      {children}
    </a>
  ),
}));

describe("Products page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders header and AdminMenu", async () => {
    axios.get.mockResolvedValueOnce({ data: { products: [] } });

    render(<Products />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /all products list/i })).toBeInTheDocument();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product")
    );
  });

  test("fetches products on mount and renders product cards with correct links + images", async () => {
    const products = [
      {
        _id: "p1",
        slug: "prod-1",
        name: "Product 1",
        description: "Desc 1",
      },
      {
        _id: "p2",
        slug: "prod-2",
        name: "Product 2",
        description: "Desc 2",
      },
    ];
    axios.get.mockResolvedValueOnce({ data: { products } });

    render(<Products />);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    // 2 links rendered
    const links = screen.getAllByTestId("product-link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/dashboard/admin/product/prod-1");
    expect(links[1]).toHaveAttribute("href", "/dashboard/admin/product/prod-2");

    // Product names/descriptions
    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Desc 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
    expect(screen.getByText("Desc 2")).toBeInTheDocument();

    // Images use product-photo endpoint
    const img1 = screen.getByAltText("Product 1");
    const img2 = screen.getByAltText("Product 2");
    expect(img1).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    expect(img2).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
  });

  test("shows toast error when API call fails", async () => {
    const err = new Error("Network");
    axios.get.mockRejectedValueOnce(err);

    // Optional: silence console.log from component for this test
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(<Products />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Someething Went Wrong");
    });

    logSpy.mockRestore();
  });

  test("renders zero product links when products is undefined/null", async () => {
    axios.get.mockResolvedValueOnce({ data: { products: undefined } });

    render(<Products />);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
    expect(screen.queryAllByTestId("product-link")).toHaveLength(0);
  });
});
