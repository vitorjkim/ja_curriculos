import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter } from 'lucide-react';
import { Button } from './button';

export function Drawer({ 
  isOpen, 
  onClose, 
  children, 
  title = null,
  className = '',
}) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed left-0 top-0 h-screen w-80 bg-white shadow-2xl z-50 overflow-y-auto ${className}`}
          >
            {/* Header */}
            {title && (
              <div className="sticky top-0 bg-blue-600 p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold text-white">{title}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 hover:bg-blue-700 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
            {/* Content */}
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
