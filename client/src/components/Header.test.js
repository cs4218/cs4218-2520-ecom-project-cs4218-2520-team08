import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Header from "./Header";

var mockAuthState;
var mockCartState;
var mockCategoriesState;
const mockSetAuth = jest.fn();

jest.mock("react-hot-toast");
jest.mock("../context/auth", () => ({
  useAuth: () => mockAuthState,
}));
jest.mock("../context/cart", () => ({
  useCart: () => mockCartState,
}));
jest.mock("../hooks/useCategory", () => () => mockCategoriesState);
jest.mock("./Form/SearchInput", () => () => (
  <div data-testid="search-input-stub">SearchInput</div>
));
jest.mock("antd", () => ({
  Badge: ({ count, children }) => (
    <div>
      <span data-testid="badge-count">{count}</span>
      {children}
    </div>
  ),
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return { matches: false, addListener: () => {}, removeListener: () => {} };
  };

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

describe("Header", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = [null, mockSetAuth];
    mockCartState = [[], jest.fn()];
    mockCategoriesState = [];
  });

  it("shows Register and Login links when user is not authenticated", () => {
    // Arrange
    mockAuthState = [null, mockSetAuth];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  });

  it("does not show Logout when user is not authenticated", () => {
    // Arrange
    mockAuthState = [null, mockSetAuth];

    // Act
    renderHeader();

    // Assert
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("shows user name and Logout when user is authenticated", () => {
    // Arrange
    mockAuthState = [
      { user: { name: "Keagan", role: 0 }, token: "token-1" },
      mockSetAuth,
    ];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByText("Keagan")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("shows user dashboard link for regular user", () => {
    // Arrange
    mockAuthState = [
      { user: { name: "User", role: 0 }, token: "token-1" },
      mockSetAuth,
    ];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard/user"
    );
  });

  it("shows admin dashboard link for admin user", () => {
    // Arrange
    mockAuthState = [
      { user: { name: "Admin", role: 1 }, token: "token-1" },
      mockSetAuth,
    ];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard/admin"
    );
  });

  it("clicking Logout clears auth, removes localStorage auth, and shows success toast", () => {
    // Arrange
    mockAuthState = [
      { user: { name: "User", role: 0 }, token: "token-1" },
      mockSetAuth,
    ];
    renderHeader();

    // Act
    fireEvent.click(screen.getByText("Logout"));

    // Assert
    expect(mockSetAuth).toHaveBeenCalledWith(
      expect.objectContaining({ user: null, token: "" })
    );
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });

  it("renders category links from useCategory hook", () => {
    // Arrange
    mockCategoriesState = [{ name: "Electronics", slug: "electronics" }];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute(
      "href",
      "/category/electronics"
    );
  });

  it("shows All Categories link", () => {
    // Arrange
    mockCategoriesState = [{ name: "Electronics", slug: "electronics" }];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: "All Categories" })).toHaveAttribute(
      "href",
      "/categories"
    );
  });

  it("renders brand, Home link, and Cart link", () => {
    // Arrange
    // Act
    renderHeader();

    // Assert
    expect(screen.getByRole("link", { name: /Virtual Vault/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
  });

  it("shows cart badge count from cart length", () => {
    // Arrange
    mockCartState = [[{ _id: "1" }, { _id: "2" }, { _id: "3" }], jest.fn()];

    // Act
    renderHeader();

    // Assert
    expect(screen.getByTestId("badge-count")).toHaveTextContent("3");
  });
});
