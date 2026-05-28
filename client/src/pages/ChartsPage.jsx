import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import CategoryChart from '../components/charts/CategoryChart';
import FutureChart from '../components/charts/FutureChart';
import ForecastChart from '../components/charts/ForecastChart';
import NetWorthChart from '../components/charts/NetWorthChart';
import BudgetActualChart from '../components/charts/BudgetActualChart';
import BottomSheet from '../components/ui/BottomSheet';
import { PieChart, Clock, TrendingUp, LineChart, Sliders, ChevronDown } from 'lucide-react';

const ChartsPage = () => {
  const [activeTab, setActiveTab] = useState('category'); // category, networth, future, forecast, budgetactual
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const tabNames = {
    category: 'Catégories',
    networth: 'Richesse Nette',
    budgetactual: 'Budget vs Réel',
    future: 'Trésorerie',
    forecast: 'Prévisions'
  };

  const titleElement = (
    <div 
      onClick={() => setIsSelectorOpen(true)}
      className="flex items-center gap-1.5 cursor-pointer hover:text-accent active:opacity-75 transition-all select-none"
    >
      <span>Analyses : {tabNames[activeTab]}</span>
      <ChevronDown size={14} className="text-secondary shrink-0 mt-0.5" />
    </div>
  );

  return (
    <AppShell title={titleElement} backTo="/">
      
      {/* Dynamic Tab view */}
      {activeTab === 'category' && <CategoryChart />}
      {activeTab === 'networth' && <NetWorthChart />}
      {activeTab === 'budgetactual' && <BudgetActualChart />}
      {activeTab === 'future' && <FutureChart />}
      {activeTab === 'forecast' && <ForecastChart />}

      {/* Select Category Drawer */}
      <BottomSheet 
        isOpen={isSelectorOpen} 
        onClose={() => setIsSelectorOpen(false)}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-md font-bold text-primary">Choisir l'analyse</h2>
          </div>

          <div className="space-y-3">
            {[
              { key: 'category', label: 'Répartition par Catégories', desc: 'Détail de vos dépenses mensuelles par catégorie.', icon: PieChart, color: 'text-purple-400 bg-purple-500/10' },
              { key: 'networth', label: 'Évolution Richesse Nette', desc: 'Suivi de vos actifs nets de vos passifs/dettes.', icon: LineChart, color: 'text-sky-400 bg-sky-500/10' },
              { key: 'budgetactual', label: 'Budget vs Dépenses Réelles', desc: 'Comparatif visuel de vos limites et du réel.', icon: Sliders, color: 'text-pink-400 bg-pink-500/10' },
              { key: 'future', label: 'Prévisions de Trésorerie', desc: 'Projection de votre solde futur à court terme.', icon: Clock, color: 'text-blue-400 bg-blue-500/10' },
              { key: 'forecast', label: 'Tendances & Prévisions (IA)', desc: 'Analyse statistique de vos tendances futures.', icon: TrendingUp, color: 'text-indigo-400 bg-indigo-500/10' }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    setIsSelectorOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left group ${
                    isSelected 
                      ? 'bg-accent/10 border-accent text-primary' 
                      : 'bg-surface-2 border-border/40 hover:bg-surface-2/80 text-primary active:scale-98'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-250 group-hover:scale-105 ${
                    isSelected ? 'bg-accent/20 text-accent' : item.color
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs block text-primary">{item.label}</span>
                    <p className="text-[10px] text-muted font-normal mt-0.5 leading-tight">{item.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="text-accent text-[10px] font-bold shrink-0">✓ Actif</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

    </AppShell>
  );
};

export default ChartsPage;
