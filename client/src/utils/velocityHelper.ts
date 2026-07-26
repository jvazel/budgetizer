/**
 * Calcule le nombre de jours restants dans le mois (y compris aujourd'hui).
 * @param {Date} today - Date du jour (par défaut Date.now)
 * @returns {number} Nombre de jours restants
 */
export const getDaysRemaining = (today: Date = new Date()): number => {
  const year = today.getFullYear();
  const month = today.getMonth();
  // Obtens le dernier jour du mois en cours
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  return totalDaysInMonth - today.getDate() + 1;
};

/**
 * Calcule la vitesse limite autorisée pour tenir le budget restant.
 * @param {number} remainingBudget - Budget restant
 * @param {number} daysRemaining - Jours restants
 * @returns {number} Limite de vitesse autorisée en €/jour
 */
export const getTargetVelocity = (remainingBudget: number, daysRemaining: number): number => {
  if (remainingBudget <= 0 || daysRemaining <= 0) return 0;
  return remainingBudget / daysRemaining;
};

/**
 * Calcule la vitesse réelle actuelle de dépense.
 * @param {number} totalSpent - Total des dépenses effectuées sur la période
 * @param {number} daysCount - Nombre de jours correspondants à la période
 * @returns {number} Vitesse réelle actuelle en €/jour
 */
export const getActualVelocity = (totalSpent: number, daysCount: number): number => {
  if (daysCount <= 0) return 0;
  return totalSpent / daysCount;
};

/**
 * Estime la date d'épuisement complète du budget si la vitesse actuelle dépasse la vitesse autorisée.
 * @param {number} remainingBudget - Budget restant
 * @param {number} actualVelocity - Vitesse réelle actuelle en €/jour
 * @param {Date} today - Date de départ (par défaut Date.now)
 * @returns {Date|null} Date de crash estimée, ou null si aucune alerte de crash
 */
export const getDepletionDate = (
  remainingBudget: number,
  actualVelocity: number,
  today: Date = new Date()
): Date | null => {
  if (remainingBudget <= 0 || actualVelocity <= 0) return null;
  const daysToDepletion = remainingBudget / actualVelocity;
  const depletionDate = new Date(today);
  depletionDate.setDate(today.getDate() + Math.ceil(daysToDepletion));
  return depletionDate;
};
