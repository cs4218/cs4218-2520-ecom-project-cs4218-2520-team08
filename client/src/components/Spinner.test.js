import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Spinner from "./Spinner";

var mockNavigate = jest.fn();
var mockLocation = { pathname: "/protected" };

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe("Spinner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockNavigate = jest.fn();
    mockLocation = { pathname: "/protected" };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders initial countdown of 3", () => {
    // Arrange
    // Act
    render(<Spinner />);

    // Assert
    expect(
      screen.getByText(/redirecting to you in 3 second/i)
    ).toBeInTheDocument();
  });

  it("counts down after 1 second", () => {
    // Arrange
    render(<Spinner />);

    // Act
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert
    expect(
      screen.getByText(/redirecting to you in 2 second/i)
    ).toBeInTheDocument();
  });

  it("navigates to /login when count reaches 0", () => {
    // Arrange
    render(<Spinner />);

    // Act
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/protected",
    });
  });

  it("navigates to custom path when path prop is provided", () => {
    // Arrange
    render(<Spinner path="register" />);

    // Act
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/register", {
      state: "/protected",
    });
  });
});
