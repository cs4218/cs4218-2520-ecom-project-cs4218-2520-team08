import { connect, closeDatabase, clearDatabase } from "./helpers/testDb.js";
import productModel from "../../models/productModel.js";
import categoryModel from "../../models/categoryModel.js";
import {
  searchProductController,
  productFiltersController,
  productListController,
  productCountController,
  realtedProductController,
  productCategoryController,
  getSingleProductController,
  productPhotoController,
} from "../../controllers/productController.js";

jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({})),
  Environment: { Sandbox: "sandbox" },
}));

const makeReq = (overrides = {}) => ({
  params: {},
  body: {},
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const createCategory = async (name, slug) => {
  return await categoryModel.create({ name, slug });
};

const createProduct = async (fields) => {
  return await productModel.create(fields);
};

// Keagan Pang, A0258729L
describe("Backend Integration: Product Query Controllers", () => {
  describe("Product search with real DB", () => {
    it("returns only products matching the keyword in name (case-insensitive)", async () => {
      const cat = await createCategory("General", "general");
      await createProduct({ name: "Blue Widget", slug: "blue-widget", description: "A blue item", price: 10, category: cat._id, quantity: 5 });
      await createProduct({ name: "Red Widget", slug: "red-widget", description: "A red item", price: 20, category: cat._id, quantity: 3 });
      await createProduct({ name: "Green Gadget", slug: "green-gadget", description: "A green item", price: 15, category: cat._id, quantity: 7 });

      const req = makeReq({ params: { keyword: "widget" } });
      const res = makeRes();

      await searchProductController(req, res);

      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(2);
      const names = results.map((p) => p.name);
      expect(names).toContain("Blue Widget");
      expect(names).toContain("Red Widget");
      expect(names).not.toContain("Green Gadget");
    });

    it("returns products matching the keyword in description only", async () => {
      const cat = await createCategory("General", "general");
      await createProduct({ name: "Alpha", slug: "alpha", description: "Contains a special widget inside", price: 10, category: cat._id, quantity: 5 });
      await createProduct({ name: "Beta", slug: "beta", description: "Nothing relevant here", price: 20, category: cat._id, quantity: 3 });

      const req = makeReq({ params: { keyword: "widget" } });
      const res = makeRes();

      await searchProductController(req, res);

      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Alpha");
    });

    it("excludes photo data from search results", async () => {
      const cat = await createCategory("General", "general");
      await createProduct({
        name: "Photo Widget",
        slug: "photo-widget",
        description: "Has a photo",
        price: 10,
        category: cat._id,
        quantity: 5,
        photo: { data: Buffer.from("fake-image"), contentType: "image/png" },
      });

      const req = makeReq({ params: { keyword: "widget" } });
      const res = makeRes();

      await searchProductController(req, res);

      const results = res.json.mock.calls[0][0];
      expect(results).toHaveLength(1);
      const plain = JSON.parse(JSON.stringify(results[0]));
      expect(plain).not.toHaveProperty("photo");
    });
  });

  describe("Product filters by category + price", () => {
    it("returns only products matching both category and price range", async () => {
      const electronics = await createCategory("Electronics", "electronics");
      const books = await createCategory("Books", "books");

      await createProduct({ name: "Cheap Phone", slug: "cheap-phone", description: "Budget phone", price: 25, category: electronics._id, quantity: 10 });
      await createProduct({ name: "Expensive Phone", slug: "expensive-phone", description: "Premium phone", price: 999, category: electronics._id, quantity: 2 });
      await createProduct({ name: "Mid Phone", slug: "mid-phone", description: "Mid phone", price: 45, category: electronics._id, quantity: 5 });
      await createProduct({ name: "Cheap Book", slug: "cheap-book", description: "A book", price: 15, category: books._id, quantity: 20 });

      const req = makeReq({
        body: { checked: [electronics._id], radio: [10, 50] },
      });
      const res = makeRes();

      await productFiltersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const { products } = res.send.mock.calls[0][0];
      expect(products).toHaveLength(2);
      const names = products.map((p) => p.name);
      expect(names).toContain("Cheap Phone");
      expect(names).toContain("Mid Phone");
      expect(names).not.toContain("Expensive Phone");
      expect(names).not.toContain("Cheap Book");
    });

    it("returns all products when no filters are applied", async () => {
      const cat = await createCategory("General", "general");
      await createProduct({ name: "A", slug: "a", description: "d", price: 10, category: cat._id, quantity: 1 });
      await createProduct({ name: "B", slug: "b", description: "d", price: 20, category: cat._id, quantity: 1 });

      const req = makeReq({ body: { checked: [], radio: [] } });
      const res = makeRes();

      await productFiltersController(req, res);

      const { products } = res.send.mock.calls[0][0];
      expect(products).toHaveLength(2);
    });
  });

  describe("Pagination consistency with count", () => {
    it("returns correct count and paginated pages with no overlap", async () => {
      const cat = await createCategory("General", "general");
      const created = [];
      for (let i = 0; i < 15; i++) {
        const p = await createProduct({
          name: `Product ${String(i).padStart(2, "0")}`,
          slug: `product-${i}`,
          description: `Desc ${i}`,
          price: 10 + i,
          category: cat._id,
          quantity: 1,
          createdAt: new Date(2024, 0, i + 1),
        });
        created.push(p);
      }

      const countReq = makeReq();
      const countRes = makeRes();
      await productCountController(countReq, countRes);
      const { total } = countRes.send.mock.calls[0][0];
      expect(total).toBe(15);

      const allIds = new Set();
      const pageSizes = [];

      for (let page = 1; page <= 3; page++) {
        const req = makeReq({ params: { page } });
        const res = makeRes();
        await productListController(req, res);

        const { products } = res.send.mock.calls[0][0];
        pageSizes.push(products.length);
        products.forEach((p) => {
          expect(allIds.has(p._id.toString())).toBe(false);
          allIds.add(p._id.toString());
        });
      }

      expect(pageSizes).toEqual([6, 6, 3]);
      expect(allIds.size).toBe(15);
    });

    it("returns products sorted by createdAt descending", async () => {
      const cat = await createCategory("General", "general");
      for (let i = 0; i < 3; i++) {
        await createProduct({
          name: `P${i}`,
          slug: `p-${i}`,
          description: `D${i}`,
          price: 10,
          category: cat._id,
          quantity: 1,
        });
        await new Promise((r) => setTimeout(r, 50));
      }

      const req = makeReq({ params: { page: 1 } });
      const res = makeRes();
      await productListController(req, res);

      const { products } = res.send.mock.calls[0][0];
      for (let i = 1; i < products.length; i++) {
        expect(new Date(products[i - 1].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(products[i].createdAt).getTime());
      }
    });
  });

  describe("Related products by category", () => {
    it("returns up to 3 products from the same category, excluding the source", async () => {
      const cat = await createCategory("Gadgets", "gadgets");
      const products = [];
      for (let i = 0; i < 5; i++) {
        const p = await createProduct({
          name: `Gadget ${i}`,
          slug: `gadget-${i}`,
          description: `Gadget desc ${i}`,
          price: 10 + i,
          category: cat._id,
          quantity: 1,
        });
        products.push(p);
      }

      const sourceProduct = products[0];
      const req = makeReq({
        params: { pid: sourceProduct._id.toString(), cid: cat._id.toString() },
      });
      const res = makeRes();

      await realtedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const { products: related } = res.send.mock.calls[0][0];
      expect(related.length).toBeLessThanOrEqual(3);
      expect(related.length).toBeGreaterThan(0);

      const relatedIds = related.map((p) => p._id.toString());
      expect(relatedIds).not.toContain(sourceProduct._id.toString());
    });

    it("populates category field on related products", async () => {
      const cat = await createCategory("Gadgets", "gadgets");
      const p1 = await createProduct({ name: "G1", slug: "g1", description: "d", price: 10, category: cat._id, quantity: 1 });
      await createProduct({ name: "G2", slug: "g2", description: "d", price: 20, category: cat._id, quantity: 1 });

      const req = makeReq({ params: { pid: p1._id.toString(), cid: cat._id.toString() } });
      const res = makeRes();

      await realtedProductController(req, res);

      const { products: related } = res.send.mock.calls[0][0];
      expect(related.length).toBe(1);
      expect(related[0].category.name).toBe("Gadgets");
    });
  });

  describe("Products by category slug", () => {
    it("returns the category and its products by slug", async () => {
      const electronics = await createCategory("Electronics", "electronics");
      const books = await createCategory("Books", "books");

      await createProduct({ name: "Phone", slug: "phone", description: "A phone", price: 500, category: electronics._id, quantity: 10 });
      await createProduct({ name: "Laptop", slug: "laptop", description: "A laptop", price: 1000, category: electronics._id, quantity: 5 });
      await createProduct({ name: "Novel", slug: "novel", description: "A novel", price: 15, category: books._id, quantity: 50 });

      const req = makeReq({ params: { slug: "electronics" } });
      const res = makeRes();

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.category.name).toBe("Electronics");
      expect(body.products).toHaveLength(2);
      const names = body.products.map((p) => p.name);
      expect(names).toContain("Phone");
      expect(names).toContain("Laptop");
      expect(names).not.toContain("Novel");
    });

    it("populates category field on returned products", async () => {
      const cat = await createCategory("Books", "books");
      await createProduct({ name: "Novel", slug: "novel", description: "A novel", price: 15, category: cat._id, quantity: 50 });

      const req = makeReq({ params: { slug: "books" } });
      const res = makeRes();

      await productCategoryController(req, res);

      const { products } = res.send.mock.calls[0][0];
      expect(products[0].category.name).toBe("Books");
    });
  });

  describe("Get single product + photo endpoint", () => {
    it("getSingleProductController returns product without photo, with populated category", async () => {
      const cat = await createCategory("Tech", "tech");
      const photoData = Buffer.from("fake-photo-binary-data");
      await createProduct({
        name: "Smart Watch",
        slug: "smart-watch",
        description: "A smart watch",
        price: 299,
        category: cat._id,
        quantity: 10,
        photo: { data: photoData, contentType: "image/jpeg" },
      });

      const req = makeReq({ params: { slug: "smart-watch" } });
      const res = makeRes();

      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const { product } = res.send.mock.calls[0][0];
      expect(product.name).toBe("Smart Watch");
      expect(product.description).toBe("A smart watch");
      expect(product.price).toBe(299);
      expect(product.category.name).toBe("Tech");
      const plain = JSON.parse(JSON.stringify(product));
      expect(plain).not.toHaveProperty("photo");
    });

    it("productPhotoController returns photo binary data with correct content-type", async () => {
      const cat = await createCategory("Tech", "tech");
      const photoData = Buffer.from("fake-photo-binary-data");
      const prod = await createProduct({
        name: "Camera",
        slug: "camera",
        description: "A camera",
        price: 599,
        category: cat._id,
        quantity: 3,
        photo: { data: photoData, contentType: "image/png" },
      });

      const req = makeReq({ params: { pid: prod._id.toString() } });
      const res = makeRes();

      await productPhotoController(req, res);

      expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
      expect(res.status).toHaveBeenCalledWith(200);
      const sentData = res.send.mock.calls[0][0];
      expect(Buffer.isBuffer(sentData)).toBe(true);
      expect(sentData.toString()).toBe("fake-photo-binary-data");
    });

    it("productPhotoController returns 404 for non-existent product", async () => {
      const fakeId = "65a1b2c3d4e5f6a7b8c9d0e1";
      const req = makeReq({ params: { pid: fakeId } });
      const res = makeRes();

      await productPhotoController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send.mock.calls[0][0].message).toBe("Product Not Found");
    });
  });
});
