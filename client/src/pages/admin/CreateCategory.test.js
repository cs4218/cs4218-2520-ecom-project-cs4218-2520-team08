// CreateCategory.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import CreateCategory from "../../pages/admin/CreateCategory";

const flushPromises = () => new Promise((r) => setTimeout(r, 0));
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});


beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation((msg, ...args) => {
    // keep your key warning suppressed
    if (
      typeof msg === "string" &&
      msg.includes('Each child in a list should have a unique "key" prop')
    ) {
      return;
    }
    console.error(msg, ...args);
  });
});

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
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

async function renderPage() {
  let utils;
  await act(async () => {
    utils = render(
      <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
        <Routes>
          <Route
            path="/dashboard/admin/create-category"
            element={<CreateCategory />}
          />
        </Routes>
      </MemoryRouter>
    );
  });

  // allow mount useEffect GET + any setState to settle inside act
  await act(async () => {
    await flushPromises();
  });

  return utils;
}

async function actDo(fn) {
  await act(async () => {
    await fn();
  });
}

describe("CreateCategory (pages/admin) — coverage boost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default mount GET
    axios.get.mockResolvedValue({ data: { success: true, category: [] } });
  });

  test("renders base page chrome (Layout/AdminMenu/table headers) + calls GET on mount", async () => {
    await renderPage();

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(screen.getByText("Manage Category")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );
  });

  test("GET success:true -> renders rows (map branch)", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: [
          { _id: "c1", name: "Shoes" },
          { _id: "c2", name: "Hats" },
        ],
      },
    });

    await renderPage();

    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());
    expect(screen.getByText("Hats")).toBeInTheDocument();
    expect(screen.getAllByText("Edit")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
  });

  test("GET success:false -> does not set categories (no rows rendered)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: false, category: [{ _id: "c1", name: "Shoes" }] },
    });

    await renderPage();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );
    expect(screen.queryByText("Shoes")).not.toBeInTheDocument();
  });

  test("GET rejects -> toast.error in catch", async () => {
    axios.get.mockRejectedValueOnce(new Error("GET fail"));

    await renderPage();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
  });

  test("GET resolves malformed {} -> throws inside try -> toast.error catch", async () => {
    axios.get.mockResolvedValueOnce({}); // no data => data.success throws

    await renderPage();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category")
    );

    expect(toast.error).toHaveBeenCalledWith(
      "Something wwent wrong in getting catgeory"
    );
  });

  test("CREATE success -> toast.success + refresh GET -> new row appears", async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "NewCat" }] },
    });

    await renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    await actDo(async () => {
      fireEvent.change(screen.getByLabelText("category-input"), {
        target: { value: "NewCat" },
      });
      fireEvent.click(screen.getByText("SUBMIT"));
    });

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/category/create-category",
        { name: "NewCat" }
      )
    );

    expect(toast.success).toHaveBeenCalledWith("NewCat is created");

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("NewCat")).toBeInTheDocument());
  });

  test("CREATE success:false -> toast.error(data.message)", async () => {
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Already exists" },
    });

    await renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    await actDo(async () => {
      fireEvent.change(screen.getByLabelText("category-input"), {
        target: { value: "Dup" },
      });
      fireEvent.click(screen.getByText("SUBMIT"));
    });

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Already exists");
  });

  test("CREATE rejects -> toast.error catch", async () => {
    axios.post.mockRejectedValueOnce(new Error("POST fail"));

    await renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    await actDo(async () => {
      fireEvent.change(screen.getByLabelText("category-input"), {
        target: { value: "X" },
      });
      fireEvent.click(screen.getByText("SUBMIT"));
    });

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("somthing went wrong in input form");
  });

  test("CREATE resolves data:undefined -> else reads data.message -> throws -> catch toast.error", async () => {
    axios.post.mockResolvedValueOnce({ data: undefined });

    await renderPage();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    await actDo(async () => {
      fireEvent.change(screen.getByLabelText("category-input"), {
        target: { value: "BadResp" },
      });
      fireEvent.click(screen.getByText("SUBMIT"));
    });

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("somthing went wrong in input form");
  });

  test("Edit opens modal, seeds updatedName, CLOSE triggers onCancel (setVisible false)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    expect(screen.getByTestId("modal")).toBeInTheDocument();

    const modalInput = screen.getAllByLabelText("category-input")[1];
    expect(modalInput).toHaveValue("Shoes");

    await actDo(async () => {
      fireEvent.click(screen.getByText("CLOSE"));
    });
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  test("UPDATE success -> toast.success + resets modal state + refresh renders updated row", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockResolvedValueOnce({ data: { success: true } });

    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes2" }] },
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    await waitFor(() => expect(screen.getByTestId("modal")).toBeInTheDocument());

    const modalInput = screen.getAllByLabelText("category-input")[1];
    await actDo(async () => {
      fireEvent.change(modalInput, { target: { value: "Shoes2" } });
      const submits = await screen.findAllByText("SUBMIT");
      fireEvent.click(submits[1]);
    });

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/category/update-category/c1",
        { name: "Shoes2" }
      )
    );

    expect(toast.success).toHaveBeenCalledWith("Shoes2 is updated");

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByTestId("modal")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Shoes2")).toBeInTheDocument();

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    const reopenedModalInput = screen.getAllByLabelText("category-input")[1];
    expect(reopenedModalInput).toHaveValue("Shoes2");
  });

  test("UPDATE success:false -> toast.error(data.message)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockResolvedValueOnce({
      data: { success: false, message: "Update failed" },
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    await waitFor(() => expect(screen.getByTestId("modal")).toBeInTheDocument());

    await actDo(async () => {
      const submits = await screen.findAllByText("SUBMIT");
      fireEvent.click(submits[1]);
    });

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });

  test("UPDATE rejects -> toast.error catch", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockRejectedValueOnce(new Error("PUT fail"));

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    await waitFor(() => expect(screen.getByTestId("modal")).toBeInTheDocument());

    await actDo(async () => {
      const submits = await screen.findAllByText("SUBMIT");
      fireEvent.click(submits[1]);
    });

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });

  test("UPDATE resolves malformed {} -> throws inside try -> toast.error catch", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.put.mockResolvedValueOnce({}); // no data => data.success throws

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Edit"));
    });
    await waitFor(() => expect(screen.getByTestId("modal")).toBeInTheDocument());

    await actDo(async () => {
      const submits = await screen.findAllByText("SUBMIT");
      fireEvent.click(submits[1]);
    });

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });

  test("DELETE success -> toast.success + refresh removes row", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockResolvedValueOnce({ data: { success: true } });

    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [] },
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/category/delete-category/c1"
      )
    );

    expect(toast.success).toHaveBeenCalledWith("category is deleted");

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText("Shoes")).not.toBeInTheDocument()
    );
  });

  test("DELETE success:false -> toast.error(data.message)", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockResolvedValueOnce({
      data: { success: false, message: "Delete failed" },
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Delete failed");
  });

  test("DELETE rejects -> toast.error catch", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockRejectedValueOnce(new Error("DELETE fail"));

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });

  test("DELETE resolves data:undefined -> throws inside try -> toast.error catch", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, category: [{ _id: "c1", name: "Shoes" }] },
    });

    axios.delete.mockResolvedValueOnce({ data: undefined }); // data.success throws

    await renderPage();
    await waitFor(() => expect(screen.getByText("Shoes")).toBeInTheDocument());

    await actDo(async () => {
      fireEvent.click(screen.getByText("Delete"));
    });

    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
  });
});
