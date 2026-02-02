import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import axios from "axios";
import SearchInput from "./SearchInput";

jest.mock("axios");

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  __esModule: true,
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const { useSearch } = require("../../context/search");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SearchInput component", () => {
  it("updates keyword in search context when input changes", () => {
    // Arrange
    const setValuesMock = jest.fn();
    useSearch.mockReturnValue([{ keyword: "", results: [] }, setValuesMock]);
    const { getByPlaceholderText } = render(<SearchInput />);

    // Act
    fireEvent.change(getByPlaceholderText("Search"), { target: { value: "phone" } });

    // Assert
    expect(setValuesMock).toHaveBeenCalledWith({ keyword: "phone", results: [] });
    expect(axios.get).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("submits search, stores results, and navigates to /search on success", async () => {
    // Arrange
    const setValuesMock = jest.fn();
    const values = { keyword: "laptop", results: [] };
    useSearch.mockReturnValue([values, setValuesMock]);
    axios.get.mockResolvedValueOnce({ data: [{ _id: "p1" }] });
    const { getByRole } = render(<SearchInput />);

    // Act
    fireEvent.submit(getByRole("search"));

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop")
    );
    expect(setValuesMock).toHaveBeenCalledWith({ ...values, results: [{ _id: "p1" }] });
    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  it("logs error and does not navigate when search request fails", async () => {
    // Arrange
    const setValuesMock = jest.fn();
    const values = { keyword: "bad", results: [] };
    useSearch.mockReturnValue([values, setValuesMock]);
    const err = new Error("network");
    axios.get.mockRejectedValueOnce(err);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const { getByRole } = render(<SearchInput />);

    // Act
    fireEvent.submit(getByRole("search"));

    // Assert
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(logSpy).toHaveBeenCalledWith(err);
    expect(setValuesMock).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

