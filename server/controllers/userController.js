import User from '../models/User.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Category from '../models/Category.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import SavedFilter from '../models/SavedFilter.js';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';

// 1. Update Profile (Name & Email)
export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      preferences: user.preferences
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur Serveur' });
  }
};

// 2. Change Password
export const updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Veuillez saisir l\'ancien et le nouveau mot de passe' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'L\'ancien mot de passe est incorrect' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur Serveur' });
  }
};

// 3. Update Preferences (Currency, theme, dateformat, etc)
export const updatePreferences = async (req, res) => {
  try {
    const { currency, theme, dateFormat, language, firstDayOfWeek } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (currency) {
      user.currency = {
        code: currency.code || user.currency.code,
        symbol: currency.symbol || user.currency.symbol
      };
    }

    if (user.preferences) {
      if (theme) user.preferences.theme = theme;
      if (dateFormat) user.preferences.dateFormat = dateFormat;
      if (language) user.preferences.language = language;
      if (firstDayOfWeek !== undefined) user.preferences.firstDayOfWeek = firstDayOfWeek;
    } else {
      user.preferences = {
        theme: theme || 'dark',
        dateFormat: dateFormat || 'DD/MM/YYYY',
        language: language || 'fr',
        firstDayOfWeek: firstDayOfWeek !== undefined ? firstDayOfWeek : 1
      };
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      preferences: user.preferences
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur Serveur' });
  }
};

// 4. Delete My Account (RGPD Complete Cascade Delete)
export const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete everything in cascade
    await Transaction.deleteMany({ userId });
    await ScheduledTransaction.deleteMany({ userId });
    await Budget.deleteMany({ userId });
    await Category.deleteMany({ userId });
    await Account.deleteMany({ userId });
    await SavedFilter.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Compte et données supprimés en cascade avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur Serveur' });
  }
};

// 5. Clear All My Financial Data (keeps user profile)
export const clearMyData = async (req, res) => {
  try {
    const userId = req.user.id;
    await Transaction.deleteMany({ userId });
    await ScheduledTransaction.deleteMany({ userId });
    await Budget.deleteMany({ userId });
    await Category.deleteMany({ userId });
    await Account.deleteMany({ userId });
    await SavedFilter.deleteMany({ userId });

    res.json({ message: 'Toutes les données financières ont été effacées avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur Serveur' });
  }
};
