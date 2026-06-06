import MonthlyReport from '../models/MonthlyReport.js';

/**
 * Invalide le rapport mensuel mis en cache pour un utilisateur et un mois donnés.
 * @param {string} userId - L'ID de l'utilisateur.
 * @param {Date|string} date - La date concernée.
 */
export const invalidateMonthlyReport = async (userId, date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return;
    
    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const result = await MonthlyReport.deleteOne({ userId, monthKey });
    if (result.deletedCount > 0) {
      console.log(`[CacheInvalidator] Invalidation du cache MonthlyReport réussie pour ${monthKey}`);
    }
  } catch (error) {
    console.error('[CacheInvalidator] Erreur lors de l\'invalidation du cache MonthlyReport:', error);
  }
};
