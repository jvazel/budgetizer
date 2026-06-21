import React from 'react';
import { Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../../utils/hapticHelper';

const TransactionList = ({ transactions, onDelete, onEdit, currentAccountId }) => {
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

  if (!transactions || transactions.length === 0) {
    return <div className="text-center text-muted p-8">Aucune transaction trouvée.</div>;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Only slice and group what is currently visible
  const slicedTransactions = React.useMemo(() => {
    return transactions.slice(0, visibleCount);
  }, [transactions, visibleCount]);

  const grouped = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return slicedTransactions.reduce((acc, curr) => {
      const txDate = new Date(curr.date);
      txDate.setHours(0, 0, 0, 0);

      let label;
      if (txDate.getTime() === today.getTime()) {
        label = "Aujourd'hui";
      } else if (txDate.getTime() === yesterday.getTime()) {
        label = 'Hier';
      } else {
        label = new Date(curr.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }

      if (!acc[label]) acc[label] = [];
      acc[label].push(curr);
      return acc;
    }, {});
  }, [slicedTransactions]);

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
                  drag="x"
                  dragConstraints={{ left: -160, right: 0 }}
                  dragElastic={{ left: 0.1, right: 0.5 }}
                  dragMomentum={false}
                  onDragStart={() => {
                    triggerHaptic('light');
                  }}
                  className="bg-surface-2 relative z-10 p-3.5 flex items-center gap-3 sm:gap-4 hover:bg-surface/30 transition-colors cursor-pointer select-none"
                  onClick={onEdit ? () => onEdit(tx) : undefined}
                >
                  <div 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ 
                       backgroundColor: tx.type === 'transfer' 
                        ? 'rgba(59, 130, 246, 0.12)' 
                        : !tx.categoryId
                          ? 'rgba(245, 158, 11, 0.12)'
                          : `${tx.categoryId?.color || '#888'}12`,
                       border: tx.type === 'transfer'
                        ? '1px solid rgba(59, 130, 246, 0.20)'
                        : !tx.categoryId
                          ? '1px solid rgba(245, 158, 11, 0.25)'
                          : `1px solid ${tx.categoryId?.color || '#888'}25`
                    }}
                  >
                    {tx.type === 'transfer' ? '🔄' : !tx.categoryId ? '❓' : (tx.categoryId?.icon || '💸')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p 
                      className={`font-semibold text-xs sm:text-sm truncate whitespace-nowrap leading-snug ${
                        !tx.categoryId && tx.type !== 'transfer' ? 'text-amber-500' : 'text-primary'
                      }`}
                      title={
                        tx.type === 'transfer' 
                          ? (tx.description || tx.note || 'Virement') 
                          : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie')
                      }
                    >
                      {tx.type === 'transfer' 
                        ? (tx.description || tx.note || 'Virement') 
                        : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie ⚠️')
                      }
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
                      const isHighAlert = isDebit && tx.amount >= alertThreshold;
                      const colorClass = isDebit ? (isHighAlert ? 'text-danger' : 'text-secondary') : 'text-accent';
                      
                      return (
                        <p className={`font-premium-numbers font-bold text-xs sm:text-sm ${colorClass}`}>
                          {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                        </p>
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
