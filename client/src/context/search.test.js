import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

function ReadSearch() {
  const ctx = useSearch();
  if (!ctx) return <div data-testid="ctx">undefined</div>;
  const [values] = ctx;
  return (
    <div data-testid="ctx">
      {values.keyword}|{values.results.length}
    </div>
  );
}

function UpdateSearch({ nextKeyword = "k", nextResults = [] }) {
  const [values, setValues] = useSearch();
  return (
    <button
      type="button"
      onClick={() => setValues({ ...values, keyword: nextKeyword, results: nextResults })}
    >
      update
    </button>
  );
}

describe("search context", () => {
  it("useSearch returns undefined when used without SearchProvider", () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByTestId } = render(<ReadSearch />);

    // Assert
    expect(getByTestId("ctx")).toHaveTextContent("undefined");
  });

  it("SearchProvider renders children", () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByText } = render(
      <SearchProvider>
        <div>child</div>
      </SearchProvider>
    );

    // Assert
    expect(getByText("child")).toBeInTheDocument();
  });

  it("SearchProvider provides default keyword and results", () => {
    // Arrange
    // (no extra arrange needed)

    // Act
    const { getByTestId } = render(
      <SearchProvider>
        <ReadSearch />
      </SearchProvider>
    );

    // Assert
    expect(getByTestId("ctx")).toHaveTextContent("|0");
  });

  it("updates keyword and results via the provided setter", () => {
    // Arrange
    const nextResults = [{ _id: "p1" }, { _id: "p2" }];
    const { getByRole, getByTestId } = render(
      <SearchProvider>
        <ReadSearch />
        <UpdateSearch nextKeyword="phone" nextResults={nextResults} />
      </SearchProvider>
    );

    // Act
    fireEvent.click(getByRole("button", { name: "update" }));

    // Assert
    expect(getByTestId("ctx")).toHaveTextContent("phone|2");
  });
});

