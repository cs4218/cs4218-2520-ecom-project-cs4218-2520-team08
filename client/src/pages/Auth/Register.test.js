import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";

// Mocking axios.post
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]), // Mock useAuth hook to return null state and a mock function for setAuth
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

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders register form", () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByText("REGISTER FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Name")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Password")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Phone")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Address")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your DOB")).toBeInTheDocument();
    expect(
      getByPlaceholderText("What is Your Favorite sports"),
    ).toBeInTheDocument();
    expect(getByText("REGISTER")).toBeInTheDocument();
  });

  it("inputs should be initially empty", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByPlaceholderText("Enter Your Name").value).toBe("");
    expect(getByPlaceholderText("Enter Your Email").value).toBe("");
    expect(getByPlaceholderText("Enter Your Password").value).toBe("");
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("");
    expect(getByPlaceholderText("Enter Your Address").value).toBe("");
    expect(getByPlaceholderText("Enter Your DOB").value).toBe("");
    expect(getByPlaceholderText("What is Your Favorite sports").value).toBe("");
  });

  it("should allow typing in all form fields", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });

    expect(getByPlaceholderText("Enter Your Name").value).toBe("John Doe");
    expect(getByPlaceholderText("Enter Your Email").value).toBe(
      "test@example.com",
    );
    expect(getByPlaceholderText("Enter Your Password").value).toBe(
      "password123",
    );
    expect(getByPlaceholderText("Enter Your Phone").value).toBe("1234567890");
    expect(getByPlaceholderText("Enter Your Address").value).toBe("123 Street");
    expect(getByPlaceholderText("Enter Your DOB").value).toBe("2000-01-01");
    expect(getByPlaceholderText("What is Your Favorite sports").value).toBe(
      "Football",
    );
  });

  it("should not call register API when form is empty", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should register the user successfully and navigate to login page", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Register Successfully, please login",
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should display error message on failed registration", async () => {
    axios.post.mockRejectedValueOnce({ message: "Invalid fields" });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("should show error toast when registration returns success: false", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: "Already Register please login",
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
    expect(toast.error).toHaveBeenCalledWith("Already Register please login");
  });

  it("should block empty string name", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only name", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Name cannot be whitespace only");
  });

  it("should block extremely long name value", async () => {
    const longName = "a".repeat(10000);

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: longName },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Name is too long (max 100 characters)",
    );
  });

  it("should handle unicode characters in name", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "José García" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "José García",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
  });

  it("should block XSS attempt in name field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: '<script>alert("xss")</script>' },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in name field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "'; DROP TABLE users; --" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block empty string email", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only email", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "    " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block invalid email", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "notanemail" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block XSS attempt in email field (blocked by HTML5 email validation)", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: '"<script>alert(1)</script>"@example.com' },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block SQL injection pattern in email field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "OR1=1@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block empty string password", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only password", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Password cannot be whitespace only",
    );
  });

  it("should block XSS attempt in password field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in password field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "' OR '1'='1" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block empty string phone number", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only phone number", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Phone number cannot be whitespace only",
    );
  });

  it("should block invalid phone number format - non-numeric", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "abc-def-ghij" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Phone number must contain only digits",
    );
  });

  it("should block invalid phone number format - too short", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Phone number must be 7-15 digits",
    );
  });

  it("should block invalid phone number format - too long", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "12345678901234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Phone number must be 7-15 digits",
    );
  });

  it("should block empty string address", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only address", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block extremely long address value", async () => {
    const longAddress = "a".repeat(10000);

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: longAddress },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Address is too long (max 500 characters)",
    );
  });

  it("should handle special characters in address", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Main St., Apt #4-B" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Main St., Apt #4-B",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
  });

  it("should block XSS attempt in address field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in address field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "'; DELETE FROM users; --" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block empty string DOB", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only DOB", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should have max attribute set to today's date for DOB field", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    const dobInput = getByPlaceholderText("Enter Your DOB");
    const today = new Date().toISOString().split("T")[0];
    expect(dobInput).toHaveAttribute("max", today);
  });

  it("should not submit form with future date for DOB", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateString = futureDate.toISOString().split("T")[0];

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: futureDateString },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block empty string answer", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only answer", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "   " },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Answer cannot be whitespace only",
    );
  });

  it("should block XSS attempt in answer field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: '<script>alert("xss")</script>' },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in answer field", async () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "'; DROP TABLE users; --" },
    });
    fireEvent.click(getByText("REGISTER"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });
});
