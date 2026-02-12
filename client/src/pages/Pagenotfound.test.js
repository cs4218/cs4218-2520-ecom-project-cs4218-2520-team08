import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import Pagenotfound from "./Pagenotfound";

jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("Pagenotfound route", () => {
  it("shows 404 page when path does not match defined routes", () => {
    // Arrange
    const unknownPath = "/this-route-does-not-exist";

    // Act
    render(
      <MemoryRouter initialEntries={[unknownPath]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="*" element={<Pagenotfound />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops ! Page Not Found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go Back" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
