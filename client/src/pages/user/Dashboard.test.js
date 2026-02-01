import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

jest.mock("../../context/auth");
jest.mock("../../components/Layout", () => {
  return function Layout({ children, title }) {
    return (
      <div data-testid="layout" data-title={title}>
        {children}
      </div>
    );
  };
});
jest.mock("../../components/UserMenu", () => {
  return function UserMenu() {
    return <div data-testid="user-menu">User Menu</div>;
  };
});

describe("Dashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Dashboard with Layout", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "test@example.com",
          address: "123 Street",
        },
      },
      jest.fn(),
    ]);

    const { getByTestId } = render(<Dashboard />);

    const layout = getByTestId("layout");
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveAttribute("data-title", "Dashboard - Ecommerce App");
  });

  it("renders UserMenu component", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "test@example.com",
          address: "123 Street",
        },
      },
      jest.fn(),
    ]);

    const { getByTestId } = render(<Dashboard />);

    expect(getByTestId("user-menu")).toBeInTheDocument();
  });

  it("displays user name from auth context", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "test@example.com",
          address: "123 Street",
        },
      },
      jest.fn(),
    ]);

    const { getByText } = render(<Dashboard />);

    expect(getByText("John Doe")).toBeInTheDocument();
  });

  it("displays user email from auth context", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "test@example.com",
          address: "123 Street",
        },
      },
      jest.fn(),
    ]);

    const { getByText } = render(<Dashboard />);

    expect(getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays user address from auth context", () => {
    useAuth.mockReturnValue([
      {
        user: {
          name: "John Doe",
          email: "test@example.com",
          address: "123 Street",
        },
      },
      jest.fn(),
    ]);

    const { getByText } = render(<Dashboard />);

    expect(getByText("123 Street")).toBeInTheDocument();
  });

  it("handles null/undefined auth", () => {
    useAuth.mockReturnValue([null, jest.fn()]);

    const { container } = render(<Dashboard />);

    expect(container).toBeInTheDocument();
  });

  it("handles undefined user in auth", () => {
    useAuth.mockReturnValue([{ user: null }, jest.fn()]);

    const { container } = render(<Dashboard />);

    expect(container).toBeInTheDocument();
  });
});
