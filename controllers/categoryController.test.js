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
  const mockSave = jest.fn();

  const ModelCtor = jest.fn(function (doc) {
    return { ...doc, save: mockSave };
  });

  ModelCtor.create = jest.fn();
  ModelCtor.findOne = jest.fn();
  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.find = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();

  ModelCtor.__mockSave = mockSave;

  return { __esModule: true, default: ModelCtor };
});

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

    test("creates category successfully (supports create() OR new().save())", async () => {
      const req = { body: { name: "Shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce(null);
      slugify.mockReturnValueOnce("shoes");

      categoryModel.create.mockResolvedValueOnce({
        _id: "new1",
        name: "Shoes",
        slug: "shoes",
      });

      categoryModel.__mockSave.mockResolvedValueOnce({
        _id: "new1",
        name: "Shoes",
        slug: "shoes",
      });

      await createCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith("Shoes");

      const usedCreate = categoryModel.create.mock.calls.length > 0;
      const usedCtor = categoryModel.mock.calls.length > 0;

      expect(usedCreate || usedCtor).toBe(true);

      if (usedCreate) {
        expect(categoryModel.create).toHaveBeenCalledWith({
          name: "Shoes",
          slug: "shoes",
        });
      } else {
        expect(categoryModel).toHaveBeenCalledWith({
          name: "Shoes",
          slug: "shoes",
        });
        expect(categoryModel.__mockSave).toHaveBeenCalled();
      }

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "new category created",
          category: expect.objectContaining({
            name: "Shoes",
            slug: "shoes",
          }),
        })
      );
    });

    test("returns 500 when DB throws (match actual controller message)", async () => {
      const req = { body: { name: "Shoes" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("DB down"));

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Category", 
        })
      );
    });
  });

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
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          category: { _id: "c1", name: "NewName", slug: "newname" },
        })
      );
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
