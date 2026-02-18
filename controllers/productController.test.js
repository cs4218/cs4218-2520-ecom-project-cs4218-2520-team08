jest.mock("dotenv", () => ({ config: jest.fn() }));

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
      Environment: { Sandbox: "Sandbox" },
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

  ModelCtor.find = jest.fn();
  ModelCtor.findOne = jest.fn();
  ModelCtor.findById = jest.fn();
  ModelCtor.estimatedDocumentCount = jest.fn();
  ModelCtor.findByIdAndUpdate = jest.fn();
  ModelCtor.findByIdAndDelete = jest.fn();
  ModelCtor.__mockCtorSave = mockCtorSave;

  return { __esModule: true, default: ModelCtor };
});

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    findOne: jest.fn(),
  }),
}));

import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

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

const { mockGenerate, mockSale } = braintree.__mocks;

const makeReq = ({
  fields = {},
  files = {},
  params = {},
  body = {},
  user = {},
} = {}) => ({ fields, files, params, body, user });

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const makeQuery = (resolvedValue) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    estimatedDocumentCount: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve, reject) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return query;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore?.();
});

describe("getProductController", () => {
  it("should return products on success", async () => {
    const mockProducts = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(mockProducts));
    const req = makeReq();
    const res = makeRes();

    await getProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        products: mockProducts,
        countTotal: mockProducts.length,
      })
    );
  });

  it("should return error on failure", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq();
    const res = makeRes();

    await getProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Fetching Products" })
    );
  });
});

describe("getSingleProductController", () => {
  it("should return single product on success", async () => {
    const mockProduct = { name: "A" };
    productModel.findOne.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    await getSingleProductController(req, res);

    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "slug" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, product: mockProduct })
    );
  });

  it("should return error on failure", async () => {
    productModel.findOne.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    await getSingleProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while Fetching Single Product",
      })
    );
  });
});

describe("productPhotoController", () => {
  it("should send photo when data exists", async () => {
    const mockProduct = { photo: { data: Buffer.from("p"), contentType: "image/png" } };
    productModel.findById.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    await productPhotoController(req, res);

    expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
  });

  it("should return 404 when photo data is missing", async () => {
    const mockProduct = { photo: {} };
    productModel.findById.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    await productPhotoController(req, res);

    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Photo Not Found" })
    );
  });

  it("should return 404 when product is not found", async () => {
    productModel.findById.mockReturnValue(makeQuery(null));
    const req = makeReq({ params: { pid: "nonexistent" } });
    const res = makeRes();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Product Not Found" })
    );
  });

  it("should return error on failure", async () => {
    productModel.findById.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    await productPhotoController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while Fetching Photo",
      })
    );
  });
});

describe("productFiltersController", () => {
  it("should filter by category and price", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: ["c1"], radio: [0, 50] } });
    const res = makeRes();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ["c1"],
      price: { $gte: 0, $lte: 50 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should filter by category only", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: ["c1"], radio: [] } });
    const res = makeRes();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({ category: ["c1"] });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should filter by price only", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: [], radio: [10, 20] } });
    const res = makeRes();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 10, $lte: 20 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return all when no filters provided", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: [], radio: [] } });
    const res = makeRes();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return error on failure", async () => {
    productModel.find.mockRejectedValue(new Error("boom"));
    const req = makeReq({ body: { checked: [], radio: [] } });
    const res = makeRes();

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error while Filtering Products" })
    );
  });
});

describe("productCountController", () => {
  it("should return total count on success", async () => {
    const query = { estimatedDocumentCount: jest.fn().mockResolvedValue(5) };
    productModel.find.mockReturnValue(query);
    const req = makeReq();
    const res = makeRes();

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(query.estimatedDocumentCount).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, total: 5 });
  });

  it("should return error on failure", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq();
    const res = makeRes();

    await productCountController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Product Count" })
    );
  });
});

describe("productListController", () => {
  it("should return products for specific page", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { page: 2 } });
    const res = makeRes();

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should default to page 1 when page param missing", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: {} });
    const res = makeRes();

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should return error on failure", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { page: 1 } });
    const res = makeRes();

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Per Page Controller" })
    );
  });
});

describe("searchProductController", () => {
  it("should return search results on success", async () => {
    const results = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(results));
    const req = makeReq({ params: { keyword: "abc" } });
    const res = makeRes();

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "abc", $options: "i" } },
        { description: { $regex: "abc", $options: "i" } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith(results);
  });

  it("should return error on failure", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { keyword: "abc" } });
    const res = makeRes();

    await searchProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Search Product API" })
    );
  });
});

describe("realtedProductController", () => {
  it("should return related products on success", async () => {
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { pid: "pid", cid: "cid" } });
    const res = makeRes();

    await realtedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: "cid",
      _id: { $ne: "pid" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should return error on failure", async () => {
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { pid: "pid", cid: "cid" } });
    const res = makeRes();

    await realtedProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Fetching Related Product" })
    );
  });
});

describe("productCategoryController", () => {
  it("should return category products on success", async () => {
    const category = { _id: "c1" };
    const products = [{ name: "A" }];
    categoryModel.findOne.mockResolvedValue(category);
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "slug" });
    expect(productModel.find).toHaveBeenCalledWith({ category });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, category, products })
    );
  });

  it("should return error on failure", async () => {
    categoryModel.findOne.mockRejectedValue(new Error("boom"));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    await productCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Fetching Products by Category",
      })
    );
  });
});

describe("createProductController", () => {
  test("validation: missing name -> 500", async () => {
    const req = {
      fields: { name: "", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
      files: { photo: null },
    };
    const res = makeRes();

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
    const res = makeRes();

    await createProductController(req, res);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
  });

  test("validation: missing price -> 500", async () => {
    const req = {
      fields: { name: "A", description: "d", price: "", category: "c", quantity: 1, shipping: 1 },
      files: { photo: null },
    };
    const res = makeRes();

    await createProductController(req, res);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  test("validation: photo too big -> 500", async () => {
    const req = {
      fields: { name: "A", description: "d", price: 1, category: "c", quantity: 1, shipping: 1 },
      files: { photo: { size: 1000001, path: "/tmp/x", type: "image/png" } },
    };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and should be less than 1MB",
    });
  });

  test("happy path: creates product successfully -> 201", async () => {
    const req = {
      fields: { name: "Phone", description: "Nice", price: 10, category: "c", quantity: 2, shipping: 1 },
      files: { photo: null },
    };
    const res = makeRes();

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
    const res = makeRes();

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
    const res = makeRes();

    slugify.mockReturnValueOnce("x");
    productModel.__mockCtorSave.mockRejectedValueOnce(new Error("save fail"));

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Creating product" })
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
    const res = makeRes();

    await updateProductController(req, res);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
  });

  test("happy path: update product successfully -> 201", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { name: "New", description: "d", price: 10, category: "c", quantity: 1, shipping: 1 },
      files: { photo: null },
    };
    const res = makeRes();

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
    const res = makeRes();

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
    const res = makeRes();

    productModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("fail"));

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Updating Product" })
    );
  });
});

describe("deleteProductController", () => {
  test("happy path: deletes product -> 200", async () => {
    const req = { params: { pid: "p1" } };
    const res = makeRes();

    const chain = { select: jest.fn().mockResolvedValueOnce(undefined) };
    productModel.findByIdAndDelete.mockReturnValueOnce(chain);

    await deleteProductController(req, res);

    expect(chain.select).toHaveBeenCalledWith("-photo");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Product Deleted Successfully" })
    );
  });

  test("error handling: 500 on delete failure", async () => {
    const req = { params: { pid: "p1" } };
    const res = makeRes();

    productModel.findByIdAndDelete.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    await deleteProductController(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
