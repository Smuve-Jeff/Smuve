import React, { useState, useEffect, useRef, Fragment } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import MixerKnob from './common/MixerKnob';
import ToggleSwitch from './common/ToggleSwitch';
import Spinner from './common/Spinner';
import { useGlobalAudio } from './services/GlobalAudioContext';
import { generateDrumPattern } from './services/geminiService';
import { Note } from './types';
import { useToast } from './services/ToastContext';


const SpectrumVisualizer: React.FC<{ analyser: AnalyserNode | null }> = React.memo(({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!analyser) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationFrameId: number;

        const draw = () => {
            animationFrameId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 1.5;
            let x = 0;

            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#a855f7'); // purple-500
            gradient.addColorStop(0.5, '#06b6d4'); // cyan-500
            gradient.addColorStop(1, '#3b82f6'); // blue-500

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [analyser]);

    return <canvas ref={canvasRef} width="300" height="50" className="rounded-lg"></canvas>;
});
SpectrumVisualizer.displayName = 'SpectrumVisualizer';

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const displayOctaves = [5, 4, 3]; // C5 to C3

const PianoRoll: React.FC = React.memo(() => {
    const { drumMachineState, setNote } = useGlobalAudio();
    const { patternLength, noteGrid, isPlaying, currentStep, currentInstruments } = drumMachineState;
    
    // Find the first pitched instrument to determine which instrument's notes to display/edit
    // For simplicity, we'll assume only one pitched instrument is actively edited via piano roll.
    // In a full DAW, each instrument would have its own lane in the piano roll.
    const pitchedInstrumentIndex = currentInstruments.findIndex(inst => inst.isPitched);
    const hasPitchedInstrument = pitchedInstrumentIndex !== -1;

    // Generate all displayable pitches from C3 to B5 (or adjust range as needed)
    const allPitches: string[] = [];
    for (const octave of displayOctaves) {
        for (const note of noteNames.slice().reverse()) { // Reverse to have higher notes at the top
            allPitches.push(`${note}${octave}`);
        }
    }
    
    const squareWidth = 36; // px
    const squareHeight = 24; // px (to match current fixed design for visual consistency)

    return (
        <div className="flex overflow-x-auto p-2 custom-scrollbar-thin rounded-lg bg-black/30 relative">
            {/* Piano Keys / Note Labels */}
            <div className="sticky left-0 z-20 bg-gray-800/60 flex flex-col">
                {allPitches.map(pitch => {
                    const isBlackKey = pitch.includes('#');
                    return (
                        <div 
                            key={pitch} 
                            className={`flex items-center justify-end pr-2 text-xs font-semibold h-6 ${isBlackKey ? 'bg-gray-700/80 text-gray-400' : 'bg-gray-600/80 text-gray-200'} `}
                            style={{ height: `${squareHeight}px`}}
                        >
                            {pitch}
                        </div>
                    );
                })}
            </div>

            {/* Note Grid */}
            <div className="relative flex-grow">
                <div className="grid" style={{ gridTemplateColumns: `repeat(${patternLength}, ${squareWidth}px)`}}>
                    {allPitches.map(pitch => (
                        <Fragment key={pitch}>
                            {Array.from({length: patternLength}).map((_, stepIndex) => {
                                const isBeat = Math.floor(stepIndex / 4) % 2 === 0;
                                const isBlackKey = pitch.includes('#');

                                const noteExists = hasPitchedInstrument && noteGrid[pitchedInstrumentIndex]?.some(n => n.pitch === pitch && n.step === stepIndex);

                                return (
                                    <button 
                                        key={`${pitch}-${stepIndex}`}
                                        onClick={() => hasPitchedInstrument && setNote(pitchedInstrumentIndex, stepIndex, pitch)}
                                        className={`w-[${squareWidth}px] h-[${squareHeight}px] border-r border-b border-gray-700/50 transition-colors ${
                                            noteExists ? 'bg-cyan-500 border-cyan-300' 
                                            : isBeat ? `bg-blue-900/40 hover:bg-blue-800/50` 
                                            : `bg-gray-800/60 hover:bg-gray-700/80`
                                        } ${isBlackKey ? 'bg-opacity-50' : ''}`}
                                        disabled={!hasPitchedInstrument}
                                    />
                                );
                            })}
                        </Fragment>
                    ))}
                </div>
                 {/* Playhead */}
                {isPlaying && currentStep >= 0 && (
                     <div 
                        className="absolute top-0 bottom-0 w-1 bg-purple-500/70 pointer-events-none transition-transform duration-75 ease-linear z-30"
                        style={{ transform: `translateX(${currentStep * squareWidth}px)`}}
                     />
                )}
            </div>
        </div>
    );
});
PianoRoll.displayName = 'PianoRoll';


const DrumMachine: React.FC = () => {
    const {
        drumMachineState,
        toggleDrumMachinePlay,
        setDrumBpm,
        setDrumKit,
        toggleDrumStep,
        handleDrumInstrumentMixerChange,
        setDrumPatternLength,
        setDrumSwing,
        toggleDrumMetronome,
        handleDrumCustomSampleUpload,
        clearDrumPattern,
        saveDrumPattern,
        loadDrumPattern,
        defaultKits,
        toggleDrumMute,
        toggleDrumSolo,
        setDrumGrid,
        setNote,
        drumAnalyserNode,
        isMidiConnected,
        isMidiActive, // New: MIDI activity
    } = useGlobalAudio();
    const { showToast } = useToast();

    const {
        isPlaying,
        currentStep,
        bpm,
        selectedKitIndex,
        drumGrid,
        noteGrid,
        currentInstruments,
        songTitle,
        patternLength,
        swingAmount,
        metronomeOn,
        isLoadingSounds
    } = drumMachineState;

    const [localSongTitle, setLocalSongTitle] = useState(songTitle);
    const [aiGenre, setAiGenre] = useState('Lo-Fi Hip Hop');
    const [aiMood, setAiMood] = useState('Chill');
    const [aiComplexity, setAiComplexity] = useState('Standard');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setLocalSongTitle(songTitle);
    }, [songTitle]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSongTitle(e.target.value);
    };

    const handleLoadPattern = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            loadDrumPattern(file);
        }
    };

    const handleGeneratePattern = async () => {
        setIsGenerating(true);
        try {
            const instrumentNames = currentInstruments.map(inst => inst.name);
            if (instrumentNames.length === 0) {
                showToast('No instruments loaded. Please select a drum kit first.', 'error');
                return;
            }
            if (isPitchedKit) {
                showToast('AI pattern generation is currently only available for standard drum kits, not pitched instruments.', 'info');
                return;
            }

            const newPattern = await generateDrumPattern(
                aiGenre,
                aiMood,
                aiComplexity,
                instrumentNames,
                patternLength
            );
            setDrumGrid(newPattern);
        } catch (error) {
            console.error(error);
            showToast('Failed to generate AI pattern. Please try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const isPitchedKit = currentInstruments.some(inst => inst.isPitched);
    
    return (
        <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
            <Card className="w-full max-w-7xl flex flex-col gap-4 bg-gray-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10 p-4">
                {/* Master Header: Transport, Title, Visualizer */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-4">
                        <Button onClick={toggleDrumMachinePlay} variant="primary" className="w-24 h-12 text-lg" disabled={isLoadingSounds}>
                            {isPlaying ? <i className="fas fa-pause"></i> : <i className="fas fa-play"></i>}
                            <span className="ml-2">{isPlaying ? 'Stop' : 'Play'}</span>
                        </Button>
                        <div className="flex flex-col items-center">
                            <label htmlFor="bpm" className="font-bold text-indigo-300 text-2xl">{bpm}</label>
                            <span className="text-xs text-gray-400">BPM</span>
                        </div>
                        <input id="bpm" type="range" min="60" max="200" value={bpm} onChange={(e) => setDrumBpm(Number(e.target.value))} className="w-32 accent-indigo-500" />
                    </div>
                    <input id="songTitle" type="text" value={localSongTitle} onChange={handleTitleChange} placeholder="Untitled Beat" className="text-center text-lg font-bold bg-transparent border-b-2 border-gray-700 focus:border-indigo-500 text-gray-200 focus:outline-none transition-colors" />
                    <SpectrumVisualizer analyser={drumAnalyserNode} />
                </div>
                
                <div className="w-full grid lg:grid-cols-5 gap-4 flex-grow">
                    {/* Left Column: AI & Kits */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <Card className="bg-gray-800/40 border-gray-700/50">
                            <h3 className="text-xl font-semibold text-cyan-300 mb-4 flex justify-between items-center">
                                <span>Beat AI</span>
                                {isMidiConnected && <span className={`text-xs font-bold text-green-400 border border-green-500/50 rounded-md px-2 py-0.5 bg-green-900/50 shadow-md shadow-green-500/20 ${isMidiActive ? 'animate-pulse' : ''}`}>MIDI</span>}
                            </h3>
                             {isPitchedKit ? (
                                <p className="text-sm text-cyan-400 text-center">AI Beat generation is currently available for drum kits. (Not for pitched instruments)</p>
                             ) : (
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400">Genre/Style</label>
                                        <input type="text" value={aiGenre} onChange={(e) => setAiGenre(e.target.value)} placeholder="e.g., Trap, House" className="w-full bg-gray-900/80 border border-gray-600/50 rounded p-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Mood</label>
                                        <input type="text" value={aiMood} onChange={(e) => setAiMood(e.target.value)} placeholder="e.g., Energetic, Dark" className="w-full bg-gray-900/80 border border-gray-600/50 rounded p-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Complexity</label>
                                        <select value={aiComplexity} onChange={(e) => setAiComplexity(e.target.value)} className="w-full bg-gray-900/80 border border-gray-600/50 rounded p-1 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500">
                                            <option>Simple</option>
                                            <option>Standard</option>
                                            <option>Complex</option>
                                        </select>
                                    </div>
                                    <Button onClick={handleGeneratePattern} disabled={isGenerating || isLoadingSounds} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mt-2">
                                        {isGenerating ? <Spinner /> : <><i className="fas fa-brain mr-2"></i> Generate</>}
                                    </Button>
                                </div>
                             )}
                        </Card>
                         <Card className="flex flex-col gap-4 bg-gray-800/40 border-gray-700/50 flex-grow">
                            <h3 className="text-xl font-semibold text-indigo-300">Kit Selector</h3>
                            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
                                {defaultKits.map((kit, index) => (
                                    <Button key={kit.name} variant={selectedKitIndex === index ? 'primary' : 'secondary'} onClick={() => setDrumKit(index)}
                                        className={`w-full ${selectedKitIndex === index ? "bg-indigo-600 hover:bg-indigo-500" : "bg-gray-700/80 hover:bg-gray-600/80"}`}>
                                        {kit.name}
                                    </Button>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Sequencer & Mixer */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <Card className="flex flex-col bg-gray-800/40 border-gray-700/50">
                            <div className="flex items-center justify-between mb-4 gap-4">
                                <h3 className="text-xl font-semibold text-indigo-300">{isPitchedKit ? 'Piano Roll' : 'Sequencer'}</h3>
                                <div className="flex gap-4 items-center">
                                    <ToggleSwitch label="Metronome" isOn={metronomeOn} onToggle={toggleDrumMetronome} color="yellow" />
                                    <MixerKnob label="Swing" value={swingAmount} onChange={setDrumSwing} min={0} max={100} step={5} unit="%" color="yellow" />
                                    <select id="patternLength" value={patternLength} onChange={(e) => setDrumPatternLength(Number(e.target.value))} className="bg-gray-900/80 border border-indigo-800/50 rounded p-2 text-sm text-indigo-300 focus:outline-none focus:ring-1 focus:focus:ring-indigo-500">
                                        <option value={8}>8 Steps</option> <option value={16}>16 Steps</option> <option value={32}>32 Steps</option>
                                    </select>
                                </div>
                            </div>
                           {isPitchedKit ? <PianoRoll /> : (
                                <div className="overflow-x-auto p-2 custom-scrollbar-thin rounded-lg bg-black/30">
                                    <div className={`grid gap-1`} style={{ gridTemplateColumns: `minmax(120px, auto) repeat(${patternLength}, 36px)` }}>
                                        <div className="sticky left-0 bg-gray-800/40 z-10"></div>
                                        {Array.from({ length: patternLength }, (_, i) => (
                                            <div key={`header-${i}`} className={`w-9 h-6 flex items-center justify-center rounded-md text-xs border-b-2 ${i % 4 === 0 ? 'text-gray-300 border-gray-600' : 'text-gray-700 border-transparent'}`}>{i + 1}</div>
                                        ))}
                                        {currentInstruments.map((instrument, instIndex) => (
                                            <Fragment key={instrument.name}>
                                                <div className="font-semibold text-right pr-2 self-center text-gray-300 text-xs truncate sticky left-0 bg-gray-800/40 z-10">{instrument.name}</div>
                                                {drumGrid[instIndex]?.map((isActive, stepIndex) => (
                                                    <button key={`${instIndex}-${stepIndex}`} onClick={() => toggleDrumStep(instIndex, stepIndex)}
                                                        className={`w-9 h-8 rounded-md transition-all duration-100 border ${isPlaying && currentStep === stepIndex ? 'bg-purple-500 border-purple-300 shadow-lg shadow-purple-500/40 transform scale-110' : isActive ? 'bg-indigo-500 border-indigo-400' : `${(Math.floor(stepIndex / 4) % 2 === 0) ? 'bg-blue-900/30 hover:bg-blue-800/40' : 'bg-gray-800/50 hover:bg-gray-700/80'} border-transparent`}`}
                                                        disabled={isLoadingSounds} />
                                                ))}
                                            </Fragment>
                                        ))}
                                    </div>
                                </div>
                           )}
                        </Card>

                        <Card className="flex flex-col bg-gray-800/40 border-gray-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-purple-300">Instrument Mixer</h3>
                                <div className="flex gap-2">
                                    <Button onClick={clearDrumPattern} variant="secondary" icon={<i className="fas fa-eraser"></i>} disabled={isLoadingSounds}>Clear</Button>
                                    <Button onClick={saveDrumPattern} icon={<i className="fas fa-download"></i>} variant="secondary" disabled={isLoadingSounds}>Save</Button>
                                    <label htmlFor="loadPattern" className={`px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-indigo-400 border border-gray-600/50 cursor-pointer ${isLoadingSounds ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <i className="fas fa-upload"></i> Load
                                    </label>
                                    <input id="loadPattern" type="file" accept=".json" onChange={handleLoadPattern} className="hidden" disabled={isLoadingSounds} />
                                </div>
                            </div>
                            <div className="overflow-x-auto pb-2 custom-scrollbar">
                                <div className="flex flex-row gap-4 py-2">
                                    {currentInstruments.map((instrument, instIndex) => (
                                        <div key={`${instrument.name}-${instIndex}`} className="flex-shrink-0 flex flex-col items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 w-64 h-[280px]">
                                            <span className="font-bold text-gray-300 text-sm truncate w-full text-center h-5">{instrument.name}</span>
                                            {instrument.isLoading ? (
                                                <div className="flex-grow flex flex-col items-center justify-center">
                                                    <Spinner />
                                                    <p className="text-xs text-gray-400 mt-2">Loading...</p>
                                                </div>
                                            ) : instrument.soundLoadingError ? (
                                                <div className="flex-grow flex flex-col items-center justify-center text-center">
                                                    <i className="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                                                    <p className="text-red-400 text-xs">Sound load failed.</p>
                                                    <p className="text-gray-500 text-[10px] mt-1 truncate w-full px-2" title={instrument.soundLoadingError}>
                                                        {instrument.soundLoadingError}
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-around w-full">
                                                        <MixerKnob label="Vol" value={instrument.mixer.volume} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'volume', v)} min={0} max={1} step={0.01} unit="" color="green"/>
                                                        <MixerKnob label="Pan" value={instrument.mixer.pan} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'pan', v)} min={-1} max={1} step={0.1} unit="" color="blue"/>
                                                        <MixerKnob label="Filter" value={instrument.mixer.filterCutoff} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'filterCutoff', v)} min={100} max={20000} step={100} unit="hz" color="cyan"/>
                                                    </div>
                                                    <div className="flex justify-around w-full border-t border-gray-700/50 pt-2 mt-2">
                                                        <MixerKnob label="Low" value={instrument.mixer.eqLow} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'eqLow', v)} min={-12} max={12} step={1} unit="dB" color="purple"/>
                                                        <MixerKnob label="Mid" value={instrument.mixer.eqMid} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'eqMid', v)} min={-12} max={12} step={1} unit="dB" color="pink"/>
                                                        <MixerKnob label="High" value={instrument.mixer.eqHigh} onChange={(v) => handleDrumInstrumentMixerChange(instIndex, 'eqHigh', v)} min={-12} max={12} step={1} unit="dB" color="yellow"/>
                                                    </div>
                                                    <div className="flex justify-around w-full mt-2">
                                                        <Button onClick={() => toggleDrumMute(instIndex)} className={`w-12 h-8 font-bold ${instrument.isMuted ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'}`}>M</Button>
                                                        <Button onClick={() => toggleDrumSolo(instIndex)} className={`w-12 h-8 font-bold ${instrument.isSoloed ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-gray-300'}`}>S</Button>
                                                        <label htmlFor={`upload-${instIndex}`} className={`w-12 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${instrument.isCustom ? 'bg-green-800 hover:bg-green-700 text-green-300' : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-300'}`}>
                                                            <i className="fas fa-upload"></i>
                                                        </label>
                                                        <input id={`upload-${instIndex}`} type="file" accept="audio/*" className="hidden" onChange={(e) => handleDrumCustomSampleUpload(instIndex, e)} disabled={isLoadingSounds}/>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {isLoadingSounds && !currentInstruments.some(inst => inst.isLoading) && (
                                <div className="flex items-center justify-center p-4">
                                    <Spinner />
                                    <span className="ml-2 text-gray-400">Loading Sounds...</span>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </Card>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #a855f7; border-radius: 4px; border: 2px solid #1f2937; }
                .custom-scrollbar-thin::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb { background-color: #6366f1; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                }
                .animate-pulse-strong {
                    animation: pulse 1s infinite;
                }
            `}</style>
        </div>
    );
};

export default React.memo(DrumMachine);