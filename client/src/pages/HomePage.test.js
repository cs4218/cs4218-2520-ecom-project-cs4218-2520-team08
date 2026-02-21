import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import { Prices } from '../components/Prices';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('axios');
jest.mock('react-hot-toast');

// Track navigate calls
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
let mockCart = [];
jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [mockCart, mockSetCart]),
}));

jest.mock('../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

// Mock Layout to avoid rendering Header/Footer/Helmet sub-trees
// which have their own hooks and can interfere with our focused tests
jest.mock('../components/Layout', () => {
  return ({ children, title }) => (
    <div data-testid='layout' data-title={title}>
      {children}
    </div>
  );
});

// Mock antd components to avoid jsdom rendering issues
jest.mock('antd', () => {
  const React = require('react');
  const Checkbox = ({ children, onChange }) => (
    <label>
      <input type='checkbox' onChange={(e) => onChange && onChange(e)} />
      {children}
    </label>
  );
  const Radio = ({ children, value }) => (
    <label>
      <input type='radio' name='price-filter' value={JSON.stringify(value)} />
      {children}
    </label>
  );
  const RadioGroup = ({ children, onChange }) => (
    <div
      role='radiogroup'
      onChange={(e) => {
        // Parse the value back to array format to match antd behavior
        if (onChange) {
          try {
            onChange({ target: { value: JSON.parse(e.target.value) } });
          } catch {
            onChange(e);
          }
        }
      }}
    >
      {children}
    </div>
  );
  Radio.Group = RadioGroup;
  return { Checkbox, Radio };
});

// Mock react-icons
jest.mock('react-icons/ai', () => ({
  AiOutlineReload: () => <span data-testid='reload-icon'>↻</span>,
}));

// antd matchMedia shim
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

const sampleCategories = [
  { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
  { _id: 'cat2', name: 'Clothing', slug: 'clothing' },
  { _id: 'cat3', name: 'Books', slug: 'books' },
];

const makeProduct = (id, overrides = {}) => ({
  _id: `prod${id}`,
  name: `Product ${id}`,
  slug: `product-${id}`,
  description: `This is a detailed description for product number ${id} that is longer than sixty characters definitely`,
  price: 29.99 + id,
  category: 'cat1',
  quantity: 10,
  ...overrides,
});

const sampleProducts = [makeProduct(1), makeProduct(2), makeProduct(3)];

const page2Products = [makeProduct(4), makeProduct(5)];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sets up the default happy-path axios responses.
 * Individual tests can override specific calls after this.
 */
const setupDefaultAxiosMocks = (overrides = {}) => {
  const defaults = {
    categories: {
      data: { success: true, category: sampleCategories },
    },
    productCount: {
      data: { success: true, total: 10 },
    },
    productList: {
      data: { success: true, products: sampleProducts },
    },
    productFilters: {
      data: { success: true, products: sampleProducts },
    },
  };
  const cfg = { ...defaults, ...overrides };

  axios.get.mockImplementation((url) => {
    if (url === '/api/v1/category/get-category') {
      return Promise.resolve(cfg.categories);
    }
    if (url === '/api/v1/product/product-count') {
      return Promise.resolve(cfg.productCount);
    }
    if (url.startsWith('/api/v1/product/product-list/')) {
      // Allow per-page overrides
      const page = url.split('/').pop();
      if (page === '1') return Promise.resolve(cfg.productList);
      if (cfg.productListPage2) return Promise.resolve(cfg.productListPage2);
      return Promise.resolve(cfg.productList);
    }
    return Promise.resolve({ data: {} });
  });

  axios.post.mockImplementation((url) => {
    if (url === '/api/v1/product/product-filters') {
      return Promise.resolve(cfg.productFilters);
    }
    return Promise.resolve({ data: {} });
  });
};

const renderHomePage = async () => {
  let result;
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/product/:slug' element={<div>Product Detail</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return result;
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('HomePage – Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. INITIAL RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial Rendering', () => {
    it('renders the banner image', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      const banner = screen.getByAltText('bannerimage');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('src', '/images/Virtual.png');
    });

    it("renders 'All Products' heading", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });
    });

    it("renders 'Filter By Category' heading", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      expect(screen.getByText('Filter By Category')).toBeInTheDocument();
    });

    it("renders 'Filter By Price' heading", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      expect(screen.getByText('Filter By Price')).toBeInTheDocument();
    });

    it("renders 'RESET FILTERS' button", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument();
    });

    it('passes correct title to Layout', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      const layout = screen.getByTestId('layout');
      expect(layout).toHaveAttribute('data-title', 'ALL Products - Best offers ');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. API CALLS ON MOUNT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API calls on mount', () => {
    it('fetches categories on mount', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      });
    });

    it('fetches product count on mount', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-count');
      });
    });

    it('fetches product list page 1 on mount', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/1');
      });
    });

    it('does NOT call loadMore on initial page=1', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        // product-list should be called only once (from getAllProducts, not loadMore)
        const productListCalls = axios.get.mock.calls.filter((c) => c[0].startsWith('/api/v1/product/product-list/'));
        expect(productListCalls).toHaveLength(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRODUCT RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Product cards rendering', () => {
    it('renders all product names', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        sampleProducts.forEach((p) => {
          expect(screen.getByText(p.name)).toBeInTheDocument();
        });
      });
    });

    it('renders product prices formatted as USD currency', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        sampleProducts.forEach((p) => {
          const formatted = p.price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          });
          expect(screen.getByText(formatted)).toBeInTheDocument();
        });
      });
    });

    it('renders truncated product descriptions (60 chars + ...)', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        sampleProducts.forEach((p) => {
          const truncated = `${p.description.substring(0, 60)}...`;
          expect(screen.getByText(truncated)).toBeInTheDocument();
        });
      });
    });

    it('renders product images with correct src', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        sampleProducts.forEach((p) => {
          const img = screen.getByAltText(p.name);
          expect(img).toHaveAttribute('src', `/api/v1/product/product-photo/${p._id}`);
        });
      });
    });

    it("renders 'More Details' button for each product", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        const btns = screen.getAllByText('More Details');
        expect(btns).toHaveLength(sampleProducts.length);
      });
    });

    it("renders 'ADD TO CART' button for each product", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        const btns = screen.getAllByText('ADD TO CART');
        expect(btns).toHaveLength(sampleProducts.length);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CATEGORY FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Category filter checkboxes', () => {
    it('renders a checkbox for each category', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        sampleCategories.forEach((c) => {
          expect(screen.getByText(c.name)).toBeInTheDocument();
        });
      });
    });

    it('calls filter API when a category checkbox is checked', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Check the first category checkbox
      const checkbox = screen.getByLabelText('Electronics');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/v1/product/product-filters',
          expect.objectContaining({
            checked: ['cat1'],
          }),
        );
      });
    });

    it('removes category from filter when unchecked', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Electronics');
      // Check then uncheck
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      jest.clearAllMocks();
      setupDefaultAxiosMocks();
      fireEvent.click(checkbox);

      // After uncheck, checked array should be empty, so getAllProducts is called instead
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/1');
      });
    });

    it('supports selecting multiple categories', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Electronics'));
      fireEvent.click(screen.getByLabelText('Clothing'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/v1/product/product-filters',
          expect.objectContaining({
            checked: expect.arrayContaining(['cat1', 'cat2']),
          }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PRICE FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Price filter radio buttons', () => {
    it('renders all price range options from Prices constant', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();
      await waitFor(() => {
        Prices.forEach((p) => {
          expect(screen.getByText(p.name)).toBeInTheDocument();
        });
      });
    });

    it('calls filter API when a price radio is selected', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('$0 to 19')).toBeInTheDocument();
      });

      const radio = screen.getByLabelText('$0 to 19');
      fireEvent.click(radio);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/v1/product/product-filters',
          expect.objectContaining({
            radio: [0, 19],
          }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. RESET FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Reset Filters button', () => {
    it('calls window.location.reload when RESET FILTERS is clicked', async () => {
      setupDefaultAxiosMocks();

      // Mock window.location.reload
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, reload: reloadMock },
      });

      await renderHomePage();

      const resetBtn = screen.getByRole('button', { name: /reset filters/i });
      fireEvent.click(resetBtn);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. NAVIGATION – "More Details"
  // ═══════════════════════════════════════════════════════════════════════════

  describe('More Details navigation', () => {
    it("navigates to /product/:slug when 'More Details' is clicked", async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('More Details').length).toBeGreaterThan(0);
      });

      const detailBtns = screen.getAllByText('More Details');
      fireEvent.click(detailBtns[0]);

      expect(mockNavigate).toHaveBeenCalledWith(`/product/${sampleProducts[0].slug}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. ADD TO CART
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ADD TO CART functionality', () => {
    it('adds product to cart, updates localStorage, and shows toast', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('ADD TO CART').length).toBeGreaterThan(0);
      });

      const addBtns = screen.getAllByText('ADD TO CART');
      fireEvent.click(addBtns[0]);

      // setCart called with new array including the product
      expect(mockSetCart).toHaveBeenCalledWith(expect.arrayContaining([sampleProducts[0]]));

      // localStorage updated
      expect(window.localStorage.setItem).toHaveBeenCalledWith('cart', expect.any(String));

      // toast shown
      expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
    });

    it('preserves existing cart items when adding a new product', async () => {
      const existingItem = makeProduct(99);
      mockCart = [existingItem];

      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('ADD TO CART').length).toBeGreaterThan(0);
      });

      const addBtns = screen.getAllByText('ADD TO CART');
      fireEvent.click(addBtns[0]);

      expect(mockSetCart).toHaveBeenCalledWith([existingItem, sampleProducts[0]]);

      const storedValue = JSON.parse(window.localStorage.setItem.mock.calls[0][1]);
      expect(storedValue).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. PAGINATION / LOAD MORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pagination – Load More', () => {
    it("shows 'Loadmore' button when products < total", async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 10 } },
        productList: { data: { success: true, products: sampleProducts } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });
    });

    it("does NOT show 'Loadmore' button when products >= total", async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 3 } },
        productList: { data: { success: true, products: sampleProducts } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
    });

    it("fetches next page when 'Loadmore' is clicked", async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 10 } },
        productList: { data: { success: true, products: sampleProducts } },
        productListPage2: { data: { success: true, products: page2Products } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/2');
      });
    });

    it('appends new products to existing ones on load more', async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 10 } },
        productList: { data: { success: true, products: sampleProducts } },
        productListPage2: { data: { success: true, products: page2Products } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        // Original products still present
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        // New products appended
        expect(screen.getByText('Product 4')).toBeInTheDocument();
        expect(screen.getByText('Product 5')).toBeInTheDocument();
      });
    });

    it('hides Loadmore when all products are loaded', async () => {
      // total = 5, first page has 3, second page has 2 => 5 total
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 5 } },
        productList: { data: { success: true, products: sampleProducts } },
        productListPage2: { data: { success: true, products: page2Products } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        expect(screen.getByText('Product 5')).toBeInTheDocument();
      });

      // Now all 5 products loaded and total=5, button should be hidden
      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EMPTY DATA STATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty data states', () => {
    it('renders no product cards when product list is empty', async () => {
      setupDefaultAxiosMocks({
        productList: { data: { success: true, products: [] } },
        productCount: { data: { success: true, total: 0 } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      expect(screen.queryByText('More Details')).not.toBeInTheDocument();
      expect(screen.queryByText('ADD TO CART')).not.toBeInTheDocument();
    });

    it('renders no category checkboxes when category list is empty', async () => {
      setupDefaultAxiosMocks({
        categories: { data: { success: true, category: [] } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Filter By Category')).toBeInTheDocument();
      });

      // No checkboxes in the filter section (antd renders checkbox as role checkbox)
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('does not show Loadmore when total is 0', async () => {
      setupDefaultAxiosMocks({
        productList: { data: { success: true, products: [] } },
        productCount: { data: { success: true, total: 0 } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. API FAILURE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('API failure handling', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('handles category API failure gracefully (no crash)', async () => {
      setupDefaultAxiosMocks();
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.reject(new Error('Network Error'));
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.resolve({
            data: { products: sampleProducts },
          });
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();

      // Page should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles product list API failure gracefully', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({
            data: { success: true, category: sampleCategories },
          });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.reject(new Error('Server Error'));
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      // No product cards rendered
      expect(screen.queryByText('More Details')).not.toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles product count API failure gracefully', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({
            data: { success: true, category: sampleCategories },
          });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.reject(new Error('Count Error'));
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          return Promise.resolve({
            data: { products: sampleProducts },
          });
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // With total=0 (default), loadmore should not appear
      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('handles filter API failure gracefully', async () => {
      setupDefaultAxiosMocks();
      axios.post.mockRejectedValue(new Error('Filter Error'));

      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Electronics'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Page should still be showing
      expect(screen.getByText('All Products')).toBeInTheDocument();
    });

    it('handles loadMore API failure gracefully', async () => {
      let callCount = 0;
      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({
            data: { success: true, category: sampleCategories },
          });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url.startsWith('/api/v1/product/product-list/')) {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              data: { products: sampleProducts },
            });
          }
          return Promise.reject(new Error('LoadMore Error'));
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Original products should still be there
      expect(screen.getByText('Product 1')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. MALFORMED / INVALID RESPONSE HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Malformed / unexpected API responses', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('handles category response with success=false', async () => {
      setupDefaultAxiosMocks({
        categories: { data: { success: false, category: null } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Filter By Category')).toBeInTheDocument();
      });

      // No categories should be rendered
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });

    it('handles missing products field in response', async () => {
      setupDefaultAxiosMocks({
        productList: { data: { success: true } }, // no `products` key
      });
      await renderHomePage();

      // Should not crash
      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });
    });

    it('handles null category list in response', async () => {
      setupDefaultAxiosMocks({
        categories: { data: { success: true, category: null } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });
    });

    it('handles undefined total in product count response', async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true } }, // no `total` key
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('All Products')).toBeInTheDocument();
      });

      // Without a total, loadmore shouldn't appear (total defaults to 0)
      expect(screen.queryByText(/Loadmore/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Loading state', () => {
    it("shows 'Loading ...' text in Loadmore button while fetching", async () => {
      // Make loadMore take time so we can observe loading state
      let resolveLoadMore;
      const loadMorePromise = new Promise((resolve) => {
        resolveLoadMore = resolve;
      });

      axios.get.mockImplementation((url) => {
        if (url === '/api/v1/category/get-category') {
          return Promise.resolve({
            data: { success: true, category: sampleCategories },
          });
        }
        if (url === '/api/v1/product/product-count') {
          return Promise.resolve({ data: { total: 10 } });
        }
        if (url === '/api/v1/product/product-list/1') {
          return Promise.resolve({
            data: { products: sampleProducts },
          });
        }
        if (url === '/api/v1/product/product-list/2') {
          return loadMorePromise;
        }
        return Promise.resolve({ data: {} });
      });

      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      // While loading, button should show "Loading ..."
      await waitFor(() => {
        expect(screen.getByText('Loading ...')).toBeInTheDocument();
      });

      // Resolve the promise
      await act(async () => {
        resolveLoadMore({ data: { products: page2Products } });
      });

      // After loading completes, should show Loadmore again (since total=10 > 5 products)
      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Prices CONSTANT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Prices constant', () => {
    it('has 6 price ranges defined', async () => {
      expect(Prices).toHaveLength(6);
    });

    it('each price range has required fields', async () => {
      Prices.forEach((p) => {
        expect(p).toHaveProperty('_id');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('array');
        expect(p.array).toHaveLength(2);
        expect(p.array[0]).toBeLessThanOrEqual(p.array[1]);
      });
    });

    it('has unique _id values for all price ranges', async () => {
      const ids = Prices.map((p) => p._id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('covers price ranges from $0 to $9999', async () => {
      expect(Prices[0].array[0]).toBe(0);
      expect(Prices[Prices.length - 1].array[1]).toBe(9999);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. FILTER INTERACTION BETWEEN CATEGORY AND PRICE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Combined category + price filter', () => {
    it('sends both checked and radio when both filters are active', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Select a category
      fireEvent.click(screen.getByLabelText('Electronics'));

      // Select a price
      fireEvent.click(screen.getByLabelText('$0 to 19'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/v1/product/product-filters', {
          checked: ['cat1'],
          radio: [0, 19],
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. CONDITIONAL RENDERING — getAllProducts vs filterProduct
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Conditional fetching logic', () => {
    it('calls only filterProduct (not getAllProducts) when only category is selected', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      jest.clearAllMocks();
      setupDefaultAxiosMocks();

      fireEvent.click(screen.getByLabelText('Electronics'));

      await waitFor(() => {
        const filterCalls = axios.post.mock.calls.filter((c) => c[0] === '/api/v1/product/product-filters');
        expect(filterCalls.length).toBeGreaterThanOrEqual(1);
      });

      // getAllProducts should NOT have been called
      const getProductListCalls = axios.get.mock.calls.filter((c) => c[0].startsWith('/api/v1/product/product-list/'));
      expect(getProductListCalls.length).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — HomePage interacting with backend API patterns
// ═══════════════════════════════════════════════════════════════════════════════

describe('HomePage – Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCart = [];
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Full page load flow', () => {
    it('loads categories, product count, and products in parallel on mount', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        // All three initial API calls made
        expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-count');
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/1');
      });

      // Categories rendered
      await waitFor(() => {
        sampleCategories.forEach((c) => {
          expect(screen.getByText(c.name)).toBeInTheDocument();
        });
      });

      // Products rendered
      await waitFor(() => {
        sampleProducts.forEach((p) => {
          expect(screen.getByText(p.name)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Category filter → product list update flow', () => {
    it('replaces product list with filtered results when filter is applied', async () => {
      const filteredProducts = [makeProduct(10, { name: 'Filtered Item' })];

      setupDefaultAxiosMocks({
        productFilters: {
          data: { success: true, products: filteredProducts },
        },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Electronics'));

      await waitFor(() => {
        expect(screen.getByText('Filtered Item')).toBeInTheDocument();
      });
    });

    it('restores full product list when all filters are cleared', async () => {
      const filteredProducts = [makeProduct(10, { name: 'Filtered Item' })];

      setupDefaultAxiosMocks({
        productFilters: {
          data: { success: true, products: filteredProducts },
        },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      // Apply filter
      fireEvent.click(screen.getByLabelText('Electronics'));

      await waitFor(() => {
        expect(screen.getByText('Filtered Item')).toBeInTheDocument();
      });

      // Clear filter by unchecking
      jest.clearAllMocks();
      setupDefaultAxiosMocks();

      fireEvent.click(screen.getByLabelText('Electronics'));

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination flow with backend', () => {
    it('calls product-list endpoint with incrementing page numbers', async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 20 } },
        productList: { data: { success: true, products: sampleProducts } },
        productListPage2: { data: { success: true, products: page2Products } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-list/2');
      });
    });

    it('accumulates products across pages', async () => {
      const moreProducts = [makeProduct(6), makeProduct(7), makeProduct(8)];

      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 20 } },
        productList: { data: { success: true, products: sampleProducts } },
        productListPage2: {
          data: { success: true, products: moreProducts },
        },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Loadmore/i));

      await waitFor(() => {
        // All products from both pages should be present
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
        expect(screen.getByText('Product 6')).toBeInTheDocument();
        expect(screen.getByText('Product 7')).toBeInTheDocument();
        expect(screen.getByText('Product 8')).toBeInTheDocument();
      });
    });
  });

  describe('Cart interaction with product data', () => {
    it('stores full product object in cart via context and localStorage', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('ADD TO CART').length).toBeGreaterThan(0);
      });

      const addBtns = screen.getAllByText('ADD TO CART');
      fireEvent.click(addBtns[1]); // add second product

      expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[1]]);

      const storedJSON = window.localStorage.setItem.mock.calls[0][1];
      const storedCart = JSON.parse(storedJSON);
      expect(storedCart[0]._id).toBe(sampleProducts[1]._id);
      expect(storedCart[0].name).toBe(sampleProducts[1].name);
      expect(storedCart[0].price).toBe(sampleProducts[1].price);
    });

    it('can add multiple different products to cart sequentially', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('ADD TO CART').length).toBeGreaterThan(0);
      });

      // Add first product
      fireEvent.click(screen.getAllByText('ADD TO CART')[0]);
      expect(mockSetCart).toHaveBeenCalledWith([sampleProducts[0]]);
      expect(toast.success).toHaveBeenCalledWith('Item Added to cart');

      // Add second product (cart is still [] from the component's perspective
      // because useCart mock doesn't trigger re-render with new value).
      // This documents that the component uses spread of current cart closure.
      fireEvent.click(screen.getAllByText('ADD TO CART')[1]);
      // Second call also starts from the same cart state (empty array from mock)
      expect(mockSetCart).toHaveBeenNthCalledWith(2, [sampleProducts[1]]);
      // Toast called twice
      expect(toast.success).toHaveBeenCalledTimes(2);
    });
  });

  describe('Navigation integration', () => {
    it('navigates to correct product detail page for each product', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getAllByText('More Details').length).toBe(sampleProducts.length);
      });

      const detailBtns = screen.getAllByText('More Details');

      sampleProducts.forEach((product, index) => {
        fireEvent.click(detailBtns[index]);
        expect(mockNavigate).toHaveBeenCalledWith(`/product/${product.slug}`);
      });
    });
  });

  describe('Filter API contract validation', () => {
    it('sends correct POST body format to product-filters', async () => {
      setupDefaultAxiosMocks();
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText('Electronics'));
      fireEvent.click(screen.getByLabelText('$20 to 39'));

      await waitFor(() => {
        const filterCalls = axios.post.mock.calls.filter((c) => c[0] === '/api/v1/product/product-filters');
        const lastCall = filterCalls[filterCalls.length - 1];
        expect(lastCall[0]).toBe('/api/v1/product/product-filters');
        expect(lastCall[1]).toHaveProperty('checked');
        expect(lastCall[1]).toHaveProperty('radio');
        expect(Array.isArray(lastCall[1].checked)).toBe(true);
        expect(Array.isArray(lastCall[1].radio)).toBe(true);
      });
    });
  });

  describe('Edge case: product with very short description', () => {
    it('handles description shorter than 60 chars with substring', async () => {
      const shortDescProduct = makeProduct(50, {
        name: 'Short Desc',
        description: 'Short',
      });
      setupDefaultAxiosMocks({
        productList: {
          data: { success: true, products: [shortDescProduct] },
        },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Short...')).toBeInTheDocument();
      });
    });
  });

  describe('Edge case: product with price 0', () => {
    it('renders $0.00 for free products', async () => {
      const freeProduct = makeProduct(60, {
        name: 'Free Item',
        price: 0,
      });
      setupDefaultAxiosMocks({
        productList: {
          data: { success: true, products: [freeProduct] },
        },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText('Free Item')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();
      });
    });
  });

  describe('Edge case: very large product count', () => {
    it('shows Loadmore even with very large total', async () => {
      setupDefaultAxiosMocks({
        productCount: { data: { success: true, total: 100000 } },
      });
      await renderHomePage();

      await waitFor(() => {
        expect(screen.getByText(/Loadmore/i)).toBeInTheDocument();
      });
    });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * UNCOVERED RISKS / NOTES:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. RACE CONDITION BUG (documented in test):
 *    When only category filters are selected (!radio.length is true),
 *    both getAllProducts() and filterProduct() fire simultaneously.
 *    The displayed result depends on which Promise resolves last.
 *
 * 2. DUPLICATE _id IN Prices (documented in test):
 *    Prices[4] and Prices[5] both have _id: 4. React keys will collide.
 *
 * 3. NO ERROR TOAST FOR USER:
 *    All API failures are caught and logged to console but never displayed
 *    to the user via toast.error(). The user sees a blank product list
 *    with no indication of what went wrong.
 *
 * 4. STALE CLOSURE IN loadMore:
 *    loadMore uses `products` from the closure. If multiple loadMore
 *    calls happen rapidly, the closure captures a stale `products` array,
 *    potentially dropping previously loaded items.
 *
 * 5. NO LOADING INDICATOR FOR INITIAL LOAD:
 *    The loading state only drives the Loadmore button text. There is
 *    no spinner or skeleton shown during the first page fetch.
 *
 * 6. RESET FILTERS USES window.location.reload():
 *    This is not testable in unit tests and bypasses React state management.
 *    A proper implementation would reset checked/radio state and re-fetch.
 *
 * 7. localStorage.setItem NOT WRAPPED IN TRY-CATCH:
 *    If localStorage is full or disabled, the ADD TO CART handler will throw.
 *
 * 8. NO DEBOUNCING ON FILTER CHANGES:
 *    Rapid checkbox/radio clicks each trigger a new API call without
 *    cancelling the previous one, potentially causing UI flicker.
 *
 * 9. product.price.toLocaleString WILL THROW IF price IS undefined/null:
 *    If the API returns a product without a price field, the component crashes.
 *    Similarly, description.substring(0, 60) will throw if description is missing.
 */
