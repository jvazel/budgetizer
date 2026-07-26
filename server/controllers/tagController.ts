import Tag from '../models/Tag';
import Transaction from '../models/Transaction';
import { validationResult } from 'express-validator';
import { AppRequest, AppResponse } from '../types';
import { logger } from '../utils/logger';

// @desc    Get all tags for a user
// @route   GET /api/tags
// @access  Private
export const getTags = async (req: AppRequest, res: AppResponse) => {
  try {
    const tags = await Tag.find({ userId: req.user!.id }).sort('name');
    res.json(tags);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new tag
// @route   POST /api/tags
// @access  Private
export const createTag = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, color, isArchived } = req.body;

  try {
    const cleanName = name.trim();
    // Case-insensitive check for duplicate name for this user
    const existingTag = await Tag.findOne({
      userId: req.user!.id,
      name: { $regex: new RegExp(`^${cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });

    if (existingTag) {
      return res.status(400).json({ message: 'Un tag avec ce nom existe déjà.' });
    }

    const newTag = new Tag({
      userId: req.user!.id,
      name: cleanName,
      color: color || '#3B82F6',
      isArchived: isArchived === true
    });

    const tag = await newTag.save();
    res.status(201).json(tag);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a tag
// @route   PUT /api/tags/:id
// @access  Private
export const updateTag = async (req: AppRequest, res: AppResponse) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, color, isArchived } = req.body;

  try {
    let tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag non trouvé.' });
    }

    if (tag.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    if (name) {
      const cleanName = name.trim();
      // Verify duplicate tag name with other tags
      const duplicateTag = await Tag.findOne({
        userId: req.user!.id,
        _id: { $ne: tag._id },
        name: { $regex: new RegExp(`^${cleanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      });

      if (duplicateTag) {
        return res.status(400).json({ message: 'Un tag avec ce nom existe déjà.' });
      }
      tag.name = cleanName;
    }

    if (color) {
      tag.color = color;
    }

    if (typeof isArchived === 'boolean') {
      tag.isArchived = isArchived;
    }

    await tag.save();
    res.json(tag);
  } catch (error: unknown) {
    logger.error((error as Error).message);
    if ((error as { kind?: string }).kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tag non trouvé.' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a tag
// @route   DELETE /api/tags/:id
// @access  Private
export const deleteTag = async (req: AppRequest, res: AppResponse) => {
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag non trouvé.' });
    }

    if (tag.userId.toString() !== req.user!.id) {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    // Cascade/Cleanup: Remove reference from all transactions of the user
    await Transaction.updateMany(
      { userId: req.user!.id, tags: tag._id },
      { $pull: { tags: tag._id } }
    );

    await Tag.findByIdAndDelete(tag._id);
    res.json({ message: 'Tag supprimé avec succès.' });
  } catch (error: unknown) {
    logger.error((error as Error).message);
    if ((error as { kind?: string }).kind === 'ObjectId') {
      return res.status(404).json({ message: 'Tag non trouvé.' });
    }
    res.status(500).send('Server Error');
  }
};
