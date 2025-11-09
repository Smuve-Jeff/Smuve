import React, { useRef, useEffect, useCallback, useState } from 'react';

interface WaveformDisplayProps {
  isRecording?: boolean; // True if displaying live recording input
  audioData?: Float32Array | null; // Live microphone audio data (e.g., from AnalyserNode)
  clipBuffer?: AudioBuffer | null; // Full AudioBuffer for a recorded clip (static display)
  playbackProgress?: number | null; // 0-1 for playback indicator on static waveform
  width?: number;
  height?: number;
  color?: string;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
  isRecording = false, 
  audioData, 
  clipBuffer, 
  playbackProgress, 
  width = 300, 
  height = 80,
  color = '#4ade80' // default green
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [staticWaveformData, setStaticWaveformData] = useState<Float32Array | null>(null);

  // Function to draw the waveform on canvas
  const drawWave = useCallback((data: Float32Array | null, ctx: CanvasRenderingContext2D, waveColor: string, isGlowing: boolean) => {
    if (!data || data.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = waveColor;
    ctx.shadowColor = waveColor;
    ctx.shadowBlur = isGlowing ? 5 : 0;

    ctx.beginPath();
    const sliceWidth = width * 1.0 / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 2 + 0.5; // Normalize to 0-1 and center
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2); // Ensure line extends to end if data is short
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
  }, [width, height]);
  
   // Effect to process clipBuffer once into staticWaveformData
  useEffect(() => {
    if (clipBuffer) {
        const channelData = clipBuffer.getChannelData(0); // Assuming mono or using first channel
        const samplesToDisplay = width * 2; // Downsample for efficient display
        const downsampled = new Float32Array(samplesToDisplay);
        const step = Math.floor(channelData.length / samplesToDisplay);
        for (let i = 0; i < samplesToDisplay; i++) {
            // Take absolute max/min for peak display, or just average/sample for simple line
            let sum = 0;
            let count = 0;
            const start = i * step;
            const end = Math.min(channelData.length, (i + 1) * step);
            for(let j = start; j < end; j++) {
                sum += channelData[j];
                count++;
            }
            downsampled[i] = count > 0 ? sum / count : 0;
        }
        setStaticWaveformData(downsampled);
    } else {
        setStaticWaveformData(null);
    }
  }, [clipBuffer, width]);

  // Main drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isRecording && audioData) {
        drawWave(audioData, ctx, color, true); // Always glow when recording
    } else if (staticWaveformData) {
        drawWave(staticWaveformData, ctx, color, false); // No glow for static waveform

        // Draw playback indicator if playing
        if (playbackProgress !== null && playbackProgress >= 0 && playbackProgress <= 1) {
            const indicatorX = playbackProgress * width;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff'; // White indicator
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.moveTo(indicatorX, 0);
            ctx.lineTo(indicatorX, height);
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset shadow
        }
    } else {
        ctx.clearRect(0, 0, width, height); // Clear if nothing to display
    }
  }, [isRecording, audioData, staticWaveformData, playbackProgress, drawWave, width, height, color]);

  return (
    <canvas ref={canvasRef} width={width} height={height} className="block"></canvas>
  );
};

export default React.memo(WaveformDisplay);