import React from 'react';

interface TshirtMockupProps {
  designImage: string | null;
  garmentColor: 'white' | 'black' | 'gray' | 'navy' | 'red';
}

const colorHex: Record<TshirtMockupProps['garmentColor'], string> = {
  white: '#e5e7eb',
  black: '#1f2937',
  gray: '#6b7280',
  navy: '#1e3a8a',
  red: '#dc2626',
};

const TshirtMockup: React.FC<TshirtMockupProps> = React.memo(({ designImage, garmentColor }) => {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] flex items-center justify-center overflow-hidden">
      {/* Simple T-Shirt Shape (using a div for simplicity) */}
      <div 
        className="w-full h-full rounded-lg shadow-lg relative" 
        style={{ backgroundColor: colorHex[garmentColor] }}
      >
        {/* Sleeve/Shoulder shapes (can be more complex with SVG if needed) */}
        <div className="absolute top-0 left-0 w-1/3 h-1/4 bg-current rounded-br-full transform -translate-x-1/4"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/4 bg-current rounded-bl-full transform translate-x-1/4"></div>
        {/* Collar */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1/4 h-8 bg-black/10 rounded-full border border-black/20"></div>

        {designImage && (
          <img 
            src={designImage} 
            alt="Merch Design" 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-[50%] max-h-[50%] object-contain"
            style={{ filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' }} // Subtle shadow for design
          />
        )}
      </div>
      {!designImage && (
          <p className="absolute text-sm text-gray-500/70 p-4 text-center">Design preview appears here.</p>
      )}
    </div>
  );
});

export default TshirtMockup;