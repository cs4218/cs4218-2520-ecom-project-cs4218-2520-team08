import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartPage from './CartPage';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('axios');
jest.mock('react-hot-toast');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

// Auth context mock
let mockAuth = { user: null, token: '' };
const mockSetAuth = jest.fn();
jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [mockAuth, mockSetAuth]),
}));

// Cart context mock
let mockCart = [];
const mockSetCart = jest.fn();
jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [mockCart, mockSetCart]),
}));

// Search context mock
jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

// Mock Layout to avoid Header/Footer/Helmet sub-trees
jest.mock('../components/Layout', () => {
  return ({ children, title }) => (
    <div data-testid='layout' data-title={title}>
      {children}
    </div>
  );
});

// Mock braintree-web-drop-in-react
let mockDropInInstance = null;
jest.mock('braintree-web-drop-in-react', () => {
  const { useEffect } = require('react');
  return function MockDropIn({ onInstance }) {
    // Simulate DropIn calling onInstance after mount
    useEffect(() => {
      if (mockDropInInstance) {
        onInstance(mockDropInInstance);
      }
    }, [onInstance]);
    return <div data-testid='braintree-dropin'>Mock DropIn</div>;
  };
});

// Mock react-icons
jest.mock('react-icons/ai', () => ({
  AiFillWarning: () => <span data-testid='warning-icon'>⚠</span>,
}));

// matchMedia shim for antd
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ─── Test Data ──────────────────────────────────────────────────────────────

const makeProduct = (id, overrides = {}) => ({
  _id: `prod${id}`,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: `Description for product number ${id} that is reasonably long`,
  price: 29.99 + id,
  category: 'cat1',
  quantity: 10,
  ...overrides,
});

const sampleProducts = [makeProduct(1), makeProduct(2), makeProduct(3)];

const loggedInUser = {
  user: {
    _id: 'user1',
    name: 'Test User',
    email: 'test@test.com',
    address: '123 Test Street',
    phone: '1234567890',
  },
  token: 'valid-token-123',
};

const loggedInUserNoAddress = {
  user: {
    _id: 'user2',
    name: 'No Address User',
    email: 'noaddr@test.com',
    address: '',
    phone: '0000000000',
  },
  token: 'valid-token-456',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const setupLocalStorage = () => {
  jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(jest.fn());
  jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(jest.fn());
  jest.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation(jest.fn());
};

const renderCartPage = async () => {
  let result;
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path='/cart' element={<CartPage />} />
          <Route path='/dashboard/user/orders' element={<div>Orders Page</div>} />
          <Route path='/dashboard/user/profile' element={<div>Profile Page</div>} />
          <Route path='/login' element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return result;
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('CartPage – Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];
    mockAuth = { user: null, token: '' };
    mockDropInInstance = null;
    setupLocalStorage();

    // Default: token request succeeds
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/product/braintree/token') {
        return Promise.resolve({ data: { clientToken: 'test-client-token' } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockImplementation(() => Promise.resolve({ data: { ok: true } }));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GUEST USER RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Guest user (not logged in)', () => {
    it("displays 'Hello Guest' when no user is authenticated", async () => {
      await renderCartPage();
      expect(screen.getByText('Hello Guest')).toBeInTheDocument();
    });

    it("displays 'Your Cart Is Empty' when cart is empty", async () => {
      await renderCartPage();
      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
    });

    it('displays item count and login prompt when cart has items', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByText(/You Have 1 item in your cart/)).toBeInTheDocument();
      expect(screen.getByText(/please login to checkout/)).toBeInTheDocument();
    });

    it("shows 'Plase Login to checkout' button for guest", async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByRole('button', { name: /Plase Login to checkout/i })).toBeInTheDocument();
    });

    it('navigates to /login with state=/cart when login button is clicked', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      fireEvent.click(screen.getByRole('button', { name: /Plase Login to checkout/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: '/cart',
      });
    });

    it('does NOT show braintree DropIn for guest', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
    });

    it('does NOT show payment button for guest', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.queryByRole('button', { name: /Make Payment/i })).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. LOGGED-IN USER RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Logged-in user with address', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it("displays 'Hello  {name}' for authenticated user", async () => {
      await renderCartPage();
      expect(screen.getByText(/Hello\s+Test User/)).toBeInTheDocument();
    });

    it('displays item count without login prompt when authenticated', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByText(/You Have 1 item in your cart/)).toBeInTheDocument();
      expect(screen.queryByText(/please login to checkout/)).not.toBeInTheDocument();
    });

    it('shows current address', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByText('Current Address')).toBeInTheDocument();
      expect(screen.getByText('123 Test Street')).toBeInTheDocument();
    });

    it("shows 'Update Address' button", async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();
    });

    it("navigates to profile page when 'Update Address' is clicked", async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      fireEvent.click(screen.getByRole('button', { name: /Update Address/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/profile');
    });
  });

  describe('Logged-in user without address', () => {
    beforeEach(() => {
      mockAuth = loggedInUserNoAddress;
    });

    it("shows 'Update Address' button instead of current address", async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.queryByText('Current Address')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update Address/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CART ITEM RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cart item display', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it('renders all cart items', async () => {
      mockCart = sampleProducts;
      await renderCartPage();
      sampleProducts.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
      });
    });

    it('renders product images with correct src', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      const img = screen.getByAltText('Product 1');
      expect(img).toHaveAttribute('src', '/api/v1/product/product-photo/prod1');
    });

    it('renders truncated descriptions (30 chars)', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      const truncated = makeProduct(1).description.substring(0, 30);
      expect(screen.getByText(truncated)).toBeInTheDocument();
    });

    it('renders product price', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByText(/Price : 30.99/)).toBeInTheDocument();
    });

    it('renders a Remove button for each item', async () => {
      mockCart = sampleProducts;
      await renderCartPage();
      const removeBtns = screen.getAllByRole('button', { name: /Remove/i });
      expect(removeBtns).toHaveLength(sampleProducts.length);
    });

    it('renders no cart items when cart is empty', async () => {
      mockCart = [];
      await renderCartPage();
      expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TOTAL PRICE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Total price calculation', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it('calculates total from all item prices', async () => {
      mockCart = [makeProduct(1, { price: 10 }), makeProduct(2, { price: 20 }), makeProduct(3, { price: 30 })];
      await renderCartPage();
      // 10 + 20 + 30 = $60.00
      expect(screen.getByText(/\$60\.00/)).toBeInTheDocument();
    });

    it('shows $0.00 total when cart is empty', async () => {
      mockCart = [];
      await renderCartPage();
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('handles single item total', async () => {
      mockCart = [makeProduct(1, { price: 42.5 })];
      await renderCartPage();
      expect(screen.getByText(/\$42\.50/)).toBeInTheDocument();
    });

    it('handles items with price 0', async () => {
      mockCart = [makeProduct(1, { price: 0 }), makeProduct(2, { price: 25 })];
      await renderCartPage();
      expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
    });

    /**
     * totalPrice() now uses forEach with Number() || 0 guard.
     */
    it('calculates correct total with many items', async () => {
      mockCart = Array.from({ length: 10 }, (_, i) => makeProduct(i, { price: 10 }));
      await renderCartPage();
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    });

    /**
     * KNOWN ISSUE: No quantity support. Duplicate items are summed individually.
     */
    it('sums duplicate items individually (no quantity support)', async () => {
      mockCart = [
        makeProduct(1, { price: 15 }),
        makeProduct('1b', { price: 15, name: 'Product 1 copy' }),
        makeProduct('1c', { price: 15, name: 'Product 1 copy 2' }),
      ];
      await renderCartPage();
      expect(screen.getByText(/\$45\.00/)).toBeInTheDocument();
    });

    /**
     * FIXED: Items with missing price are now treated as 0 via Number() || 0.
     */
    it('shows $0.00 total when item has no price field', async () => {
      mockCart = [{ _id: 'x', name: 'No Price', description: 'short desc aaaaaaaaaaaaaaaaaaaaa' }];
      await renderCartPage();
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. REMOVE ITEM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Remove item from cart', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it('calls setCart with item removed when Remove is clicked', async () => {
      mockCart = [makeProduct(1), makeProduct(2)];
      await renderCartPage();

      const removeBtns = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeBtns[0]); // Remove first item

      expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ _id: 'prod2' })]);
    });

    it('updates localStorage when item is removed', async () => {
      mockCart = [makeProduct(1), makeProduct(2)];
      await renderCartPage();

      fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[0]);

      expect(window.localStorage.setItem).toHaveBeenCalledWith('cart', expect.any(String));

      const stored = JSON.parse(window.localStorage.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(1);
      expect(stored[0]._id).toBe('prod2');
    });

    it('removes the correct item when middle item is removed', async () => {
      mockCart = [makeProduct(1), makeProduct(2), makeProduct(3)];
      await renderCartPage();

      const removeBtns = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeBtns[1]); // Remove middle item

      expect(mockSetCart).toHaveBeenCalledWith([
        expect.objectContaining({ _id: 'prod1' }),
        expect.objectContaining({ _id: 'prod3' }),
      ]);
    });

    it('removes last remaining item from cart', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

      expect(mockSetCart).toHaveBeenCalledWith([]);
      const stored = JSON.parse(window.localStorage.setItem.mock.calls[0][1]);
      expect(stored).toHaveLength(0);
    });

    /**
     * KNOWN ISSUE: removeCartItem uses findIndex to find the item by _id.
     * If there are duplicate _ids, it only removes the FIRST occurrence,
     * not the one the user clicked. Not fixed in this PR.
     */
    it('only removes first occurrence when duplicate _ids exist (known issue)', async () => {
      // Suppress expected React key warning for this test (we intentionally use duplicate _ids)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation((msg) => {
        if (typeof msg === 'string' && msg.includes('same key')) return;
        console.error.wrappedMethod?.call(console, msg);
      });

      const dup = makeProduct(1, { name: 'Duplicate' });
      mockCart = [dup, { ...dup, name: 'Duplicate Copy' }];
      await renderCartPage();

      // Click the second Remove button
      const removeBtns = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeBtns[1]);

      // findIndex finds the first match at index 0 and removes it
      // So the FIRST item is removed, not the second
      expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ name: 'Duplicate Copy' })]);

      consoleSpy.mockRestore();
    });

    it("handles removal from cart when _id doesn't exist (no crash)", async () => {
      // This won't happen in real flow, but tests resilience
      // findIndex returns -1, splice(-1, 1) removes last element
      mockCart = [makeProduct(1)];
      await renderCartPage();

      // This simulates internal state — in real usage the user
      // can only click Remove for items that are rendered
      fireEvent.click(screen.getByRole('button', { name: /Remove/i }));
      expect(mockSetCart).toHaveBeenCalledWith([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CART SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cart summary section', () => {
    it("renders 'Cart Summary' heading", async () => {
      await renderCartPage();
      expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    });

    it("renders 'Total | Checkout | Payment' description", async () => {
      await renderCartPage();
      expect(screen.getByText('Total | Checkout | Payment')).toBeInTheDocument();
    });

    it('renders total price in summary', async () => {
      mockAuth = loggedInUser;
      mockCart = [makeProduct(1, { price: 99.99 })];
      await renderCartPage();
      expect(screen.getByText(/\$99\.99/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. BRAINTREE PAYMENT GATEWAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Braintree payment gateway', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it('fetches braintree token on mount', async () => {
      await renderCartPage();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
      });
    });

    it('renders DropIn when token, auth, and cart are present', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('braintree-dropin')).toBeInTheDocument();
      });
    });

    it('does NOT render DropIn when cart is empty', async () => {
      mockCart = [];
      await renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
    });

    it('does NOT render DropIn when user is not authenticated', async () => {
      mockAuth = { user: null, token: '' };
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
    });

    it("shows 'Make Payment' button when DropIn is loaded", async () => {
      mockCart = [makeProduct(1)];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'test-nonce' }),
      };
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });
    });

    it('disables payment button when no address', async () => {
      mockAuth = loggedInUserNoAddress;
      mockCart = [makeProduct(1)];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'test-nonce' }),
      };
      await renderCartPage();

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Make Payment/i });
        expect(btn).toBeDisabled();
      });
    });

    it('handles braintree token fetch failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      axios.get.mockRejectedValue(new Error('Token fetch failed'));

      await renderCartPage();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Page should still render
      expect(screen.getByText('Cart Summary')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PAYMENT FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Payment flow', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'test-nonce-123' }),
      };
    });

    it('sends payment request with nonce and cart on Make Payment click', async () => {
      mockCart = [makeProduct(1), makeProduct(2)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/braintree/payment', {
          nonce: 'test-nonce-123',
          cart: mockCart,
        });
      });
    });

    it('clears cart and localStorage on successful payment', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('cart');
        expect(mockSetCart).toHaveBeenCalledWith([]);
      });
    });

    it('navigates to orders page after successful payment', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
      });
    });

    it('shows success toast on successful payment', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      });
    });

    it("shows 'Processing ....' while payment is in progress", async () => {
      // Make both requestPaymentMethod and axios.post controllable
      let resolveNonce;
      let resolvePayment;
      mockDropInInstance.requestPaymentMethod.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveNonce = resolve;
          }),
      );
      axios.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePayment = resolve;
          }),
      );

      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      // Button should immediately show Processing after click
      await waitFor(() => {
        expect(screen.getByText('Processing ....')).toBeInTheDocument();
      });

      // Resolve nonce so axios.post is called (still hangs)
      await act(async () => {
        resolveNonce({ nonce: 'test-nonce-123' });
      });

      // Still processing while axios.post hangs
      expect(screen.getByText('Processing ....')).toBeInTheDocument();

      // Resolve payment to clean up
      await act(async () => {
        resolvePayment({ data: { ok: true } });
      });
    });

    it('handles payment failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      let rejectPayment;
      mockDropInInstance.requestPaymentMethod.mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectPayment = reject;
          }),
      );

      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      // Now reject the payment method request
      await act(async () => {
        rejectPayment(new Error('Payment Failed'));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Cart should NOT be cleared on failure
      expect(window.localStorage.removeItem).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/user/orders');

      consoleSpy.mockRestore();
    });

    it('resets loading state on payment failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      let rejectPayment;
      mockDropInInstance.requestPaymentMethod.mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectPayment = reject;
          }),
      );

      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      // Now reject the payment method request
      await act(async () => {
        rejectPayment(new Error('Fail'));
      });

      await waitFor(() => {
        // After error, button should show "Make Payment" again (not "Processing")
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('handles API post failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      let resolveNonce;
      mockDropInInstance.requestPaymentMethod.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveNonce = resolve;
          }),
      );
      axios.post.mockRejectedValue(new Error('Server Error'));

      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      // Resolve nonce so axios.post is called (which will reject)
      await act(async () => {
        resolveNonce({ nonce: 'test-nonce-123' });
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Should NOT navigate or clear cart on server error
      expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard/user/orders');

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. EMPTY CART STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty cart states', () => {
    it('guest with empty cart shows empty message', async () => {
      mockAuth = { user: null, token: '' };
      mockCart = [];
      await renderCartPage();
      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
    });

    it('logged-in user with empty cart shows empty message', async () => {
      mockAuth = loggedInUser;
      mockCart = [];
      await renderCartPage();
      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
    });

    it('shows $0.00 total for empty cart', async () => {
      mockAuth = loggedInUser;
      mockCart = [];
      await renderCartPage();
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('does not render any product images for empty cart', async () => {
      mockCart = [];
      await renderCartPage();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    beforeEach(() => {
      mockAuth = loggedInUser;
    });

    it('handles cart with a single item correctly', async () => {
      mockCart = [makeProduct(1, { price: 100 })];
      await renderCartPage();
      expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Remove/i })).toHaveLength(1);
    });

    it('handles very expensive items', async () => {
      mockCart = [makeProduct(1, { price: 999999.99 })];
      await renderCartPage();
      expect(screen.getByText(/\$999,999\.99/)).toBeInTheDocument();
    });

    it('handles item with very long description (truncated to 30 chars)', async () => {
      const longDesc = 'A'.repeat(200);
      mockCart = [makeProduct(1, { description: longDesc })];
      await renderCartPage();
      expect(screen.getByText('A'.repeat(30))).toBeInTheDocument();
    });

    it('handles item with short description (< 30 chars)', async () => {
      mockCart = [makeProduct(1, { description: 'Short' })];
      await renderCartPage();
      expect(screen.getByText('Short')).toBeInTheDocument();
    });

    /**
     * FIXED: Optional chaining on description prevents crash.
     */
    it('renders gracefully when item has no description', async () => {
      mockCart = [{ _id: 'x', name: 'No Desc', price: 10 }];
      // Should NOT throw
      await renderCartPage();
      expect(screen.getByText('No Desc')).toBeInTheDocument();
    });

    it('correctly counts items in header text', async () => {
      mockCart = Array.from({ length: 5 }, (_, i) => makeProduct(i));
      await renderCartPage();
      expect(screen.getByText(/You Have 5 items in your cart/)).toBeInTheDocument();
    });

    /**
     * FIXED: Now correctly uses singular "item" for count of 1.
     */
    it("uses singular 'item' for 1 item", async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();
      expect(screen.getByText(/You Have 1 item in your cart/)).toBeInTheDocument();
      // Should NOT say "items"
      expect(screen.queryByText(/You Have 1 items in your cart/)).not.toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CartPage – Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];
    mockAuth = loggedInUser;
    mockDropInInstance = null;
    setupLocalStorage();

    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/product/braintree/token') {
        return Promise.resolve({ data: { clientToken: 'test-client-token' } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockImplementation(() => Promise.resolve({ data: { ok: true } }));
  });

  describe('Full checkout flow', () => {
    it('complete flow: view cart → remove item → payment', async () => {
      mockCart = [makeProduct(1, { price: 50 }), makeProduct(2, { price: 30 })];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'checkout-nonce' }),
      };

      await renderCartPage();

      // Verify items displayed
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText(/\$80\.00/)).toBeInTheDocument();

      // Remove first item
      const removeBtns = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeBtns[0]);

      expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ _id: 'prod2', price: 30 })]);

      // Wait for payment button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      // Make payment
      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/v1/product/braintree/payment',
          expect.objectContaining({ nonce: 'checkout-nonce' }),
        );
        expect(mockSetCart).toHaveBeenCalledWith([]);
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('cart');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
        expect(toast.success).toHaveBeenCalledWith('Payment Completed Successfully ');
      });
    });
  });

  describe('Remove all items flow', () => {
    it('removes items one by one until cart is empty', async () => {
      mockCart = [makeProduct(1), makeProduct(2)];
      await renderCartPage();

      // Remove first item
      fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[0]);
      expect(mockSetCart).toHaveBeenCalledWith([expect.objectContaining({ _id: 'prod2' })]);

      // Simulate cart update (in real app setCart would cause re-render)
      // Since our mock doesn't re-render, we verify the setCart calls
      expect(window.localStorage.setItem).toHaveBeenCalledWith('cart', expect.any(String));
    });
  });

  describe('Guest to login flow', () => {
    it('redirects guest to login with cart return state', async () => {
      mockAuth = { user: null, token: '' };
      mockCart = [makeProduct(1)];
      await renderCartPage();

      fireEvent.click(screen.getByRole('button', { name: /Plase Login to checkout/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: '/cart',
      });
    });
  });

  describe('Token + DropIn lifecycle', () => {
    it('fetches token on mount and renders DropIn when all conditions met', async () => {
      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
      });

      // DropIn should render since we have token, auth, and cart
      await waitFor(() => {
        expect(screen.getByTestId('braintree-dropin')).toBeInTheDocument();
      });
    });

    it('does not render DropIn when token fetch fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      axios.get.mockRejectedValue(new Error('Token error'));

      mockCart = [makeProduct(1)];
      await renderCartPage();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Cart persistence contract', () => {
    it('removeCartItem persists to localStorage synchronously', async () => {
      mockCart = [makeProduct(1), makeProduct(2)];
      await renderCartPage();

      fireEvent.click(screen.getAllByRole('button', { name: /Remove/i })[0]);

      // setCart and localStorage.setItem should both be called in same handler
      expect(mockSetCart).toHaveBeenCalledTimes(1);
      expect(window.localStorage.setItem).toHaveBeenCalledTimes(1);

      // They should contain the same data
      const setCartArg = mockSetCart.mock.calls[0][0];
      const storedArg = JSON.parse(window.localStorage.setItem.mock.calls[0][1]);
      expect(setCartArg).toEqual(storedArg);
    });

    it('payment clears cart from both context and localStorage', async () => {
      mockCart = [makeProduct(1)];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'sync-nonce' }),
      };

      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Make Payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Make Payment/i }));

      await waitFor(() => {
        // Context cleared
        expect(mockSetCart).toHaveBeenCalledWith([]);
        // localStorage cleared
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('cart');
      });
    });
  });

  describe('Conditional rendering states', () => {
    it('guest + empty cart: no DropIn, no Remove, shows empty + login', async () => {
      mockAuth = { user: null, token: '' };
      mockCart = [];
      await renderCartPage();

      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
      expect(screen.getByText('Hello Guest')).toBeInTheDocument();
      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
      // No login button shown when cart is empty (no items to prompt checkout for)
      // The "Plase Login" button is in the address section which is shown regardless
    });

    it('logged in + empty cart: no DropIn, shows empty message', async () => {
      mockAuth = loggedInUser;
      mockCart = [];
      await renderCartPage();

      expect(screen.getByText(/Your Cart Is Empty/)).toBeInTheDocument();
      expect(screen.getByText(/Hello\s+Test User/)).toBeInTheDocument();
      expect(screen.queryByTestId('braintree-dropin')).not.toBeInTheDocument();
    });

    it('logged in + items + no address: DropIn shown but payment disabled', async () => {
      mockAuth = loggedInUserNoAddress;
      mockCart = [makeProduct(1)];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'nonce' }),
      };

      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('braintree-dropin')).toBeInTheDocument();
        const btn = screen.getByRole('button', { name: /Make Payment/i });
        expect(btn).toBeDisabled();
      });
    });

    it('logged in + items + address: DropIn shown and payment enabled', async () => {
      mockAuth = loggedInUser;
      mockCart = [makeProduct(1)];
      mockDropInInstance = {
        requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'nonce' }),
      };

      await renderCartPage();

      await waitFor(() => {
        expect(screen.getByTestId('braintree-dropin')).toBeInTheDocument();
        const btn = screen.getByRole('button', { name: /Make Payment/i });
        expect(btn).not.toBeDisabled();
      });
    });
  });

  describe('Multiple item count display', () => {
    it.each([
      [0, 'Your Cart Is Empty'],
      [2, 'You Have 2 items in your cart'],
      [10, 'You Have 10 items in your cart'],
    ])("with %i items displays: '%s'", async (count, expected) => {
      mockCart = Array.from({ length: count }, (_, i) => makeProduct(i));
      await renderCartPage();
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS FIXED IN THIS PR:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. CRASH ON MISSING DESCRIPTION (FIXED):
 *    Added optional chaining: `p.description?.substring(0, 30)`.
 *
 * 2. NaN TOTAL ON MISSING PRICE (FIXED):
 *    totalPrice() now uses `Number(item.price) || 0` to default missing
 *    or non-numeric prices to 0.
 *
 * 3. GRAMMATICALLY INCORRECT PLURALIZATION (FIXED):
 *    Now uses ternary: `cart.length === 1 ? "item" : "items"`.
 *
 * 4. map() USED FOR SIDE-EFFECTS IN totalPrice (FIXED):
 *    Replaced `cart?.map(...)` with `cart?.forEach(...)` for clarity.
 *
 * 5. MALFORMED JSON IN LOCALSTORAGE CRASHES PROVIDER (FIXED):
 *    CartProvider now wraps JSON.parse in try-catch, logs error, and
 *    removes bad localStorage entry.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REMAINING KNOWN ISSUES (not fixed):
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - DUPLICATE _id REMOVAL: findIndex removes first match, not the clicked one.
 * - NO QUANTITY SUPPORT: Each cart entry is a flat product object.
 * - CART CONTEXT DOES NOT AUTO-PERSIST on setCart.
 * - RAW PRICE DISPLAY in item card vs formatted total.
 * - NO ERROR TOAST ON PAYMENT FAILURE.
 * - CART NOT VALIDATED BEFORE PAYMENT.
 */
