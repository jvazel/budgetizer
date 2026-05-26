import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmation", 
  confirmText = "Confirmer", 
  cancelText = "Annuler", 
  type = "info", // "info" | "danger" | "warning"
  children 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="text-danger w-6 h-6" />;
      case 'warning':
        return <AlertTriangle className="text-warning w-6 h-6" />;
      default:
        return <AlertTriangle className="text-info w-6 h-6" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-danger text-white hover:bg-danger/90 active:scale-95 shadow-lg shadow-danger/25';
      case 'warning':
        return 'bg-warning text-white hover:bg-warning/90 active:scale-95 shadow-lg shadow-warning/25';
      default:
        return 'bg-accent text-white hover:bg-accent/90 active:scale-95 shadow-lg shadow-accent/25';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-surface-2 border border-border/40 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl z-10 flex flex-col p-6 relative"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl shrink-0 ${type === 'danger' ? 'bg-danger/10' : type === 'warning' ? 'bg-warning/10' : 'bg-accent/10'}`}>
                {getIcon()}
              </div>
              <h3 className="text-sm font-bold text-primary">{title}</h3>
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-border/20 text-muted hover:text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              {children}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-secondary bg-surface hover:bg-border/20 border border-border/40 hover:text-primary transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${getConfirmButtonClass()}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
