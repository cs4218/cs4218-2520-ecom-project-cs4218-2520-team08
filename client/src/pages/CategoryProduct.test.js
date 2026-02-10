/**
 * Unit + Integration Tests for CategoryProduct page
 *
 * Tests the page that shows products for a specific category,
 * fetched by slug from /api/v1/product/product-category/:slug.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import CategoryProduct from './CategoryProduct';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('axios');

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

jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
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
  description: `A description for product ${id} that is long enough to be truncated at sixty chars`,
  price: 29.99 + id,
  category: 'cat1',
  ...overrides,
});

const sampleCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
const sampleProducts = [makeProduct(1), makeProduct(2), makeProduct(3)];

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

describe('CategoryProduct Page – Unit Tests', () => {
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

    it('displays product count', async () => {
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

    it('renders product images with correct src', async () => {
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
        // Product 1: 30.99
        expect(screen.getByText('$30.99')).toBeInTheDocument();
      });
    });

    it("renders 'More Details' button for each product", async () => {
      renderCategoryProduct();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', {
          name: /More Details/i,
        });
        expect(buttons).toHaveLength(sampleProducts.length);
      });
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

      const buttons = screen.getAllByRole('button', {
        name: /More Details/i,
      });
      fireEvent.click(buttons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/product/product-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EMPTY & ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty and error states', () => {
    it("shows '0 result found' when category has no products", async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(/0 results found/)).toBeInTheDocument();
      });
    });

    it('handles API failure gracefully (no crash)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValue(new Error('Server down'));

      renderCategoryProduct();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.getByTestId('layout')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    /**
     * BUG: category state is initialized as an empty array [].
     * After fetching, it becomes an object { _id, name, slug }.
     * Before the fetch completes, category?.name is undefined,
     * so the heading shows "Category - ".
     */
    it("shows 'Category - ' before data loads (category is empty array)", () => {
      axios.get.mockReturnValue(new Promise(() => {})); // never resolves
      renderCategoryProduct();

      expect(screen.getByText(/Category -/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('renders a single product', async () => {
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

    /**
     * FIXED: "result found" is now correctly pluralized.
     * Shows "results found" for counts != 1.
     */
    it("uses plural 'results found' for multiple products", async () => {
      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText(/3 results found/)).toBeInTheDocument();
      });
    });

    /**
     * FIXED: Missing description now safely falls back to empty string.
     */
    it('renders safely when product has no description', async () => {
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
      // Should show "..." with empty substring
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    /**
     * FIXED: Missing price now safely falls back to 0.
     */
    it('renders safely when product has no price (shows $0.00)', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: sampleCategory,
          products: [
            {
              _id: 'p1',
              name: 'No Price',
              description: 'A desc that is long enough',
              slug: 'no-price',
            },
          ],
        },
      });

      renderCategoryProduct();

      await waitFor(() => {
        expect(screen.getByText('No Price')).toBeInTheDocument();
      });
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('handles product with very long description (truncated to 60)', async () => {
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

    it('handles product with short description (< 60 chars)', async () => {
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

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
    });

    // Verify products
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Product 3')).toBeInTheDocument();

    // Click More Details on first product
    const detailBtns = screen.getAllByRole('button', { name: /More Details/i });
    fireEvent.click(detailBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/product/product-1');
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

    // No product cards
    expect(screen.queryByRole('button', { name: /More Details/i })).not.toBeInTheDocument();
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS FIXED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. CRASH ON MISSING DESCRIPTION → added null guard (p.description || "")
 * 2. CRASH ON MISSING PRICE → added null guard (p.price || 0)
 * 3. SINGULAR "result found" → now pluralizes for counts != 1
 * 4. category INITIALIZED AS ARRAY → changed to useState({})
 * 5. TYPO IN FUNCTION NAME → getPrductsByCat → getProductsByCat
 */
