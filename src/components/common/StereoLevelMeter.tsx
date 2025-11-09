import React, { useRef, useEffect } from 'react';

interface StereoLevelMeterProps {
  analyserNode: AnalyserNode | null;
}

const StereoLevelMeter: React.FC<StereoLevelMeterProps> = ({ analyserNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!analyserNode) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We need a splitter to analyze left and right channels separately
    const splitter = analyserNode.context.createChannelSplitter(2);
    const analyserL = analyserNode.context.createAnalyser();
    const analyserR = analyserNode.context.createAnalyser();
    analyserNode.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    
    analyserL.fftSize = 256;
    analyserR.fftSize = 256;
    
    const dataArrayL = new Float32Array(analyserL.fftSize);
    const dataArrayR = new Float32Array(analyserR.fftSize);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyserL.getFloatTimeDomainData(dataArrayL);
      analyserR.getFloatTimeDomainData(dataArrayR);

      let peakL = 0;
      dataArrayL.forEach(v => { peakL = Math.max(peakL, Math.abs(v)); });

      let peakR = 0;
      dataArrayR.forEach(v => { peakR = Math.max(peakR, Math.abs(v)); });

      const width = canvas.width;
      const height = canvas.height;
      const channelHeight = (height - 4) / 2;
      
      ctx.clearRect(0, 0, width, height);

      // Draw Left Channel
      drawMeter(ctx, 0, 0, width, channelHeight, peakL);
      // Draw Right Channel
      drawMeter(ctx, 0, channelHeight + 4, width, channelHeight, peakR);
    };

    const drawMeter = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      peak: number
    ) => {
      const meterWidth = peak * w;
      const isClipping = peak > 0.98;
      
      context.fillStyle = '#1f2937'; // gray-800
      context.fillRect(x, y, w, h);

      if (isClipping) context.fillStyle = '#ef4444';
      else if (meterWidth > w * 0.85) context.fillStyle = '#f59e0b';
      else context.fillStyle = '#10b981'; // emerald-500

      context.fillRect(x, y, meterWidth, h);

      if (isClipping) {
        context.fillStyle = '#f87171';
        context.fillRect(x + w - 5, y, 5, h);
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      try {
        analyserNode.disconnect(splitter);
        splitter.disconnect(analyserL, 0);
        splitter.disconnect(analyserR, 1);
      } catch (e) {
        // This can error if the node is already disconnected, which is fine.
      }
    };
  }, [analyserNode]);

  return <canvas ref={canvasRef} width="150" height="28" className="rounded bg-gray-900/50" />;
};

export default React.memo(StereoLevelMeter);