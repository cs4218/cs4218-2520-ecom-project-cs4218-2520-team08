import React from "react";
import { render, waitFor, within } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu" />);

jest.mock("../../components/Layout", () => {
  return function LayoutMock({ title, children }) {
    return (
      <div>
        <div data-testid="layout-title">{title}</div>
        {children}
      </div>
    );
  };
});

const mockMomentFromNow = jest.fn(() => "some time ago");
jest.mock("moment", () => {
  return function momentMock() {
    return { fromNow: mockMomentFromNow };
  };
});

const { useAuth } = require("../../context/auth");

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    function matchMedia() {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {},
      };
    };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Orders page", () => {
  it("does not fetch orders when auth token is missing", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);

    // Act
    const { getByText } = render(<Orders />);

    // Assert
    expect(getByText("All Orders")).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("fetches orders when auth token exists", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: [] });

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders"));
  });

  it("renders order row fields (status, buyer, date, payment, quantity)", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({
      data: [
        {
          status: "Processing",
          buyer: { name: "Alice" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true },
          products: [{ _id: "p1", name: "N", description: "D".repeat(40), price: 10 }],
        },
      ],
    });

    // Act
    const { findByText, getByText } = render(<Orders />);

    // Assert
    const statusCell = await findByText("Processing");
    expect(getByText("Alice")).toBeInTheDocument();
    expect(getByText("Success")).toBeInTheDocument();
    const row = statusCell.closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row).getAllByRole("cell");
    // cells: [#, status, buyer, date, payment, quantity]
    expect(cells[1]).toHaveTextContent("Processing");
    expect(cells[2]).toHaveTextContent("Alice");
    expect(cells[4]).toHaveTextContent("Success");
    expect(cells[5]).toHaveTextContent("1"); // quantity
    expect(mockMomentFromNow).toHaveBeenCalledTimes(1);
  });

  it("renders Failed when payment.success is false", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({
      data: [
        {
          status: "Done",
          buyer: { name: "Bob" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: false },
          products: [{ _id: "p1", name: "N", description: "desc", price: 10 }],
        },
      ],
    });

    // Act
    const { findByText } = render(<Orders />);

    // Assert
    expect(await findByText("Failed")).toBeInTheDocument();
  });

  it("renders product cards with image src, name, truncated description and price", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const longDescription = "abcdefghijklmnopqrstuvwxyz1234567890EXTRA";
    axios.get.mockResolvedValueOnce({
      data: [
        {
          status: "S",
          buyer: { name: "C" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true },
          products: [
            {
              _id: "p123",
              name: "Product Name",
              description: longDescription,
              price: 99,
            },
          ],
        },
      ],
    });

    // Act
    const { findByText, getByAltText } = render(<Orders />);

    // Assert
    expect(await findByText("Product Name")).toBeInTheDocument();
    expect(await findByText(longDescription.substring(0, 30))).toBeInTheDocument();
    expect(await findByText("Price : 99")).toBeInTheDocument();

    const img = getByAltText("Product Name");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/p123");
  });

  it("logs error when fetching orders fails", async () => {
    // Arrange
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    const err = new Error("network");
    axios.get.mockRejectedValueOnce(err);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(logSpy).toHaveBeenCalledWith(err);
    logSpy.mockRestore();
  });
});

