import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MatrixBackgroundProps {
  isWidget?: boolean;
  widgetWidth?: number;
  widgetHeight?: number;
  onWidgetResize?: (width: number, height: number) => void;
}

const MatrixBackground: React.FC<MatrixBackgroundProps> = ({ 
  isWidget = false, 
  widgetWidth = 200, 
  widgetHeight = 150, 
  onWidgetResize 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const startMouseX = useRef(0);
  const startMouseY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasDimensions = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };

    setCanvasDimensions();
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:,.<>/?|';
    const fontSize = isWidget ? Math.max(8, Math.min(14, Math.floor(container.offsetWidth / 15))) : 14; 
    const columns = Math.floor(canvas.width / fontSize);

    const rainDrops: number[] = [];
    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    let frameId: number;
    const draw = () => {
      if(!ctx) return;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 255, 70, 0.8)'; // Green color
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
      frameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
        setCanvasDimensions();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isWidget, widgetWidth, widgetHeight]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const currentContainer = containerRef.current;
    if (currentContainer) {
      startMouseX.current = e.clientX;
      startMouseY.current = e.clientY;
      startWidth.current = currentContainer.offsetWidth;
      startHeight.current = currentContainer.offsetHeight;
    }
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && onWidgetResize) {
      const deltaX = e.clientX - startMouseX.current;
      const deltaY = e.clientY - startMouseY.current;
      const newWidth = Math.max(100, startWidth.current + deltaX);
      const newHeight = Math.max(75, startHeight.current + deltaY);
      onWidgetResize(newWidth, newHeight);
    }
  }, [isResizing, onWidgetResize]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsResizing(false);
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseMove]);

  const baseClasses = "absolute top-0 left-0 w-full h-full z-0";
  const widgetClasses = "fixed bottom-4 right-4 border border-green-500/50 rounded-lg shadow-xl bg-black/50 overflow-hidden z-30 pointer-events-none";

  return (
    <div 
      ref={containerRef}
      className={isWidget ? widgetClasses : baseClasses} 
      style={isWidget ? { width: widgetWidth, height: widgetHeight, pointerEvents: 'auto' } : {}}
    >
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
      {isWidget && (
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-green-500 rounded-br-lg z-50 opacity-70 hover:opacity-100 transition-opacity pointer-events-auto"
          onMouseDown={handleResizeMouseDown}
        ></div>
      )}
    </div>
  );
};

export default MatrixBackground;
