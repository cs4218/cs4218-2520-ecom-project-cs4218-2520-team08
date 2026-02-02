import React from "react";
import { render } from "@testing-library/react";
import Users from "./Users";

jest.mock("../../components/AdminMenu", () => () => <div data-testid="admin-menu" />);

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

describe("Users admin page", () => {
  it("sets the Layout title to Dashboard - All Users", () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByTestId } = render(<Users />);

    // Assert
    expect(getByTestId("layout-title")).toHaveTextContent("Dashboard - All Users");
  });

  it("renders the AdminMenu", () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByTestId } = render(<Users />);

    // Assert
    expect(getByTestId("admin-menu")).toBeInTheDocument();
  });

  it('renders the "All Users" heading', () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByRole } = render(<Users />);

    // Assert
    expect(getByRole("heading", { name: "All Users" })).toBeInTheDocument();
  });
});

