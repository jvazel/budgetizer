import React, { useContext, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useDashboard } from '../hooks/useDashboard';
import { useFinancialScore } from '../hooks/useFinancialScore';
import { useScheduled } from '../hooks/useScheduled';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import FloorBalanceWidget from '../components/ui/FloorBalanceWidget';
import { HeaderTitle, HeaderActions, HeaderPortalContext } from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BottomSheet from '../components/ui/BottomSheet';
import InstallPromptBanner from '../components/ui/InstallPromptBanner';
import CircularScoreGauge from '../components/ui/CircularScoreGauge';
import {
  Bell, AlertTriangle, TrendingUp, TrendingDown, Wallet,
  CreditCard, Target, AlertCircle, CheckCircle2,
  BarChart2, Award, Minus, ArrowLeftRight, Clock, Sparkles, Calendar,
  PiggyBank, Coins, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

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

// ─── Quick shortcuts ──────────────────────────────────────────────────────────
const SHORTCUTS = [
  { label: 'Budgets',      icon: CreditCard,    path: '/budgets',          color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Épargne',      icon: Target,        path: '/savings',          color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Analyses',     icon: BarChart2,      path: '/charts',           color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Abonnements',  icon: Wallet,         path: '/subscriptions',    color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Scores',       icon: Award,          path: '/financial-scores', color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Conseils',     icon: Sparkles,       path: '/ai-insights',      color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Échéances',    icon: Clock,          path: '/scheduled',        color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
  { label: 'Virements',    icon: ArrowLeftRight, path: '/transfers',        color: 'text-secondary bg-white/[0.03] border-white/[0.06] group-hover:text-primary group-hover:border-white/[0.12] group-hover:bg-white/[0.05]' },
];

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

  // Only the two states we actually need
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

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
    <button
      onClick={() => setIsNotificationsOpen(true)}
      className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/[0.06] active:scale-95 text-secondary hover:text-primary transition-all p-0 relative -mr-3"
      id="notification-bell-btn"
    >
      <Bell size={22} />
      {notifications.length > 0 && (
        <span className="absolute top-2 right-2 px-1 min-w-[16px] h-4 text-[9px] flex items-center justify-center font-extrabold text-white bg-danger rounded-full ring-2 ring-base">
          {notifications.length}
        </span>
      )}
    </button>
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

      {/* ── Hero — Vrai Disponible (FloorBalanceWidget est maintenant le hero) ── */}
      <FloorBalanceWidget
        accounts={accounts}
        upcoming={upcoming}
        loading={scheduledLoading || loading}
      />

      {/* ── KPIs du mois — compact strip ────────────────────────────────────── */}
      <div
        onClick={() => navigate('/summary-history')}
        className="bg-surface-2 px-5 py-4 rounded-[22px] border border-border/40 mb-6 shadow-sm cursor-pointer active:scale-[0.99] active:border-border/60 transition-all duration-200 select-none"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-primary">{currentMonthLabel}</h3>
          <span className="text-xs font-semibold text-accent flex items-center gap-0.5">
            Historique →
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {/* Revenus */}
          <div>
            <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Revenus</p>
            <p className="font-bold text-accent text-sm font-premium-numbers leading-tight">
              {formatCurrency(month.income, user?.currency?.code)}
            </p>
            {incomeGrowth !== null && (
              <p className={`text-[11px] mt-0.5 font-medium ${incomeGrowth >= 0 ? 'text-accent/80' : 'text-danger/80'}`}>
                {incomeGrowth >= 0 ? '▲' : '▼'} {Math.abs(incomeGrowth)}%
              </p>
            )}
          </div>
          {/* Dépenses */}
          <div>
            <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Dépenses</p>
            <p className="font-bold text-danger text-sm font-premium-numbers leading-tight">
              {formatCurrency(month.expenses, user?.currency?.code)}
            </p>
            {expenseGrowth !== null && (
              <p className={`text-[11px] mt-0.5 font-medium ${expenseGrowth <= 0 ? 'text-accent/80' : 'text-danger/80'}`}>
                {expenseGrowth <= 0 ? '▼' : '▲'} {Math.abs(expenseGrowth)}%
              </p>
            )}
          </div>
          {/* Net */}
          <div>
            <p className="text-[11px] text-secondary/80 uppercase tracking-wider font-semibold mb-1">Net</p>
            <p className={`font-bold text-sm font-premium-numbers leading-tight ${month.net >= 0 ? 'text-accent' : 'text-danger'}`}>
              {month.net >= 0 ? '+' : ''}{formatCurrency(month.net, user?.currency?.code)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Assistant Intelligent IA ────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm space-y-4 select-none">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Sparkles size={13} className="animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-primary">Assistant IA</h3>
            </div>
            <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/15 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Actif
            </span>
          </div>

          {/* Categorization progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-secondary">Transactions classées</span>
              <span className="text-primary font-mono font-premium-numbers">{categorizationRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-[#b45309] rounded-full transition-all duration-500" 
                style={{ width: `${categorizationRate}%` }}
              />
            </div>
            <p className="text-[10px] text-muted">
              {categorizationRate < 100 
                ? "Aidez l'IA à catégoriser les transactions restantes pour affiner vos budgets." 
                : "Toutes vos transactions sont bien catégorisées. Excellent travail !"}
            </p>
          </div>

          {/* Dynamic Anomaly or Success banner */}
          {realAnomaly ? (
            <div className="bg-danger/10 border border-danger/15 rounded-2xl p-3 flex items-start gap-3">
              <AlertTriangle className="text-danger shrink-0 mt-0.5" size={16} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary">{realAnomaly.title}</p>
                <p className="text-[10px] text-secondary mt-0.5 leading-relaxed">
                  {realAnomaly.message}
                </p>
              </div>
              {realAnomaly.action && (
                <button 
                  onClick={() => navigate(realAnomaly.action.path)}
                  className="text-[10px] font-bold text-danger hover:underline shrink-0 mt-0.5"
                >
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

      {/* ── Raccourcis de Navigation Rapide ─────────────────────────────────── */}
      <section className="mb-6">
        <div className="grid grid-cols-4 gap-2.5">
          {SHORTCUTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center py-3 px-1 rounded-[16px] bg-surface-2 border border-border/40 active:scale-95 active:bg-white/[0.03] active:border-border/60 transition-all text-center gap-2 group select-none shadow-sm"
              >
                {/* Icon container min 44px pour conformité mobile HIG */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${item.color} shrink-0 transition-transform duration-200 group-active:scale-90`}>
                  <Icon size={18} />
                </div>
                <span className="text-[11px] font-semibold text-secondary tracking-tight truncate max-w-full leading-none group-active:text-primary">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Alertes Budget ───────────────────────────────────────────────────── */}
      {budgetAlerts && budgetAlerts.length > 0 && (
        <section className="mb-6 space-y-3">
          <h3 className="text-sm font-bold text-secondary px-1">Alertes Budget</h3>
          {budgetAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => navigate('/budgets')}
              className="bg-danger/10 border border-danger/20 p-4 rounded-2xl flex items-center gap-3 cursor-pointer active:scale-[0.99] active:bg-danger/15 transition-all select-none"
            >
              <AlertTriangle className="text-danger shrink-0" size={22} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">Budget {alert.name} dépassé !</p>
                <p className="text-xs text-muted truncate">
                  {formatCurrency(alert.spent, user?.currency?.code)} dépensés sur{' '}
                  {formatCurrency(alert.amount, user?.currency?.code)}
                </p>
              </div>
              <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-lg shrink-0">
                {Math.round(alert.percentage)}%
              </span>
            </div>
          ))}
        </section>
      )}

      {/* ── Comptes ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-sm font-bold text-primary">Comptes</h3>
          <button
            onClick={() => navigate('/accounts')}
            className="text-[10px] font-bold text-accent flex items-center gap-0.5"
          >
            Gérer →
          </button>
        </div>

        {/* Horizontal scrollable carrousel */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-3 -mx-4 px-4">
          {accounts.map((acc) => {
            const lastTxDateStr = acc.lastTransactionDate
              ? new Date(acc.lastTransactionDate).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })
              : 'Aucune transaction';
            const isNegative = acc.balance < 0;

            return (
              <div
                key={acc._id}
                onClick={() =>
                  acc.type === 'credit'
                    ? navigate(`/accounts/${acc._id}/credit`)
                    : navigate(`/accounts/${acc._id}`)
                }
                className="snap-start shrink-0 w-[270px] aspect-[1.586/1] rounded-[24px] border p-5 flex flex-col justify-between relative overflow-hidden active:scale-[0.97] transition-all cursor-pointer select-none bg-surface"
                style={{
                  background: `linear-gradient(135deg, ${acc.color || '#10b981'}15 0%, ${acc.color || '#10b981'}03 100%), var(--bg-surface)`,
                  borderColor: `${acc.color || '#10b981'}35`,
                  boxShadow: '0 8px 30px -4px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                }}
              >
                {/* Background glow orb */}
                <div 
                  className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                  style={{ backgroundColor: acc.color || '#10b981' }}
                />

                {/* Card Top: Name & Chip */}
                <div className="flex justify-between items-start gap-2 relative z-10">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-primary truncate leading-tight">{acc.name}</p>
                    <div className="mt-1">
                      <span className="inline-block text-[9.5px] font-semibold text-secondary bg-surface-2 border border-border/40 px-1.5 py-0.5 rounded-[6px] uppercase tracking-wider">
                        {acc.type === 'checking' ? 'Courant' :
                         acc.type === 'savings' ? 'Épargne' :
                         acc.type === 'credit' ? 'Crédit' :
                         acc.type === 'cash' ? 'Espèces' :
                         acc.type === 'investment' ? 'Bourse' : acc.type}
                      </span>
                    </div>
                  </div>
                  {/* Account Type Icon */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center border backdrop-blur-md relative z-10 shrink-0"
                    style={{
                      backgroundColor: `${acc.color || '#10b981'}15`,
                      borderColor: `${acc.color || '#10b981'}30`
                    }}
                  >
                    {getAccountIcon(acc.type, 16)}
                  </div>
                </div>

                {/* Card Middle/Bottom: Balance */}
                <div className="relative z-10 mt-auto">
                  <span className="text-[9px] text-muted font-extrabold uppercase tracking-widest block leading-none">Solde Actuel</span>
                  <div className="mt-1">
                    <span className={`font-mono font-extrabold text-xl font-premium-numbers tracking-tight leading-none ${isNegative ? 'text-danger' : 'text-primary'}`}>
                      {formatCurrency(acc.balance, acc.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: acc.color || '#10b981' }} />
                    <span className="text-[10px] font-medium tracking-tight truncate">
                      {lastTxDateStr !== 'Aucune transaction' ? `Màj : ${lastTxDateStr}` : 'Aucune transaction'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "+ Ajouter un compte" Card at the end of the carousel */}
          <div
            onClick={handleOpenAdd}
            className="snap-start shrink-0 w-[270px] aspect-[1.586/1] rounded-[24px] border border-dashed border-border/80 bg-surface-2/30 hover:bg-surface-2/50 hover:border-accent/40 active:scale-[0.97] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 select-none group"
          >
            <div className="w-9 h-9 rounded-full bg-surface/80 border border-border/60 flex items-center justify-center text-secondary group-hover:text-accent group-hover:border-accent/30 transition-all">
              <span className="text-lg font-bold">+</span>
            </div>
            <span className="text-xs font-bold text-secondary group-hover:text-accent transition-all">
              Ajouter un compte
            </span>
          </div>
        </div>
      </div>

      {/* ── Patrimoine & Allocation ────────────────────────────────────────── */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6 select-none">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <TrendingUp size={13} />
            </div>
            <h3 className="text-sm font-bold text-primary">Allocation Patrimoine</h3>
          </div>
        </div>

        {allocationData.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">Ajoutez des comptes pour voir votre répartition.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full relative flex-shrink-0 shadow-inner" style={donutBackgroundStyle}>
              <div className="absolute inset-[18px] rounded-full bg-surface-2 shadow-sm" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
              {allocationData.map(item => (
                <div key={item.label} className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-xs font-extrabold text-primary font-mono mt-0.5 ml-3 font-premium-numbers">
                    {formatCurrency(item.amount, user?.currency?.code)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Dépenses 7 derniers jours — Sparkline ────────────────────────────── */}
      <div
        onClick={() => navigate('/charts')}
        className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6 cursor-pointer active:scale-[0.99] active:border-border/60 transition-all duration-200 select-none"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-sm font-bold text-primary">Cette semaine</h3>
            <p className="text-2xl font-extrabold font-premium-numbers text-danger mt-0.5 leading-none">
              {formatCurrency(total7Days, user?.currency?.code)}
            </p>
            <p className="text-[10px] text-muted mt-1">dépensés sur les 7 derniers jours</p>
          </div>
          <span className="text-[11px] font-bold text-accent flex items-center gap-0.5 shrink-0 mt-0.5">
            Analyses →
          </span>
        </div>

        {last7DaysExpenses.length > 0 && (
          <div className="h-[52px] w-full mt-3" onClick={(e) => e.stopPropagation()}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysExpenses} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                <defs>
                  <linearGradient id="sparkWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  fill="url(#sparkWeek)"
                  dot={false}
                />
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

      {/* ── Top Catégories de Dépenses ────────────────────────────────────────── */}
      {expensesByCategory && expensesByCategory.length > 0 && (
        <div
          onClick={() => navigate('/charts')}
          className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6 cursor-pointer active:scale-[0.99] active:border-border/60 transition-all duration-200 select-none"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-primary">Top catégories</h3>
            <span className="text-[11px] font-bold text-accent flex items-center gap-0.5">Détails →</span>
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
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
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
          <h3 className="text-sm font-bold text-primary">Mes budgets</h3>
          <button
            onClick={() => navigate('/budgets')}
            className="text-[11px] font-bold text-accent flex items-center gap-0.5 select-none"
          >
            Gérer →
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
              className="py-2.5 px-4 bg-accent text-white font-bold text-[10px] rounded-xl shadow-md shadow-accent/20 active:scale-95 transition-all"
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
          <h3 className="text-sm font-bold text-primary">Objectifs d'épargne</h3>
          <button
            onClick={() => navigate('/savings')}
            className="text-[11px] font-bold text-accent flex items-center gap-0.5 select-none"
          >
            Gérer →
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
              className="py-2.5 px-4 bg-purple text-white font-bold text-[10px] rounded-xl shadow-md shadow-purple/20 active:scale-95 transition-all"
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
                  className="bg-surface p-4 rounded-[16px] border border-border/30 active:scale-[0.99] active:border-border/60 transition-all cursor-pointer shadow-sm select-none"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{goal.icon || '🎯'}</span>
                      <span className="text-sm font-bold text-primary truncate">{goal.name}</span>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-accent">{roundedPct}%</span>
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
                className="w-full text-center text-xs font-bold text-accent py-2.5 border border-dashed border-accent/20 rounded-xl active:bg-accent/5 transition-all"
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
        className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6 cursor-pointer active:scale-[0.99] active:border-border/60 transition-all duration-200 select-none"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-primary">Score Financier</h3>
          <span className="text-[10px] font-bold text-accent flex items-center gap-0.5">Détails →</span>
        </div>

        {currentScoreLoading && prevScoreLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-14 bg-surface/40 rounded-2xl" />
            <div className="h-14 bg-surface/40 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mois en cours */}
            <div className="bg-surface/40 p-3.5 rounded-2xl border border-border/20 flex items-center justify-between gap-3">
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
            <div className="bg-surface/40 p-3.5 rounded-2xl border border-border/20 flex items-center justify-between gap-3">
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
    </>
  );
};

export default Home;
