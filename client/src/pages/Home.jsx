import React, { useContext, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useDashboard } from '../hooks/useDashboard';
import { useBudgets } from '../hooks/useBudgets';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { useFinancialScore } from '../hooks/useFinancialScore';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import { HeaderTitle, HeaderActions } from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BottomSheet from '../components/ui/BottomSheet';
import InstallPromptBanner from '../components/ui/InstallPromptBanner';
import CircularScoreGauge from '../components/ui/CircularScoreGauge';
import { 
  Bell, AlertTriangle, TrendingUp, TrendingDown, MoreVertical, Wallet, 
  CreditCard, Sliders, Download, Clock, Calendar, Sparkles, Target, AlertCircle,
  BarChart2, Award, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, LabelList, PieChart, Pie, Cell } from 'recharts';

const MiniGauge = ({ income, expenses }) => {
  const total = income + expenses;
  const data = total === 0 
    ? [{ name: 'Vide', value: 1, color: 'var(--border)' }]
    : [
        { name: 'Revenus', value: income, color: 'var(--accent)' },
        { name: 'Dépenses', value: expenses, color: 'var(--danger)' }
      ];
  
  return (
    <div className="w-[45px] h-[45px] flex items-center justify-center relative overflow-hidden shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx="100%"
            cy="50%"
            innerRadius={15}
            outerRadius={22}
            startAngle={90}
            endAngle={270}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const NotificationIcon = ({ type, name, size = 20 }) => {
  if (name && name.length <= 2) {
    return <span className="text-base select-none" style={{ fontSize: `${size}px`, lineHeight: 1 }}>{name}</span>;
  }

  const iconProps = { size, className: "shrink-0" };
  
  switch (name) {
    case 'AlertTriangle':
      return <AlertTriangle {...iconProps} />;
    case 'Clock':
      return <Clock {...iconProps} />;
    case 'Calendar':
      return <Calendar {...iconProps} />;
    case 'Wallet':
      return <Wallet {...iconProps} />;
    case 'Sparkles':
      return <Sparkles {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'CreditCard':
      return <CreditCard {...iconProps} />;
    case 'Target':
      return <Target {...iconProps} />;
    case 'AlertCircle':
      return <AlertCircle {...iconProps} />;
    default:
      switch (type) {
        case 'budget':
          return <AlertTriangle {...iconProps} />;
        case 'scheduled':
          return <Clock {...iconProps} />;
        case 'savings':
          return <Target {...iconProps} />;
        case 'balance':
          return <Wallet {...iconProps} />;
        case 'insight':
          return <Sparkles {...iconProps} />;
        default:
          return <Bell {...iconProps} />;
      }
  }
};

const getNotificationColors = (color) => {
  switch (color) {
    case 'danger':
      return 'bg-danger/10 border-danger/20 text-danger hover:bg-danger/15';
    case 'warning':
      return 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15';
    case 'success':
      return 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/15';
    case 'info':
      return 'bg-info/10 border-info/20 text-info hover:bg-info/15';
    case 'accent':
      return 'bg-purple/10 border-purple/20 text-purple hover:bg-purple/15';
    default:
      return 'bg-surface-2 border-border/40 text-primary hover:bg-surface-2/80';
  }
};

// ─── Score helpers (defined outside component for reuse) ──────────────────────
const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return 'text-accent';
    case 'B': return 'text-info';
    case 'C': return 'text-warning';
    case 'D': return 'text-danger';
    default:  return 'text-muted';
  }
};

const getScoreBarColor = (score) => {
  if (score >= 80) return 'var(--accent)';
  if (score >= 60) return 'var(--info)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addAccount, updateAccount, deleteAccount } = useAccounts(false);
  const { data: db, loading, refreshDashboard } = useDashboard();
  
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  // Previous month key
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const { budgets = [], loading: budgetsLoading } = useBudgets(currentMonthStr);
  const { savingsGoals = [], loading: savingsLoading } = useSavingsGoals();
  const { score: currentScore, loading: currentScoreLoading } = useFinancialScore(currentMonthStr);
  const { score: prevScore, loading: prevScoreLoading } = useFinancialScore(prevMonthStr);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSommaireMenuOpen, setIsSommaireMenuOpen] = useState(false);
  const [isTopCategoriesMenuOpen, setIsTopCategoriesMenuOpen] = useState(false);
  const [isBudgetsMenuOpen, setIsBudgetsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountsMenuOpen, setIsAccountsMenuOpen] = useState(false);
  const [isLast7DaysMenuOpen, setIsLast7DaysMenuOpen] = useState(false);
  const [isSavingsMenuOpen, setIsSavingsMenuOpen] = useState(false);
  const [isScoreMenuOpen, setIsScoreMenuOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [chartDuration, setChartDuration] = useState('3M');

  const { 
    totalAvailable = 0, 
    totalCredit = 0, 
    accounts = [], 
    month = { income: 0, expenses: 0, net: 0 }, 
    lastMonth = { income: 0, expenses: 0, net: 0 }, 
    last7DaysExpenses = [], 
    balanceHistory = [], 
    expensesByCategory = [] 
  } = db || {};

  const filteredBalanceHistory = useMemo(() => {
    if (!balanceHistory) return [];
    if (chartDuration === '1M') {
      return balanceHistory.slice(-30);
    } else if (chartDuration === '6M') {
      return balanceHistory.slice(-180);
    } else {
      return balanceHistory.slice(-90);
    }
  }, [balanceHistory, chartDuration]);

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const budgetAlerts = db?.budgetAlerts || [];
  const notifications = db?.notifications || [];
  
  const title = `Bonjour, ${user?.name ? user.name.split(' ')[0] : ''} 👋`;
  const actions = (
    <button 
      onClick={() => setIsNotificationsOpen(true)}
      className="hover:text-primary transition-colors p-1 relative animate-none"
      id="notification-bell-btn"
    >
      <Bell size={20} />
      {notifications.length > 0 && (
        <span className="absolute -top-1 -right-1.5 px-1 min-w-[16px] h-4 text-[8px] flex items-center justify-center font-extrabold text-white bg-danger rounded-full ring-2 ring-base">
          {notifications.length}
        </span>
      )}
    </button>
  );

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <>
        <HeaderTitle>{title}</HeaderTitle>
        <HeaderActions>{actions}</HeaderActions>
        {/* Skeleton Loaders */}
        <section className="mb-8 mt-4 text-center space-y-2 animate-pulse">
          <div className="h-4 bg-surface-2 w-24 mx-auto rounded-full" />
          <div className="h-10 bg-surface-2 w-48 mx-auto rounded-xl" />
          <div className="h-6 bg-surface-2 w-32 mx-auto rounded-full" />
        </section>
        <section className="mb-8 -mx-4">
          <div className="px-4 flex gap-4 overflow-x-auto no-scrollbar">
            <div className="shrink-0 w-[300px] h-[180px] rounded-[24px] bg-surface-2 animate-pulse" />
          </div>
        </section>
      </>
    );
  }

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  const currentMonthLabel = capitalize(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthLabel = capitalize(lastMonthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

  const scoreVariation = currentScore && prevScore ? currentScore.score - prevScore.score : null;

  return (
    <>
      <HeaderTitle>{title}</HeaderTitle>
      <HeaderActions>{actions}</HeaderActions>
      <InstallPromptBanner />
      {/* Sommaire Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Sommaire</h3>
          <div className="absolute right-0">
            <MoreVertical 
              onClick={() => setIsSommaireMenuOpen(true)} 
              className="text-secondary cursor-pointer hover:text-primary transition-colors" 
              size={18} 
              id="sommaire-more-btn"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
          {/* Current Month */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-primary px-1">{currentMonthLabel}</h4>
            <div className="flex items-center gap-2">
              <MiniGauge income={month.income} expenses={month.expenses} />
              <div className="flex-1 space-y-0.5 text-[10px] min-w-0">
                <div className="flex justify-between gap-1">
                  <span className="text-secondary truncate">Revenus:</span>
                  <span className="font-semibold text-accent shrink-0">{formatCurrency(month.income, user?.currency?.code)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-secondary truncate">Dépenses:</span>
                  <span className="font-semibold text-danger shrink-0">-{formatCurrency(month.expenses, user?.currency?.code)}</span>
                </div>
                <div className="flex justify-between border-t border-border/20 pt-0.5 mt-0.5 gap-1">
                  <span className="text-secondary font-medium truncate">Total:</span>
                  <span className={`font-semibold shrink-0 ${month.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {formatCurrency(month.net, user?.currency?.code)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-[1px] bg-border/20 self-stretch my-1" />

          {/* Previous Month */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-primary px-1">{lastMonthLabel}</h4>
            <div className="flex items-center gap-2">
              <MiniGauge income={lastMonth.income} expenses={lastMonth.expenses} />
              <div className="flex-1 space-y-0.5 text-[10px] min-w-0">
                <div className="flex justify-between gap-1">
                  <span className="text-secondary truncate">Revenus:</span>
                  <span className="font-semibold text-accent shrink-0">{formatCurrency(lastMonth.income, user?.currency?.code)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-secondary truncate">Dépenses:</span>
                  <span className="font-semibold text-danger shrink-0">-{formatCurrency(lastMonth.expenses, user?.currency?.code)}</span>
                </div>
                <div className="flex justify-between border-t border-border/20 pt-0.5 mt-0.5 gap-1">
                  <span className="text-secondary font-medium truncate">Total:</span>
                  <span className={`font-semibold shrink-0 ${lastMonth.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {formatCurrency(lastMonth.net, user?.currency?.code)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Financier Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Score Financier</h3>
          <div className="absolute right-0">
            <MoreVertical
              onClick={() => setIsScoreMenuOpen(true)}
              className="text-secondary cursor-pointer hover:text-primary transition-colors"
              size={18}
              id="score-more-btn"
            />
          </div>
        </div>

        {currentScoreLoading && prevScoreLoading ? (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 animate-pulse">
            <div className="space-y-2">
              <div className="h-3 bg-surface w-20 rounded-full" />
              <div className="flex items-center gap-3 pt-1">
                <div className="w-[50px] h-[50px] rounded-full bg-surface" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-surface w-10 rounded-lg" />
                  <div className="h-2.5 bg-surface w-14 rounded-full" />
                </div>
              </div>
            </div>
            <div className="w-[1px] bg-border/20 self-stretch my-1" />
            <div className="space-y-2">
              <div className="h-3 bg-surface w-20 rounded-full" />
              <div className="flex items-center gap-3 pt-1">
                <div className="w-[50px] h-[50px] rounded-full bg-surface" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-surface w-10 rounded-lg" />
                  <div className="h-2.5 bg-surface w-14 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
            {/* Current Month Score */}
            {[{ data: currentScore, label: currentMonthLabel, variation: scoreVariation }, { data: prevScore, label: lastMonthLabel, variation: null }].map(({ data, label, variation }, idx) => (
              <React.Fragment key={label}>
                {idx === 1 && <div className="w-[1px] bg-border/20 self-stretch my-1" />}
                <div className="space-y-2 min-w-0">
                  <h4 className="text-xs font-bold text-primary px-1 truncate">{label}</h4>
                  {!data ? (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-muted">Aucune donnée</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-1">
                      <CircularScoreGauge score={data.score} size={50} strokeWidth={5} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black px-1.5 py-0.5 rounded-lg border ${
                            data.grade === 'A' ? 'bg-accent/10 border-accent/20 text-accent' :
                            data.grade === 'B' ? 'bg-info/10 border-info/20 text-info' :
                            data.grade === 'C' ? 'bg-warning/10 border-warning/20 text-warning' :
                            'bg-danger/10 border-danger/20 text-danger'
                          }`}>
                            {data.grade}
                          </span>
                          {variation !== null && (
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold shrink-0 ${
                              variation > 0 ? 'text-accent' : variation < 0 ? 'text-danger' : 'text-muted'
                            }`}>
                              {variation > 0 ? <TrendingUp size={11} /> : variation < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                              {variation > 0 ? '+' : ''}{variation}
                            </div>
                          )}
                        </div>
                        {data.bonusScore > 0 && (
                          <div className="text-[9px] font-bold text-accent">+{data.bonusScore} bonus</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Comptes Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Comptes</h3>
          <div className="absolute right-0">
            <MoreVertical 
              onClick={() => setIsAccountsMenuOpen(true)}
              className="text-secondary cursor-pointer hover:text-primary transition-colors" 
              size={18} 
              id="accounts-more-btn"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          {accounts.map((acc, index) => {
            const lastTxDateStr = acc.lastTransactionDate 
              ? new Date(acc.lastTransactionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'Aucune transaction';
            
            return (
              <div key={acc._id}>
                {index > 0 && <div className="h-[1px] bg-border/20 my-3" />}
                <div 
                  onClick={() => handleOpenEdit(acc)}
                  className="flex justify-between items-center hover:bg-surface/50 p-2 -mx-2 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm shrink-0"
                      style={{ backgroundColor: `${acc.color || '#4ade80'}20`, color: acc.color }}
                    >
                      {acc.type === 'credit' ? <CreditCard size={18} /> : <Wallet size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary truncate">{acc.name}</p>
                      <p className="text-xs text-muted">Dernière utilisation: {lastTxDateStr}</p>
                    </div>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ${acc.balance >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {formatCurrency(acc.balance, acc.currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={handleOpenAdd}
          className="w-full mt-4 text-xs font-bold text-accent py-2.5 border border-dashed border-accent/30 rounded-xl hover:bg-accent/10 transition-all flex items-center justify-center gap-1.5"
        >
          + Ajouter un compte
        </button>
      </div>

      {/* Dépenses - 7 derniers jours Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Dépenses - 7 derniers jours</h3>
          <div className="absolute right-0">
            <MoreVertical 
              onClick={() => setIsLast7DaysMenuOpen(true)}
              className="text-secondary cursor-pointer hover:text-primary transition-colors" 
              size={18} 
              id="last7days-more-btn"
            />
          </div>
        </div>
        
        <div className="h-40 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={last7DaysExpenses} 
              margin={{ top: 20, right: 5, left: 5, bottom: 0 }}
            >
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={{ stroke: 'var(--border)', strokeWidth: 1 }} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--danger)' }}
                formatter={(value) => [`${value.toFixed(2)} €`, 'Dépenses']}
              />
              <Bar 
                dataKey="amount" 
                fill="var(--danger)" 
                radius={[6, 6, 0, 0]}
              >
                <LabelList 
                  dataKey="amount" 
                  position="top" 
                  formatter={(val) => val > 0 ? `${val.toFixed(0)} €` : ''} 
                  style={{ fill: 'var(--text-secondary)', fontSize: 9, fontWeight: 'bold' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Solde Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-sm font-bold text-primary">Solde</h3>
          <div className="flex bg-surface p-0.5 rounded-xl border border-border/40 text-[10px] font-bold">
            {['1M', '3M', '6M'].map((d) => (
              <button
                key={d}
                onClick={() => setChartDuration(d)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  chartDuration === d 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'text-muted hover:text-primary'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        
        {/* Metrics */}
        <div className="space-y-1 mb-4 px-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-secondary font-medium">Montant total disponible:</span>
            <span className="font-bold text-accent">{formatCurrency(totalAvailable, user?.currency?.code)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-secondary font-medium">Cartes de crédit:</span>
            <span className="font-bold text-danger">{formatCurrency(totalCredit, user?.currency?.code)}</span>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-44 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={filteredBalanceHistory} 
              margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey={chartDuration === '6M' ? 'monthYear' : 'date'} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                interval={chartDuration === '1M' ? 6 : 29}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--info)' }}
                formatter={(value) => [`${value.toFixed(2)} €`, 'Solde disponible']}
              />
              <Area 
                type="monotone" 
                dataKey="available" 
                stroke="var(--text-primary)" 
                strokeWidth={1.5} 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts && budgetAlerts.length > 0 && (
        <section className="mb-8 space-y-3">
          <h3 className="text-sm font-bold text-secondary px-1">Alertes Budget</h3>
          {budgetAlerts.map(alert => (
            <div 
              key={alert.id}
              onClick={() => navigate('/budgets')}
              className="bg-danger/10 border border-danger/20 p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-danger/20 transition-colors"
            >
              <AlertTriangle className="text-danger shrink-0" size={24} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary truncate">Budget {alert.name} dépassé !</p>
                <p className="text-xs text-muted truncate">
                  {formatCurrency(alert.spent, user?.currency?.code)} dépensés sur {formatCurrency(alert.amount, user?.currency?.code)}
                </p>
              </div>
              <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-lg">
                {Math.round(alert.percentage)}%
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Top Expenses by Category */}
      {expensesByCategory && expensesByCategory.length > 0 && (
        <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
          <div className="flex justify-center items-center mb-4 relative">
            <h3 className="text-sm font-bold text-primary text-center">Top catégories de dépenses</h3>
            <div className="absolute right-0">
              <MoreVertical 
                onClick={() => setIsTopCategoriesMenuOpen(true)} 
                className="text-secondary cursor-pointer hover:text-primary transition-colors" 
                size={18} 
                id="top-categories-more-btn"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {expensesByCategory.map(cat => (
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

      {/* Budgets Section */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Mes budgets</h3>
          <div className="absolute right-0">
            <MoreVertical 
              onClick={() => setIsBudgetsMenuOpen(true)} 
              className="text-secondary cursor-pointer hover:text-primary transition-colors" 
              size={18} 
              id="budgets-more-btn"
            />
          </div>
        </div>
        
        {budgetsLoading ? (
          <div className="space-y-4">
            <div className="h-[120px] bg-surface-2/50 rounded-[28px] animate-pulse" />
            <div className="h-[120px] bg-surface-2/50 rounded-[28px] animate-pulse" />
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-8 bg-surface rounded-[28px] border border-dashed border-border/40">
            <p className="text-muted text-xs mb-3">Aucun budget défini pour ce mois.</p>
            <button onClick={() => navigate('/budgets')} className="text-accent text-xs font-bold hover:underline">
              Créer mon premier budget
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map(budget => (
              <BudgetCard 
                key={budget._id} 
                budget={budget} 
                selectedMonth={currentMonthStr}
              />
            ))}
          </div>
        )}
      </div>

      {/* Objectifs d'épargne Section */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Objectifs d'épargne</h3>
          <div className="absolute right-0">
            <MoreVertical 
              onClick={() => setIsSavingsMenuOpen(true)} 
              className="text-secondary cursor-pointer hover:text-primary transition-colors" 
              size={18} 
              id="savings-more-btn"
            />
          </div>
        </div>
        
        {savingsLoading && savingsGoals.length === 0 ? (
          <div className="space-y-3">
            <div className="h-[80px] bg-surface-2/50 rounded-2xl animate-pulse animate-duration-1000" />
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="text-center py-8 bg-surface rounded-[28px] border border-dashed border-border/40">
            <p className="text-muted text-xs mb-3">Aucun objectif d'épargne défini.</p>
            <button onClick={() => navigate('/savings')} className="text-accent text-xs font-bold hover:underline">
              Créer mon premier objectif
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show top 3 goals */}
            {savingsGoals.slice(0, 3).map(goal => {
              const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const roundedPct = Math.round(percentage);
              const cappedPct = Math.min(percentage, 100);
              
              return (
                <div 
                  key={goal._id} 
                  onClick={() => navigate('/savings')}
                  className="bg-surface p-4 rounded-2xl border border-border/30 hover:border-border/60 transition-all cursor-pointer shadow-sm relative overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{goal.icon || '🎯'}</span>
                      <span className="text-sm font-bold text-primary truncate">{goal.name}</span>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-accent">
                      {roundedPct}%
                    </span>
                  </div>
                  
                  <div className="h-2 w-full bg-surface-2 border border-border/20 rounded-lg overflow-hidden mb-2">
                    <div 
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ 
                        width: `${cappedPct}%`, 
                        backgroundColor: goal.color || 'var(--accent)' 
                      }}
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
                className="w-full text-center text-xs font-bold text-accent py-2 hover:underline"
              >
                Voir les {savingsGoals.length - 3} autres objectifs
              </button>
            )}
          </div>
        )}
      </div>

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


      <BottomSheet 
        isOpen={isSommaireMenuOpen} 
        onClose={() => setIsSommaireMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options du Sommaire</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            {/* Detail action */}
            <button
              onClick={() => {
                setIsSommaireMenuOpen(false);
                navigate('/summary-history');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1">
                <span>Afficher le détail</span>
                <p className="text-xs text-muted font-normal mt-0.5">Voir l'historique complet mois par mois</p>
              </div>
            </button>

            {/* Export action */}
            <button
              onClick={() => {
                setIsSommaireMenuOpen(false);
                navigate('/reports');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <Download size={20} />
              </div>
              <div className="flex-1">
                <span>Exporter les rapports</span>
                <p className="text-xs text-muted font-normal mt-0.5">Générer et télécharger un rapport d'activité PDF</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={isTopCategoriesMenuOpen} 
        onClose={() => setIsTopCategoriesMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options des Catégories</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            {/* Detail action */}
            <button
              onClick={() => {
                setIsTopCategoriesMenuOpen(false);
                navigate('/charts');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1">
                <span>Afficher le détail</span>
                <p className="text-xs text-muted font-normal mt-0.5">Accéder aux analyses et graphiques des catégories</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={isBudgetsMenuOpen} 
        onClose={() => setIsBudgetsMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options des Budgets</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            {/* Manage action */}
            <button
              onClick={() => {
                setIsBudgetsMenuOpen(false);
                navigate('/budgets');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <span>Gérer les budgets</span>
                <p className="text-xs text-muted font-normal mt-0.5">Configurer vos budgets et limites mensuelles</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={isAccountsMenuOpen} 
        onClose={() => setIsAccountsMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options des Comptes</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            {/* View accounts action */}
            <button
              onClick={() => {
                setIsAccountsMenuOpen(false);
                navigate('/accounts');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <Wallet size={20} />
              </div>
              <div className="flex-1">
                <span>Afficher les comptes</span>
                <p className="text-xs text-muted font-normal mt-0.5">Visualiser, modifier et gérer vos comptes bancaires</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={isLast7DaysMenuOpen} 
        onClose={() => setIsLast7DaysMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options des Dépenses</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            {/* Custom Histogram Action */}
            <button
              onClick={() => {
                setIsLast7DaysMenuOpen(false);
                navigate('/charts', { state: { tab: 'histogram' } });
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <BarChart2 size={20} />
              </div>
              <div className="flex-1">
                <span>Afficher l'histogramme personnalisé</span>
                <p className="text-xs text-muted font-normal mt-0.5">Analyser vos recettes et dépenses sur une période choisie</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet 
        isOpen={isSavingsMenuOpen} 
        onClose={() => setIsSavingsMenuOpen(false)}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options des Objectifs</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setIsSavingsMenuOpen(false);
                navigate('/savings');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <Target size={20} />
              </div>
              <div className="flex-1">
                <span>Voir les objectifs d'épargne</span>
                <p className="text-xs text-muted font-normal mt-0.5">Consulter, modifier ou ajouter des objectifs d'épargne</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={isScoreMenuOpen}
        onClose={() => setIsScoreMenuOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Options du Score Financier</h2>
          </div>

          {/* Menu list */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsScoreMenuOpen(false);
                navigate('/financial-scores');
              }}
              className="w-full p-4 rounded-2xl bg-surface-2 border border-border/40 flex items-center gap-4 hover:bg-surface-2/80 transition-colors text-left font-bold text-primary"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-accent bg-accent/10">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1">
                <span>Afficher le détail</span>
                <p className="text-xs text-muted font-normal mt-0.5">Voir l'historique complet de vos scores mensuels</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Notifications Drawer */}
      <BottomSheet 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Notifications</h2>
            {notifications.length > 0 && (
              <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-bold">
                {notifications.length} alerte{notifications.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Notifications List */}
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
              notifications.map(notif => (
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
                    <p className="text-[10px] text-secondary mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    
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
