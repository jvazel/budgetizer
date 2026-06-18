import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  reorderAccounts,
  getCreditSummary
} from '../controllers/accountController.js';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Comptes
 *   description: Gestion des comptes bancaires (courants, épargne, crédit, etc.) et simulateurs associés
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreditDetails:
 *       type: object
 *       properties:
 *         initialAmount:
 *           type: number
 *           example: 15000
 *         interestRate:
 *           type: number
 *           example: 3.5
 *         durationMonths:
 *           type: number
 *           example: 48
 *         startDate:
 *           type: string
 *           format: date
 *           example: "2026-07-01"
 *         monthlyPayment:
 *           type: number
 *           readOnly: true
 *           example: 335.62
 *         scheduledTransactionId:
 *           type: string
 *           readOnly: true
 *           example: 60d21b4667d0d8992e610c99
 *     Account:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 60d21b4667d0d8992e610c88
 *         userId:
 *           type: string
 *           example: 60d21b4667d0d8992e610c85
 *         name:
 *           type: string
 *           example: Compte Courant
 *         type:
 *           type: string
 *           enum: [checking, savings, cash, credit, investment]
 *           example: checking
 *         balance:
 *           type: number
 *           example: 1250.45
 *         currency:
 *           type: string
 *           example: EUR
 *         color:
 *           type: string
 *           example: "#6366f1"
 *         icon:
 *           type: string
 *           example: wallet
 *         includeInTotal:
 *           type: boolean
 *           example: true
 *         creditLimit:
 *           type: number
 *           nullable: true
 *           example: null
 *         creditDetails:
 *           $ref: '#/components/schemas/CreditDetails'
 *         order:
 *           type: number
 *           example: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T16:30:00.000Z
 *     AccountInput:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: Compte Épargne
 *         type:
 *           type: string
 *           enum: [checking, savings, cash, credit, investment]
 *           example: savings
 *         balance:
 *           type: number
 *           example: 5000
 *         currency:
 *           type: string
 *           example: EUR
 *         color:
 *           type: string
 *           example: "#10b981"
 *         icon:
 *           type: string
 *           example: savings
 *         includeInTotal:
 *           type: boolean
 *           example: true
 *         sourceAccountId:
 *           type: string
 *           description: Requis uniquement si type = credit. ID du compte courant débité pour les mensualités.
 *           example: 60d21b4667d0d8992e610c88
 *         creditDetails:
 *           type: object
 *           description: Requis uniquement si type = credit.
 *           properties:
 *             initialAmount:
 *               type: number
 *               example: 20000
 *             interestRate:
 *               type: number
 *               example: 2.8
 *             durationMonths:
 *               type: number
 *               example: 60
 *             startDate:
 *               type: string
 *               format: date
 *               example: "2026-07-01"
 *     AmortizationPayment:
 *       type: object
 *       properties:
 *         transactionId:
 *           type: string
 *           example: 60d21b4667d0d8992e610d10
 *         date:
 *           type: string
 *           format: date-time
 *           example: 2026-07-01T08:00:00.000Z
 *         amount:
 *           type: number
 *           example: 357.82
 *         principalPart:
 *           type: number
 *           example: 311.15
 *         interestPart:
 *           type: number
 *           example: 46.67
 *         balanceAfter:
 *           type: number
 *           example: -19688.85
 *     CreditSummary:
 *       type: object
 *       properties:
 *         accountId:
 *           type: string
 *           example: 60d21b4667d0d8992e610c95
 *         accountName:
 *           type: string
 *           example: Prêt Auto
 *         initialAmount:
 *           type: number
 *           example: 20000
 *         currentBalance:
 *           type: number
 *           example: -19688.85
 *         capitalPaid:
 *           type: number
 *           example: 311.15
 *         capitalRemaining:
 *           type: number
 *           example: 19688.85
 *         interestRate:
 *           type: number
 *           example: 2.8
 *         monthlyPayment:
 *           type: number
 *           example: 357.82
 *         nextPaymentDate:
 *           type: string
 *           format: date-time
 *           example: 2026-08-01T08:00:00.000Z
 *         nextPaymentAmount:
 *           type: number
 *           example: 357.82
 *         progressPercentage:
 *           type: number
 *           example: 1.56
 *         monthsRemaining:
 *           type: number
 *           example: 59
 *         totalInterestPaid:
 *           type: number
 *           example: 46.67
 *         totalInterestEstimated:
 *           type: number
 *           example: 1469.20
 *         paymentsHistory:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AmortizationPayment'
 */

router.use(protect); // Protège toutes les routes des comptes

/**
 * @openapi
 * /api/accounts:
 *   get:
 *     summary: Récupérer tous les comptes de l'utilisateur
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des comptes retournée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 *   post:
 *     summary: Créer un nouveau compte
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       201:
 *         description: Compte créé avec succès (et échéancier de virement automatique configuré si type = credit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Données invalides ou manquantes (ex. compte source ou détails de crédit manquants pour un crédit)
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.route('/')
  .get(getAccounts)
  .post(
    [
      body('name', 'Name is required').not().isEmpty(),
      body('type', 'Type is required').isIn(['checking', 'savings', 'cash', 'credit', 'investment'])
    ],
    createAccount
  );

/**
 * @openapi
 * /api/accounts/reorder:
 *   patch:
 *     summary: Réorganiser l'ordre d'affichage des comptes
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderedIds
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tableau des IDs des comptes dans le nouvel ordre souhaité
 *                 example: ["60d21b4667d0d8992e610c88", "60d21b4667d0d8992e610c95"]
 *     responses:
 *       200:
 *         description: Ordre mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Accounts reordered successfully
 *       400:
 *         description: Requête mal formée ou invalide
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.patch('/reorder', reorderAccounts);

/**
 * @openapi
 * /api/accounts/{id}:
 *   put:
 *     summary: Modifier les informations d'un compte
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'identifiant unique du compte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountInput'
 *     responses:
 *       200:
 *         description: Compte mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       401:
 *         description: Non autorisé ou n'est pas le propriétaire du compte
 *       404:
 *         description: Compte non trouvé
 *       500:
 *         description: Erreur serveur
 *   delete:
 *     summary: Supprimer un compte
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'identifiant unique du compte
 *     responses:
 *       200:
 *         description: Compte supprimé avec succès (ainsi que les transactions et planifications associées)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account removed
 *       401:
 *         description: Non autorisé ou n'est pas le propriétaire du compte
 *       404:
 *         description: Compte non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.route('/:id')
  .put(updateAccount)
  .delete(deleteAccount);

/**
 * @openapi
 * /api/accounts/{id}/credit-summary:
 *   get:
 *     summary: Obtenir le récapitulatif détaillé d'un compte de type crédit et son tableau d'amortissement
 *     tags: [Comptes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: L'identifiant unique du compte crédit
 *     responses:
 *       200:
 *         description: Tableau d'amortissement et récapitulatif retournés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditSummary'
 *       400:
 *         description: Le compte spécifié n'est pas de type crédit
 *       401:
 *         description: Non autorisé ou n'est pas le propriétaire du compte
 *       404:
 *         description: Compte non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id/credit-summary', getCreditSummary);

export default router;

