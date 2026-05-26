import React, { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import CategoryChart from '../components/charts/CategoryChart';
import FutureChart from '../components/charts/FutureChart';
import ForecastChart from '../components/charts/ForecastChart';
import { PieChart, Clock, TrendingUp } from 'lucide-react';

const ChartsPage = () => {
  const [activeTab, setActiveTab] = useState('category'); // category, future, forecast

  return (
    <AppShell title="Analyses & Graphiques" backTo="/">
      
      {/* Tab bar header */}
      <div className="flex bg-surface-2 p-1.5 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('category')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'category' 
              ? 'bg-accent text-white shadow-sm' 
              : 'text-muted hover:text-primary'
          }`}
        >
          <PieChart size={14} /> Catégories
        </button>
        
        <button
          onClick={() => setActiveTab('future')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'future' 
              ? 'bg-accent text-white shadow-sm' 
              : 'text-muted hover:text-primary'
          }`}
        >
          <Clock size={14} /> Trésorerie
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'forecast' 
              ? 'bg-accent text-white shadow-sm' 
              : 'text-muted hover:text-primary'
          }`}
        >
          <TrendingUp size={14} /> Prévisions
        </button>
      </div>

      {/* Dynamic Tab view */}
      {activeTab === 'category' && <CategoryChart />}
      {activeTab === 'future' && <FutureChart />}
      {activeTab === 'forecast' && <ForecastChart />}

    </AppShell>
  );
};

export default ChartsPage;
