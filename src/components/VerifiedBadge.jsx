import React from 'react';
import { Shield, Crown } from 'lucide-react';

const VerifiedBadge = ({ plan, size = 'sm', className = '' }) => {
  if (!plan || plan === 'free') return null;
  
  const isGold = plan === 'premium';
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';
  const paddingSize = size === 'sm' ? 'px-2 py-1' : size === 'md' ? 'px-3 py-1.5' : 'px-4 py-2';
  
  return (
    <span className={`inline-flex items-center ${paddingSize} rounded-full font-semibold transition-all duration-200 ${
      isGold 
        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 border border-amber-300/50' 
        : 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-300/50'
    } ${textSize} ${className}`}>
      {isGold ? (
        <Crown className={`${iconSize} mr-1.5 drop-shadow-sm`} />
      ) : (
        <Shield className={`${iconSize} mr-1.5 drop-shadow-sm`} />
      )}
      <span className="drop-shadow-sm">Verificado</span>
    </span>
  );
};

export default VerifiedBadge;
