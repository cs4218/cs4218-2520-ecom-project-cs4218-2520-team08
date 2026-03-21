import { connect, closeDatabase, clearDatabase } from './helpers/testDb.js';
import categoryModel from '../../models/categoryModel.js';
import productModel from '../../models/productModel.js';
import orderModel from '../../models/orderModel.js';
import userModel from '../../models/userModel.js';
import { categoryControlller, singleCategoryController } from '../../controllers/categoryController.js';
import { brainTreePaymentController } from '../../controllers/productController.js';

// Mock braintree so gateway.transaction.sale invokes the callback with a
// successful result object, exactly as the real Braintree SDK would.
jest.mock('braintree', () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn((opts, cb) =>
        cb(null, {
          success: true,
          transaction: { id: 'fake_txn_123' },
        }),
      ),
    },
  })),
  Environment: { Sandbox: 'sandbox' },
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
  return res;
};

beforeAll(async () => {
  await connect();
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(async () => {
  await clearDatabase();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

// Lee Seng Kitt
describe('Backend Integration: Category & Payment Controllers', () => {
  // ─── Test 1 ────────────────────────────────────────────────────────────────
  describe('Get all categories from real DB', () => {
    it('returns all inserted categories with correct names and slugs', async () => {
      // Pass mixed-case slugs so the lowercase assertion validates Mongoose's lowercase: true transform
      await categoryModel.create({ name: 'Electronics', slug: 'Electronics' });
      await categoryModel.create({ name: 'Books', slug: 'Books' });
      await categoryModel.create({ name: 'Clothing', slug: 'Clothing' });

      const req = makeReq();
      const res = makeRes();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.message).toBe('All Categories List');
      expect(body.category).toHaveLength(3);

      const names = body.category.map((c) => c.name);
      expect(names).toContain('Electronics');
      expect(names).toContain('Books');
      expect(names).toContain('Clothing');

      // Slugs should be lowercase
      const slugs = body.category.map((c) => c.slug);
      expect(slugs).toContain('electronics');
      expect(slugs).toContain('books');
      expect(slugs).toContain('clothing');
    });
  });

  // ─── Test 2 ────────────────────────────────────────────────────────────────
  describe('Get single category by slug', () => {
    it('returns the correct category for a valid slug', async () => {
      await categoryModel.create({ name: 'Electronics', slug: 'Electronics' });

      const req = makeReq({ params: { slug: 'electronics' } });
      const res = makeRes();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.message).toBe('Get Single Category Successfully');
      expect(body.category.name).toBe('Electronics');
      expect(body.category.slug).toBe('electronics');
    });

    it('returns null category gracefully for a non-existent slug', async () => {
      const req = makeReq({ params: { slug: 'nonexistent' } });
      const res = makeRes();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.send.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.category).toBeNull();
    });
  });

  // ─── Test 3 ────────────────────────────────────────────────────────────────
  describe('Payment creates order with products', () => {
    it('creates an order document in MongoDB with correct buyer, products, payment, and default status', async () => {
      // Create a user
      const user = await userModel.create({
        name: 'Test Buyer',
        email: 'buyer@test.com',
        password: 'hashedpassword123',
        phone: '12345678',
        address: '123 Test Street',
        DOB: '1990-01-01',
        answer: 'testanswer',
      });

      // Create a category and two products
      const cat = await categoryModel.create({ name: 'General', slug: 'general' });
      const product1 = await productModel.create({
        name: 'Widget A',
        slug: 'widget-a',
        description: 'First widget',
        price: 25,
        category: cat._id,
        quantity: 10,
      });
      const product2 = await productModel.create({
        name: 'Widget B',
        slug: 'widget-b',
        description: 'Second widget',
        price: 75,
        category: cat._id,
        quantity: 5,
      });

      const req = makeReq({
        body: {
          nonce: 'fake-nonce',
          cart: [
            { _id: product1._id, price: 25 },
            { _id: product2._id, price: 75 },
          ],
        },
        user: { _id: user._id },
      });
      const res = makeRes();

      await brainTreePaymentController(req, res);

      // The mock invokes the callback synchronously, but the callback is
      // async (it awaits orderModel.save()). Poll until the order appears
      // instead of using a brittle fixed delay.
      let orders = [];
      for (let i = 0; i < 50; i++) {
        orders = await orderModel.find({});
        if (orders.length > 0) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(res.json).toHaveBeenCalledWith({ ok: true });

      // Verify the order document in MongoDB
      expect(orders).toHaveLength(1);

      const order = orders[0];
      expect(order.buyer.toString()).toBe(user._id.toString());
      expect(order.products).toHaveLength(2);
      // Verify actual product IDs are stored correctly
      const storedProductIds = order.products.map((p) => p.toString());
      expect(storedProductIds).toContain(product1._id.toString());
      expect(storedProductIds).toContain(product2._id.toString());
      expect(order.payment.success).toBe(true);
      expect(order.payment.transaction.id).toBe('fake_txn_123');
      expect(order.status).toBe('Not Process');
    });
  });

  // ─── Test 4 ────────────────────────────────────────────────────────────────
  describe('Category listing reflects live DB state', () => {
    it('reflects insertions and deletions in real time', async () => {
      // Step A: empty DB → empty list
      const resA = makeRes();
      await categoryControlller(makeReq(), resA);

      const bodyA = resA.send.mock.calls[0][0];
      expect(bodyA.success).toBe(true);
      expect(bodyA.category).toHaveLength(0);

      // Step B: insert 3 categories → list has 3
      const c1 = await categoryModel.create({ name: 'Alpha', slug: 'Alpha' });
      await categoryModel.create({ name: 'Beta', slug: 'Beta' });
      await categoryModel.create({ name: 'Gamma', slug: 'Gamma' });

      const resB = makeRes();
      await categoryControlller(makeReq(), resB);

      const bodyB = resB.send.mock.calls[0][0];
      expect(bodyB.success).toBe(true);
      expect(bodyB.category).toHaveLength(3);
      const namesB = bodyB.category.map((c) => c.name);
      expect(namesB).toContain('Alpha');
      expect(namesB).toContain('Beta');
      expect(namesB).toContain('Gamma');

      // Step C: delete one → list has 2, deleted name absent
      await categoryModel.findByIdAndDelete(c1._id);

      const resC = makeRes();
      await categoryControlller(makeReq(), resC);

      const bodyC = resC.send.mock.calls[0][0];
      expect(bodyC.success).toBe(true);
      expect(bodyC.category).toHaveLength(2);
      const namesC = bodyC.category.map((c) => c.name);
      expect(namesC).not.toContain('Alpha');
      expect(namesC).toContain('Beta');
      expect(namesC).toContain('Gamma');
    });
  });
});
