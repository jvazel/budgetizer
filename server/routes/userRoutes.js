import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';
import {
  updateProfile,
  updatePassword,
  updatePreferences,
  deleteMyAccount,
  clearMyData
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.put(
  '/profile',
  [
    body('name', 'Le nom ne peut pas être vide').optional().not().isEmpty(),
    body('email', 'Veuillez inclure un email valide').optional().isEmail()
  ],
  updateProfile
);

router.put(
  '/password',
  [
    body('oldPassword', 'L\'ancien mot de passe est requis').not().isEmpty(),
    body('newPassword', 'Le nouveau mot de passe doit contenir au moins 6 caractères').isLength({ min: 6 })
  ],
  updatePassword
);

router.put('/preferences', updatePreferences);
router.delete('/me', deleteMyAccount);
router.delete('/clear', clearMyData);

export default router;
