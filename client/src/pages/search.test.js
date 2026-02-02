import React from "react";
import { render } from "@testing-library/react";
import Search from "./Search";

jest.mock("../context/search", () => ({
  useSearch: jest.fn(),
}));

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

const { useSearch } = require("../context/search");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Search page", () => {
  it('sets the Layout title to "Search results"', () => {
    // Arrange
    useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

    // Act
    const { getByTestId } = render(<Search />);

    // Assert
    expect(getByTestId("layout-title")).toHaveTextContent("Search results");
  });

  it('renders "No Products Found" when results length is < 1', () => {
    // Arrange
    useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

    // Act
    const { getByText } = render(<Search />);

    // Assert
    expect(getByText("No Products Found")).toBeInTheDocument();
  });

  it("renders Found N and product cards when results exist", () => {
    // Arrange
    const products = [
      {
        _id: "p1",
        name: "Prod 1",
        description: "abcdefghijklmnopqrstuvwxyz1234567890EXTRA",
        price: 10,
      },
      {
        _id: "p2",
        name: "Prod 2",
        description: "short desc",
        price: 20,
      },
    ];
    useSearch.mockReturnValue([{ results: products }, jest.fn()]);

    // Act
    const { getByText, getByAltText } = render(<Search />);

    // Assert
    expect(getByText("Found 2")).toBeInTheDocument();

    expect(getByText("Prod 1")).toBeInTheDocument();
    expect(getByAltText("Prod 1")).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    const p1Desc = products[0].description.substring(0, 30);
    expect(
      getByText((_, node) => node?.textContent === `${p1Desc}...`)
    ).toBeInTheDocument();
    expect(getByText(/\$\s*10/)).toBeInTheDocument();

    expect(getByText("Prod 2")).toBeInTheDocument();
    expect(getByAltText("Prod 2")).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
    const p2Desc = products[1].description.substring(0, 30);
    expect(
      getByText((_, node) => node?.textContent === `${p2Desc}...`)
    ).toBeInTheDocument();
    expect(getByText(/\$\s*20/)).toBeInTheDocument();
  });
});

