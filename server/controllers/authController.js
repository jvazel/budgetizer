import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { sendEmail } from '../utils/sendEmail.js';

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
      res.status(401).json({ message: 'Adresse e-mail ou mot de passe incorrect.' });
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

// @desc    Forgot password - request reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Return 200 for security to prevent email enumeration
      return res.json({ message: 'Si un compte est associé à cet e-mail, un message y a été envoyé.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set expire
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : 'http://localhost:5173')
      : 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const messageText = `Vous recevez cet e-mail suite à une demande de réinitialisation de mot de passe pour votre compte Budgetizer.\n\nVeuillez cliquer sur le lien suivant (ou le copier-coller dans votre navigateur) pour terminer le processus :\n\n${resetLink}\n\nCe lien expirera dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet e-mail.`;

    const messageHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #111; color: #fff;">
        <h2 style="color: #4ade80; text-align: center;">Réinitialisation de mot de passe Budgetizer 💰</h2>
        <p>Bonjour,</p>
        <p>Vous recevez cet e-mail car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4ade80; color: black; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
        </p>
        <p style="font-size: 11px; color: #a0aec0; text-align: center;">Ce lien est valable pendant 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe Budgetizer 🔑',
      text: messageText,
      html: messageHtml
    });

    res.json({ message: 'Si un compte est associé à cet e-mail, un message y a été envoyé.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { password } = req.body;

  try {
    // Hash token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Jeton de réinitialisation invalide ou expiré.' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear reset token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};
