import Category from '../models/Category.js';
import Transaction from '../models/Transaction.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import { validationResult } from 'express-validator';
import { invalidateDashboardCache } from './dashboardController.js';

// @desc    Get all categories for a user
// @route   GET /api/categories
// @access  Private
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id }).sort('order createdAt');
    res.json(categories);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
export const createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const categoryCount = await Category.countDocuments({ userId: req.user.id, parentId: req.body.parentId || null });
    
    const newCategory = new Category({
      ...req.body,
      userId: req.user.id,
      isDefault: false,
      order: categoryCount
    });

    const category = await newCategory.save();
    invalidateDashboardCache(req.user.id);
    res.status(201).json(category);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
export const updateCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Make sure user owns category
    if (category.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Only allow updating certain fields for default categories
    if (category.isDefault) {
      // For default categories, we might only allow changing color, order, or icon?
      // For now, let's allow everything but we might restrict later.
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    invalidateDashboardCache(req.user.id);
    res.json(category);
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Make sure user owns category
    if (category.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Prevent deletion of default categories
    if (category.isDefault) {
      return res.status(403).json({ message: 'Cannot delete default category' });
    }

    // Check if it has children
    const childrenCount = await Category.countDocuments({ parentId: req.params.id });
    if (childrenCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a category that has subcategories' });
    }

    // Check if used in transactions
    const transactionCount = await Transaction.countDocuments({ categoryId: req.params.id });
    if (transactionCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a category that is used in transactions' });
    }

    // Check if used in scheduled transactions
    const scheduledCount = await ScheduledTransaction.countDocuments({ categoryId: req.params.id });
    if (scheduledCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a category that is used in scheduled transactions' });
    }

    await Category.findByIdAndDelete(req.params.id);
    
    invalidateDashboardCache(req.user.id);
    res.json({ message: 'Category removed' });
  } catch (error) {
    console.error(error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
};
