import React from "react";
import { render, screen } from "@testing-library/react";
import Policy from "./Policy";

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

describe("Policy page", () => {
  it("renders with correct layout title", () => {
    render(<Policy />);
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "Privacy Policy"
    );
  });

  it("renders Privacy Policy heading", () => {
    render(<Policy />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("renders information collection section", () => {
    render(<Policy />);
    expect(screen.getByText(/Information We Collect/i)).toBeInTheDocument();
  });

  it("renders information usage section", () => {
    render(<Policy />);
    expect(screen.getByText(/How We Use Your Information/i)).toBeInTheDocument();
  });

  it("renders the contact image", () => {
    render(<Policy />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });
});
