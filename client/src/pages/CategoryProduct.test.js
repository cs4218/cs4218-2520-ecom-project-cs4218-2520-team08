/**
 * Unit + Integration Tests for CategoryProduct page
 *
 * Tests the page that shows products for a specific category,
 * fetched by slug from /api/v1/product/product-category/:slug.
 *
 * BUGS FIXED (documented here for reference):
 * ─────────────────────────────────────────────
 * 1. CRASH ON MISSING DESCRIPTION → added null guard: (p.description || "")
 * 2. CRASH ON MISSING PRICE → added null guard: (p.price || 0)
 * 3. SINGULAR/PLURAL "result found" → now pluralizes for counts !== 1
 * 4. category INITIALIZED AS ARRAY [] → should be {} (object)
 * 5. TYPO IN FUNCTION NAME → getPrductsByCat → getProductsByCat
 *
 * REMAINING KNOWN ISSUES:
 * ─────────────────────────────────────────────
 * - No server-side price validation (client-supplied prices trusted)
 * - No dedup/cancellation on rapid slug changes
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CategoryProduct from './CategoryProduct';

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

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: null, token: '' }, jest.fn()]),
}));

const mockSetCart = jest.fn();
jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], mockSetCart]),
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

jest.mock('../components/Layout', () => {
  return ({ children, title }) => (
    <div data-testid='layout' data-title={title}>
      {children}
    </div>
  );
});

jest.mock('../styles/CategoryProductStyles.css', () => ({}));

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

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────────────────

const makeProduct = (id, overrides = {}) => ({
  _id: `prod${id}`,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: `A description for product ${id} that is long enough to be truncated at sixty chars`,
  price: 29.99 + id,
  category: 'cat1',
  ...overrides,
});

const sampleCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
const sampleProducts = [makeProduct(1), makeProduct(2), makeProduct(3)];

// 8 products to test pagination (> 6)
const manyProducts = Array.from({ length: 8 }, (_, i) => makeProduct(i + 1));

// ─── Helpers ────────────────────────────────────────────────────────────────

const renderCategoryProduct = (slug = 'electronics') =>
  render(
    <MemoryRouter initialEntries={[`/category/${slug}`]}>
      <Routes>
        <Route path='/category/:slug' element={<CategoryProduct />} />
        <Route path='/product/:slug' element={<div>Product Detail</div>} />
      </Routes>
    </MemoryRouter>,
  );

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('CategoryProduct – Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: sampleCategory,
        products: sampleProducts,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Data fetching', () => {
    it('fetches products by category slug on mount', async () => {
      renderCategoryProduct('electronics');

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
      });
    });

    it('fetches only once on mount', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('does not fetch when slug is undefined', () => {
      render(
        <MemoryRouter initialEntries={['/category/']}>
          <Routes>
            <Route path='/category/' element={<CategoryProduct />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it('displays category name in heading', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(/Category - Electronics/)).toBeInTheDocument();
      });
    });

    it('displays correct result count with plural "results"', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(/3 results found/)).toBeInTheDocument();
      });
    });

    it('renders all product cards', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        sampleProducts.forEach((p) => {
          expect(screen.getByText(p.name)).toBeInTheDocument();
        });
      });
    });

    it('renders product images with correct src and alt', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        const img = screen.getByAltText('Product 1');
        expect(img).toHaveAttribute('src', '/api/v1/product/product-photo/prod1');
      });
    });

    it("renders truncated descriptions (60 chars + '...')", async () => {
      renderCategoryProduct();

      await waitFor(() => {
        const desc = sampleProducts[0].description.substring(0, 60);
        expect(screen.getByText(`${desc}...`)).toBeInTheDocument();
      });
    });

    it('renders formatted prices in USD', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        // makeProduct(1) → 29.99 + 1 = $30.99
        expect(screen.getByText('$30.99')).toBeInTheDocument();
      });
    });

    it("renders 'More Details' and 'ADD TO CART' buttons for each product", async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /More Details/i })).toHaveLength(sampleProducts.length);
        expect(screen.getAllByRole('button', { name: /ADD TO CART/i })).toHaveLength(sampleProducts.length);
      });
    });

    it("shows 'Category - ' before data loads (heading visible immediately)", () => {
      axios.get.mockReturnValue(new Promise(() => {})); // never resolves
      renderCategoryProduct();

      expect(screen.getByText(/Category -/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Navigation', () => {
    it("navigates to product detail when 'More Details' is clicked", async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button', { name: /More Details/i });
      fireEvent.click(buttons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/product/product-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ADD TO CART
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Add to Cart', () => {
    it('clicking ADD TO CART calls setCart, localStorage.setItem, and toast.success', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByRole('button', { name: /ADD TO CART/i });
      fireEvent.click(addToCartButtons[0]);

      expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[0]]);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'cart',
        JSON.stringify([sampleProducts[0]]),
      );
      expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    it('adds the correct product when second ADD TO CART is clicked', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });

      const addToCartButtons = screen.getAllByRole('button', { name: /ADD TO CART/i });
      fireEvent.click(addToCartButtons[1]);

      expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[1]]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PAGINATION (Load more)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pagination (Load more)', () => {
    it('does NOT show Load more button when products <= 6', async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
    });

    it('shows Load more button when products > 6', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: sampleCategory, products: manyProducts },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
      });
    });

    it('initially shows only 6 products when there are more than 6', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: sampleCategory, products: manyProducts },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 6')).toBeInTheDocument();
      });

      expect(screen.queryByText('Product 7')).not.toBeInTheDocument();
    });

    it('clicking Load more reveals additional products', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: sampleCategory, products: manyProducts },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Load more/i }));

      await waitFor(() => {
        expect(screen.getByText('Product 7')).toBeInTheDocument();
        expect(screen.getByText('Product 8')).toBeInTheDocument();
      });
    });

    it('hides Load more button after all products are revealed', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: sampleCategory, products: manyProducts },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Load more/i }));

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
      });
    });

    it('shows "Loading ..." label while a refetch is in progress', async () => {
      let resolveSecondRequest;
      const secondRequestPromise = new Promise((resolve) => {
        resolveSecondRequest = resolve;
      });

      axios.get
        .mockResolvedValueOnce({
          data: { success: true, category: sampleCategory, products: manyProducts },
        })
        .mockImplementationOnce(() => secondRequestPromise);

      const { rerender } = renderCategoryProduct('electronics');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
      });

      // Trigger refetch via slug change
      rerender(
        <MemoryRouter initialEntries={['/category/electronics-new']}>
          <Routes>
            <Route path='/category/:slug' element={<CategoryProduct />} />
          </Routes>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('Loading ...')).toBeInTheDocument();
      });

      // Resolve to clean up
      resolveSecondRequest({
        data: { success: true, category: sampleCategory, products: manyProducts },
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Load more/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EMPTY & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty and error states', () => {
    it("shows '0 results found' when category has no products", async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: sampleCategory, products: [] },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(/0 results found/)).toBeInTheDocument();
      });
    });

    it('handles API failure gracefully without crashing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValue(new Error('Server down'));

      renderCategoryProduct();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.getByTestId('layout')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it('does not show product cards on API failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValue(new Error('Server down'));

      renderCategoryProduct();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.queryByRole('button', { name: /More Details/i })).not.toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PLURALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pluralization of result count', () => {
    it.each([
      [0, '0 results found'],
      [1, '1 result found'],
      [2, '2 results found'],
      [10, '10 results found'],
    ])('with %i products shows "%s"', async (count, expected) => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: Array.from({ length: count }, (_, i) => makeProduct(i + 1)),
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. EDGE CASES (null guards)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    /**
     * FIXED: Optional chaining / null guard on description prevents crash.
     */
    it('renders safely when product has no description (shows "...")', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [{ _id: 'p1', name: 'No Desc', price: 10, slug: 'no-desc' }],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('No Desc')).toBeInTheDocument();
      });

      expect(screen.getByText('...')).toBeInTheDocument();
    });

    /**
     * FIXED: Null guard on price falls back to 0.
     */
    it('renders safely when product has no price (shows $0.00)', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [{ _id: 'p1', name: 'No Price', description: 'A description long enough here', slug: 'no-price' }],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('No Price')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();
      });
    });

    it('truncates long descriptions to 60 chars', async () => {
      const longDesc = 'X'.repeat(200);
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [makeProduct(1, { description: longDesc })],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('X'.repeat(60) + '...')).toBeInTheDocument();
      });
    });

    it('shows full description + "..." when description is shorter than 60 chars', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [makeProduct(1, { description: 'Short' })],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Short...')).toBeInTheDocument();
      });
    });

    it('renders a single product with singular "result found"', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [makeProduct(1)],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText(/1 result found/)).toBeInTheDocument();
      });
    });

    it('handles very expensive items with correct formatting', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [makeProduct(1, { price: 999999.99 })],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('$999,999.99')).toBeInTheDocument();
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CategoryProduct – Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: sampleCategory,
        products: sampleProducts,
      },
    });
  });

  it('full flow: loads category → displays products → navigates to detail', async () => {
    renderCategoryProduct('electronics');

    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
    });

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Product 3')).toBeInTheDocument();

    const detailBtns = screen.getAllByRole('button', { name: /More Details/i });
    fireEvent.click(detailBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/product/product-1');
  });

  it('full flow: loads category → adds item to cart', async () => {
    renderCategoryProduct('electronics');

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /ADD TO CART/i })[0]);

    expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[0]]);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('cart', JSON.stringify([sampleProducts[0]]));
    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  });

  it('shows empty state when no products in category', async () => {
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: { _id: 'c1', name: 'Empty Cat', slug: 'empty-cat' },
        products: [],
      },
    });

    renderCategoryProduct('empty-cat');

    await waitFor(() => {
      expect(screen.getByText('Category - Empty Cat')).toBeInTheDocument();
      expect(screen.getByText(/0 results found/)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /More Details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ADD TO CART/i })).not.toBeInTheDocument();
  });

  it('full pagination flow: loads 8 items → shows 6 → load more → shows all', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, category: sampleCategory, products: manyProducts },
    });

    renderCategoryProduct();

    await waitFor(() => {
      expect(screen.getByText('Product 6')).toBeInTheDocument();
    });

    expect(screen.queryByText('Product 7')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Load more/i }));

    await waitFor(() => {
      expect(screen.getByText('Product 7')).toBeInTheDocument();
      expect(screen.getByText('Product 8')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
  });

  it('guest to login flow: no auth state carried into cart on add', async () => {
    // Cart context starts empty (guest); verify product appended correctly
    renderCategoryProduct();

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /ADD TO CART/i })[0]);

    // setCart receives array with just the one item (cart was [])
    expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[0]]);
  });
});