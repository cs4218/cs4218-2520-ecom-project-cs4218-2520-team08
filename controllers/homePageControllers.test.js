/**
 * Backend Controller Integration Tests for HomePage API Endpoints
 *
 * Tests the controllers that the HomePage component calls:
 * - categoryControlller       → GET /api/v1/category/get-category
 * - productListController     → GET /api/v1/product/product-list/:page
 * - productCountController    → GET /api/v1/product/product-count
 * - productFiltersController  → POST /api/v1/product/product-filters
 */

import { productCountController, productListController, productFiltersController } from './productController.js';
import { categoryControlller } from './categoryController.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../models/productModel.js');
jest.mock('../models/categoryModel.js');

// Prevent braintree from initializing (it reads env vars at import-time)
jest.mock('braintree', () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: 'sandbox' },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// categoryControlller (get all categories)
// ═══════════════════════════════════════════════════════════════════════════════

describe('categoryControlller – GET /api/v1/category/get-category', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all categories with success=true and status 200', async () => {
    const categories = [
      { _id: '1', name: 'Electronics', slug: 'electronics' },
      { _id: '2', name: 'Books', slug: 'books' },
    ];
    categoryModel.find.mockResolvedValue(categories);

    const req = mockRequest();
    const res = mockResponse();

    await categoryControlller(req, res);

    expect(categoryModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'All Categories List',
      category: categories,
    });
  });

  it('returns empty array when no categories exist', async () => {
    categoryModel.find.mockResolvedValue([]);

    const req = mockRequest();
    const res = mockResponse();

    await categoryControlller(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: 'All Categories List',
      category: [],
    });
  });

  it('returns 500 on database error', async () => {
    const error = new Error('DB connection failed');
    categoryModel.find.mockRejectedValue(error);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = mockRequest();
    const res = mockResponse();

    await categoryControlller(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error while getting all categories',
      }),
    );
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// productCountController
// ═══════════════════════════════════════════════════════════════════════════════

describe('productCountController – GET /api/v1/product/product-count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns total product count with status 200', async () => {
    // estimatedDocumentCount is chained on find({})
    productModel.find.mockReturnValue({
      estimatedDocumentCount: jest.fn().mockResolvedValue(42),
    });

    const req = mockRequest();
    const res = mockResponse();

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: 42,
    });
  });

  it('returns 0 when no products exist', async () => {
    productModel.find.mockReturnValue({
      estimatedDocumentCount: jest.fn().mockResolvedValue(0),
    });

    const req = mockRequest();
    const res = mockResponse();

    await productCountController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      total: 0,
    });
  });

  it('returns 400 on error', async () => {
    const error = new Error('Count failed');
    productModel.find.mockReturnValue({
      estimatedDocumentCount: jest.fn().mockRejectedValue(error),
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = mockRequest();
    const res = mockResponse();

    await productCountController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error in Product Count',
      }),
    );
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// productListController (pagination)
// ═══════════════════════════════════════════════════════════════════════════════

describe('productListController – GET /api/v1/product/product-list/:page', () => {
  const mockChain = (result) => {
    const chain = {};
    chain.find = jest.fn().mockReturnValue(chain);
    chain.select = jest.fn().mockReturnValue(chain);
    chain.skip = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockResolvedValue(result);
    productModel.find.mockReturnValue(chain);
    return chain;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first page of products (6 per page)', async () => {
    const products = Array.from({ length: 6 }, (_, i) => ({
      _id: `p${i}`,
      name: `Product ${i}`,
    }));
    const chain = mockChain(products);

    const req = mockRequest({ params: { page: '1' } });
    const res = mockResponse();

    await productListController(req, res);

    expect(chain.select).toHaveBeenCalledWith('-photo');
    expect(chain.skip).toHaveBeenCalledWith(0); // (1-1) * 6
    expect(chain.limit).toHaveBeenCalledWith(6);
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it('calculates correct skip for page 2', async () => {
    const chain = mockChain([]);

    const req = mockRequest({ params: { page: '2' } });
    const res = mockResponse();

    await productListController(req, res);

    expect(chain.skip).toHaveBeenCalledWith(6); // (2-1) * 6
  });

  it('calculates correct skip for page 3', async () => {
    const chain = mockChain([]);

    const req = mockRequest({ params: { page: '3' } });
    const res = mockResponse();

    await productListController(req, res);

    expect(chain.skip).toHaveBeenCalledWith(12); // (3-1) * 6
  });

  it('defaults to page 1 when page param is missing', async () => {
    const chain = mockChain([]);

    const req = mockRequest({ params: {} });
    const res = mockResponse();

    await productListController(req, res);

    expect(chain.skip).toHaveBeenCalledWith(0); // (1-1) * 6
  });

  it('returns empty array when no products on page', async () => {
    mockChain([]);

    const req = mockRequest({ params: { page: '100' } });
    const res = mockResponse();

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: [],
    });
  });

  it('returns 400 on database error', async () => {
    const error = new Error('DB error');
    const chain = {};
    chain.find = jest.fn().mockReturnValue(chain);
    chain.select = jest.fn().mockReturnValue(chain);
    chain.skip = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockRejectedValue(error);
    productModel.find.mockReturnValue(chain);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = mockRequest({ params: { page: '1' } });
    const res = mockResponse();

    await productListController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error in Per Page Controller',
      }),
    );
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// productFiltersController
// ═══════════════════════════════════════════════════════════════════════════════

describe('productFiltersController – POST /api/v1/product/product-filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all products when no filters are applied', async () => {
    const products = [{ _id: '1', name: 'Test' }];
    productModel.find.mockResolvedValue(products);

    const req = mockRequest({
      body: { checked: [], radio: [] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it('filters by category when checked array is provided', async () => {
    const products = [{ _id: '1', name: 'Cat Item' }];
    productModel.find.mockResolvedValue(products);

    const req = mockRequest({
      body: { checked: ['cat1', 'cat2'], radio: [] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ['cat1', 'cat2'],
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('filters by price range when radio array is provided', async () => {
    const products = [{ _id: '2', name: 'Price Item' }];
    productModel.find.mockResolvedValue(products);

    const req = mockRequest({
      body: { checked: [], radio: [20, 39] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 20, $lte: 39 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('filters by both category and price when both are provided', async () => {
    const products = [{ _id: '3', name: 'Both Filters' }];
    productModel.find.mockResolvedValue(products);

    const req = mockRequest({
      body: { checked: ['cat1'], radio: [0, 19] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ['cat1'],
      price: { $gte: 0, $lte: 19 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products,
    });
  });

  it('returns empty array when no products match filters', async () => {
    productModel.find.mockResolvedValue([]);

    const req = mockRequest({
      body: { checked: ['nonexistent'], radio: [1000, 2000] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      products: [],
    });
  });

  it('returns 400 on database error', async () => {
    const error = new Error('Filter DB error');
    productModel.find.mockRejectedValue(error);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const req = mockRequest({
      body: { checked: [], radio: [] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error while Filtering Products',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('handles single category in checked array', async () => {
    productModel.find.mockResolvedValue([]);

    const req = mockRequest({
      body: { checked: ['cat1'], radio: [] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ['cat1'],
    });
  });

  it('handles large price range (e.g., $100 or more)', async () => {
    productModel.find.mockResolvedValue([]);

    const req = mockRequest({
      body: { checked: [], radio: [100, 9999] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 100, $lte: 9999 },
    });
  });

  it('handles multiple categories with price range', async () => {
    productModel.find.mockResolvedValue([]);

    const req = mockRequest({
      body: { checked: ['cat1', 'cat2', 'cat3'], radio: [40, 59] },
    });
    const res = mockResponse();

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ['cat1', 'cat2', 'cat3'],
      price: { $gte: 40, $lte: 59 },
    });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * UNCOVERED RISKS / BACKEND NOTES:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. NO INPUT VALIDATION in productFiltersController:
 *    If checked or radio are undefined/null in req.body,
 *    accessing checked.length will throw a TypeError.
 *    The frontend always sends both, but a direct API caller could omit them.
 *
 * 2. productListController page param is not validated:
 *    Negative page numbers or non-numeric strings are not handled.
 *    skip((-1 - 1) * 6) = skip(-12) which may produce unexpected results.
 *
 * 3. categoryControlller has a typo in its name (3 l's).
 *    This is not a bug per se but makes the code harder to maintain.
 *
 * 4. Error responses use inconsistent status codes:
 *    categoryControlller uses 500, while productListController and
 *    productFiltersController use 400 for errors.
 *
 * 5. The productListController excludes photos with select("-photo")
 *    which is correct for performance, but the photo URL in the card
 *    is handled by a separate endpoint (product-photo/:pid).
 */
