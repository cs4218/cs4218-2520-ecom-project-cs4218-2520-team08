import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import CreateProduct from "./CreateProduct";

// -------------------- Mocks --------------------
jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("./../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AntD Select as <select> so we can interact reliably
jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, placeholder }) => (
    <select
      aria-label={placeholder || "select"}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">--</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => <option value={value}>{children}</option>;
  return { Select };
});

// Used for photo preview
global.URL.createObjectURL = jest.fn(() => "blob:mock");

// Mock FormData to inspect appended fields
class MockFormData {
  constructor() {
    this._data = {};
  }
  append(key, value) {
    this._data[key] = value;
  }
}
global.FormData = MockFormData;

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

function renderCreateProduct() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
      <Routes>
        <Route
          path="/dashboard/admin/create-product"
          element={<CreateProduct />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("CreateProduct (Admin Actions) — full green coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders page chrome and loads categories (success path)", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "cat1", name: "Shoes" },
          { _id: "cat2", name: "Hats" },
        ],
      },
    });

    renderCreateProduct();

    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    expect(screen.getByRole("option", { name: "Shoes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hats" })).toBeInTheDocument();
  });

  test("handles category fetch failure (catch branch) and shows toast error", async () => {
    axios.get.mockRejectedValueOnce(new Error("network down"));

    renderCreateProduct();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
  });

  test("submits with NO photo (photo branch false) -> still posts FormData", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
    });

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "Created" },
    });

    renderCreateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    // choose category
    fireEvent.change(screen.getByLabelText("Select a category"), {
      target: { value: "cat1" },
    });

    // shipping = No (covers Option value "0" path)
    fireEvent.change(screen.getByLabelText("Select Shipping "), {
      target: { value: "0" },
    });

    // Fill text fields
    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "NoPhoto Product" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "No photo uploaded" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "2" },
    });

    // Ensure photo preview is NOT shown (photo branch false)
    expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    const [url, formDataArg] = axios.post.mock.calls[0];
    expect(url).toBe("/api/v1/product/create-product");
    expect(formDataArg).toBeInstanceOf(MockFormData);

    expect(formDataArg._data.name).toBe("NoPhoto Product");
    expect(formDataArg._data.description).toBe("No photo uploaded");
    expect(formDataArg._data.price).toBe("10");
    expect(formDataArg._data.quantity).toBe("2");
    expect(formDataArg._data.category).toBe("cat1");

    // photo will be "" (initial state) — still covered
    expect(formDataArg._data.photo).toBe("");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Product Created Successfully")
    );
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  test("submits WITH photo (photo branch true) -> preview renders + posts file", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
    });

    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "Created" },
    });

    renderCreateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Select a category"), {
      target: { value: "cat1" },
    });

    // Upload photo
    const file = new File(["dummy"], "photo.png", { type: "image/png" });
    const label = screen.getByText(/upload photo/i).closest("label");
    const fileInput = label.querySelector("input[type='file']");
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Preview should render (photo branch true)
    expect(await screen.findByAltText("product_photo")).toBeInTheDocument();

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "WithPhoto Product" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Has photo" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    // shipping = Yes (covers Option value "1" path)
    fireEvent.change(screen.getByLabelText("Select Shipping "), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());

    const [, formDataArg] = axios.post.mock.calls[0];
    expect(formDataArg._data.photo).toBe(file);
  });

  test("create product returns success:false (else branch) -> shows toast.error with message", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
    });

    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Validation failed" },
    });

    renderCreateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Validation failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("create product request throws (catch branch) -> toast.error('something went wrong')", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
    });

    axios.post.mockRejectedValueOnce(new Error("post failed"));

    renderCreateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("something went wrong");
  });
});
