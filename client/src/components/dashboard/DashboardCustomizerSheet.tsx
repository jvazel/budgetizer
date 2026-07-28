import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';

export interface WidgetConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'floor-balance', label: 'Vrai Disponible (Hero)', description: 'Solde réel ajusté des prélèvements imminents', enabled: true, order: 1 },
  { id: 'shortcuts', label: 'Accès Rapides', description: 'Grille de raccourcis vers vos 8 modules clés', enabled: true, order: 2 },
  { id: 'kpi-header', label: 'Cartes KPI XXL', description: 'Vue globale : Revenus, Dépenses, Solde Net & Épargne', enabled: true, order: 3 },
  { id: 'safe-to-spend', label: 'Restant à Dépenser', description: 'Calcul du montant disponible après épargne et charges', enabled: true, order: 4 },
  { id: 'statistics', label: 'Statistiques & Graphiques', description: 'Tendances du mois et de la semaine', enabled: true, order: 5 },
  { id: 'accounts', label: 'Comptes Bancaires', description: 'Carrousel de vos comptes courants et épargne', enabled: true, order: 6 },
  { id: 'ai-assistant', label: 'Assistant IA', description: 'Alertes de budget et taux de catégorisation', enabled: true, order: 7 },
  { id: 'net-worth', label: 'Allocation Patrimoine', description: 'Répartition de vos liquidités et investissements', enabled: true, order: 8 },
];

interface DashboardCustomizerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  configs: WidgetConfig[];
  onChange: (newConfigs: WidgetConfig[]) => void;
  onReset: () => void;
}

export const DashboardCustomizerSheet: React.FC<DashboardCustomizerSheetProps> = ({
  isOpen,
  onClose,
  configs,
  onChange,
  onReset,
}) => {
  const sortedConfigs = [...configs].sort((a, b) => a.order - b.order);

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedConfigs.length) return;

    const updated = [...sortedConfigs];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Recalculate orders
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    onChange(reordered);
  };

  const toggleWidget = (id: string) => {
    const updated = sortedConfigs.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onChange(updated);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Personnaliser le Dashboard">
      <div className="space-y-4 pb-6 select-none">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-secondary">
            Réorganisez et masquez les widgets pour adapter le dashboard à vos besoins mobiles.
          </p>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-secondary hover:text-primary bg-surface-2/60 rounded-lg border border-border/30 transition-all active:scale-95 shrink-0"
          >
            <RotateCcw size={12} />
            <span>Réinitialiser</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {sortedConfigs.map((widget, idx) => (
            <motion.div
              key={widget.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                widget.enabled
                  ? 'bg-surface-1 border-border/60 shadow-sm'
                  : 'bg-surface-2/30 border-border/20 opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary truncate">{widget.label}</span>
                  {!widget.enabled && (
                    <span className="text-[9px] font-bold text-muted bg-surface-2 px-1.5 py-0.5 rounded uppercase">
                      Masqué
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted truncate mt-0.5">{widget.description}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Move Up */}
                <button
                  disabled={idx === 0}
                  onClick={() => moveWidget(idx, 'up')}
                  className="w-8 h-8 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/40 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-primary active:scale-95 transition-all"
                  title="Monter"
                >
                  <ArrowUp size={15} />
                </button>

                {/* Move Down */}
                <button
                  disabled={idx === sortedConfigs.length - 1}
                  onClick={() => moveWidget(idx, 'down')}
                  className="w-8 h-8 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/40 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-primary active:scale-95 transition-all"
                  title="Descendre"
                >
                  <ArrowDown size={15} />
                </button>

                {/* Toggle Visibility */}
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                    widget.enabled
                      ? 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
                      : 'bg-surface-2/40 border-border/30 text-muted hover:text-primary'
                  }`}
                  title={widget.enabled ? 'Masquer' : 'Afficher'}
                >
                  {widget.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-accent text-white font-bold text-xs rounded-xl shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Check size={16} />
          <span>Enregistrer les modifications</span>
        </button>
      </div>
    </BottomSheet>
  );
};

export default DashboardCustomizerSheet;
