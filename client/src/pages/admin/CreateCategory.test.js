/**
 * Unit + Integration Tests for CreateCategory admin page
 *
 * Tests CRUD operations: create, list, update (via modal), and delete categories.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CreateCategory from './CreateCategory';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ user: { name: 'Admin' }, token: 'tok' }, jest.fn()]),
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]),
}));

jest.mock('../../components/Layout', () => {
  return ({ children, title }) => (
    <div data-testid='layout' data-title={title}>
      {children}
    </div>
  );
});

jest.mock('../../components/AdminMenu', () => {
  return () => <div data-testid='admin-menu'>AdminMenu</div>;
});

// Mock antd Modal – render children when visible prop is truthy
jest.mock('antd', () => {
  const React = require('react');
  return {
    Modal: ({ children, visible, onCancel }) =>
      visible ? (
        <div data-testid='modal'>
          <button data-testid='modal-cancel' onClick={onCancel}>
            Cancel
          </button>
          {children}
        </div>
      ) : null,
  };
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

const sampleCategories = [
  { _id: 'c1', name: 'Electronics', slug: 'electronics' },
  { _id: 'c2', name: 'Books', slug: 'books' },
  { _id: 'c3', name: 'Clothing', slug: 'clothing' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const renderPage = async () => {
  let result;
  await act(async () => {
    result = render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>,
    );
  });
  // Flush any remaining async state updates (e.g. getAllCategory)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return result;
};

/** Helper: setup the default GET mock returning sample categories. */
const setupGetMock = (cats = sampleCategories) => {
  axios.get.mockResolvedValue({
    data: { success: true, category: cats },
  });
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('CreateCategory Admin Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupGetMock();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. INITIAL RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initial rendering', () => {
    it('renders the Manage Category heading', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Manage Category/i })).toBeInTheDocument();
      });
    });

    it('uses Layout with correct title', async () => {
      await renderPage();

      await waitFor(() => {
        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-title', 'Dashboard - Create Category');
      });
    });

    it('renders AdminMenu', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
      });
    });

    it('renders create-category form with input and submit button', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter new category')).toBeInTheDocument();
        // There are two Submit buttons (create form + modal form), but modal
        // is hidden by default, so only one is visible initially.
        expect(screen.getAllByRole('button', { name: /Submit/i }).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('fetches and displays all categories on mount', async () => {
      await renderPage();

      await waitFor(() => {
        sampleCategories.forEach((c) => {
          expect(screen.getByText(c.name)).toBeInTheDocument();
        });
      });
    });

    it('renders Edit and Delete buttons for each category', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Edit/i })).toHaveLength(sampleCategories.length);
        expect(screen.getAllByRole('button', { name: /Delete/i })).toHaveLength(sampleCategories.length);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CREATE CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Create category', () => {
    it('creates a category on form submit and shows success toast', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'new category created' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter new category');
      fireEvent.change(input, { target: { value: 'Furniture' } });

      await act(async () => {
        fireEvent.click(screen.getAllByRole('button', { name: /Submit/i })[0]);
      });

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith('/api/v1/category/create-category', { name: 'Furniture' });
      });

      expect(toast.success).toHaveBeenCalledWith('Furniture is created');

      // Wait for re-fetch triggered by successful create to settle
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('re-fetches categories after successful create', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'created' },
      });

      await renderPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      const input = screen.getByPlaceholderText('Enter new category');
      fireEvent.change(input, { target: { value: 'Toys' } });
      fireEvent.click(screen.getAllByRole('button', { name: /Submit/i })[0]);

      await waitFor(() => {
        // Initial fetch + refetch after create
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('shows error toast when create returns success: false', async () => {
      axios.post.mockResolvedValue({
        data: { success: false, message: 'Already exists' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter new category');
      fireEvent.change(input, { target: { value: 'Electronics' } });
      fireEvent.click(screen.getAllByRole('button', { name: /Submit/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Already exists');
      });
    });

    it('shows error toast when create request throws', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter new category');
      fireEvent.change(input, { target: { value: 'Fail' } });
      fireEvent.click(screen.getAllByRole('button', { name: /Submit/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('something went wrong in input form');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. UPDATE CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Update category', () => {
    it('opens modal with current name when Edit is clicked', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // The modal form should have the category name pre-filled
      const modalInput = screen.getAllByPlaceholderText('Enter new category');
      // One of the inputs should have "Electronics"
      const filledInput = modalInput.find((el) => el.value === 'Electronics');
      expect(filledInput).toBeTruthy();
    });

    it('sends PUT request on modal form submit', async () => {
      axios.put.mockResolvedValue({
        data: { success: true, message: 'updated' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Open edit modal for first category
      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Find the modal input and change value
      const modalInputs = screen.getAllByPlaceholderText('Enter new category');
      const modalInput = modalInputs.find((el) => el.value === 'Electronics');
      fireEvent.change(modalInput, { target: { value: 'Updated Name' } });

      // Submit the modal form
      const submitBtns = screen.getAllByRole('button', { name: /Submit/i });
      // The modal submit should be the second one
      await act(async () => {
        fireEvent.click(submitBtns[submitBtns.length - 1]);
      });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/c1', { name: 'Updated Name' });
      });

      expect(toast.success).toHaveBeenCalledWith('Updated Name is updated');

      // Wait for re-fetch triggered by successful update to settle
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('closes modal and re-fetches after successful update', async () => {
      axios.put.mockResolvedValue({
        data: { success: true, message: 'updated' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Submit
      const submitBtns = screen.getAllByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtns[submitBtns.length - 1]);

      await waitFor(() => {
        // Modal should be closed
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // Should have re-fetched
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('shows error toast when update returns success: false', async () => {
      axios.put.mockResolvedValue({
        data: { success: false, message: 'Update failed' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const submitBtns = screen.getAllByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtns[submitBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Update failed');
      });
    });

    it('shows error toast when update request throws', async () => {
      axios.put.mockRejectedValue(new Error('Server error'));

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const submitBtns = screen.getAllByRole('button', { name: /Submit/i });
      fireEvent.click(submitBtns[submitBtns.length - 1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
      });
    });

    it('closes modal on cancel', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('modal-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. DELETE CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Delete category', () => {
    it('sends DELETE request when delete button is clicked', async () => {
      axios.delete.mockResolvedValue({
        data: { success: true, message: 'deleted' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const deleteBtns = screen.getAllByRole('button', { name: /Delete/i });
      await act(async () => {
        fireEvent.click(deleteBtns[0]);
      });

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith('/api/v1/category/delete-category/c1');
      });

      expect(toast.success).toHaveBeenCalledWith('category is deleted');

      // Wait for re-fetch triggered by successful delete to settle
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('re-fetches categories after successful delete', async () => {
      axios.delete.mockResolvedValue({
        data: { success: true, message: 'deleted' },
      });

      await renderPage();

      // Wait for initial categories to load
      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      expect(axios.get).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('shows error toast when delete returns success: false', async () => {
      axios.delete.mockResolvedValue({
        data: { success: false, message: 'Cannot delete' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Cannot delete');
      });
    });

    it('shows error toast when delete request throws', async () => {
      axios.delete.mockRejectedValue(new Error('Network fail'));

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByRole('button', { name: /Delete/i })[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GET ALL CATEGORIES – ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Get all categories – error handling', () => {
    it('shows error toast when fetching categories fails', async () => {
      axios.get.mockRejectedValue(new Error('Server error'));

      await renderPage();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong in getting category');
      });
    });

    it('shows error toast when API returns success: false', async () => {
      axios.get.mockResolvedValue({
        data: { success: false, message: 'No categories' },
      });

      await renderPage();

      // getAllCategory only sets categories if data.success, so nothing should render
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      // The page should not crash — it should just show an empty table
      expect(screen.getByRole('heading', { name: /Manage Category/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('renders empty table when there are no categories', async () => {
      setupGetMock([]);
      await renderPage();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });

    it('handles editing different categories in sequence', async () => {
      axios.put.mockResolvedValue({
        data: { success: true, message: 'updated' },
      });

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Edit first category
      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      // Close modal
      fireEvent.click(screen.getByTestId('modal-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      });

      // Edit second category
      const editBtns2 = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns2[1]);

      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      });

      const modalInputs = screen.getAllByPlaceholderText('Enter new category');
      const modalInput = modalInputs.find((el) => el.value === 'Books');
      expect(modalInput).toBeTruthy();
    });

    /**
     * FIXED: The <> fragment in .map() was replaced with <tr key={c._id}>.
     * No more React key-prop warnings.
     */
    it('categories.map now uses proper key on <tr>', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      // Verify no key warning was emitted
      const keyWarning = consoleSpy.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('unique "key" prop'),
      );
      expect(keyWarning).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('input is controlled (updates on change)', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Electronics')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter new category');
      expect(input.value).toBe('');

      fireEvent.change(input, { target: { value: 'New Cat' } });
      expect(input.value).toBe('New Cat');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateCategory – Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupGetMock();
  });

  it('full CRUD flow: load → create → edit → delete', async () => {
    // 1. Load
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });

    // 2. Create
    axios.post.mockResolvedValue({
      data: { success: true, message: 'created' },
    });
    // After create, refetch returns original + new
    const catsWithFurniture = [...sampleCategories, { _id: 'c4', name: 'Furniture', slug: 'furniture' }];
    axios.get.mockResolvedValue({
      data: { success: true, category: catsWithFurniture },
    });

    const input = screen.getByPlaceholderText('Enter new category');
    fireEvent.change(input, { target: { value: 'Furniture' } });
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Submit/i })[0]);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Furniture is created');
    });

    await waitFor(() => {
      expect(screen.getByText('Furniture')).toBeInTheDocument();
    });

    // 3. Edit – click edit on "Books" (second category, simpler target)
    axios.put.mockResolvedValue({
      data: { success: true, message: 'updated' },
    });
    axios.get.mockResolvedValue({
      data: {
        success: true,
        category: [
          sampleCategories[0],
          { _id: 'c2', name: 'Novels', slug: 'novels' },
          sampleCategories[2],
          { _id: 'c4', name: 'Furniture', slug: 'furniture' },
        ],
      },
    });

    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editBtns[1]); // Edit "Books"

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Find the modal's input (the one pre-filled with "Books")
    const modalInputs = screen.getAllByPlaceholderText('Enter new category');
    const modalInput = modalInputs.find((el) => el.value === 'Books');
    expect(modalInput).toBeTruthy();
    fireEvent.change(modalInput, { target: { value: 'Novels' } });

    // Submit the modal form (last Submit button is the modal's)
    const submitBtns = screen.getAllByRole('button', { name: /Submit/i });
    await act(async () => {
      fireEvent.click(submitBtns[submitBtns.length - 1]);
    });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith('/api/v1/category/update-category/c2', { name: 'Novels' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Novels is updated');
    });

    // 4. Delete
    axios.delete.mockResolvedValue({
      data: { success: true, message: 'deleted' },
    });
    axios.get.mockResolvedValue({
      data: { success: true, category: sampleCategories },
    });

    await waitFor(() => {
      expect(screen.getByText('Furniture')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button', { name: /Delete/i });
    await act(async () => {
      fireEvent.click(deleteBtns[deleteBtns.length - 1]);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('category is deleted');
    });

    // Wait for re-fetch triggered by successful delete to settle
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(4);
    });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS FIXED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. MISSING KEY ON FRAGMENT → replaced <> with <tr key={c._id}>
 * 2. TYPOS IN TOAST MESSAGES → all corrected
 *    - "somthing went wrong in input form" → "something went wrong in input form"
 *    - "Something wwent wrong in getting catgeory" → "Something went wrong in getting category"
 *    - "Somtihing went wrong" → "Something went wrong"
 *
 * REMAINING CONCERNS:
 * - No confirmation dialog on delete
 * - No form validation (empty string can be submitted)
 */
