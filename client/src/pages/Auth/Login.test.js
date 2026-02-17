import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Login from "./Login";

// Mocking axios.post
jest.mock("axios");
jest.mock("react-hot-toast");

const mockAuth = {
  user: null,
  token: "",
};
const mockSetAuth = jest.fn();
const mockNavigate = jest.fn();
const mockLocation = { state: null };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [mockAuth, mockSetAuth]), // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]), // Mock useCart hook to return null state and a mock function
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), // Mock useSearch hook to return null state and a mock function
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

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
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

describe("Login Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders login form", () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByText("LOGIN FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Password")).toBeInTheDocument();
  });

  it("inputs should be initially empty", () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByText("LOGIN FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email").value).toBe("");
    expect(getByPlaceholderText("Enter Your Password").value).toBe("");
  });

  it("should allow typing email and password", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    expect(getByPlaceholderText("Enter Your Email").value).toBe(
      "test@example.com",
    );
    expect(getByPlaceholderText("Enter Your Password").value).toBe(
      "password123",
    );
  });

  it("should not call login API when form is empty", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should login the user successfully", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: { id: 1, name: "John Doe", email: "test@example.com" },
        token: "mockToken",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });
    expect(toast.success).toHaveBeenCalledWith(undefined, {
      duration: 5000,
      icon: "🙏",
      style: {
        background: "green",
        color: "white",
      },
    });
  });

  it("should display error message on failed login", async () => {
    axios.post.mockRejectedValueOnce({ message: "Invalid credentials" });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("should show error toast when login returns success: false", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Invalid credentials",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });
    expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
  });

  it("should navigate to forgot-password page when clicking Forgot Password", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(getByText("Forgot Password"));
    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
  });

  it("should update localStorage on successful login", async () => {
    const mockUser = {
      id: 1,
      name: "John Doe",
      email: "test@example.com",
      phone: "1234567890",
      address: "123 Street",
      DOB: "1990-01-01",
    };
    const mockToken = "mockToken";
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: mockUser,
        token: mockToken,
        message: "login successfully",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    
    const setItemCall = window.localStorage.setItem.mock.calls.find(
      call => call[0] === "auth"
    );
    expect(setItemCall).toBeDefined();
    const storedData = JSON.parse(setItemCall[1]);
    expect(storedData).toMatchObject({
      success: true,
      message: "login successfully",
      user: mockUser,
      token: mockToken,
    });
  });

  it("should call setAuth with user and token on successful login", async () => {
    const mockUser = { id: 1, name: "John Doe", email: "test@example.com" };
    const mockToken = "mockToken";
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: mockUser,
        token: mockToken,
        message: "login successfully",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(mockSetAuth).toHaveBeenCalledWith({
      ...mockAuth,
      user: mockUser,
      token: mockToken,
    });
  });

  it("should block empty string email", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only email", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block invalid email", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "notanemail" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block XSS attempt in email field (blocked by HTML5 email validation)", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "user<img src=x onerror=alert(1)>@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block SQL injection pattern in email field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "OR1=1@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block empty string password", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only password", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "   " },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Password cannot be whitespace only",
    );
  });

  it("should block XSS attempt in password field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in password field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "' OR '1'='1" },
    });
    fireEvent.click(getByText("LOGIN"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block response with missing data property", async () => {
    axios.post.mockResolvedValueOnce({});

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    expect(toast.error).toHaveBeenCalledWith("Invalid login response");
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should block null user object", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: null,
        token: "mockToken",
        message: "login successfully",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    expect(toast.error).toHaveBeenCalledWith("Invalid login response");
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should store auth data with correct content in localStorage on successful login", async () => {
    const mockUser = { id: 1, name: "John Doe", email: "test@example.com" };
    const mockToken = "mockToken";
    const message = "login successfully";
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        user: mockUser,
        token: mockToken,
        message,
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    const [, storedValue] = window.localStorage.setItem.mock.calls.find(
      ([key]) => key === "auth",
    );
    const content = JSON.parse(storedValue);

    expect(content).toMatchObject({
      success: true,
      user: mockUser,
      token: mockToken,
      message,
    });
    expect(content.user).toEqual(mockUser);
    expect(content.token).toBe(mockToken);
  });
});
