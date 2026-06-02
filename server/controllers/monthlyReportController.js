import Transaction from '../models/Transaction.js';
import ScheduledTransaction from '../models/ScheduledTransaction.js';
import SavingsGoal from '../models/SavingsGoal.js';
import Budget from '../models/Budget.js';
import Category from '../models/Category.js';
import MonthlyReport from '../models/MonthlyReport.js';

const monthNamesFr = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// @desc    Obtenir ou générer le diagnostic proactif d'un mois spécifique
// @route   GET /api/monthly-reports/:monthKey
// @access  Private
export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { monthKey } = req.params; // Format: "YYYY-MM" (ex: "2026-05")

    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ message: 'Format de mois invalide. Attendu: YYYY-MM' });
    }

    const [yearNum, monthNum] = monthKey.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Déterminer si le mois est terminé
    const isCompletedMonth = yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth);

    // Si le mois est terminé, on vérifie s'il y a un rapport déjà mis en cache
    if (isCompletedMonth) {
      const cachedReport = await MonthlyReport.findOne({ userId, monthKey });
      if (cachedReport) {
        return res.json({ ...cachedReport.toObject(), isProvisional: false });
      }
    }

    // --- ÉTAPE 1 : PÉRIODES ---
    // Mois M (Sélectionné)
    const startOfM = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
    const endOfM = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

    // Mois M-1 (Précédent)
    const startOfPrev = new Date(Date.UTC(yearNum, monthNum - 2, 1, 0, 0, 0, 0));
    const endOfPrev = new Date(Date.UTC(yearNum, monthNum - 1, 0, 23, 59, 59, 999));

    // Historique glissant (M-3 à M-1) pour la moyenne des catégories
    const startOfHistory = new Date(Date.UTC(yearNum, monthNum - 4, 1, 0, 0, 0, 0));
    const endOfHistory = new Date(Date.UTC(yearNum, monthNum - 1, 0, 23, 59, 59, 999));

    // --- ÉTAPE 2 : CALCULS GLOBAUX ---
    // Transactions du mois M
    const txsM = await Transaction.find({
      userId,
      date: { $gte: startOfM, $lte: endOfM },
      isPending: { $ne: true }
    }).populate('categoryId');

    // Transactions du mois M-1
    const txsPrev = await Transaction.find({
      userId,
      date: { $gte: startOfPrev, $lte: endOfPrev },
      isPending: { $ne: true }
    });

    // Revenus & Dépenses Mois M
    let incomeM = 0;
    let expensesM = 0;
    txsM.forEach(tx => {
      if (tx.type === 'income') incomeM += tx.amount;
      else if (tx.type === 'expense') expensesM += tx.amount;
    });

    // Revenus & Dépenses Mois M-1
    let incomePrev = 0;
    let expensesPrev = 0;
    txsPrev.forEach(tx => {
      if (tx.type === 'income') incomePrev += tx.amount;
      else if (tx.type === 'expense') expensesPrev += tx.amount;
    });

    const netM = incomeM - expensesM;
    const savingsRate = incomeM > 0 ? (netM / incomeM) * 100 : 0;

    // Calcul de la variation globale des dépenses
    let globalExpenseChangeText = '';
    if (expensesPrev > 0) {
      const pct = ((expensesM - expensesPrev) / expensesPrev) * 100;
      if (pct < 0) {
        globalExpenseChangeText = `Tes dépenses globales ont diminué de **${Math.abs(pct).toFixed(1)}%** par rapport au mois dernier, ce qui est une excellente dynamique.`;
      } else if (pct > 0) {
        globalExpenseChangeText = `Tes dépenses ont augmenté de **${pct.toFixed(1)}%** comparé au mois précédent, ce qui réduit ta capacité d'épargne nette.`;
      } else {
        globalExpenseChangeText = `Tes dépenses globales sont restées parfaitement stables par rapport au mois dernier.`;
      }
    } else {
      globalExpenseChangeText = `Prends ce mois comme référence pour comparer tes futures dépenses mensuelles.`;
    }

    // --- ÉTAPE 3 : OBJECTIFS D'ÉPARGNE COMPLÉTÉS ---
    // Détecter si un objectif a été complété durant le mois M
    const savingsGoals = await SavingsGoal.find({ userId });
    let completedGoalName = null;

    for (const goal of savingsGoals) {
      // Si l'objectif est actuellement complété
      if (goal.currentAmount >= goal.targetAmount) {
        // Calculer les transferts effectués vers cet objectif depuis le début de M
        const transfersFromM = await Transaction.find({
          userId,
          savingsGoalId: goal._id,
          type: 'transfer',
          date: { $gte: startOfM },
          isPending: { $ne: true }
        });
        
        // Calculer les transferts effectués APRÈS la fin de M
        const transfersAfterM = await Transaction.find({
          userId,
          savingsGoalId: goal._id,
          type: 'transfer',
          date: { $gt: endOfM },
          isPending: { $ne: true }
        });

        const sumFromM = transfersFromM.reduce((sum, tx) => sum + tx.amount, 0);
        const sumAfterM = transfersAfterM.reduce((sum, tx) => sum + tx.amount, 0);

        // Montant à la fin du mois M-1 : Solde actuel - tous les transferts depuis M
        const amountAtEndOfPrev = goal.currentAmount - sumFromM - sumAfterM;
        // Montant à la fin du mois M : Solde actuel - tous les transferts après M
        const amountAtEndOfM = goal.currentAmount - sumAfterM;

        if (amountAtEndOfPrev < goal.targetAmount && amountAtEndOfM >= goal.targetAmount) {
          completedGoalName = goal.name;
          break; // On en sélectionne un pour le rapport
        }
      }
    }

    // --- ÉTAPE 4 : VARIATIONS D'ABONNEMENTS ---
    const subs = await ScheduledTransaction.find({ userId, isSubscription: true });
    let subChangeText = '';

    for (const sub of subs) {
      // Trouver les transactions réelles liées à cet abonnement en M et M-1
      const txM = await Transaction.findOne({
        userId,
        scheduledTransactionId: sub._id,
        date: { $gte: startOfM, $lte: endOfM },
        isPending: { $ne: true }
      });

      const txPrev = await Transaction.findOne({
        userId,
        scheduledTransactionId: sub._id,
        date: { $gte: startOfPrev, $lte: endOfPrev },
        isPending: { $ne: true }
      });

      if (txM && txPrev) {
        const diff = txM.amount - txPrev.amount;
        if (diff > 0.05) {
          subChangeText = `Ton abonnement **${sub.description}** a augmenté de **${diff.toFixed(2)} €** ce mois-ci (passant de ${txPrev.amount.toFixed(2)} € à ${txM.amount.toFixed(2)} €).`;
          break;
        } else if (diff < -0.05) {
          subChangeText = `Excellente nouvelle ! Ton abonnement **${sub.description}** a diminué de **${Math.abs(diff).toFixed(2)} €** ce mois-ci.`;
          break;
        }
      } else if (txM && !txPrev) {
        subChangeText = `Tu as souscrit à un nouvel abonnement : **${sub.description}** pour un montant de **${txM.amount.toFixed(2)} €**.`;
        break;
      } else if (!txM && txPrev && !sub.isActive) {
        subChangeText = `Tu as résilié avec succès ton abonnement **${sub.description}**, économisant **${txPrev.amount.toFixed(2)} €** ce mois-ci.`;
        break;
      }
    }

    // --- ÉTAPE 5 : TRANSACTIONS HORS NORMES (OUTLIERS) ---
    // Récupérer les transactions d'historique de référence (M-3 à M-1)
    const historyTxs = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: startOfHistory, $lte: endOfHistory },
      isPending: { $ne: true }
    });

    // Calculer le montant moyen d'une transaction de dépense par catégorie dans l'historique
    const categoryTxSums = {}; // catId -> totalAmount
    const categoryTxCounts = {}; // catId -> count
    historyTxs.forEach(tx => {
      if (!tx.categoryId) return;
      const catId = tx.categoryId.toString();
      categoryTxSums[catId] = (categoryTxSums[catId] || 0) + tx.amount;
      categoryTxCounts[catId] = (categoryTxCounts[catId] || 0) + 1;
    });

    const categoryTxAverages = {};
    Object.keys(categoryTxSums).forEach(catId => {
      categoryTxAverages[catId] = categoryTxSums[catId] / categoryTxCounts[catId];
    });

    let outlierTx = null;
    let maxOutlierRatio = 0;

    for (const tx of txsM) {
      if (tx.type !== 'expense' || !tx.categoryId) continue;
      const catId = tx.categoryId._id.toString();
      const avg = categoryTxAverages[catId];

      if (avg && avg > 0) {
        const ratio = tx.amount / avg;
        // Critère d'outlier: montant >= 3 fois la moyenne unitaire, montant >= 50 €
        if (ratio >= 3 && tx.amount >= 50 && ratio > maxOutlierRatio) {
          maxOutlierRatio = ratio;
          outlierTx = tx;
        }
      }
    }

    // --- ÉTAPE 6 : BUDGETS & VARIATIONS PAR CATÉGORIE ---
    // Dépenses de M par catégorie
    const catExpensesM = {};
    txsM.forEach(tx => {
      if (tx.type === 'expense' && tx.categoryId) {
        const catId = tx.categoryId._id.toString();
        catExpensesM[catId] = (catExpensesM[catId] || 0) + tx.amount;
      }
    });

    // Dépenses historiques moyennes par catégorie dans M-3 à M-1
    const catHistoryTotal = {};
    const catHistoryMonths = {}; // catId -> Set de mois uniques
    historyTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.categoryId) {
        const catId = tx.categoryId.toString();
        const txDate = new Date(tx.date);
        const mKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
        
        catHistoryTotal[catId] = (catHistoryTotal[catId] || 0) + tx.amount;
        if (!catHistoryMonths[catId]) catHistoryMonths[catId] = new Set();
        catHistoryMonths[catId].add(mKey);
      }
    });

    const catHistoryAverages = {};
    Object.keys(catHistoryTotal).forEach(catId => {
      const numMonths = catHistoryMonths[catId].size || 1;
      catHistoryAverages[catId] = catHistoryTotal[catId] / numMonths;
    });

    // Budgets définis
    const budgets = await Budget.find({ userId }).populate('categoryId');
    let exceededBudgetName = null;
    let exceededBudgetPercent = 0;
    let wellManagedBudgetName = null;
    let wellManagedBudgetPercent = 0;

    budgets.forEach(b => {
      if (b.period === 'monthly' && b.categoryId) {
        const catId = b.categoryId._id.toString();
        const spent = catExpensesM[catId] || 0;
        const pct = (spent / b.amount) * 100;

        if (pct > 100 && pct > exceededBudgetPercent) {
          exceededBudgetPercent = pct;
          exceededBudgetName = b.categoryId.name;
        } else if (pct < 85 && (pct < wellManagedBudgetPercent || wellManagedBudgetPercent === 0) && spent > 0) {
          wellManagedBudgetPercent = pct;
          wellManagedBudgetName = b.categoryId.name;
        }
      }
    });

    // Variations par catégorie
    let decreasedCategoryName = null;
    let decreasedCategoryPct = 0;
    let increasedCategoryName = null;
    let increasedCategoryPct = 0;

    Object.keys(catExpensesM).forEach(catId => {
      const spent = catExpensesM[catId];
      const avg = catHistoryAverages[catId];
      if (avg && avg > 10) { // Seuil pour ignorer les petites catégories
        const pctDiff = ((spent - avg) / avg) * 100;
        if (pctDiff < -15 && pctDiff < decreasedCategoryPct) {
          decreasedCategoryPct = pctDiff;
          // Trouver le nom de la catégorie
          const tx = txsM.find(t => t.categoryId && t.categoryId._id.toString() === catId);
          if (tx) decreasedCategoryName = tx.categoryId.name;
        } else if (pctDiff > 30 && pctDiff > increasedCategoryPct) {
          increasedCategoryPct = pctDiff;
          const tx = txsM.find(t => t.categoryId && t.categoryId._id.toString() === catId);
          if (tx) increasedCategoryName = tx.categoryId.name;
        }
      }
    });

    // --- ÉTAPE 7 : GÉNÉRATION DU TEXTE (MARKDOWN) ---
    const monthName = monthNamesFr[monthNum - 1];

    // PARAGRAPHE 1 : Bilan global
    const p1 = `En **${monthName} ${yearNum}**, tu as perçu un revenu total de **${incomeM.toFixed(2)} €** et réalisé **${expensesM.toFixed(2)} €** de dépenses, dégageant un solde net d'épargne de **${netM.toFixed(2)} €** (soit un taux d'épargne de **${savingsRate.toFixed(1)}%**). ${globalExpenseChangeText}`;

    // PARAGRAPHE 2 : Les Victoires 🎉
    let p2 = '';
    if (completedGoalName) {
      p2 += `Félicitations ! Ce mois-ci, tu as complété ton objectif d'épargne **🎯 ${completedGoalName}** en atteignant ta cible. C'est une immense victoire pour ton patrimoine ! `;
    } else {
      p2 += `Félicitations pour tes efforts de gestion ! `;
    }

    if (wellManagedBudgetName) {
      p2 += `Tu as particulièrement bien maîtrisé ton budget sur la catégorie **${wellManagedBudgetName}** avec seulement **${wellManagedBudgetPercent.toFixed(0)}%** de l'enveloppe consommée. `;
    } else if (decreasedCategoryName) {
      p2 += `Tu as réduit tes dépenses sur la catégorie **${decreasedCategoryName}** de **${Math.abs(decreasedCategoryPct).toFixed(0)}%** par rapport à tes habitudes historiques. `;
    } else {
      p2 += `Aucun dérapage de dépenses n'est à signaler sur tes postes majeurs, signe d'une belle discipline budgétaire générale. `;
    }

    if (subChangeText.includes('résilié') || subChangeText.includes('diminué')) {
      p2 += subChangeText;
    }

    // PARAGRAPHE 3 : Les points de vigilance ⚠️
    let p3 = '';
    if (outlierTx) {
      p3 += `Attention toutefois à certains écarts. Une transaction inhabituelle a été détectée : **${outlierTx.amount.toFixed(2)} €** pour "*${outlierTx.description}*" dans la catégorie **${outlierTx.categoryId.name}** (soit **${maxOutlierRatio.toFixed(1)} fois** le montant unitaire habituel). `;
    } else {
      p3 += `Quelques points nécessitent ta vigilance. `;
    }

    if (exceededBudgetName) {
      p3 += `Tu as dépassé ton budget mensuel pour **${exceededBudgetName}** qui finit à **${exceededBudgetPercent.toFixed(0)}%** de sa limite. `;
    } else if (increasedCategoryName) {
      p3 += `Les dépenses de ta catégorie **${increasedCategoryName}** ont connu une hausse de **${increasedCategoryPct.toFixed(0)}%** ce mois-ci. `;
    }

    if (subChangeText.includes('augmenté') || subChangeText.includes('nouvel')) {
      p3 += `Prends également note de ceci : ${subChangeText}`;
    } else if (!outlierTx && !exceededBudgetName && !increasedCategoryName) {
      p3 = `Excellent travail ! Aucun dépassement de budget ni transaction hors normes n'a été signalé ce mois-ci. Tes finances restent sous contrôle.`;
    }

    const reportText = `${p1}\n\n${p2}\n\n${p3}`;

    const reportData = {
      userId,
      monthKey,
      reportText,
      financialStats: {
        income: parseFloat(incomeM.toFixed(2)),
        expenses: parseFloat(expensesM.toFixed(2)),
        net: parseFloat(netM.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(1))
      }
    };

    // Si le mois est terminé, on enregistre (cache) le rapport généré
    if (isCompletedMonth) {
      const newReport = new MonthlyReport(reportData);
      await newReport.save();
      return res.status(201).json({ ...reportData, isProvisional: false });
    }

    // Sinon, on renvoie une version provisoire à la volée
    return res.json({ ...reportData, isProvisional: true });

  } catch (error) {
    console.error('Erreur génération rapport mensuel:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la génération du rapport.' });
  }
};
