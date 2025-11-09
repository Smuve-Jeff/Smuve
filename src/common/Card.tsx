import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive';
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ children, className = '', variant = 'default', style }) => {
  const baseClasses = 'bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg p-6 transition-all duration-300';
  
  const variantClasses = {
    default: '',
    interactive: 'hover:border-green-500/80 hover:shadow-green-500/20'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={style}>
      {children}
    </div>
  );
};

export default React.memo(Card);