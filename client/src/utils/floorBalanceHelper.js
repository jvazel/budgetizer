/**
 * Détermine la date estimée de la prochaine paye (prochain revenu majeur).
 * @param {Date} today - Date actuelle
 * @param {Array} upcomingIncomes - Liste des revenus planifiés à venir
 * @param {number|string|null} userConfiguredDay - Jour du mois configuré par l'utilisateur (1-31) ou 'auto'
 * @returns {Date} La date de la prochaine paye
 */
export const getEstimatedPaycheckDate = (today = new Date(), upcomingIncomes = [], userConfiguredDay = null) => {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  // 1. Si l'utilisateur a configuré un jour spécifique
  if (userConfiguredDay !== null && userConfiguredDay !== undefined && userConfiguredDay !== 'auto') {
    const day = parseInt(userConfiguredDay, 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      let targetYear = currentYear;
      let targetMonth = currentMonth;

      if (currentDate >= day) {
        // La paye est déjà passée ce mois-ci, donc on vise le mois prochain
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
      }

      // Gérer la fin de mois (ex: 31 février ou 31 avril)
      const targetDate = new Date(targetYear, targetMonth, day);
      if (targetDate.getMonth() !== (targetMonth % 12)) {
        // On retombe sur le dernier jour du mois visé
        return new Date(targetYear, targetMonth + 1, 0);
      }
      return targetDate;
    }
  }

  // 2. Détection automatique via les revenus planifiés à venir
  const incomes = upcomingIncomes.filter(t => t.type === 'income');
  if (incomes.length > 0) {
    // Trouver le revenu majeur (le plus gros montant)
    const majorIncome = incomes.reduce((max, t) => t.amount > max.amount ? t : max, incomes[0]);
    return new Date(majorIncome.date);
  }

  // 3. Comportement par défaut (25 du mois courant ou 1er du mois suivant)
  if (currentDate < 25) {
    return new Date(currentYear, currentMonth, 25);
  } else {
    // 1er du mois suivant
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    return new Date(nextYear, nextMonth, 1);
  }
};

/**
 * Calcule le Solde Plancher (Vrai Disponible).
 * @param {number} actualBalance - Le solde bancaire actuel de l'utilisateur
 * @param {Date} today - Date du jour
 * @param {Array} upcomingExpenses - Dépenses planifiées à venir
 * @param {Date} nextPaycheckDate - Date de la prochaine paye estimée
 * @param {Array<string>} excludedIds - Identifiants des échéances cochées/exclues par l'utilisateur
 * @returns {number} Le solde plancher
 */
export const calculateFloorBalance = (
  actualBalance,
  today = new Date(),
  upcomingExpenses = [],
  nextPaycheckDate = null,
  excludedIds = []
) => {
  if (nextPaycheckDate === null) {
    return actualBalance;
  }

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const paycheckStart = new Date(nextPaycheckDate.getFullYear(), nextPaycheckDate.getMonth(), nextPaycheckDate.getDate()).getTime();

  // Filtrer les charges récurrentes engagées (échéance entre aujourd'hui inclus et la paye exclus)
  const pendingRecurringExpenses = upcomingExpenses.filter(tx => {
    if (tx.type !== 'expense') return false;
    if (excludedIds.includes(tx._id)) return false;

    const txDate = new Date(tx.date);
    const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();

    return txTime >= todayStart && txTime < paycheckStart;
  });

  const sumExpenses = pendingRecurringExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  return actualBalance - sumExpenses;
};

/**
 * Génère une projection du solde sur 30 jours à venir.
 * @param {number} actualBalance - Le solde de départ
 * @param {Date} today - Date de départ de la projection
 * @param {Array} upcomingTransactions - Toutes les transactions planifiées à venir (revenus et dépenses)
 * @param {Array<string>} excludedIds - Identifiants des échéances exclues
 * @returns {Array<Object>} Tableau de 30 points { date, balance }
 */
export const calculateFloorProjection = (
  actualBalance,
  today = new Date(),
  upcomingTransactions = [],
  excludedIds = []
) => {
  const points = [];
  let currentBalance = actualBalance;

  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  for (let i = 0; i < 30; i++) {
    const targetDate = new Date(startDay);
    targetDate.setDate(startDay.getDate() + i);
    const targetTime = targetDate.getTime();

    // Trouver toutes les transactions de ce jour
    const txsOnDay = upcomingTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txTime === targetTime;
    });

    // Appliquer les prélèvements et revenus du jour
    txsOnDay.forEach(tx => {
      const amount = Number(tx.amount || 0);
      if (tx.type === 'expense') {
        if (!excludedIds.includes(tx._id)) {
          currentBalance -= amount;
        }
      } else if (tx.type === 'income') {
        currentBalance += amount;
      }
    });

    points.push({
      date: targetDate.toISOString(),
      balance: currentBalance
    });
  }

  return points;
};
