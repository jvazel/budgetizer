import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter
} from '../savedFilterController';
import SavedFilter from '../../models/SavedFilter';

vi.mock('../../models/SavedFilter.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'sf_new_id',
      userId: this.userId,
      name: this.name,
      filters: this.filters
    });
  });

  const MockSavedFilter = vi.fn().mockImplementation(function(data) {
    return {
      _id: 'sf_new_id',
      ...data,
      save: mockSave
    };
  });

  MockSavedFilter.find = vi.fn();
  MockSavedFilter.findById = vi.fn();
  MockSavedFilter.findByIdAndDelete = vi.fn();

  return { default: MockSavedFilter };
});

describe('Saved Filter Controller', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: 'user_123' },
      body: {},
      params: {},
      query: {}
    };

    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
  });

  describe('getSavedFilters', () => {
    it('should retrieve saved filters sorted by date descending', async () => {
      const mockFilters = [{ _id: 'sf1', name: 'Alim', filters: { category: 'food' } }];
      SavedFilter.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockFilters)
      });

      await getSavedFilters(req, res);

      expect(SavedFilter.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(res.json).toHaveBeenCalledWith(mockFilters);
    });
  });

  describe('createSavedFilter', () => {
    it('should create a saved filter successfully', async () => {
      req.body = {
        name: 'Dépenses Loisirs',
        filters: { type: 'expense', category: 'loisir' }
      };

      await createSavedFilter(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'sf_new_id',
        name: 'Dépenses Loisirs'
      }));
    });

    it('should return 400 if name is missing', async () => {
      req.body = { filters: { type: 'expense' } };

      await createSavedFilter(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Name is required' });
    });
  });

  describe('updateSavedFilter', () => {
    it('should update filter if user is authorized owner', async () => {
      req.params.id = 'sf1';
      req.body = { name: 'Nouveau nom' };

      const mockExisting = {
        _id: 'sf1',
        userId: 'user_123',
        name: 'Ancien nom',
        save: vi.fn()
      };

      SavedFilter.findById.mockResolvedValue(mockExisting);

      await updateSavedFilter(req, res);

      expect(mockExisting.name).toBe('Nouveau nom');
      expect(mockExisting.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockExisting);
    });

    it('should return 401 if user is not the owner', async () => {
      req.params.id = 'sf1';
      req.body = { name: 'Nouveau nom' };

      const mockExisting = {
        _id: 'sf1',
        userId: 'user_other',
        name: 'Ancien nom'
      };

      SavedFilter.findById.mockResolvedValue(mockExisting);

      await updateSavedFilter(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
    });
  });

  describe('deleteSavedFilter', () => {
    it('should delete filter if user is authorized owner', async () => {
      req.params.id = 'sf1';

      const mockExisting = {
        _id: 'sf1',
        userId: 'user_123',
        name: 'Filtre'
      };

      SavedFilter.findById.mockResolvedValue(mockExisting);

      await deleteSavedFilter(req, res);

      expect(SavedFilter.findByIdAndDelete).toHaveBeenCalledWith('sf1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Filter removed' });
    });
  });
});
