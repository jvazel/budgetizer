import { describe, it, expect } from 'vitest';
import { boxMullerRandom, runMonteCarlo } from '../monteCarloHelper';

describe('Monte Carlo Mathematical Helper', () => {
  describe('boxMullerRandom', () => {
    it('generates numeric values', () => {
      const val = boxMullerRandom();
      expect(typeof val).toBe('number');
      expect(isNaN(val)).toBe(false);
      expect(isFinite(val)).toBe(true);
    });

    it('generates values resembling a standard normal distribution N(0, 1)', () => {
      const samples = [];
      const numSamples = 2000;
      for (let i = 0; i < numSamples; i++) {
        samples.push(boxMullerRandom());
      }

      // Mean should be close to 0
      const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
      expect(mean).toBeGreaterThan(-0.15);
      expect(mean).toBeLessThan(0.15);

      // Standard deviation should be close to 1
      const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numSamples;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeGreaterThan(0.85);
      expect(stdDev).toBeLessThan(1.15);
    });
  });

  describe('runMonteCarlo', () => {
    const defaultParams = {
      initialCapital: 10000,
      monthlySavings: 300,
      horizonYears: 10,
      expectedReturn: 0.05,
      volatility: 0.12,
      inflationRate: 0.02,
      shockProbability: 0.10,
      shockCost: 5000,
      indexSavings: true,
      numSimulations: 500 // smaller amount for faster tests
    };

    it('returns the correct data structure and keys', () => {
      const results = runMonteCarlo(defaultParams);

      expect(results).toHaveProperty('yearlyData');
      expect(results).toHaveProperty('resilienceScore');
      expect(results).toHaveProperty('avgRuptureYear');

      expect(Array.isArray(results.yearlyData)).toBe(true);
      // Horizon is 10 years, so there should be 11 points (Year 0, 1, ..., 10)
      expect(results.yearlyData).toHaveLength(11);

      const firstPoint = results.yearlyData[0];
      expect(firstPoint).toHaveProperty('year', 0);
      expect(firstPoint).toHaveProperty('p10');
      expect(firstPoint).toHaveProperty('p50');
      expect(firstPoint).toHaveProperty('p90');
      expect(firstPoint).toHaveProperty('range');
      expect(Array.isArray(firstPoint.range)).toBe(true);
      expect(firstPoint.range).toHaveLength(2);
    });

    it('asserts that percentiles are sorted correctly (p10 <= p50 <= p90)', () => {
      const results = runMonteCarlo(defaultParams);

      results.yearlyData.forEach(data => {
        expect(data.p10).toBeLessThanOrEqual(data.p50);
        expect(data.p50).toBeLessThanOrEqual(data.p90);
        expect(data.range[0]).toBe(data.p10);
        expect(data.range[1]).toBe(data.p90);
      });
    });

    it('indicates higher resilience score for high capital / savings configuration', () => {
      const safeResults = runMonteCarlo({
        ...defaultParams,
        initialCapital: 100000,
        monthlySavings: 1000,
        shockCost: 1000 // minimal shock
      });

      const riskyResults = runMonteCarlo({
        ...defaultParams,
        initialCapital: 2000,
        monthlySavings: 0,
        shockCost: 8000, // severe shock exceeding capital
        shockProbability: 0.9 // extremely likely shocks
      });

      expect(safeResults.resilienceScore).toBe(100);
      expect(riskyResults.resilienceScore).toBeLessThan(100);
      expect(riskyResults.avgRuptureYear).not.toBeNull();
      expect(riskyResults.avgRuptureYear).toBeGreaterThan(0);
    });

    it('validates indexSavings effect under positive inflation', () => {
      const paramsIndexed = {
        ...defaultParams,
        inflationRate: 0.08, // high inflation
        indexSavings: true,
        numSimulations: 200
      };

      const paramsNotIndexed = {
        ...defaultParams,
        inflationRate: 0.08,
        indexSavings: false,
        numSimulations: 200
      };

      const indexed = runMonteCarlo(paramsIndexed);
      const notIndexed = runMonteCarlo(paramsNotIndexed);

      const finalIndexedP50 = indexed.yearlyData[10].p50;
      const finalNotIndexedP50 = notIndexed.yearlyData[10].p50;

      // With high inflation, indexed savings (which maintain purchasing power)
      // should lead to a higher final capital in real terms than non-indexed savings
      expect(finalIndexedP50).toBeGreaterThan(finalNotIndexedP50);
    });
  });
});
