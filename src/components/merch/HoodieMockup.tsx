import React from 'react';

interface HoodieMockupProps {
  designImage: string | null;
  garmentColor: 'white' | 'black' | 'gray' | 'navy' | 'red';
}

const colorHex: Record<HoodieMockupProps['garmentColor'], string> = {
  white: '#e5e7eb',
  black: '#1f2937',
  gray: '#6b7280',
  navy: '#1e3a8a',
  red: '#dc2626',
};

const HoodieMockup: React.FC<HoodieMockupProps> = React.memo(({ designImage, garmentColor }) => {
  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[3/4] flex items-center justify-center overflow-hidden">
      {/* Simple Hoodie Shape (using a div for simplicity, could be SVG for more detail) */}
      <div 
        className="w-full h-full rounded-lg shadow-lg relative" 
        style={{ backgroundColor: colorHex[garmentColor] }}
      >
        {/* Main body */}
        <div className="w-full h-full bg-current"></div>
        
        {/* Hood */}
        <div 
          className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-current rounded-b-full rounded-t-full transform -translate-y-1/4"
          style={{ 
            clipPath: 'polygon(0 40%, 20% 0, 80% 0, 100% 40%, 100% 100%, 0% 100%)' 
          }}
        ></div>
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-1/4 h-1/6 bg-black/10 rounded-full border border-black/20"></div> {/* Hood opening */}

        {/* Sleeves (basic representation) */}
        <div className="absolute top-1/4 left-0 w-1/4 h-1/2 bg-current rounded-r-full transform -translate-x-1/3 -rotate-12"></div>
        <div className="absolute top-1/4 right-0 w-1/4 h-1/2 bg-current rounded-l-full transform translate-x-1/3 rotate-12"></div>

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

export default HoodieMockup;