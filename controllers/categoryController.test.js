import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} from "./categoryController.js";

import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

jest.mock("slugify", () => ({
  __esModule: true,
  default: jest.fn(),
}));


jest.mock("../models/categoryModel.js", () => {
  const saveMock = jest.fn();

  const ModelCtor = jest.fn(function (doc) {
    return {
      ...doc,
      save: saveMock,
    };
  });

  ModelCtor.findOne = jest.fn();
  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.find = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();

  // expose saveMock so tests can access it
  ModelCtor.__saveMock = saveMock;

  return {
    __esModule: true,
    default: ModelCtor,
  };
});

// helper res mock
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("controllers/categoryController.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- createCategoryController ----------------
  describe("createCategoryController", () => {
    test("returns 401 when name missing", async () => {
      const req = { body: {} };
      const res = mockRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
      expect(categoryModel.findOne).not.toHaveBeenCalled();
    });

    test("returns 200 when category already exists", async () => {
      const req = { body: { name: "Shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce({ _id: "c1", name: "Shoes" });

      await createCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Shoes" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category Already Exisits",
      });
    });

    test("creates category and returns 201", async () => {
      const req = { body: { name: "Shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce(null);
      slugify.mockReturnValueOnce("shoes");

      categoryModel.__saveMock.mockResolvedValueOnce({
        _id: "new1",
        name: "Shoes",
        slug: "shoes",
      });

      await createCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith("Shoes");

      // constructor called with expected doc
      expect(categoryModel).toHaveBeenCalledWith({
        name: "Shoes",
        slug: "shoes",
      });

      expect(categoryModel.__saveMock).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "new category created",
        category: { _id: "new1", name: "Shoes", slug: "shoes" },
      });
    });

    test("returns 500 when DB throws (requires fixing errro->error in controller)", async () => {
      const req = { body: { name: "Shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("DB down"));

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      // After you fix the controller bug (errro -> error), this is stable:
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Errro in Category",
        })
      );
    });
  });

  // ---------------- updateCategoryController ----------------
  describe("updateCategoryController", () => {
    test("updates category and returns 200", async () => {
      const req = { body: { name: "NewName" }, params: { id: "c1" } };
      const res = mockRes();

      slugify.mockReturnValueOnce("newname");
      categoryModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: "c1",
        name: "NewName",
        slug: "newname",
      });

      await updateCategoryController(req, res);

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "c1",
        { name: "NewName", slug: "newname" },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        messsage: "Category Updated Successfully",
        category: { _id: "c1", name: "NewName", slug: "newname" },
      });
    });

    test("returns 500 when update throws", async () => {
      const req = { body: { name: "X" }, params: { id: "c1" } };
      const res = mockRes();

      categoryModel.findByIdAndUpdate.mockRejectedValueOnce(
        new Error("update fail")
      );

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating category",
        })
      );
    });
  });

  // ---------------- categoryControlller ----------------
  describe("categoryControlller (get all)", () => {
    test("returns 200 with categories", async () => {
      const req = {};
      const res = mockRes();

      categoryModel.find.mockResolvedValueOnce([
        { _id: "c1", name: "Shoes" },
        { _id: "c2", name: "Hats" },
      ]);

      await categoryControlller(req, res);

      expect(categoryModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All Categories List",
        category: [
          { _id: "c1", name: "Shoes" },
          { _id: "c2", name: "Hats" },
        ],
      });
    });

    test("returns 500 when find throws", async () => {
      const req = {};
      const res = mockRes();

      categoryModel.find.mockRejectedValueOnce(new Error("find fail"));

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting all categories",
        })
      );
    });
  });

  // ---------------- singleCategoryController ----------------
  describe("singleCategoryController", () => {
    test("returns 200 with a single category", async () => {
      const req = { params: { slug: "shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce({
        _id: "c1",
        name: "Shoes",
        slug: "shoes",
      });

      await singleCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "shoes" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get SIngle Category SUccessfully",
        category: { _id: "c1", name: "Shoes", slug: "shoes" },
      });
    });

    test("returns 500 when findOne throws", async () => {
      const req = { params: { slug: "shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("findOne fail"));

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While getting Single Category",
        })
      );
    });
  });

  // ---------------- deleteCategoryCOntroller ----------------
  describe("deleteCategoryCOntroller", () => {
    test("deletes category and returns 200", async () => {
      const req = { params: { id: "c1" } };
      const res = mockRes();

      categoryModel.findByIdAndDelete.mockResolvedValueOnce({});

      await deleteCategoryCOntroller(req, res);

      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("c1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Categry Deleted Successfully",
      });
    });

    test("returns 500 when delete throws", async () => {
      const req = { params: { id: "c1" } };
      const res = mockRes();

      categoryModel.findByIdAndDelete.mockRejectedValueOnce(
        new Error("delete fail")
      );

      await deleteCategoryCOntroller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "error while deleting category",
        })
      );
    });
  });
});
