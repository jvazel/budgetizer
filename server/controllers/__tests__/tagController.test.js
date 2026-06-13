import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag
} from '../tagController.js';
import Tag from '../../models/Tag.js';
import Transaction from '../../models/Transaction.js';

// Mock validation results
vi.mock('express-validator', () => ({
  validationResult: vi.fn().mockReturnValue({
    isEmpty: () => true,
    array: () => []
  })
}));

vi.mock('../../models/Tag.js', () => {
  const mockSave = vi.fn().mockImplementation(function() {
    return Promise.resolve({
      _id: 'tag_new_id',
      ...this
    });
  });

  const MockTag = vi.fn().mockImplementation(function(data) {
    return {
      ...data,
      save: mockSave
    };
  });

  MockTag.find = vi.fn();
  MockTag.findById = vi.fn();
  MockTag.findOne = vi.fn();
  MockTag.findByIdAndDelete = vi.fn();

  return { default: MockTag };
});

vi.mock('../../models/Transaction.js', () => ({
  default: {
    updateMany: vi.fn().mockResolvedValue({ nModified: 2 })
  }
}));

describe('Tag Controller', () => {
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

  describe('getTags', () => {
    it('should retrieve all tags for a user sorted by name', async () => {
      const mockTags = [
        { _id: 'tag1', name: 'Alimentation', color: '#EF4444' },
        { _id: 'tag2', name: 'Voyages', color: '#10B981' }
      ];

      const mockQuery = {
        sort: vi.fn().mockResolvedValue(mockTags)
      };
      Tag.find.mockReturnValue(mockQuery);

      await getTags(req, res);

      expect(Tag.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(mockQuery.sort).toHaveBeenCalledWith('name');
      expect(res.json).toHaveBeenCalledWith(mockTags);
    });
  });

  describe('createTag', () => {
    it('should create a new tag if name does not exist', async () => {
      req.body = { name: 'Vacances', color: '#3B82F6' };
      Tag.findOne.mockResolvedValue(null);

      await createTag(req, res);

      expect(Tag.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Vacances',
        color: '#3B82F6',
        userId: 'user_123'
      }));
    });

    it('should fail to create a tag with a duplicate name', async () => {
      req.body = { name: 'Vacances', color: '#3B82F6' };
      Tag.findOne.mockResolvedValue({ _id: 'existing_tag_id', name: 'Vacances' });

      await createTag(req, res);

      expect(Tag.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Un tag avec ce nom existe déjà.' });
    });

    it('should create a new tag with isArchived if specified', async () => {
      req.body = { name: 'Vacances', color: '#3B82F6', isArchived: true };
      Tag.findOne.mockResolvedValue(null);

      await createTag(req, res);

      expect(Tag.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Vacances',
        color: '#3B82F6',
        userId: 'user_123',
        isArchived: true
      }));
    });
  });

  describe('updateTag', () => {
    it('should update tag name and color successfully', async () => {
      req.params.id = 'tag_id_1';
      req.body = { name: 'Voyage Pro', color: '#9333EA' };

      const mockTag = {
        _id: 'tag_id_1',
        userId: 'user_123',
        name: 'Voyage',
        color: '#3B82F6',
        save: vi.fn().mockResolvedValue(true)
      };

      Tag.findById.mockResolvedValue(mockTag);
      Tag.findOne.mockResolvedValue(null); // No duplicate clash

      await updateTag(req, res);

      expect(mockTag.name).toBe('Voyage Pro');
      expect(mockTag.color).toBe('#9333EA');
      expect(mockTag.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTag);
    });

    it('should refuse update if user does not own the tag', async () => {
      req.params.id = 'tag_id_1';
      req.body = { name: 'Voyage Pro' };

      const mockTag = {
        _id: 'tag_id_1',
        userId: 'other_user',
        name: 'Voyage',
        save: vi.fn()
      };

      Tag.findById.mockResolvedValue(mockTag);

      await updateTag(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Non autorisé.' });
    });

    it('should update isArchived successfully', async () => {
      req.params.id = 'tag_id_1';
      req.body = { isArchived: true };

      const mockTag = {
        _id: 'tag_id_1',
        userId: 'user_123',
        name: 'Voyage',
        color: '#3B82F6',
        isArchived: false,
        save: vi.fn().mockResolvedValue(true)
      };

      Tag.findById.mockResolvedValue(mockTag);
      Tag.findOne.mockResolvedValue(null);

      await updateTag(req, res);

      expect(mockTag.isArchived).toBe(true);
      expect(mockTag.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTag);
    });
  });

  describe('deleteTag', () => {
    it('should delete tag and remove references from user transactions', async () => {
      req.params.id = 'tag_id_1';

      const mockTag = {
        _id: 'tag_id_1',
        userId: 'user_123',
        name: 'Voyage'
      };

      Tag.findById.mockResolvedValue(mockTag);

      await deleteTag(req, res);

      expect(Transaction.updateMany).toHaveBeenCalledWith(
        { userId: 'user_123', tags: 'tag_id_1' },
        { $pull: { tags: 'tag_id_1' } }
      );
      expect(Tag.findByIdAndDelete).toHaveBeenCalledWith('tag_id_1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Tag supprimé avec succès.' });
    });
  });
});
