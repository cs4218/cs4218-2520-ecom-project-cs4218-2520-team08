import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { Select } from "antd";
const { Option } = Select;
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import CreateProduct from "./CreateProduct";

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});


jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("./../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>
    {children}
  </div>
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

jest.mock("antd", () => {
  const React = require("react");
  const Select = ({ children, onChange, placeholder, className }) => (
    <select
      aria-label={placeholder || "select"}
      className={className}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">--</option>
      {children}
    </select>
  );
  Select.Option = ({ value, children }) => (
    <option value={value}>{children}</option>
  );
  return { Select };
});

global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

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

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

async function renderCreateProduct() {
  let utils;
  await act(async () => {
    utils = render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
        <Routes>
          <Route
            path="/dashboard/admin/create-product"
            element={<CreateProduct />}
          />
        </Routes>
      </MemoryRouter>
    );
  });

  // let the initial GET promise resolve + state updates settle
  await act(async () => {
    await flushPromises();
  });

  return utils;
}

// tiny helper: wrap UI-changing ops in act for older RTL (<14)
async function actDo(fn) {
  await act(async () => {
    await fn();
  });
}

describe("CreateProduct Component - Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    test("should render with correct title prop", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      const layout = screen.getByTestId("layout");
      expect(layout).toHaveAttribute("data-title", "Dashboard - Create Product");
    });

    test("should render all required UI elements", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a description")
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("write a quantity")
      ).toBeInTheDocument();
      expect(screen.getByText("CREATE PRODUCT")).toBeInTheDocument();
    });

    test("should render category select with placeholder", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      expect(screen.getByLabelText("Select a category")).toBeInTheDocument();
    });

    test("should render shipping select with placeholder", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      expect(screen.getByLabelText("Select Shipping")).toBeInTheDocument();
    });

    test("should render file upload button with default text", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      expect(screen.getByText("Upload Photo")).toBeInTheDocument();
    });
  });

  describe("getAllCategory - Data Fetching", () => {
    test("should call API on component mount", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    test("should populate categories when API returns success", async () => {
      const mockCategories = [
        { _id: "cat1", name: "Electronics" },
        { _id: "cat2", name: "Clothing" },
        { _id: "cat3", name: "Books" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      await renderCreateProduct();

      await waitFor(() => {
        expect(
          screen.getByRole("option", { name: "Electronics" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Clothing" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("option", { name: "Books" })
        ).toBeInTheDocument();
      });
    });

    test("should not populate categories when API returns success: false", async () => {
      axios.get.mockResolvedValue({
        data: {
          success: false,
          category: [{ _id: "cat1", name: "Should Not Appear" }],
        },
      });

      await renderCreateProduct();

      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.queryByText("Should Not Appear")).not.toBeInTheDocument();

      const categorySelect = screen.getByLabelText("Select a category");
      expect(categorySelect).toBeInTheDocument();
    });

    test("should handle API error and show toast with custom message", async () => {
      const errorMessage = "Network error occurred";
      axios.get.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });

      await renderCreateProduct();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    test("should handle API error and show default message when no response message", async () => {
      axios.get.mockRejectedValue(new Error("Network failed"));

      await renderCreateProduct();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("something went wrong");
      });
    });

    test("should log error to console when API fails", async () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const error = new Error("API Error");
      axios.get.mockRejectedValue(error);

      await renderCreateProduct();

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(error);
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("State Management - User Input", () => {
    beforeEach(async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [{ _id: "cat1", name: "Test" }] },
      });
    });

    test("should update name state on input change", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByPlaceholderText("write a name"), {
          target: { value: "Test Product" },
        });
      });

      expect(screen.getByPlaceholderText("write a name").value).toBe(
        "Test Product"
      );
    });

    test("should update description state on textarea change", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByPlaceholderText("write a description"), {
          target: { value: "Test Description" },
        });
      });

      expect(screen.getByPlaceholderText("write a description").value).toBe(
        "Test Description"
      );
    });

    test("should update price state on input change", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByPlaceholderText("write a Price"), {
          target: { value: "99.99" },
        });
      });

      expect(screen.getByPlaceholderText("write a Price").value).toBe("99.99");
    });

    test("should update quantity state on input change", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
          target: { value: "50" },
        });
      });

      expect(screen.getByPlaceholderText("write a quantity").value).toBe("50");
    });

    test("should update category state on select change", async () => {
      await renderCreateProduct();
      await waitFor(() =>
        expect(screen.getByRole("option", { name: "Test" })).toBeInTheDocument()
      );

      await actDo(async () => {
        fireEvent.change(screen.getByLabelText("Select a category"), {
          target: { value: "cat1" },
        });
      });

      expect(screen.getByLabelText("Select a category").value).toBe("cat1");
    });

    test("should update shipping state when 'No' is selected", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByLabelText("Select Shipping"), {
          target: { value: "0" },
        });
      });

      expect(screen.getByLabelText("Select Shipping").value).toBe("0");
    });

    test("should update shipping state when 'Yes' is selected", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByLabelText("Select Shipping"), {
          target: { value: "1" },
        });
      });

      expect(screen.getByLabelText("Select Shipping").value).toBe("1");
    });
  });

  describe("Photo Upload Functionality", () => {
    beforeEach(async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });
    });

    test("should update photo state when file is selected", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const file = new File(["image"], "test.png", { type: "image/png" });
      const label = screen.getByText("Upload Photo").closest("label");
      const fileInput = label.querySelector("input[type='file']");

      await actDo(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByText("test.png")).toBeInTheDocument();
    });

    test("should display photo preview when photo is selected", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
      const label = screen.getByText("Upload Photo").closest("label");
      const fileInput = label.querySelector("input[type='file']");

      await actDo(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(await screen.findByAltText("product_photo")).toBeInTheDocument();
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    test("should not display photo preview when no photo is selected", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();
    });

    test("should accept only image files", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const label = screen.getByText("Upload Photo").closest("label");
      const fileInput = label.querySelector("input[type='file']");

      expect(fileInput).toHaveAttribute("accept", "image/*");
    });
  });

  describe("handleCreate - Product Creation", () => {
    beforeEach(async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [{ _id: "cat1", name: "Test" }] },
      });
    });

    test("should call API with correct endpoint", async () => {
      axios.post.mockResolvedValue({
        data: { success: true },
      });

      await renderCreateProduct();
      await waitFor(() =>
        expect(screen.getByRole("option", { name: "Test" })).toBeInTheDocument()
      );

      await actDo(async () => {
        fireEvent.click(screen.getByText("CREATE PRODUCT"));
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(MockFormData)
        );
      });
    });

    test("should create FormData with all fields", async () => {
      axios.post.mockResolvedValue({
        data: { success: true },
      });

      await renderCreateProduct();

      // IMPORTANT: ensure options are actually rendered before selecting (fixes category being "")
      await waitFor(() =>
        expect(screen.getByRole("option", { name: "Test" })).toBeInTheDocument()
      );

      const file = new File(["img"], "product.png", { type: "image/png" });

      await actDo(async () => {
        fireEvent.change(screen.getByPlaceholderText("write a name"), {
          target: { value: "Laptop" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a description"), {
          target: { value: "Gaming laptop" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a Price"), {
          target: { value: "1500" },
        });
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
          target: { value: "10" },
        });

        fireEvent.change(screen.getByLabelText("Select a category"), {
          target: { value: "cat1" },
        });

        const label = screen.getByText("Upload Photo").closest("label");
        const fileInput = label.querySelector("input[type='file']");
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.click(screen.getByText("CREATE PRODUCT"));
      });

      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      const [url, formData] = axios.post.mock.calls[0];
      expect(url).toBe("/api/v1/product/create-product");
      expect(formData._data.name).toBe("Laptop");
      expect(formData._data.description).toBe("Gaming laptop");
      expect(formData._data.price).toBe("1500");
      expect(formData._data.quantity).toBe("10");
      expect(formData._data.category).toBe("cat1");
      expect(formData._data.photo).toBe(file);
    });

    test("should handle empty form submission", async () => {
      axios.post.mockResolvedValue({
        data: { success: true },
      });

      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.click(screen.getByText("CREATE PRODUCT"));
      });

      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      const [, formData] = axios.post.mock.calls[0];
      expect(formData._data.name).toBe("");
      expect(formData._data.description).toBe("");
      expect(formData._data.price).toBe("");
      expect(formData._data.quantity).toBe("");
      expect(formData._data.category).toBe("");
      expect(formData._data.photo).toBe("");
    });

    test("should submit FormData without shipping field (not appended)", async () => {
      axios.post.mockResolvedValue({
        data: { success: true },
      });

      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      await actDo(async () => {
        fireEvent.change(screen.getByLabelText("Select Shipping"), {
          target: { value: "1" },
        });
        fireEvent.click(screen.getByText("CREATE PRODUCT"));
      });

      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      const [, formData] = axios.post.mock.calls[0];

      expect(formData._data.shipping).toBeUndefined();

      expect(formData._data).toHaveProperty("name");
      expect(formData._data).toHaveProperty("description");
      expect(formData._data).toHaveProperty("price");
      expect(formData._data).toHaveProperty("quantity");
      expect(formData._data).toHaveProperty("photo");
      expect(formData._data).toHaveProperty("category");
    });
  });

  describe("Edge Cases", () => {
    test("should handle multiple category selections", async () => {
      const mockCategories = [
        { _id: "cat1", name: "Category 1" },
        { _id: "cat2", name: "Category 2" },
      ];

      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      await renderCreateProduct();

      await waitFor(() =>
        expect(
          screen.getByRole("option", { name: "Category 1" })
        ).toBeInTheDocument()
      );

      const categorySelect = screen.getByLabelText("Select a category");

      await actDo(async () => {
        fireEvent.change(categorySelect, { target: { value: "cat1" } });
      });
      expect(categorySelect.value).toBe("cat1");

      await actDo(async () => {
        fireEvent.change(categorySelect, { target: { value: "cat2" } });
      });
      expect(categorySelect.value).toBe("cat2");
    });

    test("should handle rapid button clicks", async () => {
      axios.post.mockResolvedValue({
        data: { success: true },
      });

      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const button = screen.getByText("CREATE PRODUCT");

      await actDo(async () => {
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);
      });

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(axios.post).toHaveBeenCalled();
    });

    test("should handle file input without selecting a file", async () => {
      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const label = screen.getByText("Upload Photo").closest("label");
      const fileInput = label.querySelector("input[type='file']");

      await actDo(async () => {
        fireEvent.change(fileInput, { target: { files: [] } });
      });

      expect(screen.queryByAltText("product_photo")).not.toBeInTheDocument();
    });

    test("should handle numeric input with decimal values", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const priceInput = screen.getByPlaceholderText("write a Price");

      await actDo(async () => {
        fireEvent.change(priceInput, { target: { value: "123.45" } });
      });

      expect(priceInput.value).toBe("123.45");
    });

    test("should handle negative numeric values", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      await renderCreateProduct();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const quantityInput = screen.getByPlaceholderText("write a quantity");

      await actDo(async () => {
        fireEvent.change(quantityInput, { target: { value: "-5" } });
      });

      expect(quantityInput.value).toBe("-5");
    });
  });
});
