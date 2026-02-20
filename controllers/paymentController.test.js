/**
 * Payment Controller Tests
 * =========================
 * Tests for braintreeTokenController and brainTreePaymentController
 * in controllers/productController.js
 *
 * SECURITY RISKS & LOGIC FLAWS FOUND (not fixed):
 * ------------------------------------------------
 * [SEC-1] Token endpoint has NO authentication middleware.
 *         Route: GET /braintree/token — no requireSignIn.
 *         Anyone can generate a client token, enabling unauthorized
 *         payment form rendering.
 *
 * [SEC-2] Payment amount is computed from client-provided cart prices,
 *         NOT verified against server-side product prices. An attacker
 *         can send { price: 0.01 } for a $999 item.
 *
 * [SEC-3] No idempotency key or duplicate-payment guard. The same nonce
 *         and cart can be submitted multiple times, creating duplicate
 *         orders and charges.
 *
 * BUGS FIXED:
 * -----------
 * [BUG-1] FIXED — braintreeTokenController outer catch now sends 500.
 *
 * [BUG-2] FIXED — brainTreePaymentController uses forEach() instead of map().
 *
 * [BUG-3] FIXED — Cart is validated (null/undefined/non-array → 500).
 *
 * [BUG-4] NOT FIXED — No validation of individual cart item prices.
 *         Negative, NaN, undefined, or string values still accepted.
 *
 * [BUG-5] FIXED — order.save() is now awaited.
 *
 * [BUG-6] FIXED — brainTreePaymentController outer catch now sends 500.
 *
 * [BUG-7] NOT FIXED — Full cart objects stored instead of ObjectIds.
 *
 * [BUG-8] NOT FIXED — Gateway initialized at module level with env vars.
 */

// ─── Braintree SDK mock ─────────────────────────────────────────────────────
// Use a shared object to avoid TDZ issues with jest.mock hoisting.
// jest.mock factories run before const assignments, so we store fns
// in a module-level object that the factory can reference after assignment.
let mockGenerate;
let mockSale;

jest.mock('braintree', () => {
  const generate = jest.fn();
  const sale = jest.fn();
  // Store references so tests can access them
  // We use a side-channel: assign to outer scope in beforeEach after import
  return {
    __getMocks: () => ({ generate, sale }),
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      clientToken: { generate },
      transaction: { sale },
    })),
    Environment: { Sandbox: 'sandbox' },
  };
});

// ─── Order model mock ───────────────────────────────────────────────────────
const mockSave = jest.fn();
jest.mock('../models/orderModel.js', () => {
  const MockOrder = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));
  return { __esModule: true, default: MockOrder };
});

// ─── Other module mocks (prevent side effects) ─────────────────────────────
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('../models/productModel.js', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('../models/categoryModel.js', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('slugify', () => jest.fn((str) => str));
jest.mock('fs');

// ─── Import controllers AFTER mocks are hoisted ────────────────────────────
import { braintreeTokenController, brainTreePaymentController } from './productController.js';
import orderModel from '../models/orderModel.js';
import braintree from 'braintree';

// Retrieve the actual mock function references created inside jest.mock factory
const braintreeMocks = braintree.__getMocks();
mockGenerate = braintreeMocks.generate;
mockSale = braintreeMocks.sale;

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeReq(body = {}, user = { _id: 'user123' }) {
  return { body, user };
}

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════
// braintreeTokenController
// ═══════════════════════════════════════════════════════════════════════════
describe('braintreeTokenController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = makeReq();
    res = makeRes();
  });

  // ── Success path ────────────────────────────────────────────────────────
  test('should return client token on successful generation', async () => {
    const fakeResponse = { clientToken: 'fake-client-token-abc123' };
    mockGenerate.mockImplementation((opts, cb) => cb(null, fakeResponse));

    await braintreeTokenController(req, res);

    expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
    expect(res.send).toHaveBeenCalledWith(fakeResponse);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should pass empty options object to generate', async () => {
    mockGenerate.mockImplementation((opts, cb) => cb(null, { clientToken: 't' }));

    await braintreeTokenController(req, res);

    expect(mockGenerate).toHaveBeenCalledWith({}, expect.any(Function));
  });

  // ── Error inside callback ───────────────────────────────────────────────
  test('should return 500 with error when generate fails via callback', async () => {
    const braintreeError = new Error('Authentication failed');
    mockGenerate.mockImplementation((opts, cb) => cb(braintreeError, null));

    await braintreeTokenController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(braintreeError);
  });

  test('should handle Braintree auth error (missing credentials)', async () => {
    const authError = { name: 'authenticationError', message: 'Invalid keys' };
    mockGenerate.mockImplementation((opts, cb) => cb(authError, null));

    await braintreeTokenController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(authError);
  });

  // ── Synchronous throw (BUG-1 FIXED: now sends 500) ─────────────────────
  test('should send 500 response on synchronous gateway failure [BUG-1 FIXED]', async () => {
    const syncError = new Error('Synchronous gateway failure');
    mockGenerate.mockImplementation(() => {
      throw syncError;
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await braintreeTokenController(req, res);

    // Fixed: now sends a 500 response instead of hanging
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(syncError);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // ── Security: no auth required (SEC-1) ──────────────────────────────────
  test('should work without req.user (no auth required) [SEC-1]', async () => {
    const reqNoUser = { body: {} };
    mockGenerate.mockImplementation((opts, cb) => cb(null, { clientToken: 'token-no-auth' }));

    await braintreeTokenController(reqNoUser, res);

    expect(res.send).toHaveBeenCalledWith({ clientToken: 'token-no-auth' });
  });

  // ── Edge: callback called with both err and response ────────────────────
  test('should prioritize error when both err and response are truthy', async () => {
    const err = new Error('partial error');
    const response = { clientToken: 'some-token' };
    mockGenerate.mockImplementation((opts, cb) => cb(err, response));

    await braintreeTokenController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });

  // ── Edge: callback called with null error and null response ─────────────
  test('should send null/undefined response when no error and no data', async () => {
    mockGenerate.mockImplementation((opts, cb) => cb(null, null));

    await braintreeTokenController(req, res);

    expect(res.send).toHaveBeenCalledWith(null);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// brainTreePaymentController
// ═══════════════════════════════════════════════════════════════════════════
describe('brainTreePaymentController', () => {
  let req, res;

  const validCart = [
    { _id: 'prod1', name: 'Widget', price: 29.99 },
    { _id: 'prod2', name: 'Gadget', price: 49.99 },
  ];
  const validNonce = 'fake-payment-nonce-xyz';
  const fakeUser = { _id: 'user456' };

  beforeEach(() => {
    jest.clearAllMocks();
    req = makeReq({ nonce: validNonce, cart: validCart }, fakeUser);
    res = makeRes();
    mockSave.mockResolvedValue({});
  });

  // ── Success path ────────────────────────────────────────────────────────
  test('should process payment and create order on success', async () => {
    const fakeResult = {
      success: true,
      transaction: { id: 'txn_123', status: 'submitted_for_settlement' },
    };
    mockSale.mockImplementation((opts, cb) => cb(null, fakeResult));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(
      {
        amount: 79.98,
        paymentMethodNonce: validNonce,
        options: { submitForSettlement: true },
      },
      expect.any(Function),
    );

    expect(orderModel).toHaveBeenCalledWith({
      products: validCart,
      payment: fakeResult,
      buyer: 'user456',
    });

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('should compute total from all cart item prices', async () => {
    const cart = [
      { _id: 'a', price: 10 },
      { _id: 'b', price: 20 },
      { _id: 'c', price: 30 },
    ];
    req = makeReq({ nonce: validNonce, cart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 60 }), expect.any(Function));
  });

  test('should pass submitForSettlement: true in options', async () => {
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    const saleArgs = mockSale.mock.calls[0][0];
    expect(saleArgs.options).toEqual({ submitForSettlement: true });
  });

  test('should use req.user._id as buyer in order', async () => {
    const customUser = { _id: 'custom-buyer-789' };
    req = makeReq({ nonce: validNonce, cart: validCart }, customUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(orderModel).toHaveBeenCalledWith(expect.objectContaining({ buyer: 'custom-buyer-789' }));
  });

  // ── Single item cart ────────────────────────────────────────────────────
  test('should handle single item cart', async () => {
    const singleCart = [{ _id: 'p1', price: 15.5 }];
    req = makeReq({ nonce: validNonce, cart: singleCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 15.5 }), expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  // ── Transaction failure (Braintree error) ──────────────────────────────
  test('should return 500 when Braintree transaction fails', async () => {
    const txnError = new Error('Insufficient funds');
    mockSale.mockImplementation((opts, cb) => cb(txnError, null));

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(txnError);
  });

  test('should return 500 when result is null (no error, no result)', async () => {
    mockSale.mockImplementation((opts, cb) => cb(null, null));

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(null);
  });

  test('should return 500 when result is undefined', async () => {
    mockSale.mockImplementation((opts, cb) => cb(undefined, undefined));

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Declined transaction (result.success = false) ──────────────────────
  test('should still return { ok: true } even if result.success is false but result is truthy [BUG]', async () => {
    const declinedResult = {
      success: false,
      transaction: { id: 'txn_declined', status: 'processor_declined' },
    };
    mockSale.mockImplementation((opts, cb) => cb(null, declinedResult));

    await brainTreePaymentController(req, res);

    expect(orderModel).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  // ── Missing nonce [BUG-3] ──────────────────────────────────────────────
  test('should pass undefined nonce to Braintree when nonce is missing [BUG-3]', async () => {
    req = makeReq({ cart: validCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethodNonce: undefined }),
      expect.any(Function),
    );
  });

  test('should pass empty string nonce to Braintree', async () => {
    req = makeReq({ nonce: '', cart: validCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ paymentMethodNonce: '' }), expect.any(Function));
  });

  // ── Missing/null/empty cart [BUG-3] ────────────────────────────────────
  test('should return 400 when cart is null [BUG-3 FIXED]', async () => {
    req = makeReq({ nonce: validNonce, cart: null }, fakeUser);

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid cart' });
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should return 400 when cart is undefined [BUG-3 FIXED]', async () => {
    req = makeReq({ nonce: validNonce }, fakeUser);

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid cart' });
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should return 400 for empty cart array [BUG-3 FIXED]', async () => {
    req = makeReq({ nonce: validNonce, cart: [] }, fakeUser);

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid cart' });
    expect(mockSale).not.toHaveBeenCalled();
  });

  // ── Price validation issues [BUG-4] ────────────────────────────────────
  test('should send negative total to Braintree when cart has negative prices [BUG-4]', async () => {
    const negativeCart = [
      { _id: 'p1', price: -50 },
      { _id: 'p2', price: 10 },
    ];
    req = makeReq({ nonce: validNonce, cart: negativeCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: -40 }), expect.any(Function));
  });

  test('should default undefined price to 0 via Number() guard [BUG-4 FIXED]', async () => {
    const badCart = [{ _id: 'p1', price: 10 }, { _id: 'p2' }];
    req = makeReq({ nonce: validNonce, cart: badCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 10 }), expect.any(Function));
  });

  test('should convert string prices to numbers via Number() [BUG-4 FIXED]', async () => {
    const stringCart = [
      { _id: 'p1', price: '10' },
      { _id: 'p2', price: '20' },
    ];
    req = makeReq({ nonce: validNonce, cart: stringCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 30 }), expect.any(Function));
  });

  // ── Price manipulation (SEC-2) ─────────────────────────────────────────
  test('should accept tampered prices without server-side verification [SEC-2]', async () => {
    const tamperedCart = [{ _id: 'expensive-item', name: 'Laptop', price: 0.01 }];
    req = makeReq({ nonce: validNonce, cart: tamperedCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 0.01 }), expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  // ── Double payment / no idempotency (SEC-3) ────────────────────────────
  test('should allow duplicate payment with same nonce and cart [SEC-3]', async () => {
    const fakeResult = { success: true, transaction: { id: 'txn_1' } };
    mockSale.mockImplementation((opts, cb) => cb(null, fakeResult));

    // First payment
    await brainTreePaymentController(req, res);
    expect(orderModel).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ ok: true });

    // Reset response mock for second call
    const res2 = makeRes();

    // Second payment (same nonce, same cart) — no dedup guard
    await brainTreePaymentController(req, res2);
    expect(orderModel).toHaveBeenCalledTimes(2);
    expect(res2.json).toHaveBeenCalledWith({ ok: true });
  });

  // ── Order save not awaited (BUG-5) ─────────────────────────────────────
  test('should return 500 if order save fails [BUG-5 FIXED]', async () => {
    // With the fix, save is now awaited and wrapped in try-catch.
    // If save rejects, the error is caught and a 500 response is sent.
    const saveError = new Error('DB write failed');
    mockSave.mockRejectedValue(saveError);
    const fakeResult = { success: true, transaction: {} };
    mockSale.mockImplementation((opts, cb) => cb(null, fakeResult));

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await brainTreePaymentController(req, res);

    // Allow microtasks to flush so the async callback runs
    await new Promise((r) => setTimeout(r, 50));

    // res.json should NOT have been called because save threw before it
    expect(res.json).not.toHaveBeenCalledWith({ ok: true });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(saveError);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // ── Synchronous throw in controller body (BUG-6) ──────────────────────
  test('should send 500 when gateway.transaction.sale throws synchronously [BUG-6 FIXED]', async () => {
    const syncError = new Error('Gateway not initialized');
    mockSale.mockImplementation(() => {
      throw syncError;
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await brainTreePaymentController(req, res);

    // Fixed: now sends a 500 response instead of hanging
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(syncError);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // ── Products stored as full objects instead of ObjectIds (BUG-7) ───────
  test('should store full cart objects in order, not ObjectIds [BUG-7]', async () => {
    const fakeResult = { success: true, transaction: {} };
    mockSale.mockImplementation((opts, cb) => cb(null, fakeResult));

    await brainTreePaymentController(req, res);

    expect(orderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        products: validCart,
      }),
    );
  });

  // ── Missing req.user (would crash if middleware not applied) ────────────
  test('should return 500 if req.user is undefined (missing auth middleware)', async () => {
    req = { body: { nonce: validNonce, cart: validCart } };
    const fakeResult = { success: true, transaction: {} };
    mockSale.mockImplementation((opts, cb) => cb(null, fakeResult));
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await brainTreePaymentController(req, res);

    // Allow microtasks to flush so the async callback runs
    await new Promise((r) => setTimeout(r, 50));

    // Accessing req.user._id on undefined throws TypeError,
    // now caught by the inner try-catch and sends 500
    expect(consoleSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).not.toHaveBeenCalledWith({ ok: true });

    consoleSpy.mockRestore();
  });

  // ── Large cart ──────────────────────────────────────────────────────────
  test('should compute correct total for large cart', async () => {
    const largeCart = Array.from({ length: 100 }, (_, i) => ({
      _id: `p${i}`,
      price: 1.0,
    }));
    req = makeReq({ nonce: validNonce, cart: largeCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 100.0 }), expect.any(Function));
  });

  // ── Floating point precision ───────────────────────────────────────────
  test('should handle floating point precision in price totals', async () => {
    const floatCart = [
      { _id: 'p1', price: 0.1 },
      { _id: 'p2', price: 0.2 },
    ];
    req = makeReq({ nonce: validNonce, cart: floatCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    const saleArgs = mockSale.mock.calls[0][0];
    expect(saleArgs.amount).toBeCloseTo(0.3, 10);
  });

  // ── Braintree error object shapes ──────────────────────────────────────
  test('should send Braintree gateway error object on failure', async () => {
    const gatewayError = {
      type: 'invalidTransactionError',
      message: 'Amount is invalid',
    };
    mockSale.mockImplementation((opts, cb) => cb(gatewayError, null));

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(gatewayError);
  });

  // ── Body completely missing ────────────────────────────────────────────
  test('should return 400 for completely empty request body (no cart) [BUG-3 FIXED]', async () => {
    req = makeReq({}, fakeUser);

    await brainTreePaymentController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid cart' });
    expect(res.json).not.toHaveBeenCalled();
  });

  // ── Cart with zero price items ─────────────────────────────────────────
  test('should process payment even with all zero-price items', async () => {
    const freeCart = [
      { _id: 'p1', price: 0 },
      { _id: 'p2', price: 0 },
    ];
    req = makeReq({ nonce: validNonce, cart: freeCart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: {} }));

    await brainTreePaymentController(req, res);

    expect(mockSale).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }), expect.any(Function));
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration-style tests: Token → Payment flow
// ═══════════════════════════════════════════════════════════════════════════
describe('Payment flow integration', () => {
  const fakeUser = { _id: 'integration-user' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue({});
  });

  test('should complete full token → payment flow', async () => {
    const tokenRes = makeRes();
    mockGenerate.mockImplementation((opts, cb) => cb(null, { clientToken: 'integration-token' }));

    await braintreeTokenController(makeReq(), tokenRes);
    expect(tokenRes.send).toHaveBeenCalledWith({
      clientToken: 'integration-token',
    });

    const paymentRes = makeRes();
    const cart = [{ _id: 'prod1', price: 99.99 }];
    const paymentReq = makeReq({ nonce: 'real-nonce-from-dropin', cart }, fakeUser);
    mockSale.mockImplementation((opts, cb) => cb(null, { success: true, transaction: { id: 'txn_integration' } }));

    await brainTreePaymentController(paymentReq, paymentRes);

    expect(paymentRes.json).toHaveBeenCalledWith({ ok: true });
    expect(orderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        products: cart,
        buyer: 'integration-user',
      }),
    );
  });

  test('should handle token success followed by payment failure', async () => {
    const tokenRes = makeRes();
    mockGenerate.mockImplementation((opts, cb) => cb(null, { clientToken: 'token-123' }));
    await braintreeTokenController(makeReq(), tokenRes);
    expect(tokenRes.send).toHaveBeenCalled();

    const paymentRes = makeRes();
    const paymentError = new Error('Card declined');
    mockSale.mockImplementation((opts, cb) => cb(paymentError, null));

    await brainTreePaymentController(
      makeReq({ nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] }, fakeUser),
      paymentRes,
    );

    expect(paymentRes.status).toHaveBeenCalledWith(500);
    expect(paymentRes.send).toHaveBeenCalledWith(paymentError);
    expect(orderModel).not.toHaveBeenCalled();
  });

  test('should handle token failure (payment should not proceed)', async () => {
    const tokenRes = makeRes();
    const tokenError = new Error('Braintree down');
    mockGenerate.mockImplementation((opts, cb) => cb(tokenError, null));

    await braintreeTokenController(makeReq(), tokenRes);

    expect(tokenRes.status).toHaveBeenCalledWith(500);
  });

  test('should send 500 on network-level timeout in token [BUG-1 FIXED]', async () => {
    const tokenRes = makeRes();
    const timeoutError = new Error('ETIMEDOUT');
    mockGenerate.mockImplementation(() => {
      throw timeoutError;
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await braintreeTokenController(makeReq(), tokenRes);

    expect(tokenRes.status).toHaveBeenCalledWith(500);
    expect(tokenRes.send).toHaveBeenCalledWith(timeoutError);

    consoleSpy.mockRestore();
  });

  test('should send 500 on network-level timeout in payment [BUG-6 FIXED]', async () => {
    const paymentRes = makeRes();
    const connError = new Error('ECONNREFUSED');
    mockSale.mockImplementation(() => {
      throw connError;
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await brainTreePaymentController(
      makeReq({ nonce: 'nonce', cart: [{ _id: 'p1', price: 10 }] }, fakeUser),
      paymentRes,
    );

    expect(paymentRes.status).toHaveBeenCalledWith(500);
    expect(paymentRes.send).toHaveBeenCalledWith(connError);

    consoleSpy.mockRestore();
  });
});
