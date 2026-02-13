// controllers/productController.test.js

jest.mock("fs", () => ({
  __esModule: true,
  default: { readFileSync: jest.fn() },
}));

jest.mock("slugify", () => ({
  __esModule: true,
  default: jest.fn(),
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

jest.mock("../models/productModel.js", () => {
  const mockCtorSave = jest.fn();

  const ModelCtor = jest.fn(function (doc) {
    return {
      ...doc,
      photo: { data: null, contentType: null },
      save: mockCtorSave,
    };
  });

  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();
  ModelCtor.__mockCtorSave = mockCtorSave;

  return { __esModule: true, default: ModelCtor };
});

import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import {
  createProductController,
  updateProductController,
  deleteProductController,
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

describe("productController.js - CRUD Operations (Create, Update, Delete)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore?.();
  });

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

    test("validation: photo too big -> 500", async () => {
      const req = {
        fields: { name: "A", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
        files: { photo: { size: 1000001, path: "/tmp/x", type: "image/png" } },
      };
      const res = mockRes();

      await createProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    test("happy path: creates product successfully -> 201", async () => {
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

    test("happy path: creates with photo -> 201", async () => {
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

    test("error handling: 500 on save failure", async () => {
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

    test("happy path: update product successfully -> 201", async () => {
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

    test("happy path: update with photo -> 201", async () => {
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

    test("error handling: 500 on update failure", async () => {
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
    test("happy path: deletes product -> 200", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      const chain = { select: jest.fn().mockResolvedValueOnce(undefined) };
      productModel.findByIdAndDelete.mockReturnValueOnce(chain);

      await deleteProductController(req, res);

      expect(chain.select).toHaveBeenCalledWith("-photo");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Product Deleted successfully" })
      );
    });

    test("error handling: 500 on delete failure", async () => {
      const req = { params: { pid: "p1" } };
      const res = mockRes();

      productModel.findByIdAndDelete.mockImplementationOnce(() => {
        throw new Error("boom");
      });

      await deleteProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});