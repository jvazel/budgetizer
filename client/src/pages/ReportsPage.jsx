import { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Download, Calendar, AlertTriangle, AlertCircle, CheckCircle, Info, 
  Sparkles, ListFilter
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell
} from 'recharts';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const { accounts, totalBalance: currentTotalBalance } = useAccounts();
  
  // Helper format Currency
  const formatCurrency = (amount) => {
    const code = user?.currency?.code || 'EUR';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: code 
    }).format(amount);
  };



  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getOneMonthAgoStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getOneMonthAgoStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Report data states
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dailyBalances, setDailyBalances] = useState([]);
  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0,
    healthScore: 0,
    healthLabel: '',
    healthColor: ''
  });
  const [unusualExpenses, setUnusualExpenses] = useState([]);
  const [attentionPoints, setAttentionPoints] = useState([]);
  const [forecastData, setForecastData] = useState([]);

  // Debugging Console States
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const logDebug = (msg) => {
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    // console.log(msg);
  };

  useEffect(() => {
    const handleGlobalError = (event) => {
      logDebug(`Global Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    const handleUnhandledRejection = (event) => {
      logDebug(`Unhandled Rejection: ${event.reason?.message || event.reason}`);
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Generate Report
  const handleGenerateReport = async () => {
    logDebug(`Génération du rapport demandée pour la période du ${startDate} au ${endDate}`);
    if (new Date(startDate) > new Date(endDate)) {
      logDebug("Erreur : La date de début est après la date de fin.");
      toast.error("La date de début doit être antérieure à la date de fin.");
      return false;
    }

    setLoading(true);
    const toastId = toast.loading("Analyse des données en cours...");
    
    try {
      logDebug("Envoi de la requête de récupération des transactions et de l'historique des soldes...");
      const [txRes, balanceHistoryRes] = await Promise.all([
        api.get('/transactions', {
          params: {
            startDate,
            limit: 2000
          }
        }),
        api.get('/charts/balance-history', {
          params: {
            startDate,
            endDate
          }
        })
      ]);
      const allTransactionsFetched = txRes.data.transactions || [];
      const reconstructedBalances = balanceHistoryRes.data || [];
      logDebug(`Transactions récupérées du serveur : ${allTransactionsFetched.length}`);

      // Filter transactions that are within our selected report period
      const startLimit = new Date(startDate);
      startLimit.setUTCHours(0, 0, 0, 0);
      const endLimit = new Date(endDate);
      endLimit.setUTCHours(23, 59, 59, 999);

      const periodTxs = allTransactionsFetched.filter(tx => {
        const d = new Date(tx.date);
        return d >= startLimit && d <= endLimit;
      });

      logDebug(`Transactions sur la période sélectionnée : ${periodTxs.length}`);
      setTransactions(periodTxs);

      if (periodTxs.length === 0) {
        logDebug("Aucune transaction sur cette période, arrêt du traitement.");
        setHasGenerated(true);
        setLoading(false);
        toast.dismiss(toastId);
        toast.error("Aucune transaction trouvée sur cette période.");
        return false;
      }

      // 2. Calculate summary statistics (Inflow / Outflow)
      const checkingAccountIds = (accounts || [])
        .filter(acc => acc.type === 'checking')
        .map(acc => acc._id.toString());

      let totalIncome = 0;
      let totalExpenses = 0;
      const categoryMap = {};

      periodTxs.forEach(tx => {
        const txAccId = tx.accountId?._id?.toString() || tx.accountId?.toString();
        const txToAccId = tx.toAccountId?._id?.toString() || tx.toAccountId?.toString();

        const sourceIsChecking = checkingAccountIds.includes(txAccId);
        const destIsChecking = txToAccId ? checkingAccountIds.includes(txToAccId) : false;

        if (tx.type === 'income' && sourceIsChecking) {
          totalIncome += tx.amount;
        } else if (tx.type === 'expense' && sourceIsChecking) {
          totalExpenses += tx.amount;
          
          // Categorize
          const catId = tx.categoryId?._id || 'uncategorized';
          const catName = tx.categoryId?.name || 'Non catégorisé';
          const catColor = tx.categoryId?.color || '#9ca3af';
          const catIcon = tx.categoryId?.icon || '📁';
          
          if (!categoryMap[catId]) {
            categoryMap[catId] = {
              id: catId,
              name: catName,
              color: catColor,
              icon: catIcon,
              value: 0
            };
          }
          categoryMap[catId].value += tx.amount;
        } else if (tx.type === 'transfer') {
          if (sourceIsChecking && !destIsChecking) {
            totalExpenses += tx.amount;
          } else if (!sourceIsChecking && destIsChecking) {
            totalIncome += tx.amount;
          }
        }
      });

      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : (totalExpenses > 0 ? -100 : 0);

      // Category breakdown array sorted by value desc
      const sortedCategories = Object.values(categoryMap)
        .map(c => {
          c.value = parseFloat(c.value.toFixed(2));
          return c;
        })
        .sort((a, b) => b.value - a.value);

      setCategoryData(sortedCategories);
      logDebug(`Catégories de dépenses calculées : ${sortedCategories.length}`);

      // 3. Reconstruct running balance evolution daily
      logDebug("Mise à jour de l'évolution du solde journalier (reçu du serveur)...");
      setDailyBalances(reconstructedBalances);
      logDebug(`Évolution du solde calculée sur ${reconstructedBalances.length} jours`);

      // 4. Identify unusual expenses
      const expensesOnly = periodTxs.filter(tx => {
        const txAccId = tx.accountId?._id?.toString() || tx.accountId?.toString();
        const txToAccId = tx.toAccountId?._id?.toString() || tx.toAccountId?.toString();
        const sourceIsChecking = checkingAccountIds.includes(txAccId);
        const destIsChecking = txToAccId ? checkingAccountIds.includes(txToAccId) : false;

        if (tx.type === 'expense' && sourceIsChecking) return true;
        if (tx.type === 'transfer' && sourceIsChecking && !destIsChecking) return true;
        return false;
      });

      const avgExpenseAmount = expensesOnly.length > 0 
        ? expensesOnly.reduce((sum, tx) => sum + tx.amount, 0) / expensesOnly.length
        : 0;

      const flaggedUnusual = expensesOnly.filter(tx => 
        (tx.amount > avgExpenseAmount * 3 && tx.amount > 50) || tx.amount > 200
      ).sort((a, b) => b.amount - a.amount);

      setUnusualExpenses(flaggedUnusual);
      logDebug(`Dépenses inhabituelles détectées : ${flaggedUnusual.length}`);

      // 5. Generate score & labels
      let scoreSavings = 0;
      if (savingsRate >= 30) scoreSavings = 50;
      else if (savingsRate > 0) scoreSavings = (savingsRate / 30) * 50;
      else scoreSavings = Math.max(0, 15 + (savingsRate / 10));

      const scoreAnomalies = Math.max(0, 30 - flaggedUnusual.length * 6);
      const scoreNet = netSavings > 0 ? 20 : 0;
      const totalScore = Math.min(100, Math.max(0, Math.round(scoreSavings + scoreAnomalies + scoreNet)));

      let healthLabel = 'Moyen';
      let healthColor = 'text-warning border-warning/20 bg-warning/5';
      if (totalScore >= 85) {
        healthLabel = 'Excellent';
        healthColor = 'text-accent border-accent/20 bg-accent/5';
      } else if (totalScore >= 70) {
        healthLabel = 'Bon';
        healthColor = 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
      } else if (totalScore >= 50) {
        healthLabel = 'Satisfaisant';
        healthColor = 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';
      } else if (totalScore >= 30) {
        healthLabel = 'Vigilance';
        healthColor = 'text-orange-400 border-orange-400/20 bg-orange-400/5';
      } else {
        healthLabel = 'Critique';
        healthColor = 'text-danger border-danger/20 bg-danger/5';
      }

      setMetrics({
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netSavings: parseFloat(netSavings.toFixed(2)),
        savingsRate: parseFloat(savingsRate.toFixed(1)),
        healthScore: totalScore,
        healthLabel,
        healthColor
      });
      logDebug(`Score de santé financière calculé : ${totalScore}/100 (${healthLabel})`);

      // 6. Generate points of attention
      const points = [];
      if (savingsRate < 0) {
        points.push({
          type: 'warning',
          text: `Votre budget est déficitaire sur cette période. Vos dépenses dépassent vos rentrées d'argent de ${formatCurrency(Math.abs(netSavings))}.`
        });
      } else if (savingsRate < 15) {
        points.push({
          type: 'info',
          text: `Votre taux d'épargne de ${savingsRate.toFixed(1)}% est inférieur à l'objectif recommandé de 15%. Essayez de limiter les dépenses superflues.`
        });
      } else {
        points.push({
          type: 'success',
          text: `Excellent taux d'épargne (${savingsRate.toFixed(1)}%) ! Vous mettez de côté une part solide de vos revenus.`
        });
      }

      if (flaggedUnusual.length > 0) {
        const sumUnusual = flaggedUnusual.reduce((sum, tx) => sum + tx.amount, 0);
        points.push({
          type: 'warning',
          text: `Détection de ${flaggedUnusual.length} dépense(s) inhabituelle(s) représentant un total de ${formatCurrency(sumUnusual)}. Pensez à vérifier l'utilité de ces débits.`
        });
      }

      if (sortedCategories.length > 0) {
        const topCat = sortedCategories[0];
        const pctTop = (topCat.value / totalExpenses) * 100;
        if (pctTop > 35) {
          points.push({
            type: 'info',
            text: `Concentration importante : la catégorie "${topCat.name}" (${formatCurrency(topCat.value)}) représente à elle seule ${pctTop.toFixed(0)}% de vos dépenses totales.`
          });
        }
      }

      setAttentionPoints(points);

      // 7. Future 30-day projection
      const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      const dailyNetFlow = netSavings / diffDays;

      const endBalance = reconstructedBalances.length > 0 
        ? reconstructedBalances[reconstructedBalances.length - 1].balance 
        : currentTotalBalance;
      
      const projections = [];
      for (let i = 1; i <= 30; i++) {
        const d = new Date(endDate);
        d.setDate(d.getDate() + i);
        projections.push({
          day: `+${i}j`,
          balance: parseFloat((endBalance + dailyNetFlow * i).toFixed(2))
        });
      }
      setForecastData(projections);
      logDebug("Prévisions à 30 jours calculées.");

      setHasGenerated(true);
      toast.dismiss(toastId);
      logDebug("Génération des données du rapport terminée avec succès.");
      return true;
    } catch (err) {
      logDebug(`Erreur dans handleGenerateReport : ${err.message}`);
      console.error(err);
      toast.dismiss(toastId);
      toast.error(`Erreur lors de la génération du rapport : ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // PDF generation and download process
  const handleDownloadPDF = async () => {
    logDebug("handleDownloadPDF démarrée.");
    try {
      const element = document.getElementById('print-report-area');
      if (!element) {
        logDebug("Erreur : L'élément DOM #print-report-area est introuvable.");
        toast.error("Erreur: Le contenu du rapport n'est pas prêt.");
        return;
      }

      logDebug("Importation dynamique de html2pdf.js...");
      let html2pdfFunc = null;
      try {
        // Essayer d'importer la version pré-minifiée d'abord (très fiable sous Vite)
        const html2pdfModule = await import('html2pdf.js/dist/html2pdf.min.js');
        html2pdfFunc = html2pdfModule.default || html2pdfModule;
        logDebug("Importation de html2pdf.js/dist/html2pdf.min.js réussie.");
      } catch (e) {
        logDebug(`Échec import dist : ${e.message}. Tentative import standard...`);
        try {
          const html2pdfModule = await import('html2pdf.js');
          html2pdfFunc = html2pdfModule.default || html2pdfModule;
          logDebug("Importation de html2pdf.js standard réussie.");
        } catch (e2) {
          logDebug(`Échec de tous les imports : ${e2.message}`);
        }
      }

      if (!html2pdfFunc && window.html2pdf) {
        logDebug("Fallback sur window.html2pdf.");
        html2pdfFunc = window.html2pdf;
      }

      if (!html2pdfFunc) {
        logDebug("Impossible de charger html2pdf. Fallback sur l'impression native du navigateur.");
        toast.error("Échec du chargement de la bibliothèque PDF. Ouverture de l'impression native...");
        window.print();
        return;
      }

      const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right in mm
        filename: `budgetizer_${startDate}_${endDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 1024, // Force desktop viewport width for media queries
          logging: false // désactiver les logs d'html2canvas dans la console
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { 
          mode: ['css', 'legacy'], 
          avoid: ['.avoid-break', 'tr'] 
        }
      };

      logDebug("Appel de html2pdf.js...");
      const loadingToast = toast.loading("Génération du rapport PDF...");

      try {
        const worker = html2pdfFunc().set(opt).from(element).toPdf().output('blob');
        worker.then((blob) => {
          logDebug(`Blob PDF généré avec succès (${blob.size} octets).`);
          toast.dismiss(loadingToast);
          const blobUrl = URL.createObjectURL(blob);

          // Create temporary download link for file saving
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `budgetizer_${startDate}_${endDate}.pdf`;
          document.body.appendChild(link);
          
          try {
            logDebug("Déclenchement du clic sur le lien de téléchargement...");
            link.click();
            logDebug("Clic déclenché.");
          } catch (e) {
            logDebug(`Échec du clic : ${e.message}`);
          }
          
          document.body.removeChild(link);

          // Check if we are on a mobile device
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile) {
            logDebug("Appareil mobile détecté. Ouverture du PDF dans un nouvel onglet.");
            const newWindow = window.open(blobUrl, '_blank');
            if (!newWindow) {
              logDebug("Popup bloquée, redirection de la page principale.");
              window.location.href = blobUrl;
            }
          } else {
            toast.success("Rapport PDF généré !");
          }
        })
        .catch((err) => {
          logDebug(`Promesse html2pdf rejetée : ${err.message}`);
          toast.dismiss(loadingToast);
          toast.error("Erreur lors de l'export PDF. Tentative d'impression native...");
          window.print();
        });
      } catch (err) {
        logDebug(`Erreur synchrone html2pdfFunc : ${err.message}`);
        toast.dismiss(loadingToast);
        toast.error("Erreur lors de la génération. Impression native...");
        window.print();
      }
    } catch (err) {
      logDebug(`Exception dans handleDownloadPDF : ${err.message}`);
      toast.error(`Erreur lors de l'exportation : ${err.message}`);
      window.print();
    }
  };

  const handleExportProcess = async () => {
    logDebug("Début du processus d'exportation...");
    try {
      const success = await handleGenerateReport();
      if (success) {
        logDebug("Génération des données terminée avec succès. Planification du téléchargement PDF dans 500ms...");
        setTimeout(() => {
          handleDownloadPDF();
        }, 500);
      } else {
        logDebug("Échec ou annulation de la génération des données. Pas d'export PDF.");
      }
    } catch (err) {
      logDebug(`Erreur dans handleExportProcess : ${err.message}`);
      alert("Erreur critique dans le processus d'export: " + err.message);
    }
  };

  return (
    <>
      <HeaderTitle>Rapports d'Activité</HeaderTitle>
      <HeaderBackButton to="/" />
      {/* CSS overrides specifically for printing */}
      <style>{`
        /* Force light theme variables and font styles on the print container */
        #print-report-area {
          --bg-base: #f5f5f5 !important;
          --bg-surface: #ffffff !important;
          --bg-surface-2: #fafafa !important;
          --border: #e4e4e7 !important;
          --text-primary: #09090b !important;
          --text-secondary: #52525b !important;
          --text-muted: #71717a !important;
          --accent: #059669 !important;
          --accent-dim: #d1fae5 !important;
          --danger: #dc2626 !important;
          --danger-dim: #fee2e2 !important;
          --warning: #d97706 !important;
          --warning-dim: #fef3c7 !important;
          --info: #2563eb !important;
          --info-dim: #dbeafe !important;
          
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          color: #09090b !important;
          background-color: #ffffff !important;
        }

        #print-report-area * {
          box-sizing: border-box;
        }

        /* Prevent elements from being squished by mobile window viewport width during html2canvas render */
        #print-report-area, #print-report-area * {
          max-width: none !important;
        }

        /* Use high quality local system fonts for crisp vector rendering in PDF */
        #print-report-area h1,
        #print-report-area h2,
        #print-report-area h3,
        #print-report-area h4,
        #print-report-area h5,
        #print-report-area p,
        #print-report-area span,
        #print-report-area td,
        #print-report-area th,
        #print-report-area div {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }

        #print-report-area .font-mono {
          font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace !important;
        }

        /* Prevent scroll wrappers from clipping table content in html2canvas */
        #print-report-area .overflow-x-auto {
          overflow: visible !important;
        }

        /* Ensure tables are styled cleanly and columns respect fixed widths */
        #print-report-area table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        #print-report-area th,
        #print-report-area td {
          word-break: break-word !important;
          white-space: normal !important;
        }

        /* Repeat table headers on each split page */
        #print-report-area thead {
          display: table-header-group !important;
        }

        #print-report-area tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Prevent elements from page splitting halfway, active on both screen & print */
        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .force-page-break {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* Clean styles for export layout */
        .shadow-sm, .shadow-md, .shadow-2xl, .shadow-inner {
          box-shadow: none !important;
          border: 1px solid #e4e4e7 !important;
        }

        #print-report-area button,
        #print-report-area .print-hidden,
        #print-report-area .print\:hidden {
          display: none !important;
        }

        /* Prevent html2canvas text clipping and force proper vertical space */
        #print-report-area p, 
        #print-report-area span, 
        #print-report-area td, 
        #print-report-area th,
        #print-report-area h1,
        #print-report-area h2,
        #print-report-area h3,
        #print-report-area h4,
        #print-report-area div {
          line-height: 1.5 !important;
        }

        #print-report-area :not(.truncate) {
          overflow: visible !important;
        }

        #print-report-area .truncate {
          padding-bottom: 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        @media print {
          /* Hide non-report layout */
          body * {
            visibility: hidden;
          }
          #print-report-area, #print-report-area * {
            visibility: visible;
          }
          #print-report-area {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: #09090b !important;
            padding: 0 !important;
          }
          /* Adjust sizes */
          .chart-box {
            height: 220px !important;
            width: 100% !important;
          }
          /* Force standard font sizes */
          p, span, td, th {
            color: #27272a !important;
          }
          h1, h2, h3, h4, h5 {
            color: #09090b !important;
          }
        }
      `}</style>

      <div className="space-y-6 pb-24">
        
        {/* Parameters Form - Hidden during printing */}
        <section className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm print:hidden">
          <div className="flex items-center gap-2 mb-4">
            <ListFilter size={18} className="text-accent" />
            <h3 className="text-sm font-bold text-primary">Paramètres du rapport</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-extrabold text-secondary tracking-wider block">Date de début</label>
              <div className="relative">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-border/40 p-3 rounded-xl text-xs font-bold text-primary focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-extrabold text-secondary tracking-wider block">Date de fin</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface border border-border/40 p-3 rounded-xl text-xs font-bold text-primary focus:border-accent outline-none"
              />
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleExportProcess}
              disabled={loading}
              className="w-full py-3 bg-accent text-white font-extrabold text-xs rounded-xl hover:bg-accent/80 transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  Génération du PDF...
                </>
              ) : (
                <>
                  <Download size={14} className="shrink-0" />
                  Exporter le rapport en PDF
                </>
              )}
            </button>
          </div>
        </section>

        {/* Global Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-secondary font-bold">Calcul de la santé financière...</p>
          </div>
        )}

        {/* Report Preview - Positioned offscreen for DOM capture by html2pdf.js, styled centered on print */}
        {!loading && hasGenerated && transactions.length > 0 && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '0px', 
              left: '0px', 
              width: '1px', 
              height: '1px', 
              overflow: 'hidden', 
              zIndex: -100 
            }}
          >
            <div 
              id="print-report-area" 
              className="space-y-6 print:block text-black bg-white"
              style={{ 
                width: '720px',
                padding: '24px',
                boxSizing: 'border-box'
              }}
            >
              {/* Header / Title block */}
            <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-accent uppercase bg-accent/10 px-2.5 py-1 rounded-lg">Rapport financier</span>
                  <h1 className="text-lg font-black text-primary mt-2">Synthèse et Analyses d'Activité</h1>
                  <p className="text-xs text-secondary mt-1.5">
                    <Calendar size={14} className="inline text-accent align-middle mr-1.5" />
                    <span className="align-middle">
                      Période du <span className="font-bold">{new Date(startDate).toLocaleDateString('fr-FR')}</span> au <span className="font-bold">{new Date(endDate).toLocaleDateString('fr-FR')}</span>
                    </span>
                  </p>
                </div>
                <div className="flex items-center shrink-0">
                  <div className="text-accent opacity-20">
                    <FileText size={48} />
                  </div>
                </div>
              </div>
            </div>

            {/* Score de santé financière */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm avoid-break">
              <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-3">Score de santé financière</h3>
              <div className="flex items-center gap-6">
                <div className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full" style={{ width: '72px', height: '72px' }}>
                    <g transform="rotate(-90 36 36)">
                      <circle 
                        cx="36" 
                        cy="36" 
                        r="30" 
                        stroke="#e5e7eb" 
                        strokeWidth="6" 
                        fill="transparent" 
                      />
                      <circle 
                        cx="36" 
                        cy="36" 
                        r="30" 
                        stroke={metrics.healthScore >= 70 ? "#10b981" : metrics.healthScore >= 50 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - metrics.healthScore / 100)}
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-primary font-mono">{metrics.healthScore}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${metrics.healthColor}`}>
                    {metrics.healthLabel}
                  </span>
                  <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                    Basé sur votre taux d'épargne, l'équilibre recettes/dépenses et la stabilité globale.
                  </p>
                </div>
              </div>
            </div>

            {/* Recettes vs Dépenses */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-between avoid-break">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-3">Recettes vs Dépenses</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted font-bold block uppercase">Recettes</span>
                    <span className="text-sm font-black text-accent font-mono">{formatCurrency(metrics.totalIncome)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted font-bold block uppercase">Dépenses</span>
                    <span className="text-sm font-black text-danger font-mono">-{formatCurrency(metrics.totalExpenses)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted font-bold block uppercase">Épargne nette</span>
                    <span className={`text-sm font-black font-mono ${metrics.netSavings >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {metrics.netSavings >= 0 ? '+' : ''}{formatCurrency(metrics.netSavings)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/10 flex justify-between items-center text-[10px]">
                <span className="text-secondary font-semibold">Taux d'épargne :</span>
                <span className={`font-black font-mono px-2 py-0.5 rounded-lg ${metrics.savingsRate >= 15 ? 'text-accent bg-accent/10' : metrics.savingsRate >= 0 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'}`}>
                  {metrics.savingsRate}%
                </span>
              </div>
            </div>

            {/* Répartition des dépenses par catégories */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-between avoid-break">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">Répartition des dépenses par catégories</h3>
                
                {categoryData.length === 0 ? (
                  <p className="text-xs text-muted text-center py-10">Aucune dépense enregistrée.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Visual Category List */}
                    <div className="space-y-3">
                      {categoryData.slice(0, 5).map(cat => {
                        const percentage = metrics.totalExpenses > 0 ? (cat.value / metrics.totalExpenses) * 100 : 0;
                        return (
                          <div key={cat.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5 min-w-0 leading-normal py-0.5">
                                <span className="text-sm shrink-0">{cat.icon}</span>
                                <span className="font-bold text-primary">{cat.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 font-mono">
                                <span className="font-extrabold text-primary">{formatCurrency(cat.value)}</span>
                                <span className="text-[10px] text-muted">({percentage.toFixed(0)}%)</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {categoryData.length > 5 && (
                        <div className="text-right">
                          <span className="text-[10px] text-muted italic">+ {categoryData.length - 5} autres catégories</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comparatif Flux financiers */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-between avoid-break">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">Comparatif Flux financiers</h3>
                <div className="chart-box h-40 w-full flex items-center justify-center">
                  <BarChart 
                    width={620}
                    height={160}
                    data={[
                      { name: 'Recettes', montant: metrics.totalIncome },
                      { name: 'Dépenses', montant: metrics.totalExpenses }
                    ]}
                    margin={{ top: 20, right: 20, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(val) => [`${val.toFixed(2)} €`, 'Montant']} wrapperStyle={{ pointerEvents: 'none' }} />
                    <Bar dataKey="montant" radius={[8, 8, 0, 0]} barSize={40} isAnimationActive={false}>
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </div>
              </div>
            </div>

            {/* Évolution de la Richesse (Graphique) - Page Break Before to make it clean */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm avoid-break">
              <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">Évolution cumulée du solde sur la période</h3>
              
              <div className="chart-box h-52 w-full">
                <AreaChart 
                  width={620}
                  height={208}
                  data={dailyBalances} 
                  margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="reportBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 9 }}
                    interval={Math.ceil(dailyBalances.length / 6)}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 9 }}
                  />
                  <Tooltip 
                    wrapperStyle={{ pointerEvents: 'none' }}
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                    formatter={(value) => [`${value.toFixed(2)} €`, 'Solde cumulé']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#reportBalanceGrad)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </div>
            </div>

            {/* Analyses & Points de vigilance */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-between avoid-break">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-accent" />
                  Analyses & Points de vigilance
                </h3>
                
                <div className="space-y-3">
                  {attentionPoints.map((pt, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-2xl border flex gap-3 text-xs leading-relaxed ${
                        pt.type === 'warning' 
                          ? 'bg-danger/10 border-danger/20 text-danger' 
                          : pt.type === 'success' 
                            ? 'bg-accent/10 border-accent/20 text-accent' 
                            : 'bg-info/10 border-info/20 text-info'
                      }`}
                    >
                      {pt.type === 'warning' ? (
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      ) : pt.type === 'success' ? (
                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <Info size={16} className="shrink-0 mt-0.5" />
                      )}
                      <span className="font-semibold text-primary block pr-2 leading-relaxed" style={{ overflow: 'visible', whiteSpace: 'normal' }}>{pt.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prévisionnel du solde à 30 jours */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-between avoid-break">
              <div>
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4">Prévisionnel du solde à 30 jours</h3>
                <p className="text-[10px] text-muted mb-3 leading-relaxed">
                  Projection basée sur le flux net quotidien moyen de la période sélectionnée ({formatCurrency((metrics.totalIncome - metrics.totalExpenses) / Math.max(1, dailyBalances.length))} / jour).
                </p>
                
                <div className="chart-box h-36 w-full flex items-center justify-center">
                  <AreaChart 
                    width={620}
                    height={144}
                    data={forecastData} 
                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="day" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 9 }}
                      interval={4}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 9 }}
                    />
                    <Tooltip 
                      wrapperStyle={{ pointerEvents: 'none' }}
                      formatter={(value) => [`${value.toFixed(2)} €`, 'Projection']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#10b981" 
                      strokeWidth={1.5} 
                      fill="none"
                      strokeDasharray="4 4"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </div>
              </div>
            </div>

            {/* Dépenses qui sortent de l'ordinaire - Table Block */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm avoid-break">
              <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-warning" />
                Dépenses inhabituelles (détectées)
              </h3>
              
              {unusualExpenses.length === 0 ? (
                <div className="text-center py-6 bg-surface rounded-2xl border border-dashed border-border/40">
                  <p className="text-xs text-muted">Aucune dépense anormalement élevée détectée sur cette période.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {/* Table Header */}
                  <div className="flex items-center text-xs pb-2 border-b border-border/20 text-muted font-bold">
                    <div className="font-semibold shrink-0" style={{ width: '80px' }}>Date</div>
                    <div className="font-semibold shrink-0 px-2" style={{ width: '220px' }}>Description</div>
                    <div className="font-semibold shrink-0 px-2" style={{ width: '120px' }}>Catégorie</div>
                    <div className="font-semibold shrink-0 px-2" style={{ width: '110px' }}>Compte</div>
                    <div className="font-semibold shrink-0 text-right" style={{ width: '102px' }}>Montant</div>
                  </div>
                  {/* Table Rows */}
                  <div className="divide-y divide-border/10">
                    {unusualExpenses.map(tx => (
                      <div key={tx._id} className="flex items-center text-xs py-2.5 text-primary avoid-break">
                        <div className="font-mono shrink-0" style={{ width: '80px' }}>{new Date(tx.date).toLocaleDateString('fr-FR')}</div>
                        <div className="font-bold shrink-0 px-2 truncate max-w-[220px] leading-normal" style={{ width: '220px' }}>{tx.description || 'Transaction'}</div>
                        <div className="shrink-0 px-2 truncate max-w-[120px]" style={{ width: '120px' }}>
                          <span className="inline-flex items-center gap-1 leading-normal">
                            <span>{tx.categoryId?.icon || '📁'}</span>
                            <span className="font-medium">{tx.categoryId?.name || 'Non catégorisé'}</span>
                          </span>
                        </div>
                        <div className="shrink-0 px-2 truncate max-w-[110px] leading-normal" style={{ width: '110px' }}>{tx.accountId?.name || 'Compte'}</div>
                        <div className="text-right font-bold text-danger font-mono shrink-0" style={{ width: '102px' }}>-{formatCurrency(tx.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Liste complète des Transactions (Fin de rapport) */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm force-page-break">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/20">
                <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider">
                  Journal des Transactions Détaillées
                </h3>
                <span className="text-[10px] text-muted font-bold font-mono">
                  {transactions.length} transaction(s)
                </span>
              </div>
              
              <div className="space-y-0.5">
                {/* Table Header */}
                <div className="flex items-center text-xs pb-2 border-b border-border/20 text-muted font-bold">
                  <div className="font-semibold shrink-0" style={{ width: '80px' }}>Date</div>
                  <div className="font-semibold shrink-0 px-2" style={{ width: '220px' }}>Description</div>
                  <div className="font-semibold shrink-0 px-2" style={{ width: '120px' }}>Catégorie</div>
                  <div className="font-semibold shrink-0 px-2" style={{ width: '110px' }}>Compte</div>
                  <div className="font-semibold shrink-0 text-right" style={{ width: '102px' }}>Montant</div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-border/10">
                  {transactions.map(tx => (
                    <div key={tx._id} className="flex items-center text-xs py-2.5 text-primary avoid-break">
                      <div className="font-mono text-[10px] shrink-0" style={{ width: '80px' }}>{new Date(tx.date).toLocaleDateString('fr-FR')}</div>
                      <div className="font-bold truncate shrink-0 px-2 max-w-[220px]" style={{ width: '220px' }}>{tx.description || 'Transaction'}</div>
                      <div className="shrink-0 px-2 truncate max-w-[120px]" style={{ width: '120px' }}>
                        <span className="inline-flex items-center gap-1">
                          <span>{tx.categoryId?.icon || '📁'}</span>
                          <span>{tx.categoryId?.name || 'Non catégorisé'}</span>
                        </span>
                      </div>
                      <div className="truncate shrink-0 px-2 max-w-[110px]" style={{ width: '110px' }}>{tx.accountId?.name || 'Compte'}</div>
                      <div className={`text-right font-bold font-mono shrink-0 ${
                        tx.type === 'income' ? 'text-accent' : tx.type === 'expense' ? 'text-danger' : 'text-info'
                      }`} style={{ width: '102px' }}>
                        {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default ReportsPage;
