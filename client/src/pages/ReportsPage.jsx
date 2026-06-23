import { useState, useEffect, useContext } from 'react';
import { HeaderTitle, HeaderBackButton, HeaderPortalContext } from '../components/layout/AppShell';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { AuthContext } from '../context/AuthContext';
import { useAccounts } from '../hooks/useAccounts';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  Download, ListFilter, CalendarDays, Sparkles, AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, 
  BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip
} from 'recharts';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const { isScrolled } = useContext(HeaderPortalContext);
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
  const [showParams, setShowParams] = useState(true);
  const [logoBase64, setLogoBase64] = useState('');

  // PDF Export options
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [includeForecast, setIncludeForecast] = useState(true);
  const [includeWaterfall, setIncludeWaterfall] = useState(true);
  const [includeFixedVar, setIncludeFixedVar] = useState(true);
  
  // Report data states
  const [transactions, setTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dailyBalances, setDailyBalances] = useState([]);
  const [waterfallData, setWaterfallData] = useState(null);
  const [fixedVarData, setFixedVarData] = useState(null);
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

  // Helper function to process waterfall chart data for printing
  const getWaterfallChartData = () => {
    if (!waterfallData || !waterfallData.categories) return [];
    const chartData = [];
    const { totalIncome = 0, totalExpenses = 0, categories = [], netSavings = 0 } = waterfallData;

    // 1. Income
    chartData.push({
      name: 'Revenus',
      displayVal: totalIncome,
      value: [0, totalIncome],
      color: '#10b981'
    });

    let currentAccumulator = totalIncome;
    const threshold = (totalExpenses || 0) * 0.05;
    const processedCats = [];
    let otherAmount = 0;

    categories.forEach(cat => {
      if (categories.length > 6 && cat.amount < threshold) {
        otherAmount += cat.amount;
      } else {
        processedCats.push(cat);
      }
    });

    if (otherAmount > 0) {
      processedCats.push({
        categoryId: 'others',
        name: 'Autres',
        icon: '📁',
        color: '#71717a',
        amount: otherAmount
      });
    }

    // 2. Categories
    processedCats.forEach(cat => {
      const nextAccumulator = currentAccumulator - cat.amount;
      chartData.push({
        name: cat.name,
        displayVal: -cat.amount,
        value: [nextAccumulator, currentAccumulator],
        color: cat.color || '#f43f5e'
      });
      currentAccumulator = nextAccumulator;
    });

    // 3. Final Savings / Deficit
    chartData.push({
      name: netSavings >= 0 ? 'Épargne Nette' : 'Déficit Net',
      displayVal: netSavings,
      value: [0, netSavings],
      color: netSavings >= 0 ? '#a855f7' : '#f43f5e'
    });

    return chartData;
  };

  // Helper function to process Fixed vs Variable donut chart data for printing
  const getFixedVarPieData = () => {
    if (!fixedVarData || fixedVarData.totalFixed === undefined) return [];
    return [
      { name: 'Charges fixes', value: fixedVarData.totalFixed || 0, color: '#818cf8' },
      { name: 'Dépenses variables', value: fixedVarData.totalVariable || 0, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  };

  // Debugging Console
  const logDebug = (msg) => {
    console.log(`${new Date().toLocaleTimeString()} - ${msg}`);
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

  // Preload logo and convert to Base64 for reliable PDF generation
  useEffect(() => {
    logDebug("Convertissant le logo en Base64 pour l'export PDF...");
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        setLogoBase64(dataURL);
        logDebug("Logo encodé en Base64 avec succès.");
      } catch (err) {
        logDebug(`Échec encodage Base64 logo: ${err.message}`);
      }
    };
    img.onerror = (err) => {
      logDebug("Échec chargement logo /pwa-192x192.png.");
    };
    img.src = '/pwa-192x192.png';
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
      logDebug("Envoi de la requête de récupération des transactions et des rapports associés...");
      const promises = [
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
      ];

      if (includeWaterfall) {
        promises.push(api.get('/charts/waterfall', { params: { startDate, endDate } }));
      } else {
        promises.push(Promise.resolve(null));
      }

      if (includeFixedVar) {
        promises.push(api.get('/charts/fixed-vs-variable', { params: { startDate, endDate } }));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [txRes, balanceHistoryRes, waterfallRes, fixedVarRes] = await Promise.all(promises);
      const allTransactionsFetched = txRes.data.transactions || [];
      const reconstructedBalances = balanceHistoryRes.data || [];
      logDebug(`Transactions récupérées du serveur : ${allTransactionsFetched.length}`);

      if (waterfallRes) {
        setWaterfallData(waterfallRes.data);
        logDebug("Données Waterfall chargées avec succès.");
      } else {
        setWaterfallData(null);
      }

      if (fixedVarRes) {
        setFixedVarData(fixedVarRes.data);
        logDebug("Données Fixes vs Variables chargées avec succès.");
      } else {
        setFixedVarData(null);
      }

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
      setShowParams(false);
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
        margin: [0, 0, 0, 0], // Margins are managed inside .pdf-page CSS padding
        filename: `budgetizer_${startDate}_${endDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794, // Standard 794px width for A4 pages at 96 DPI
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { 
          mode: ['css', 'legacy']
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

  const handleShowReportOnly = async () => {
    logDebug("Affichage du rapport à l'écran demandé...");
    await handleGenerateReport();
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
      <HeaderTitle collapsible={true}>Rapports d'Activité</HeaderTitle>
      <HeaderBackButton to="/" />
      
      {/* Large Collapsible Header Title on Page */}
      <div className={`mb-5 mt-2 px-1 transition-all duration-300 transform origin-left print:hidden ${
        isScrolled 
          ? 'opacity-0 -translate-y-2 pointer-events-none' 
          : 'opacity-100 translate-y-0'
      }`}>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Rapports d'Activité</h1>
        <p className="text-xs text-secondary mt-0.5 font-medium">Générez et exportez des bilans financiers au format PDF.</p>
      </div>
      {/* CSS overrides specifically for printing */}
      <style>{`
        /* Force light theme variables and font styles on the print container */
        #print-report-area {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          color: #09090b !important;
          background-color: #ffffff !important;
        }

        #print-report-area * {
          box-sizing: border-box;
        }

        .pdf-page {
          width: 794px !important;
          padding: 45px 50px !important;
          background-color: #ffffff !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: flex-start !important;
          position: relative !important;
        }

        .pdf-page:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }

        /* Clean styles for export layout */
        #print-report-area button,
        #print-report-area .print-hidden,
        #print-report-area .print\\:hidden {
          display: none !important;
        }

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

        #print-report-area table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
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
        }
      `}</style>

      <div className="space-y-6 mb-6">
        
        {/* Collapsed Parameters - Shown when dashboard is active */}
        {!showParams && hasGenerated && !loading && (
          <div className="bg-surface-2 p-4 rounded-[28px] border border-border/40 shadow-sm print:hidden flex items-center justify-between gap-4 transition-all duration-200">
            <div className="space-y-1">
              <span className="text-[10px] text-muted font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                <CalendarDays size={12} className="text-copper" /> Période d'analyse
              </span>
              <p className="text-xs font-bold text-primary">
                Du {startDate.split('-').reverse().join('/')} au {endDate.split('-').reverse().join('/')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowParams(true)}
                variant="secondary"
                className="!h-9 !px-3.5 !rounded-xl text-[11px] font-extrabold uppercase tracking-wide border border-border/40 hover:bg-border/20 text-primary"
              >
                Filtres
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="copper"
                className="!h-9 !px-3.5 !rounded-xl text-[11px] font-extrabold uppercase tracking-wide"
              >
                <Download size={12} className="mr-1" /> PDF
              </Button>
            </div>
          </div>
        )}

        {/* Parameters Form - Hidden during printing, shown only when active */}
        {(showParams || !hasGenerated) && (
          <section className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm print:hidden">
            <div className="flex items-center gap-2 mb-4">
              <ListFilter size={18} className="text-copper" />
              <h3 className="text-sm font-bold text-primary">Paramètres du rapport</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                label="Date de début"
                id="startDate-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                uppercaseLabel={true}
              />
              <Input
                type="date"
                label="Date de fin"
                id="endDate-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                uppercaseLabel={true}
              />
            </div>

            {/* Options de contenu du rapport */}
            <div className="mt-6 space-y-3 pt-4 border-t border-border/20">
              <span className="text-[10px] uppercase font-extrabold text-secondary tracking-wider block">Contenu du rapport PDF</span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-primary font-semibold py-1">
                  <input 
                    type="checkbox"
                    checked={includeWaterfall}
                    onChange={(e) => setIncludeWaterfall(e.target.checked)}
                    className="rounded border-border/40 text-copper focus:ring-copper accent-copper w-4 h-4 cursor-pointer"
                  />
                  Graphique Cascade (Waterfall)
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-primary font-semibold py-1">
                  <input 
                    type="checkbox"
                    checked={includeFixedVar}
                    onChange={(e) => setIncludeFixedVar(e.target.checked)}
                    className="rounded border-border/40 text-copper focus:ring-copper accent-copper w-4 h-4 cursor-pointer"
                  />
                  Charges Fixes vs Variables
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-primary font-semibold py-1">
                  <input 
                    type="checkbox"
                    checked={includeForecast}
                    onChange={(e) => setIncludeForecast(e.target.checked)}
                    className="rounded border-border/40 text-copper focus:ring-copper accent-copper w-4 h-4 cursor-pointer"
                  />
                  Prévisions à 30 jours
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-primary font-semibold py-1">
                  <input 
                    type="checkbox"
                    checked={includeTransactions}
                    onChange={(e) => setIncludeTransactions(e.target.checked)}
                    className="rounded border-border/40 text-copper focus:ring-copper accent-copper w-4 h-4 cursor-pointer"
                  />
                  Journal des transactions
                </label>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                onClick={handleShowReportOnly}
                disabled={loading}
                variant="copper"
                fullWidth
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    Calcul en cours...
                  </span>
                ) : (
                  <span className="text-xs font-extrabold uppercase tracking-wide">
                    Analyser et afficher le rapport
                  </span>
                )}
              </Button>

              <Button
                onClick={handleExportProcess}
                disabled={loading}
                variant="secondary"
                fullWidth
              >
                {loading ? (
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-primary">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                    Génération du PDF...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-primary">
                    <Download size={14} className="shrink-0" />
                    Exporter le rapport en PDF
                  </span>
                )}
              </Button>
            </div>
          </section>
        )}

        {/* Global Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-secondary font-bold">Calcul de la santé financière...</p>
          </div>
        )}

        {/* On-Screen Dashboard - Interactive presentation of the generated report */}
        {!showParams && hasGenerated && !loading && transactions.length > 0 && (
          <div className="space-y-6 animate-fade-in print:hidden">
            
            {/* Header / Summary Card */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted font-extrabold uppercase tracking-widest block">Score de santé</span>
                  <span className="text-2xl font-black text-primary tracking-tight">Diagnostic Global</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                  metrics.healthScore >= 85
                    ? 'text-accent border-accent/20 bg-accent/5'
                    : metrics.healthScore >= 70
                    ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                    : metrics.healthScore >= 50
                    ? 'text-warning border-warning/20 bg-warning/5'
                    : metrics.healthScore >= 30
                    ? 'text-orange-400 border-orange-400/20 bg-orange-400/5'
                    : 'text-danger border-danger/20 bg-danger/5'
                }`}>
                  {metrics.healthLabel}
                </span>
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-border/10">
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="32" stroke="var(--border)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke={
                        metrics.healthScore >= 70 
                          ? 'var(--accent)' 
                          : metrics.healthScore >= 50 
                          ? 'var(--warning)' 
                          : 'var(--danger)'
                      } 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 32} 
                      strokeDashoffset={2 * Math.PI * 32 * (1 - metrics.healthScore / 100)} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <span className="absolute text-lg font-black text-primary font-premium-numbers">{metrics.healthScore}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-secondary leading-relaxed font-medium">
                    Votre indice de santé financière est calculé en analysant votre taux d'épargne, la récurrence de vos dépenses et les anomalies détectées.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Revenus</span>
                <span className="text-sm font-extrabold text-accent font-premium-numbers block mt-1.5">
                  {formatCurrency(metrics.totalIncome)}
                </span>
              </div>
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Dépenses</span>
                <span className="text-sm font-extrabold text-danger font-premium-numbers block mt-1.5">
                  -{formatCurrency(metrics.totalExpenses)}
                </span>
              </div>
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Épargne Nette</span>
                <span className={`text-sm font-extrabold font-premium-numbers block mt-1.5 ${
                  metrics.netSavings >= 0 ? 'text-accent' : 'text-danger'
                }`}>
                  {metrics.netSavings >= 0 ? '+' : ''}{formatCurrency(metrics.netSavings)}
                </span>
              </div>
              <div className="bg-surface-2 p-4 rounded-[22px] border border-border/40 shadow-sm">
                <span className="text-[9px] text-muted font-extrabold uppercase tracking-wider block">Taux d'épargne</span>
                <span className="text-sm font-extrabold text-primary font-premium-numbers block mt-1.5">
                  {metrics.savingsRate}%
                </span>
              </div>
            </div>

            {/* On-screen Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Category Breakdown Progress Bars */}
              <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Postes de dépenses majeurs</h4>
                  <p className="text-[10px] text-muted mt-0.5 font-medium">Répartition par catégorie de dépenses</p>
                </div>
                <div className="space-y-3.5 pt-1">
                  {categoryData.slice(0, 4).map(cat => {
                    const percentage = metrics.totalExpenses > 0 ? (cat.value / metrics.totalExpenses) * 100 : 0;
                    return (
                      <div key={cat.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-primary">{cat.icon} {cat.name}</span>
                          <span className="font-premium-numbers font-extrabold text-secondary">
                            {formatCurrency(cat.value)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface border border-border/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: cat.color || '#3b82f6' 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                  {categoryData.length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Aucune dépense sur cette période.</p>
                  )}
                </div>
              </div>

              {/* Balance History Area Chart */}
              <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Évolution du solde</h4>
                  <p className="text-[10px] text-muted mt-0.5 font-medium">Historique quotidien sur tous vos comptes courants</p>
                </div>
                <div className="h-44 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyBalances} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="screenBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--copper)" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="var(--copper)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                        interval={Math.ceil(dailyBalances.length / 5)} 
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 500 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-elevated)', 
                          borderColor: 'var(--border)', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          fontWeight: 600
                        }} 
                        formatter={(value) => [formatCurrency(value), 'Solde']}
                        labelFormatter={(label) => `Date : ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="var(--copper)" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#screenBalanceGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Diagnostic Points of Attention */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-copper animate-pulse" />
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Diagnostic & Conseils Proactifs</h4>
              </div>
              <div className="border-t border-border/10 pt-3.5 space-y-3">
                {attentionPoints.map((pt, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl border text-xs leading-relaxed font-medium flex gap-2.5 items-start ${
                      pt.type === 'warning' 
                        ? 'bg-danger/5 border-danger/20 text-danger' 
                        : pt.type === 'success' 
                        ? 'bg-accent/5 border-accent/20 text-accent' 
                        : 'bg-info/5 border-info/20 text-info'
                    }`}
                  >
                    <span className="text-sm shrink-0">
                      {pt.type === 'warning' ? '⚠️' : pt.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <p>{pt.text}</p>
                  </div>
                ))}
                {attentionPoints.length === 0 && (
                  <p className="text-xs text-muted text-center py-2">Aucun point de vigilance particulier.</p>
                )}
              </div>
            </div>

            {/* Unusual Expenses detected on screen */}
            <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning animate-pulse" />
                <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Dépenses inhabituelles détectées</h4>
              </div>
              <div className="border-t border-border/10 pt-3.5 space-y-2.5">
                {unusualExpenses.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">Aucune dépense inhabituelle ou anomalie détectée sur la période.</p>
                ) : (
                  unusualExpenses.map(tx => (
                    <div 
                      key={tx._id} 
                      className="flex justify-between items-center bg-surface p-3.5 rounded-2xl border border-border/30 hover:border-border/60 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-primary">
                          {tx.type === 'transfer' 
                            ? (tx.description || tx.note || 'Virement') 
                            : (tx.note || tx.description || 'Transaction')
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted font-bold bg-surface-2 px-2 py-0.5 rounded border border-border/20">
                            {tx.categoryId?.name || 'Non catégorisé'}
                          </span>
                          <span className="text-[9px] text-muted font-medium">
                            {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1 shrink-0">
                        <span className="text-xs font-extrabold text-danger font-premium-numbers block">
                          -{formatCurrency(tx.amount)}
                        </span>
                        {tx.amount > 200 && (
                          <span className="text-[9px] font-extrabold text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 inline-block">
                            Montant élevé ({'>'} 200€)
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Transactions Journal (Optionnel) - Shown when includeTransactions is checked */}
            {includeTransactions && (
              <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider">Journal des transactions</h4>
                  <p className="text-[10px] text-muted mt-0.5 font-medium">{transactions.length} flux enregistrés sur la période</p>
                </div>
                <div className="border-t border-border/10 pt-3.5 space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">Aucune transaction trouvée.</p>
                  ) : (
                    transactions.map(tx => (
                      <div 
                        key={tx._id} 
                        className="flex justify-between items-center bg-surface p-3.5 rounded-2xl border border-border/30 hover:border-border/60 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-primary">
                            {tx.type === 'transfer' 
                              ? (tx.description || tx.note || 'Virement') 
                              : (tx.note || tx.description || 'Transaction')
                            }
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted font-bold bg-surface-2 px-2 py-0.5 rounded border border-border/20">
                              {tx.type === 'transfer' ? 'Virement' : (tx.categoryId?.name || 'Non catégorisé')}
                            </span>
                            <span className="text-[9px] text-muted font-medium">
                              {new Date(tx.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-extrabold font-premium-numbers block ${
                            tx.type === 'income' ? 'text-accent' : tx.type === 'expense' ? 'text-danger' : 'text-info'
                          }`}>
                            {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                            {formatCurrency(tx.amount)}
                          </span>
                          <span className="text-[8px] text-muted block mt-0.5 font-medium">
                            {tx.accountId?.name || 'Compte'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Actions Panel */}
            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={handleDownloadPDF}
                variant="copper"
                fullWidth
              >
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                  <Download size={14} className="shrink-0" />
                  Exporter le rapport complet en PDF
                </span>
              </Button>
              <Button
                onClick={() => setShowParams(true)}
                variant="secondary"
                fullWidth
              >
                <span className="text-xs font-extrabold uppercase tracking-wide text-primary">
                  Modifier les dates ou paramètres
                </span>
              </Button>
            </div>

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
              className="print:block text-black bg-white"
              style={{ 
                width: '794px',
                boxSizing: 'border-box'
              }}
            >
              {/* PAGE 1: Page de Garde */}
              <div className="pdf-page bg-white" style={{ minHeight: '1020px', justifyContent: 'space-between' }}>
                <div style={{ height: '4px', background: 'linear-gradient(90deg, #d97706, #070e20)', width: '100%' }}></div>
                
                <div style={{ marginTop: '120px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 10px 25px rgba(217, 119, 6, 0.2)', marginBottom: '24px', overflow: 'hidden' }}>
                    <img src={logoBase64 || '/pwa-192x192.png'} alt="Logo Budgetizer" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                  </div>
                  <h1 style={{ fontSize: '38px', fontWeight: '900', color: '#09090b', letterSpacing: '-0.03em', margin: '0' }}>BUDGETIZER</h1>
                  <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.25em', color: '#d97706', fontWeight: '800', marginTop: '6px' }}>Gestion Financière Personnelle</p>
                </div>
 
                <div style={{ marginTop: '100px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#18181b', margin: '0' }}>Rapport d'Activité Financière</h2>
                  <p style={{ fontSize: '14px', color: '#52525b', marginTop: '8px' }}>
                    Période du <strong style={{ color: '#09090b' }}>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au <strong style={{ color: '#09090b' }}>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>
                  </p>
                </div>
 
                <div style={{ marginTop: '120px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '420px', padding: '24px', borderRadius: '20px', border: '1px solid #e4e4e7', backgroundColor: '#fafafa', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#71717a', display: 'block' }}>Propriétaire</span>
                      <strong style={{ fontSize: '13px', color: '#18181b' }}>{user?.name || 'Utilisateur'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#71717a', display: 'block' }}>Généré le</span>
                      <strong style={{ fontSize: '13px', color: '#18181b' }}>{new Date().toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#71717a', display: 'block' }}>Transactions</span>
                      <strong style={{ fontSize: '13px', color: '#18181b' }}>{transactions.length} enregistrées</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#71717a', display: 'block' }}>Statut Rapport</span>
                      <strong style={{ fontSize: '13px', color: '#d97706' }}>Finalisé</strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'center', borderTop: '1px solid #f4f4f5', paddingTop: '20px' }}>
                  <p style={{ fontSize: '10px', color: '#a1a1aa', margin: '0' }}>Document strictement confidentiel — Budgetizer Inc.</p>
                </div>
              </div>

              {/* PAGE 2: Bilan & Cascade */}
              <div className="pdf-page bg-white" style={{ minHeight: '1000px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={logoBase64 || '/pwa-192x192.png'} alt="Logo" style={{ width: '14px', height: '14px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budgetizer &bull; Bilan Financier</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#a1a1aa' }}>{new Date(startDate).toLocaleDateString('fr-FR')} - {new Date(endDate).toLocaleDateString('fr-FR')}</span>
                </div>

                <div style={{ display: 'flex', gap: '28px', flex: 1 }}>
                  <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Score de santé</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg style={{ width: '56px', height: '56px' }}>
                            <g transform="rotate(-90 28 28)">
                              <circle cx="28" cy="28" r="23" stroke="#e5e7eb" strokeWidth="5" fill="transparent" />
                              <circle cx="28" cy="28" r="23" stroke={metrics.healthScore >= 70 ? "#10b981" : metrics.healthScore >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="5" fill="transparent" strokeDasharray={2 * Math.PI * 23} strokeDashoffset={2 * Math.PI * 23 * (1 - metrics.healthScore / 100)} strokeLinecap="round" />
                            </g>
                          </svg>
                          <span style={{ position: 'absolute', fontSize: '13px', fontWeight: '950', fontFamily: 'monospace', color: '#09090b' }}>{metrics.healthScore}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '12px', border: '1px solid', backgroundColor: metrics.healthScore >= 70 ? '#d1fae5' : metrics.healthScore >= 50 ? '#fef3c7' : '#fee2e2', color: metrics.healthScore >= 70 ? '#065f46' : metrics.healthScore >= 50 ? '#92400e' : '#991b1b', borderColor: metrics.healthScore >= 70 ? '#a7f3d0' : metrics.healthScore >= 50 ? '#fde68a' : '#fecaca' }}>
                            {metrics.healthLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', display: 'block' }}>Revenus</span>
                        <strong style={{ fontSize: '16px', color: '#10b981', fontFamily: 'monospace' }}>{formatCurrency(metrics.totalIncome)}</strong>
                      </div>
                      <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', display: 'block' }}>Dépenses</span>
                        <strong style={{ fontSize: '16px', color: '#ef4444', fontFamily: 'monospace' }}>-{formatCurrency(metrics.totalExpenses)}</strong>
                      </div>
                      <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase', display: 'block' }}>Épargne Nette</span>
                        <strong style={{ fontSize: '16px', color: metrics.netSavings >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {metrics.netSavings >= 0 ? '+' : ''}{formatCurrency(metrics.netSavings)}
                        </strong>
                      </div>
                      <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: '#71717a', textTransform: 'uppercase' }}>Taux d'épargne</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: metrics.savingsRate >= 15 ? '#10b981' : '#f59e0b', fontFamily: 'monospace' }}>{metrics.savingsRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {includeWaterfall && waterfallData && (
                      <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Analyse des flux (Cascade)</h4>
                        <p style={{ fontSize: '9px', color: '#a1a1aa', margin: '0 0 12px 0' }}>Répartition progressive des revenus dans les postes de dépenses</p>
                        <div style={{ height: '170px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <BarChart width={410} height={160} data={getWaterfallChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#71717a' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 8, fill: '#71717a' }} axisLine={false} tickLine={false} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                              {getWaterfallChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </div>
                      </div>
                    )}

                    <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Postes de dépenses majeurs</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {categoryData.slice(0, 4).map(cat => {
                          const percentage = metrics.totalExpenses > 0 ? (cat.value / metrics.totalExpenses) * 100 : 0;
                          return (
                            <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                <span style={{ fontWeight: '700', color: '#18181b' }}>{cat.icon} {cat.name}</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{formatCurrency(cat.value)} ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div style={{ height: '6px', width: '100%', backgroundColor: '#e4e4e7', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: cat.color || '#3b82f6', borderRadius: '3px' }} />
                              </div>
                            </div>
                          );
                        })}
                        {categoryData.length === 0 && (
                          <p style={{ fontSize: '11px', color: '#a1a1aa', textAlign: 'center', margin: '10px 0' }}>Aucune dépense enregistrée.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#a1a1aa' }}>
                  <span>Budgetizer &copy; {new Date().getFullYear()}</span>
                  <span>Page 2</span>
                </div>
              </div>

              {/* PAGE 3: Tendances & Budgets récurrents */}
              <div className="pdf-page bg-white" style={{ minHeight: '1000px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={logoBase64 || '/pwa-192x192.png'} alt="Logo" style={{ width: '14px', height: '14px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budgetizer &bull; Analyses & Tendances</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#a1a1aa' }}>{new Date(startDate).toLocaleDateString('fr-FR')} - {new Date(endDate).toLocaleDateString('fr-FR')}</span>
                </div>

                <div style={{ display: 'flex', gap: '28px', flex: 1 }}>
                  <div style={{ width: '230px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {includeFixedVar && fixedVarData && (
                      <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 2px 0', width: '100%' }}>Charges Fixes vs Variables</h4>
                        <p style={{ fontSize: '9px', color: '#a1a1aa', margin: '0 0 12px 0', width: '100%' }}>Planifié vs Discrétionnaire</p>
                        
                        <div style={{ height: '110px', width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                          <PieChart width={140} height={110}>
                            <Pie data={getFixedVarPieData()} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                              {getFixedVarPieData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                          <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', fontWeight: '800' }}>Total</span>
                            <span style={{ fontSize: '9px', fontWeight: '900', fontFamily: 'monospace' }}>{formatCurrency(fixedVarData.totalExpenses)}</span>
                          </div>
                        </div>

                        <div style={{ width: '100%', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                            <span style={{ color: '#818cf8', fontWeight: '700' }}>🔒 Charges fixes</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{fixedVarData.fixedRatio}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                            <span style={{ color: '#f59e0b', fontWeight: '700' }}>🎲 Var. discrét.</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: '800' }}>{fixedVarData.variableRatio}%</span>
                          </div>
                          <div style={{ height: '6px', width: '100%', backgroundColor: '#e4e4e7', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginTop: '4px' }}>
                            <div style={{ height: '100%', width: `${fixedVarData.fixedRatio}%`, backgroundColor: '#818cf8' }} />
                            <div style={{ height: '100%', width: `${fixedVarData.variableRatio}%`, backgroundColor: '#f59e0b' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ flex: 1, border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0' }}>Diagnostic Conseil</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {attentionPoints.slice(0, 3).map((pt, idx) => (
                          <div key={idx} style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid', fontSize: '9px', lineHeight: '1.4', backgroundColor: pt.type === 'warning' ? '#fee2e2' : pt.type === 'success' ? '#d1fae5' : '#dbeafe', borderColor: pt.type === 'warning' ? '#fecaca' : pt.type === 'success' ? '#a7f3d0' : '#dbeafe', color: pt.type === 'warning' ? '#991b1b' : pt.type === 'success' ? '#065f46' : '#1e40af' }}>
                            <strong>{pt.type === 'warning' ? '⚠️ Attention : ' : pt.type === 'success' ? '✅ Succès : ' : 'ℹ️ Conseil : '}</strong>
                            {pt.text}
                          </div>
                        ))}
                        {attentionPoints.length === 0 && (
                          <p style={{ fontSize: '10px', color: '#a1a1aa', textAlign: 'center' }}>Aucune alerte à signaler.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa' }}>
                      <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 2px 0' }}>Évolution du solde</h4>
                      <p style={{ fontSize: '9px', color: '#a1a1aa', margin: '0 0 12px 0' }}>Historique cumulé sur tous les comptes bancaires</p>
                      <div style={{ height: '160px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <AreaChart width={410} height={150} data={dailyBalances} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                          <defs>
                            <linearGradient id="printBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d97706" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" tick={{ fontSize: 7, fill: '#71717a' }} axisLine={false} tickLine={false} interval={Math.ceil(dailyBalances.length / 6)} />
                          <YAxis tick={{ fontSize: 8, fill: '#71717a' }} axisLine={false} tickLine={false} />
                          <Area type="monotone" dataKey="balance" stroke="#d97706" strokeWidth={1.5} fillOpacity={1} fill="url(#printBalanceGrad)" isAnimationActive={false} />
                        </AreaChart>
                      </div>
                    </div>

                    {includeForecast && forecastData && (
                      <div style={{ border: '1px solid #e4e4e7', borderRadius: '20px', padding: '16px', backgroundColor: '#fafafa' }}>
                        <h4 style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', margin: '0 0 2px 0' }}>Projection à 30 jours</h4>
                        <p style={{ fontSize: '9px', color: '#a1a1aa', margin: '0 0 12px 0' }}>Estimation basée sur le flux net quotidien moyen</p>
                        <div style={{ height: '120px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <AreaChart width={410} height={110} data={forecastData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 7, fill: '#71717a' }} axisLine={false} tickLine={false} interval={4} />
                            <YAxis tick={{ fontSize: 8, fill: '#71717a' }} axisLine={false} tickLine={false} />
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={1} fill="none" strokeDasharray="3 3" isAnimationActive={false} />
                          </AreaChart>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#a1a1aa' }}>
                  <span>Budgetizer &copy; {new Date().getFullYear()}</span>
                  <span>Page 3</span>
                </div>
              </div>

              {/* PAGE 4: Dépenses inhabituelles */}
              <div className="pdf-page bg-white" style={{ minHeight: '1000px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={logoBase64 || '/pwa-192x192.png'} alt="Logo" style={{ width: '14px', height: '14px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budgetizer &bull; Annexes & Anomalies</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#a1a1aa' }}>{new Date(startDate).toLocaleDateString('fr-FR')} - {new Date(endDate).toLocaleDateString('fr-FR')}</span>
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#18181b', textTransform: 'uppercase', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🚨</span> Dépenses inhabituelles détectées
                  </h3>

                  {unusualExpenses.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed #e4e4e7', borderRadius: '16px', backgroundColor: '#fafafa' }}>
                      <p style={{ fontSize: '11px', color: '#71717a', margin: '0' }}>Aucune anomalie ou dépense inhabituelle détectée sur cette période.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e4e4e7', color: '#71717a', fontWeight: '800' }}>
                          <th style={{ padding: '8px 4px', width: '80px' }}>Date</th>
                          <th style={{ padding: '8px 4px' }}>Description</th>
                          <th style={{ padding: '8px 4px', width: '110px' }}>Catégorie</th>
                          <th style={{ padding: '8px 4px', width: '100px' }}>Compte</th>
                          <th style={{ padding: '8px 4px', width: '80px', textAlign: 'right' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unusualExpenses.map(tx => (
                          <tr key={tx._id} style={{ borderBottom: '1px solid #f4f4f5', color: '#18181b' }} className="avoid-break">
                            <td style={{ padding: '8px 4px', fontFamily: 'monospace' }}>{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                            <td style={{ padding: '8px 4px', fontWeight: '700' }}>
                              {tx.type === 'transfer' 
                                ? (tx.description || tx.note || 'Virement') 
                                : (tx.note || tx.description || 'Transaction')
                              }
                            </td>
                            <td style={{ padding: '8px 4px' }}>{tx.categoryId?.icon} {tx.categoryId?.name || 'Non catégorisé'}</td>
                            <td style={{ padding: '8px 4px' }}>{tx.accountId?.name || 'Compte'}</td>
                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '800', color: '#ef4444', fontFamily: 'monospace' }}>-{formatCurrency(tx.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#a1a1aa' }}>
                  <span>Budgetizer &copy; {new Date().getFullYear()}</span>
                  <span>Page 4</span>
                </div>
              </div>

              {/* PAGE 5 (Optionnelle): Journal complet */}
              {includeTransactions && (
                <div className="pdf-page bg-white" style={{ height: 'auto', minHeight: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '12px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <img src={logoBase64 || '/pwa-192x192.png'} alt="Logo" style={{ width: '14px', height: '14px', borderRadius: '4px', objectFit: 'cover' }} />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budgetizer &bull; Journal des Transactions</span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#a1a1aa' }}>{transactions.length} transactions</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '800', color: '#18181b', textTransform: 'uppercase', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📓</span> Journal Détaillé des Flux
                    </h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e4e4e7', color: '#71717a', fontWeight: '800' }}>
                          <th style={{ padding: '6px 4px', width: '80px' }}>Date</th>
                          <th style={{ padding: '6px 4px' }}>Description</th>
                          <th style={{ padding: '6px 4px', width: '110px' }}>Catégorie</th>
                          <th style={{ padding: '6px 4px', width: '100px' }}>Compte</th>
                          <th style={{ padding: '6px 4px', width: '80px', textAlign: 'right' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx._id} style={{ borderBottom: '1px solid #f4f4f5', color: '#18181b' }} className="avoid-break">
                            <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                            <td style={{ padding: '6px 4px', fontWeight: '700' }}>
                              {tx.type === 'transfer' 
                                ? (tx.description || tx.note || 'Virement') 
                                : (tx.note || tx.description || 'Transaction')
                              }
                            </td>
                            <td style={{ padding: '6px 4px' }}>{tx.categoryId?.icon} {tx.categoryId?.name || 'Non catégorisé'}</td>
                            <td style={{ padding: '6px 4px' }}>{tx.accountId?.name || 'Compte'}</td>
                            <td style={{ 
                              padding: '6px 4px', 
                              textAlign: 'right', 
                              fontWeight: '800', 
                              fontFamily: 'monospace',
                              color: tx.type === 'income' ? '#10b981' : tx.type === 'expense' ? '#ef4444' : '#3b82f6'
                            }}>
                              {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#a1a1aa' }}>
                    <span>Budgetizer &copy; {new Date().getFullYear()}</span>
                    <span>Annexes</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default ReportsPage;
