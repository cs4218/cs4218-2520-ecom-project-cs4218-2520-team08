import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";

jest.mock("axios", () => ({
  defaults: {
    headers: {
      common: {},
    },
  },
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe("AuthProvider and useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.defaults.headers.common = {};
  });

  it("provides initial auth state with null user and empty token", () => {
    const TestComponent = () => {
      const [auth] = useAuth();
      return (
        <div>
          <div data-testid="user">
            {auth?.user === null ? "null" : "not-null"}
          </div>
          <div data-testid="token">{auth?.token || "empty"}</div>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId("user")).toHaveTextContent("null");
    expect(getByTestId("token")).toHaveTextContent("empty");
  });

  it("useAuth returns auth state and setAuth function", () => {
    const TestComponent = () => {
      const [auth, setAuth] = useAuth();
      expect(auth).toBeDefined();
      expect(typeof setAuth).toBe("function");
      return <div data-testid="test">Test</div>;
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(getByTestId("test")).toBeInTheDocument();
  });

  it("loads auth data from localStorage on mount", async () => {
    const mockAuthData = {
      user: { id: 1, name: "John Doe", email: "test@example.com" },
      token: "mockToken123",
    };

    window.localStorage.getItem.mockImplementation(() =>
      JSON.stringify(mockAuthData)
    );

    const TestComponent = () => {
      const [auth] = useAuth();
      return (
        <div>
          <div data-testid="user-name">{auth?.user?.name || "null"}</div>
          <div data-testid="token">{auth?.token || "empty"}</div>
        </div>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(window.localStorage.getItem).toHaveBeenCalledWith("auth");
    await waitFor(() => {
      expect(getByTestId("user-name")).toHaveTextContent("John Doe");
      expect(getByTestId("token")).toHaveTextContent("mockToken123");
    });
  });

  it("sets axios Authorization header when token changes", async () => {
    const mockAuthData = {
      user: { id: 1, name: "John Doe" },
      token: "testToken123",
    };

    window.localStorage.getItem.mockImplementation(() =>
      JSON.stringify(mockAuthData)
    );

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(axios.defaults.headers.common["Authorization"]).toBe(
        "testToken123"
      );
    });
  });

  it("sets axios Authorization header to empty string when no token", () => {
    window.localStorage.getItem.mockImplementation(() => null);

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    expect(axios.defaults.headers.common["Authorization"]).toBe("");
  });
});
