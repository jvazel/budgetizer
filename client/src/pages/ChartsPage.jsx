import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { HeaderTitle, HeaderPortalContext } from '../components/layout/AppShell';
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
import AiBadge from '../components/ui/AiBadge';


const ChartsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'category'); // category, cashflow, ranking, networth, future, forecast, budgetactual
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { isScrolled } = useContext(HeaderPortalContext);

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
      <span>Type d'analyse : {tabNames[activeTab]}</span>
      <ChevronDown size={14} className="text-secondary shrink-0 mt-0.5" />
    </div>
  );

  const getAiAdvice = (tab) => {
    switch (tab) {
      case 'category':
        return "Visualise la répartition de tes dépenses par catégorie. Repère tes plus gros postes de dépenses pour identifier des opportunités d'optimisation ! 📊";
      case 'cashflow':
        return "Le Cash Flow compare tes revenus à tes dépenses réelles. Un cash flow positif récurrent est le moteur principal de ton enrichissement. 💸";
      case 'networth':
        return "Ta Richesse Nette est la somme de tes actifs moins tes dettes. Suivre sa progression sur le long terme est crucial pour ta liberté financière ! 📈";
      case 'budgetactual':
        return "Compare tes dépenses réelles avec les limites de budget que tu t'es fixées. Ajuste le tir sur les enveloppes qui débordent fréquemment. 🎯";
      case 'forecast':
        return "Grâce à tes historiques, l'IA projette tes dépenses à venir. Anticipe les mois difficiles pour lisser ta trésorerie sans stress. 🔮";
      case 'velocity':
        return "Le rythme des dépenses montre la vitesse à laquelle tu consommes ton budget au fil des jours. Garde un rythme régulier ! ⚡";
      case 'tags':
        return "Analyse tes dépenses regroupées par tags transversaux. Parfait pour suivre le coût réel d'un projet, de vacances ou de travaux ! 🏷️";
      case 'fixedvar':
        return "Distingue tes charges fixes (obligatoires) de tes dépenses variables (discrétionnaires). Réduire les variables est le moyen le plus rapide d'économiser. 🔒";
      case 'waterfall':
        return "Découvre comment ton solde évolue pas à pas ce mois-ci, de tes revenus initiaux jusqu'au reste à vivre final. 🌊";
      case 'future':
        return "La projection de trésorerie te permet de voir l'impact de tes opérations planifiées et récurrentes sur ton solde futur. ⏰";
      case 'resilience':
        return "Le stress-test évalue ta résilience financière face à des imprévus. Assure-toi d'avoir un fond d'urgence suffisant ! 🛡️";
      case 'histogram':
        return "Personnalise ton histogramme pour comparer des périodes spécifiques ou analyser les variations temporelles de tes flux. 📊";
      case 'ranking':
        return "Découvre le classement de tes transactions les plus importantes. Idéal pour repérer les dépenses exceptionnelles qui plombent ton mois. 🏆";
      default:
        return "Explore les différents graphiques pour comprendre la structure de tes dépenses. Suivre tes habitudes est le premier pas vers une épargne sereine ! 💡";
    }
  };

  return (
    <>
      <HeaderTitle collapsible={true}>{titleElement}</HeaderTitle>

      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <div 
          onClick={() => setIsSelectorOpen(true)}
          className="flex items-center gap-2 cursor-pointer group active:scale-98 select-none"
        >
          <div className="text-2xl font-extrabold text-primary tracking-tight">Analyses</div>
          <div className="flex items-center gap-1 bg-surface-2-glass backdrop-blur-md border border-border/40 shadow-sm px-3 py-1.5 rounded-xl text-xs font-extrabold text-secondary group-hover:text-primary group-hover:border-copper/30 transition-all">
            <span className="text-[9px] uppercase font-black tracking-wider text-muted mr-1.5">Type :</span>
            <span className="text-primary">{tabNames[activeTab]}</span>
            <ChevronDown size={12} className="text-secondary shrink-0 mt-0.5 ml-1" />
          </div>
        </div>
        <p className="text-[11px] text-secondary font-medium leading-none mt-1">Visualise tes données financières sous différentes perspectives analytiques.</p>
      </div>

      {/* Horizontal Scrollable Tabs for Top 5 + Autres */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar scroll-smooth select-none">
        {[
          { key: 'category', label: 'Catégories' },
          { key: 'cashflow', label: 'Cash Flow' },
          { key: 'networth', label: 'Richesse Nette' },
          { key: 'budgetactual', label: 'Budget vs Réel' },
          { key: 'forecast', label: 'Prévisions' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-full border transition-all active:scale-95 shrink-0 ${
              activeTab === tab.key
                ? 'bg-copper border-copper text-white shadow-sm shadow-copper/20 font-extrabold'
                : 'bg-surface-2 border-border/40 hover:bg-border/10 text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setIsSelectorOpen(true)}
          className="whitespace-nowrap px-4 py-2 text-xs font-bold rounded-full border border-dashed border-border/60 bg-transparent hover:bg-border/10 text-secondary hover:text-primary transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
        >
          <Sliders size={12} className="shrink-0" />
          <span>Autres</span>
        </button>
      </div>

      {/* Coach IA recommendation */}
      <div className="bg-surface-2 p-4 rounded-[24px] border border-border/40 flex gap-3 items-start select-none shadow-sm mb-5">
        <AiBadge text="Conseil IA" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-secondary font-semibold leading-relaxed">
            {getAiAdvice(activeTab)}
          </p>
        </div>
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
                  { key: 'category', label: 'Catégories', icon: PieChart, color: 'text-purple-400 bg-purple-500/10', badge: 'Populaire' },
                  { key: 'waterfall', label: 'Analyse mensuelle', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
                  { key: 'velocity', label: 'Rythme Dépenses', icon: Gauge, color: 'text-rose-400 bg-rose-500/10', badge: 'Recommandé' },
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
                  { key: 'forecast', label: 'Tendances (IA)', icon: TrendingUp, color: 'text-indigo-400 bg-indigo-500/10', badge: 'Recommandé' }
                ]
              }
            ].map(group => (
              <div key={group.title} className="space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest block px-1">{group.title}</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.key;
                    const isRecommended = item.badge === 'Recommandé';
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveTab(item.key);
                          setIsSelectorOpen(false);
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-start gap-2.5 transition-all text-left group active:scale-95 w-full ${
                          isSelected 
                            ? 'bg-copper/10 border-copper text-primary shadow-sm shadow-copper/10' 
                            : isRecommended
                              ? 'bg-amber-500/[0.02] border-amber-500/35 hover:bg-amber-500/[0.06] text-primary'
                              : 'bg-surface border-border/40 hover:bg-surface-2/80 text-primary'
                        }`}
                      >
                        <div className="w-full flex justify-between items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-copper/20 text-copper animate-pulse' : item.color
                          }`}>
                            <Icon size={16} />
                          </div>
                          {item.badge && (
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider shrink-0 ${
                              item.badge === 'Populaire'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {item.badge}
                            </span>
                          )}
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
