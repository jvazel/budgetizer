/**
 * Calcule la date de la prochaine occurrence de manière déterministe
 * par rapport à la date de début d'origine pour éviter les dérives (fins de mois, années bissextiles).
 */
export const calculateNextDate = (
  startDate: Date | string,
  timesExecuted: number,
  every: number,
  unit: 'day' | 'week' | 'month' | 'year'
): Date => {
  const next = new Date(startDate);
  const totalSteps = timesExecuted * every;

  if (unit === 'day') {
    next.setUTCDate(next.getUTCDate() + totalSteps);
   } else if (unit === 'week') {
    next.setUTCDate(next.getUTCDate() + totalSteps * 7);
   } else if (unit === 'month') {
    const startMonth = next.getUTCMonth();
    const targetMonth = startMonth + totalSteps;
    const targetYear = next.getUTCFullYear() + Math.floor(targetMonth / 12);
    const targetMonthNormalized = ((targetMonth % 12) + 12) % 12;

     // Fixer temporairement le jour à 1 en premier pour éviter tout débordement lors du changement de mois/année
    next.setUTCDate(1);
    next.setUTCFullYear(targetYear);
    next.setUTCMonth(targetMonthNormalized);

     // Déterminer le dernier jour réel du mois cible (ex : 28 ou 29 pour février, 30 pour avril)
    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonthNormalized + 1, 0)).getUTCDate();
    const originalDay = new Date(startDate).getUTCDate();

     // Appliquer le jour d'origine mais le plafonner au jour max du mois cible
    next.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
   } else if (unit === 'year') {
    const targetYear = next.getUTCFullYear() + totalSteps;

     // Fixer temporairement le jour à 1 en premier pour éviter tout débordement lors du changement d'année
    next.setUTCDate(1);
    next.setUTCFullYear(targetYear);

    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, next.getUTCMonth() + 1, 0)).getUTCDate();
    const originalDay = new Date(startDate).getUTCDate();

    next.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
   }

  return next;
};
