import React from 'react';
import { Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../../utils/hapticHelper';
import AmountDisplay from '../ui/AmountDisplay';

const CategoryIcon = ({ tx }) => {
  if (tx.type === 'transfer') {
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg shrink-0 bg-blue-500/10 border border-blue-500/20 text-blue-400">
        🔄
      </div>
    );
  }
  
  if (!tx.categoryId) {
    return (
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg shrink-0 bg-amber-500/10 border border-amber-500/20 text-amber-500">
        ❓
      </div>
    );
  }
  
  const catColor = tx.categoryId.color || '#888';
  return (
    <div 
      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 flex items-center justify-center text-lg shadow-inner border"
      style={{
        background: `linear-gradient(135deg, ${catColor}25 0%, ${catColor}08 100%)`,
        borderColor: `${catColor}35`
      }}
    >
      {tx.categoryId.icon || '💸'}
    </div>
  );
};

const TransactionList = ({ transactions, onDelete, onEdit, onToggleReview, currentAccountId }) => {
  const [visibleCount, setVisibleCount] = React.useState(30);
  const observerTarget = React.useRef(null);

  const alertThreshold = React.useMemo(() => {
    const saved = localStorage.getItem('budgetizer_alert_threshold');
    return saved ? Number(saved) : 100;
  }, []);

  // Reset pagination when the global list of transactions changes (e.g., when applying filters)
  React.useEffect(() => {
    setVisibleCount(30);
  }, [transactions]);

  // Load more when user scrolls to bottom
  React.useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < transactions.length) {
          triggerHaptic('light');
          setVisibleCount((prev) => Math.min(prev + 30, transactions.length));
        }
      },
      { threshold: 0.05, rootMargin: '100px' }
    );

    observer.observe(target);
    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [visibleCount, transactions.length]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Only slice and group what is currently visible
  const slicedTransactions = React.useMemo(() => {
    return (transactions || []).slice(0, visibleCount);
  }, [transactions, visibleCount]);

  const grouped = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return slicedTransactions.reduce((acc, curr) => {
      const txDate = new Date(curr.date);
      txDate.setHours(0, 0, 0, 0);
      let dateKey: string;

      if (txDate.getTime() === today.getTime()) {
        dateKey = "Aujourd'hui";
      } else if (txDate.getTime() === yesterday.getTime()) {
        dateKey = 'Hier';
      } else {
        dateKey = txDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        dateKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(curr);
      return acc;
    }, {});
  }, [slicedTransactions]);

  if (!transactions || transactions.length === 0) {
    return <div className="text-center text-muted p-8">Aucune transaction trouvée.</div>;
  }

  return (
    <div>
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="mb-6">
          <div className="sticky top-[56px] bg-base/95 backdrop-blur-sm z-10 py-2 mb-2 flex justify-between items-center px-1">
            <h3 className={`text-sm font-bold capitalize ${
              date === "Aujourd'hui" ? 'text-accent' :
              date === 'Hier' ? 'text-primary' : 'text-secondary'
            }`}>{date}</h3>
          </div>
          
          <div className="bg-surface-2 rounded-[24px] border border-border/40 overflow-hidden divide-y divide-border/30 shadow-sm">
            {txs.map(tx => (
              <div 
                key={tx._id} 
                className="relative overflow-hidden bg-danger-dim/20 first:rounded-t-[24px] last:rounded-b-[24px]"
              >
                {/* Back Layer Left: Swipe édit + suppression */}
                <div className="absolute right-0 top-0 bottom-0 flex">
                  {/* Bouton Modifier */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      if (onEdit) onEdit(tx);
                    }}
                    className="w-20 bg-accent text-white flex flex-col items-center justify-center transition-colors hover:bg-accent/90 active:bg-accent/80 select-none z-0"
                  >
                    <Pencil size={16} />
                    <span className="text-[8px] font-bold mt-1">Modifier</span>
                  </button>
                  {/* Bouton Supprimer */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('medium');
                      if (onDelete) onDelete(tx);
                    }}
                    className="w-20 bg-danger text-white flex flex-col items-center justify-center transition-colors hover:bg-danger/90 active:bg-danger/80 select-none z-0"
                  >
                    <Trash2 size={16} />
                    <span className="text-[8px] font-bold mt-1">Supprimer</span>
                  </button>
                </div>

                {/* Front Layer: Draggable Content */}
                <motion.div
                  drag={onEdit || onDelete ? "x" : false}
                  dragConstraints={{ left: -160, right: 0 }}
                  dragElastic={{ left: 0.1, right: 0.5 }}
                  dragMomentum={false}
                  onDragStart={() => {
                    if (onEdit || onDelete) triggerHaptic('light');
                  }}
                  className="bg-surface-2 relative z-10 p-3.5 flex items-center gap-3 sm:gap-4 hover:bg-surface/30 transition-colors cursor-pointer select-none border-l-4"
                  style={{
                    borderLeftColor: tx.type === 'transfer'
                      ? '#3b82f6'
                      : !tx.categoryId
                        ? '#f59e0b'
                        : tx.categoryId?.color || '#888'
                  }}
                  onClick={onEdit ? () => onEdit(tx) : undefined}
                >
                  {/* Badge de Pointage / Action de review rapide (aligné à gauche) */}
                  <button
                    type="button"
                    title={tx.isReviewed ? "Transaction pointée / vérifiée" : "Cliquer pour pointer la transaction"}
                    onClick={async (e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      try {
                        if (onToggleReview) {
                          await onToggleReview(tx._id, !tx.isReviewed);
                        } else {
                          const { reviewTransaction } = await import('../../services/ruleService');
                          await reviewTransaction(tx._id, !tx.isReviewed);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className={`p-1.5 rounded-xl transition-all active:scale-90 shrink-0 ${
                      tx.isReviewed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400 bg-slate-800/40 hover:bg-slate-800/60'
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </button>

                  <CategoryIcon tx={tx} />
                  
                  <div className="flex-1 min-w-0">
                    <p 
                      className={`font-semibold text-xs sm:text-sm truncate whitespace-nowrap leading-snug flex items-center gap-1.5 ${
                        !tx.categoryId && tx.type !== 'transfer' ? 'text-amber-500' : 'text-primary'
                      }`}
                      title={
                        tx.type === 'transfer' 
                          ? (tx.description || tx.note || 'Virement') 
                          : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie')
                      }
                    >
                      <span className="truncate">
                        {tx.type === 'transfer' 
                          ? (tx.description || tx.note || 'Virement') 
                          : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie ⚠️')
                        }
                      </span>
                      {typeof tx._id === 'string' && tx._id.startsWith('temp-') && (
                        <span 
                          className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0"
                          title="En attente de synchronisation hors-ligne"
                        >
                          ⏳ Hors-ligne
                        </span>
                      )}
                    </p>
                    
                    {tx.type === 'transfer' ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-secondary">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>
                        <span className="text-muted text-[10px] shrink-0">➔</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.toAccountId?.color || '#888' }} />
                          <span className="truncate">{tx.toAccountId?.name || 'Inconnu'}</span>
                        </span>
                        
                        {tx.tags && tx.tags.length > 0 && tx.tags.map(tag => (
                          <span
                            key={tag._id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold shrink-0 border bg-copper-dim border-copper/15 text-copper"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {tx.categoryId?.name ? (
                          <span className="text-[10px] text-secondary/80 font-bold truncate">
                            {tx.categoryId.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-0.5">
                            À catégoriser
                          </span>
                        )}
                        <span className="text-muted text-[8px]">•</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary truncate w-fit max-w-full">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>
 
                        {tx.tags && tx.tags.length > 0 && tx.tags.map(tag => (
                          <span
                            key={tag._id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold shrink-0 border bg-copper-dim border-copper/15 text-copper"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Uncategorized Action Button (Gamification) */}
                  {!tx.categoryId && tx.type !== 'transfer' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        if (onEdit) onEdit(tx);
                      }}
                      className="mr-1 px-2.5 py-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 active:scale-90 transition-all flex items-center gap-1 shrink-0"
                    >
                      Classer ➔
                    </button>
                  )}
                  
                  <div className="text-right shrink-0 ml-auto pl-1">
                    {(() => {
                      const isDebit = tx.type === 'expense' || (tx.type === 'transfer' && !(currentAccountId && (tx.toAccountId?._id === currentAccountId || tx.toAccountId === currentAccountId)));
                      
                      return (
                        <AmountDisplay
                          amount={tx.amount}
                          size="sm"
                          type={isDebit ? 'expense' : 'income'}
                          showSign
                        />
                      );
                    })()}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Target for intersection observer to trigger loading more */}
      {visibleCount < transactions.length && (
        <div ref={observerTarget} className="h-12 flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default TransactionList;
