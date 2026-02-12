import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { CartProvider, useCart } from './cart';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Test component that exposes cart state and setCart for assertions.
 */
const CartConsumer = ({ onRender }) => {
  const [cart, setCart] = useCart();
  onRender({ cart, setCart });
  return (
    <div>
      <span data-testid='cart-length'>{cart.length}</span>
      <span data-testid='cart-json'>{JSON.stringify(cart)}</span>
    </div>
  );
};

const renderWithProvider = (onRender = jest.fn()) => {
  return render(
    <CartProvider>
      <CartConsumer onRender={onRender} />
    </CartProvider>,
  );
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('CartProvider – Unit Tests', () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = (() => {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] ?? null),
        setItem: jest.fn((key, val) => {
          store[key] = val;
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
        _store: store,
      };
    })();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. INITIAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial state', () => {
    it('initializes with an empty cart array', () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      expect(screen.getByTestId('cart-length').textContent).toBe('0');
      expect(screen.getByTestId('cart-json').textContent).toBe('[]');
    });

    it('provides a setCart function', () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];
      expect(typeof setCart).toBe('function');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. LOCALSTORAGE HYDRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('localStorage hydration', () => {
    it('loads cart from localStorage on mount', async () => {
      const savedCart = [
        { _id: 'p1', name: 'Item 1', price: 10 },
        { _id: 'p2', name: 'Item 2', price: 20 },
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      const onRender = jest.fn();
      renderWithProvider(onRender);

      // After useEffect runs
      await screen.findByText('2'); // cart-length should be "2"
      expect(localStorageMock.getItem).toHaveBeenCalledWith('cart');
    });

    it('keeps empty cart when localStorage has no cart key', () => {
      localStorageMock.getItem.mockReturnValue(null);

      renderWithProvider();

      expect(screen.getByTestId('cart-length').textContent).toBe('0');
    });

    it('keeps empty cart when localStorage returns empty string', () => {
      // Empty string is falsy → should not attempt JSON.parse
      localStorageMock.getItem.mockReturnValue('');

      renderWithProvider();

      expect(screen.getByTestId('cart-length').textContent).toBe('0');
    });

    it('loads a single-item cart from localStorage', async () => {
      const savedCart = [{ _id: 'p1', name: 'Solo', price: 5 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      renderWithProvider();

      await screen.findByText('1');
      expect(screen.getByTestId('cart-json').textContent).toContain('Solo');
    });

    /**
     * FIXED: If localStorage contains invalid JSON, the try-catch now
     * catches the parse error, logs it, and removes the bad entry.
     */
    it('handles malformed JSON in localStorage gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorageMock.getItem.mockReturnValue('not-valid-json{{{');

      // Should NOT throw
      renderWithProvider();

      // Cart stays empty
      expect(screen.getByTestId('cart-length').textContent).toBe('0');
      // Bad entry removed from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cart');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SETCART MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('setCart mutations', () => {
    it('updates cart state when setCart is called', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([{ _id: 'p1', name: 'New Item', price: 15 }]);
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('1');
      expect(screen.getByTestId('cart-json').textContent).toContain('New Item');
    });

    it('allows setting cart to empty array', async () => {
      const savedCart = [{ _id: 'p1', name: 'Item', price: 10 }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));

      const onRender = jest.fn();
      renderWithProvider(onRender);

      await screen.findByText('1');

      // Get latest setCart
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1][0];

      await act(async () => {
        lastCall.setCart([]);
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('0');
    });

    it('allows adding multiple items via setCart', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([
          { _id: 'a', name: 'A', price: 1 },
          { _id: 'b', name: 'B', price: 2 },
          { _id: 'c', name: 'C', price: 3 },
        ]);
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('3');
    });

    /**
     * NOTE: CartProvider does NOT persist to localStorage on setCart.
     * Persistence is the caller's responsibility (e.g., CartPage calls
     * localStorage.setItem manually). This is a design observation, not a bug,
     * but it means setCart alone won't survive a page refresh.
     */
    it('does NOT auto-persist to localStorage when setCart is called', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([{ _id: 'x', name: 'Temp', price: 99 }]);
      });

      // localStorage.setItem should NOT have been called by the provider
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CONTEXT SHARING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Context sharing between components', () => {
    it('shares the same cart state across multiple consumers', async () => {
      const onRender1 = jest.fn();
      const onRender2 = jest.fn();

      const Consumer1 = () => {
        const [cart, setCart] = useCart();
        onRender1({ cart, setCart });
        return <span data-testid='c1'>{cart.length}</span>;
      };

      const Consumer2 = () => {
        const [cart] = useCart();
        onRender2({ cart });
        return <span data-testid='c2'>{cart.length}</span>;
      };

      render(
        <CartProvider>
          <Consumer1 />
          <Consumer2 />
        </CartProvider>,
      );

      expect(screen.getByTestId('c1').textContent).toBe('0');
      expect(screen.getByTestId('c2').textContent).toBe('0');

      // Update from consumer 1
      const { setCart } = onRender1.mock.calls[0][0];
      await act(async () => {
        setCart([{ _id: 'shared', name: 'Shared', price: 10 }]);
      });

      // Both consumers should see the update
      expect(screen.getByTestId('c1').textContent).toBe('1');
      expect(screen.getByTestId('c2').textContent).toBe('1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('handles cart with items that have zero price', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([{ _id: 'free', name: 'Free Item', price: 0 }]);
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('1');
    });

    it('handles cart with duplicate product IDs', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([
          { _id: 'dup', name: 'Same Item', price: 10 },
          { _id: 'dup', name: 'Same Item', price: 10 },
        ]);
      });

      // Context allows duplicates — no dedup logic
      expect(screen.getByTestId('cart-length').textContent).toBe('2');
    });

    it('handles large cart (100 items)', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];
      const largeCart = Array.from({ length: 100 }, (_, i) => ({
        _id: `p${i}`,
        name: `Product ${i}`,
        price: i + 1,
      }));

      await act(async () => {
        setCart(largeCart);
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('100');
    });

    it('handles cart items with missing fields gracefully', async () => {
      const onRender = jest.fn();
      renderWithProvider(onRender);

      const { setCart } = onRender.mock.calls[0][0];

      await act(async () => {
        setCart([{ _id: 'partial' }]); // no name, no price
      });

      expect(screen.getByTestId('cart-length').textContent).toBe('1');
    });
  });
});
