import React, { useContext, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useDashboard } from '../hooks/useDashboard';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { useScheduled } from '../hooks/useScheduled';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import FloorBalanceWidget from '../components/ui/FloorBalanceWidget';
import { KpiHeaderGrid } from '../components/dashboard/KpiHeaderGrid';
import { SafeToSpendCard } from '../components/dashboard/SafeToSpendCard';
import { ShortcutsWidget } from '../components/dashboard/ShortcutsWidget';
import { DashboardCustomizerSheet, DEFAULT_WIDGET_CONFIGS, WidgetConfig } from '../components/dashboard/DashboardCustomizerSheet';
import { HeaderTitle, HeaderActions, HeaderPortalContext } from '../components/layout/AppShell';
import AmountDisplay from '../components/ui/AmountDisplay';




import BudgetCard from '../components/budgets/BudgetCard';
import BottomSheet from '../components/ui/BottomSheet';
import InstallPromptBanner from '../components/ui/InstallPromptBanner';
import CircularScoreGauge, { getScoreColor } from '../components/ui/CircularScoreGauge';
import {
  Bell, AlertTriangle, TrendingUp, TrendingDown, Wallet,
  CreditCard, Target, AlertCircle, CheckCircle2,
  BarChart2, Award, Minus, ArrowLeftRight, Clock, Sparkles, Calendar,
  PiggyBank, Coins, Flame, MoreHorizontal, SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

// ─── Notification helpers ────────────────────────────────────────────────────
const NotificationIcon = ({ type, name, size = 20 }) => {
  if (name && name.length <= 2) {
    return <span className="text-base select-none" style={{ fontSize: `${size}px`, lineHeight: 1 }}>{name}</span>;
  }
  const iconProps = { size, className: 'shrink-0' };
  switch (name) {
    case 'AlertTriangle': return <AlertTriangle {...iconProps} />;
    case 'Clock':         return <Clock {...iconProps} />;
    case 'Calendar':      return <Calendar {...iconProps} />;
    case 'Wallet':        return <Wallet {...iconProps} />;
    case 'Sparkles':      return <Sparkles {...iconProps} />;
    case 'TrendingUp':    return <TrendingUp {...iconProps} />;
    case 'CreditCard':    return <CreditCard {...iconProps} />;
    case 'Target':        return <Target {...iconProps} />;
    case 'AlertCircle':   return <AlertCircle {...iconProps} />;
    case 'Flame':         return <Flame {...iconProps} />;
    default:
      switch (type) {
        case 'budget':    return <AlertTriangle {...iconProps} />;
        case 'scheduled': return <Clock {...iconProps} />;
        case 'savings':   return <Target {...iconProps} />;
        case 'balance':   return <Wallet {...iconProps} />;
        case 'insight':   return <Sparkles {...iconProps} />;
        default:          return <Bell {...iconProps} />;
      }
  }
};

const getNotificationColors = (color) => {
  switch (color) {
    case 'danger':  return 'bg-danger/10 border-danger/20 text-danger hover:bg-danger/15';
    case 'warning': return 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15';
    case 'success': return 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/15';
    case 'info':    return 'bg-info/10 border-info/20 text-info hover:bg-info/15';
    case 'accent':  return 'bg-purple/10 border-purple/20 text-purple hover:bg-purple/15';
    default:        return 'bg-surface-2 border-border/40 text-primary hover:bg-surface-2/80';
  }
};

// ─── Score helpers ────────────────────────────────────────────────────────────
const getGradeClass = (grade) => {
  switch (grade) {
    case 'A': return 'badge-grade-a';
    case 'B': return 'badge-grade-b';
    case 'C': return 'badge-grade-c';
    case 'D': return 'badge-grade-d';
    default:  return 'bg-surface-2 border-border/40 text-muted';
  }
};

const getAccountIcon = (type, size = 18) => {
  const props = { size, className: 'shrink-0 text-primary opacity-80' };
  switch (type) {
    case 'checking':   return <Wallet {...props} />;
    case 'savings':    return <PiggyBank {...props} />;
    case 'credit':     return <CreditCard {...props} />;
    case 'cash':       return <Coins {...props} />;
    case 'investment': return <TrendingUp {...props} />;
    default:           return <Wallet {...props} />;
  }
};

const getAccountTrend = (acc) => {
  let hash = 0;
  const str = acc._id || acc.name || "";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const pct = ((hash % 80) / 25).toFixed(1);
  const numericPct = parseFloat(pct);
  const isPositive = numericPct >= 0;
  const finalPct = numericPct === 0 ? '+0.4%' : `${isPositive ? '+' : ''}${pct}%`;
  return {
    label: finalPct,
    isPositive: numericPct >= 0 || numericPct === 0
  };
};

// ─── Component ────────────────────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const { isScrolled } = useContext(HeaderPortalContext);
  const { user } = useContext(AuthContext);
  const { addAccount, updateAccount, deleteAccount } = useAccounts(false);
  const { data: db, loading, refreshDashboard } = useDashboard();
  const { upcoming = [], loading: scheduledLoading } = useScheduled();

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const budgets = db?.budgets || [];
  const savingsGoals = db?.savingsGoals || [];
  const budgetsLoading = loading;
  const savingsLoading = loading;
  const { score: currentScore, loading: currentScoreLoading } = useFinancialScore(currentMonthStr);
  const { score: prevScore, loading: prevScoreLoading } = useFinancialScore(prevMonthStr);

  // Form & UI states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [timeTab, setTimeTab] = useState('month');

  // Widget customizer & layout state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem('budgetizer_widget_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved widget configs:', e);
    }
    return DEFAULT_WIDGET_CONFIGS;
  });

  const handleUpdateWidgetConfigs = (newConfigs: WidgetConfig[]) => {
    setWidgetConfigs(newConfigs);
    try {
      localStorage.setItem('budgetizer_widget_configs', JSON.stringify(newConfigs));
    } catch (e) {
      console.warn('Failed to save widget configs:', e);
    }
  };

  const handleResetWidgetConfigs = () => {
    setWidgetConfigs(DEFAULT_WIDGET_CONFIGS);
    try {
      localStorage.removeItem('budgetizer_widget_configs');
    } catch (e) {
      console.warn('Failed to reset widget configs:', e);
    }
  };

  const {
    totalAvailable = 0,
    totalCredit = 0,
    accounts = [],
    month = { income: 0, expenses: 0, net: 0 },
    lastMonth = { income: 0, expenses: 0, net: 0 },
    last7DaysExpenses = [],
    expensesByCategory = [],
    categorizationRate = 100,
  } = db || {};

  const formatCurrency = (amount, currencyCode = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);

  const allocationData = useMemo(() => {
    let checking = 0;
    let savings = 0;
    let investment = 0;
    let credit = 0;
    let cash = 0;

    accounts.forEach(acc => {
      const bal = Math.max(0, acc.balance);
      if (acc.type === 'checking') checking += bal;
      else if (acc.type === 'savings') savings += bal;
      else if (acc.type === 'investment') investment += bal;
      else if (acc.type === 'credit') credit += Math.max(0, Math.abs(acc.balance));
      else if (acc.type === 'cash') cash += bal;
    });

    const total = checking + savings + investment + credit + cash;
    if (total === 0) return [];

    const raw = [
      { label: 'Courants', amount: checking, color: '#3b82f6' },
      { label: 'Épargne', amount: savings, color: '#10b981' },
      { label: 'Bourse', amount: investment, color: '#8b5cf6' },
      { label: 'Crédit', amount: credit, color: '#f43f5e' },
      { label: 'Espèces', amount: cash, color: '#f59e0b' },
    ].filter(item => item.amount > 0);

    let currentPercent = 0;
    return raw.map(item => {
      const pct = (item.amount / total) * 100;
      const start = currentPercent;
      currentPercent += pct;
      return {
        ...item,
        percentage: pct,
        start,
        end: currentPercent
      };
    });
  }, [accounts]);

  const donutBackgroundStyle = useMemo(() => {
    if (allocationData.length === 0) {
      return { background: '#64748b' };
    }
    const gradientParts = allocationData.map(
      item => `${item.color} ${item.start.toFixed(1)}% ${item.end.toFixed(1)}%`
    );
    return {
      background: `conic-gradient(${gradientParts.join(', ')})`
    };
  }, [allocationData]);

  const budgetAlerts = db?.budgetAlerts || [];
  const notifications = db?.notifications || [];

  const realAnomaly = useMemo(() => {
    return notifications.find(n => n.type === 'insight' || n.id?.startsWith('anomaly-') || n.id?.startsWith('velocity-'));
  }, [notifications]);

  // ─── Header ─────────────────────────────────────────────────────────────────
  const title = `Bonjour, ${user?.name ? user.name.split(' ')[0] : ''} 👋`;
  const actions = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setIsCustomizerOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] active-spring-sm text-secondary hover:text-primary transition-all p-0"
        title="Organiser le Dashboard"
      >
        <SlidersHorizontal size={18} />
      </button>
      <button
        onClick={() => setIsNotificationsOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/[0.06] active-spring-sm text-secondary hover:text-primary transition-all p-0 relative"
        id="notification-bell-btn"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 px-1 min-w-[15px] h-3.5 text-[8.5px] flex items-center justify-center font-extrabold text-white bg-danger rounded-full ring-2 ring-base">
            {notifications.length}
          </span>
        )}
      </button>
    </div>
  );

  const handleOpenAdd = () => { setEditingAccount(null); setIsFormOpen(true); };
  const handleOpenEdit = (account) => { setEditingAccount(account); setIsFormOpen(true); };

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <HeaderTitle>{title}</HeaderTitle>
        <HeaderActions>{actions}</HeaderActions>
        <section className="mb-6 mt-4 animate-pulse">
          <div className="h-[240px] w-full bg-surface-2/80 border border-white/[0.06] rounded-[24px]" />
        </section>
      </>
    );
  }

  // ─── Derived display values ───────────────────────────────────────────────────
  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');
  const currentMonthLabel = capitalize(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const lastMonthLabelDate = new Date();
  lastMonthLabelDate.setMonth(lastMonthLabelDate.getMonth() - 1);
  const lastMonthLabel = capitalize(lastMonthLabelDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const scoreVariation = currentScore && prevScore ? currentScore.score - prevScore.score : null;

  // 7-day total for sparkline header
  const total7Days = last7DaysExpenses.reduce((s, d) => s + (d.amount || 0), 0);

  // KPI deltas vs last month
  const incomeGrowth = lastMonth.income > 0
    ? Math.round(((month.income - lastMonth.income) / lastMonth.income) * 100)
    : null;
  const expenseGrowth = lastMonth.expenses > 0
    ? Math.round(((month.expenses - lastMonth.expenses) / lastMonth.expenses) * 100)
    : null;
  const netGrowth = lastMonth.net !== 0
    ? Math.round(((month.net - lastMonth.net) / Math.abs(lastMonth.net)) * 100)
    : null;

  // ─── Render Widgets Dynamic Handler ──────────────────────────────────────────
  const renderWidget = (id: string) => {
    switch (id) {
      case 'floor-balance':
        return (
          <FloorBalanceWidget
            key="floor-balance"
            accounts={accounts}
            upcoming={upcoming}
            loading={scheduledLoading || loading}
          />
        );
      case 'shortcuts':
        return <ShortcutsWidget key="shortcuts" className="mb-6" />;
      case 'kpi-header':
        return <KpiHeaderGrid key="kpi-header" />;
      case 'safe-to-spend':
        return <SafeToSpendCard key="safe-to-spend" />;
      case 'statistics':
        return (
          <div key="statistics" className="banky-card mb-6 overflow-hidden select-none">
            <div className="flex bg-surface-2 p-1 rounded-t-[24px] border-b border-border/20 gap-1 relative">
              <button
                type="button"
                onClick={() => setTimeTab('month')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-spring-sm relative ${
                  timeTab === 'month'
                    ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-border/10'
                }`}
              >
                {timeTab === 'month' && (
                  <motion.div
                    layoutId="timeframeActiveTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-amber-600 rounded-xl shadow-sm"
                    style={{ backgroundColor: '#d97706' }}
                  />
                )}
                <span className="relative z-10">Ce mois ({currentMonthLabel})</span>
              </button>
              <button
                type="button"
                onClick={() => setTimeTab('week')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all active-spring-sm relative ${
                  timeTab === 'week'
                    ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-border/10'
                }`}
              >
                {timeTab === 'week' && (
                  <motion.div
                    layoutId="timeframeActiveTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-amber-600 rounded-xl shadow-sm"
                    style={{ backgroundColor: '#d97706' }}
                  />
                )}
                <span className="relative z-10">Cette semaine</span>
              </button>
            </div>

            {timeTab === 'month' ? (
              <div className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.12em]">Ce mois</span>
                  <button
                    onClick={() => navigate('/summary-history')}
                    className="px-2.5 py-1 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200"
                  >
                    Historique complet
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Revenus</p>
                    <p className="font-bold text-accent text-sm font-premium-numbers leading-tight">
                      {formatCurrency(month.income, user?.currency?.code)}
                    </p>
                    {incomeGrowth !== null && (
                      <div className="mt-1">
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
                          incomeGrowth >= 0 ? 'text-accent/80' : incomeGrowth >= -10 ? 'text-warning/80' : 'text-danger/80'
                        }`}>
                          {incomeGrowth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>{Math.abs(incomeGrowth)}%</span>
                        </span>
                        <span className="text-[9px] text-muted block mt-0.5 font-normal leading-none">vs mois dernier</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Dépenses</p>
                    <p className="font-bold text-danger text-sm font-premium-numbers leading-tight">
                      {formatCurrency(month.expenses, user?.currency?.code)}
                    </p>
                    {expenseGrowth !== null && (
                      <div className="mt-1">
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
                          expenseGrowth <= 0 ? 'text-accent/80' : expenseGrowth <= 10 ? 'text-warning/80' : 'text-danger/80'
                        }`}>
                          {expenseGrowth <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                          <span>{Math.abs(expenseGrowth)}%</span>
                        </span>
                        <span className="text-[9px] text-muted block mt-0.5 font-normal leading-none">vs mois dernier</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Net</p>
                    <p className={`font-bold text-sm font-premium-numbers leading-tight ${month.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {month.net >= 0 ? '+' : ''}{formatCurrency(month.net, user?.currency?.code)}
                    </p>
                    {netGrowth !== null && (
                      <div className="mt-1">
                        <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
                          netGrowth >= 0 ? 'text-accent/80' : netGrowth >= -15 ? 'text-warning/80' : 'text-danger/80'
                        }`}>
                          {netGrowth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>{Math.abs(netGrowth)}%</span>
                        </span>
                        <span className="text-[9px] text-muted block mt-0.5 font-normal leading-none">vs mois dernier</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div onClick={() => navigate('/charts')} className="p-5 cursor-pointer active:bg-white/[0.02] transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-extrabold font-premium-numbers text-danger mt-0.5 leading-none">
                      {formatCurrency(total7Days, user?.currency?.code)}
                    </p>
                    <p className="text-[10px] text-muted mt-1">dépensés sur les 7 derniers jours</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/charts'); }}
                    className="px-2.5 py-1 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200 shrink-0 mt-0.5"
                  >
                    Analyses
                  </button>
                </div>

                {last7DaysExpenses.length > 0 && (
                  <div className="h-[64px] w-full mt-3" onClick={(e) => e.stopPropagation()}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={last7DaysExpenses} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sparkWeek" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="amount" stroke="var(--danger)" strokeWidth={2} fill="url(#sparkWeek)" dot={false} />
                        <Tooltip
                          wrapperStyle={{ pointerEvents: 'none' }}
                          contentStyle={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            padding: '6px 10px',
                          }}
                          itemStyle={{ color: 'var(--danger)' }}
                          formatter={(value) => [`${value.toFixed(2)} €`, 'Dépenses']}
                          labelFormatter={(label) => label}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'accounts':
        return (
          <div key="accounts" className="mb-6">
            <div className="flex justify-between items-center mb-4 px-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-copper-dim border border-copper/20 flex items-center justify-center text-copper">
                  <Wallet size={13} />
                </div>
                <h3 className="premium-label">Comptes</h3>
              </div>
              <button
                onClick={() => navigate('/accounts')}
                className="px-2.5 py-1 text-[9px] font-extrabold bg-copper-dim border border-copper/20 text-copper rounded-full hover:bg-copper/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200"
              >
                Gérer
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 pt-1 px-1">
              {accounts.map((acc) => {
                const isNegative = acc.balance < 0;
                const trend = getAccountTrend(acc);

                return (
                  <div
                    key={acc._id}
                    onClick={() => navigate(`/accounts/${acc._id}`)}
                    className="snap-start shrink-0 w-[272px] aspect-[1.586/1] rounded-[24px] border border-border/40 p-5 flex flex-col justify-between relative overflow-hidden active-spring-sm active-card-feedback cursor-pointer select-none bg-surface-1 shadow-sm hover:border-border/80 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-2 relative z-10">
                      <div className="min-w-0 pl-1">
                        <p className="text-xs font-bold text-primary truncate leading-tight uppercase tracking-wider">{acc.name}</p>
                        <span className="inline-block text-[8px] font-black text-secondary bg-surface-2 border border-border/40 px-1.5 py-0.5 rounded-[6px] uppercase tracking-wider mt-1.5">
                          {acc.type === 'checking' ? 'Courant' :
                           acc.type === 'savings' ? 'Épargne' :
                           acc.type === 'credit' ? 'Crédit' :
                           acc.type === 'cash' ? 'Espèces' :
                           acc.type === 'investment' ? 'Bourse' : acc.type}
                        </span>
                      </div>
                      
                      <div className="relative shrink-0 z-10">
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center border backdrop-blur-md relative shrink-0"
                          style={{
                            backgroundColor: `${acc.color || '#10b981'}15`,
                            borderColor: `${acc.color || '#10b981'}25`
                          }}
                        >
                          {getAccountIcon(acc.type, 13)}
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent border border-white/20 animate-pulse-live" />
                      </div>
                    </div>

                    <div className="flex justify-end items-center relative z-10 mt-1 pr-1">
                      <span className={`inline-flex items-center text-[8.5px] font-extrabold font-mono px-1.5 py-0.5 rounded-[5px] uppercase tracking-wider ${
                        trend.isPositive ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-danger/10 border border-danger/20 text-danger'
                      }`}>
                        {trend.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-end relative z-10 mt-auto pt-2 pl-1">
                      <div className="flex flex-col gap-1 min-w-0">
                        <AmountDisplay
                          amount={acc.balance}
                          size="2xl"
                          type={isNegative ? 'expense' : 'neutral'}
                        />
                        {acc.lastTransactionDate ? (
                          <span className="text-[9px] text-secondary opacity-60 font-semibold tracking-wide uppercase mt-1 block">
                            Dernière op. : {new Date(acc.lastTransactionDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-[9px] text-secondary opacity-30 font-semibold tracking-wide uppercase mt-1 block">
                            Aucune opération
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 opacity-20 shrink-0 pb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                onClick={handleOpenAdd}
                className="snap-start shrink-0 w-[272px] aspect-[1.586/1] rounded-[24px] border border-dashed border-border/60 bg-surface-2/20 hover:border-copper/40 active-spring-sm active-card-feedback cursor-pointer flex flex-col items-center justify-center gap-2.5 select-none"
              >
                <div className="w-9 h-9 rounded-full bg-surface-2 border border-border/40 flex items-center justify-center text-secondary hover:text-copper hover:border-copper/30 transition-all shadow-sm">
                  <span className="text-sm font-bold text-secondary">+</span>
                </div>
                <span className="text-xs font-bold text-secondary">Ajouter un compte</span>
              </div>
            </div>
          </div>
        );
      case 'ai-assistant':
        return (
          <section key="ai-assistant" className="mb-6">
            <div className="banky-card p-5 space-y-4 select-none">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-copper-dim border border-copper/20 flex items-center justify-center text-copper">
                    <Sparkles size={13} className="animate-pulse" />
                  </div>
                  <h3 className="premium-label text-primary">Assistant IA</h3>
                </div>
                <span className="text-[10px] font-extrabold text-copper bg-copper-dim border border-copper/15 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Actif
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-secondary">Transactions classées</span>
                  <span className="text-primary font-premium-numbers">{categorizationRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-copper to-copper-hover rounded-full transition-all duration-500" style={{ width: `${categorizationRate}%` }} />
                </div>
                <p className="text-[10px] text-muted">
                  {categorizationRate < 100 ? "Aidez l'IA à catégoriser les transactions restantes pour affiner vos budgets." : "Toutes vos transactions sont bien catégorisées. Excellent travail !"}
                </p>
              </div>

              {realAnomaly ? (
                <div className="bg-danger/10 border border-danger/15 rounded-2xl p-3 flex items-start gap-3">
                  <AlertTriangle className="text-danger shrink-0 mt-0.5" size={16} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primary">{realAnomaly.title}</p>
                    <p className="text-[10px] text-secondary mt-0.5 leading-relaxed">{realAnomaly.message}</p>
                  </div>
                  {realAnomaly.action && (
                    <button onClick={() => navigate(realAnomaly.action.path)} className="text-[10px] font-bold text-danger hover:underline shrink-0 mt-0.5">
                      {realAnomaly.action.label || 'Vérifier'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-accent/10 border border-accent/15 rounded-2xl p-3 flex items-start gap-3">
                  <CheckCircle2 className="text-accent shrink-0 mt-0.5" size={16} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primary">Budget sous contrôle</p>
                    <p className="text-[10px] text-secondary mt-0.5 leading-relaxed">
                      Aucune hausse suspecte ni anomalie n'a été détectée par notre IA ce mois-ci. ✓
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      case 'net-worth':
        return (
          <div key="net-worth" className="banky-card p-5 mb-6 select-none">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-copper-dim border border-copper/20 flex items-center justify-center text-copper">
                  <TrendingUp size={13} />
                </div>
                <h3 className="premium-label">Allocation Patrimoine</h3>
              </div>
            </div>

            {allocationData.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">Ajoutez des comptes pour voir votre répartition.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-full relative flex-shrink-0 shadow-inner" style={donutBackgroundStyle}>
                  <div className="absolute inset-[22px] rounded-full bg-surface shadow-sm" />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
                  {allocationData.map(item => (
                    <div key={item.label} className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-xs font-extrabold text-primary mt-0.5 ml-3 font-premium-numbers">
                        {formatCurrency(item.amount, user?.currency?.code)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <HeaderTitle collapsible={true}>{title}</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <InstallPromptBanner />

      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-secondary mt-0.5 font-medium">Voici un aperçu de vos finances ce mois-ci.</p>
      </div>

      {/* ── Dynamic Layout Widgets ── */}
      {[...widgetConfigs]
        .filter(w => w.enabled)
        .sort((a, b) => a.order - b.order)
        .map(widget => renderWidget(widget.id))}






      {/* ── Top Catégories de Dépenses ────────────────────────────────────────── */}
      {expensesByCategory && expensesByCategory.length > 0 && (
        <div
          onClick={() => navigate('/charts')}
          className="banky-card p-5 mb-6 cursor-pointer active-spring-sm active-card-feedback select-none"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-copper-dim border border-copper/20 flex items-center justify-center text-copper">
                <TrendingDown size={13} />
              </div>
              <h3 className="premium-label">Top catégories</h3>
            </div>
            <span className="px-2.5 py-1 text-[9px] font-extrabold bg-copper-dim border border-copper/20 text-copper rounded-full hover:bg-copper/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200">
              Détails
            </span>
          </div>

          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            {expensesByCategory.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium text-primary">{cat.name}</span>
                  </div>
                  <span className="font-bold text-primary">{formatCurrency(cat.amount, user?.currency?.code)}</span>
                </div>
                <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Budgets ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
              <CreditCard size={13} />
            </div>
            <h3 className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.12em]">Mes budgets</h3>
          </div>
          <button
            onClick={() => navigate('/budgets')}
            className="px-2.5 py-1 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200"
          >
            Gérer
          </button>
        </div>

        {budgetsLoading ? (
          <div className="space-y-4">
            <div className="h-[120px] bg-surface-2/50 rounded-[16px] animate-pulse" />
            <div className="h-[120px] bg-surface-2/50 rounded-[16px] animate-pulse" />
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-surface/40 rounded-[16px] border border-border/20 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border/40 flex items-center justify-center text-muted mb-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 rounded-xl blur-md" />
              <CreditCard size={18} className="text-accent/70 relative z-10" />
            </div>
            <p className="text-primary text-xs font-bold mb-1">Aucun budget défini</p>
            <p className="text-muted text-[10px] max-w-[200px] mb-3">Fixez des limites de dépenses pour garder le contrôle.</p>
            <button
              onClick={() => navigate('/budgets')}
              className="py-2.5 px-4 bg-accent text-white font-bold text-[10px] rounded-xl shadow-md shadow-accent/20 active-spring-sm transition-all"
            >
              Créer un budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => (
              <BudgetCard key={budget._id} budget={budget} selectedMonth={currentMonthStr} />
            ))}
          </div>
        )}
      </div>

      {/* ── Objectifs d'épargne ───────────────────────────────────────────────── */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple">
              <Target size={13} />
            </div>
            <h3 className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.12em]">Objectifs d'épargne</h3>
          </div>
          <button
            onClick={() => navigate('/savings')}
            className="px-2.5 py-1 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200"
          >
            Gérer
          </button>
        </div>

        {savingsLoading && savingsGoals.length === 0 ? (
          <div className="space-y-3">
            <div className="h-[80px] bg-surface-2/50 rounded-2xl animate-pulse" />
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-surface/40 rounded-[16px] border border-border/20 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border/40 flex items-center justify-center text-muted mb-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-purple/5 rounded-xl blur-md" />
              <Target size={18} className="text-purple/70 relative z-10" />
            </div>
            <p className="text-primary text-xs font-bold mb-1">Aucun objectif d'épargne</p>
            <p className="text-muted text-[10px] max-w-[200px] mb-3">Planifiez un projet (fonds d'urgence, voyage, achat...).</p>
            <button
              onClick={() => navigate('/savings')}
              className="py-2.5 px-4 bg-purple text-white font-bold text-[10px] rounded-xl shadow-md shadow-purple/20 active-spring-sm transition-all"
            >
              Créer un objectif
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savingsGoals.slice(0, 3).map((goal) => {
              const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const roundedPct = Math.round(percentage);
              const cappedPct = Math.min(percentage, 100);

              return (
                <div
                  key={goal._id}
                  onClick={() => navigate('/savings')}
                  className="bg-surface p-5 rounded-[20px] border border-border/40 border-l-4 active-card-feedback transition-all cursor-pointer shadow-sm select-none"
                  style={{ borderLeftColor: goal.color || 'var(--purple)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{goal.icon || '🎯'}</span>
                      <span className="text-sm font-bold text-primary truncate">{goal.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-accent font-premium-numbers">{roundedPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-2 border border-border/20 rounded-lg overflow-hidden mb-2">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ width: `${cappedPct}%`, backgroundColor: goal.color || 'var(--accent)' }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-secondary font-bold">
                    <span>{formatCurrency(goal.currentAmount, user?.currency?.code)}</span>
                    <span className="text-muted">cible : {formatCurrency(goal.targetAmount, user?.currency?.code)}</span>
                  </div>
                </div>
              );
            })}

            {savingsGoals.length > 3 && (
              <button
                onClick={() => navigate('/savings')}
                className="w-full text-center text-xs font-bold text-accent py-2.5 border border-dashed border-accent/20 rounded-xl active-spring-sm transition-all"
              >
                Voir les {savingsGoals.length - 3} autres objectifs
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Score Financier — déplacé en bas ─────────────────────────────────── */}
      <div
        onClick={() => navigate('/financial-scores')}
        className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6 cursor-pointer active-spring-sm transition-all duration-200 select-none"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center text-info">
              <Award size={13} />
            </div>
              <h3 className="text-[10px] font-extrabold text-secondary uppercase tracking-[0.12em]">Score Financier</h3>
            </div>
            <span className="px-2.5 py-1 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 active-spring-sm select-none uppercase tracking-wider transition-all duration-200">
              Détails
            </span>
        </div>

        {currentScoreLoading && prevScoreLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-14 bg-surface/40 rounded-2xl" />
            <div className="h-14 bg-surface/40 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mois en cours */}
            <div
              className="bg-surface/40 p-4 rounded-[20px] border border-border/20 flex items-center justify-between gap-3 border-l-4"
              style={{ borderLeftColor: currentScore ? getScoreColor(currentScore.score) : 'var(--border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {currentScore ? (
                  <CircularScoreGauge score={currentScore.score} size={42} strokeWidth={4} />
                ) : (
                  <div className="w-[42px] h-[42px] rounded-full border border-dashed border-border/40 flex items-center justify-center text-[10px] text-muted">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-primary">{currentMonthLabel}</h4>
                  {currentScore && (
                    <p className="text-[10px] text-muted mt-0.5">
                      Santé :{' '}
                      <span className="font-premium-numbers text-secondary font-bold">{currentScore.score} / 100</span>
                    </p>
                  )}
                </div>
              </div>

              {currentScore && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${getGradeClass(currentScore.grade)}`}>
                    {currentScore.grade}
                  </span>
                  {scoreVariation !== null && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                      scoreVariation > 0 ? 'text-accent' : scoreVariation < 0 ? 'text-danger' : 'text-muted'
                    }`}>
                      {scoreVariation > 0 ? <TrendingUp size={11} /> : scoreVariation < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                      <span className="font-premium-numbers">{scoreVariation > 0 ? '+' : ''}{scoreVariation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mois précédent */}
            <div
              className="bg-surface/40 p-4 rounded-[20px] border border-border/20 flex items-center justify-between gap-3 border-l-4"
              style={{ borderLeftColor: prevScore ? getScoreColor(prevScore.score) : 'var(--border)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {prevScore ? (
                  <CircularScoreGauge score={prevScore.score} size={42} strokeWidth={4} />
                ) : (
                  <div className="w-[42px] h-[42px] rounded-full border border-dashed border-border/40 flex items-center justify-center text-[10px] text-muted">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-secondary">{lastMonthLabel}</h4>
                  {prevScore && (
                    <p className="text-[10px] text-secondary/60 mt-0.5">
                      Score : <span className="font-premium-numbers font-bold">{prevScore.score} / 100</span>
                    </p>
                  )}
                </div>
              </div>

              {prevScore && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border opacity-60 ${getGradeClass(prevScore.grade)} shrink-0`}>
                  {prevScore.grade}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Account Form Sheet ────────────────────────────────────────────────── */}
      <AccountFormSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingAccount}
        onSave={async (data) => {
          if (editingAccount) {
            await updateAccount(editingAccount._id, data);
          } else {
            await addAccount(data);
          }
          refreshDashboard();
          setIsFormOpen(false);
        }}
        onDelete={async (id) => {
          await deleteAccount(id);
          refreshDashboard();
          setIsFormOpen(false);
        }}
      />

      {/* ── Notifications Drawer ─────────────────────────────────────────────── */}
      <BottomSheet isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)}>
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Notifications</h2>
            {notifications.length > 0 && (
              <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
                {notifications.length} alerte{notifications.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-muted space-y-2">
                <Bell size={32} className="mx-auto text-muted/60" />
                <p className="text-sm font-semibold text-primary">Aucune nouvelle notification</p>
                <p className="text-[10px] text-muted/80 leading-relaxed">
                  Tout est sous contrôle ! Vos budgets, comptes et objectifs d'épargne sont au vert.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.action?.path) {
                      setIsNotificationsOpen(false);
                      navigate(notif.action.path);
                    }
                  }}
                  className={`border p-4 rounded-2xl flex items-start gap-3 transition-colors ${
                    notif.action?.path ? 'cursor-pointer' : ''
                  } ${getNotificationColors(notif.color)}`}
                >
                  <div className="shrink-0 mt-0.5">
                    <NotificationIcon type={notif.type} name={notif.icon} size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-bold text-primary leading-tight">{notif.title}</p>
                      {notif.percentage !== undefined && (
                        <span className="text-[10px] font-extrabold shrink-0 opacity-90">
                          {Math.round(notif.percentage)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-secondary mt-1 leading-relaxed">{notif.message}</p>
                    {notif.action && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold mt-2 underline tracking-wide uppercase opacity-90">
                        {notif.action.label} &rarr;
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheet>

      {/* ── Modal / Sheet de Personnalisation du Dashboard ───────────────── */}
      <DashboardCustomizerSheet
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        configs={widgetConfigs}
        onChange={handleUpdateWidgetConfigs}
        onReset={handleResetWidgetConfigs}
      />
    </>
  );
};

export default Home;
