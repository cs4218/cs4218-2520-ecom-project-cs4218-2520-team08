import React from "react";
import { render, screen } from "@testing-library/react";
import About from "./About";

jest.mock("./../components/Layout", () => {
  return function LayoutMock({ title, children }) {
    return (
      <div>
        <div data-testid="layout-title">{title}</div>
        {children}
      </div>
    );
  };
});

describe("About page", () => {
  it("renders with correct layout title", () => {
    render(<About />);
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "About us - Ecommerce app"
    );
  });

  it("renders about image", () => {
    render(<About />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/about.jpeg");
  });

  it("renders descriptive text", () => {
    render(<About />);
    expect(screen.getByText(/Add text/i)).toBeInTheDocument();
  });
});
