/**
 * Generates a random number following a standard normal distribution N(0, 1)
 * using the Box-Muller transform.
 * 
 * @returns {number} A standard normal random variable.
 */
export const boxMullerRandom = () => {
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
 * @param {Object} params - The simulation parameters.
 * @param {number} params.initialCapital - The starting capital in EUR.
 * @param {number} params.monthlySavings - The monthly savings capacity in EUR.
 * @param {number} params.horizonYears - Time horizon in years (e.g., 10, 20, 30).
 * @param {number} params.expectedReturn - Average annual expected return rate (decimal, e.g., 0.05 for 5%).
 * @param {number} params.volatility - Annual volatility rate / standard deviation (decimal, e.g., 0.12 for 12%).
 * @param {number} params.inflationRate - Annual inflation rate (decimal, e.g., 0.02 for 2%).
 * @param {number} params.shockProbability - Annual probability of a major life event shock (decimal, e.g., 0.10 for 10%).
 * @param {number} params.shockCost - Average cost of a shock in EUR (e.g., 5000).
 * @param {boolean} [params.indexSavings=true] - Whether savings grow with inflation (constant real value).
 * @param {number} [params.numSimulations=1000] - Number of stochastics paths to simulate.
 * @returns {Object} The simulation results including yearly percentiles, resilience rate, and average rupture time.
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
}) => {
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
    paths[sim][0] = currentCapital;

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

      paths[sim][month] = currentCapital;
    }

    // Capture final failure if it occurred in the last month
    if (currentCapital <= 0 && ruptureMonths[sim] === -1) {
      ruptureMonths[sim] = numMonths;
    }
  }

  // Aggregate yearly percentile data (from Year 0 to HorizonYears)
  const yearlyData = [];
  for (let year = 0; year <= horizonYears; year++) {
    const monthIdx = year * 12;
    const values = new Float64Array(numSimulations);
    
    for (let sim = 0; sim < numSimulations; sim++) {
      values[sim] = paths[sim][monthIdx];
    }
    
    // Sort values ascendingly to extract percentiles
    values.sort();

    const p10 = values[Math.floor(numSimulations * 0.10)];
    const p50 = values[Math.floor(numSimulations * 0.50)];
    const p90 = values[Math.floor(numSimulations * 0.90)];

    yearlyData.push({
      year,
      p10: parseFloat(p10.toFixed(2)),
      p50: parseFloat(p50.toFixed(2)),
      p90: parseFloat(p90.toFixed(2)),
      range: [parseFloat(p10.toFixed(2)), parseFloat(p90.toFixed(2))]
    });
  }

  // Resilience score (percentage of simulations that ended above zero)
  let successfulSims = 0;
  for (let sim = 0; sim < numSimulations; sim++) {
    if (paths[sim][numMonths] > 0) {
      successfulSims++;
    }
  }
  const resilienceScore = (successfulSims / numSimulations) * 100;

  // Average rupture year for simulations that failed (fell <= 0)
  const ruptureYears = [];
  for (let sim = 0; sim < numSimulations; sim++) {
    if (ruptureMonths[sim] !== -1) {
      ruptureYears.push(ruptureMonths[sim] / 12);
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
