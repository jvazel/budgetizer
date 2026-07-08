import React, { useState } from 'react';
import { HeaderTitle, HeaderBackButton } from '../components/layout/AppShell';
import { useShares } from '../hooks/useShares';
import { useAccounts } from '../hooks/useAccounts';
import { useBudgets } from '../hooks/useBudgets';
import { Plus, Users, Shield, ShieldAlert, Trash2, Eye, Edit2, AlertCircle, Sparkles, Send, ArrowDownLeft } from 'lucide-react';
import BottomSheet from '../components/ui/BottomSheet';
import toast from 'react-hot-toast';

const SharingPage = () => {
  const { shares, loading, error, createShare, updateShare, deleteShare } = useShares();
  const { accounts } = useAccounts();
  const { budgets } = useBudgets({ weekStart: '', month: '', year: '' });

  const [activeTab, setActiveTab] = useState('sent'); // 'sent' | 'received'
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  // Form State
  const [resourceType, setResourceType] = useState('account');
  const [resourceId, setResourceId] = useState('');
  const [shareeEmail, setShareeEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [submitting, setSubmitting] = useState(false);

  // Filter only owned resources to be shared
  const ownAccounts = accounts.filter(acc => acc.permission === 'owner' || !acc.isShared);
  const ownBudgets = budgets.filter(b => b.permission === 'owner' || !b.isShared);

  const handleOpenShareSheet = () => {
    setIsShareSheetOpen(true);
    // Pre-select first available resource
    if (resourceType === 'account' && ownAccounts.length > 0) {
      setResourceId(ownAccounts[0]._id);
    } else if (resourceType === 'budget' && ownBudgets.length > 0) {
      setResourceId(ownBudgets[0]._id);
    }
  };

  const handleResourceTypeChange = (type) => {
    setResourceType(type);
    if (type === 'account' && ownAccounts.length > 0) {
      setResourceId(ownAccounts[0]._id);
    } else if (type === 'budget' && ownBudgets.length > 0) {
      setResourceId(ownBudgets[0]._id);
    } else {
      setResourceId('');
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    if (!resourceId) {
      toast.error('Veuillez sélectionner un compte ou un budget.');
      return;
    }
    if (!shareeEmail) {
      toast.error('Veuillez renseigner l\'e-mail du destinataire.');
      return;
    }

    setSubmitting(true);
    try {
      await createShare({
        resourceType,
        resourceId,
        shareeEmail,
        permission
      });
      toast.success('Ressource partagée avec succès !');
      setIsShareSheetOpen(false);
      setShareeEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création du partage.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePermission = async (share) => {
    const newPermission = share.permission === 'read' ? 'write' : 'read';
    try {
      await updateShare(share._id, newPermission);
      toast.success('Permission mise à jour avec succès.');
    } catch (err) {
      toast.error('Impossible de modifier les permissions.');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (window.confirm('Es-tu sûr de vouloir révoquer ce partage ?')) {
      try {
        await deleteShare(shareId);
        toast.success('Partage révoqué.');
      } catch (err) {
        toast.error('Impossible de supprimer le partage.');
      }
    }
  };

  return (
    <>
      <HeaderTitle>Partage & Collaboration</HeaderTitle>
      <HeaderBackButton to="/settings" />

      <div className="space-y-6 mb-6">
        
        {/* Intro Header */}
        <div className="banky-card p-5 relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
            <Users size={22} />
          </div>
          <h3 className="text-sm font-bold text-primary">Gère ton budget à plusieurs</h3>
          <p className="text-[10px] text-muted max-w-[280px] mt-1.5 leading-relaxed">
            Partage des comptes bancaires ou des enveloppes de budgets avec ton conjoint ou ta famille en lecture ou en écriture.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-2 p-1 rounded-xl border border-border/40">
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sent'
                ? 'bg-surface text-accent shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            <Send size={12} /> Partagés par moi
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'received'
                ? 'bg-surface text-accent shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            <ArrowDownLeft size={13} /> Partagés avec moi
          </button>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-[74px] bg-surface-2 rounded-2xl animate-pulse" />
            <div className="h-[74px] bg-surface-2 rounded-2xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-center gap-3 text-danger text-xs font-bold">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'sent' ? (
              shares.sent.length === 0 ? (
                <div className="text-center py-10 px-4 bg-surface-2/40 rounded-2xl border border-border/20">
                  <p className="text-xs text-muted">Tu n'as partagé aucun compte ni aucun budget pour le moment.</p>
                </div>
              ) : (
                shares.sent.map(share => (
                  <div key={share._id} className="banky-card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-copper-dim text-copper">
                          {share.resourceType === 'account' ? 'Compte' : 'Budget'}
                        </span>
                        <p className="text-xs font-bold text-primary truncate">
                          {share.resourceId?.name || 'Ressource supprimée'}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted mt-1">
                        Partagé avec : <span className="font-semibold text-primary">{share.sharedWithId?.name}</span> ({share.sharedWithId?.email})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTogglePermission(share)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                          share.permission === 'write'
                            ? 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
                            : 'bg-muted/15 border-border/60 text-muted hover:bg-muted/25'
                        }`}
                        title="Basculer les permissions"
                      >
                        {share.permission === 'write' ? (
                          <>
                            <Shield size={10} /> Écriture
                          </>
                        ) : (
                          <>
                            <Eye size={10} /> Lecture
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleRevokeShare(share._id)}
                        className="p-2 text-muted hover:text-danger bg-surface-2 rounded-lg border border-border/40 hover:bg-danger/10 transition-colors"
                        title="Révoquer l'accès"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              shares.received.length === 0 ? (
                <div className="text-center py-10 px-4 bg-surface-2/40 rounded-2xl border border-border/20">
                  <p className="text-xs text-muted">Aucune ressource n'a été partagée avec toi pour le moment.</p>
                </div>
              ) : (
                shares.received.map(share => (
                  <div key={share._id} className="banky-card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-copper-dim text-copper">
                          {share.resourceType === 'account' ? 'Compte' : 'Budget'}
                        </span>
                        <p className="text-xs font-bold text-primary truncate">
                          {share.resourceId?.name || 'Ressource supprimée'}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted mt-1">
                        Propriétaire : <span className="font-semibold text-primary">{share.ownerId?.name}</span> ({share.ownerId?.email})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-surface-2 border border-border/40 text-muted flex items-center gap-1">
                        {share.permission === 'write' ? <Shield size={10} className="text-accent" /> : <Eye size={10} />}
                        {share.permission === 'write' ? 'Écriture' : 'Lecture seule'}
                      </span>

                      <button
                        onClick={() => handleRevokeShare(share._id)}
                        className="p-2 text-muted hover:text-danger bg-surface-2 rounded-lg border border-border/40 hover:bg-danger/10 transition-colors"
                        title="Quitter le partage"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {/* Floating Action Button */}
        {activeTab === 'sent' && (
          <button
            onClick={handleOpenShareSheet}
            className="w-full text-xs font-bold text-accent py-3.5 border border-border/40 hover:bg-accent/5 rounded-[16px] transition-all flex items-center justify-center gap-1.5 bg-surface-2 active:scale-[0.99]"
          >
            <Plus size={15} /> Partager une ressource
          </button>
        )}

      </div>

      {/* Share Resource Bottom Sheet */}
      <BottomSheet isOpen={isShareSheetOpen} onClose={() => setIsShareSheetOpen(false)}>
        <form onSubmit={handleCreateShare} className="space-y-5 pt-2">
          
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Sparkles size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-primary">Partager un compte ou budget</h3>
          </div>

          {/* Resource Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted">Type de ressource</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleResourceTypeChange('account')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  resourceType === 'account'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface border-border/50 text-muted hover:text-primary'
                }`}
              >
                Compte Bancaire
              </button>
              <button
                type="button"
                onClick={() => handleResourceTypeChange('budget')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  resourceType === 'budget'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface border-border/50 text-muted hover:text-primary'
                }`}
              >
                Budget
              </button>
            </div>
          </div>

          {/* Resource Dropdown Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted">Sélectionner la ressource</label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-xs text-primary focus:border-accent outline-none"
            >
              {resourceType === 'account' ? (
                ownAccounts.length === 0 ? (
                  <option value="">Aucun compte disponible</option>
                ) : (
                  ownAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>{acc.name} ({acc.type})</option>
                  ))
                )
              ) : (
                ownBudgets.length === 0 ? (
                  <option value="">Aucun budget disponible</option>
                ) : (
                  ownBudgets.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.categoryId?.name})</option>
                  ))
                )
              )}
            </select>
          </div>

          {/* Sharee Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted">E-mail du destinataire</label>
            <input
              type="email"
              value={shareeEmail}
              onChange={(e) => setShareeEmail(e.target.value)}
              placeholder="partenaire@exemple.com"
              required
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-xs text-primary focus:border-accent outline-none"
            />
            <p className="text-[9px] text-muted leading-tight">
              Le destinataire doit déjà posséder un compte utilisateur sur Budgetizer.
            </p>
          </div>

          {/* Permission selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-muted">Permission</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPermission('read')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  permission === 'read'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface border-border/50 text-muted hover:text-primary'
                }`}
              >
                <Eye size={14} />
                <span>Lecture seule</span>
              </button>
              <button
                type="button"
                onClick={() => setPermission('write')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                  permission === 'write'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface border-border/50 text-muted hover:text-primary'
                }`}
              >
                <Shield size={14} />
                <span>Lecture & Écriture</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || (resourceType === 'account' ? ownAccounts.length === 0 : ownBudgets.length === 0)}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:hover:bg-accent text-white font-bold py-3.5 rounded-xl text-xs active:scale-[0.98] transition-all shadow-md shadow-accent/15"
          >
            {submitting ? 'Partage en cours...' : 'Partager'}
          </button>

        </form>
      </BottomSheet>
    </>
  );
};

export default SharingPage;
