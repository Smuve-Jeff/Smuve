import React, { useRef, useEffect } from 'react';

interface LevelMeterProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
}

const LevelMeter: React.FC<LevelMeterProps> = ({ analyserNode, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!analyserNode || !isRecording) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Float32Array(analyserNode.fftSize);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyserNode.getFloatTimeDomainData(dataArray);

      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
        peak = Math.max(peak, Math.abs(dataArray[i]));
      }
      
      const width = canvas.width;
      const height = canvas.height;
      const meterWidth = peak * width;
      const isClipping = peak > 0.98;

      ctx.clearRect(0, 0, width, height);
      
      // Background
      ctx.fillStyle = '#1f2937'; // gray-800
      ctx.fillRect(0, 0, width, height);

      // Meter fill
      if (isClipping) {
        ctx.fillStyle = '#ef4444'; // red-500
      } else if (meterWidth > width * 0.85) {
        ctx.fillStyle = '#f59e0b'; // amber-500
      } else {
        ctx.fillStyle = '#22c55e'; // green-500
      }
      ctx.fillRect(0, 0, meterWidth, height);
      
      // Clipping indicator
      if (isClipping) {
        ctx.fillStyle = '#f87171'; // red-400
        ctx.fillRect(width - 8, 0, 8, height);
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Clear canvas on stop
      if(ctx) {
        setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 100);
      }
    };
  }, [analyserNode, isRecording]);

  return <canvas ref={canvasRef} width="150" height="20" className="rounded" />;
};

export default React.memo(LevelMeter);