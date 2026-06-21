import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Select from './Select';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Settings,
  AlertTriangle,
  Calendar,
  Sparkles,
  Wallet,
  CreditCard,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import {
  getEstimatedPaycheckDate,
  calculateFloorBalance,
  calculateFloorProjection,
} from '../../utils/floorBalanceHelper';
import { triggerHaptic } from '../../utils/hapticHelper';
import AiBadge from './AiBadge';

const FloorBalanceWidget = ({ accounts = [], upcoming = [], loading = false }) => {
  const { user } = useContext(AuthContext);
  const currencyCode = user?.currency?.code || 'EUR';

  // ─── State ───────────────────────────────────────────────────────────────────
  const [paycheckDayConfig, setPaycheckDayConfig] = useState(() => {
    return localStorage.getItem('budgetizer_paycheck_day') || 'auto';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('accounts'); // 'accounts' | 'paycheck'

  const [excludedIds, setExcludedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetizer_excluded_floor_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedAccountIds, setSelectedAccountIds] = useState(() => {
    try {
      const saved = localStorage.getItem('budgetizer_floor_selected_accounts');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);

  // ─── Persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('budgetizer_excluded_floor_expenses', JSON.stringify(excludedIds));
  }, [excludedIds]);

  const handlePaycheckDayChange = (value) => {
    setPaycheckDayConfig(value);
    localStorage.setItem('budgetizer_paycheck_day', value);
  };

  const toggleExpenseExclusion = (id) => {
    triggerHaptic('light');
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ─── Resolved active selected accounts IDs ───────────────────────────────────
  const activeSelectedIds = useMemo(() => {
    if (selectedAccountIds && Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
      const existingIds = selectedAccountIds.filter(id => accounts.some(acc => acc._id === id));
      if (existingIds.length > 0) return existingIds;
    }

    // Default: select checking accounts
    const checkingAccounts = accounts.filter(acc => acc.type === 'checking');
    if (checkingAccounts.length > 0) {
      return checkingAccounts.map(acc => acc._id);
    }
    // Fallback: select non-credit accounts
    const nonCreditAccounts = accounts.filter(acc => acc.type !== 'credit');
    if (nonCreditAccounts.length > 0) {
      return nonCreditAccounts.map(acc => acc._id);
    }
    return accounts.map(acc => acc._id);
  }, [accounts, selectedAccountIds]);

  const handleAccountToggle = (id) => {
    triggerHaptic('light');
    let nextIds;
    if (activeSelectedIds.includes(id)) {
      if (activeSelectedIds.length === 1) return; // Keep at least one account
      nextIds = activeSelectedIds.filter(item => item !== id);
    } else {
      nextIds = [...activeSelectedIds, id];
    }
    setSelectedAccountIds(nextIds);
    localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(nextIds));
  };

  const handleSelectAllAccounts = () => {
    triggerHaptic('light');
    const allIds = accounts.map(acc => acc._id);
    setSelectedAccountIds(allIds);
    localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(allIds));
  };

  const handleSelectOnlyCheckingAccounts = () => {
    triggerHaptic('light');
    const checkingIds = accounts.filter(acc => acc.type === 'checking').map(acc => acc._id);
    if (checkingIds.length > 0) {
      setSelectedAccountIds(checkingIds);
      localStorage.setItem('budgetizer_floor_selected_accounts', JSON.stringify(checkingIds));
    }
  };

  // ─── Dynamic Balances ────────────────────────────────────────────────────────
  const { actualBalance, creditBalance } = useMemo(() => {
    let actualSum = 0;
    let creditSum = 0;

    accounts.forEach(acc => {
      if (activeSelectedIds.includes(acc._id)) {
        if (acc.type === 'credit') {
          creditSum += acc.balance;
        } else {
          actualSum += acc.balance;
        }
      }
    });

    return {
      actualBalance: actualSum,
      creditBalance: creditSum
    };
  }, [accounts, activeSelectedIds]);

  const baseBalance = actualBalance + creditBalance;

  // ─── Derived data ────────────────────────────────────────────────────────────
  const upcomingIncomes = useMemo(() => upcoming.filter((tx) => tx.type === 'income'), [upcoming]);

  const nextPaycheckDate = useMemo(
    () => getEstimatedPaycheckDate(new Date(), upcomingIncomes, paycheckDayConfig),
    [upcomingIncomes, paycheckDayConfig]
  );

  const pendingRecurringExpenses = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const paycheckStart = new Date(
      nextPaycheckDate.getFullYear(),
      nextPaycheckDate.getMonth(),
      nextPaycheckDate.getDate()
    ).getTime();

    return upcoming.filter((tx) => {
      if (tx.type !== 'expense' && !(tx.type === 'transfer' && tx.toAccountId?.type === 'credit')) return false;
      const txDate = new Date(tx.date);
      const txTime = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
      return txTime >= todayStart && txTime < paycheckStart;
    });
  }, [upcoming, nextPaycheckDate]);

  const totalPendingExpenses = useMemo(() => {
    const activeExpenses = pendingRecurringExpenses.filter((tx) => !excludedIds.includes(tx._id));
    return activeExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [pendingRecurringExpenses, excludedIds]);

  const floorBalance = useMemo(
    () => calculateFloorBalance(baseBalance, new Date(), upcoming, nextPaycheckDate, excludedIds),
    [baseBalance, upcoming, nextPaycheckDate, excludedIds]
  );

  const comfortRatio = actualBalance > 0 ? floorBalance / actualBalance : 0;
  const isComfortable = floorBalance > 0 && comfortRatio > 0.2;

  const projectionData = useMemo(
    () => calculateFloorProjection(baseBalance, new Date(), upcoming, excludedIds),
    [baseBalance, upcoming, excludedIds]
  );

  const hasRiskOfNegative = useMemo(
    () => projectionData.some((pt) => pt.balance < 0),
    [projectionData]
  );

  // ─── Formatter ───────────────────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);

  // ─── Contextual micro-phrase ─────────────────────────────────────────────────
  const contextPhrase = useMemo(() => {
    const today = new Date();
    const daysLeft = Math.ceil((nextPaycheckDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const activePending = pendingRecurringExpenses.filter((tx) => !excludedIds.includes(tx._id));

    if (hasRiskOfNegative) {
      return `Ton solde risque de passer en négatif avant ta paye — vérifie tes charges.`;
    }
    if (!isComfortable && activePending.length > 0) {
      const dateStr = nextPaycheckDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      return `${activePending.length} facture${activePending.length > 1 ? 's' : ''} en attente d'ici ta paye le ${dateStr}.`;
    }
    if (daysLeft <= 3) {
      return `Ta paye arrive dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — toutes tes charges sont couvertes. ✓`;
    }
    if (activePending.length === 0) {
      return `Aucune charge planifiée d'ici ta paye — tu es bien couvert. ✓`;
    }
    return `${activePending.length} charge${activePending.length > 1 ? 's prévues' : ' prévue'} d'ici ta paye — tout est sous contrôle. ✓`;
  }, [nextPaycheckDate, hasRiskOfNegative, isComfortable, pendingRecurringExpenses, excludedIds]);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-4 mb-6 bg-surface-2/80 p-5 rounded-[24px] border border-white/[0.06] shadow-[0_12px_24px_rgba(0,0,0,0.35)] animate-pulse space-y-4">
        <div className="h-4 w-1/3 bg-surface/60 rounded" />
        <div className="h-10 w-2/3 bg-surface/60 rounded" />
        <div className="h-4 w-1/2 bg-surface/40 rounded" />
        <div className="h-20 w-full bg-surface/40 rounded" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const cardGradientClass = useMemo(() => {
    if (hasRiskOfNegative) return 'bg-gradient-to-br from-[#1C050A] via-[#0F0204] to-[#250308] border border-danger/30 shadow-[0_12px_30px_-5px_rgba(244,63,94,0.15)]';
    if (!isComfortable) return 'bg-gradient-to-br from-[#1C0F02] via-[#0F0701] to-[#251203] border border-warning/30 shadow-[0_12px_30px_-5px_rgba(245,158,11,0.15)]';
    return 'bg-gradient-to-br from-[#03223F] via-[#0A2A52] to-[#1E3A8A] border border-white/10 shadow-[0_12px_30px_-5px_rgba(10,26,47,0.35)]';
  }, [hasRiskOfNegative, isComfortable]);

  return (
    <section className="mb-6 mt-4">
      <div className={`relative overflow-hidden text-white rounded-[24px] p-5 space-y-4 transition-all duration-300 active-card-feedback ${cardGradientClass}`}>

        {/* Absolute Background Projection Chart Wave */}
        <div className="absolute inset-x-0 bottom-0 h-[100px] opacity-[0.14] pointer-events-none select-none z-0">
          {projectionData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFloorBg" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isComfortable ? '#10b981' : hasRiskOfNegative ? '#f43f5e' : '#f59e0b'}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={isComfortable ? '#10b981' : hasRiskOfNegative ? '#f43f5e' : '#f59e0b'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={isComfortable ? '#10b981' : hasRiskOfNegative ? '#f43f5e' : '#f59e0b'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFloorBg)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Decorative glows */}
        <div className="absolute -right-16 -bottom-16 w-36 h-36 rounded-full blur-[40px] pointer-events-none bg-emerald-400/10 z-0" />
        <div className="absolute -left-16 -top-16 w-36 h-36 bg-blue-400/15 rounded-full blur-[40px] pointer-events-none z-0" />

        {/* Header Title & Config button */}
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-blue-200/50 font-extrabold tracking-wider uppercase">Solde disponible</p>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse-live" title="Données synchronisées en temps réel" />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all active-spring-sm shrink-0 ${
              showSettings
                ? 'bg-[#d97706]/20 border-[#d97706]/30 text-[#d97706]'
                : 'bg-white/10 border-white/10 text-blue-200 hover:text-white hover:bg-white/15'
            }`}
            aria-label="Configurer le jour de paye"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Level 1: Balance Amount */}
        <div className="relative z-10 flex flex-col items-center justify-center py-1 text-center select-none">
          <h2 className="text-5xl font-black font-premium-numbers tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
            {formatCurrency(floorBalance)}
          </h2>
        </div>

        {/* Level 2: Sub-balances and contexts (dimmed grey slate) */}
        <div className="relative z-10 flex items-center justify-center gap-2 flex-wrap text-center pb-2 text-[11px] text-slate-400">
          <span>
            Bancaire :&nbsp;
            <span className="font-semibold text-slate-200 font-premium-numbers">{formatCurrency(actualBalance)}</span>
          </span>
          {totalPendingExpenses > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="font-semibold text-slate-200 font-premium-numbers">
                −{formatCurrency(totalPendingExpenses)} réservés
              </span>
            </>
          )}
          {creditBalance !== 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="font-semibold text-slate-200 font-premium-numbers">
                {formatCurrency(Math.abs(creditBalance))} en cartes
              </span>
            </>
          )}
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="relative z-10 bg-[#070e20]/95 border border-white/10 rounded-2xl p-4 space-y-4 animate-fade-in text-white shadow-xl">
            {/* Header Settings */}
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wide text-blue-100">Configuration du solde</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs font-bold text-amber-400 hover:underline"
              >
                Fermer
              </button>
            </div>

            {/* Section 1: Accounts */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <label className="text-xs font-semibold text-blue-100 flex items-center gap-1.5">
                  <Wallet size={14} className="text-amber-400" /> Comptes inclus
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllAccounts}
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/10 border border-white/10 rounded hover:bg-white/15 active:scale-95 text-white transition-all"
                  >
                    Tous
                  </button>
                  {accounts.some(acc => acc.type === 'checking') && (
                    <button
                      type="button"
                      onClick={handleSelectOnlyCheckingAccounts}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/10 border border-white/10 rounded hover:bg-white/15 active:scale-95 text-white transition-all"
                    >
                      Courants
                  </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-blue-200/70 leading-relaxed">
                Sélectionnez les comptes à inclure dans le calcul du solde disponible.
              </p>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar border border-white/10 rounded-xl p-1.5 bg-[#030816]/30">
                {accounts.length === 0 ? (
                  <p className="text-[11px] text-blue-200/50 text-center py-4">Aucun compte disponible.</p>
                ) : (
                  accounts.map((acc) => {
                    const isSelected = activeSelectedIds.includes(acc._id);
                    return (
                      <div
                        key={acc._id}
                        onClick={() => handleAccountToggle(acc._id)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all active-spring-sm cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#0b152d] border-white/15 shadow-sm'
                            : 'bg-transparent border-transparent opacity-50 hover:opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                           <div className="text-blue-300 shrink-0">
                            {isSelected ? (
                              <CheckCircle2 size={14} className="text-amber-400" />
                            ) : (
                              <Circle size={14} className="text-blue-100/30" />
                            )}
                          </div>
                          <div
                            className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-[10px] border border-white/10 shrink-0"
                            style={{ backgroundColor: `${acc.color || '#10b981'}25`, color: acc.color || '#10b981' }}
                          >
                            {acc.type === 'credit' ? <CreditCard size={11} /> : <Wallet size={11} />}
                          </div>
                          <span className="text-xs font-semibold text-white truncate max-w-[130px]">{acc.name}</span>
                        </div>
                        <span className="font-premium-numbers font-semibold text-xs text-blue-200 shrink-0">
                          {formatCurrency(acc.balance)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-[1px] bg-white/10" />

            {/* Section 2: Paycheck Day */}
            <div className="space-y-2.5">
              <label htmlFor="paycheck-select" className="text-xs font-semibold text-blue-100 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-400" /> Jour récurrent de paye
              </label>
              <p className="text-[11px] text-blue-200/70 leading-relaxed">
                Le Solde Plancher déduit les factures prévues entre aujourd'hui et votre prochaine paye. Configurez le jour ou laissez en automatique.
              </p>
              <div className="relative z-10">
                <Select
                  id="paycheck-select"
                  value={paycheckDayConfig}
                  onChange={(e) => handlePaycheckDayChange(e.target.value)}
                  className="w-full bg-[#030816] border border-white/15 px-3 py-2 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  <option value="auto">Automatique (Détecter via les revenus)</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Le {day === 1 ? '1er' : day} du mois
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Level 3: Visually detached sub-block containing IA insights & Deadlines list */}
        <div className="relative z-10 bg-black/20 border border-white/5 rounded-2xl p-3.5 space-y-3.5 shadow-inner">
          
          {/* Contextual micro-phrase */}
          <div className={`flex flex-col gap-2 p-3.5 rounded-2xl border transition-colors ${
            hasRiskOfNegative || !isComfortable
              ? 'bg-rose-500/10 border-rose-500/15 text-rose-200'
              : 'bg-white/5 border-white/5 text-blue-100'
          }`}>
            <div className="flex items-center justify-between">
              {hasRiskOfNegative || !isComfortable ? (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-300 uppercase tracking-wide">
                  <AlertTriangle size={12} /> Alerte
                </span>
              ) : (
                <AiBadge text="Coach IA" />
              )}
            </div>
            <p className="text-[11px] font-semibold leading-relaxed">{contextPhrase}</p>
          </div>

          {/* Accordion — Échéances avant la paye */}
          <div className="border-t border-white/5 pt-3">
            <button
              onClick={() => setIsAccordionExpanded(!isAccordionExpanded)}
              className="w-full flex justify-between items-center px-3 py-2 text-xs font-bold text-white focus:outline-none rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-white/10 active-spring-sm transition-all"
              aria-expanded={isAccordionExpanded}
            >
              <span className="flex items-center gap-2">
                Échéances avant la paye
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-white/10 text-blue-200 border border-white/5 font-premium-numbers">
                  {pendingRecurringExpenses.length}
                </span>
              </span>
              {isAccordionExpanded ? (
                <ChevronUp size={16} className="text-blue-200" />
              ) : (
                <ChevronDown size={16} className="text-blue-200" />
              )}
            </button>

            {isAccordionExpanded && (
              <div className="space-y-2 mt-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                {pendingRecurringExpenses.length === 0 ? (
                  <div className="text-center py-6 text-blue-200/50 text-xs border border-dashed border-white/10 rounded-2xl bg-[#030816]/20">
                    Aucune charge planifiée détectée d'ici la paye.
                  </div>
                ) : (
                  pendingRecurringExpenses.map((tx) => {
                    const isExcluded = excludedIds.includes(tx._id);
                    const catColor = tx.categoryId?.color || '#a1a1aa';
                    const catIcon = tx.categoryId?.icon || '🔁';

                    return (
                      <div
                        key={tx._id}
                        onClick={() => toggleExpenseExclusion(tx._id)}
                        className={`min-h-[48px] py-2.5 px-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                          isExcluded
                            ? 'bg-white/5 border-white/5 opacity-40'
                            : 'bg-white/10 border-white/10 active-spring-sm hover:bg-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1 text-blue-300">
                            {isExcluded ? (
                              <CheckCircle2 size={18} className="text-amber-400" />
                            ) : (
                              <Circle size={18} className="text-blue-200/40" />
                            )}
                          </div>
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border border-white/5"
                            style={{ backgroundColor: `${catColor}25`, color: catColor }}
                          >
                            {catIcon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate max-w-[130px] leading-tight text-white ${
                              isExcluded ? 'line-through opacity-50' : ''
                            }`}>
                              {tx.description}
                            </p>
                            <p className="text-[9px] text-blue-200/60 mt-0.5">
                              Le{' '}
                              {new Date(tx.date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold font-premium-numbers shrink-0 text-white ${
                          isExcluded ? 'opacity-50' : ''
                        }`}>
                          −{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FloorBalanceWidget;
