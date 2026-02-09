// client/src/pages/admin/AdminOrders.test.js
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import { act } from "react-dom/test-utils";
import userEvent from "@testing-library/user-event";
import AdminOrders from "./AdminOrders";

jest.mock("axios");

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="mock-layout" data-title={title}>
    {children}
  </div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="mock-admin-menu">Admin Menu Component</div>
));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
const { useAuth } = require("../../context/auth");

// keep moment stable
jest.mock("moment", () => {
  return () => ({
    fromNow: () => "2 days ago",
  });
});

// mock antd Select into native <select>
jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, defaultValue }) => (
    <select
      data-testid="status-select"
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {children}
    </select>
  );
  const Option = ({ value, children }) => <option value={value}>{children}</option>;
  Select.Option = Option;
  return { Select };
});

function renderComponent() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
      <AdminOrders />
    </MemoryRouter>
  );
}

async function actUser(fn) {
  await act(async () => {
    await fn();
  });
}

describe("AdminOrders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("no token -> does not call GET (covers useEffect false branch)", async () => {
    useAuth.mockReturnValue([{}, jest.fn()]);

    renderComponent();

    await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  test("token -> GET renders order row including Success branch + quantity", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);

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

    renderComponent();

    expect(await screen.findByText("Alice")).toBeInTheDocument();

    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("2 days ago")).toBeInTheDocument();

    const row = screen.getByText("Alice").closest("tr");
    expect(row).toBeTruthy();

    expect(within(row).getAllByText(/^0$/).length).toBeGreaterThanOrEqual(1);

    expect(screen.getByTestId("status-select")).toBeInTheDocument();
  });

  test("token -> GET renders Failed branch + products list (covers products.map)", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);

    axios.get.mockResolvedValueOnce({
      data: [
        {
          _id: "order2",
          status: "Not Process",
          buyer: { name: "Bob" },
          createAt: "2026-01-01T00:00:00.000Z",
          payment: { success: false },
          products: [
            {
              _id: "product1",
              name: "Laptop Computer",
              description: "High performance laptop with extra long description",
              price: 1500,
            },
          ],
        },
      ],
    });

    renderComponent();

    expect(await screen.findByText("Bob")).toBeInTheDocument();

    expect(screen.getByText("Failed")).toBeInTheDocument();

    const row = screen.getByText("Bob").closest("tr");
    expect(row).toBeTruthy();

    expect(within(row).getAllByText(/^1$/).length).toBeGreaterThanOrEqual(1);

    // product rendering
    expect(screen.getByText("Laptop Computer")).toBeInTheDocument();

    // description is often truncated in UI; just assert a stable substring
    expect(screen.getByText(/High performance laptop/i)).toBeInTheDocument();

    expect(screen.getByText(/Price\s*:\s*1500/)).toBeInTheDocument();

    const img = screen.getByAltText("Laptop Computer");
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/product1");
    expect(img).toHaveAttribute("width", "100px");
    expect(img).toHaveAttribute("height", "100px");
  });

  test("handleChange success -> PUT called -> re-fetch GET called (covers handleChange try)", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);

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

    axios.put.mockResolvedValueOnce({ data: { ok: true } });

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

    renderComponent();

    expect(await screen.findByText("Alice")).toBeInTheDocument();

    const select = screen.getByTestId("status-select");
    await actUser(async () => {
      if (userEvent.selectOptions) {
        await userEvent.selectOptions(select, "Shipped");
      } else {
        select.value = "Shipped";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/order-status/order1", {
        status: "Shipped",
      })
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  test("getOrders catch -> GET rejects (covers catch block)", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);
    axios.get.mockRejectedValueOnce(new Error("GET fail"));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderComponent();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText("All Orders")).toBeInTheDocument();

    logSpy.mockRestore();
  });

  test("handleChange catch -> PUT rejects (covers catch block) and does not crash", async () => {
    useAuth.mockReturnValue([{ token: "t" }, jest.fn()]);

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

    axios.put.mockRejectedValueOnce(new Error("PUT fail"));

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderComponent();

    expect(await screen.findByText("Alice")).toBeInTheDocument();

    const select = screen.getByTestId("status-select");
    await actUser(async () => {
      if (userEvent.selectOptions) {
        await userEvent.selectOptions(select, "cancel");
      } else {
        select.value = "cancel";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(screen.getByText("All Orders")).toBeInTheDocument();

    logSpy.mockRestore();
  });
});
