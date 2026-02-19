import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import AdminMenu from "./AdminMenu";

describe("AdminMenu Component", () => {
  test("renders Admin Panel and all menu links", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/admin"]}>
        <Routes>
          <Route path="/dashboard/admin" element={<AdminMenu />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();

    // Link text presence
    expect(screen.getByRole("link", { name: "Create Category" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();

    // Ensure commented-out Users link is NOT rendered
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });

  test("links point to correct admin routes", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/admin"]}>
        <Routes>
          <Route path="/dashboard/admin" element={<AdminMenu />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Create Category" }))
      .toHaveAttribute("href", "/dashboard/admin/create-category");

    expect(screen.getByRole("link", { name: "Create Product" }))
      .toHaveAttribute("href", "/dashboard/admin/create-product");

    expect(screen.getByRole("link", { name: "Products" }))
      .toHaveAttribute("href", "/dashboard/admin/products");

    expect(screen.getByRole("link", { name: "Orders" }))
      .toHaveAttribute("href", "/dashboard/admin/orders");
  });

  test("highlights active link for current route (NavLink active class)", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <Routes>
          {/* render AdminMenu at the same route so NavLink can match */}
          <Route path="/dashboard/admin/create-product" element={<AdminMenu />} />
        </Routes>
      </MemoryRouter>
    );

    const createProductLink = screen.getByRole("link", { name: "Create Product" });
    const createCategoryLink = screen.getByRole("link", { name: "Create Category" });

    // In react-router-dom v6 NavLink adds "active" class when matched
    expect(createProductLink.className).toMatch(/active/);
    expect(createCategoryLink.className).not.toMatch(/active/);
  });
});
