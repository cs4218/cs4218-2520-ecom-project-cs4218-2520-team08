import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import UpdateProduct from "./UpdateProduct";

jest.mock("axios");

// toast mock like your other tests
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// isolate layout/menu
jest.mock("./../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

// mock router navigate + params
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: "test-slug" }),
  };
});

// mock AntD Select as <select>
jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, placeholder, value, defaultValue }) => (
    <select
      aria-label={placeholder || "select"}
      value={value ?? defaultValue ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">--</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => <option value={value}>{children}</option>;
  return { Select };
});

// URL.createObjectURL for photo preview branch
global.URL.createObjectURL = jest.fn(() => "blob:mock");

// Mock FormData to inspect appended fields
class MockFormData {
  constructor() {
    this._data = {};
  }
  append(k, v) {
    this._data[k] = v;
  }
}
global.FormData = MockFormData;

// matchMedia helper
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

function renderUpdateProduct() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin/update-product/test-slug"]}>
      <Routes>
        <Route
          path="/dashboard/admin/update-product/:slug"
          element={<UpdateProduct />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("UpdateProduct — high coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads product + categories and renders existing product photo branch (no new photo)", async () => {
    axios.get
      // getSingleProduct
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: true,
            category: { _id: "cat1" },
          },
        },
      })
      // getAllCategory
      .mockResolvedValueOnce({
        data: {
          success: true,
          category: [
            { _id: "cat1", name: "Shoes" },
            { _id: "cat2", name: "Hats" },
          ],
        },
      });

    renderUpdateProduct();

    // wait both GETs
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    // form populated
    expect(screen.getByPlaceholderText("write a name")).toHaveValue("Old Name");
    expect(screen.getByPlaceholderText("write a description")).toHaveValue("Old Desc");
    expect(screen.getByPlaceholderText("write a Price")).toHaveValue(10);
    expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(5);

    // categories rendered
    expect(screen.getByRole("option", { name: "Shoes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hats" })).toBeInTheDocument();

    // photo branch when photo is empty -> uses product-photo/${id}
    const img = screen.getAllByAltText("product_photo")[0];
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/pid1");
  });

  test("handles getSingleProduct failure (catch branch) without crashing", async () => {
    axios.get
      // getSingleProduct fails
      .mockRejectedValueOnce(new Error("get product failed"))
      // getAllCategory still resolves
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

    renderUpdateProduct();

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Update Product")).toBeInTheDocument();
  });

  test("handles getAllCategory failure (catch branch) with toast.error", async () => {
    axios.get
      // getSingleProduct ok
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      // getAllCategory fails
      .mockRejectedValueOnce(new Error("get categories failed"));

    renderUpdateProduct();

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
  });

  test("uploading a new photo switches to preview branch (URL.createObjectURL)", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
      });

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    const file = new File(["x"], "new.png", { type: "image/png" });
    const label = screen.getByText(/upload photo/i).closest("label");
    const fileInput = label.querySelector("input[type='file']");
    fireEvent.change(fileInput, { target: { files: [file] } });

    // preview branch uses URL.createObjectURL
    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
    const img = screen.getAllByAltText("product_photo")[0];
    expect(img).toHaveAttribute("src", "blob:mock");
  });

  test("updates product successfully -> toast.success + navigate", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
      });

    axios.put.mockResolvedValueOnce({
      data: { success: true, message: "Updated" },
    });

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    // change some fields
    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "New Name" },
    });

    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());

    // ensure correct url includes id
    const [url, formDataArg] = axios.put.mock.calls[0];
    expect(url).toBe("/api/v1/product/update-product/pid1");
    expect(formDataArg).toBeInstanceOf(MockFormData);
    expect(formDataArg._data.name).toBe("New Name");

    // expected correct success behaviour
    expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  test("update product returns success:false -> toast.error(message)", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
      });

    axios.put.mockResolvedValueOnce({
      data: { success: false, message: "Validation failed" },
    });

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Validation failed");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("update product request throws -> toast.error('something went wrong')", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [{ _id: "cat1", name: "Shoes" }] },
      });

    axios.put.mockRejectedValueOnce(new Error("put failed"));

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("something went wrong");
  });

  test("delete: prompt cancelled -> does not call delete", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

    jest.spyOn(window, "prompt").mockReturnValueOnce(""); // cancel branch

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    expect(axios.delete).not.toHaveBeenCalled();
  });

  test("delete: confirmed -> calls delete, toast.success, navigate", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

    jest.spyOn(window, "prompt").mockReturnValueOnce("yes");

    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/pid1"
      )
    );

    expect(toast.success).toHaveBeenCalledWith("Product DEleted Succfully");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
  });

  test("delete: axios.delete throws -> toast.error('Something went wrong')", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: {
            _id: "pid1",
            name: "Old Name",
            description: "Old Desc",
            price: 10,
            quantity: 5,
            shipping: false,
            category: { _id: "cat1" },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

    jest.spyOn(window, "prompt").mockReturnValueOnce("yes");
    axios.delete.mockRejectedValueOnce(new Error("delete failed"));

    renderUpdateProduct();
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});
