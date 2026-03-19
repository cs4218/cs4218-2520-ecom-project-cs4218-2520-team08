import { connect, closeDatabase, clearDatabase } from "./helpers/testDb.js";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import orderModel from "../../models/orderModel.js";
import { comparePassword, hashPassword } from "../../helpers/authHelper.js";
import {
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "../../controllers/authController.js";

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  headers: {},
  user: null,
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createUser = async (overrides = {}) => {
  const password = overrides.password ?? "password123";
  const hashed = await hashPassword(password);
  return await userModel.create({
    name: overrides.name ?? "User",
    email: (overrides.email ?? "user@example.com").toLowerCase(),
    password: hashed,
    phone: overrides.phone ?? "12345678",
    address: overrides.address ?? "123 Address",
    DOB: overrides.DOB ?? "1990-01-01",
    answer: overrides.answer ?? "answer",
    role: overrides.role ?? 0,
  });
};

const createCategory = async (overrides = {}) => {
  return await categoryModel.create({
    name: overrides.name ?? "Category",
    slug: overrides.slug ?? "category",
  });
};

const createProduct = async (overrides = {}) => {
  const category = overrides.category ?? (await createCategory());
  return await productModel.create({
    name: overrides.name ?? "Product",
    slug: overrides.slug ?? "product",
    description: overrides.description ?? "A product description",
    price: overrides.price ?? 10,
    category: category._id ?? category,
    quantity: overrides.quantity ?? 1,
    ...(overrides.photo ? { photo: overrides.photo } : {}),
  });
};

const createOrder = async (overrides = {}) => {
  const buyer = overrides.buyer ?? (await createUser({ email: "buyer@example.com" }));
  const products = overrides.products ?? [await createProduct()];
  return await orderModel.create({
    buyer: buyer._id ?? buyer,
    products: products.map((p) => p._id ?? p),
    payment: overrides.payment ?? { success: true },
    status: overrides.status ?? "Not Process",
    ...(overrides.createdAt ? { createdAt: overrides.createdAt, updatedAt: overrides.createdAt } : {}),
  });
};

beforeAll(async () => {
  await connect();
});

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  await clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

describe("Backend Integration: Orders + Profile Controllers", () => {
  // Yeo Zi Yi, A0266292X
  describe("Update profile + userModel + hashPassword", () => {
    it("updates name/phone in MongoDB and persists password update that passes comparePassword", async () => {
      const user = await createUser({
        email: "profile@example.com",
        name: "Old Name",
        phone: "11111111",
        password: "oldpassword",
      });

      const req = makeReq({
        user: { _id: user._id },
        body: {
          name: "New Name",
          phone: "99999999",
          password: "newpassword456",
        },
      });
      const res = makeRes();

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.send.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.updatedUser.name).toBe("New Name");
      expect(payload.updatedUser.phone).toBe("99999999");

      const dbUser = await userModel.findById(user._id);
      expect(dbUser.name).toBe("New Name");
      expect(dbUser.phone).toBe("99999999");
      expect(dbUser.password).not.toBe("newpassword456");
      expect(dbUser.password).toMatch(/^\$2b\$/);

      await expect(comparePassword("newpassword456", dbUser.password)).resolves.toBe(true);
      await expect(comparePassword("oldpassword", dbUser.password)).resolves.toBe(false);
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Get orders with populated fields", () => {
    it("returns buyer orders populated with buyer.name and product fields (without photo)", async () => {
      const buyer = await createUser({ email: "buyer1@example.com", name: "Buyer One" });
      const cat = await createCategory({ name: "General", slug: "general" });
      const p1 = await createProduct({
        category: cat,
        name: "Phone",
        slug: "phone",
        photo: { data: Buffer.from("img"), contentType: "image/png" },
      });
      const p2 = await createProduct({
        category: cat,
        name: "Laptop",
        slug: "laptop",
        photo: { data: Buffer.from("img2"), contentType: "image/png" },
      });
      await createOrder({
        buyer,
        products: [p1, p2],
        payment: { success: true },
        status: "Not Process",
      });

      const req = makeReq({ user: { _id: buyer._id } });
      const res = makeRes();

      await getOrdersController(req, res);

      const orders = res.json.mock.calls[0][0];
      expect(Array.isArray(orders)).toBe(true);
      expect(orders).toHaveLength(1);

      const order = orders[0];
      expect(order.buyer.name).toBe("Buyer One");
      expect(order.products).toHaveLength(2);
      const productNames = order.products.map((p) => p.name);
      expect(productNames).toEqual(expect.arrayContaining(["Phone", "Laptop"]));

      const plainProducts = JSON.parse(JSON.stringify(order.products));
      for (const p of plainProducts) {
        expect(p).not.toHaveProperty("photo");
      }
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Get all orders sorted by date (admin)", () => {
    it("returns all orders sorted newest first, with populated buyer.name and product fields", async () => {
      const buyerA = await createUser({ email: "a@example.com", name: "Alice" });
      const buyerB = await createUser({ email: "b@example.com", name: "Bob" });
      const cat = await createCategory({ name: "Tech", slug: "tech" });
      const prod = await createProduct({ category: cat, name: "Gadget", slug: "gadget" });

      const o1 = await createOrder({ buyer: buyerA, products: [prod], status: "Not Process" });
      await new Promise((r) => setTimeout(r, 25));
      const o3 = await createOrder({ buyer: buyerA, products: [prod], status: "Processing" });
      await new Promise((r) => setTimeout(r, 25));
      const o2 = await createOrder({ buyer: buyerB, products: [prod], status: "Shipped" });

      const req = makeReq();
      const res = makeRes();

      await getAllOrdersController(req, res);

      if (res.status.mock.calls.length) {
        const logged = console.log.mock.calls?.[0]?.[0];
        const loggedMsg =
          logged instanceof Error ? `${logged.name}: ${logged.message}` : JSON.stringify(logged);
        throw new Error(
          `Expected res.json(orders) but controller returned status ${res.status.mock.calls[0][0]}. Logged: ${loggedMsg}`
        );
      }

      const orders = res.json.mock.calls[0][0];
      expect(orders).toHaveLength(3);
      const ids = orders.map((o) => o._id.toString());
      expect(ids[0]).toBe(o2._id.toString());
      expect(ids[1]).toBe(o3._id.toString());
      expect(ids[2]).toBe(o1._id.toString());

      expect(orders[0].buyer.name).toBe("Bob");
      expect(orders[1].buyer.name).toBe("Alice");
      expect(orders[0].products[0].name).toBe("Gadget");

      const plainProducts = JSON.parse(JSON.stringify(orders[0].products));
      expect(plainProducts[0]).not.toHaveProperty("photo");
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("Order status update persists", () => {
    it('updates status to "Shipped" and persists the change in MongoDB', async () => {
      const buyer = await createUser({ email: "ship@example.com", name: "Shipper" });
      const prod = await createProduct({ name: "Box", slug: "box" });
      const order = await createOrder({ buyer, products: [prod], status: "Not Process" });

      const req = makeReq({
        params: { orderId: order._id.toString() },
        body: { status: "Shipped" },
      });
      const res = makeRes();

      await orderStatusController(req, res);

      const updated = res.json.mock.calls[0][0];
      expect(updated.status).toBe("Shipped");

      const dbOrder = await orderModel.findById(order._id);
      expect(dbOrder.status).toBe("Shipped");
    });
  });

  // Yeo Zi Yi, A0266292X
  describe("User order isolation", () => {
    it("returns only the orders belonging to the authenticated user", async () => {
      const userA = await createUser({ email: "ua@example.com", name: "User A" });
      const userB = await createUser({ email: "ub@example.com", name: "User B" });
      const prod = await createProduct({ name: "Item", slug: "item" });

      const orderA1 = await createOrder({ buyer: userA, products: [prod] });
      const orderA2 = await createOrder({ buyer: userA, products: [prod] });
      const orderB1 = await createOrder({ buyer: userB, products: [prod] });

      const req = makeReq({ user: { _id: userA._id } });
      const res = makeRes();

      await getOrdersController(req, res);

      const orders = res.json.mock.calls[0][0];
      const ids = orders.map((o) => o._id.toString());
      expect(ids).toEqual(expect.arrayContaining([orderA1._id.toString(), orderA2._id.toString()]));
      expect(ids).not.toContain(orderB1._id.toString());
    });
  });
});

