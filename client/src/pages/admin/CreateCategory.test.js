import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CreateCategory from "./CreateCategory";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

jest.mock("../../components/Form/CategoryForm", () => {
  return function CategoryFormMock({ value, setValue, handleSubmit }) {
    return (
      <form onSubmit={handleSubmit}>
        <input
          aria-label="category-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit">SUBMIT</button>
      </form>
    );
  };
});

jest.mock("antd", () => ({
  Modal: ({ visible, children, onCancel }) =>
    visible ? (
      <div data-testid="modal">
        <button onClick={onCancel}>CLOSE</button>
        {children}
      </div>
    ) : null,
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-category"
          element={<CreateCategory />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("CreateCategory — coverage max", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockResolvedValue({
      data: { success: true, category: [] },
    });
  });

  test("GET categories success renders rows (map branch)", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "c1", name: "Shoes" },
          { _id: "c2", name: "Hats" },
        ],
      },
    });

    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText("Shoes")).toBeInTheDocument();
    expect(screen.getByText("Hats")).toBeInTheDocument();
    expect(screen.getAllByText("Edit")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  test("GET categories success:false (branch) -> does not set categories", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: false, category: [{ _id: "c1", name: "Shoes" }] },
    });

    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.queryByText("Shoes")).not.toBeInTheDocument();
  });

  test("GET categories throws (catch) -> toast.error", async () => {
    axios.get.mockRejectedValueOnce(new Error("GET fail"));

    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
  });

  test("CREATE: POST success -> toast.success and refresh GET called", async () => {
    // initial categories (empty)
    axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });

    axios.post.mockResolvedValueOnce({ data: { success: true } });

    // refresh list after create
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "NewCat" }] },
    });

    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("category-input"), {
      target: { value: "NewCat" },
    });
    fireEvent.click(screen.getByText("SUBMIT"));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "NewCat" }
      )
    );

    expect(toast.success).toHaveBeenCalledWith("NewCat is created");

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(screen.getByText("NewCat")).toBeInTheDocument();
  });

  test("CREATE: POST success:false -> toast.error(data.message)", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Already exists" },
    });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("category-input"), {
      target: { value: "Dup" },
    });
    fireEvent.click(screen.getByText("SUBMIT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Already exists");
  });

  test("CREATE: POST throws -> toast.error(catch msg)", async () => {
    axios.post.mockRejectedValueOnce(new Error("POST fail"));

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("category-input"), {
      target: { value: "X" },
    });
    fireEvent.click(screen.getByText("SUBMIT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("somthing went wrong in input form");
  });

  test("EDIT: clicking Edit opens modal and CLOSE triggers onCancel branch", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("modal")).toBeInTheDocument();

    const modalInput = screen.getAllByLabelText("category-input")[1];
    expect(modalInput).toHaveValue("Shoes");

    fireEvent.click(screen.getByText("CLOSE"));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("UPDATE: PUT success -> toast.success, modal closes, refresh called", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockResolvedValueOnce({ data: { success: true } });

    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes2" }] },
    });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("Edit"));
    const modalInput = screen.getAllByLabelText("category-input")[1];
    fireEvent.change(modalInput, { target: { value: "Shoes2" } });

    fireEvent.click(screen.getAllByText("SUBMIT")[1]);

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/c1",
        { name: "Shoes2" }
      )
    );

    expect(toast.success).toHaveBeenCalledWith("Shoes2 is updated");
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    expect(screen.getByText("Shoes2")).toBeInTheDocument();
  });

  test("UPDATE: PUT success:false -> toast.error(data.message)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockResolvedValueOnce({
      data: { success: false, message: "Update failed" },
    });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getAllByText("SUBMIT")[1]);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });

  test("UPDATE: PUT throws -> toast.error(catch msg)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockRejectedValueOnce(new Error("PUT fail"));

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getAllByText("SUBMIT")[1]);

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });

  test("DELETE: success -> toast.success and refresh", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/c1"
      )
    );

    expect(toast.success).toHaveBeenCalledWith("category is deleted");
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  test("DELETE: success:false -> toast.error(data.message)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockResolvedValueOnce({
      data: { success: false, message: "Delete failed" },
    });

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Delete failed");
  });

  test("DELETE: throws -> toast.error(catch msg)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockRejectedValueOnce(new Error("DELETE fail"));

    renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });
});
