import React, { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import { useMonthlySummaries } from '../hooks/useMonthlySummaries';
import { useMonthlyReport } from '../hooks/useMonthlyReport';
import Select from '../components/ui/Select';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  CalendarDays,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const monthLabels = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MonthlyReportPage = () => {
  const { user } = useContext(AuthContext);
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(currentMonthIdx);

  // Fetch summaries for the selected year to know which months have data
  const { summaries, availableYears, loading: summariesLoading } = useMonthlySummaries(selectedYear);

  // Construct monthKey (format: YYYY-MM)
  const monthKey = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  
  // Fetch monthly report
  const { report, loading: reportLoading, error, refreshReport } = useMonthlyReport(monthKey);

  // Adjust month selection if summaries change
  useEffect(() => {
    if (summaries && summaries.length > 0) {
      // If currently selected month is not in summaries, default to the latest available month
      const monthExists = summaries.some(s => s.monthIndex === selectedMonthIdx);
      if (!monthExists) {
        setSelectedMonthIdx(summaries[0].monthIndex);
      }
    }
  }, [summaries, selectedMonthIdx]);

  const formatCurrency = (amount) => {
    try {
      const code = user?.currency?.code || 'EUR';
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: code 
      }).format(amount || 0);
    } catch (e) {
      return `${amount || 0} €`;
    }
  };

  const getParagraphs = (text) => {
    if (!text || typeof text !== 'string') return ['', '', ''];
    try {
      const parts = text.split('\n\n');
      return [parts[0] || '', parts[1] || '', parts[2] || ''];
    } catch (e) {
      return ['', '', ''];
    }
  };

  const [p1, p2, p3] = getParagraphs(report?.reportText);

  // Clean Markdown formatting for presentation (simple replacements)
  const formatText = (text) => {
    if (!text || typeof text !== 'string') return '';
    try {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold formatting for raw styling, we wrap keys differently
        .replace(/\*(.*?)\*/g, '$1');
    } catch (e) {
      return text;
    }
  };

  // Helper to highlight numbers in text
  const renderFormattedParagraph = (text) => {
    if (!text || typeof text !== 'string') return null;
    try {
      // Regexp to match currency amounts (ex: "1 250,00 €" or "500 €") or percentages (ex: "23,2%")
      const numberRegex = /(\d+[\s\d]*[,\.]?\d*\s*€|-?\d+[,\.]?\d*%\s*)/g;
      const parts = text.split(numberRegex);

      return (
        <p className="text-xs leading-relaxed text-secondary font-medium">
          {parts.map((part, index) => {
            if (part && typeof part === 'string' && part.match(numberRegex)) {
              return (
                <span key={index} className="font-extrabold text-primary font-premium-numbers">
                  {part}
                </span>
              );
            }
            return part;
          })}
        </p>
      );
    } catch (e) {
      return <p className="text-xs leading-relaxed text-secondary font-medium">{text}</p>;
    }
  };

  return (
    <>
      <HeaderTitle>Rapport Mensuel</HeaderTitle>
      <HeaderBackButton to="/" />
      <div className="space-y-6 mb-6">
        
        {/* Month & Year Selectors Card */}
        <div className="bg-surface-2 p-4 rounded-[28px] border border-border/40 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <CalendarDays size={12} /> Période d'analyse
            </span>
            {report?.isProvisional && (
              <span className="text-[8px] font-extrabold bg-warning/20 text-warning px-1.5 py-0.5 rounded-md border border-warning/20">
                Provisoire
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Year selector */}
            <Select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
              }}
              className="w-full h-11 pl-4 pr-10 bg-surface border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            >
              {Array.isArray(availableYears) && availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>

            {/* Month selector */}
            <Select
              value={selectedMonthIdx}
              onChange={(e) => {
                setSelectedMonthIdx(Number(e.target.value));
              }}
              align="right"
              className="w-full h-11 pl-4 pr-10 bg-surface border border-border rounded-xl text-xs font-bold text-primary focus:outline-none focus:border-accent"
            >
              {monthLabels.map((label, idx) => {
                // Only allow selecting months that are present in the summaries or current/past months
                const isFuture = selectedYear === currentYear && idx > currentMonthIdx;
                return (
                  <option key={idx} value={idx} disabled={isFuture}>
                    {label}
                  </option>
                );
              })}
            </Select>
          </div>
        </div>

        {/* Global Loading Spinner */}
        {reportLoading ? (
          <div className="space-y-6">
            {/* Stats grid skeleton */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 w-full rounded-[22px] shimmer-loader" />
              ))}
            </div>
            
            {/* Sections skeleton */}
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[140px] w-full rounded-[28px] shimmer-loader" />
            ))}
          </div>
        ) : error ? (
          /* Error State Card */
          <div className="text-center py-8 bg-danger/10 border border-danger/20 rounded-[28px] p-6 space-y-3">
            <AlertTriangle className="text-danger mx-auto" size={32} />
            <div>
              <p className="text-danger text-sm font-bold">Erreur de chargement</p>
              <p className="text-xs text-secondary mt-1">
                {typeof error === 'string' ? error : (error?.message || 'Erreur lors de la génération du rapport.')}
              </p>
            </div>
            <button 
              onClick={refreshReport}
              className="px-4 py-2 bg-surface rounded-xl border border-border/40 text-xs font-bold text-primary hover:bg-border/20"
            >
              Réessayer
            </button>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-surface-2/40 rounded-[28px] border border-border/20 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-surface border border-border/40 flex items-center justify-center text-muted mb-4 shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-accent/5 rounded-full blur-md" />
              <Info className="text-accent relative z-10" size={24} />
            </div>
            <p className="text-primary text-xs font-bold mb-1">Rapport indisponible</p>
            <p className="text-muted text-[10px] max-w-[200px] mb-3">Aucune donnée disponible pour générer le rapport de cette période.</p>
          </div>
        ) : (!report.financialStats || (report.financialStats.income === 0 && report.financialStats.expenses === 0)) ? (
          <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
              <Info size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-primary">Données insuffisantes</h3>
              <p className="text-xs text-secondary leading-relaxed max-w-xs mx-auto">
                Il n'y a pas assez de transactions (revenus ou dépenses) enregistrées en {monthLabels[selectedMonthIdx]} {selectedYear} pour générer le diagnostic proactif.
              </p>
            </div>
            <div className="pt-2">
              <p className="text-[10px] text-muted font-medium">
                Ajoute des transactions pour débloquer ton analyse mensuelle automatique !
              </p>
            </div>
          </div>
        ) : (
          /* Main Content Report container */
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Financial Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Income card */}
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm relative overflow-hidden">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Revenus</span>
                <span className="text-sm font-extrabold text-accent font-premium-numbers block mt-1.5">
                  {formatCurrency(report.financialStats?.income || 0)}
                </span>
              </div>

              {/* Expenses card */}
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm relative overflow-hidden">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Dépenses</span>
                <span className="text-sm font-extrabold text-danger font-premium-numbers block mt-1.5">
                  -{formatCurrency(report.financialStats?.expenses || 0)}
                </span>
              </div>

              {/* Net Savings card */}
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm relative overflow-hidden">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Épargne Nette</span>
                <span className={`text-sm font-extrabold font-premium-numbers block mt-1.5 ${
                  (report.financialStats?.net || 0) >= 0 ? 'text-accent' : 'text-danger'
                }`}>
                  {(report.financialStats?.net || 0) >= 0 ? '+' : ''}
                  {formatCurrency(report.financialStats?.net || 0)}
                </span>
              </div>

              {/* Savings Rate card */}
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm relative overflow-hidden">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Taux d'Épargne</span>
                <span className="text-sm font-extrabold text-primary font-premium-numbers block mt-1.5">
                  {(report.financialStats?.savingsRate || 0).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Paragraph 1: Global Bilan Card */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">
                  Bilan Financier Global
                </h3>
              </div>
              <div className="border-t border-border/20 pt-3">
                {renderFormattedParagraph(formatText(p1))}
              </div>
            </div>

            {/* Paragraph 2: Les Victoires Card */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-transparent bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  <Award size={16} />
                </div>
                <h3 className="text-xs font-extrabold text-accent uppercase tracking-wider">
                  Les Victoires & Réussites
                </h3>
              </div>
              <div className="border-t border-border/20 pt-3">
                {p2 ? renderFormattedParagraph(formatText(p2)) : (
                  <p className="text-xs text-muted">Aucune victoire spécifique détectée pour ce mois.</p>
                )}
              </div>
            </div>

            {/* Paragraph 3: Points de vigilance Card */}
            <div className="bg-gradient-to-br from-danger/5 to-transparent bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-danger/15 border border-danger/25 flex items-center justify-center text-danger">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="text-xs font-extrabold text-danger uppercase tracking-wider">
                  Points de vigilance
                </h3>
              </div>
              <div className="border-t border-border/20 pt-3">
                {p3 ? renderFormattedParagraph(formatText(p3)) : (
                  <p className="text-xs text-muted">Aucune alerte ni anomalie financière signalée pour ce mois.</p>
                )}
              </div>
            </div>

            {/* Dépenses inhabituelles */}
            {report.unusualTransactions && report.unusualTransactions.length > 0 && (
              <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-warning/15 border border-warning/25 flex items-center justify-center text-warning">
                    <AlertTriangle size={16} className="text-warning" />
                  </div>
                  <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    Dépenses inhabituelles détectées
                  </h3>
                </div>
                <div className="border-t border-border/20 pt-3 space-y-2.5">
                  {report.unusualTransactions.map((tx, idx) => (
                    <div key={tx.transactionId || idx} className="flex justify-between items-center bg-surface p-3.5 rounded-2xl border border-border/30 hover:border-border/60 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary">{tx.description || tx.note || 'Sans description'}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted font-bold bg-surface-2 px-2 py-0.5 rounded border border-border/20">
                            {tx.categoryName}
                          </span>
                          <span className="text-[9px] text-muted font-medium">
                            {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-xs font-extrabold text-danger font-premium-numbers block">
                          -{formatCurrency(tx.amount)}
                        </span>
                        <span className="text-[9px] font-extrabold text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 inline-block">
                          {tx.ratio}x la moyenne
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        )}

      </div>
    </>
  );
};

export default MonthlyReportPage;
