import express from 'express';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getCredentials,
  deleteCredential
} from '../controllers/webauthnController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/register/options', protect, getRegistrationOptions);
router.post('/register/verify', protect, verifyRegistration);
router.post('/login/options', getAuthenticationOptions);
router.post('/login/verify', verifyAuthentication);
router.get('/credentials', protect, getCredentials);
router.delete('/credentials/:id', protect, deleteCredential);

export default router;
