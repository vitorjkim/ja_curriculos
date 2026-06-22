import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ 
  size = 'md', 
  showText = true, 
  animated = true,
  className = '',
  textColor = 'text-gray-900'
}) => {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', container: 'space-x-2' },
    md: { icon: 'w-8 h-8', text: 'text-xl', container: 'space-x-2' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', container: 'space-x-3' },
    xl: { icon: 'w-16 h-16', text: 'text-4xl', container: 'space-x-4' }
  };

  const currentSize = sizes[size];

  const LogoIcon = () => (
    <div className={`${currentSize.icon} relative`}>
      {/* Fundo do ícone */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg"></div>
      
      {/* Documento base */}
      <div className="absolute inset-1 bg-white rounded-lg flex flex-col justify-center items-center">
        {/* Linhas do documento */}
        <div className="w-3/4 h-0.5 bg-gray-300 mb-0.5 rounded"></div>
        <div className="w-1/2 h-0.5 bg-gray-300 mb-0.5 rounded"></div>
        <div className="w-3/5 h-0.5 bg-blue-500 rounded"></div>
      </div>
      
      {/* Símbolo de check/sucesso */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg 
          className="w-1.5 h-1.5 text-white" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
    </div>
  );

  const LogoContainer = ({ children }) => {
    if (animated) {
      return (
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`flex items-center ${currentSize.container} ${className}`}
        >
          {children}
        </motion.div>
      );
    }
    
    return (
      <div className={`flex items-center ${currentSize.container} ${className}`}>
        {children}
      </div>
    );
  };

  return (
    <LogoContainer>
      {animated ? (
        <motion.div
          animate={{ 
            rotate: [0, 5, -5, 0] 
          }}
          transition={{
            repeat: Infinity,
            repeatDelay: 3,
            duration: 0.6,
            ease: "easeInOut"
          }}
        >
          <LogoIcon />
        </motion.div>
      ) : (
        <LogoIcon />
      )}
      
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold ${currentSize.text} ${textColor}`}>
            Já
          </span>
          <span className={`font-light ${currentSize.text} ${textColor} -mt-1`}>
            Currículos
          </span>
        </div>
      )}
    </LogoContainer>
  );
};

// Variações específicas para diferentes contextos
export const LogoHorizontal = (props) => (
  <Logo {...props} />
);

export const LogoVertical = ({ size = 'md', animated = true, className = '', textColor = 'text-gray-900' }) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-sm' },
    md: { icon: 'w-12 h-12', text: 'text-base' },
    lg: { icon: 'w-16 h-16', text: 'text-lg' },
    xl: { icon: 'w-20 h-20', text: 'text-xl' }
  };

  const currentSize = sizes[size];

  const IconOnly = () => (
    <div className={`${currentSize.icon} relative`}>
      {/* Fundo do ícone */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg"></div>
      
      {/* Documento base */}
      <div className="absolute inset-1 bg-white rounded-lg flex flex-col justify-center items-center">
        {/* Linhas do documento */}
        <div className="w-3/4 h-0.5 bg-gray-300 mb-0.5 rounded"></div>
        <div className="w-1/2 h-0.5 bg-gray-300 mb-0.5 rounded"></div>
        <div className="w-3/5 h-0.5 bg-blue-500 rounded"></div>
      </div>
      
      {/* Símbolo de check/sucesso */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
        <svg 
          className="w-1.5 h-1.5 text-white" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
            clipRule="evenodd" 
          />
        </svg>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <IconOnly />
      <div className="text-center">
        <div className={`font-bold ${currentSize.text} ${textColor}`}>
          Já Currículos
        </div>
        <div className={`font-light text-xs ${textColor} opacity-75`}>
          Sua carreira, nosso foco
        </div>
      </div>
    </div>
  );
};

export const LogoIcon = ({ size = 'md', animated = true, className = '' }) => (
  <Logo size={size} showText={false} animated={animated} className={className} />
);

export default Logo;
