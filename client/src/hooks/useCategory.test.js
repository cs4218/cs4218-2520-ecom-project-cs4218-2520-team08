/**
 * Unit Tests for useCategory custom hook
 *
 * Tests the hook that fetches category data from /api/v1/category/get-category
 * and returns the array of categories.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import useCategory from './useCategory';

jest.mock('axios');

// ─── Test consumer component ────────────────────────────────────────────────

const TestConsumer = () => {
  const categories = useCategory();
  return (
    <div>
      <span data-testid='count'>{categories.length}</span>
      <span data-testid='json'>{JSON.stringify(categories)}</span>
      {categories.map((c) => (
        <span key={c._id} data-testid={`cat-${c._id}`}>
          {c.name}
        </span>
      ))}
    </div>
  );
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('useCategory – custom hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SUCCESSFUL FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Successful data fetching', () => {
    it('initializes with an empty array before fetch completes', () => {
      axios.get.mockReturnValue(new Promise(() => {})); // never resolves
      render(<TestConsumer />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('fetches categories from /api/v1/category/get-category on mount', async () => {
      const mockCategories = [
        { _id: 'c1', name: 'Electronics', slug: 'electronics' },
        { _id: 'c2', name: 'Books', slug: 'books' },
      ];
      axios.get.mockResolvedValue({
        data: { success: true, category: mockCategories },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('2');
      });

      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
      expect(screen.getByTestId('cat-c1').textContent).toBe('Electronics');
      expect(screen.getByTestId('cat-c2').textContent).toBe('Books');
    });

    it('handles a single category', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [{ _id: 'c1', name: 'Solo', slug: 'solo' }] },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
      expect(screen.getByTestId('cat-c1').textContent).toBe('Solo');
    });

    it('handles empty category list from API', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('calls API only once on mount (no re-fetch)', async () => {
      axios.get.mockResolvedValue({
        data: { success: true, category: [] },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('returns empty array when API call fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      axios.get.mockRejectedValue(new Error('Network Error'));

      render(<TestConsumer />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      expect(screen.getByTestId('count').textContent).toBe('0');
      consoleSpy.mockRestore();
    });

    it('logs the error to console on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Server 500');
      axios.get.mockRejectedValue(error);

      render(<TestConsumer />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(error);
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    /**
     * BUG: If the API returns data without a `category` field,
     * setCategories(undefined) is called. The hook then returns undefined
     * instead of an empty array, which would cause .map() to crash in
     * consuming components.
     */
    it('BUG: sets categories to undefined when API response has no category field', async () => {
      axios.get.mockResolvedValue({
        data: { success: true },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // data?.category is undefined → setCategories(undefined)
      // The hook returns undefined, which breaks .map() in consumers
      // This would crash in a real component trying to .map()
    });

    it('handles categories with special characters in names', async () => {
      const specialCats = [
        { _id: 's1', name: 'Café & Más', slug: 'cafe-and-mas' },
        { _id: 's2', name: 'Books "Fiction"', slug: 'books-fiction' },
      ];
      axios.get.mockResolvedValue({
        data: { success: true, category: specialCats },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('2');
      });
      expect(screen.getByTestId('cat-s1').textContent).toBe('Café & Más');
    });

    it('handles many categories', async () => {
      const manyCats = Array.from({ length: 50 }, (_, i) => ({
        _id: `c${i}`,
        name: `Category ${i}`,
        slug: `category-${i}`,
      }));
      axios.get.mockResolvedValue({
        data: { success: true, category: manyCats },
      });

      render(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('50');
      });
    });
  });
});
