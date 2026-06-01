import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getCategories, createCategory, deleteCategory } from '../categoryController.js';
import Category from '../../models/Category.js';

vi.mock('../../models/Category.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'new_cat_123',
      name: this.name,
      userId: this.userId,
      parentId: this.parentId || null,
      isDefault: this.isDefault,
      order: this.order
    });
  });

  const MockCategory = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockCategory.find = vi.fn();
  MockCategory.countDocuments = vi.fn();
  MockCategory.findById = vi.fn();
  MockCategory.findByIdAndDelete = vi.fn();
  
  return { default: MockCategory };
});

describe('Category Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      user: { id: 'user_123' },
      params: {},
      body: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getCategories', () => {
    it('should fetch user categories sorted by order/createdAt', async () => {
      const mockCats = [{ name: 'Alimentation', userId: 'user_123' }];
      Category.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockCats)
      });

      await getCategories(req, res);

      expect(Category.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(res.json).toHaveBeenCalledWith(mockCats);
    });
  });

  describe('createCategory', () => {
    it('should create a subcategory with correct order value', async () => {
      req.body = {
        name: 'Resto',
        parentId: 'parent_abc',
        type: 'expense'
      };

      Category.countDocuments.mockResolvedValue(3); // 3 items already exist

      await createCategory(req, res);

      expect(Category.countDocuments).toHaveBeenCalledWith({ userId: 'user_123', parentId: 'parent_abc' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Resto',
        userId: 'user_123',
        parentId: 'parent_abc',
        order: 3,
        isDefault: false
      }));
    });
  });

  describe('deleteCategory', () => {
    it('should block deletion of default categories', async () => {
      req.params.id = 'default_cat_id';
      
      const mockCategory = {
        _id: 'default_cat_id',
        userId: { toString: () => 'user_123' },
        isDefault: true
      };

      Category.findById.mockResolvedValue(mockCategory);

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete default category' });
      expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should block deletion if the category has subcategories', async () => {
      req.params.id = 'parent_cat_id';
      
      const mockCategory = {
        _id: 'parent_cat_id',
        userId: { toString: () => 'user_123' },
        isDefault: false
      };

      Category.findById.mockResolvedValue(mockCategory);
      Category.countDocuments.mockResolvedValue(2); // Has 2 subcategories

      await deleteCategory(req, res);

      expect(Category.countDocuments).toHaveBeenCalledWith({ parentId: 'parent_cat_id' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Cannot delete a category that has subcategories' });
      expect(Category.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('should delete own custom categories if they have no subcategories', async () => {
      req.params.id = 'custom_cat_id';
      
      const mockCategory = {
        _id: 'custom_cat_id',
        userId: { toString: () => 'user_123' },
        isDefault: false
      };

      Category.findById.mockResolvedValue(mockCategory);
      Category.countDocuments.mockResolvedValue(0); // No subcategories

      await deleteCategory(req, res);

      expect(Category.findByIdAndDelete).toHaveBeenCalledWith('custom_cat_id');
      expect(res.json).toHaveBeenCalledWith({ message: 'Category removed' });
    });
  });
});
