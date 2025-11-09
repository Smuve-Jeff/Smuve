import React, { useState, useCallback, useRef, useEffect } from 'react';

interface MixerKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (newValue: number) => void;
  unit?: string;
  color?: string;
}

const MixerKnob: React.FC<MixerKnobProps> = ({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  step = 1, 
  onChange, 
  unit = '',
  color = 'indigo', // default color
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const knobRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    e.preventDefault();
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaY = startY.current - e.clientY; // Dragging up increases value
      
      const range = max - min;
      const sensitivity = range / 150;

      let newValue = startValue.current + (deltaY * sensitivity); 
      newValue = Math.max(min, Math.min(max, newValue));
      
      newValue = Math.round(newValue / step) * step;
      onChange(parseFloat(newValue.toFixed(2))); 
    }
  }, [isDragging, min, max, step, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let newValue = value;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        newValue += step;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        newValue -= step;
    } else {
        return;
    }
    e.preventDefault();
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(parseFloat(newValue.toFixed(2)));
  }, [value, step, min, max, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  const glowColor = `var(--${color}-500)`;
  const isEqKnob = ['Low', 'Mid', 'High'].includes(label);

  const displayValue = () => {
    if (step < 1 || unit === 'dB' || value % 1 !== 0) {
        return value.toFixed(1);
    }
    return value.toFixed(0);
  };

  return (
    <div className="flex flex-col items-center gap-1 w-20">
      {isEqKnob && (
        <div className="w-2 h-8 bg-gray-700/50 rounded-full relative overflow-hidden mb-1 border border-gray-600/50">
          <div className="absolute w-full h-px top-1/2 -mt-px bg-gray-600"></div>
          <div
            className="absolute w-full"
            style={{
              backgroundColor: glowColor,
              boxShadow: `0 0 4px ${glowColor}`,
              height: `${(Math.abs(value) / max) * 50}%`,
              ...(value >= 0 ? { bottom: '50%' } : { top: '50%' }),
              transition: 'height 0.1s ease-out',
            }}
          ></div>
        </div>
      )}

      <div 
        ref={knobRef}
        className="w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
        style={{ boxShadow: `inset 0 0 5px rgba(0,0,0,0.5), 0 0 3px rgba(0,0,0,0.3)`, borderColor: `var(--${color}-700)` }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${label} control`}
      >
        <div 
          className="w-1.5 h-4 absolute top-1 rounded-full" 
          style={{ 
            transform: `translateY(2px) rotate(${rotation}deg)`,
            backgroundColor: glowColor,
            boxShadow: `0 0 5px ${glowColor}, 0 0 10px ${glowColor}aa`,
            transition: 'transform 0.05s ease-out'
          }}
        ></div>
        <div className="w-4 h-4 rounded-full bg-gray-700 absolute inset-0 m-auto"
            style={{ boxShadow: `inset 0 0 3px rgba(0,0,0,0.7)` }}></div>
      </div>
      <span className="text-xs font-bold text-gray-400 tracking-wider mt-1">{label}</span>
      <span className="text-xs text-gray-300 font-mono" style={{ color: glowColor, textShadow: `0 0 3px ${glowColor}60` }}>{displayValue()}{unit}</span>
    </div>
  );
};

export default React.memo(MixerKnob);