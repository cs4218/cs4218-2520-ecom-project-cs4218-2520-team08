import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Profile from "./Profile";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../components/UserMenu", () => () => <div data-testid="user-menu" />);

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

const { useAuth } = require("../../context/auth");
const toast = require("react-hot-toast").default;

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

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("Profile page", () => {
  it("prefills fields from auth.user and keeps email disabled", async () => {
    // Arrange
    const setAuthMock = jest.fn();
    useAuth.mockReturnValue([
      {
        token: "t",
        user: {
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "123",
          address: "Somewhere",
        },
      },
      setAuthMock,
    ]);

    // Act
    const { getByPlaceholderText } = render(<Profile />);

    // Assert
    const nameInput = getByPlaceholderText("Enter Your Name");
    const emailInput = getByPlaceholderText(/Enter Your Email/);
    const phoneInput = getByPlaceholderText("Enter Your Phone");
    const addressInput = getByPlaceholderText("Enter Your Address");

    await waitFor(() => expect(nameInput).toHaveValue("Jane Doe"));
    expect(emailInput).toHaveValue("jane@example.com");
    expect(emailInput).toBeDisabled();
    expect(phoneInput).toHaveValue("123");
    expect(addressInput).toHaveValue("Somewhere");
  });

  it("submits updated profile successfully and persists updated user to localStorage", async () => {
    // Arrange
    const setAuthMock = jest.fn();
    const initialAuth = {
      token: "t",
      user: { name: "Old", email: "old@example.com", phone: "0", address: "A" },
    };
    useAuth.mockReturnValue([initialAuth, setAuthMock]);
    localStorage.setItem("auth", JSON.stringify({ ...initialAuth }));
    axios.put.mockResolvedValueOnce({
      data: {
        updatedUser: {
          name: "New Name",
          email: "old@example.com",
          phone: "999",
          address: "New Address",
        },
      },
    });

    const { getByPlaceholderText, getByRole } = render(<Profile />);

    // Act
    fireEvent.change(getByPlaceholderText(/Enter Your Email/), {
      target: { value: "old+changed@example.com" },
    });
    userEvent.clear(getByPlaceholderText("Enter Your Name"));
    userEvent.type(getByPlaceholderText("Enter Your Name"), "New Name");
    userEvent.type(getByPlaceholderText("Enter Your Password"), "pw");
    userEvent.clear(getByPlaceholderText("Enter Your Phone"));
    userEvent.type(getByPlaceholderText("Enter Your Phone"), "999");
    userEvent.clear(getByPlaceholderText("Enter Your Address"));
    userEvent.type(getByPlaceholderText("Enter Your Address"), "New Address");
    userEvent.click(getByRole("button", { name: "UPDATE" }));

    // Assert
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
        name: "New Name",
        email: "old+changed@example.com",
        password: "pw",
        phone: "999",
        address: "New Address",
      })
    );
    expect(setAuthMock).toHaveBeenCalledWith({
      ...initialAuth,
      user: {
        name: "New Name",
        email: "old@example.com",
        phone: "999",
        address: "New Address",
      },
    });
    expect(JSON.parse(localStorage.getItem("auth")).user).toEqual({
      name: "New Name",
      email: "old@example.com",
      phone: "999",
      address: "New Address",
    });
    expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows an error toast when backend responds with data.errro", async () => {
    // Arrange
    const setAuthMock = jest.fn();
    const auth = {
      token: "t",
      user: { name: "N", email: "e@example.com", phone: "1", address: "A" },
    };
    useAuth.mockReturnValue([auth, setAuthMock]);
    localStorage.setItem("auth", JSON.stringify({ ...auth }));
    axios.put.mockResolvedValueOnce({ data: { errro: true, error: "Bad request" } });

    const { getByRole } = render(<Profile />);

    // Act
    userEvent.click(getByRole("button", { name: "UPDATE" }));

    // Assert
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Bad request");
    expect(toast.success).not.toHaveBeenCalled();
    expect(setAuthMock).not.toHaveBeenCalled();
  });

  it("logs and shows a generic error toast when submit throws", async () => {
    // Arrange
    const setAuthMock = jest.fn();
    useAuth.mockReturnValue([
      { token: "t", user: { name: "N", email: "e@example.com", phone: "1", address: "A" } },
      setAuthMock,
    ]);
    localStorage.setItem(
      "auth",
      JSON.stringify({ user: { name: "N", email: "e@example.com", phone: "1", address: "A" } })
    );
    const err = new Error("network");
    axios.put.mockRejectedValueOnce(err);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const { getByRole } = render(<Profile />);

    // Act
    userEvent.click(getByRole("button", { name: "UPDATE" }));

    // Assert
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(logSpy).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    logSpy.mockRestore();
  });
});

