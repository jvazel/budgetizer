import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronRight, ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, HelpCircle, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoryChart = () => {
  const [period, setPeriod] = useState('month'); // month, 3months, 6months, year
  const [type, setType] = useState('expense'); // expense, income
  const [compare, setCompare] = useState(true);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ total: 0, categories: [] });
  
  // Drill-down states
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Transaction list bottom sheet states
  const [transactionListSheet, setTransactionListSheet] = useState({ isOpen: false, subcatName: null, txs: [] });

  const getDates = (p) => {
    const end = new Date();
    const start = new Date();
    if (p === 'month') {
      start.setDate(1);
    } else if (p === '3months') {
      start.setMonth(start.getMonth() - 3);
    } else if (p === '6months') {
      start.setMonth(start.getMonth() - 6);
    } else if (p === 'year') {
      start.setMonth(0);
      start.setDate(1);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDates(period);
      const res = await api.get(`/charts/by-category?startDate=${startDate}&endDate=${endDate}&type=${type}`);
      setData(res.data);
      setSelectedCategory(null); // Reset drilldown on fetch
    } catch (err) {
      toast.error('Erreur lors du chargement des graphiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [period, type]);

  const handleSliceClick = (entry) => {
    if (!selectedCategory) {
      // Find exact category object
      const cat = data.categories.find(c => c.name === entry.name);
      if (cat && cat.subcategories && cat.subcategories.length > 0) {
        setSelectedCategory(cat);
      }
    }
  };

  const handleSubcategoryClick = async (subcatName) => {
    try {
      const { startDate, endDate } = getDates(period);
      // Fetch all transactions in period for this user
      const res = await api.get(`/transactions?startDate=${startDate}&endDate=${endDate}`);
      // Filter by subcategory name
      const filtered = res.data.filter(tx => tx.categoryId?.name === subcatName && tx.type === type);
      setTransactionListSheet({
        isOpen: true,
        subcatName,
        txs: filtered
      });
    } catch (error) {
      toast.error('Impossible de charger les transactions');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Determine what list & pie data to show (drilldown vs normal)
  const pieData = selectedCategory
    ? selectedCategory.subcategories.map(sub => ({
        name: sub.name,
        value: sub.amount,
        color: selectedCategory.color || '#3b82f6'
      }))
    : data.categories.map(cat => ({
        name: cat.name,
        value: cat.amount,
        color: cat.color || '#10b981'
      }));

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Selectors */}
      <div className="space-y-4">
        {/* Period selection chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'month', label: 'Ce mois' },
            { id: '3months', label: '3 mois' },
            { id: '6months', label: '6 mois' },
            { id: 'year', label: 'Cette année' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                period === p.id 
                  ? 'bg-accent text-white shadow-sm' 
                  : 'bg-surface-2 text-secondary hover:text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Toggle expense/income & comparison */}
        <div className="flex justify-between items-center gap-4">
          <div className="grid grid-cols-2 gap-1 bg-surface-2 p-1 rounded-xl w-48">
            <button
              onClick={() => setType('expense')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'expense' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
              }`}
            >
              Dépenses
            </button>
            <button
              onClick={() => setType('income')}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'income' ? 'bg-surface text-primary shadow-sm' : 'text-muted'
              }`}
            >
              Revenus
            </button>
          </div>

          <button
            onClick={() => setCompare(!compare)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
              compare 
                ? 'bg-accent/10 border-accent/20 text-accent' 
                : 'bg-surface border-border/40 text-secondary'
            }`}
          >
            {compare ? 'Vs période préc. actif' : 'Pas de comparaison'}
          </button>
        </div>
      </div>

      {/* 2. Donut Chart Box */}
      <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col items-center relative min-h-[300px]">
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="absolute top-4 left-4 text-xs font-bold text-accent flex items-center gap-1 bg-surface px-3 py-1.5 rounded-xl border border-border/40 shadow-sm"
          >
            <ArrowLeft size={14} /> Toutes
          </button>
        )}

        <div className="w-full h-56 relative flex items-center justify-center">
          {loading ? (
            <div className="w-32 h-32 rounded-full border-4 border-accent/10 border-t-accent animate-spin" />
          ) : pieData.length === 0 ? (
            <div className="text-center text-muted text-xs space-y-1">
              <HelpCircle size={28} className="mx-auto opacity-60" />
              <p>Aucune transaction sur cette période.</p>
            </div>
          ) : (
            <>
              {/* Overlay center info */}
              <div className="absolute text-center space-y-0.5 pointer-events-none">
                <span className="text-[10px] uppercase font-extrabold text-muted tracking-wider">
                  {selectedCategory ? selectedCategory.name : 'Total'}
                </span>
                <p className="font-mono text-xl font-black text-primary">
                  {formatCurrency(selectedCategory ? selectedCategory.amount : data.total)}
                </p>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={handleSliceClick}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer focus:outline-none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => formatCurrency(val)} 
                    contentStyle={{ borderRadius: '16px', background: 'rgba(30, 41, 59, 0.95)', border: 'none', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>

      {/* 3. Categories/Subcategories List */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase px-1">
          {selectedCategory ? `Détail : ${selectedCategory.name}` : 'Répartition'}
        </h3>

        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-16 bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : pieData.length === 0 ? (
          null
        ) : selectedCategory ? (
          /* Subcategories List */
          <div className="space-y-2">
            {selectedCategory.subcategories.map((sub, idx) => (
              <button
                key={idx}
                onClick={() => handleSubcategoryClick(sub.name)}
                className="w-full bg-surface-2 p-4 rounded-2xl border border-border/40 flex items-center justify-between hover:bg-surface-2/70 active:scale-99 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sub.icon || '📁'}</span>
                  <div>
                    <h4 className="text-sm font-bold text-primary">{sub.name}</h4>
                    <p className="text-xs text-muted">{sub.percentage}% de {selectedCategory.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{formatCurrency(sub.amount)}</span>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Main Categories List */
          <div className="space-y-2">
            {data.categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => cat.subcategories?.length > 0 && setSelectedCategory(cat)}
                className="w-full bg-surface-2 p-4 rounded-2xl border border-border/40 flex items-center justify-between hover:bg-surface-2/70 active:scale-99 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${cat.color || '#888'}15` }}
                  >
                    {cat.icon || '📁'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">{cat.name}</h4>
                    <p className="text-xs text-muted">{cat.percentage}% du total</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className="font-mono text-sm font-bold text-primary block">{formatCurrency(cat.amount)}</span>
                    
                    {compare && (
                      <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                        cat.changeVsPreviousPeriod > 0 
                          ? (type === 'expense' ? 'text-danger' : 'text-accent') 
                          : cat.changeVsPreviousPeriod < 0 
                          ? (type === 'expense' ? 'text-accent' : 'text-danger') 
                          : 'text-muted'
                      }`}>
                        {cat.changeVsPreviousPeriod > 0 ? (
                          <ArrowUpRight size={10} />
                        ) : cat.changeVsPreviousPeriod < 0 ? (
                          <ArrowDownRight size={10} />
                        ) : (
                          <Minus size={10} />
                        )}
                        {cat.changeVsPreviousPeriod === 100 ? 'Nouveau' : `${Math.abs(cat.changeVsPreviousPeriod)}%`}
                      </span>
                    )}
                  </div>
                  {cat.subcategories?.length > 0 && <ChevronRight size={16} className="text-muted" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction List Sheet (Drill-down level 2) */}
      {transactionListSheet.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="flex-1" onClick={() => setTransactionListSheet({ isOpen: false, subcatName: null, txs: [] })} />
          <div className="bg-surface rounded-t-[32px] max-h-[70vh] overflow-y-auto w-full max-w-md mx-auto p-6 shadow-2xl border-t border-border flex flex-col space-y-4 no-scrollbar">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-border/40">
              <div>
                <h3 className="text-sm font-extrabold text-primary">{transactionListSheet.subcatName}</h3>
                <p className="text-xs text-muted">{transactionListSheet.txs.length} transaction(s)</p>
              </div>
              <button 
                onClick={() => setTransactionListSheet({ isOpen: false, subcatName: null, txs: [] })} 
                className="p-1 rounded-full bg-surface-2 hover:bg-border/60 transition-colors"
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 overflow-y-auto">
              {transactionListSheet.txs.length === 0 ? (
                <p className="text-center text-xs text-muted py-6">Aucune transaction trouvée.</p>
              ) : (
                transactionListSheet.txs.map(tx => (
                  <div key={tx._id} className="bg-surface-2 p-4 rounded-xl border border-border/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary">{tx.note || tx.description || 'Sans note'}</p>
                      <p className="text-[10px] text-muted flex items-center gap-1">
                        <Calendar size={10} /> {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-extrabold text-primary">
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default CategoryChart;
