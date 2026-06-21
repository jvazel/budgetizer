import { useState, useContext } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import { useMonthlySummaries } from '../hooks/useMonthlySummaries';

const SummaryHistory = () => {
  const { user } = useContext(AuthContext);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { summaries, availableYears, loading, error, refreshHistory } = useMonthlySummaries(selectedYear);

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const getMonthLabel = (monthIndex, year) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${months[monthIndex]} ${year}`;
  };

  const MonthGauge = ({ income, expenses }) => {
    const total = income + expenses;
    const data = total === 0 
      ? [{ name: 'Vide', value: 1, color: 'var(--border)' }]
      : [
          { name: 'Revenus', value: income, color: 'var(--accent)' },
          { name: 'Dépenses', value: expenses, color: 'var(--danger)' }
        ];
    
    return (
      <div className="w-[75px] h-[75px] flex items-center justify-center relative overflow-hidden shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={22}
              outerRadius={32}
              startAngle={90}
              endAngle={450}
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

  return (
    <>
      <HeaderTitle>Historique</HeaderTitle>
      <HeaderBackButton to="/" />
      {/* Year Filter List */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-6">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all border shrink-0 ${
              selectedYear === year
                ? 'bg-accent text-white border-accent shadow-[0_4px_12px_rgba(74,222,128,0.25)]'
                : 'bg-surface-2 text-secondary border-border/40 hover:text-primary hover:border-border'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 bg-danger/10 border border-danger/20 rounded-[24px] mb-6 p-4">
          <p className="text-danger text-sm font-semibold">{error}</p>
          <button 
            onClick={() => refreshHistory()}
            className="mt-3 text-xs font-bold text-primary underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 bg-surface-2 w-32 rounded-full px-1" />
              <div className="bg-surface-2 p-5 rounded-[24px] border border-border/20 h-[115px] flex items-center justify-between gap-4">
                <div className="w-[75px] h-[75px] rounded-full bg-border/20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-border/20 w-full rounded" />
                  <div className="h-3 bg-border/20 w-3/4 rounded" />
                  <div className="h-3 bg-border/20 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-surface-2 rounded-[28px] border border-dashed border-border/40">
          <p className="text-muted text-sm font-medium mb-1">Aucune transaction trouvée</p>
          <p className="text-muted text-xs">Il n'y a pas de données pour l'année {selectedYear}.</p>
        </div>
      ) : (
        /* Summaries List */
        <div className="space-y-6">
          {summaries.map((summary) => (
            <div key={summary.monthIndex} className="space-y-2">
              <h4 className="text-sm font-bold text-primary px-1">
                {getMonthLabel(summary.monthIndex, selectedYear)}
              </h4>
              <div className="bg-surface-2 p-5 rounded-[24px] border border-border/40 shadow-sm flex items-center justify-between gap-5">
                {/* Donut Chart */}
                <MonthGauge income={summary.income} expenses={summary.expenses} />

                {/* Monthly Details list */}
                <div className="flex-1 space-y-1.5 text-xs min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-[2px] bg-accent shrink-0" />
                      Revenus
                    </span>
                    <span className="font-extrabold text-accent font-premium-numbers">
                      {formatCurrency(summary.income, user?.currency?.code)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-[2px] bg-danger shrink-0" />
                      Dépenses
                    </span>
                    <span className="font-extrabold text-danger font-premium-numbers">
                      -{formatCurrency(summary.expenses, user?.currency?.code)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border/20 pt-1.5 mt-1.5">
                    <span className="text-secondary font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-[2px] bg-muted shrink-0" />
                      Net
                    </span>
                    <span className={`font-extrabold font-premium-numbers ${summary.net >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net, user?.currency?.code)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default SummaryHistory;
