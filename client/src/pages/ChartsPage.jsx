import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HeaderTitle } from '../components/layout/AppShell';
import CategoryChart from '../components/charts/CategoryChart';
import FutureChart from '../components/charts/FutureChart';
import ForecastChart from '../components/charts/ForecastChart';
import NetWorthChart from '../components/charts/NetWorthChart';
import BudgetActualChart from '../components/charts/BudgetActualChart';
import CashFlowChart from '../components/charts/CashFlowChart';
import RankingChart from '../components/charts/RankingChart';
import HistogramChart from '../components/charts/HistogramChart';
import TagChart from '../components/charts/TagChart';
import VelocityChart from '../components/charts/VelocityChart';
import ResilienceChart from '../components/charts/ResilienceChart';
import FixedVarChart from '../components/charts/FixedVarChart';
import WaterfallChart from '../components/charts/WaterfallChart';
import BottomSheet from '../components/ui/BottomSheet';
import { PieChart, Clock, TrendingUp, LineChart, Sliders, ChevronDown, ArrowUpDown, Award, BarChart2, Tag, Gauge, ShieldCheck, Lock } from 'lucide-react';


const ChartsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'category'); // category, cashflow, ranking, networth, future, forecast, budgetactual
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const tabNames = {
    category: 'Catégories',
    velocity: 'Rythme des dépenses',
    tags: 'Tags & Projets',
    cashflow: 'Cash Flow',
    ranking: 'Classement Dépenses',
    networth: 'Richesse Nette',
    resilience: 'Stress-test & Résilience',
    budgetactual: 'Budget vs Réel',
    future: 'Trésorerie',
    forecast: 'Prévisions',
    histogram: 'Histogramme personnalisé',
    fixedvar: 'Fixes vs Variables',
    waterfall: 'Analyse mensuelle'
  };

  const titleElement = (
    <div 
      onClick={() => setIsSelectorOpen(true)}
      className="flex items-center gap-1.5 cursor-pointer hover:text-copper active:opacity-75 transition-all select-none"
    >
      <span>Analyses : {tabNames[activeTab]}</span>
      <ChevronDown size={14} className="text-secondary shrink-0 mt-0.5" />
    </div>
  );

  return (
    <>
      <HeaderTitle collapsible={true}>{titleElement}</HeaderTitle>

      {/* Large Collapsible Header Title on Page */}
      <div className="mb-5 mt-2 px-1">
        <div 
          onClick={() => setIsSelectorOpen(true)}
          className="flex items-center gap-2 cursor-pointer group active:scale-98 select-none"
        >
          <div className="text-2xl font-extrabold text-primary tracking-tight">Analyses</div>
          <div className="flex items-center gap-1 bg-surface-2-glass backdrop-blur-md border border-border/40 shadow-sm px-2.5 py-1 rounded-xl text-xs font-extrabold text-secondary group-hover:text-primary group-hover:border-copper/30 transition-all">
            <span>{tabNames[activeTab]}</span>
            <ChevronDown size={12} className="text-secondary shrink-0 mt-0.5" />
          </div>
        </div>
        <p className="text-[11px] text-secondary mt-0.5 font-medium">Visualisez vos données financières sous différentes perspectives analytiques.</p>
      </div>

      <div className="mb-6">
        {activeTab === 'category' && <CategoryChart />}
        {activeTab === 'velocity' && <VelocityChart />}
        {activeTab === 'tags' && <TagChart />}
        {activeTab === 'cashflow' && <CashFlowChart />}
        {activeTab === 'ranking' && <RankingChart />}
        {activeTab === 'networth' && <NetWorthChart />}
        {activeTab === 'resilience' && <ResilienceChart />}
        {activeTab === 'budgetactual' && <BudgetActualChart />}
        {activeTab === 'future' && <FutureChart />}
        {activeTab === 'forecast' && <ForecastChart />}
        {activeTab === 'histogram' && <HistogramChart />}
        {activeTab === 'fixedvar' && <FixedVarChart />}
        {activeTab === 'waterfall' && <WaterfallChart />}
      </div>

      {/* Select Category Drawer */}
      <BottomSheet 
        isOpen={isSelectorOpen} 
        onClose={() => setIsSelectorOpen(false)}
      >
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-border/40">
            <h2 className="text-sm font-bold text-primary">Sélectionner une analyse</h2>
          </div>

          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar pb-6">
            {[
              {
                title: 'Activité Mensuelle',
                items: [
                  { key: 'category', label: 'Catégories', icon: PieChart, color: 'text-purple-400 bg-purple-500/10' },
                  { key: 'waterfall', label: 'Analyse mensuelle', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
                  { key: 'velocity', label: 'Rythme Dépenses', icon: Gauge, color: 'text-rose-400 bg-rose-500/10' },
                  { key: 'fixedvar', label: 'Fixes vs Var.', icon: Lock, color: 'text-indigo-400 bg-indigo-500/10' },
                  { key: 'tags', label: 'Tags & Projets', icon: Tag, color: 'text-amber-400 bg-amber-500/10' }
                ]
              },
              {
                title: 'Évolution & Bilan',
                items: [
                  { key: 'cashflow', label: 'Cash Flow', icon: ArrowUpDown, color: 'text-emerald-400 bg-emerald-500/10' },
                  { key: 'histogram', label: 'Histogramme', icon: BarChart2, color: 'text-teal-400 bg-teal-500/10' },
                  { key: 'ranking', label: 'Classement', icon: Award, color: 'text-amber-400 bg-amber-500/10' },
                  { key: 'networth', label: 'Richesse Nette', icon: LineChart, color: 'text-sky-400 bg-sky-500/10' }
                ]
              },
              {
                title: 'Prévisions & IA',
                items: [
                  { key: 'resilience', label: 'Stress-test', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10' },
                  { key: 'budgetactual', label: 'Budget vs Réel', icon: Sliders, color: 'text-pink-400 bg-pink-500/10' },
                  { key: 'future', label: 'Trésorerie', icon: Clock, color: 'text-blue-400 bg-blue-500/10' },
                  { key: 'forecast', label: 'Tendances (IA)', icon: TrendingUp, color: 'text-indigo-400 bg-indigo-500/10' }
                ]
              }
            ].map(group => (
              <div key={group.title} className="space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block px-1">{group.title}</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveTab(item.key);
                          setIsSelectorOpen(false);
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-start gap-2.5 transition-all text-left group active:scale-95 ${
                          isSelected 
                            ? 'bg-copper/10 border-copper text-primary shadow-sm shadow-copper/10' 
                            : 'bg-surface border-border/40 hover:bg-surface-2/80 text-primary'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-copper/20 text-copper animate-pulse' : item.color
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs block text-primary truncate">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default ChartsPage;
