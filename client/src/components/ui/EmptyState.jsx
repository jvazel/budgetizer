import React from 'react';

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 bg-surface-2/40 rounded-[24px] border border-border/40 shadow-inner">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface border border-border/40 flex items-center justify-center text-secondary mb-4 shadow-sm">
          <Icon size={22} className="text-secondary" />
        </div>
      )}
      <h4 className="text-xs font-bold text-primary mb-1">{title}</h4>
      <p className="text-muted text-[10px] max-w-[200px] leading-relaxed mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 text-[9px] font-extrabold bg-accent/10 border border-accent/20 text-accent rounded-xl hover:bg-accent/20 active:scale-95 transition-all uppercase tracking-wider active-spring-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
