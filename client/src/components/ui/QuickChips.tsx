import React from 'react';
import { triggerHaptic } from '../../utils/hapticHelper';

export interface TemplateItem {
  id: string;
  name: string;
  type: string;
  amount: string;
  note?: string;
  icon?: string;
  categoryId?: string;
  accountId?: string;
}

interface QuickChipsProps {
  templates?: TemplateItem[];
  onSelectTemplate: (template: TemplateItem) => void;
  onAddAmount: (delta: number) => void;
  className?: string;
}

const QUICK_AMOUNTS = [5, 10, 20, 50];

export const QuickChips: React.FC<QuickChipsProps> = ({
  templates = [],
  onSelectTemplate,
  onAddAmount,
  className = '',
}) => {
  const handleQuickAdd = (amt: number) => {
    triggerHaptic('light');
    onAddAmount(amt);
  };

  const handleTemplateClick = (tmpl: TemplateItem) => {
    triggerHaptic('medium');
    onSelectTemplate(tmpl);
  };

  return (
    <div className={`w-full overflow-x-auto no-scrollbar py-1 select-none ${className}`}>
      <div className="flex items-center gap-2 px-1">
        {/* Quick Amount Adder Chips */}
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={`amt-${amt}`}
            type="button"
            onClick={() => handleQuickAdd(amt)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-2/80 hover:bg-surface-2 text-primary border border-border/40 hover:border-amber-500/40 active-spring-sm transition-all"
          >
            +{amt} €
          </button>
        ))}

        {/* Separator line */}
        {templates.length > 0 && (
          <div className="w-[1px] h-6 bg-border/40 shrink-0 mx-1" />
        )}

        {/* 1-Tap Template Chips */}
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleTemplateClick(tmpl)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-copper-dim text-copper border border-copper/20 hover:bg-copper/20 active-spring-sm transition-all flex items-center gap-1.5"
          >
            {tmpl.icon && <span>{tmpl.icon}</span>}
            <span>{tmpl.name}</span>
            <span className="opacity-75 font-mono">({tmpl.amount} €)</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickChips;
