import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdateProduct from "./UpdateProduct";
import axios from "axios";
import toast from "react-hot-toast";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("./../../components/Layout", () => {
  return ({ children }) => <div data-testid="layout">{children}</div>;
});
jest.mock("./../../components/AdminMenu", () => {
  return () => <div data-testid="admin-menu" />;
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: "test-slug" }),
}));

jest.mock("antd", () => {
  const React = require("react");

  const Option = ({ children }) => <>{children}</>;

  const Select = ({ placeholder, value, onChange, children }) => {
    const options = React.Children.toArray(children).map((child) => {
      if (!child) return null;
      const optValue = child.props.value;
      const optLabel = child.props.children;
      return (
        <button
          key={String(optValue)}
          type="button"
          data-testid={`opt-${String(optValue)}`}
          onClick={() => onChange(optValue)}
        >
          {optLabel}
        </button>
      );
    });

    return (
      <div data-testid="select">
        <div data-testid="select-placeholder">{placeholder}</div>
        <div data-testid="select-value">{String(value ?? "")}</div>
        <div>{options}</div>
      </div>
    );
  };

  Select.Option = Option;

  return { Select };
});

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
});

beforeEach(() => {
  jest.clearAllMocks();
  window.prompt = jest.fn(() => "yes");
});

function setupDefaultAxios() {
  axios.get.mockImplementation((url) => {
    if (url.startsWith("/api/v1/product/get-product/")) {
      return Promise.resolve({
        data: {
          product: {
            _id: "p1",
            name: "Old Name",
            description: "Old Desc",
            price: 99,
            quantity: 5,
            shipping: 1,
            category: { _id: "cat2", name: "Cat 2" },
          },
        },
      });
    }
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: [
            { _id: "cat1", name: "Cat 1" },
            { _id: "cat2", name: "Cat 2" },
          ],
        },
      });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
}

function getFileInput(container) {
  // there is exactly one file input in this component
  const input = container.querySelector('input[type="file"][name="photo"]');
  if (!input) throw new Error("File input not found");
  return input;
}

// Helper: read FormData entries (jsdom supports FormData#entries)
function formDataToObject(fd) {
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = v;
  return out;
}

async function waitForInitialLoad() {
  await waitFor(() =>
    expect(screen.getByPlaceholderText("write a name")).toHaveValue("Old Name")
  );
  await waitFor(() => expect(screen.getByTestId("opt-cat1")).toBeInTheDocument());
}

test("fetches single product on mount and populates form fields", async () => {
  setupDefaultAxios();
  render(<UpdateProduct />);

  await waitForInitialLoad();

  expect(screen.getByPlaceholderText("write a description")).toHaveValue("Old Desc");
  expect(screen.getByPlaceholderText("write a Price")).toHaveValue(99);
  expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(5);

  expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product/test-slug");
  expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
});

test("loads categories and selecting a category updates internal state", async () => {
  setupDefaultAxios();
  render(<UpdateProduct />);

  await waitForInitialLoad();

  fireEvent.click(screen.getByTestId("opt-cat1"));

  // Category Select is the first Select in this component
  const selects = screen.getAllByTestId("select");
  const firstSelect = selects[0];
  expect(within(firstSelect).getByTestId("select-value")).toHaveTextContent("cat1");
});

test("selecting a photo shows preview using URL.createObjectURL", async () => {
  setupDefaultAxios();
  const { container } = render(<UpdateProduct />);

  await waitForInitialLoad();

  const file = new File(["img"], "test.png", { type: "image/png" });
  const input = getFileInput(container);

  await userEvent.upload(input, file);

  expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  const img = screen.getByAltText("product_photo");
  expect(img).toHaveAttribute("src", "blob:mock-url");
});

test("handleUpdate sends PUT with FormData and navigates on success", async () => {
  setupDefaultAxios();
  axios.put.mockResolvedValue({ data: { success: true } });

  const { container } = render(<UpdateProduct />);

  await waitForInitialLoad();

  await userEvent.clear(screen.getByPlaceholderText("write a name"));
  await userEvent.type(screen.getByPlaceholderText("write a name"), "New Name");

  await userEvent.clear(screen.getByPlaceholderText("write a description"));
  await userEvent.type(screen.getByPlaceholderText("write a description"), "New Desc");

  await userEvent.clear(screen.getByPlaceholderText("write a Price"));
  await userEvent.type(screen.getByPlaceholderText("write a Price"), "123");

  await userEvent.clear(screen.getByPlaceholderText("write a quantity"));
  await userEvent.type(screen.getByPlaceholderText("write a quantity"), "9");

  // select category cat1
  fireEvent.click(screen.getByTestId("opt-cat1"));

  // select shipping yes ("1")
  fireEvent.click(screen.getByTestId("opt-1"));

  // upload file
  const file = new File(["img"], "p.png", { type: "image/png" });
  await userEvent.upload(getFileInput(container), file);

  await userEvent.click(screen.getByRole("button", { name: /update product/i }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));

  const [url, fd] = axios.put.mock.calls[0];
  expect(url).toBe("/api/v1/product/update-product/p1");
  expect(fd).toBeInstanceOf(FormData);

  const body = formDataToObject(fd);
  expect(body.name).toBe("New Name");
  expect(body.description).toBe("New Desc");
  expect(body.price).toBe("123");
  expect(body.quantity).toBe("9");
  expect(body.category).toBe("cat1");
  expect(body.shipping).toBe("1");
  expect(body.photo).toBe(file);

  expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
});

test("handleUpdate shows error toast when API returns success=false", async () => {
  setupDefaultAxios();
  axios.put.mockResolvedValue({ data: { success: false, message: "Nope" } });

  render(<UpdateProduct />);

  await waitForInitialLoad();

  await userEvent.click(screen.getByRole("button", { name: /update product/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Nope"));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("handleUpdate shows generic error toast when PUT throws", async () => {
  setupDefaultAxios();
  axios.put.mockRejectedValue(new Error("Network"));

  render(<UpdateProduct />);

  await waitForInitialLoad();

  await userEvent.click(screen.getByRole("button", { name: /update product/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("something went wrong"));
});

test("handleDelete calls DELETE and navigates when user confirms prompt", async () => {
  setupDefaultAxios();
  axios.delete.mockResolvedValue({ data: { success: true } });
  window.prompt = jest.fn(() => "yes");

  render(<UpdateProduct />);

  await waitForInitialLoad();

  await userEvent.click(screen.getByRole("button", { name: /delete product/i }));

  await waitFor(() =>
    expect(axios.delete).toHaveBeenCalledWith("/api/v1/product/delete-product/p1")
  );

  expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
  expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
});

test("handleDelete does nothing when user cancels prompt", async () => {
  setupDefaultAxios();
  axios.delete.mockResolvedValue({ data: { success: true } });
  window.prompt = jest.fn(() => "");

  render(<UpdateProduct />);

  await waitForInitialLoad();

  await userEvent.click(screen.getByRole("button", { name: /delete product/i }));

  expect(axios.delete).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});
