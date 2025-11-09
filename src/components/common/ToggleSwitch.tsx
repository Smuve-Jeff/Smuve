import React from 'react';

interface ToggleSwitchProps {
  label: string;
  isOn: boolean;
  onToggle: () => void;
  color?: string; // 'indigo', 'green', 'blue', 'purple', etc.
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, isOn, onToggle, color = 'indigo', disabled = false }) => {
  const activeBgColor = `bg-${color}-600`;
  const inactiveBgColor = `bg-gray-600`;
  const knobActiveTranslate = 'translate-x-6';
  const knobInactiveTranslate = 'translate-x-0';

  return (
    <div className={`flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <span id={`toggle-label-${label.replace(/\s+/g, '-')}`} className="font-medium text-gray-300 text-sm">{label}</span>
      <button 
        onClick={onToggle} 
        disabled={disabled}
        role="switch"
        aria-checked={isOn}
        aria-labelledby={`toggle-label-${label.replace(/\s+/g, '-')}`}
        className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          isOn ? activeBgColor : inactiveBgColor
        } ${isOn ? `focus:ring-${color}-500` : 'focus:ring-gray-500'}`}
        style={{ boxShadow: isOn ? `0 0 8px var(--${color}-500)` : 'none' }}
      >
        <div 
          className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-300 ${
            isOn ? knobActiveTranslate : knobInactiveTranslate
          }`}
        ></div>
      </button>
    </div>
  );
};

export default React.memo(ToggleSwitch);