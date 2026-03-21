import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import HomePage from '../../client/src/pages/HomePage';
import CartPage from '../../client/src/pages/CartPage';
import Categories from '../../client/src/pages/Categories';
import { AuthProvider } from '../../client/src/context/auth';
import { CartProvider } from '../../client/src/context/cart';
import { SearchProvider } from '../../client/src/context/search';

jest.mock('axios');
jest.mock('react-hot-toast', () => {
  const success = jest.fn();
  const error = jest.fn();
  const toast = Object.assign(jest.fn(), { success, error });
  return {
    __esModule: true,
    default: toast,
    Toaster: () => null,
    success,
    error,
  };
});

// DropIn requires a real Braintree client token — mock it as a no-op
jest.mock('braintree-web-drop-in-react', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('div', { 'data-testid': 'drop-in-mock' }) };
});

// ── matchMedia mock (required by antd) ───────────────────────────────────
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

// ── localStorage mock ────────────────────────────────────────────────────
const localStorageData = {};
const localStorageMock = {
  getItem: jest.fn((key) => localStorageData[key] ?? null),
  setItem: jest.fn((key, value) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  }),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ── Sample data ──────────────────────────────────────────────────────────
const sampleCategories = [
  { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
  { _id: 'cat2', name: 'Books', slug: 'books' },
];

const sampleProducts = [
  {
    _id: 'p1',
    name: 'Laptop',
    price: 999,
    description: 'A powerful laptop for all your needs',
    slug: 'laptop',
  },
  {
    _id: 'p2',
    name: 'Novel',
    price: 15,
    description: 'A captivating story you cannot put down',
    slug: 'novel',
  },
  {
    _id: 'p3',
    name: 'Headphones',
    price: 49,
    description: 'Crystal clear audio with noise cancellation',
    slug: 'headphones',
  },
];

const filteredProducts = [
  {
    _id: 'p1',
    name: 'Laptop',
    price: 999,
    description: 'A powerful laptop for all your needs',
    slug: 'laptop',
  },
];

const fourCategories = [
  { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
  { _id: 'cat2', name: 'Books', slug: 'books' },
  { _id: 'cat3', name: 'Clothing', slug: 'clothing' },
  { _id: 'cat4', name: 'Sports', slug: 'sports' },
];

// ── Helpers ──────────────────────────────────────────────────────────────
const renderWithProviders = (ui, { route = '/' } = {}) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Routes>
              <Route path='*' element={ui} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

const waitForAsyncUpdates = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

// ── Default axios router ─────────────────────────────────────────────────
const setupDefaultAxiosMocks = (categoryList = sampleCategories) => {
  axios.get.mockImplementation((url) => {
    if (url.includes('/get-category')) {
      return Promise.resolve({
        data: { success: true, category: categoryList },
      });
    }
    if (url.includes('/product-count')) {
      return Promise.resolve({ data: { total: 3 } });
    }
    if (url.match(/\/product-list\/\d+/)) {
      return Promise.resolve({ data: { products: sampleProducts } });
    }
    if (url.includes('/braintree/token')) {
      return Promise.resolve({ data: { clientToken: 'fake-token' } });
    }
    return Promise.resolve({ data: {} });
  });

  axios.post.mockImplementation((url) => {
    if (url.includes('/product-filters')) {
      return Promise.resolve({ data: { products: filteredProducts } });
    }
    return Promise.resolve({ data: {} });
  });
};

// ── Global hooks ─────────────────────────────────────────────────────────
let consoleErrorSpy;
let consoleLogSpy;

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k]);
  setupDefaultAxiosMocks();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// Lee Seng Kitt
describe('Frontend Integration: Categories, Cart & HomePage', () => {
  // ─── Test 5 ──────────────────────────────────────────────────────────────
  describe('HomePage category filters + product display', () => {
    it('renders category checkboxes, price radio buttons, and product cards', async () => {
      renderWithProviders(<HomePage />, { route: '/' });
      await waitForAsyncUpdates();

      // Category filter section
      expect(screen.getByText('Filter By Category')).toBeInTheDocument();
      await waitFor(() => {
        // Target filter checkboxes specifically (only the sidebar has checkbox roles)
        expect(screen.getByRole('checkbox', { name: 'Electronics' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Books' })).toBeInTheDocument();
      });

      // Price filter section
      expect(screen.getByText('Filter By Price')).toBeInTheDocument();
      expect(screen.getByText('$0 to 19')).toBeInTheDocument();
      expect(screen.getByText('$20 to 39')).toBeInTheDocument();

      // Product cards
      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
        expect(screen.getByText('Novel')).toBeInTheDocument();
        expect(screen.getByText('Headphones')).toBeInTheDocument();
      });

      // ADD TO CART buttons present
      expect(screen.getAllByText('ADD TO CART')).toHaveLength(3);
    });

    it('selecting a category checkbox triggers the filter API call', async () => {
      renderWithProviders(<HomePage />, { route: '/' });
      await waitForAsyncUpdates();

      // Wait for categories to render (appears in both Header dropdown and filter sidebar)
      await waitFor(() => {
        expect(screen.getAllByText('Electronics').length).toBeGreaterThanOrEqual(1);
      });

      // Click the Electronics checkbox (antd Checkbox renders an <input type="checkbox"> inside a <label>)
      const electronicsCheckbox = screen.getByLabelText('Electronics');
      fireEvent.click(electronicsCheckbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          '/api/v1/product/product-filters',
          expect.objectContaining({ checked: ['cat1'] }),
        );
      });

      // Filtered product should display
      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
      });
    });
  });

  // ─── Test 6 ──────────────────────────────────────────────────────────────
  describe('Add to cart from HomePage updates cart context', () => {
    it('clicking ADD TO CART increments the Header badge count', async () => {
      renderWithProviders(<HomePage />, { route: '/' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByText('ADD TO CART');

      // Click first ADD TO CART
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        const badge = document.querySelector('.ant-badge-count');
        expect(badge).toBeTruthy();
        expect(badge.getAttribute('title')).toBe('1');
      });

      // Click second ADD TO CART
      fireEvent.click(addButtons[1]);

      await waitFor(() => {
        const badge = document.querySelector('.ant-badge-count');
        expect(badge.getAttribute('title')).toBe('2');
      });
    });

    it('clicking ADD TO CART updates localStorage with the product', async () => {
      renderWithProviders(<HomePage />, { route: '/' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByText('ADD TO CART');
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('cart', expect.any(String));
        // Use the last setItem('cart', ...) call to get the most recent write
        const cartCalls = localStorageMock.setItem.mock.calls.filter((c) => c[0] === 'cart');
        const stored = JSON.parse(cartCalls[cartCalls.length - 1][1]);
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('Laptop');
      });
    });
  });

  // ─── Test 7 ──────────────────────────────────────────────────────────────
  describe('CartPage displays items with totals', () => {
    const cartItems = [
      { _id: 'p1', name: 'Widget A', price: 10, description: 'Widget A desc' },
      {
        _id: 'p2',
        name: 'Widget B',
        price: 25.5,
        description: 'Widget B desc',
      },
      {
        _id: 'p3',
        name: 'Widget C',
        price: 49.99,
        description: 'Widget C desc',
      },
    ];

    beforeEach(() => {
      localStorageData['cart'] = JSON.stringify(cartItems);
      localStorageData['auth'] = JSON.stringify({
        user: {
          name: 'Test User',
          email: 'test@test.com',
          address: '123 Test St',
        },
        token: 'tok',
      });
    });

    it('renders all cart items, count heading, and Remove buttons', async () => {
      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Widget A')).toBeInTheDocument();
        expect(screen.getByText('Widget B')).toBeInTheDocument();
        expect(screen.getByText('Widget C')).toBeInTheDocument();
      });

      // Cart heading should indicate 3 items
      expect(screen.getByText(/3 items/i)).toBeInTheDocument();

      // 3 Remove buttons
      expect(screen.getAllByText('Remove')).toHaveLength(3);
    });

    it('displays the correctly formatted total price', async () => {
      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      // totalPrice() formats via toLocaleString("en-US", { style: "currency", currency: "USD" })
      // 10 + 25.5 + 49.99 = 85.49 → "$85.49"
      await waitFor(() => {
        expect(screen.getByText(/85\.49/)).toBeInTheDocument();
      });

      // Header badge should show 3
      const badge = document.querySelector('.ant-badge-count');
      expect(badge).toBeTruthy();
      expect(badge.getAttribute('title')).toBe('3');
    });
  });

  // ─── Test 8 ──────────────────────────────────────────────────────────────
  describe('CartPage remove item flow', () => {
    const twoItems = [
      {
        _id: 'pa',
        name: 'Product A',
        price: 30,
        description: 'Product A description here',
      },
      {
        _id: 'pb',
        name: 'Product B',
        price: 20,
        description: 'Product B description here',
      },
    ];

    beforeEach(() => {
      localStorageData['cart'] = JSON.stringify(twoItems);
      localStorageData['auth'] = JSON.stringify({
        user: {
          name: 'Test User',
          email: 'test@test.com',
          address: '123 Test St',
        },
        token: 'tok',
      });
    });

    it('removes the first item, keeps the second, and updates the heading', async () => {
      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Product A')).toBeInTheDocument();
        expect(screen.getByText('Product B')).toBeInTheDocument();
      });
      expect(screen.getByText(/2 items/i)).toBeInTheDocument();

      // Remove first item
      const removeBtns = screen.getAllByText('Remove');
      fireEvent.click(removeBtns[0]);

      await waitFor(() => {
        expect(screen.queryByText('Product A')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Product B')).toBeInTheDocument();
      expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    });

    it('updates the total price and localStorage after removal', async () => {
      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Product A')).toBeInTheDocument();
      });

      // Remove Product A ($30)
      const removeBtns = screen.getAllByText('Remove');
      fireEvent.click(removeBtns[0]);

      // Total should now be $20.00
      await waitFor(() => {
        expect(screen.getByText(/20\.00/)).toBeInTheDocument();
      });

      // localStorage should have only Product B (read through mock API)
      const stored = JSON.parse(window.localStorage.getItem('cart'));
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Product B');
    });

    it('shows empty cart message and badge 0 after removing all items', async () => {
      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText('Product A')).toBeInTheDocument();
      });

      // Remove first item
      fireEvent.click(screen.getAllByText('Remove')[0]);
      await waitFor(() => {
        expect(screen.queryByText('Product A')).not.toBeInTheDocument();
      });

      // Remove second item
      fireEvent.click(screen.getByText('Remove'));
      await waitFor(() => {
        expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
      });

      // Badge should show 0
      const badge = document.querySelector('.ant-badge-count');
      expect(badge).toBeTruthy();
      expect(badge.getAttribute('title')).toBe('0');
    });
  });

  // ─── Test 9 ──────────────────────────────────────────────────────────────
  describe('Cart localStorage persistence', () => {
    it('restores cart from localStorage on initial mount', async () => {
      const savedItems = [
        { _id: 'x1', name: 'Saved Item 1', price: 5, description: 'd1' },
        { _id: 'x2', name: 'Saved Item 2', price: 10, description: 'd2' },
        { _id: 'x3', name: 'Saved Item 3', price: 15, description: 'd3' },
      ];
      localStorageData['cart'] = JSON.stringify(savedItems);
      localStorageData['auth'] = JSON.stringify({
        user: { name: 'User', email: 'u@t.com', address: 'Addr' },
        token: 'tok',
      });

      renderWithProviders(<CartPage />, { route: '/cart' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        expect(screen.getByText(/3 items/i)).toBeInTheDocument();
      });

      // Badge also shows 3
      const badge = document.querySelector('.ant-badge-count');
      expect(badge).toBeTruthy();
      expect(badge.getAttribute('title')).toBe('3');
    });

    it('cart data persists across unmount and remount cycles', async () => {
      const { unmount: unmount1 } = renderWithProviders(<HomePage />, { route: '/' });
      await waitForAsyncUpdates();

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeInTheDocument();
      });

      // Add 2 items to cart
      const addButtons = screen.getAllByText('ADD TO CART');
      fireEvent.click(addButtons[0]);
      fireEvent.click(addButtons[1]);

      // Badge should show 2
      await waitFor(() => {
        const badge = document.querySelector('.ant-badge-count');
        expect(badge).toBeTruthy();
        expect(badge.getAttribute('title')).toBe('2');
      });

      // Unmount the first tree
      unmount1();

      // Set auth so CartPage renders the full item list
      localStorageData['auth'] = JSON.stringify({
        user: { name: 'User', email: 'u@t.com', address: 'Addr' },
        token: 'tok',
      });

      // Now re-render a fresh CartPage — CartProvider reads cart from localStorage
      renderWithProviders(<CartPage />, { route: '/cart' });

      await waitForAsyncUpdates();

      // The fresh mount should pick up the 2 items from localStorage
      await waitFor(() => {
        const badge = document.querySelector('.ant-badge-count');
        expect(badge).toBeTruthy();
        expect(badge.getAttribute('title')).toBe('2');
      });

      // Verify actual product names render on the CartPage
      expect(screen.getByText('Laptop')).toBeInTheDocument();
      expect(screen.getByText('Novel')).toBeInTheDocument();
    });
  });

  // ─── Test 10 ─────────────────────────────────────────────────────────────
  describe('Categories page with useCategory hook', () => {
    beforeEach(() => {
      setupDefaultAxiosMocks(fourCategories);
    });

    it('renders all categories as links with correct href paths', async () => {
      renderWithProviders(<Categories />, { route: '/categories' });
      await waitForAsyncUpdates();

      // Target the btn-primary links in the page body (Categories component renders these)
      await waitFor(() => {
        const categoryLinks = document.querySelectorAll('a.btn.btn-primary');
        const linkTexts = Array.from(categoryLinks).map((a) => a.textContent);
        expect(linkTexts).toContain('Electronics');
        expect(linkTexts).toContain('Books');
        expect(linkTexts).toContain('Clothing');
        expect(linkTexts).toContain('Sports');
      });

      // Each should be a link pointing to /category/:slug
      for (const cat of fourCategories) {
        const link = document.querySelector(`a[href="/category/${cat.slug}"]`);
        expect(link).toBeTruthy();
      }
    });

    it('renders within Layout with Header and Footer', async () => {
      renderWithProviders(<Categories />, { route: '/categories' });
      await waitForAsyncUpdates();

      // Header brand
      await waitFor(() => {
        expect(screen.getByText(/Virtual Vault/)).toBeInTheDocument();
      });

      // Footer
      expect(screen.getByText(/All Rights Reserved/)).toBeInTheDocument();
    });

    it('category links have the correct /category/:slug pattern', async () => {
      renderWithProviders(<Categories />, { route: '/categories' });
      await waitForAsyncUpdates();

      await waitFor(() => {
        const categoryLinks = document.querySelectorAll('a.btn.btn-primary');
        expect(categoryLinks.length).toBe(4);
      });

      // Gather all links with /category/ in their href (regex allows hyphens and digits in slugs)
      const allLinks = document.querySelectorAll('a[href*="/category/"]');
      const categoryPageLinks = Array.from(allLinks).filter((a) =>
        a.getAttribute('href').match(/^\/category\/[a-z0-9-]+$/),
      );
      // Categories page renders 4 links; Header dropdown also renders them
      // so we expect at least 4 matching links
      expect(categoryPageLinks.length).toBeGreaterThanOrEqual(4);

      // Verify each slug is present
      const hrefs = categoryPageLinks.map((a) => a.getAttribute('href'));
      expect(hrefs).toContain('/category/electronics');
      expect(hrefs).toContain('/category/books');
      expect(hrefs).toContain('/category/clothing');
      expect(hrefs).toContain('/category/sports');
    });
  });
});
