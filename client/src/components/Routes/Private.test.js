import React from "react";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import PrivateRoute from "./Private";
import { useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("../Spinner", () => {
  return function Spinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

describe("PrivateRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Spinner when no auth token", () => {
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);

    const { getByTestId } = render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    expect(getByTestId("spinner")).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("renders Spinner when auth check fails", async () => {
    useAuth.mockReturnValue([{ token: "testToken" }, jest.fn()]);
    axios.get.mockRejectedValueOnce({ message: "Unauthorized" });

    const { getByTestId } = render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    expect(getByTestId("spinner")).toBeInTheDocument();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
  });

  it("renders Spinner when auth check returns ok: false", async () => {
    useAuth.mockReturnValue([{ token: "testToken" }, jest.fn()]);
    axios.defaults.headers.common["Authorization"] = "testToken";
    axios.get.mockResolvedValueOnce({
      data: { ok: false },
    });

    const { getByTestId } = render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(getByTestId("spinner")).toBeInTheDocument();
  });

  it("renders Outlet when auth check succeeds", async () => {
    useAuth.mockReturnValue([{ token: "testToken" }, jest.fn()]);
    axios.defaults.headers.common["Authorization"] = "testToken";
    axios.get.mockResolvedValueOnce({
      data: { ok: true },
    });

    const childContent = <div data-testid="outlet-content">Outlet content</div>;
    const { queryByTestId, getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<PrivateRoute />}>
            <Route path="/" element={childContent} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(queryByTestId("spinner")).not.toBeInTheDocument();
    });
    expect(getByTestId("outlet-content")).toBeInTheDocument();
  });

  it("calls user-auth API when token exists", async () => {
    useAuth.mockReturnValue([{ token: "testToken" }, jest.fn()]);
    axios.defaults.headers.common["Authorization"] = "testToken";
    axios.get.mockResolvedValueOnce({
      data: { ok: true },
    });

    render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });
  });

  it("does not call API when no token", () => {
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);

    render(
      <MemoryRouter>
        <PrivateRoute />
      </MemoryRouter>
    );

    expect(axios.get).not.toHaveBeenCalled();
  });
});
