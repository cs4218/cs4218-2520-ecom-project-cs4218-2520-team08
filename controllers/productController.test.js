jest.mock("dotenv", () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));


jest.mock("braintree", () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();

  return {
    __esModule: true,
    default: {
      Environment: { Sandbox: {} },
      BraintreeGateway: jest.fn().mockImplementation(() => ({
        clientToken: { generate: mockGenerate },
        transaction: { sale: mockSale },
      })),
      __mocks: { mockGenerate, mockSale },
    },
  };
});

jest.mock("fs", () => ({
  __esModule: true,
  default: { readFileSync: jest.fn() },
}));

jest.mock("slugify", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../models/productModel.js", () => {
  const mockCtorSave = jest.fn();

  const ModelCtor = jest.fn(function (doc) {
    return {
      ...doc,
      photo: { data: null, contentType: null },
      save: mockCtorSave,
    };
  });

  ModelCtor.find = jest.fn();
  ModelCtor.findOne = jest.fn();
  ModelCtor.findById = jest.fn();
  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();
  ModelCtor.__mockCtorSave = mockCtorSave;

  return { __esModule: true, default: ModelCtor };
});

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

jest.mock("../models/orderModel.js", () => {
  const mockSave = jest.fn();
  const Ctor = jest.fn(function (doc) {
    return { ...doc, save: mockSave };
  });
  Ctor.__mockSave = mockSave;
  return { __esModule: true, default: Ctor };
});

import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";

import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

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
  braintreeTokenController,
  brainTreePaymentController,
} from "./productController.js";

const { mockGenerate, mockSale } = braintree.__mocks;

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

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

function chainSelectPopulate(result) {
  const q = {
    select: jest.fn().mockReturnValue(q),
    populate: jest.fn().mockResolvedValue(result),
  };
  return q;
}

function chainSelectLimitPopulate(result) {
  const q = {
    select: jest.fn().mockReturnValue(q),
    limit: jest.fn().mockReturnValue(q),
    populate: jest.fn().mockResolvedValue(result),
  };
  return q;
}

function chainEndingWithSelect(result) {
  const q = { select: jest.fn().mockResolvedValue(result) };
  return q;
}

describe("controllers/productController.js", () => {
  beforeEach(() => jest.clearAllMocks());

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
      expect(productModel).not.toHaveBeenCalled();
    });

    test("validation: missing description -> 500", async () => {
      const req = {
        fields: { name: "A", description: "", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    test("validation: missing price -> 500", async () => {
      const req = {
        fields: { name: "A", description: "d", price: "", category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    test("validation: photo too big -> 500 (branch)", async () => {
      const req = {
        fields: { name: "A", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: { size: 1000001, path: "/tmp/x", type: "image/png" } },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(productModel).not.toHaveBeenCalled();
    });

    test("happy: creates without photo -> 201", async () => {
      const req = {
        fields: { name: "Phone", description: "Nice", price: 10, category: "c", quantity: 2, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("phone");
      productModel.__mockCtorSave.mockResolvedValueOnce(undefined);

      await createProductController(req, res);

      expect(productModel).toHaveBeenCalledWith({ ...req.fields, slug: "phone" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "Product Created Successfully" })
      );
    });

    test("happy: creates with photo -> reads file -> 201 (branch)", async () => {
      const req = {
        fields: { name: "Cam", description: "Nice", price: 10, category: "c", quantity: 2, shipping: 1 },
        files: { photo: { size: 999, path: "/tmp/p.png", type: "image/png" } },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("cam");
      fs.readFileSync.mockReturnValueOnce(Buffer.from("img"));
      productModel.__mockCtorSave.mockResolvedValueOnce(undefined);

      await createProductController(req, res);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p.png");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("error -> 500 Error in crearing product", async () => {
      const req = {
        fields: { name: "X", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("x");
      productModel.__mockCtorSave.mockRejectedValueOnce(new Error("save fail"));

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Error in crearing product" })
      );
    });
  });

  describe("updateProductController", () => {
    test("validation: missing category -> 500", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "X", description: "d", price: 1, category: "", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      await updateProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    test("happy: update without photo -> 201", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
        files: { photo: null },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("new");

      const docSave = jest.fn().mockResolvedValueOnce(undefined);
      productModel.findByIdAndUpdate.mockResolvedValueOnce({
        photo: { data: null, contentType: null },
        save: docSave,
      });

      await updateProductController(req, res);

      expect(docSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("happy: update with photo -> reads file -> 201 (branch)", async () => {
      const req = {
        params: { pid: "p1" },
        fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
        files: { photo: { size: 500, path: "/tmp/z.png", type: "image/png" } },
      };
      const res = mockRes();

      slugify.mockReturnValueOnce("new");
      fs.readFileSync.mockReturnValueOnce(Buffer.from("img"));

      const docSave = jest.fn().mockResolvedValueOnce(undefined);
      productModel.findByIdAndUpdate.mockResolvedValueOnce({
        photo: { data: null, contentType: null },
        save: docSave,
      });

      await updateProductController(req, res);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/z.png");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("error -> 500 Error in Updte product", async () => {
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

  describe("deleteProductController", () => {
    test("happy -> 200", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      const chain = { select: jest.fn().mockResolvedValueOnce(undefined) };
      productModel.findByIdAndDelete.mockReturnValueOnce(chain);

      await deleteProductController(req, res);

      expect(chain.select).toHaveBeenCalledWith("-photo");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 500", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findByIdAndDelete.mockImplementationOnce(() => {
        throw new Error("boom");
      });

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getProductController", () => {
    test("happy -> 200", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockReturnValueOnce(chainEndingWithSort([{ _id: "p1" }, { _id: "p2" }]));
      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 500", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await getProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getSingleProductController", () => {
    test("happy -> 200", async () => {
      const req = { params: { slug: "abc" } };
      const res = mockRes();

      productModel.findOne.mockReturnValueOnce(chainSelectPopulate({ _id: "p1" }));

      await getSingleProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 500", async () => {
      const req = { params: { slug: "abc" } };
      const res = mockRes();

      productModel.findOne.mockImplementationOnce(() => {
        throw new Error("fail");
      });

      await getSingleProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("productPhotoController", () => {
    test("photo exists -> sets header + sends", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({
          photo: { data: Buffer.from("img"), contentType: "image/png" },
        }),
      });

      await productPhotoController(req, res);

      expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
    });

    test("photo missing -> branch no send", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({
          photo: { data: null, contentType: "image/png" },
        }),
      });

      await productPhotoController(req, res);

      expect(res.send).not.toHaveBeenCalled();
    });

    test("error -> 500", async () => {
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
    test("checked + radio -> args has both (branch)", async () => {
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

    test("only checked (branch)", async () => {
      const req = { body: { checked: ["c1"], radio: [] } };
      const res = mockRes();

      productModel.find.mockResolvedValueOnce([{ _id: "p1" }]);
      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({ category: ["c1"] });
    });

    test("only radio (branch)", async () => {
      const req = { body: { checked: [], radio: [1, 2] } };
      const res = mockRes();

      productModel.find.mockResolvedValueOnce([{ _id: "p1" }]);
      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({ price: { $gte: 1, $lte: 2 } });
    });

    test("error -> 400", async () => {
      const req = { body: { checked: [], radio: [] } };
      const res = mockRes();

      productModel.find.mockRejectedValueOnce(new Error("fail"));
      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("productCountController", () => {
    test("happy -> 200", async () => {
      const req = {};
      const res = mockRes();

      productModel.find.mockReturnValueOnce({
        estimatedDocumentCount: jest.fn().mockResolvedValueOnce(99),
      });

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

  describe("productListController", () => {
    test("default page -> 200 (branch)", async () => {
      const req = { params: {} };
      const res = mockRes();

      productModel.find.mockReturnValueOnce(chainEndingWithSort([{ _id: "p1" }]));
      await productListController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("page param -> skip computed -> 200 (branch)", async () => {
      const req = { params: { page: "2" } };
      const res = mockRes();

      const q = {
        select: jest.fn().mockReturnValue(q),
        skip: jest.fn().mockReturnValue(q),
        limit: jest.fn().mockReturnValue(q),
        sort: jest.fn().mockResolvedValue([{ _id: "p1" }]),
      };

      productModel.find.mockReturnValueOnce(q);
      await productListController(req, res);

      expect(q.skip).toHaveBeenCalledWith(6); // perPage=6, page=2
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

  describe("searchProductController", () => {
    test("happy -> json", async () => {
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

  describe("realtedProductController", () => {
    test("happy -> 200", async () => {
      const req = { params: { pid: "p1", cid: "c1" } };
      const res = mockRes();

      productModel.find.mockReturnValueOnce(chainSelectLimitPopulate([{ _id: "p2" }]));
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

  describe("productCategoryController", () => {
    test("happy -> 200", async () => {
      const req = { params: { slug: "cat" } };
      const res = mockRes();

      categoryModel.findOne.mockResolvedValueOnce({ _id: "c1", slug: "cat" });
      productModel.find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce([{ _id: "p1" }]),
      });

      await productCategoryController(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("error -> 400", async () => {
      const req = { params: { slug: "cat" } };
      const res = mockRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("fail"));
      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("braintreeTokenController", () => {
    test("success -> res.send(response)", async () => {
      const req = {};
      const res = mockRes();

      mockGenerate.mockImplementationOnce((_, cb) => cb(null, { token: "t1" }));
      await braintreeTokenController(req, res);

      expect(res.send).toHaveBeenCalledWith({ token: "t1" });
    });

    test("err -> 500 send(err)", async () => {
      const req = {};
      const res = mockRes();

      mockGenerate.mockImplementationOnce((_, cb) => cb(new Error("fail"), null));
      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe("brainTreePaymentController", () => {
    test("result truthy -> saves order -> ok true", async () => {
      const req = {
        body: { nonce: "n1", cart: [{ price: 10 }, { price: 20 }] },
        user: { _id: "u1" },
      };
      const res = mockRes();

      mockSale.mockImplementationOnce((payload, cb) => {
        expect(payload.amount).toBe(30);
        cb(null, { id: "txn1" });
      });

      orderModel.__mockSave.mockResolvedValueOnce(undefined);

      await brainTreePaymentController(req, res);

      expect(orderModel).toHaveBeenCalledWith(
        expect.objectContaining({ products: req.body.cart, buyer: "u1" })
      );
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("result falsy -> 500 send(error)", async () => {
      const req = {
        body: { nonce: "n1", cart: [{ price: 5 }] },
        user: { _id: "u1" },
      };
      const res = mockRes();

      mockSale.mockImplementationOnce((payload, cb) => cb(new Error("txn fail"), null));
      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
