import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import { useDashboard } from '../hooks/useDashboard';
import { useBudgets } from '../hooks/useBudgets';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import MenuSheet from '../components/layout/MenuSheet';
import AppShell from '../components/layout/AppShell';
import BudgetCard from '../components/budgets/BudgetCard';
import BottomSheet from '../components/ui/BottomSheet';
import { Bell, Settings, AlertTriangle, TrendingUp, MoreVertical, Wallet, CreditCard, Sliders, Download } from 'lucide-react';
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

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { addAccount, updateAccount, deleteAccount } = useAccounts();
  const { data: db, loading, refreshDashboard } = useDashboard();
  
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const { budgets = [], loading: budgetsLoading } = useBudgets(currentMonthStr);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSommaireMenuOpen, setIsSommaireMenuOpen] = useState(false);
  const [isTopCategoriesMenuOpen, setIsTopCategoriesMenuOpen] = useState(false);
  const [isBudgetsMenuOpen, setIsBudgetsMenuOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const header = (
    <div className="w-full flex justify-between items-center">
      <h1 className="text-lg font-bold text-primary">Bonjour, {user?.name.split(' ')[0]} 👋</h1>
      <div className="flex gap-4 text-muted">
        <button className="hover:text-primary transition-colors"><Bell size={24} /></button>
        <button onClick={() => setIsMenuOpen(true)} className="hover:text-primary transition-colors"><Settings size={24} /></button>
      </div>
    </div>
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
      <AppShell header={header}>
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
      </AppShell>
    );
  }

  const { 
    totalAvailable = 0, 
    totalCredit = 0, 
    accounts = [], 
    month = { income: 0, expenses: 0, net: 0 }, 
    lastMonth = { income: 0, expenses: 0, net: 0 }, 
    last7DaysExpenses = [], 
    balanceHistory = [], 
    expensesByCategory = [], 
    budgetAlerts = [] 
  } = db || {};

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  const currentMonthLabel = capitalize(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthLabel = capitalize(lastMonthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));

  return (
    <AppShell header={header}>
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

      {/* Comptes Card */}
      <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm mb-6">
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Comptes</h3>
          <div className="absolute right-0">
            <MoreVertical className="text-secondary cursor-pointer hover:text-primary transition-colors" size={18} />
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
            <MoreVertical className="text-secondary cursor-pointer hover:text-primary transition-colors" size={18} />
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
        <div className="flex justify-center items-center mb-4 relative">
          <h3 className="text-sm font-bold text-primary text-center">Solde</h3>
          <div className="absolute right-0">
            <MoreVertical className="text-secondary cursor-pointer hover:text-primary transition-colors" size={18} />
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
              data={balanceHistory} 
              margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--info)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--info)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="monthYear" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                interval={30}
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

      <MenuSheet 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogout={logout}
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

            {/* Future option 1 placeholder */}
            <button
              disabled
              className="w-full p-4 rounded-2xl bg-surface-2/40 border border-border/20 flex items-center gap-4 text-left font-bold text-muted cursor-not-allowed opacity-60"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-muted bg-muted/10">
                <Sliders size={20} />
              </div>
              <div className="flex-1">
                <span>Ajuster les objectifs</span>
                <p className="text-xs text-muted/60 font-normal mt-0.5">Bientôt disponible</p>
              </div>
            </button>

            {/* Future option 2 placeholder */}
            <button
              disabled
              className="w-full p-4 rounded-2xl bg-surface-2/40 border border-border/20 flex items-center gap-4 text-left font-bold text-muted cursor-not-allowed opacity-60"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-muted bg-muted/10">
                <Download size={20} />
              </div>
              <div className="flex-1">
                <span>Exporter les rapports</span>
                <p className="text-xs text-muted/60 font-normal mt-0.5">Bientôt disponible</p>
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
    </AppShell>
  );
};

export default Home;
