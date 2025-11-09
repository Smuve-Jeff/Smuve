import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon, ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500',
    secondary: 'bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-indigo-400 border border-gray-600/50',
  };

  const finalClassName = `${baseClasses} ${variantClasses[variant]} ${props.className || ''}`;

  return (
    <button {...props} className={finalClassName}>
      {icon}
      {children}
    </button>
  );
};

export default React.memo(Button);