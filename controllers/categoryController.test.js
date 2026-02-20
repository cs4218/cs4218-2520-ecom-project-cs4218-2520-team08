/**
 * Unit Tests for categoryController.js
 *
 * Tests all 5 controller methods: create, update, getAll, single, delete.
 * Documents bugs found in the source code.
 */

import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} from './categoryController';
import categoryModel from '../models/categoryModel.js';
import slugify from 'slugify';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../models/categoryModel.js');
jest.mock('slugify');

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('categoryController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slugify.mockImplementation((name) => name.toLowerCase().replace(/\s+/g, '-'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. createCategoryController
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createCategoryController', () => {
    it('returns 401 when name is not provided', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
    });

    it('returns 401 when name is empty string', async () => {
      const req = mockReq({ body: { name: '' } });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ message: 'Name is required' });
    });

    /**
     * FIXED: When a duplicate category exists, the controller now returns
     * status 409 (Conflict) with success: false.
     */
    it('returns 409 with success: false for duplicate category', async () => {
      categoryModel.findOne.mockResolvedValue({
        _id: 'existing',
        name: 'Electronics',
      });

      const req = mockReq({ body: { name: 'Electronics' } });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Category Already Exists',
      });
    });

    it('creates category with slugified name and returns 201', async () => {
      categoryModel.findOne.mockResolvedValue(null);

      const savedCategory = {
        _id: 'new1',
        name: 'Electronics',
        slug: 'electronics',
      };
      // controller uses categoryModel.create()
      categoryModel.create = jest.fn().mockResolvedValue(savedCategory);

      const req = mockReq({ body: { name: 'Electronics' } });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith('Electronics');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'new category created',
        category: savedCategory,
      });
    });

    it('checks for existing category before creating', async () => {
      categoryModel.findOne.mockResolvedValue(null);
      categoryModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({ _id: 'id', name: 'Test', slug: 'test' }),
      }));

      const req = mockReq({ body: { name: 'Test' } });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ name: 'Test' });
    });

    /**
     * FIXED: The catch block now correctly references `error` and
     * sends a proper 500 response.
     */
    it('returns 500 on database error', async () => {
      const dbError = new Error('DB error');
      categoryModel.findOne.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const req = mockReq({ body: { name: 'Test' } });
      const res = mockRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error in Category',
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. updateCategoryController
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateCategoryController', () => {
    it('updates category by ID and returns 200', async () => {
      const updated = { _id: 'c1', name: 'Updated', slug: 'updated' };
      categoryModel.findByIdAndUpdate.mockResolvedValue(updated);

      const req = mockReq({
        body: { name: 'Updated' },
        params: { id: 'c1' },
      });
      const res = mockRes();

      await updateCategoryController(req, res);

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        { name: 'Updated', slug: 'updated' },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Category Updated Successfully',
        category: updated,
      });
    });

    it('uses slugify for the new slug', async () => {
      categoryModel.findByIdAndUpdate.mockResolvedValue({});

      const req = mockReq({
        body: { name: 'My Category' },
        params: { id: 'c1' },
      });
      const res = mockRes();

      await updateCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith('My Category');
    });

    it('returns 500 on database error', async () => {
      const dbError = new Error('DB fail');
      categoryModel.findByIdAndUpdate.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const req = mockReq({
        body: { name: 'Test' },
        params: { id: 'c1' },
      });
      const res = mockRes();

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error while updating category',
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. categoryControlller (get all)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('categoryControlller (get all)', () => {
    it('returns all categories with status 200', async () => {
      const cats = [
        { _id: 'c1', name: 'A', slug: 'a' },
        { _id: 'c2', name: 'B', slug: 'b' },
      ];
      categoryModel.find.mockResolvedValue(cats);

      const req = mockReq();
      const res = mockRes();

      await categoryControlller(req, res);

      expect(categoryModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'All Categories List',
        category: cats,
      });
    });

    it('returns empty array when no categories exist', async () => {
      categoryModel.find.mockResolvedValue([]);

      const req = mockReq();
      const res = mockRes();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'All Categories List',
        category: [],
      });
    });

    it('returns 500 on database error', async () => {
      const dbError = new Error('Connection lost');
      categoryModel.find.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const req = mockReq();
      const res = mockRes();

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error while getting all categories',
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. singleCategoryController
  // ═══════════════════════════════════════════════════════════════════════════

  describe('singleCategoryController', () => {
    it('returns single category by slug with status 200', async () => {
      const cat = { _id: 'c1', name: 'Electronics', slug: 'electronics' };
      categoryModel.findOne.mockResolvedValue(cat);

      const req = mockReq({ params: { slug: 'electronics' } });
      const res = mockRes();

      await singleCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({
        slug: 'electronics',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Get Single Category Successfully',
        category: cat,
      });
    });

    it('returns null category when slug not found', async () => {
      categoryModel.findOne.mockResolvedValue(null);

      const req = mockReq({ params: { slug: 'nonexistent' } });
      const res = mockRes();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Get Single Category Successfully',
        category: null,
      });
    });

    it('returns 500 on database error', async () => {
      const dbError = new Error('DB error');
      categoryModel.findOne.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const req = mockReq({ params: { slug: 'test' } });
      const res = mockRes();

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error While getting Single Category',
      });

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. deleteCategoryCOntroller
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteCategoryCOntroller', () => {
    it('deletes category by ID and returns 200', async () => {
      categoryModel.findByIdAndDelete.mockResolvedValue({
        _id: 'c1',
        name: 'Electronics',
      });

      const req = mockReq({ params: { id: 'c1' } });
      const res = mockRes();

      await deleteCategoryCOntroller(req, res);

      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Category Deleted Successfully',
      });
    });

    it('returns 500 on database error', async () => {
      const dbError = new Error('Cannot delete');
      categoryModel.findByIdAndDelete.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const req = mockReq({ params: { id: 'c1' } });
      const res = mockRes();

      await deleteCategoryCOntroller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'error while deleting category',
        error: dbError,
      });

      consoleSpy.mockRestore();
    });

    it('does not throw when category ID does not exist', async () => {
      categoryModel.findByIdAndDelete.mockResolvedValue(null);

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();

      await deleteCategoryCOntroller(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Category Deleted Successfully',
      });
    });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * BUGS FIXED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. TYPO `errro` IN createCategoryController CATCH BLOCK → fixed to `error`
 * 2. DUPLICATE CATEGORY RETURNS 200 + success:true → fixed to 409 + success:false
 * 3. TYPO `messsage` IN updateCategoryController → fixed to `message`
 * 4. TYPOS IN RESPONSE MESSAGES → all fixed
 *    - "Category Already Exisits" → "Category Already Exists"
 *    - "Categry Deleted Successfully" → "Category Deleted Successfully"
 *    - "Get SIngle Category SUccessfully" → "Get Single Category Successfully"
 *    - "Errro in Category" → "Error in Category"
 *
 * REMAINING CONCERNS (not fixed — would require broader refactoring):
 * - Function name typos: categoryControlller, deleteCategoryCOntroller
 *   (changing exports would break routes and other consumers)
 * - No validation in updateCategoryController for empty name
 * - singleCategoryController returns 200 for not-found slugs
 * - deleteCategoryCOntroller returns 200 for non-existent IDs
 */
