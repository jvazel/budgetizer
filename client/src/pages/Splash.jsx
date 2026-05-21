import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
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
            <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.3)] mb-6">
              <Wallet size={40} className="text-white" />
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
