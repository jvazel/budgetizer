import React from 'react';
import { Trash2, Pencil } from 'lucide-react';

const TransactionList = ({ transactions, onDelete, onEdit }) => {
  if (!transactions || transactions.length === 0) {
    return <div className="text-center text-muted p-8">Aucune transaction trouvée.</div>;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Group by date
  const grouped = transactions.reduce((acc, curr) => {
    const date = new Date(curr.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(curr);
    return acc;
  }, {});

  return (
    <div className="pb-24">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="mb-6">
          <div className="sticky top-[56px] bg-base/95 backdrop-blur-sm z-10 py-2 mb-2 flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-secondary capitalize">{date}</h3>
            {/* Can add daily summary here */}
          </div>
          
          <div className="space-y-3">
            {txs.map(tx => (
              <div key={tx._id} className="bg-surface-2 p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-surface-2/80 transition-colors">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0"
                  style={{ 
                    backgroundColor: tx.type === 'transfer' 
                      ? '#3b82f620' 
                      : `${tx.categoryId?.color || '#888'}20` 
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
                    </div>
                  ) : (
                    <div className="flex flex-col mt-1 gap-1">
                      {tx.categoryId?.name && (
                        <span className="text-[10px] text-secondary/80 font-medium truncate">
                          {tx.categoryId.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary truncate w-fit max-w-full">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                        <span className="truncate">{tx.accountId?.name || 'Inconnu'}</span>
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right shrink-0 ml-auto pl-1">
                  <p className={`font-mono font-bold text-xs sm:text-sm ${tx.type === 'expense' ? 'text-primary' : 'text-accent'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 ml-1 sm:ml-2 border-l border-border/20 pl-1.5 sm:pl-2">
                  {onEdit && (
                    <button 
                      onClick={() => onEdit(tx)}
                      className="text-secondary hover:text-amber-400 hover:bg-amber-400/10 p-1.5 rounded-xl transition-colors"
                      title="Modifier la transaction"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(tx)}
                    className="text-danger hover:bg-danger/10 p-1.5 rounded-xl transition-colors"
                    title="Supprimer la transaction"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
