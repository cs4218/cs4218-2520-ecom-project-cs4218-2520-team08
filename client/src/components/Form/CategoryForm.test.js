import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "./CategoryForm";

describe("CategoryForm Component", () => {
  test("renders input and submit button", () => {
    render(
      <CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />
    );

    expect(
      screen.getByPlaceholderText("Enter new category")
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  test("input displays the provided value prop", () => {
    render(
      <CategoryForm
        handleSubmit={jest.fn()}
        value="Shoes"
        setValue={jest.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
      "Shoes"
    );
  });

  test("typing in input calls setValue with new value", () => {
    const setValue = jest.fn();

    render(
      <CategoryForm handleSubmit={jest.fn()} value="" setValue={setValue} />
    );

    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "NewCat" } });

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith("NewCat");
  });

  test("submitting the form calls handleSubmit", () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());

    render(
      <CategoryForm handleSubmit={handleSubmit} value="" setValue={jest.fn()} />
    );

    // submit the form by clicking the button
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    // ensure it received an event-like object
    expect(handleSubmit.mock.calls[0][0]).toBeDefined();
  });
});
