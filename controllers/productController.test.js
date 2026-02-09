import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";

import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import {
  createProductController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  updateProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
  braintreeTokenController,
  brainTreePaymentController,
} from "./productController.js";

jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("fs", () => ({ readFileSync: jest.fn() }));
jest.mock("slugify", () => jest.fn());
jest.mock("braintree", () => {
  const mockGateway = {
    clientToken: { generate: jest.fn() },
    transaction: { sale: jest.fn() },
  };
  return {
    Environment: { Sandbox: "Sandbox" },
    BraintreeGateway: jest.fn().mockImplementation(() => mockGateway),
    __mockGateway: mockGateway,
  };
});
jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    estimatedDocumentCount: jest.fn(),
  }),
}));
jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    findOne: jest.fn(),
  }),
}));
jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

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

describe("createProductController", () => {
  it("should return error when name is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { description: "d", price: 10, category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  it("should return error when description is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", price: 10, category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
  });

  it("should return error when price is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  it("should return error when category is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", price: 10, quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
  });

  it("should return error when quantity is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", price: 10, category: "c" }, files: {} });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
  });

  it("should return error when photo is too large", async () => {
    // Arrange
    const req = makeReq({
      fields: { name: "n", description: "d", price: 10, category: "c", quantity: 1 },
      files: { photo: { size: 1000001 } },
    });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and should be less than 1MB",
    });
  });

  it("should create product with photo on success", async () => {
    // Arrange
    const photoBuffer = Buffer.from("photo");
    const mockSave = jest.fn().mockResolvedValue({});
    const mockProduct = { photo: {}, save: mockSave };
    productModel.mockImplementation(() => mockProduct);
    slugify.mockReturnValue("test-slug");
    fs.readFileSync.mockReturnValue(photoBuffer);

    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
        shipping: true,
      },
      files: { photo: { size: 10, path: "/tmp/p", type: "image/png" } },
    });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(slugify).toHaveBeenCalledWith("Product");
    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p");
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Created Successfully",
      })
    );
  });

  it("should create product without photo on success", async () => {
    // Arrange
    const mockSave = jest.fn().mockResolvedValue({});
    const mockProduct = { photo: {}, save: mockSave };
    productModel.mockImplementation(() => mockProduct);
    slugify.mockReturnValue("test-slug");

    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
      },
      files: {},
    });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(slugify).toHaveBeenCalledWith("Product");
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should return error when create fails", async () => {
    // Arrange
    const error = new Error("db error");
    const mockSave = jest.fn().mockRejectedValue(error);
    productModel.mockImplementation(() => ({ photo: {}, save: mockSave }));
    slugify.mockReturnValue("test-slug");
    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
      },
      files: {},
    });
    const res = makeRes();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Creating product",
      })
    );
  });
});

describe("getProductController", () => {
  it("should return products on success", async () => {
    // Arrange
    const mockProducts = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(mockProducts));
    const req = makeReq();
    const res = makeRes();

    // Act
    await getProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        products: mockProducts,
        counTotal: mockProducts.length,
      })
    );
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq();
    const res = makeRes();

    // Act
    await getProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Fetching Products" })
    );
  });
});

describe("getSingleProductController", () => {
  it("should return single product on success", async () => {
    // Arrange
    const mockProduct = { name: "A" };
    productModel.findOne.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    // Act
    await getSingleProductController(req, res);

    // Assert
    expect(productModel.findOne).toHaveBeenCalledWith({ slug: "slug" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, product: mockProduct })
    );
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.findOne.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    // Act
    await getSingleProductController(req, res);

    // Assert
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
    // Arrange
    const mockProduct = { photo: { data: Buffer.from("p"), contentType: "image/png" } };
    productModel.findById.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
  });

  it("should not send response when photo data is missing", async () => {
    // Arrange
    const mockProduct = { photo: {} };
    productModel.findById.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(200);
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.findById.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while Fetching Photo",
      })
    );
  });
});

describe("deleteProductController", () => {
  it("should delete product on success", async () => {
    // Arrange
    productModel.findByIdAndDelete.mockReturnValue(makeQuery({}));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await deleteProductController(req, res);

    // Assert
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("pid");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Deleted Successfully",
      })
    );
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.findByIdAndDelete.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await deleteProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error while Deleting Product" })
    );
  });
});

describe("updateProductController", () => {
  it("should return error when name is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { description: "d", price: 10, category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
  });

  it("should return error when description is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", price: 10, category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
  });

  it("should return error when price is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", category: "c", quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
  });

  it("should return error when category is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", price: 10, quantity: 1 }, files: {} });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
  });

  it("should return error when quantity is missing", async () => {
    // Arrange
    const req = makeReq({ fields: { name: "n", description: "d", price: 10, category: "c" }, files: {} });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
  });

  it("should return error when photo is too large", async () => {
    // Arrange
    const req = makeReq({
      fields: { name: "n", description: "d", price: 10, category: "c", quantity: 1 },
      files: { photo: { size: 1000001 } },
    });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is Required and should be less than 1MB",
    });
  });

  it("should update product with photo on success", async () => {
    // Arrange
    const photoBuffer = Buffer.from("photo");
    const mockSave = jest.fn().mockResolvedValue({});
    const mockProduct = { photo: {}, save: mockSave };
    productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);
    slugify.mockReturnValue("test-slug");
    fs.readFileSync.mockReturnValue(photoBuffer);

    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
        shipping: true,
      },
      files: { photo: { size: 10, path: "/tmp/p", type: "image/png" } },
      params: { pid: "pid" },
    });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(slugify).toHaveBeenCalledWith("Product");
    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/p");
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Updated Successfully",
      })
    );
  });

  it("should update product without photo on success", async () => {
    // Arrange
    const mockSave = jest.fn().mockResolvedValue({});
    const mockProduct = { photo: {}, save: mockSave };
    productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);
    slugify.mockReturnValue("test-slug");

    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
      },
      files: {},
      params: { pid: "pid" },
    });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(slugify).toHaveBeenCalledWith("Product");
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should return error when update fails", async () => {
    // Arrange
    const error = new Error("db error");
    productModel.findByIdAndUpdate.mockRejectedValue(error);
    slugify.mockReturnValue("test-slug");
    const req = makeReq({
      fields: {
        name: "Product",
        description: "Desc",
        price: 10,
        category: "c",
        quantity: 1,
      },
      files: {},
      params: { pid: "pid" },
    });
    const res = makeRes();

    // Act
    await updateProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Updating Product",
      })
    );
  });
});

describe("productFiltersController", () => {
  it("should filter by category and price", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: ["c1"], radio: [0, 50] } });
    const res = makeRes();

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: ["c1"],
      price: { $gte: 0, $lte: 50 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should filter by category only", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: ["c1"], radio: [] } });
    const res = makeRes();

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({ category: ["c1"] });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should filter by price only", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: [], radio: [10, 20] } });
    const res = makeRes();

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 10, $lte: 20 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return all when no filters provided", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockResolvedValue(products);
    const req = makeReq({ body: { checked: [], radio: [] } });
    const res = makeRes();

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockRejectedValue(new Error("boom"));
    const req = makeReq({ body: { checked: [], radio: [] } });
    const res = makeRes();

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error while Filtering Products" })
    );
  });
});

describe("productCountController", () => {
  it("should return total count on success", async () => {
    // Arrange
    const query = { estimatedDocumentCount: jest.fn().mockResolvedValue(5) };
    productModel.find.mockReturnValue(query);
    const req = makeReq();
    const res = makeRes();

    // Act
    await productCountController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(query.estimatedDocumentCount).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, total: 5 });
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq();
    const res = makeRes();

    // Act
    await productCountController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Product Count" })
    );
  });
});

describe("productListController", () => {
  it("should return products for specific page", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { page: 2 } });
    const res = makeRes();

    // Act
    await productListController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should default to page 1 when page param missing", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: {} });
    const res = makeRes();

    // Act
    await productListController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { page: 1 } });
    const res = makeRes();

    // Act
    await productListController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Per Page Controller" })
    );
  });
});

describe("searchProductController", () => {
  it("should return search results on success", async () => {
    // Arrange
    const results = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(results));
    const req = makeReq({ params: { keyword: "abc" } });
    const res = makeRes();

    // Act
    await searchProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "abc", $options: "i" } },
        { description: { $regex: "abc", $options: "i" } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith(results);
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { keyword: "abc" } });
    const res = makeRes();

    // Act
    await searchProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Search Product API" })
    );
  });
});

describe("realtedProductController", () => {
  it("should return related products on success", async () => {
    // Arrange
    const products = [{ name: "A" }];
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { pid: "pid", cid: "cid" } });
    const res = makeRes();

    // Act
    await realtedProductController(req, res);

    // Assert
    expect(productModel.find).toHaveBeenCalledWith({
      category: "cid",
      _id: { $ne: "pid" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products });
  });

  it("should return error on failure", async () => {
    // Arrange
    productModel.find.mockImplementation(() => {
      throw new Error("boom");
    });
    const req = makeReq({ params: { pid: "pid", cid: "cid" } });
    const res = makeRes();

    // Act
    await realtedProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Error in Fetching Related Product" })
    );
  });
});

describe("productCategoryController", () => {
  it("should return category products on success", async () => {
    // Arrange
    const category = { _id: "c1" };
    const products = [{ name: "A" }];
    categoryModel.findOne.mockResolvedValue(category);
    productModel.find.mockReturnValue(makeQuery(products));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "slug" });
    expect(productModel.find).toHaveBeenCalledWith({ category });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, category, products })
    );
  });

  it("should return error on failure", async () => {
    // Arrange
    categoryModel.findOne.mockRejectedValue(new Error("boom"));
    const req = makeReq({ params: { slug: "slug" } });
    const res = makeRes();

    // Act
    await productCategoryController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Fetching Products by Category",
      })
    );
  });
});

describe("braintreeTokenController", () => {
  it("should return token on success", async () => {
    // Arrange
    const response = { token: "t" };
    braintree.__mockGateway.clientToken.generate.mockImplementation((options, cb) => cb(null, response));
    const req = makeReq();
    const res = makeRes();

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(braintree.__mockGateway.clientToken.generate).toHaveBeenCalledWith({}, expect.any(Function));
    expect(res.send).toHaveBeenCalledWith(response);
  });

  it("should return error on failure", async () => {
    // Arrange
    const error = new Error("bad token");
    braintree.__mockGateway.clientToken.generate.mockImplementation((options, cb) => cb(error));
    const req = makeReq();
    const res = makeRes();

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it("should log error when gateway.clientToken.generate throws", async () => {
    // Arrange
    const error = new Error("gateway crash");
    braintree.__mockGateway.clientToken.generate.mockImplementation(() => {
      throw error;
    });
    const req = makeReq();
    const res = makeRes();

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(console.log).toHaveBeenCalledWith(error);
  });
});

describe("brainTreePaymentController", () => {
  it("should complete payment and create order on success", async () => {
    // Arrange
    const saleResult = { id: "tx" };
    braintree.__mockGateway.transaction.sale.mockImplementation((options, cb) => cb(null, saleResult));

    const save = jest.fn();
    orderModel.mockImplementation(() => ({ save }));

    const req = makeReq({
      body: { nonce: "nonce", cart: [{ price: 10 }, { price: 5 }] },
      user: { _id: "user1" },
    });
    const res = makeRes();

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(braintree.__mockGateway.transaction.sale).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 15,
        paymentMethodNonce: "nonce",
      }),
      expect.any(Function)
    );
    expect(orderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [{ price: 10 }, { price: 5 }],
        payment: saleResult,
        buyer: "user1",
      })
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("should return error on payment failure", async () => {
    // Arrange
    const error = new Error("payment failed");
    braintree.__mockGateway.transaction.sale.mockImplementation((options, cb) => cb(error, null));
    const req = makeReq({
      body: { nonce: "nonce", cart: [{ price: 10 }] },
      user: { _id: "user1" },
    });
    const res = makeRes();

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it("should log error when gateway.transaction.sale throws", async () => {
    // Arrange
    const error = new Error("gateway crash");
    braintree.__mockGateway.transaction.sale.mockImplementation(() => {
      throw error;
    });
    const req = makeReq({
      body: { nonce: "nonce", cart: [{ price: 10 }] },
      user: { _id: "user1" },
    });
    const res = makeRes();

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(console.log).toHaveBeenCalledWith(error);
  });
});
