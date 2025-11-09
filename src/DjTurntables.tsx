import React, { useRef, useEffect } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { useGlobalAudio } from './services/GlobalAudioContext';

// --- Reusable UI Components for the DJ Controller ---

const Platter: React.FC<{ isPlaying: boolean; progress: number }> = React.memo(({ isPlaying, progress }) => {
    const circumference = 2 * Math.PI * 45; // radius is 45
    // Adjusted progress calculation to prevent negative values or NaN before actual duration is known
    const offset = circumference - (isNaN(progress) || progress < 0 ? 0 : (progress / 100) * circumference);

    return (
        <div className={`w-full h-auto aspect-square bg-gray-900 rounded-full p-2 border-4 border-indigo-900 flex items-center justify-center relative shadow-inner ${isPlaying ? 'animate-spin-slow' : ''}`}>
             <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="#1f2937" strokeWidth="4" fill="none" />
                <circle 
                    cx="50" cy="50" r="45" 
                    stroke="#8b5cf6" strokeWidth="4" fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-100 linear"
                />
            </svg>
            <div className="w-full h-full bg-black rounded-full p-2 relative neon-glow-platter">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center relative shadow-inner">
                    <div className="absolute w-11/12 h-11/12 rounded-full border border-indigo-700/50"></div>
                    <div className="absolute w-9/12 h-9/12 rounded-full border border-indigo-800/50"></div>
                    <div className="w-1/2 h-1/2 bg-gray-700 rounded-full flex items-center justify-center absolute"
                        style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.7)' }}>
                        <div className="w-1/3 h-1/3 bg-gray-500 rounded-full"></div>
                    </div>
                </div>
            </div>
            <style>{`
                .neon-glow-platter {
                    box-shadow: 0 0 10px #8b5cf680, 0 0 20px #8b5cf640;
                }
                .animate-spin-slow {
                    animation: spin 5s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
});

const ControlFader: React.FC<{ label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; color: string; }> = React.memo(({ label, value, onChange, min, max, step, color }) => {
    const thumbColor = `bg-${color}-500`;
    return (
        <div className="flex flex-col items-center gap-2">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-4 h-32 appearance-none cursor-pointer bg-gray-700 rounded-full
                    [&::-webkit-slider-runnable-track]:bg-gray-700 [&::-webkit-slider-runnable-track]:w-4 [&::-webkit-slider-runnable-track]:rounded-full
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:${thumbColor} [&::-webkit-slider-thumb]:shadow-lg`}
                orient="vertical"
            />
            <label className="text-xs text-gray-400">{label}</label>
        </div>
    );
});


const Deck: React.FC<{ index: 0 | 1 }> = React.memo(({ index }) => {
    const { djDecksState, togglePlayDeck, loadTrackToDeck, setDeckTempo } = useGlobalAudio();
    const deckState = djDecksState[index];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadTrackToDeck(index, file);
        }
    };
    
    return (
        <div className="w-full max-w-[320px] flex flex-col items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 shadow-md shadow-indigo-500/10">
            <h4 className="text-lg font-bold text-indigo-300">Deck {index + 1}</h4>
            <Platter isPlaying={deckState.isPlaying} progress={deckState.progress} />
            <div className="text-xs text-gray-400 mt-2 truncate max-w-full">
                {deckState.track?.name || 'Load a track'}
            </div>
            <div className="flex justify-center gap-4 mt-2">
                <Button onClick={() => togglePlayDeck(index)} className={`w-14 h-14 rounded-full text-lg ${deckState.isPlaying ? 'bg-red-600 hover:bg-red-500 shadow-red-500/40' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'}`} disabled={!deckState.track}>
                    <i className={`fas ${deckState.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-14 h-14 rounded-full text-lg">
                    <i className="fas fa-folder-open"></i>
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
            </div>
             <div className="w-full flex justify-center items-center gap-4 mt-4">
                <span className="text-xs text-green-400">-</span>
                <input
                    type="range"
                    min={0.8}
                    max={1.2}
                    step={0.01}
                    value={deckState.tempo}
                    onChange={(e) => setDeckTempo(index, parseFloat(e.target.value))}
                    className="w-full accent-green-500"
                    disabled={!deckState.track}
                />
                <span className="text-xs text-green-400">+</span>
            </div>
            <label className="text-xs text-gray-400">Tempo: {((deckState.tempo - 1) * 100).toFixed(1)}%</label>
        </div>
    );
});

const Mixer: React.FC = React.memo(() => {
    const { djMixerState, setDjMixer } = useGlobalAudio();
    
    return (
        <div className="w-full max-w-[280px] flex flex-col items-center gap-4 p-4 bg-gray-900/50 rounded-lg border border-indigo-700/50 shadow-md shadow-indigo-500/10">
            <h4 className="text-lg font-bold text-indigo-400 mb-2">Mixer</h4>
            
            <div className="flex justify-around w-full">
                <ControlFader label="Gain L" value={djMixerState.gainL} onChange={(v) => setDjMixer('gainL', v)} min={0} max={1.5} step={0.01} color="blue" />
                <ControlFader label="Gain R" value={djMixerState.gainR} onChange={(v) => setDjMixer('gainR', v)} min={0} max={1.5} step={0.01} color="blue" />
            </div>

            <div className="my-4 w-full flex flex-col items-center gap-2">
                <label className="text-sm text-gray-400">Crossfader</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={djMixerState.crossFader}
                    onChange={(e) => setDjMixer('crossFader', parseFloat(e.target.value))}
                    className={`w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700
                        [&::-webkit-slider-runnable-track]:bg-gray-700 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:-mt-1.5`}
                />
            </div>

            <div className="mt-4 p-2 bg-gray-800/50 rounded-md w-full text-center text-xs text-indigo-300">
                LIVE MIX
            </div>
        </div>
    );
});


const DjTurntables: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
        <Card className="p-8 max-w-7xl w-full bg-gray-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-indigo-400 font-orbitron">DJ Deck</h2>
                <p className="text-gray-400 mt-2">Spin, mix, and create seamless transitions.</p>
            </div>
            <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-4 mb-8">
                <Deck index={0} />
                <Mixer />
                <Deck index={1} />
            </div>
        </Card>
    </div>
  );
};

export default DjTurntables;