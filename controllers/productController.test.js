import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

import {
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

jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("braintree", () => ({
  Environment: { Sandbox: "Sandbox" },
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
}));
jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    estimatedDocumentCount: jest.fn(),
  }),
}));
jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    findOne: jest.fn(),
  }),
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
        countTotal: mockProducts.length,
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

  it("should return 404 when photo data is missing", async () => {
    // Arrange
    const mockProduct = { photo: {} };
    productModel.findById.mockReturnValue(makeQuery(mockProduct));
    const req = makeReq({ params: { pid: "pid" } });
    const res = makeRes();

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Photo Not Found" })
    );
  });

  it("should return 404 when product is not found", async () => {
    // Arrange
    productModel.findById.mockReturnValue(makeQuery(null));
    const req = makeReq({ params: { pid: "nonexistent" } });
    const res = makeRes();

    // Act
    await productPhotoController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Product Not Found" })
    );
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
