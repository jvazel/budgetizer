import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import { runMonteCarlo } from '../../utils/monteCarloHelper';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, Sliders, Info, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
};

const ResilienceChart = () => {
  const { data: dashboardData, loading: dashboardLoading, refreshDashboard } = useDashboard();

  // State parameters for Monte Carlo simulation
  const [initialCapital, setInitialCapital] = useState(undefined);
  const [monthlySavings, setMonthlySavings] = useState(undefined);
  const [horizonYears, setHorizonYears] = useState(15);
  
  // Investment parameters
  const [profilePreset, setProfilePreset] = useState('balanced'); // prudent, balanced, dynamic, custom
  const [expectedReturn, setExpectedReturn] = useState(5.0); // in percent
  const [volatility, setVolatility] = useState(8.0); // in percent

  // Inflation
  const [inflationRate, setInflationRate] = useState(2.0); // in percent
  const [indexSavings, setIndexSavings] = useState(true);

  // Life accidents / Shocks
  const [enableShocks, setEnableShocks] = useState(true);
  const [shockProbability, setShockProbability] = useState(10); // annual prob in percent
  const [shockCost, setShockCost] = useState(5000); // in EUR

  // Collapsible configuration
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  // Prefill defaults when dashboard data is loaded
  useEffect(() => {
    if (dashboardData) {
      if (initialCapital === undefined) {
        setInitialCapital(dashboardData.totalBalance || 0);
      }
      if (monthlySavings === undefined) {
        const netSavings = (dashboardData.month?.income || 0) - (dashboardData.month?.expenses || 0);
        setMonthlySavings(Math.max(0, netSavings));
      }
    }
  }, [dashboardData, initialCapital, monthlySavings]);

  // Handle Return or Volatility manual modifications to override profile preset
  const handleReturnChange = (val) => {
    setExpectedReturn(val);
    checkPreset(val, volatility);
  };

  const handleVolatilityChange = (val) => {
    setVolatility(val);
    checkPreset(expectedReturn, val);
  };

  const checkPreset = (ret, vol) => {
    if (ret === 2.5 && vol === 2.0) {
      setProfilePreset('prudent');
    } else if (ret === 5.0 && vol === 8.0) {
      setProfilePreset('balanced');
    } else if (ret === 8.0 && vol === 16.0) {
      setProfilePreset('dynamic');
    } else {
      setProfilePreset('custom');
    }
  };

  // Sync profile selector clicks
  useEffect(() => {
    if (profilePreset === 'prudent') {
      setExpectedReturn(2.5);
      setVolatility(2.0);
    } else if (profilePreset === 'balanced') {
      setExpectedReturn(5.0);
      setVolatility(8.0);
    } else if (profilePreset === 'dynamic') {
      setExpectedReturn(8.0);
      setVolatility(16.0);
    }
  }, [profilePreset]);

  // Run stochastics simulation using useMemo to optimize calculation performance
  const simResults = useMemo(() => {
    if (initialCapital === undefined || monthlySavings === undefined) {
      return null;
    }

    return runMonteCarlo({
      initialCapital,
      monthlySavings,
      horizonYears,
      expectedReturn: expectedReturn / 100,
      volatility: volatility / 100,
      inflationRate: inflationRate / 100,
      shockProbability: enableShocks ? (shockProbability / 100) : 0,
      shockCost: enableShocks ? shockCost : 0,
      indexSavings,
      numSimulations: 1000 // optimized for fast calculations (<10ms) in browser thread
    });
  }, [
    initialCapital,
    monthlySavings,
    horizonYears,
    expectedReturn,
    volatility,
    inflationRate,
    shockProbability,
    shockCost,
    indexSavings,
    enableShocks
  ]);

  // Custom tooltip styling
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl bg-[#0a0a0c]/90 border border-border/40 p-4 shadow-xl backdrop-blur-md text-[11px] text-[#fff] space-y-1.5 font-sans min-w-[160px]">
          <p className="font-extrabold text-secondary tracking-wide border-b border-border/20 pb-1 mb-1">
            Année {data.year}
          </p>
          <div className="flex justify-between items-center gap-4">
            <span className="text-emerald-400 font-medium">Optimiste (P90) :</span>
            <span className="font-extrabold font-premium-numbers">{formatCurrency(data.p90)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-accent font-medium">Médian (P50) :</span>
            <span className="font-extrabold font-premium-numbers">{formatCurrency(data.p50)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-rose-400 font-medium">Pessimiste (P10) :</span>
            <span className="font-extrabold font-premium-numbers">{formatCurrency(data.p10)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const loading = dashboardLoading || initialCapital === undefined || monthlySavings === undefined;

  return (
    <div className="space-y-6 pb-24">
      {/* Header Info Banner */}
      <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden">
        <div>
          <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Simulation Monte Carlo</h3>
          <p className="text-[10px] text-muted mt-1 leading-relaxed max-w-[280px]">
            Projetez la résilience à long terme de votre patrimoine financier en simulant 1 000 trajectoires stochastiques intégrant l'inflation, la volatilité et des imprévus.
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          className="absolute right-4 top-4 text-secondary hover:text-primary active:opacity-75 transition-all p-1.5"
          title="Actualiser les données"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="bg-surface-2 p-12 rounded-[28px] border border-border/40 flex flex-col items-center justify-center min-h-[280px]">
          <div className="w-10 h-10 border-4 border-accent/15 border-t-accent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Resilience Metrics Scorecards */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Scorecard 1: Resilience rate */}
            <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Score de Résilience</p>
                <h4 className="text-xl font-extrabold text-primary mt-1 font-premium-numbers">
                  {simResults?.resilienceScore}%
                </h4>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {simResults?.resilienceScore > 90 ? (
                  <ShieldCheck size={14} className="text-accent shrink-0" />
                ) : simResults?.resilienceScore > 70 ? (
                  <Shield size={14} className="text-warning shrink-0" />
                ) : (
                  <ShieldAlert size={14} className="text-danger shrink-0" />
                )}
                <span className={`text-[9px] font-bold ${
                  simResults?.resilienceScore > 90 ? 'text-accent' : simResults?.resilienceScore > 70 ? 'text-warning' : 'text-danger'
                }`}>
                  {simResults?.resilienceScore > 90 ? 'Excellent' : simResults?.resilienceScore > 70 ? 'Correct' : 'Vulnérable'}
                </span>
              </div>
            </div>

            {/* Scorecard 2: Rupture / Horizon */}
            <div className="bg-surface-2 p-4.5 rounded-[24px] border border-border/40 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Horizon temporel</p>
                <h4 className="text-xl font-extrabold text-primary mt-1 font-premium-numbers">{horizonYears} ans</h4>
              </div>
              <div className="text-[9px] font-bold text-muted flex items-center gap-1 mt-2">
                <Info size={11} className="text-muted shrink-0" />
                <span>
                  {simResults?.avgRuptureYear !== null
                    ? `Rupture moyenne à ${simResults.avgRuptureYear} ans`
                    : 'Aucune rupture détectée'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Chart Card */}
          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase">Résultats des projections stochastiques</h3>
              <p className="text-[9px] text-muted leading-tight mt-0.5">
                La ligne pleine représente la médiane. L'aire verte translucide montre l'entonnoir d'incertitude (Percentiles 10 à 90).
              </p>
            </div>

            <div className="w-full h-60 flex items-center justify-center">
              {simResults?.yearlyData && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={simResults.yearlyData} margin={{ left: -20, right: 5, top: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorResilience" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.20} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="year" 
                      tickFormatter={(y) => `An ${y}`}
                      tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M€`;
                        if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k€`;
                        return `${val}€`;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ pointerEvents: 'none' }} />
                    
                    {/* Range Area (10th to 90th percentile) */}
                    <Area 
                      type="monotone" 
                      dataKey="range" 
                      stroke="none" 
                      fill="url(#colorResilience)" 
                      fillOpacity={1}
                      activeDot={false}
                    />

                    {/* Dashed outer boundary bounds */}
                    <Line 
                      type="monotone" 
                      dataKey="p90" 
                      stroke="var(--accent)" 
                      strokeWidth={1} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p10" 
                      stroke="var(--danger)" 
                      strokeWidth={1} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={false}
                    />

                    {/* Median solid line (50th percentile) */}
                    <Line 
                      type="monotone" 
                      dataKey="p50" 
                      stroke="var(--accent)" 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Configuration Form Panel */}
          <div className="bg-surface-2 rounded-[24px] border border-border/40 overflow-hidden shadow-sm transition-all duration-200">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="w-full p-4 flex justify-between items-center font-bold text-xs text-primary transition-all active:bg-surface-2/60 select-none"
            >
              <span className="flex items-center gap-2">
                <Sliders size={16} className="text-accent" />
                ⚙️ Configuration des paramètres
              </span>
              <ChevronDown size={16} className={`text-secondary transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
            </button>

            {isConfigOpen && (
              <div className="p-4.5 border-t border-border/30 space-y-5 animate-in fade-in duration-200">
                {/* Inputs for Capital & Savings */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="initialCapital" className="text-[9px] font-bold text-secondary uppercase tracking-wider block">Capital Initial (€)</label>
                    <input
                      id="initialCapital"
                      type="number"
                      value={initialCapital !== undefined ? initialCapital : ''}
                      onChange={(e) => setInitialCapital(Number(e.target.value))}
                      className="w-full bg-surface border border-border/40 rounded-xl px-3 py-2 text-xs font-bold font-premium-numbers text-primary focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="monthlySavings" className="text-[9px] font-bold text-secondary uppercase tracking-wider block">Épargne Mensuelle (€)</label>
                    <input
                      id="monthlySavings"
                      type="number"
                      value={monthlySavings !== undefined ? monthlySavings : ''}
                      onChange={(e) => setMonthlySavings(Number(e.target.value))}
                      className="w-full bg-surface border border-border/40 rounded-xl px-3 py-2 text-xs font-bold font-premium-numbers text-primary focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Slider for Horizon */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold text-secondary uppercase tracking-wider">
                    <label htmlFor="horizonYears">Horizon temporel</label>
                    <span className="text-accent font-extrabold font-premium-numbers">{horizonYears} ans</span>
                  </div>
                  <input
                    id="horizonYears"
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={horizonYears}
                    onChange={(e) => setHorizonYears(Number(e.target.value))}
                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[8px] text-muted font-bold">
                    <span>5 ans</span>
                    <span>40 ans</span>
                  </div>
                </div>

                {/* Risk Profile Selection */}
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block">Profil d'investissement</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'prudent', label: 'Prudent (Livret)', return: 2.5, vol: 2.0 },
                      { id: 'balanced', label: 'Équilibré', return: 5.0, vol: 8.0 },
                      { id: 'dynamic', label: 'Dynamique (Bourse)', return: 8.0, vol: 16.0 }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setProfilePreset(preset.id);
                          setExpectedReturn(preset.return);
                          setVolatility(preset.vol);
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                          profilePreset === preset.id
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-surface border border-border/40 text-secondary hover:text-primary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual Expected Return & Volatility Sliders */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[8px] font-bold text-secondary uppercase tracking-wider">
                        <label htmlFor="expectedReturn">Rendement annuel</label>
                        <span className="text-accent font-premium-numbers font-extrabold">{expectedReturn}%</span>
                      </div>
                      <input
                        id="expectedReturn"
                        type="range"
                        min="0"
                        max="15"
                        step="0.5"
                        value={expectedReturn}
                        onChange={(e) => handleReturnChange(Number(e.target.value))}
                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[8px] font-bold text-secondary uppercase tracking-wider">
                        <label htmlFor="volatility">Volatilité attendue</label>
                        <span className="text-accent font-premium-numbers font-extrabold">{volatility}%</span>
                      </div>
                      <input
                        id="volatility"
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={volatility}
                        onChange={(e) => handleVolatilityChange(Number(e.target.value))}
                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                      />
                    </div>
                  </div>
                </div>

                {/* Inflation rate setting */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold text-secondary uppercase tracking-wider">
                    <label htmlFor="inflationRate">Taux d'inflation estimé</label>
                    <span className="text-accent font-extrabold font-premium-numbers">{inflationRate}%</span>
                  </div>
                  <input
                    id="inflationRate"
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[8px] text-muted font-bold">
                    <span>0% (Constant)</span>
                    <span>10%</span>
                  </div>
                </div>

                {/* Index savings switch */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-primary block">Indexer l'épargne sur l'inflation</span>
                    <span className="text-[8px] text-muted block leading-tight">Maintient la valeur réelle de votre épargne mensuelle dans le temps</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIndexSavings(!indexSavings)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 ${indexSavings ? 'bg-accent' : 'bg-surface border border-border/40'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${indexSavings ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Stress test settings */}
                <div className="space-y-3.5 border-t border-border/20 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-primary block">Activer le Stress-test (Imprévus)</span>
                      <span className="text-[8px] text-muted block leading-tight">Simule des catastrophes de la vie aléatoires (sinistres, chômage)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableShocks(!enableShocks)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 ${enableShocks ? 'bg-accent' : 'bg-surface border border-border/40'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enableShocks ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {enableShocks && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-bold text-secondary uppercase tracking-wider">
                          <label htmlFor="shockProbability">Fréquence (probabilité annuelle)</label>
                          <span className="text-accent font-premium-numbers font-extrabold">{shockProbability}%</span>
                        </div>
                        <input
                          id="shockProbability"
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={shockProbability}
                          onChange={(e) => setShockProbability(Number(e.target.value))}
                          className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-bold text-secondary uppercase tracking-wider">
                          <label htmlFor="shockCost">Coût moyen estimé</label>
                          <span className="text-accent font-premium-numbers font-extrabold">{shockCost} €</span>
                        </div>
                        <input
                          id="shockCost"
                          type="range"
                          min="500"
                          max="50000"
                          step="500"
                          value={shockCost}
                          onChange={(e) => setShockCost(Number(e.target.value))}
                          className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resilience Diagnosis Text Report Card */}
          <div className="space-y-3">
            {simResults?.resilienceScore > 90 ? (
              <div className="bg-emerald-500/5 p-4.5 rounded-[24px] border border-emerald-500/15 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-accent flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="text-accent" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent block">Plan financier très robuste</span>
                  <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                    Votre plan financier présente un taux de réussite de <strong className="text-primary">{simResults.resilienceScore}%</strong> sur <strong className="text-primary">{horizonYears} ans</strong>. Excellent. Votre structure financière est extrêmement solide, même face aux crises.
                  </p>
                </div>
              </div>
            ) : simResults?.resilienceScore > 70 ? (
              <div className="bg-amber-500/5 p-4.5 rounded-[24px] border border-amber-500/15 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-warning flex items-center justify-center shrink-0">
                  <Shield size={16} className="text-warning" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-warning block">Viabilité correcte sous conditions</span>
                  <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                    Votre plan financier présente un taux de réussite de <strong className="text-primary">{simResults.resilienceScore}%</strong> sur <strong className="text-primary">{horizonYears} ans</strong>. Correct. Votre plan est viable, mais un niveau de dépenses plus bas ou une épargne de précaution accrue sécuriserait votre avenir.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/5 p-4.5 rounded-[24px] border border-rose-500/15 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-danger flex items-center justify-center shrink-0">
                  <ShieldAlert size={16} className="text-danger" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-danger block">⚠️ Vulnérabilité financière élevée</span>
                  <p className="text-[9px] text-secondary mt-0.5 leading-relaxed">
                    Votre plan financier présente un taux de réussite de <strong className="text-primary">{simResults.resilienceScore}%</strong> sur <strong className="text-primary">{horizonYears} ans</strong>. Attention. Vos projections montrent une forte vulnérabilité face aux aléas de la vie ou à l'inflation.
                    {simResults?.avgRuptureYear !== null && (
                      <span> En moyenne, pour les simulations en échec, la rupture de capital intervient après <strong className="text-danger">{simResults.avgRuptureYear} ans</strong>.</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResilienceChart;
