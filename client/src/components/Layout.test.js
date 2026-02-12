import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Layout from "./Layout";

jest.mock("./Header", () => () => <div data-testid="header-stub">Header</div>);
jest.mock("./Footer", () => () => <div data-testid="footer-stub">Footer</div>);
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster-stub">Toaster</div>,
}));

describe("Layout", () => {
  it("renders children content", () => {
    // Arrange
    // Act
    render(
      <Layout>
        <p>Hello Layout</p>
      </Layout>
    );

    // Assert
    expect(screen.getByText("Hello Layout")).toBeInTheDocument();
  });

  it("renders Header and Footer components", () => {
    // Arrange
    // Act
    render(
      <Layout>
        <p>Body</p>
      </Layout>
    );

    // Assert
    expect(screen.getByTestId("header-stub")).toBeInTheDocument();
    expect(screen.getByTestId("footer-stub")).toBeInTheDocument();
  });

  it("sets document title via Helmet", async () => {
    // Arrange
    const title = "My Title";

    // Act
    render(
      <Layout title={title}>
        <p>Body</p>
      </Layout>
    );

    // Assert
    await waitFor(() => {
      expect(document.title).toBe(title);
    });
  });
});
