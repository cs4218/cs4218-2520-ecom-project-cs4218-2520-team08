import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "./Contact";

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

describe("Contact page", () => {
  it("renders with correct layout title", () => {
    render(<Contact />);
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Contact us");
  });

  it("renders contact image", () => {
    render(<Contact />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("renders CONTACT US heading", () => {
    render(<Contact />);
    expect(screen.getByText("CONTACT US")).toBeInTheDocument();
  });

  it("renders contact email", () => {
    render(<Contact />);
    expect(
      screen.getByText(/www\.help@ecommerceapp\.com/i)
    ).toBeInTheDocument();
  });

  it("renders contact phone number", () => {
    render(<Contact />);
    expect(screen.getByText(/012-3456789/i)).toBeInTheDocument();
  });

  it("renders hotline number", () => {
    render(<Contact />);
    expect(screen.getByText(/1800-0000-0000/i)).toBeInTheDocument();
  });
});
