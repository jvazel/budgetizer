import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Category from '../models/Category.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const defaultCategories = [
  { name: 'Alimentation', type: 'expense', icon: '🍔', color: '#f97316' },
  { name: 'Logement', type: 'expense', icon: '🏠', color: '#6366f1' },
  { name: 'Transport', type: 'expense', icon: '🚗', color: '#14b8a6' },
  { name: 'Santé', type: 'expense', icon: '🏥', color: '#ec4899' },
  { name: 'Loisirs', type: 'expense', icon: '🎭', color: '#8b5cf6' },
  { name: 'Shopping', type: 'expense', icon: '👕', color: '#f59e0b' },
  { name: 'Abonnements', type: 'expense', icon: '📱', color: '#06b6d4' },
  { name: 'Éducation', type: 'expense', icon: '🎓', color: '#84cc16' },
  { name: 'Voyages', type: 'expense', icon: '✈️', color: '#3b82f6' },
  { name: 'Autre', type: 'expense', icon: '📦', color: '#6b7280' },
  { name: 'Salaire', type: 'income', icon: '💼', color: '#4ade80' },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#4ade80' },
  { name: 'Investissements', type: 'income', icon: '📈', color: '#4ade80' },
  { name: 'Remboursements', type: 'income', icon: '🔄', color: '#4ade80' },
  { name: 'Cadeaux', type: 'income', icon: '🎁', color: '#4ade80' },
  { name: 'Autre revenu', type: 'income', icon: '💰', color: '#4ade80' }
];

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      // Seed default categories
      const categoriesToCreate = defaultCategories.map(cat => ({
        ...cat,
        userId: user._id,
        isDefault: true
      }));
      
      await Category.insertMany(categoriesToCreate);

      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        currency: user.currency,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        currency: user.currency,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};
