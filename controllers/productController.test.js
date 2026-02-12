import {
  createProductController,
  updateProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
} from "./productController.js";

import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import fs from "fs";
import slugify from "slugify";

// ---------- Mocks needed just to import productController.js safely ----------
jest.mock("dotenv", () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));

jest.mock("braintree", () => ({
  __esModule: true,
  default: {
    Environment: { Sandbox: {} },
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    })),
  },
}));

jest.mock("fs", () => ({
  __esModule: true,
  default: { readFileSync: jest.fn() },
}));

jest.mock("slugify", () => ({
  __esModule: true,
  default: jest.fn(),
}));


jest.mock("../models/productModel.js", () => {
  const ctorSaveMock = jest.fn();

  const ModelCtor = jest.fn(function (doc) {
    return {
      ...doc,
      photo: { data: null, contentType: null },
      save: ctorSaveMock,
    };
  });

  ModelCtor.find = jest.fn();
  ModelCtor.findOne = jest.fn();
  ModelCtor.findById = jest.fn();
  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();

  ModelCtor.__ctorSaveMock = ctorSaveMock;

  return { __esModule: true, default: ModelCtor };
});

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

// orderModel not needed for these tests (payment functions), so ignore

// ---------- Helpers ----------
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// chain that ends with .sort(...) awaited
function chainEndingWithSort(result) {
  const q = {
    populate: jest.fn().mockReturnValue(q),
    select: jest.fn().mockReturnValue(q),
    limit: jest.fn().mockReturnValue(q),
    skip: jest.fn().mockReturnValue(q),
    sort: jest.fn().mockResolvedValue(result),
  };
  return q;
}

// chain that ends with .select(...) awaited
function chainEndingWithSelect(result) {
  const q = {
    select: jest.fn().mockResolvedValue(result),
  };
  return q;
}

describe("productController.js — increase coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------- createProductController ----------------
  describe("createProductController", () => {
    test("validation: missing name -> 500", async () => {
      const req = {
        fields: { name: "", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    test("validation: photo too big -> 500", async () => {
      const req = {
        fields: { name: "A", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: { size: 1000001, path: "/tmp/x", type: "image/png" } },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    test("happy: without photo -> 201", async () => {
      const req = {
        fields: { name: "Phone", description: "d", price: 10, category: "c", quantity: 2, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("phone");
      productModel.__ctorSaveMock.mockResolvedValueOnce(undefined);

      await createProductController(req, res);

      expect(productModel).toHaveBeenCalledWith({ ...req.fields, slug: "phone" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Product Created Successfully" })
      );
    });

    test("happy: with photo -> reads file -> 201", async () => {
      const req = {
        fields: { name: "Cam", description: "d", price: 10, category: "c", quantity: 2, shipping: 1 },
        files: { photo: { size: 1000, path: "/tmp/p.png", type: "image/png" } },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("cam");
      fs.readFileSync.mockReturnValueOnce(Buffer.from("img"));
      productModel.__ctorSaveMock.mockResolvedValueOnce(undefined);

      await createProductController(req, res);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p.png");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("error: save throws -> 500", async () => {
      const req = {
        fields: { name: "Phone", description: "d", price: 10, category: "c", quantity: 2, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("phone");
      productModel.__ctorSaveMock.mockRejectedValueOnce(new Error("save fail"));

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Error in crearing product" })
      );
    });
  });

  // ---------------- updateProductController ----------------
  describe("updateProductController", () => {
    test("validation: missing price -> 500", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "X", description: "d", price: "", category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test("happy: updates without photo -> 201", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("new");

      const docSave = jest.fn().mockResolvedValueOnce(undefined);
      productModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: "p1",
        ...req.fields,
        slug: "new",
        photo: { data: null, contentType: null },
        save: docSave,
      });

      await updateProductController(req, res);

      expect(docSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("happy: updates with photo -> reads file -> 201", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
        files: { photo: { size: 1000, path: "/tmp/p.png", type: "image/png" } },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("new");
      fs.readFileSync.mockReturnValueOnce(Buffer.from("img"));

      const docSave = jest.fn().mockResolvedValueOnce(undefined);
      productModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: "p1",
        ...req.fields,
        slug: "new",
        photo: { data: null, contentType: null },
        save: docSave,
      });

      await updateProductController(req, res);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p.png");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("error: findByIdAndUpdate throws -> 500", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      productModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("fail"));

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Error in Updte product" })
      );
    });
  });

  // ---------------- deleteProductController ----------------
  describe("deleteProductController", () => {
    test("happy: delete -> 200", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      const chain = { select: jest.fn().mockResolvedValueOnce(undefined) };
      productModel.findByIdAndDelete.mockReturnValueOnce(chain);

      await deleteProductController(req, res);

      expect(chain.select).toHaveBeenCalledWith("-photo");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error: delete throws -> 500", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findByIdAndDelete.mockImplementationOnce(() => {
        throw new Error("delete fail");
      });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Error while deleting product" })
      );
    });
  });

  // ---------------- getProductController ----------------
  describe("getProductController", () => {
    test("happy: returns products list -> 200", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockReturnValueOnce(
        chainEndingWithSort([{ _id: "p1" }, { _id: "p2" }])
      );

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, counTotal: 2 })
      );
    });

    test("error: find chain throws -> 500", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("find fail");
      });

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Erorr in getting products" })
      );
    });
  });

  // ---------------- getSingleProductController ----------------
  describe("getSingleProductController", () => {
    test("happy: returns single product -> 200", async () => {
      const req = { params: { slug: "phone" } };
      const res = mockRes();

      const q = {
        select: jest.fn().mockReturnValue(q),
        populate: jest.fn().mockResolvedValue({ _id: "p1", slug: "phone" }),
      };
      productModel.findOne.mockReturnValueOnce(q);

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, product: { _id: "p1", slug: "phone" } })
      );
    });

    test("error: findOne throws -> 500", async () => {
      const req = { params: { slug: "phone" } };
      const res = mockRes();

      productModel.findOne.mockImplementationOnce(() => {
        throw new Error("findOne fail");
      });

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------- productPhotoController ----------------
  describe("productPhotoController", () => {
    test("happy: product has photo -> sets content-type and returns data", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      const q = {
        select: jest.fn().mockResolvedValue({
          photo: { data: Buffer.from("img"), contentType: "image/png" },
        }),
      };
      productModel.findById.mockReturnValueOnce(q);

      await productPhotoController(req, res);

      expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(Buffer.from("img"));
    });

    test("error: findById throws -> 500", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findById.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------------- productFiltersController ----------------
  describe("productFiltersController", () => {
    test("happy: checked and radio produce args -> 200", async () => {
      const req = { body: { checked: ["c1"], radio: [10, 50] } };
      const res = mockRes();

      productModel.find.mockResolvedValueOnce([{ _id: "p1" }]);

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: ["c1"],
        price: { $gte: 10, $lte: 50 },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 400", async () => {
      const req = { body: { checked: [], radio: [] } };
      const res = mockRes();

      productModel.find.mockRejectedValueOnce(new Error("fail"));

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------------- productCountController ----------------
  describe("productCountController", () => {
    test("happy: returns total -> 200", async () => {
      const req = {};
      const res = mockRes();

      const q = { estimatedDocumentCount: jest.fn().mockResolvedValueOnce(99) };
      productModel.find.mockReturnValueOnce(q);

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ success: true, total: 99 });
    });

    test("error -> 400", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await productCountController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------------- productListController ----------------
  describe("productListController", () => {
    test("happy: default page (no param) -> 200", async () => {
      const req = { params: {} };
      const res = mockRes();

      productModel.find.mockReturnValueOnce(chainEndingWithSort([{ _id: "p1" }]));

      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 400", async () => {
      const req = { params: { page: "2" } };
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------------- searchProductController ----------------
  describe("searchProductController", () => {
    test("happy: returns json results", async () => {
      const req = { params: { keyword: "ph" } };
      const res = mockRes();

      productModel.find.mockReturnValueOnce(chainEndingWithSelect([{ _id: "p1" }]));

      await searchProductController(req, res);

      expect(res.json).toHaveBeenCalledWith([{ _id: "p1" }]);
    });

    test("error -> 400", async () => {
      const req = { params: { keyword: "ph" } };
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await searchProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------------- realtedProductController ----------------
  describe("realtedProductController", () => {
    test("happy -> 200", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      const q = {
        select: jest.fn().mockReturnValue(q),
        limit: jest.fn().mockReturnValue(q),
        populate: jest.fn().mockResolvedValue([{ _id: "p2" }]),
      };
      productModel.find.mockReturnValueOnce(q);

      await realtedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 400", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await realtedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------------- productCategoryController ----------------
  describe("productCategoryController", () => {
    test("happy -> 200", async () => {
      const req = { params: { slug: "cat-slug" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce({ _id: "c1", slug: "cat-slug" });

      const q = {
        populate: jest.fn().mockResolvedValue([{ _id: "p1" }]),
      };
      productModel.find.mockReturnValueOnce(q);

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "cat-slug" });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 400", async () => {
      const req = { params: { slug: "cat-slug" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("fail"));

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
