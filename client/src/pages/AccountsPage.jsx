import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import { useAccounts } from '../hooks/useAccounts';
import { AuthContext } from '../context/AuthContext';
import { Plus, Wallet, CreditCard, EyeOff, AlertCircle } from 'lucide-react';

const AccountsPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { accounts, totalBalance, loading, error, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const formatCurrency = (amount, currencyCode = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currencyCode }).format(amount);
  };

  const actions = (
    <button 
      onClick={handleOpenAdd}
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
      title="Ajouter un compte"
    >
      <Plus size={16} />
    </button>
  );

  return (
    <>
      <HeaderTitle>Comptes</HeaderTitle>
      <HeaderBackButton to="/" />
      <HeaderActions>{actions}</HeaderActions>
      <div className="space-y-6 mb-6">
        
        {/* Total Balance Card */}
        <div className="bg-surface-2 p-6 rounded-[28px] border border-border/40 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <p className="text-xs text-secondary font-bold tracking-wide uppercase">Solde Total Disponible</p>
          <h2 className="text-3xl font-extrabold text-accent mt-2 tracking-tight">
            {formatCurrency(totalBalance, user?.currency?.code)}
          </h2>
          <p className="text-[10px] text-muted mt-1 leading-normal">
            Exclut les comptes de type carte de crédit et investissements du solde global.
          </p>
        </div>

        {/* Accounts List Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1">
            Mes Comptes Bancaires
          </h3>

          {loading ? (
            <div className="space-y-3">
              <div className="h-[76px] bg-surface-2 rounded-2xl animate-pulse" />
              <div className="h-[76px] bg-surface-2 rounded-2xl animate-pulse" />
              <div className="h-[76px] bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger text-xs font-bold">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-surface-2/40 rounded-[24px] border border-border/20 shadow-inner">
              <div className="w-12 h-12 rounded-full bg-surface border border-border/40 flex items-center justify-center text-accent mb-4 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 rounded-full blur-md" />
                <Wallet size={24} className="text-accent relative z-10" />
              </div>
              <p className="text-primary text-xs font-bold mb-1">Aucun compte bancaire</p>
              <p className="text-muted text-[10px] max-w-[200px] mb-3">Ajoutez un compte pour suivre vos revenus et dépenses.</p>
              <button 
                onClick={handleOpenAdd}
                className="py-2.5 px-4 bg-accent text-white font-bold text-xs rounded-xl shadow-md shadow-accent/20 active:scale-95 transition-all"
              >
                Créer un compte
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(acc => {
                return (
                  <div 
                    key={acc._id}
                    onClick={() => acc.type === 'credit' ? navigate(`/accounts/${acc._id}/credit`) : handleOpenEdit(acc)}
                    className="bg-surface-2 hover:bg-surface-2/80 border border-border/40 p-4 rounded-[24px] flex items-center justify-between transition-all cursor-pointer shadow-sm relative group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Icon with customizable background */}
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-sm shrink-0 border border-border/10"
                        style={{ backgroundColor: `${acc.color || '#4ade80'}15`, color: acc.color }}
                      >
                        {acc.type === 'credit' ? <CreditCard size={20} /> : <Wallet size={20} />}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-primary truncate leading-tight">{acc.name}</p>
                          {acc.includeInTotal === false && (
                            <span 
                              className="text-[8px] font-extrabold bg-muted/20 text-muted px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                              title="Exclu du solde global"
                            >
                              <EyeOff size={10} /> Masqué
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted font-medium mt-1 uppercase tracking-wider">
                          Type : {
                            acc.type === 'checking' ? 'Courant' :
                            acc.type === 'savings' ? 'Épargne' :
                            acc.type === 'credit' ? 'Crédit' :
                            acc.type === 'cash' ? 'Espèces' :
                            acc.type === 'investment' ? 'Investissement' : acc.type
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-sm ${acc.balance >= 0 ? 'text-accent' : 'text-danger'}`}>
                        {formatCurrency(acc.balance, acc.currency)}
                      </span>
                      {acc.type === 'credit' && acc.creditLimit && (
                        <p className="text-[9px] text-muted mt-0.5 font-medium">
                          Limite : {formatCurrency(acc.creditLimit, acc.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button 
          onClick={handleOpenAdd}
          className="w-full text-xs font-bold text-accent py-3.5 border border-border/40 hover:bg-accent/5 active:scale-[0.99] rounded-[16px] transition-all flex items-center justify-center gap-1.5 bg-surface-2"
        >
          + Ajouter un compte
        </button>

      </div>

      <AccountFormSheet 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingAccount}
        onSave={async (data) => {
          if (editingAccount) {
            await updateAccount(editingAccount._id, data);
          } else {
            await addAccount(data);
          }
          setIsFormOpen(false);
        }}
        onDelete={async (id) => {
          await deleteAccount(id);
          setIsFormOpen(false);
        }}
      />
    </>
  );
};

export default AccountsPage;
