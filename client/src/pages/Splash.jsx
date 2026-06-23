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
          className="fixed inset-0 bg-base flex flex-col items-center justify-center z-50 overflow-hidden"
        >
          {/* Ambient Background Glow Orbs */}
          <div className="bg-glow-orb glow-orb-amber w-[300px] h-[300px] -top-20 -left-20" />
          <div className="bg-glow-orb glow-orb-indigo w-[400px] h-[400px] top-[40%] -right-40" />

          <div className="flex flex-col items-center relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", damping: 15 }}
              className="w-20 h-20 rounded-[24px] flex items-center justify-center overflow-hidden shadow-[0_0_45px_rgba(217,119,6,0.3)] mb-6 bg-surface border border-border/30"
            >
              <img src="/pwa-192x192.png" alt="Logo Budgetizer" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="font-condensed-tight text-3xl text-primary mb-2">Budgetizer</h1>
            <p className="text-secondary text-sm">Vos finances, simplement.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Splash;
