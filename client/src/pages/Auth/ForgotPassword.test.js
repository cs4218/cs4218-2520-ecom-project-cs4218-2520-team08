import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [{ user: null, token: "" }, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders forgot password form", () => {
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByText("FORGOT PASSWORD FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Answer")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your New Password")).toBeInTheDocument();
  });

  it("inputs should be initially empty", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByPlaceholderText("Enter Your Email").value).toBe("");
    expect(getByPlaceholderText("Enter Your Answer").value).toBe("");
    expect(getByPlaceholderText("Enter Your New Password").value).toBe("");
  });

  it("should allow typing email, answer and new password", () => {
    const { getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });

    expect(getByPlaceholderText("Enter Your Email").value).toBe(
      "test@example.com",
    );
    expect(getByPlaceholderText("Enter Your Answer").value).toBe("my answer");
    expect(getByPlaceholderText("Enter Your New Password").value).toBe(
      "newPassword123",
    );
  });

  it("should not call forgot-password API when form is empty", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should call forgot-password API and navigate to login on success", async () => {
    const successMessage = "Password reset successfully";
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: successMessage,
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/auth/forgot-password",
        {
          email: "test@example.com",
          answer: "my answer",
          newPassword: "newPassword123",
        },
      );
    });
    expect(toast.success).toHaveBeenCalledWith(successMessage);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should display error message on failed request", async () => {
    axios.post.mockRejectedValueOnce({ message: "Network error" });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("should show error toast when API returns success: false", async () => {
    const errorMessage = "Invalid email or answer";
    axios.post.mockResolvedValueOnce({
      data: {
        success: false,
        message: errorMessage,
      },
    });

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "wrong answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    expect(toast.error).toHaveBeenCalledWith(errorMessage);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should not call forgot-password API when new password is empty", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    // Leave new password empty (field is required)
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block whitespace-only answer", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "   " },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Answer cannot be whitespace only",
    );
  });

  it("should block whitespace-only new password", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "   " },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Password cannot be whitespace only",
    );
  });

  it("should block XSS attempt in email field (blocked by HTML5 email validation)", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "user<img src=x onerror=alert(1)>@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it("should block XSS attempt in answer field", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block XSS attempt in new password field", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in email field", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "OR1=1@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in answer field", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "' OR '1'='1" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });

  it("should block SQL injection pattern in new password field", () => {
    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Answer"), {
      target: { value: "my answer" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
      target: { value: "' OR '1'='1" },
    });
    fireEvent.click(getByText("FORGOT PASSWORD"));

    expect(axios.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Invalid characters detected");
  });
});
