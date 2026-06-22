import React from 'react';
import { motion } from 'framer-motion';

/**
 * Componente de loading com animação de círculo girando
 * Usado para transições entre páginas
 */
const PageLoader = ({ fullScreen = true }) => {
  return (
    <div 
      className={`${fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0'} 
        flex items-center justify-center bg-white/80 backdrop-blur-sm`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinner animado */}
        <div className="relative">
          {/* Círculo externo */}
          <motion.div
            className="w-12 h-12 rounded-full border-4 border-slate-200"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Círculo girando */}
          <motion.div
            className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-blue-600"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Ponto central pulsante */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="w-2 h-2 bg-blue-600 rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>
        
        {/* Texto de carregamento */}
        <motion.p
          className="text-sm text-slate-500 font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Carregando...
        </motion.p>
      </div>
    </div>
  );
};

export default PageLoader;
