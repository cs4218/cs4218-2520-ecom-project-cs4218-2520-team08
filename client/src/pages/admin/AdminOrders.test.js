import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import AdminOrders from "./AdminOrders";

jest.mock("axios");

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
const { useAuth } = require("../../context/auth");

// moment deterministic
jest.mock("moment", () => {
  return () => ({
    fromNow: () => "a moment ago",
  });
});

// mock antd Select as <select>
jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, defaultValue }) => (
    <select
      aria-label="status-select"
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => <option value={value}>{children}</option>;
  return { Select };
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

function renderAdminOrders() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
      <Routes>
        <Route path="/dashboard/admin/orders" element={<AdminOrders />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminOrders — high branch coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // IMPORTANT: stable mockReturnValue (not once) for React 18 double render/effects
    useAuth.mockReturnValue([{ token: "token123" }, jest.fn()]);
  });

  test("branch: auth.token missing -> does not fetch", async () => {
    useAuth.mockReturnValue([{}, jest.fn()]); // token missing branch

    renderAdminOrders();

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });

    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("branch: empty orders array renders header only", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderAdminOrders();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders")
    );

    expect(screen.getByText("All Orders")).toBeInTheDocument();
    // no table cells from orders
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  test("branches: payment success + no products, status options rendered", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order_success",
          status: "Processing",
          buyer: { name: "Alice" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true }, // Success branch
          products: [],               // products.map NOT taken
        },
      ],
    });

    renderAdminOrders();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument(); // products.length
    expect(screen.getByText("a moment ago")).toBeInTheDocument();

    // status.map branches (options exist)
    expect(screen.getByRole("option", { name: "Not Process" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Processing" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shipped" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "deliverd" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "cancel" })).toBeInTheDocument();
  });

  test("branches: payment failed + products present (products.map taken)", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order_failed",
          status: "Not Process",
          buyer: { name: "Bob" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: false }, // Failed branch
          products: [
            {
              _id: "p1",
              name: "MacBook",
              description: "abcdefghijklmnopqrstuvwxyz1234567890LONG",
              price: 1999,
            },
          ], // products.map taken
        },
      ],
    });

    renderAdminOrders();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // product rendering
    expect(screen.getByText("MacBook")).toBeInTheDocument();
    expect(screen.getByText("abcdefghijklmnopqrstuvwxyz1234")).toBeInTheDocument(); // substring(0,30)
    expect(screen.getByText("Price : 1999")).toBeInTheDocument();

    const img = screen.getByAltText("MacBook");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
  });

  test("branches: changing status -> PUT called -> refetch GET called again", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order1",
          status: "Processing",
          buyer: { name: "Alice" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true },
          products: [],
        },
      ],
    });

    axios.put.mockResolvedValueOnce({ data: { success: true } });

    // after PUT, getOrders() called again
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order1",
          status: "Shipped",
          buyer: { name: "Alice" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true },
          products: [],
        },
      ],
    });

    renderAdminOrders();

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("status-select"), {
      target: { value: "Shipped" },
    });

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order1",
        { status: "Shipped" }
      )
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  test("branch: getOrders catch path (GET fails) does not crash", async () => {
    axios.get.mockRejectedValueOnce(new Error("GET failed"));

    renderAdminOrders();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("branch: handleChange catch path (PUT fails) does not crash", async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order1",
          status: "Processing",
          buyer: { name: "Alice" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: true },
          products: [],
        },
      ],
    });

    axios.put.mockRejectedValueOnce(new Error("PUT failed"));

    renderAdminOrders();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("status-select"), {
      target: { value: "cancel" },
    });

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });
});
