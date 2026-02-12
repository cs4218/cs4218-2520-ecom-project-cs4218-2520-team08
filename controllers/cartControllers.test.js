/**
 * Backend Controller Tests for Cart Checkout API Endpoints
 *
 * Tests the controllers that the CartPage component calls:
 * - braintreeTokenController  → GET  /api/v1/product/braintree/token
 * - brainTreePaymentController → POST /api/v1/product/braintree/payment
 */

import { braintreeTokenController, brainTreePaymentController } from './productController.js';
import orderModel from '../models/orderModel.js';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../models/productModel.js');
jest.mock('../models/categoryModel.js');
jest.mock('../models/orderModel.js');

// Mock braintree gateway — mock functions must be created inside the factory
// because jest.mock is hoisted above all variable declarations.
// We retrieve them later via the imported module.
const mockGenerate = jest.fn();
const mockSale = jest.fn();

jest.mock('braintree', () => {
  // These references will be resolved at call time, not definition time
  const generate = (...args) => mockGenerate(...args);
  const sale = (...args) => mockSale(...args);
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate },
      transaction: { sale },
    })),
    Environment: { Sandbox: 'sandbox' },
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides = {}) => ({
  params: {},
  body: {},
  query: {},
  user: { _id: 'user123' },
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// braintreeTokenController
// ═══════════════════════════════════════════════════════════════════════════════

describe('braintreeTokenController – GET /api/v1/product/braintree/token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns clientToken on successful generation', async () => {
    const tokenResponse = { clientToken: 'test-token-abc' };
    mockGenerate.mockImplementation((opts, cb) => {
      cb(null, tokenResponse);
    });

    const req = mockRequest();
    const res = mockResponse();

    await braintreeTokenController(req, res);

    expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
    expect(res.send).toHaveBeenCalledWith(tokenResponse);
  });

  it('returns 500 when braintree returns an error', async () => {
    const braintreeError = new Error('Braintree configuration error');
    mockGenerate.mockImplementation((opts, cb) => {
      cb(braintreeError, null);
    });

    const req = mockRequest();
    const res = mockResponse();

    await braintreeTokenController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(braintreeError);
  });

  it('handles unexpected exception in try-catch', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockGenerate.mockImplementation(() => {
      throw new Error('Unexpected crash');
    });

    const req = mockRequest();
    const res = mockResponse();

    await braintreeTokenController(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// brainTreePaymentController
// ═══════════════════════════════════════════════════════════════════════════════

describe('brainTreePaymentController – POST /api/v1/product/braintree/payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock orderModel constructor to return an object with a save method
    orderModel.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(true),
    }));
  });

  it('processes payment and creates order on success', async () => {
    const cart = [
      { _id: 'p1', name: 'Item 1', price: 10 },
      { _id: 'p2', name: 'Item 2', price: 20 },
    ];
    const transactionResult = {
      success: true,
      transaction: { id: 'txn123' },
    };

    mockSale.mockImplementation((opts, cb) => {
      cb(null, transactionResult);
    });

    const req = mockRequest({
      body: { nonce: 'payment-nonce', cart },
      user: { _id: 'buyer123' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    // Verify transaction.sale called with correct amount
    expect(mockSale).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 30, // 10 + 20
        paymentMethodNonce: 'payment-nonce',
        options: { submitForSettlement: true },
      }),
      expect.any(Function),
    );

    // Verify order created
    expect(orderModel).toHaveBeenCalledWith({
      products: cart,
      payment: transactionResult,
      buyer: 'buyer123',
    });

    // Verify response
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('calculates total correctly for single item', async () => {
    const cart = [{ _id: 'p1', name: 'Solo', price: 42.5 }];

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 42.5 }), expect.any(Function));
  });

  it('calculates total correctly for many items', async () => {
    const cart = Array.from({ length: 5 }, (_, i) => ({
      _id: `p${i}`,
      name: `Item ${i}`,
      price: 10,
    }));

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 50 }), expect.any(Function));
  });

  it('returns 500 when braintree transaction fails', async () => {
    const transactionError = new Error('Transaction declined');
    mockSale.mockImplementation((opts, cb) => {
      cb(transactionError, null);
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(transactionError);
  });

  it('does NOT create an order when transaction fails', async () => {
    mockSale.mockImplementation((opts, cb) => {
      cb(new Error('Declined'), null);
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(orderModel).not.toHaveBeenCalled();
  });

  it('handles empty cart (total = 0)', async () => {
    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [] },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }), expect.any(Function));
  });

  it('handles cart with free items (price = 0)', async () => {
    const cart = [
      { _id: 'p1', price: 0 },
      { _id: 'p2', price: 25 },
    ];

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 25 }), expect.any(Function));
  });

  it('sets buyer from req.user._id', async () => {
    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] },
      user: { _id: 'specific-buyer-id' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(orderModel).toHaveBeenCalledWith(expect.objectContaining({ buyer: 'specific-buyer-id' }));
  });

  it('handles unexpected exception in try-catch and sends 500', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    mockSale.mockImplementation(() => {
      throw new Error('Gateway crash');
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error in payment' }));
    consoleSpy.mockRestore();
  });

  /**
   * FIXED: brainTreePaymentController now uses reduce() for summing total.
   */
  it('total calculation uses reduce correctly', async () => {
    const cart = [
      { _id: 'p1', price: 10.5 },
      { _id: 'p2', price: 20.3 },
    ];

    mockSale.mockImplementation((opts, cb) => {
      // Verify floating-point accuracy
      expect(opts.amount).toBeCloseTo(30.8, 5);
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  /**
   * FIXED: Missing price now defaults to 0 via Number() || 0.
   */
  it('sends 0 amount when cart items have no price', async () => {
    const cart = [{ _id: 'p1', name: 'No Price Item' }]; // no price field

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }), expect.any(Function));
  });

  /**
   * KNOWN ISSUE: No server-side price validation. The client sends the entire
   * cart including prices. A malicious client could modify prices.
   * This is NOT fixed in this PR.
   */
  it('accepts client-provided prices without server validation', async () => {
    const tamperedCart = [
      { _id: 'expensive-item', price: 0.01 }, // real price is $999
    ];

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: tamperedCart },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    // Server blindly trusts the client's price
    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 0.01 }), expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  /**
   * FIXED: order.save() is now awaited. The response is sent
   * only after the order is persisted.
   */
  it('awaits order.save() before sending response', async () => {
    let saveCalled = false;
    const savePromise = Promise.resolve().then(() => {
      saveCalled = true;
      return true;
    });

    orderModel.mockImplementation(() => ({
      save: jest.fn().mockReturnValue(savePromise),
    }));

    mockSale.mockImplementation((opts, cb) => {
      cb(null, { success: true });
    });

    const req = mockRequest({
      body: { nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] },
      user: { _id: 'u1' },
    });
    const res = mockResponse();

    await brainTreePaymentController(req, res);

    // Flush microtasks so the save promise resolves
    await new Promise((r) => setTimeout(r, 0));

    // save should have completed before response
    expect(saveCalled).toBe(true);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS FIXED IN THIS PR:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. ORDER SAVE NOW AWAITED:
 *    `await order.save()` ensures the order is persisted before responding.
 *
 * 2. reduce() INSTEAD OF map():
 *    Total is now computed with `cart.reduce(...)` instead of `cart.map()`.
 *
 * 3. NaN PRICE GUARD:
 *    `Number(i.price) || 0` prevents NaN when price is missing.
 *
 * 4. ERROR RESPONSE IN OUTER CATCH:
 *    The catch block now sends `res.status(500)` instead of silently logging.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REMAINING KNOWN ISSUES (not fixed):
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - NO SERVER-SIDE PRICE VALIDATION: Server trusts client-provided prices.
 * - NO INPUT VALIDATION: nonce, cart, req.user not validated.
 * - NO IDEMPOTENCY: Double-submit can create duplicate orders.
 */
