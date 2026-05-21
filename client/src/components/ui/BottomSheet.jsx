import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BottomSheet = ({ isOpen, onClose, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-surface-2 w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Drag handle */}
              <div 
                className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                onClick={onClose} // Simple close on handle click for now, full drag logic can be added later
              >
                <div className="w-12 h-1.5 bg-border rounded-full" />
              </div>
              
              {/* Content */}
              <div className="px-6 pb-6 overflow-y-auto no-scrollbar">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
