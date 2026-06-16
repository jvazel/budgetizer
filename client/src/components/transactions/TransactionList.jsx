import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerHaptic } from '../../utils/hapticHelper';

const TransactionList = ({ transactions, onDelete, onEdit, currentAccountId }) => {
  const [visibleCount, setVisibleCount] = React.useState(30);
  const observerTarget = React.useRef(null);

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
    return slicedTransactions.reduce((acc, curr) => {
      const date = new Date(curr.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(curr);
      return acc;
    }, {});
  }, [slicedTransactions]);

  return (
    <div>
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="mb-6">
          <div className="sticky top-[56px] bg-base/95 backdrop-blur-sm z-10 py-2 mb-2 flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-secondary capitalize">{date}</h3>
          </div>
          
          <div className="bg-surface-2 rounded-[24px] border border-border/40 overflow-hidden divide-y divide-border/30 shadow-sm">
            {txs.map(tx => (
              <div 
                key={tx._id} 
                className="relative overflow-hidden bg-danger-dim/20 first:rounded-t-[24px] last:rounded-b-[24px]"
              >
                {/* Back Layer: Swipe Delete Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('medium');
                    if (onDelete) onDelete(tx);
                  }}
                  className="absolute right-0 top-0 bottom-0 w-20 bg-danger text-white flex flex-col items-center justify-center transition-colors hover:bg-danger/90 active:bg-danger/80 select-none z-0"
                >
                  <Trash2 size={16} />
                  <span className="text-[8px] font-bold mt-1">Supprimer</span>
                </button>

                {/* Front Layer: Draggable Content */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -80, right: 0 }}
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
                        : `${tx.categoryId?.color || '#888'}15` 
                    }}
                  >
                    {tx.type === 'transfer' ? '🔄' : (tx.categoryId?.icon || '💸')}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p 
                      className="text-primary font-semibold text-xs sm:text-sm truncate whitespace-nowrap leading-snug" 
                      title={
                        tx.type === 'transfer' 
                          ? (tx.description || tx.note || 'Virement') 
                          : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie')
                      }
                    >
                      {tx.type === 'transfer' 
                        ? (tx.description || tx.note || 'Virement') 
                        : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie')
                      }
                    </p>
                    
                    {tx.type === 'transfer' ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-secondary">
                        <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>
                        <span className="text-muted text-[10px] shrink-0">➔</span>
                        <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary truncate max-w-[110px] xs:max-w-[160px]">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.toAccountId?.color || '#888' }} />
                          <span className="truncate">{tx.toAccountId?.name || 'Inconnu'}</span>
                        </span>
                        
                        {tx.tags && tx.tags.length > 0 && tx.tags.map(tag => (
                          <span
                            key={tag._id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shrink-0 border"
                            style={{
                              backgroundColor: `${tag.color}18`,
                              color: tag.color,
                              borderColor: `${tag.color}35`
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {tx.categoryId?.name && (
                          <span className="text-[10px] text-secondary/80 font-medium truncate">
                            {tx.categoryId.name}
                          </span>
                        )}
                        {tx.categoryId?.name && <span className="text-muted text-[8px]">•</span>}
                        <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary truncate w-fit max-w-full">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                          <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                        </span>

                        {tx.tags && tx.tags.length > 0 && tx.tags.map(tag => (
                          <span
                            key={tag._id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shrink-0 border"
                            style={{
                              backgroundColor: `${tag.color}18`,
                              color: tag.color,
                              borderColor: `${tag.color}35`
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0 ml-auto pl-1">
                    <p className={`font-premium-numbers font-bold text-xs sm:text-sm ${
                      tx.type === 'expense' || (tx.type === 'transfer' && !(currentAccountId && (tx.toAccountId?._id === currentAccountId || tx.toAccountId === currentAccountId)))
                        ? 'text-primary' 
                        : 'text-accent'
                    }`}>
                      {tx.type === 'expense' || (tx.type === 'transfer' && !(currentAccountId && (tx.toAccountId?._id === currentAccountId || tx.toAccountId === currentAccountId)))
                        ? '-' 
                        : '+'
                      }{formatCurrency(tx.amount)}
                    </p>
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
