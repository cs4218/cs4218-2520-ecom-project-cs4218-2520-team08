import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import Footer from "./Footer";

describe("Footer", () => {
  it("renders copyright text", () => {
    // Arrange
    // Act
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
  });

  it("renders about, contact, and privacy policy links with correct hrefs", () => {
    // Arrange
    // Act
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about"
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact"
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toHaveAttribute("href", "/policy");
  });

  it("renders expected footer link text", () => {
    // Arrange
    // Act
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
