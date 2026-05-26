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
              <div key={tx._id} className="bg-surface-2 p-4 rounded-2xl flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                  style={{ 
                    backgroundColor: tx.type === 'transfer' 
                      ? '#3b82f620' 
                      : `${tx.categoryId?.color || '#888'}20` 
                  }}
                >
                  {tx.type === 'transfer' ? '🔄' : (tx.categoryId?.icon || '💸')}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-primary font-semibold text-sm break-words whitespace-normal leading-snug">
                    {tx.type === 'transfer' 
                      ? (tx.description || tx.note || 'Virement') 
                      : (tx.description || tx.note || tx.categoryId?.name || 'Sans catégorie')
                    }
                  </p>
                  
                  {tx.type === 'transfer' ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                        {tx.accountId?.name || 'Inconnu'}
                      </span>
                      <span className="text-muted text-[10px]">➔</span>
                      <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.toAccountId?.color || '#888' }} />
                        {tx.toAccountId?.name || 'Inconnu'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {tx.categoryId?.name && (
                        <span className="text-[11px] text-secondary font-medium">
                          {tx.categoryId.name}
                        </span>
                      )}
                      {tx.categoryId?.name && <span className="text-muted text-[10px]">•</span>}
                      <span className="inline-flex items-center gap-1 bg-surface border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-medium text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.accountId?.color || '#888' }} />
                        {tx.accountId?.name || 'Inconnu'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <p className={`font-mono font-bold ${tx.type === 'expense' ? 'text-primary' : 'text-accent'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {onEdit && (
                    <button 
                      onClick={() => onEdit(tx)}
                      className="text-secondary hover:text-amber-400 hover:bg-amber-400/10 p-2 rounded-xl transition-colors"
                      title="Modifier la transaction"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(tx)}
                    className="text-danger hover:bg-danger/10 p-2 rounded-xl transition-colors"
                    title="Supprimer la transaction"
                  >
                    <Trash2 size={16} />
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
