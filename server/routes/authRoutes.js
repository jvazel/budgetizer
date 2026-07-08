import express from 'express';
import { registerUser, loginUser, logoutUser, setTokenCookie, getMe, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Authentification
 *   description: Gestion des utilisateurs, sessions et réinitialisation de mot de passe
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Currency:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           default: EUR
 *           example: EUR
 *         symbol:
 *           type: string
 *           default: €
 *           example: €
 *     UserPreferences:
 *       type: object
 *       properties:
 *         theme:
 *           type: string
 *           enum: [dark, light, system]
 *           default: dark
 *           example: dark
 *         dateFormat:
 *           type: string
 *           default: DD/MM/YYYY
 *           example: DD/MM/YYYY
 *         language:
 *           type: string
 *           default: fr
 *           example: fr
 *         firstDayOfWeek:
 *           type: number
 *           default: 1
 *           example: 1
 *         anomalyThreshold:
 *           type: number
 *           default: 30
 *           example: 30
 *         lowBalanceThreshold:
 *           type: number
 *           default: 100
 *           example: 100
 *         enableBudgetAlerts:
 *           type: boolean
 *           default: true
 *           example: true
 *         enableScheduledAlerts:
 *           type: boolean
 *           default: true
 *           example: true
 *         enableSavingsAlerts:
 *           type: boolean
 *           default: true
 *           example: true
 *         enableLowBalanceAlerts:
 *           type: boolean
 *           default: true
 *           example: true
 *         enableAiInsightsAlerts:
 *           type: boolean
 *           default: true
 *           example: true
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 60d21b4667d0d8992e610c85
 *         name:
 *           type: string
 *           example: Jean Dupont
 *         email:
 *           type: string
 *           example: jean.dupont@example.com
 *         currency:
 *           $ref: '#/components/schemas/Currency'
 *         preferences:
 *           $ref: '#/components/schemas/UserPreferences'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T16:30:00.000Z
 *     AuthResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 60d21b4667d0d8992e610c85
 *         name:
 *           type: string
 *           example: Jean Dupont
 *         email:
 *           type: string
 *           example: jean.dupont@example.com
 *         currency:
 *           $ref: '#/components/schemas/Currency'
 *         preferences:
 *           $ref: '#/components/schemas/UserPreferences'
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Inscrire un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jean Dupont
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "motdepasse123"
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Données invalides (champs manquants ou format incorrect) ou utilisateur déjà existant
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  registerUser
);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "motdepasse123"
 *     responses:
 *       200:
 *         description: Connexion réussie, renvoie les données utilisateur et le token JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Format d'email ou de mot de passe invalide
 *       401:
 *         description: Identifiants (adresse e-mail ou mot de passe) incorrects
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists()
  ],
  loginUser
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Récupérer les informations de l'utilisateur connecté
 *     tags: [Authentification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil de l'utilisateur retourné avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non autorisé (token absent, invalide ou expiré)
 *       500:
 *         description: Erreur serveur
 */
router.get('/me', protect, getMe);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demander le jeton de réinitialisation de mot de passe par e-mail
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@example.com
 *     responses:
 *       200:
 *         description: Message de confirmation de l'envoi (renvoyé systématiquement pour des raisons de sécurité)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Si un compte est associé à cet e-mail, un message y a été envoyé.
 *       400:
 *         description: Email non fourni ou mal formatté
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/forgot-password',
  [
    body('email', 'Please include a valid email').isEmail()
  ],
  forgotPassword
);

/**
 * @openapi
 * /api/auth/reset-password/{token}:
 *   post:
 *     summary: Réinitialiser le mot de passe avec le token reçu par e-mail
 *     tags: [Authentification]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Le token unique envoyé par email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "nouveaumotdepasse123"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mot de passe réinitialisé avec succès.
 *       400:
 *         description: Token invalide ou expiré, ou mot de passe trop court
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/reset-password/:token',
  [
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  resetPassword
);

router.post('/logout', logoutUser);
router.post('/set-cookie', setTokenCookie);

export default router;

