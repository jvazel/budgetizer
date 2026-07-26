import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getCredentials,
  deleteCredential
} from '../controllers/webauthnController';

const router = express.Router();

router.get('/register/options', protect, getRegistrationOptions);
router.post('/register/verify', protect, verifyRegistration);
router.post('/login/options', getAuthenticationOptions);
router.post('/login/verify', verifyAuthentication);
router.get('/credentials', protect, getCredentials);
router.delete('/credentials/:id', protect, deleteCredential);

export default router;
