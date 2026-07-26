import SavedFilter from '../models/SavedFilter';
import { AppRequest, AppResponse } from '../types';
import { logger } from '../utils/logger';

// @desc    Get user saved filters
// @route   GET /api/saved-filters
// @access  Private
export const getSavedFilters = async (req: AppRequest, res: AppResponse) => {
  try {
    const filters = await SavedFilter.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json(filters);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new saved filter
// @route   POST /api/saved-filters
// @access  Private
export const createSavedFilter = async (req: AppRequest, res: AppResponse) => {
  try {
    const { name, filters } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const savedFilter = new SavedFilter({
      userId: req.user!.id,
      name,
      filters
    });

    await savedFilter.save();
    res.status(201).json(savedFilter);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a saved filter
// @route   PUT /api/saved-filters/:id
// @access  Private
export const updateSavedFilter = async (req: AppRequest, res: AppResponse) => {
  try {
    const { name, filters } = req.body;
    const savedFilter = await SavedFilter.findById(req.params.id);

    if (!savedFilter) {
      return res.status(404).json({ message: 'Filter not found' });
    }

    // Verify ownership
    if (savedFilter.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (name) savedFilter.name = name;
    if (filters) savedFilter.filters = filters;

    await savedFilter.save();
    res.json(savedFilter);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a saved filter
// @route   DELETE /api/saved-filters/:id
// @access  Private
export const deleteSavedFilter = async (req: AppRequest, res: AppResponse) => {
  try {
    const savedFilter = await SavedFilter.findById(req.params.id);

    if (!savedFilter) {
      return res.status(404).json({ message: 'Filter not found' });
    }

    // Verify ownership
    if (savedFilter.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await SavedFilter.findByIdAndDelete(req.params.id);
    res.json({ message: 'Filter removed' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).json({ message: 'Server Error' });
  }
};
