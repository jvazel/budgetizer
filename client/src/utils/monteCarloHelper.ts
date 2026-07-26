export interface MonteCarloParams {
  initialCapital: number;
  monthlySavings: number;
  horizonYears: number;
  expectedReturn: number;
  volatility: number;
  inflationRate: number;
  shockProbability: number;
  shockCost: number;
  indexSavings?: boolean;
  numSimulations?: number;
}

export interface MonteCarloYearlyData {
  year: number;
  p10: number;
  p50: number;
  p90: number;
  range: [number, number];
}

export interface MonteCarloResult {
  yearlyData: MonteCarloYearlyData[];
  resilienceScore: number;
  avgRuptureYear: number | null;
}

/**
 * Generates a random number following a standard normal distribution N(0, 1)
 * using the Box-Muller transform.
 * 
 * @returns {number} A standard normal random variable.
 */
export const boxMullerRandom = (): number => {
  let u = 0, v = 0;
  // Math.random() returns a float in [0, 1). Math.log(0) is -Infinity, so we filter it out.
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

/**
 * Runs a Monte Carlo simulation of financial asset trajectories over a time horizon.
 * Calculations are carried out in real terms (adjusted for inflation).
 * 
 * @param {MonteCarloParams} params - The simulation parameters.
 * @returns {MonteCarloResult} The simulation results including yearly percentiles, resilience rate, and average rupture time.
 */
export const runMonteCarlo = ({
  initialCapital,
  monthlySavings,
  horizonYears,
  expectedReturn,
  volatility,
  inflationRate,
  shockProbability,
  shockCost,
  indexSavings = true,
  numSimulations = 1000
}: MonteCarloParams): MonteCarloResult => {
  const numMonths = horizonYears * 12;
  
  // Convert annual rates to monthly counterparts
  const rMonthly = expectedReturn / 12;
  const sigmaMonthly = volatility / Math.sqrt(12);
  const iMonthly = inflationRate / 12;
  const pShockMonthly = shockProbability / 12;

  // Storing capital values for all simulations over all months
  const paths = Array.from({ length: numSimulations }, () => new Float64Array(numMonths + 1));
  const ruptureMonths = new Int32Array(numSimulations).fill(-1);

  for (let sim = 0; sim < numSimulations; sim++) {
    let currentCapital = initialCapital;
    const simPath = paths[sim];
    if (simPath) {
      simPath[0] = currentCapital;
    }

    for (let month = 1; month <= numMonths; month++) {
      if (currentCapital <= 0 && ruptureMonths[sim] === -1) {
        ruptureMonths[sim] = month;
      }

      // Generate random monthly return using standard normal distribution (Box-Muller)
      const randNormal = boxMullerRandom();
      const returnRate = rMonthly + sigmaMonthly * randNormal - iMonthly;

      // Compound capital
      currentCapital = currentCapital * (1 + returnRate);

      // Add monthly savings
      // Since returnRate is adjusted for inflation (real return),
      // indexSavings = true means the savings adjust with inflation (constant real value of monthlySavings).
      // indexSavings = false means savings decay in real terms by the cumulative monthly inflation.
      let savingsThisMonth = monthlySavings;
      if (!indexSavings) {
        savingsThisMonth = monthlySavings * Math.pow(1 - iMonthly, month);
      }
      currentCapital += savingsThisMonth;

      // Life event / shock check (Bernoulli trial)
      if (Math.random() < pShockMonthly) {
        // Shock cost is kept constant in real terms (adjusts with inflation)
        currentCapital -= shockCost;
      }

      if (simPath) {
        simPath[month] = currentCapital;
      }
    }

    // Capture final failure if it occurred in the last month
    if (currentCapital <= 0 && ruptureMonths[sim] === -1) {
      ruptureMonths[sim] = numMonths;
    }
  }

  // Aggregate yearly percentile data (from Year 0 to HorizonYears)
  const yearlyData: MonteCarloYearlyData[] = [];
  for (let year = 0; year <= horizonYears; year++) {
    const monthIdx = year * 12;
    const values = new Float64Array(numSimulations);
    
    for (let sim = 0; sim < numSimulations; sim++) {
      const simPath = paths[sim];
      if (simPath) {
        values[sim] = simPath[monthIdx] ?? 0;
      }
    }
    
    // Sort values ascendingly to extract percentiles
    values.sort();

    const p10Val = values[Math.floor(numSimulations * 0.10)] ?? 0;
    const p50Val = values[Math.floor(numSimulations * 0.50)] ?? 0;
    const p90Val = values[Math.floor(numSimulations * 0.90)] ?? 0;

    yearlyData.push({
      year,
      p10: parseFloat(p10Val.toFixed(2)),
      p50: parseFloat(p50Val.toFixed(2)),
      p90: parseFloat(p90Val.toFixed(2)),
      range: [parseFloat(p10Val.toFixed(2)), parseFloat(p90Val.toFixed(2))]
    });
  }

  // Resilience score (percentage of simulations that ended above zero)
  let successfulSims = 0;
  for (let sim = 0; sim < numSimulations; sim++) {
    const simPath = paths[sim];
    if (simPath && (simPath[numMonths] ?? 0) > 0) {
      successfulSims++;
    }
  }
  const resilienceScore = (successfulSims / numSimulations) * 100;

  // Average rupture year for simulations that failed (fell <= 0)
  const ruptureYears: number[] = [];
  for (let sim = 0; sim < numSimulations; sim++) {
    const month = ruptureMonths[sim];
    if (month !== undefined && month !== -1) {
      ruptureYears.push(month / 12);
    }
  }
  const avgRuptureYear = ruptureYears.length > 0
    ? ruptureYears.reduce((sum, val) => sum + val, 0) / ruptureYears.length
    : null;

  return {
    yearlyData,
    resilienceScore: parseFloat(resilienceScore.toFixed(1)),
    avgRuptureYear: avgRuptureYear !== null ? parseFloat(avgRuptureYear.toFixed(1)) : null
  };
};
