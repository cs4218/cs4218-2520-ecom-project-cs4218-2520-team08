/**
 * Unit + Integration Tests for Categories page
 *
 * Tests the public-facing "All Categories" page that uses useCategory
 * hook to list all categories as clickable links.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Categories from './Categories';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('axios');

// Auth context mock
jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: null, token: '' }, jest.fn()]),
}));

// Cart context mock
jest.mock('../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
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

// matchMedia shim
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
  { _id: 'c1', name: 'Electronics', slug: 'electronics' },
  { _id: 'c2', name: 'Books', slug: 'books' },
  { _id: 'c3', name: 'Clothing', slug: 'clothing' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const renderCategories = () =>
  render(
    <MemoryRouter>
      <Categories />
    </MemoryRouter>,
  );

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Categories Page – Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: categories fetch succeeds
    axios.get.mockResolvedValue({
      data: { success: true, category: sampleCategories },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Rendering', () => {
    it("renders within Layout with 'All Categories' title", async () => {
      renderCategories();
      await waitFor(() => {
        expect(screen.getByTestId('layout')).toBeInTheDocument();
      });
      expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'All Categories');
    });

    it('renders all category names as links', async () => {
      renderCategories();

      await waitFor(() => {
        sampleCategories.forEach((c) => {
          expect(screen.getByText(c.name)).toBeInTheDocument();
        });
      });
    });

    it('renders each category as a link to /category/{slug}', async () => {
      renderCategories();

      await waitFor(() => {
        sampleCategories.forEach((c) => {
          const link = screen.getByText(c.name).closest('a');
          expect(link).toHaveAttribute('href', `/category/${c.slug}`);
        });
      });
    });

    it('applies btn-primary CSS class to each category link', async () => {
      renderCategories();

      await waitFor(() => {
        sampleCategories.forEach((c) => {
          const link = screen.getByText(c.name);
          expect(link).toHaveClass('btn', 'btn-primary');
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Empty state', () => {
    it('renders no links when there are no categories', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      renderCategories();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('renders empty page when API fails (no crash)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValue(new Error('Network Error'));

      renderCategories();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Page renders but no links
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.queryAllByRole('link')).toHaveLength(0);
      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Data fetching', () => {
    it('calls /api/v1/category/get-category on mount', async () => {
      renderCategories();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      });
    });

    it('fetches only once', async () => {
      renderCategories();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('renders a single category correctly', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: [{ _id: 'c1', name: 'Solo', slug: 'solo' }],
        },
      });

      renderCategories();

      await waitFor(() => {
        expect(screen.getByText('Solo')).toBeInTheDocument();
      });
      const link = screen.getByText('Solo').closest('a');
      expect(link).toHaveAttribute('href', '/category/solo');
    });

    it('renders categories with special characters in names', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          category: [{ _id: 's1', name: 'Café & Más', slug: 'cafe-and-mas' }],
        },
      });

      renderCategories();

      await waitFor(() => {
        expect(screen.getByText('Café & Más')).toBeInTheDocument();
      });
    });

    it('renders many categories', async () => {
      const many = Array.from({ length: 20 }, (_, i) => ({
        _id: `c${i}`,
        name: `Cat ${i}`,
        slug: `cat-${i}`,
      }));
      axios.get.mockResolvedValue({
        data: { success: true, category: many },
      });

      renderCategories();

      await waitFor(() => {
        expect(screen.getAllByRole('link')).toHaveLength(20);
      });
    });
  });
});
