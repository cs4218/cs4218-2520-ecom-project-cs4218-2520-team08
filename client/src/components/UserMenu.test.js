import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UserMenu from "./UserMenu";

describe("UserMenu Component", () => {
  it("renders Dashboard heading", () => {
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    expect(getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders Profile link with correct path", () => {
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    const profileLink = getByText("Profile");
    expect(profileLink).toBeInTheDocument();
    expect(profileLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/user/profile"
    );
  });

  it("renders Orders link with correct path", () => {
    const { getByText } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    const ordersLink = getByText("Orders");
    expect(ordersLink).toBeInTheDocument();
    expect(ordersLink.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/user/orders"
    );
  });
});
