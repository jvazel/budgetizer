import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HeaderTitle, HeaderActions, HeaderBackButton } from '../components/layout/AppShell';
import { Settings, Wallet, TrendingUp, HelpCircle, ArrowUpRight, ArrowDownRight, Calendar, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { AuthContext } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AccountFormSheet from '../components/accounts/AccountFormSheet';
import TransactionList from '../components/transactions/TransactionList';
import TransactionFormSheet from '../components/transactions/TransactionFormSheet';
import ConfirmModal from '../components/ui/ConfirmModal';

const AccountDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const { accounts, updateAccount, deleteAccount, loading: accountsLoading } = useAccounts();
  const { transactions, loading: txsLoading, deleteTransaction } = useTransactions({ accountId: id });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isTxEditOpen, setIsTxEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  const account = useMemo(() => accounts.find(acc => acc._id === id), [accounts, id]);

  const formatCurrency = (amount, code = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }).format(amount);
  };

  // Reconstruct the balance history backward in time
  const chartData = useMemo(() => {
    if (!account || !transactions || transactions.length === 0) return [];

    // Sort transactions newest to oldest
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let runningBalance = account.balance;
    const historyPoints = [];

    // Push the current balance point
    historyPoints.push({
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      balance: runningBalance,
      rawDate: new Date()
    });

    // Walk backwards through transactions
    sortedTxs.forEach(tx => {
      const txAmount = tx.amount;
      const isTransfer = tx.type === 'transfer';
      const isFromThisAccount = tx.accountId?._id === id || tx.accountId === id;
      const isToThisAccount = tx.toAccountId?._id === id || tx.toAccountId === id;

      if (isTransfer) {
        if (isFromThisAccount) {
          // Transfer OUT: before the tx, the balance was HIGHER
          runningBalance = runningBalance + txAmount;
        } else if (isToThisAccount) {
          // Transfer IN: before the tx, the balance was LOWER
          runningBalance = runningBalance - txAmount;
        }
      } else {
        if (tx.type === 'expense') {
          // Expense: before the tx, the balance was HIGHER
          runningBalance = runningBalance + txAmount;
        } else if (tx.type === 'income') {
          // Income: before the tx, the balance was LOWER
          runningBalance = runningBalance - txAmount;
        }
      }

      historyPoints.push({
        date: new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        balance: Number(runningBalance.toFixed(2)),
        rawDate: new Date(tx.date)
      });
    });

    // Return chronological order (oldest to newest)
    return historyPoints.reverse();
  }, [account, transactions, id]);

  // Compute key stats for this account
  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0 };
    let income = 0;
    let expense = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      } else if (tx.type === 'transfer') {
        const isFrom = tx.accountId?._id === id || tx.accountId === id;
        const isTo = tx.toAccountId?._id === id || tx.toAccountId === id;
        if (isFrom) expense += tx.amount;
        if (isTo) income += tx.amount;
      }
    });

    return { income, expense };
  }, [transactions, id]);

  if (accountsLoading && !account) {
    return (
      <div className="space-y-6 mt-4 mb-6 animate-pulse">
        <div className="h-40 bg-surface-2 rounded-[28px] border border-border/40" />
        <div className="h-48 bg-surface-2 rounded-[28px] border border-border/40" />
        <div className="h-64 bg-surface-2 rounded-[28px] border border-border/40" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12 space-y-4">
        <HelpCircle size={48} className="text-muted mx-auto" />
        <p className="text-secondary text-sm">Compte introuvable.</p>
        <button 
          onClick={() => navigate('/accounts')}
          className="px-4 py-2 bg-accent text-white font-bold rounded-xl text-xs"
        >
          Retour aux comptes
        </button>
      </div>
    );
  }

  const actions = (
    <button 
      onClick={() => setIsEditOpen(true)}
      className="p-1.5 bg-accent/10 hover:bg-accent/20 rounded-full text-accent transition-colors"
      title="Modifier le compte"
    >
      <Settings size={16} />
    </button>
  );

  const accountTypeLabel = 
    account.type === 'checking' ? 'Courant' :
    account.type === 'savings' ? 'Épargne' :
    account.type === 'cash' ? 'Espèces' :
    account.type === 'investment' ? 'Investissement' : account.type;

  return (
    <>
      <HeaderTitle>{account.name}</HeaderTitle>
      <HeaderBackButton to="/accounts" />
      <HeaderActions>{actions}</HeaderActions>

      <motion.div
        initial={{ x: '30px', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="space-y-6 mb-6 mt-2"
      >
        {/* Account Balance Widget */}
        <div 
          className="rounded-[28px] border p-6 flex flex-col justify-between relative overflow-hidden shadow-md"
          style={{
            background: `linear-gradient(135deg, ${account.color || '#10b981'}15 0%, ${account.color || '#10b981'}03 100%), var(--bg-surface-2)`,
            borderColor: `${account.color || '#10b981'}35`,
          }}
        >
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="inline-block text-[10px] font-bold text-secondary bg-surface border border-border/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {accountTypeLabel}
              </span>
            </div>
            <div 
              className="w-9 h-9 rounded-2xl flex items-center justify-center border"
              style={{
                backgroundColor: `${account.color || '#10b981'}15`,
                borderColor: `${account.color || '#10b981'}30`,
                color: account.color
              }}
            >
              <Wallet size={16} />
            </div>
          </div>

          <div className="mt-6">
            <span className="text-[10px] text-muted font-extrabold uppercase tracking-widest block leading-none">Solde Disponible</span>
            <h2 className={`text-3xl font-extrabold font-mono tracking-tight mt-2 leading-none ${
              account.balance < 0 ? 'text-danger' : 'text-primary'
            }`}>
              {formatCurrency(account.balance, account.currency)}
            </h2>
          </div>
        </div>

        {/* Dynamic Evolution Chart */}
        {chartData.length > 1 && (
          <div className="bg-surface-2 border border-border/40 p-5 rounded-[24px] shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-secondary tracking-wider uppercase flex items-center gap-1.5">
                <TrendingUp size={14} className="text-accent" /> Évolution du Solde
              </h3>
              <p className="text-[10px] text-muted">Reconstitution du solde après chaque transaction récente.</p>
            </div>

            <div className="w-full h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData} 
                  margin={{ left: -20, right: 5, top: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={account.color || '#10b981'} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={account.color || '#10b981'} stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                  />
                  <Tooltip 
                    wrapperStyle={{ pointerEvents: 'none' }}
                    formatter={(val) => [formatCurrency(val, account.currency), 'Solde']}
                    labelFormatter={(lbl) => `Le : ${lbl}`}
                    contentStyle={{
                      borderRadius: '16px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke={account.color || '#10b981'} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Small Inflows/Outflows Widgets Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-2 border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Entrées (Mois)</span>
              <div className="p-1 rounded bg-accent/10 text-accent"><ArrowDownRight size={12} /></div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-accent font-mono">+{formatCurrency(stats.income, account.currency)}</p>
            </div>
          </div>

          <div className="bg-surface-2 border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Sorties (Mois)</span>
              <div className="p-1 rounded bg-danger/10 text-danger"><ArrowUpRight size={12} /></div>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold text-danger font-mono">-{formatCurrency(stats.expense, account.currency)}</p>
            </div>
          </div>
        </div>

        {/* Account Transactions History */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-secondary px-1">Historique des transactions</h3>

          {txsLoading ? (
            <div className="space-y-2">
              <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
              <div className="h-14 bg-surface-2 rounded-2xl animate-pulse" />
            </div>
          ) : (
            <TransactionList 
              transactions={transactions} 
              currentAccountId={id}
              onDelete={(tx) => {
                setTxToDelete(tx);
                setConfirmDeleteOpen(true);
              }}
              onEdit={(tx) => {
                setSelectedTransaction(tx);
                setIsTxEditOpen(true);
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Account Edit Form Drawer */}
      <AccountFormSheet 
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={account}
        onSave={async (data) => {
          await updateAccount(account._id, data);
          setIsEditOpen(false);
        }}
        onDelete={async (accountId) => {
          await deleteAccount(accountId);
          setIsEditOpen(false);
          navigate('/accounts');
        }}
      />

      {/* Transaction Edit Drawer */}
      <TransactionFormSheet 
        isOpen={isTxEditOpen}
        onClose={() => {
          setIsTxEditOpen(false);
          setSelectedTransaction(null);
        }}
        transactionToEdit={selectedTransaction}
      />

      {/* Transaction Delete Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete._id);
          }
          setConfirmDeleteOpen(false);
          setTxToDelete(null);
        }}
        title="Supprimer la transaction ?"
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      >
        {txToDelete && (
          <p className="text-xs text-secondary leading-relaxed">
            Es-tu sûr de vouloir supprimer la transaction <span className="text-primary font-semibold">"{txToDelete.description || txToDelete.note || txToDelete.categoryId?.name}"</span> d'un montant de <span className="text-danger font-mono font-semibold">{formatCurrency(txToDelete.amount, account.currency)}</span> ?
            <br />
            <br />
            Cette action est irréversible et réajustera le solde de ton compte.
          </p>
        )}
      </ConfirmModal>
    </>
  );
};

export default AccountDetailPage;
