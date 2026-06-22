import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/VerifiedBadge';

const PlanButton = ({ plan, className = '' }) => {
  const planConfig = {
    free: {
      name: 'Plano Gratuito',
      icon: Star,
      colors: 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700'
    },
    pro: {
      name: 'Plano Pro',
      icon: Star,
      colors: 'border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700'
    },
    premium: {
      name: 'Plano Premium',
      icon: Crown,
      colors: 'border-amber-200 hover:border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
    }
  };

  const config = planConfig[plan] || planConfig.free;
  const IconComponent = config.icon;

  return (
    <Link to="/subscription-plans">
      <Button 
        variant="outline" 
        className={`flex items-center gap-3 border-2 transition-all duration-200 ${config.colors} ${className}`}
      >
        <IconComponent className="w-4 h-4" />
        <span className="font-medium">{config.name}</span>
      </Button>
    </Link>
  );
};

export default PlanButton;
