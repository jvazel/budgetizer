import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Splash = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0d0d0d] flex flex-col items-center justify-center z-50"
        >
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center overflow-hidden shadow-[0_0_45px_rgba(74,222,128,0.25)] mb-6 bg-surface border border-border/30">
              <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-mono text-3xl text-white font-medium tracking-tight mb-2">Budgetizer</h1>
            <p className="text-[#888888] text-sm">Vos finances, simplement.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
