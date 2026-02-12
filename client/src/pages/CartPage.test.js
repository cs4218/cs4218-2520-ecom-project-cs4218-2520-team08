/**
 * CartPage Payment Feature Tests
 * ================================
 * Tests for the payment-related functionality in CartPage.js:
 * - Token fetching (getToken / useEffect)
 * - DropIn rendering conditions
 * - handlePayment flow (requestPaymentMethod → POST → clear cart → navigate)
 * - Payment button state (disabled conditions)
 * - Error handling in payment flow
 *
 * SECURITY RISKS & LOGIC FLAWS (documented, not fixed):
 * ─────────────────────────────────────────────────
 * [SEC-FE-1] Cart prices sent to server are client-side values.
 *            An attacker can modify localStorage or state to send
 *            arbitrary prices.
 *
 * BUGS FIXED:
 * ───────────
 * [BUG-FE-1] FIXED — totalPrice() now uses cart?.reduce() instead of map().
 *
 * [BUG-FE-2] FIXED — handlePayment catch now calls toast.error("Payment failed").
 *
 * [BUG-FE-3] FIXED — p.description?.substring(0,30) uses optional chaining.
 *
 * [BUG-FE-4] NOT FIXED — getToken fires on every auth.token change
 *            with no cancellation or dedup logic.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartPage from './CartPage';

// ─── Mock external modules ──────────────────────────────────────────────────
jest.mock('axios');
jest.mock('react-hot-toast');

// Track setCart and setAuth calls
const mockSetCart = jest.fn();
const mockSetAuth = jest.fn();

let mockAuth = {
  user: { _id: 'user1', name: 'Test User', address: '123 Main St' },
  token: 'valid-token',
};
let mockCart = [
  {
    _id: 'prod1',
    name: 'Widget',
    description: 'A fine widget for testing',
    price: 29.99,
  },
  {
    _id: 'prod2',
    name: 'Gadget',
    description: 'A great gadget for testing',
    price: 49.99,
  },
];

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [mockAuth, mockSetAuth]),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [mockCart, mockSetCart]),
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

// Mock DropIn — simulate the braintree-web-drop-in-react component
const mockRequestPaymentMethod = jest.fn();
jest.mock('braintree-web-drop-in-react', () => {
  const { useEffect, useRef } = require('react');
  return function MockDropIn({ onInstance }) {
    const calledRef = useRef(false);
    // Only call onInstance once to avoid infinite re-render loop
    // (onInstance is `(instance) => setInstance(instance)` which creates a
    // new fn reference on each render, so we can't use it as a dep)
    useEffect(() => {
      if (!calledRef.current) {
        calledRef.current = true;
        onInstance({
          requestPaymentMethod: mockRequestPaymentMethod,
        });
      }
    });
    return <div data-testid='mock-dropin'>DropIn Component</div>;
  };
});

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, val) => {
      store[key] = val;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// matchMedia polyfill for antd/Header
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// ─── Helpers ────────────────────────────────────────────────────────────────
function renderCartPage() {
  return render(
    <MemoryRouter initialEntries={['/cart']}>
      <Routes>
        <Route path='/cart' element={<CartPage />} />
        <Route path='/dashboard/user/orders' element={<div>Orders Page</div>} />
        <Route path='/dashboard/user/profile' element={<div>Profile Page</div>} />
        <Route path='/login' element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════
describe('CartPage — Payment Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock values to defaults
    mockAuth = {
      user: { _id: 'user1', name: 'Test User', address: '123 Main St' },
      token: 'valid-token',
    };
    mockCart = [
      {
        _id: 'prod1',
        name: 'Widget',
        description: 'A fine widget for testing',
        price: 29.99,
      },
      {
        _id: 'prod2',
        name: 'Gadget',
        description: 'A great gadget for testing',
        price: 49.99,
      },
    ];

    // Default: token fetch succeeds
    axios.get.mockResolvedValue({
      data: { clientToken: 'test-client-token' },
    });
    // Default: payment succeeds
    axios.post.mockResolvedValue({ data: { ok: true } });
    // Default: requestPaymentMethod returns nonce
    mockRequestPaymentMethod.mockResolvedValue({
      nonce: 'test-nonce-abc',
    });

    // Re-bind mocks for context hooks
    const { useAuth } = require('../context/auth');
    useAuth.mockReturnValue([mockAuth, mockSetAuth]);
    const { useCart } = require('../context/cart');
    useCart.mockReturnValue([mockCart, mockSetCart]);
  });

  // ── Token fetching ──────────────────────────────────────────────────────
  describe('Token Fetching', () => {
    test('should fetch Braintree client token on mount', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
      });
    });

    test('should handle token fetch failure silently [BUG-FE-2]', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      axios.get.mockRejectedValue(new Error('Network error'));

      renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // No toast or user feedback — just console.log
      expect(toast.error).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ── DropIn rendering conditions ─────────────────────────────────────────
  describe('DropIn Rendering', () => {
    test('should render DropIn when token, auth, and cart are present', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });
    });

    test('should NOT render DropIn when no client token', async () => {
      axios.get.mockResolvedValue({ data: {} }); // no clientToken

      renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('mock-dropin')).not.toBeInTheDocument();
    });

    test('should NOT render DropIn when user not logged in', async () => {
      mockAuth = { user: null, token: '' };
      const { useAuth } = require('../context/auth');
      useAuth.mockReturnValue([mockAuth, mockSetAuth]);

      renderCartPage();

      expect(screen.queryByTestId('mock-dropin')).not.toBeInTheDocument();
    });

    test('should NOT render DropIn when cart is empty', async () => {
      mockCart = [];
      const { useCart } = require('../context/cart');
      useCart.mockReturnValue([mockCart, mockSetCart]);

      renderCartPage();

      expect(screen.queryByTestId('mock-dropin')).not.toBeInTheDocument();
    });
  });

  // ── Payment button state ────────────────────────────────────────────────
  describe('Payment Button', () => {
    test('should render Make Payment button when conditions met', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /make payment/i });
      expect(btn).toBeInTheDocument();
    });

    test('should disable payment button when no user address', async () => {
      mockAuth = {
        user: { _id: 'user1', name: 'Test User', address: '' },
        token: 'valid-token',
      };
      const { useAuth } = require('../context/auth');
      useAuth.mockReturnValue([mockAuth, mockSetAuth]);

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /make payment/i });
      expect(btn).toBeDisabled();
    });
  });

  // ── handlePayment success flow ──────────────────────────────────────────
  describe('handlePayment — Success', () => {
    test('should call requestPaymentMethod and post to payment endpoint', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /make payment/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockRequestPaymentMethod).toHaveBeenCalled();
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
          nonce: 'test-nonce-abc',
          cart: mockCart,
        });
      });
    });

    test('should clear cart from localStorage on success', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('cart');
      });
    });

    test('should clear cart state on success', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(mockSetCart).toHaveBeenCalledWith([]);
      });
    });

    test('should navigate to orders page on success', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
      });
    });

    test('should show success toast on payment completion', async () => {
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      });
    });

    test('should send entire cart with client-side prices [SEC-FE-1]', async () => {
      // The cart sent to the server includes prices from client state
      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        const postCall = axios.post.mock.calls[0];
        expect(postCall[1].cart).toEqual(mockCart);
        // Prices are client-provided — server trusts them (SEC-FE-1)
        expect(postCall[1].cart[0].price).toBe(29.99);
        expect(postCall[1].cart[1].price).toBe(49.99);
      });
    });
  });

  // ── handlePayment failure flow ──────────────────────────────────────────
  describe('handlePayment — Failure', () => {
    test('should stop loading and show error toast on requestPaymentMethod failure [BUG-FE-2 FIXED]', async () => {
      mockRequestPaymentMethod.mockRejectedValue(new Error('User closed DropIn'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        // Button should revert from "Processing ...." back to "Make Payment"
        expect(screen.getByRole('button', { name: /make payment/i })).toBeInTheDocument();
      });

      // Fixed: now shows toast.error to the user
      expect(toast.error).toHaveBeenCalledWith('Payment failed');
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/user/orders');

      consoleSpy.mockRestore();
    });

    test('should stop loading and show error toast on payment POST failure [BUG-FE-2 FIXED]', async () => {
      axios.post.mockRejectedValue(new Error('Payment declined'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /make payment/i })).toBeInTheDocument();
      });

      // Cart should NOT be cleared on failure
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('cart');
      expect(mockSetCart).not.toHaveBeenCalledWith([]);
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/user/orders');
      expect(toast.success).not.toHaveBeenCalled();
      // Fixed: now shows toast.error to the user
      expect(toast.error).toHaveBeenCalledWith('Payment failed');

      consoleSpy.mockRestore();
    });

    test('should not clear cart on network error', async () => {
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(mockSetCart).not.toHaveBeenCalledWith([]);
      });

      // Fixed: now shows toast.error to the user
      expect(toast.error).toHaveBeenCalledWith('Payment failed');

      consoleSpy.mockRestore();
    });
  });

  // ── Button text during loading ──────────────────────────────────────────
  describe('Loading State', () => {
    test("should show 'Processing ....' while payment is in progress", async () => {
      // Make the post never resolve (stays pending)
      let resolvePost;
      axios.post.mockReturnValue(
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
      );

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('mock-dropin')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /make payment/i }));

      await waitFor(() => {
        expect(screen.getByText('Processing ....')).toBeInTheDocument();
      });

      // Resolve to clean up
      resolvePost({ data: { ok: true } });
    });
  });

  // ── Total price display ─────────────────────────────────────────────────
  describe('Total Price', () => {
    test('should display formatted total price', async () => {
      renderCartPage();

      // totalPrice() formats as USD currency
      await waitFor(() => {
        // $79.98 total for the two test items (29.99 + 49.99)
        expect(screen.getByText(/\$79\.98/)).toBeInTheDocument();
      });
    });

    test('should display $0.00 for empty cart', async () => {
      mockCart = [];
      const { useCart } = require('../context/cart');
      useCart.mockReturnValue([mockCart, mockSetCart]);

      renderCartPage();

      await waitFor(() => {
        expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
      });
    });
  });

  // ── Cart display ────────────────────────────────────────────────────────
  describe('Cart Items Display', () => {
    test('should display all cart items', async () => {
      renderCartPage();

      expect(screen.getByText('Widget')).toBeInTheDocument();
      expect(screen.getByText('Gadget')).toBeInTheDocument();
    });

    test('should display item prices', async () => {
      renderCartPage();

      expect(screen.getByText(/29\.99/)).toBeInTheDocument();
      expect(screen.getByText(/49\.99/)).toBeInTheDocument();
    });

    test('should truncate descriptions to 30 chars', async () => {
      renderCartPage();

      expect(screen.getByText('A fine widget for testing')).toBeInTheDocument();
    });

    test('should show remove button for each item', async () => {
      renderCartPage();

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(2);
    });

    test('should remove item from cart on Remove click', async () => {
      renderCartPage();

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]); // Remove first item

      expect(mockSetCart).toHaveBeenCalledWith([mockCart[1]]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('cart', JSON.stringify([mockCart[1]]));
    });
  });

  // ── Guest user / no auth ────────────────────────────────────────────────
  describe('Guest User', () => {
    beforeEach(() => {
      mockAuth = { user: null, token: '' };
      const { useAuth } = require('../context/auth');
      useAuth.mockReturnValue([mockAuth, mockSetAuth]);
    });

    test("should show 'Hello Guest' for unauthenticated user", async () => {
      renderCartPage();

      expect(screen.getByText('Hello Guest')).toBeInTheDocument();
    });

    test('should show login prompt when not authenticated', async () => {
      renderCartPage();

      expect(screen.getByRole('button', { name: /plase login to checkout/i })).toBeInTheDocument();
    });

    test('should navigate to login with cart as state on login button click', async () => {
      renderCartPage();

      fireEvent.click(screen.getByRole('button', { name: /plase login to checkout/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: '/cart',
      });
    });

    test('should NOT render DropIn for guest user', async () => {
      renderCartPage();

      expect(screen.queryByTestId('mock-dropin')).not.toBeInTheDocument();
    });
  });

  // ── User with no address ────────────────────────────────────────────────
  describe('User without address', () => {
    test('should show Update Address button when user has no address', async () => {
      mockAuth = {
        user: { _id: 'user1', name: 'Test User', address: '' },
        token: 'valid-token',
      };
      const { useAuth } = require('../context/auth');
      useAuth.mockReturnValue([mockAuth, mockSetAuth]);

      renderCartPage();

      await waitFor(() => {
        const updateBtns = screen.getAllByRole('button', {
          name: /update address/i,
        });
        expect(updateBtns.length).toBeGreaterThan(0);
      });
    });
  });

  // ── User greeting ──────────────────────────────────────────────────────
  describe('User Greeting', () => {
    test('should display logged-in user name', async () => {
      renderCartPage();

      expect(screen.getByText(/Hello\s+Test User/)).toBeInTheDocument();
    });

    test('should show item count', async () => {
      renderCartPage();

      expect(screen.getByText(/You Have 2 items/i)).toBeInTheDocument();
    });

    test('should show empty cart message when cart is empty', async () => {
      mockCart = [];
      const { useCart } = require('../context/cart');
      useCart.mockReturnValue([mockCart, mockSetCart]);

      renderCartPage();

      expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    });
  });
});
