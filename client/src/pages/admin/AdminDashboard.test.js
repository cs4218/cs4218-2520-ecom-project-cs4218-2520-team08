import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import AdminDashboard from "./AdminDashboard";


jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const { useAuth } = require("../../context/auth");

describe("AdminDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders admin details from auth context", () => {
    useAuth.mockReturnValueOnce([
      {
        user: {
          name: "Alice Admin",
          email: "alice@admin.com",
          phone: "1234567890",
        },
      },
      jest.fn(),
    ]);

    const { getByText, getByTestId } = render(
      <MemoryRouter initialEntries={["/dashboard/admin"]}>
        <Routes>
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    // Layout + menu exist
    expect(getByTestId("layout")).toBeInTheDocument();
    expect(getByTestId("admin-menu")).toBeInTheDocument();

    // Core behaviour: admin details appear
    expect(getByText("Admin Name : Alice Admin")).toBeInTheDocument();
    expect(getByText("Admin Email : alice@admin.com")).toBeInTheDocument();
    expect(getByText("Admin Contact : 1234567890")).toBeInTheDocument();
  });

  it("handles missing user data without crashing (auth is null/undefined)", () => {
    useAuth.mockReturnValueOnce([{}, jest.fn()]);

    const { getByText } = render(
      <MemoryRouter initialEntries={["/dashboard/admin"]}>
        <Routes>
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(getByText(/Admin Name :/i)).toBeInTheDocument();
    expect(getByText(/Admin Email :/i)).toBeInTheDocument();
    expect(getByText(/Admin Contact :/i)).toBeInTheDocument();
  });
});
