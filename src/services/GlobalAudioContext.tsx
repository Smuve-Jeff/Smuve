import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode, ChangeEvent } from 'react';
import { Clip, Instrument, Kit, Track, Note } from '../types';
import { audioContext, masterGainNode, masterAnalyserNode, resumeAudioContext } from './audioContextService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// --- STATE & CONTEXT INTERFACES ---

interface DjDeckState {
    track: Track | null;
    isPlaying: boolean;
    progress: number;
    tempo: number;
}

interface DjMixerState {
    gainL: number;
    gainR: number;
    crossFader: number;
}

interface MusicPlayerState {
    playlist: Track[];
    currentTrackIndex: number | null;
    isPlaying: boolean;
    progress: number;
    currentTime: number;
    duration: number;
    volume: number;
    tempoRate: number;
    currentAudioBuffer?: AudioBuffer | null; // New: AudioBuffer for waveform display
}

interface DrumMachineState {
    isPlaying: boolean;
    currentStep: number;
    bpm: number;
    selectedKitIndex: number;
    drumGrid: boolean[][];
    noteGrid: Note[][];
    currentInstruments: Instrument[];
    songTitle: string;
    patternLength: number;
    swingAmount: number;
    metronomeOn: boolean;
    isLoadingSounds: boolean;
}

interface RecordingState {
    status: 'ready' | 'counting-in' | 'recording';
    countIn: number;
    waveformData: Float32Array | null;
    videoStream: MediaStream | null; // New: Live video stream for preview
    audioInputs: MediaDeviceInfo[];
    selectedInput: string;
    inputGain: number;
    inputAnalyserNode: AnalyserNode | null;
    metronomeOn: boolean;
    metronomeBpm: number;
    countInOn: boolean;
    monitorOn: boolean;
    setInputDevice: (deviceId: string) => void;
    setInputGain: (gain: number) => void;
    toggleMetronome: () => void;
    setMetronomeBpm: (bpm: number) => void;
    toggleCountIn: () => void;
    toggleMonitor: () => void;
}

interface GlobalAudioContextType {
    // Master Channel
    masterVolume: number;
    setMasterVolume: (volume: number) => void;
    masterAnalyserNode: AnalyserNode; // Expose master analyser

    // Vocal Booth
    clips: Clip[];
    addClip: (file: File) => void; // For audio files
    addVideoClip: (file: File) => void; // New: For video files
    deleteClip: (id: number) => void;
    playClip: (id: number) => void;
    stopClip: (id: number) => void;
    handleClipMixerChange: (id: number, param: string, value: number) => void;
    handleClipToggle: (id: number, param: keyof Clip['mixer']) => void;
    addSynthTrack: () => void;
    handleClipMetadataChange: (id: number, field: keyof Clip['metadata'], value: string) => void;
    handleSynthWaveformChange: (id: number, waveform: 'sine' | 'sawtooth' | 'square') => void;
    exportMixAsWav: () => void;
    isExporting: boolean;
    saveSession: () => void;
    loadSession: (options?: { fromFile?: File }) => void;
    addClipFromSample: (sample: { name: string, url: string }) => Promise<void>;
    masterEffects: { delayWetDry: number, chorusWetDry: number };
    handleMasterEffectChange: (param: 'delayWetDry' | 'chorusWetDry', value: number) => void;

    // Recording
    isRecording: boolean;
    recordingState: RecordingState;
    startRecording: (captureVideo: boolean) => void; // Added captureVideo param
    stopRecording: () => void;

    // DJ Decks
    djDecksState: [DjDeckState, DjDeckState];
    djMixerState: DjMixerState;
    togglePlayDeck: (index: 0 | 1) => void;
    loadTrackToDeck: (index: 0 | 1, file: File) => void;
    setDeckTempo: (index: 0 | 1, tempo: number) => void;
    setDjMixer: (param: keyof DjMixerState, value: number) => void;

    // Music Player
    musicPlayerState: MusicPlayerState;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrev: () => void;
    setMusicPlayerVolume: (volume: number) => void;
    setMusicPlayerTempo: (rate: number) => void;
    seekMusicPlayer: (progress: number) => void;
    addTrackFromUrl: (url: string) => void;
    addTrackFromFile: (file: File) => void;
    removeTrack: (index: number) => void;
    savePlaylist: () => void;
    loadPlaylist: (file: File) => void;
    playMusicPlayerTrack: (index: number) => Promise<void>; // Added to expose play function

    // Drum Machine
    drumMachineState: DrumMachineState;
    toggleDrumMachinePlay: () => void;
    setDrumBpm: (bpm: number) => void;
    setDrumKit: (index: number) => void;
    toggleDrumStep: (instrumentIndex: number, stepIndex: number) => void;
    handleDrumInstrumentMixerChange: (instIndex: number, param: string, value: number) => void;
    setDrumPatternLength: (length: number) => void;
    setDrumSwing: (amount: number) => void;
    toggleDrumMetronome: () => void;
    handleDrumCustomSampleUpload: (instIndex: number, e: ChangeEvent<HTMLInputElement>) => void;
    clearDrumPattern: () => void;
    saveDrumPattern: () => void;
    loadDrumPattern: (file?: File) => void;
    defaultKits: Kit[];
    toggleDrumMute: (instIndex: number) => void;
    toggleDrumSolo: (instIndex: number) => void;
    setDrumGrid: (newGrid: boolean[][]) => void;
    setNote: (instrumentIndex: number, stepIndex: number, pitch: string) => void;
    drumAnalyserNode: AnalyserNode | null;
    isMidiConnected: boolean;
    isMidiActive: boolean; // New: MIDI activity indicator
    drumMachineTimerRef: React.MutableRefObject<number | null>; // Exposed for MusicBattleGame
}

const GlobalAudioContext = createContext<GlobalAudioContextType | undefined>(undefined);

// --- DEFAULT DATA & HELPERS ---
const noteToMidiMap: { [key: string]: number } = {};
const midiToNoteMap: { [key: number]: string } = {};
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
for (let octave = 0; octave < 9; octave++) {
    noteNames.forEach((note, i) => {
        const pitch = `${note}${octave}`;
        const midi = octave * 12 + i;
        noteToMidiMap[pitch] = midi;
        midiToNoteMap[midi] = pitch;
    });
}

// Default kits for Drum Machine (simplified for brevity, actual data assumed to exist)
const defaultKitsData: Kit[] = [
    {
        name: "Standard Kit",
        instruments: [
            { name: "Kick", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/kick.wav", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Snare", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/snare.wav", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Hi-Hat", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/drum-samples/hihat.wav", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Clap", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/clap.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Open Hat", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/openhat.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
        ]
    },
    {
        name: "808 Kit",
        instruments: [
            { name: "808 Kick", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/kick.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "808 Snare", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/snare.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "808 Hi-Hat", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/hihat.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "808 Clap", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/808/clap.mp3", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
        ]
    },
    {
        name: "Pitched Percussion",
        instruments: [
            { name: "Marimba", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/marimba-mp3/C4.mp3", isPitched: true, baseNote: "C4", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Steelpan", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/steel_drums-mp3/C4.mp3", isPitched: true, baseNote: "C4", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
            { name: "Glockenspiel", defaultSoundUrl: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/glockenspiel-mp3/C4.mp3", isPitched: true, baseNote: "C4", isMuted: false, isSoloed: false, mixer: { volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0, filterCutoff: 20000 } },
        ]
    }
];

// --- PROVIDER COMPONENT ---

export const GlobalAudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();

    // --- REFS ---
    const clipSourcesRef = useRef<Map<number, AudioBufferSourceNode | HTMLVideoElement>>(new Map()); // Modified to hold VideoElement too
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);
    const drumMachineTimerRef = useRef<number | null>(null);

    // DJ Deck Refs
    const deckAudioElementsRef = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null]);
    const deckAudioContextsRef = useRef<[AudioContext | null, AudioContext | null]>([null, null]); // Separate contexts for each deck to control playback rate independently
    const deckSourceNodesRef = useRef<[MediaElementAudioSourceNode | null, MediaElementAudioSourceNode | null]>([null, null]);
    const deckGainNodesRef = useRef<[GainNode | null, GainNode | null]>([null, null]);
    const deckPannerNodesRef = useRef<[StereoPannerNode | null, StereoPannerNode | null]>([null, null]);
    const deckCrossfaderNodeRef = useRef<GainNode | null>(null); // To control crossfading

    const musicPlayerAudioRef = useRef<HTMLAudioElement | null>(null);
    const musicPlayerSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const musicPlayerGainNodeRef = useRef<GainNode | null>(null);

    const inputStreamRef = useRef<MediaStream | null>(null);
    const inputStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const inputGainNodeRef = useRef<GainNode | null>(null);
    const inputAnalyserNodeRef = useRef<AnalyserNode | null>(null);
    const animationFrameIdRecRef = useRef<number>();

    // Master Effects Nodes
    const masterDelayNodeRef = useRef<DelayNode | null>(null);
    const masterDelayFeedbackNodeRef = useRef<GainNode | null>(null);
    const masterDelayWetGainNodeRef = useRef<GainNode | null>(null);
    const masterDelayDryGainNodeRef = useRef<GainNode | null>(null);

    // --- STATES ---
    const [clips, setClips] = useState<Clip[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [recordingState, setRecordingState] = useState<Omit<RecordingState, 'setInputDevice' | 'setInputGain' | 'toggleMetronome' | 'setMetronomeBpm' | 'toggleCountIn' | 'toggleMonitor'>>({
        status: 'ready', countIn: 0, waveformData: null, videoStream: null, audioInputs: [], selectedInput: 'default',
        inputGain: 1.0, inputAnalyserNode: null, metronomeOn: false, metronomeBpm: 120, countInOn: true, monitorOn: false,
    });
    const isRecording = recordingState.status === 'recording' || recordingState.status === 'counting-in';
    const [isMidiConnected, setIsMidiConnected] = useState(false);
    const [isMidiActive, setIsMidiActive] = useState(false); // New MIDI activity state
    const midiActivityTimeoutRef = useRef<number | null>(null); // Ref for MIDI activity timeout

    const [masterVolume, setMasterVolumeState] = useState(masterGainNode.gain.value);
    const [masterEffects, setMasterEffects] = useState({ delayWetDry: 0, chorusWetDry: 0 });


    // DJ Deck States
    const [djDecksState, setDjDecksState] = useState<[DjDeckState, DjDeckState]>([
        { track: null, isPlaying: false, progress: 0, tempo: 1 },
        { track: null, isPlaying: false, progress: 0, tempo: 1 },
    ]);
    const [djMixerState, setDjMixerState] = useState<DjMixerState>({
        gainL: 1, gainR: 1, crossFader: 0.5,
    });

    // Music Player State
    const [musicPlayerState, setMusicPlayerState] = useState<MusicPlayerState>({
        playlist: [],
        currentTrackIndex: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
        tempoRate: 1,
        currentAudioBuffer: null, // Initializing new state
    });

    // Drum Machine State
    const [drumMachineState, setDrumMachineState] = useState<DrumMachineState>({
        isPlaying: false,
        currentStep: -1,
        bpm: 120,
        selectedKitIndex: 0,
        drumGrid: [], // Initialized when kit is loaded
        noteGrid: [],
        currentInstruments: [], // Initialized when kit is loaded
        songTitle: "New Beat",
        patternLength: 16,
        swingAmount: 0,
        metronomeOn: false,
        isLoadingSounds: false,
    });
    const drumAnalyserNode = useRef<AnalyserNode | null>(null);
    const drumBusGainNode = useRef<GainNode | null>(null); // Dedicated bus for drum machine analysis

    // ========================================================================================
    // --- MASTER CHANNEL CONTROLS & EFFECTS ---
    // ========================================================================================

    const setupMasterEffects = useCallback(() => {
        // Connect masterGainNode -> masterDelay -> masterAnalyserNode -> destination
        // Delay setup
        if (!masterDelayNodeRef.current) {
            masterDelayNodeRef.current = audioContext.createDelay(2.0); // Max delay of 2 seconds
            masterDelayFeedbackNodeRef.current = audioContext.createGain();
            masterDelayWetGainNodeRef.current = audioContext.createGain();
            masterDelayDryGainNodeRef.current = audioContext.createGain();

            // Delay line: input -> delay -> feedback -> delay -> wet gain
            masterDelayNodeRef.current.connect(masterDelayFeedbackNodeRef.current);
            masterDelayFeedbackNodeRef.current.connect(masterDelayNodeRef.current);
            masterDelayNodeRef.current.connect(masterDelayWetGainNodeRef.current);

            // Dry path: input -> dry gain
            masterDelayDryGainNodeRef.current.connect(masterAnalyserNode);
            masterDelayWetGainNodeRef.current.connect(masterAnalyserNode); // Connect wet signal to main chain

            masterGainNode.disconnect(); // Disconnect masterGain from masterAnalyserNode directly
            masterGainNode.connect(masterDelayDryGainNodeRef.current); // Dry signal
            masterGainNode.connect(masterDelayNodeRef.current); // Send signal to delay line
        }

        // Apply initial settings
        masterDelayWetGainNodeRef.current.gain.setValueAtTime(masterEffects.delayWetDry, audioContext.currentTime);
        masterDelayDryGainNodeRef.current.gain.setValueAtTime(1 - masterEffects.delayWetDry, audioContext.currentTime);
        masterDelayFeedbackNodeRef.current.gain.setValueAtTime(0.4, audioContext.currentTime); // Fixed feedback for now
    }, [masterEffects.delayWetDry]);

    useEffect(() => {
        setupMasterEffects();
    }, [setupMasterEffects]);

    const setMasterVolume = useCallback((volume: number) => {
        masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        setMasterVolumeState(volume);
    }, []);

    const handleMasterEffectChange = useCallback((param: 'delayWetDry' | 'chorusWetDry', value: number) => {
        setMasterEffects(prev => ({ ...prev, [param]: value }));

        if (param === 'delayWetDry' && masterDelayWetGainNodeRef.current && masterDelayDryGainNodeRef.current) {
            masterDelayWetGainNodeRef.current.gain.setValueAtTime(value, audioContext.currentTime);
            masterDelayDryGainNodeRef.current.gain.setValueAtTime(1 - value, audioContext.currentTime);
        }
        // Placeholder for chorus
    }, []);

    // ========================================================================================
    // --- DJ DECKS ---
    // ========================================================================================
    const setupDjDeckAudio = useCallback((index: 0 | 1) => {
        if (!deckAudioElementsRef.current[index]) {
            deckAudioElementsRef.current[index] = new Audio();
            deckAudioContextsRef.current[index] = new (window.AudioContext || (window as any).webkitAudioContext)(); // Separate context

            const audioEl = deckAudioElementsRef.current[index]!;
            const source = deckAudioContextsRef.current[index]!.createMediaElementSource(audioEl);
            const gainNode = deckAudioContextsRef.current[index]!.createGain();
            const pannerNode = deckAudioContextsRef.current[index]!.createStereoPanner();

            source.connect(gainNode);
            gainNode.connect(pannerNode);

            deckSourceNodesRef.current[index] = source;
            deckGainNodesRef.current[index] = gainNode;
            deckPannerNodesRef.current[index] = pannerNode;

            if (!deckCrossfaderNodeRef.current) {
                deckCrossfaderNodeRef.current = audioContext.createGain();
                deckCrossfaderNodeRef.current.connect(masterGainNode); // Connect crossfader output to master
            }
            pannerNode.connect(deckCrossfaderNodeRef.current);

            audioEl.onloadedmetadata = () => {
                setDjDecksState(prev => {
                    const newState = [...prev] as [DjDeckState, DjDeckState];
                    newState[index].progress = 0;
                    return newState;
                });
            };

            audioEl.ontimeupdate = () => {
                if (audioEl.duration > 0) {
                    setDjDecksState(prev => {
                        const newState = [...prev] as [DjDeckState, DjDeckState];
                        newState[index].progress = (audioEl.currentTime / audioEl.duration) * 100;
                        return newState;
                    });
                }
            };

            audioEl.onended = () => {
                setDjDecksState(prev => {
                    const newState = [...prev] as [DjDeckState, DjDeckState];
                    newState[index].isPlaying = false;
                    newState[index].progress = 0;
                    return newState;
                });
            };
        }
    }, []);

    useEffect(() => {
        setupDjDeckAudio(0);
        setupDjDeckAudio(1);
    }, [setupDjDeckAudio]);

    const togglePlayDeck = useCallback((index: 0 | 1) => {
        resumeAudioContext();
        const audioEl = deckAudioElementsRef.current[index];
        if (!audioEl || !djDecksState[index].track) return;

        if (djDecksState[index].isPlaying) {
            audioEl.pause();
        } else {
            audioEl.play();
        }

        setDjDecksState(prev => {
            const newState = [...prev] as [DjDeckState, DjDeckState];
            newState[index].isPlaying = !newState[index].isPlaying;
            return newState;
        });
    }, [djDecksState]);

    const loadTrackToDeck = useCallback((index: 0 | 1, file: File) => {
        const url = URL.createObjectURL(file);
        const audioEl = deckAudioElementsRef.current[index];
        if (audioEl) {
            audioEl.src = url;
            audioEl.load();
        }

        setDjDecksState(prev => {
            const newState = [...prev] as [DjDeckState, DjDeckState];
            newState[index].track = { name: file.name, url };
            newState[index].isPlaying = false;
            newState[index].progress = 0;
            return newState;
        });
        showToast(`Loaded "${file.name}" to Deck ${index + 1}.`, 'success');
    }, [showToast]);

    const setDeckTempo = useCallback((index: 0 | 1, tempo: number) => {
        const audioEl = deckAudioElementsRef.current[index];
        if (audioEl) {
            audioEl.playbackRate = tempo;
        }
        setDjDecksState(prev => {
            const newState = [...prev] as [DjDeckState, DjDeckState];
            newState[index].tempo = tempo;
            return newState;
        });
    }, []);

    const setDjMixer = useCallback((param: keyof DjMixerState, value: number) => {
        setDjMixerState(prev => {
            const newState = { ...prev, [param]: value };

            if (deckGainNodesRef.current[0] && deckGainNodesRef.current[1] && deckCrossfaderNodeRef.current) {
                // Apply individual deck gains
                deckGainNodesRef.current[0].gain.setValueAtTime(newState.gainL, audioContext.currentTime);
                deckGainNodesRef.current[1].gain.setValueAtTime(newState.gainR, audioContext.currentTime);

                // Apply crossfader logic
                const normalizedCrossfader = newState.crossFader; // 0 to 1
                const gainA = Math.cos(normalizedCrossfader * 0.5 * Math.PI); // 1 to 0 (for left)
                const gainB = Math.cos((1 - normalizedCrossfader) * 0.5 * Math.PI); // 0 to 1 (for right)

                // Connect deck panners directly to crossfader, then crossfader to master
                if (deckPannerNodesRef.current[0]) {
                    deckPannerNodesRef.current[0]!.disconnect();
                    deckPannerNodesRef.current[0]!.connect(deckCrossfaderNodeRef.current!);
                    deckCrossfaderNodeRef.current!.gain.setValueAtTime(gainA, audioContext.currentTime);
                }
                if (deckPannerNodesRef.current[1]) {
                    deckPannerNodesRef.current[1]!.disconnect();
                    deckPannerNodesRef.current[1]!.connect(deckCrossfaderNodeRef.current!);
                    deckCrossfaderNodeRef.current!.gain.setValueAtTime(gainB, audioContext.currentTime);
                }
            }
            return newState;
        });
    }, []);


    // ========================================================================================
    // --- MUSIC PLAYER ---
    // ========================================================================================

    const setupMusicPlayerAudio = useCallback(() => {
        if (!musicPlayerAudioRef.current) {
            musicPlayerAudioRef.current = new Audio();
            musicPlayerSourceNodeRef.current = audioContext.createMediaElementSource(musicPlayerAudioRef.current);
            musicPlayerGainNodeRef.current = audioContext.createGain();

            musicPlayerSourceNodeRef.current.connect(musicPlayerGainNodeRef.current);
            musicPlayerGainNodeRef.current.connect(masterGainNode); // Connect to master output

            musicPlayerAudioRef.current.volume = musicPlayerState.volume;
            musicPlayerAudioRef.current.playbackRate = musicPlayerState.tempoRate;

            musicPlayerAudioRef.current.onloadedmetadata = () => {
                setMusicPlayerState(prev => ({
                    ...prev,
                    duration: musicPlayerAudioRef.current!.duration,
                }));
            };
            musicPlayerAudioRef.current.onended = () => {
                playNext();
            };

            musicPlayerAudioRef.current.ontimeupdate = () => {
                if (musicPlayerAudioRef.current && musicPlayerAudioRef.current.duration > 0) {
                    setMusicPlayerState(prev => ({
                        ...prev,
                        currentTime: musicPlayerAudioRef.current!.currentTime,
                        progress: (musicPlayerAudioRef.current!.currentTime / musicPlayerAudioRef.current!.duration) * 100,
                    }));
                }
            };
        }
    }, [musicPlayerState.volume, musicPlayerState.tempoRate]);

    useEffect(() => {
        setupMusicPlayerAudio();
    }, [setupMusicPlayerAudio]);

    const playMusicPlayerTrack = useCallback(async (index: number) => {
        resumeAudioContext();
        const audio = musicPlayerAudioRef.current;
        if (!audio || index < 0 || index >= musicPlayerState.playlist.length) return;

        // If the same track is clicked and already playing, pause it.
        if (musicPlayerState.currentTrackIndex === index && musicPlayerState.isPlaying) {
            audio.pause();
            setMusicPlayerState(prev => ({ ...prev, isPlaying: false }));
            return;
        }

        const track = musicPlayerState.playlist[index];
        audio.src = track.url;
        audio.load();

        try {
            await audio.play();
            // Fetch and decode audio buffer for waveform display
            const response = await fetch(track.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            setMusicPlayerState(prev => ({
                ...prev,
                currentTrackIndex: index,
                isPlaying: true,
                duration: audio.duration, // Should be set by onloadedmetadata, but ensure it's here too
                currentTime: 0,
                progress: 0,
                currentAudioBuffer: audioBuffer, // Set the new audio buffer
            }));
        } catch (error) {
            console.error("Error playing track:", track.name, error);
            showToast(`Failed to play "${track.name}".`, 'error');
            setMusicPlayerState(prev => ({ ...prev, isPlaying: false, currentAudioBuffer: null }));
        }
        localStorage.setItem(`music_player_playlist_${currentUser?.username}`, JSON.stringify(musicPlayerState.playlist));
    }, [musicPlayerState.playlist, showToast, currentUser]);

    const togglePlayPause = useCallback(() => {
        const audio = musicPlayerAudioRef.current;
        if (!audio || musicPlayerState.currentTrackIndex === null) return;

        if (musicPlayerState.isPlaying) {
            audio.pause();
            setMusicPlayerState(prev => ({ ...prev, isPlaying: false }));
        } else {
            audio.play();
            setMusicPlayerState(prev => ({ ...prev, isPlaying: true }));
        }
    }, [musicPlayerState.isPlaying, musicPlayerState.currentTrackIndex]);

    const playNext = useCallback(() => {
        if (musicPlayerState.playlist.length === 0) return;
        const nextIndex = musicPlayerState.currentTrackIndex === null
            ? 0
            : (musicPlayerState.currentTrackIndex + 1) % musicPlayerState.playlist.length;
        playMusicPlayerTrack(nextIndex);
    }, [musicPlayerState.playlist, musicPlayerState.currentTrackIndex, playMusicPlayerTrack]);

    const playPrev = useCallback(() => {
        if (musicPlayerState.playlist.length === 0) return;
        const prevIndex = musicPlayerState.currentTrackIndex === null
            ? musicPlayerState.playlist.length - 1
            : (musicPlayerState.currentTrackIndex - 1 + musicPlayerState.playlist.length) % musicPlayerState.playlist.length;
        playMusicPlayerTrack(prevIndex);
    }, [musicPlayerState.playlist, musicPlayerState.currentTrackIndex, playMusicPlayerTrack]);

    const setMusicPlayerVolume = useCallback((volume: number) => {
        const audio = musicPlayerAudioRef.current;
        if (audio) audio.volume = volume;
        setMusicPlayerState(prev => ({ ...prev, volume }));
        if (musicPlayerGainNodeRef.current) musicPlayerGainNodeRef.current.gain.setValueAtTime(volume, audioContext.currentTime);
    }, []);

    const setMusicPlayerTempo = useCallback((rate: number) => {
        const audio = musicPlayerAudioRef.current;
        if (audio) audio.playbackRate = rate;
        setMusicPlayerState(prev => ({ ...prev, tempoRate: rate }));
    }, []);

    const seekMusicPlayer = useCallback((progress: number) => {
        const audio = musicPlayerAudioRef.current;
        if (audio && audio.duration) {
            audio.currentTime = (progress / 100) * audio.duration;
            setMusicPlayerState(prev => ({ ...prev, progress, currentTime: audio.currentTime }));
        }
    }, []);

    const addTrack = useCallback(async (name: string, url: string) => {
        const newTrack: Track = { name, url };
        setMusicPlayerState(prev => {
            const updatedPlaylist = [...prev.playlist, newTrack];
            // If first track, start playing it
            if (prev.playlist.length === 0) {
                // playMusicPlayerTrack is async, can't call directly in state update.
                // Call it outside after state is updated or use useEffect.
                setTimeout(() => playMusicPlayerTrack(0), 0);
            }
            localStorage.setItem(`music_player_playlist_${currentUser?.username}`, JSON.stringify(updatedPlaylist));
            return { ...prev, playlist: updatedPlaylist };
        });
        showToast(`Added "${name}" to playlist.`, 'success');
    }, [playMusicPlayerTrack, showToast, currentUser]);

    const addTrackFromUrl = useCallback((url: string) => {
        const name = url.split('/').pop()?.split('?')[0] || 'Unknown Track';
        addTrack(name, url);
    }, [addTrack]);

    const addTrackFromFile = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        addTrack(file.name, url);
    }, [addTrack]);

    const removeTrack = useCallback((index: number) => {
        setMusicPlayerState(prev => {
            const newPlaylist = prev.playlist.filter((_, i) => i !== index);
            let newCurrentTrackIndex = prev.currentTrackIndex;

            if (newCurrentTrackIndex === index) {
                // If the current track is removed, stop playback and reset
                musicPlayerAudioRef.current?.pause();
                musicPlayerAudioRef.current!.src = '';
                newCurrentTrackIndex = null;
            } else if (newCurrentTrackIndex !== null && newCurrentTrackIndex > index) {
                // Adjust index if a track before it was removed
                newCurrentTrackIndex--;
            }

            localStorage.setItem(`music_player_playlist_${currentUser?.username}`, JSON.stringify(newPlaylist));
            return {
                ...prev,
                playlist: newPlaylist,
                currentTrackIndex: newCurrentTrackIndex,
                isPlaying: newCurrentTrackIndex !== null,
                currentTime: 0,
                duration: 0,
                progress: 0,
                currentAudioBuffer: null,
            };
        });
        showToast('Track removed from playlist.', 'info');
    }, [showToast, currentUser]);

    const savePlaylist = useCallback(() => {
        if (musicPlayerState.playlist.length === 0) {
            showToast('Playlist is empty, nothing to save.', 'error');
            return;
        }
        const blob = new Blob([JSON.stringify(musicPlayerState.playlist)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/T|:/g, '-');
        a.download = `smuve-playlist-${timestamp}.json`;
        document.body.appendChild(a);
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Playlist saved to file!', 'success');
    }, [musicPlayerState.playlist, showToast]);

    const loadPlaylist = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedPlaylist: Track[] = JSON.parse(e.target?.result as string);
                if (Array.isArray(loadedPlaylist) && loadedPlaylist.every(t => t.name && t.url)) {
                    setMusicPlayerState(prev => ({
                        ...prev,
                        playlist: loadedPlaylist,
                        currentTrackIndex: null, // Reset current track
                        isPlaying: false,
                        currentTime: 0,
                        duration: 0,
                        progress: 0,
                        currentAudioBuffer: null,
                    }));
                    showToast('Playlist loaded successfully!', 'success');
                    localStorage.setItem(`music_player_playlist_${currentUser?.username}`, JSON.stringify(loadedPlaylist));
                    // Optionally start playing the first track
                    if (loadedPlaylist.length > 0) {
                        setTimeout(() => playMusicPlayerTrack(0), 0);
                    }
                } else {
                    throw new Error('Invalid playlist format.');
                }
            } catch (error) {
                console.error("Failed to load playlist:", error);
                showToast('Failed to load playlist file.', 'error');
            }
        };
        reader.readAsText(file);
    }, [playMusicPlayerTrack, showToast, currentUser]);


    // ========================================================================================
    // --- SESSION PERSISTENCE ---
    // ========================================================================================

    const saveSession = useCallback(() => {
        if (!currentUser) return;
        try {
            // Exclude non-serializable properties, especially videoStream and audioBuffer
            const sessionData = { clips: clips.map(c => ({ ...c, audioBuffer: undefined, videoStream: undefined, isPlaying: false })) };
            localStorage.setItem(`vocal_booth_session_${currentUser.username}`, JSON.stringify(sessionData));
            showToast('Vocal Booth session saved!', 'success');
        } catch (e) {
            console.error("Failed to save session", e);
            showToast('Failed to save session.', 'error');
        }
    }, [clips, currentUser, showToast]);

    const loadSession = useCallback((options?: { fromFile?: File }) => {
        const handleLoad = (jsonData: string) => {
            try {
                const sessionData = JSON.parse(jsonData);
                if (sessionData && Array.isArray(sessionData.clips)) {
                    setClips([]); // Clear existing clips
                    // Using Promise.all to load all clips concurrently and then set state once
                    Promise.all(sessionData.clips.map((clipData: any) => {
                        if (clipData.type === 'video' && clipData.videoUrl) {
                            // For video clips, reconstruct only the necessary properties. No audioBuffer to decode.
                            return Promise.resolve({ ...clipData, isPlaying: false, audioBuffer: undefined, videoStream: undefined });
                        } else if (clipData.type !== 'video' && clipData.url) {
                            // Only load audio buffer for non-video clips that have a URL
                            return fetch(clipData.url)
                                .then(response => response.arrayBuffer())
                                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                                .then(audioBuffer => ({ ...clipData, audioBuffer, isPlaying: false }))
                                .catch(e => {
                                    console.error(`Failed to load clip ${clipData.name} from URL:`, e);
                                    showToast(`Failed to load audio for "${clipData.name}".`, 'error');
                                    return null; // Return null for failed loads
                                });
                        }
                        return Promise.resolve(null); // Handle clips with no URL or other types
                    }))
                        .then(loadedClips => {
                            setClips(loadedClips.filter(c => c !== null) as Clip[]); // Filter out nulls
                            showToast('Session loaded successfully!', 'info');
                        });
                }
            } catch (e) {
                console.error("Failed to parse or load session data", e);
                showToast('Failed to load session file.', 'error');
            }
        };

        if (options?.fromFile) {
            const reader = new FileReader();
            reader.onload = (e) => handleLoad(e.target?.result as string);
            reader.readAsText(options.fromFile);
        } else if (currentUser) {
            const savedData = localStorage.getItem(`vocal_booth_session_${currentUser.username}`);
            if (savedData) handleLoad(savedData);
        }
    }, [currentUser, showToast]);

    // Drum Machine persistence logic
    const saveDrumPattern = useCallback(() => {
        if (!currentUser) return;
        try {
            const patternData = {
                bpm: drumMachineState.bpm,
                selectedKitIndex: drumMachineState.selectedKitIndex,
                drumGrid: drumMachineState.drumGrid,
                noteGrid: drumMachineState.noteGrid,
                songTitle: drumMachineState.songTitle,
                patternLength: drumMachineState.patternLength,
                swingAmount: drumMachineState.swingAmount,
            };
            localStorage.setItem(`drum_machine_pattern_${currentUser.username}`, JSON.stringify(patternData));
            showToast('Drum pattern saved!', 'success');
        } catch (e) {
            console.error("Failed to save drum pattern", e);
            showToast('Failed to save drum pattern.', 'error');
        }
    }, [drumMachineState, currentUser, showToast]);

    const loadDrumPattern = useCallback((file?: File) => {
        const handleLoad = (jsonData: string) => {
            try {
                const patternData = JSON.parse(jsonData);
                if (patternData) {
                    setDrumMachineState(prev => ({
                        ...prev,
                        bpm: patternData.bpm || prev.bpm,
                        selectedKitIndex: patternData.selectedKitIndex !== undefined ? patternData.selectedKitIndex : prev.selectedKitIndex,
                        drumGrid: patternData.drumGrid || prev.drumGrid,
                        noteGrid: patternData.noteGrid || prev.noteGrid,
                        songTitle: patternData.songTitle || prev.songTitle,
                        patternLength: patternData.patternLength || prev.patternLength,
                        swingAmount: patternData.swingAmount || prev.swingAmount,
                    }));
                    // Reload kit to ensure instruments are loaded
                    setDrumKit(patternData.selectedKitIndex !== undefined ? patternData.selectedKitIndex : drumMachineState.selectedKitIndex);
                    showToast('Drum pattern loaded!', 'info');
                }
            } catch (e) {
                console.error("Failed to parse or load drum pattern data", e);
                showToast('Failed to load drum pattern file.', 'error');
            }
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => handleLoad(e.target?.result as string);
            reader.readAsText(file);
        } else if (currentUser) {
            const savedData = localStorage.getItem(`drum_machine_pattern_${currentUser.username}`);
            if (savedData) handleLoad(savedData);
        }
    }, [currentUser, showToast, drumMachineState.selectedKitIndex]);


    // ========================================================================================
    // --- VOCAL BOOTH (AUDIO RECORDER) & RECORDING ENGINE ---
    // ========================================================================================

    const addClip = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            audioContext.decodeAudioData(e.target!.result as ArrayBuffer).then(buffer => {
                const newClip: Clip = {
                    id: Date.now(),
                    name: file.name,
                    url,
                    isPlaying: false,
                    audioBuffer: buffer,
                    playbackCurrentTime: 0,
                    playbackDuration: buffer.duration,
                    type: 'audio',
                    metadata: { title: file.name, artist: currentUser?.username || 'Unknown', album: 'My Project', genre: 'Unspecified', comments: '' },
                    mixer: {
                        volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0,
                        compressorThreshold: -24, compressorRatio: 4, compressorAttack: 0.003, compressorRelease: 0.25,
                        reverbWetDry: 0, autoTuneOn: false, autoTuneAmount: 0.5, limiterOn: false, noiseGateOn: false, noiseGateThreshold: -60,
                        pitch: 0, tempo: 1
                    }
                };
                setClips(prev => [...prev, newClip]);
                showToast(`Clip "${file.name}" added to Vocal Booth.`, 'success');
            }).catch(error => {
                console.error("Error decoding audio data:", error);
                showToast(`Failed to decode audio for "${file.name}".`, 'error');
            });
        };
        reader.readAsArrayBuffer(file);
    }, [currentUser, showToast]);

    const addVideoClip = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        // For video files, we don't load audioBuffer immediately
        const newClip: Clip = {
            id: Date.now(),
            name: file.name,
            url, // The video file URL
            isPlaying: false,
            audioBuffer: undefined, // No audio buffer for video clips initially
            videoUrl: url,
            playbackCurrentTime: 0,
            playbackDuration: 0, // Will be updated by video element onloadedmetadata
            type: 'video',
            metadata: { title: file.name, artist: currentUser?.username || 'Unknown', album: 'My Video Project', genre: 'Unspecified', comments: '' },
            mixer: {
                volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0,
                compressorThreshold: -24, compressorRatio: 4, compressorAttack: 0.003, compressorRelease: 0.25,
                reverbWetDry: 0, autoTuneOn: false, autoTuneAmount: 0.5, limiterOn: false, noiseGateOn: false, noiseGateThreshold: -60,
                pitch: 0, tempo: 1
            }
        };
        setClips(prev => [...prev, newClip]);
        showToast(`Video clip "${file.name}" added to Vocal Booth.`, 'success');
    }, [currentUser, showToast]);


    const startRecording = useCallback(async (captureVideo: boolean) => {
        if (isRecording) return;
        resumeAudioContext();
        try {
            const constraints: MediaStreamConstraints = { audio: { deviceId: recordingState.selectedInput ? { exact: recordingState.selectedInput } : undefined } };
            if (captureVideo) {
                constraints.video = { width: { ideal: 640 }, height: { ideal: 480 } }; // Request reasonable video size
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            inputStreamRef.current = stream;

            const source = audioContext.createMediaStreamSource(stream);
            const gain = audioContext.createGain(); gain.gain.value = recordingState.inputGain;
            const analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;

            source.connect(gain);
            gain.connect(analyser);
            if (recordingState.monitorOn) analyser.connect(masterGainNode); // Connect to master if monitoring is ON

            inputStreamSourceRef.current = source;
            inputGainNodeRef.current = gain;
            inputAnalyserNodeRef.current = analyser;
            setRecordingState(prev => ({ ...prev, inputAnalyserNode: analyser, videoStream: captureVideo ? stream : null })); // Store video stream for preview

            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => recordedChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: captureVideo ? 'video/webm' : 'audio/wav' }); // WebM is good for video
                const filename = captureVideo ? `VideoRecording-${Date.now()}.webm` : `AudioRecording-${Date.now()}.wav`;
                const file = new File([blob], filename);

                if (captureVideo) {
                    addVideoClip(file);
                } else {
                    addClip(file);
                }
                recordedChunksRef.current = [];
            };

            const dataArray = new Float32Array(analyser.frequencyBinCount);
            const draw = () => {
                if (inputAnalyserNodeRef.current) {
                    inputAnalyserNodeRef.current.getFloatTimeDomainData(dataArray);
                    setRecordingState(prev => ({ ...prev, waveformData: new Float32Array(dataArray) }));
                }
                animationFrameIdRecRef.current = requestAnimationFrame(draw);
            };

            if (recordingState.countInOn) {
                setRecordingState(prev => ({ ...prev, status: 'counting-in', countIn: 4 }));
                let count = 4;
                const countInInterval = setInterval(() => {
                    count--;
                    setRecordingState(prev => ({ ...prev, countIn: count }));
                    if (count <= 0) {
                        clearInterval(countInInterval);
                        setRecordingState(prev => ({ ...prev, status: 'recording' }));
                        mediaRecorderRef.current?.start();
                        draw();
                    }
                }, 60000 / recordingState.metronomeBpm);
            } else {
                setRecordingState(prev => ({ ...prev, status: 'recording' }));
                mediaRecorderRef.current?.start();
                draw();
            }
        } catch (err) {
            console.error("Error starting recording:", err);
            showToast("Could not start recording. Check mic/camera permissions.", 'error');
            setRecordingState(prev => ({ ...prev, status: 'ready', videoStream: null })); // Reset video stream on error
        }
    }, [isRecording, recordingState, showToast, addClip, addVideoClip, masterGainNode]);

    const stopRecording = useCallback(() => {
        if (!isRecording) return;
        mediaRecorderRef.current?.stop();
        inputStreamRef.current?.getTracks().forEach(track => track.stop());
        if (animationFrameIdRecRef.current) cancelAnimationFrame(animationFrameIdRecRef.current);
        // Disconnect analyser if it was connected to masterGainNode
        if (inputAnalyserNodeRef.current && recordingState.monitorOn) {
            inputAnalyserNodeRef.current.disconnect(masterGainNode);
        }
        setRecordingState(prev => ({ ...prev, status: 'ready', waveformData: null, videoStream: null, inputAnalyserNode: null }));
    }, [isRecording, recordingState.monitorOn, masterGainNode]);

    const recordingCallbacks = {
        setInputDevice: (deviceId: string) => setRecordingState(prev => ({ ...prev, selectedInput: deviceId })),
        setInputGain: (gain: number) => {
            if (inputGainNodeRef.current) inputGainNodeRef.current.gain.setValueAtTime(gain, audioContext.currentTime);
            setRecordingState(prev => ({ ...prev, inputGain: gain }));
        },
        toggleMetronome: () => setRecordingState(prev => ({ ...prev, metronomeOn: !prev.metronomeOn })),
        setMetronomeBpm: (bpm: number) => setRecordingState(prev => ({ ...prev, metronomeBpm: bpm })),
        toggleCountIn: () => setRecordingState(prev => ({ ...prev, countInOn: !prev.countInOn })),
        toggleMonitor: () => {
            const willBeOn = !recordingState.monitorOn;
            if (inputAnalyserNodeRef.current) {
                inputAnalyserNodeRef.current.disconnect(); // Disconnect from previous
                if (willBeOn) inputAnalyserNodeRef.current.connect(masterGainNode); // Connect to master if monitoring
            }
            setRecordingState(prev => ({ ...prev, monitorOn: willBeOn }));
        },
    };

    // Vocal Booth: other functions (playClip, deleteClip, handleClipMixerChange, etc.) would be here
    // ...

    const deleteClip = useCallback((id: number) => {
        setClips(prevClips => {
            const newClips = prevClips.filter(clip => clip.id !== id);
            // Stop playback if this clip was playing
            if (clipSourcesRef.current.has(id)) {
                const sourceOrVideo = clipSourcesRef.current.get(id);
                if (sourceOrVideo && 'stop' in sourceOrVideo) { // AudioBufferSourceNode
                    sourceOrVideo.stop();
                    sourceOrVideo.disconnect();
                } else if (sourceOrVideo && 'pause' in sourceOrVideo) { // HTMLVideoElement
                    (sourceOrVideo as HTMLVideoElement).pause();
                    (sourceOrVideo as HTMLVideoElement).remove(); // Remove from DOM
                }
                clipSourcesRef.current.delete(id);
            }
            showToast('Clip deleted.', 'info');
            return newClips;
        });
    }, [showToast]);

    const playClip = useCallback((id: number) => {
        resumeAudioContext();
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === id) {
                if (clipSourcesRef.current.has(id)) {
                    // If already playing, stop it first
                    const existingSource = clipSourcesRef.current.get(id);
                    if (existingSource && 'stop' in existingSource) {
                        (existingSource as AudioBufferSourceNode).stop();
                    } else if (existingSource && 'pause' in existingSource) {
                        (existingSource as HTMLVideoElement).pause();
                        (existingSource as HTMLVideoElement).remove();
                    }
                    (existingSource as AudioNode)?.disconnect(); // Disconnect the source node
                    clipSourcesRef.current.delete(id);
                }

                if (clip.type === 'video') {
                    const videoElement = document.createElement('video');
                    videoElement.src = clip.videoUrl || clip.url;
                    videoElement.controls = true;
                    videoElement.autoplay = true;
                    videoElement.style.display = 'none'; // Play in background

                    const sourceNode = audioContext.createMediaElementSource(videoElement);

                    const gainNode = audioContext.createGain();
                    gainNode.gain.setValueAtTime(clip.mixer.volume, audioContext.currentTime);

                    const pannerNode = audioContext.createStereoPanner();
                    pannerNode.pan.setValueAtTime(clip.mixer.pan, audioContext.currentTime);

                    const lowEq = audioContext.createBiquadFilter(); lowEq.type = "lowshelf"; lowEq.frequency.setValueAtTime(250, audioContext.currentTime); lowEq.gain.setValueAtTime(clip.mixer.eqLow, audioContext.currentTime);
                    const midEq = audioContext.createBiquadFilter(); midEq.type = "peaking"; midEq.frequency.setValueAtTime(1000, audioContext.currentTime); midEq.Q.setValueAtTime(1.0, audioContext.currentTime); midEq.gain.setValueAtTime(clip.mixer.eqMid, audioContext.currentTime);
                    const highEq = audioContext.createBiquadFilter(); highEq.type = "highshelf"; highEq.frequency.setValueAtTime(4000, audioContext.currentTime); highEq.gain.setValueAtTime(clip.mixer.eqHigh, audioContext.currentTime);

                    sourceNode.connect(gainNode);
                    gainNode.connect(pannerNode);
                    pannerNode.connect(lowEq);
                    lowEq.connect(midEq);
                    midEq.connect(highEq);
                    highEq.connect(masterGainNode);

                    clipSourcesRef.current.set(id, videoElement); // Store video element for stopping

                    videoElement.onended = () => {
                        clipSourcesRef.current.delete(id);
                        sourceNode.disconnect();
                        videoElement.remove();
                        setClips(current => current.map(c =>
                            c.id === id ? { ...c, isPlaying: false, playbackCurrentTime: 0 } : c
                        ));
                    };
                    return { ...clip, isPlaying: true };

                } else if (!clip.audioBuffer) {
                    console.error("No audio buffer for clip:", clip.name);
                    showToast(`Cannot play "${clip.name}": audio not loaded.`, 'error');
                    return { ...clip, isPlaying: false };
                }

                const source = audioContext.createBufferSource();
                source.buffer = clip.audioBuffer;
                source.playbackRate.value = clip.mixer.tempo;

                // Create a chain of nodes for mixer effects
                const gainNode = audioContext.createGain();
                gainNode.gain.value = clip.mixer.volume;

                const pannerNode = audioContext.createStereoPanner();
                pannerNode.pan.value = clip.mixer.pan;

                const lowEq = audioContext.createBiquadFilter();
                lowEq.type = "lowshelf";
                lowEq.frequency.setValueAtTime(250, audioContext.currentTime);
                lowEq.gain.setValueAtTime(clip.mixer.eqLow, audioContext.currentTime);

                const midEq = audioContext.createBiquadFilter();
                midEq.type = "peaking";
                midEq.frequency.setValueAtTime(1000, audioContext.currentTime);
                midEq.Q.setValueAtTime(1.0, audioContext.currentTime);
                midEq.gain.setValueAtTime(clip.mixer.eqMid, audioContext.currentTime);

                const highEq = audioContext.createBiquadFilter();
                highEq.type = "highshelf";
                highEq.frequency.setValueAtTime(4000, audioContext.currentTime);
                highEq.gain.setValueAtTime(clip.mixer.eqHigh, audioContext.currentTime);

                // Connect the chain: source -> gain -> panner -> EQ -> master
                source.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(lowEq);
                lowEq.connect(midEq);
                midEq.connect(highEq);
                highEq.connect(masterGainNode); // Eventually connects to the master output

                source.start(0, clip.playbackCurrentTime);
                clipSourcesRef.current.set(id, source);

                source.onended = () => {
                    clipSourcesRef.current.delete(id);
                    source.disconnect(); // Disconnect source node
                    setClips(current => current.map(c =>
                        c.id === id ? { ...c, isPlaying: false, playbackCurrentTime: 0 } : c
                    ));
                };

                return { ...clip, isPlaying: true };
            } else {
                // Stop other playing clips if we implement solo or single-play mode
                // For now, allow multiple clips to play
                return clip;
            }
        }));
    }, [showToast, masterGainNode]);

    const stopClip = useCallback((id: number) => {
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === id && clipSourcesRef.current.has(id)) {
                const sourceOrVideo = clipSourcesRef.current.get(id);
                if (sourceOrVideo && 'stop' in sourceOrVideo) { // AudioBufferSourceNode
                    (sourceOrVideo as AudioBufferSourceNode).stop();
                } else if (sourceOrVideo && 'pause' in sourceOrVideo) { // HTMLVideoElement
                    (sourceOrVideo as HTMLVideoElement).pause();
                    (sourceOrVideo as HTMLVideoElement).remove(); // Remove from DOM
                }
                (sourceOrVideo as AudioNode)?.disconnect(); // Disconnect the source node
                clipSourcesRef.current.delete(id);
                return { ...clip, isPlaying: false, playbackCurrentTime: 0 };
            }
            return clip;
        }));
    }, []);

    const handleClipMixerChange = useCallback((id: number, param: string, value: number) => {
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === id) {
                const updatedMixer = { ...clip.mixer, [param]: value };
                // For real-time effect, `playClip` would need to be re-called,
                // or specific nodes would need to be updated. (Currently just updates state)
                return { ...clip, mixer: updatedMixer };
            }
            return clip;
        }));
    }, []);

    const handleClipToggle = useCallback((id: number, param: keyof Clip['mixer']) => {
        setClips(prevClips => prevClips.map(clip => {
            if (clip.id === id) {
                const updatedMixer = { ...clip.mixer, [param]: !clip.mixer[param] };
                return { ...clip, mixer: updatedMixer };
            }
            return clip;
        }));
    }, []);

    const addSynthTrack = useCallback(() => {
        const newClip: Clip = {
            id: Date.now(),
            name: "Synth Track " + (clips.filter(c => c.type === 'synth').length + 1),
            url: '', // Synth tracks don't have a direct URL
            isPlaying: false,
            audioBuffer: null, // No pre-loaded buffer for synth
            playbackCurrentTime: 0,
            playbackDuration: 0,
            type: 'synth',
            synthSettings: { waveform: 'sine' },
            metadata: { title: "Synth Track", artist: currentUser?.username || 'Unknown', album: 'My Project', genre: 'Synth', comments: '' },
            mixer: {
                volume: 0.7, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0,
                compressorThreshold: -24, compressorRatio: 4, compressorAttack: 0.003, compressorRelease: 0.25,
                reverbWetDry: 0, autoTuneOn: false, autoTuneAmount: 0.5, limiterOn: false, noiseGateOn: false, noiseGateThreshold: -60,
                pitch: 0, tempo: 1
            }
        };
        setClips(prev => [...prev, newClip]);
        showToast('Synth track added to Vocal Booth.', 'success');
    }, [clips, currentUser, showToast]);

    const handleClipMetadataChange = useCallback((id: number, field: keyof Clip['metadata'], value: string) => {
        setClips(prevClips => prevClips.map(clip =>
            clip.id === id ? { ...clip, metadata: { ...clip.metadata, [field]: value } } : clip
        ));
    }, []);

    const handleSynthWaveformChange = useCallback((id: number, waveform: 'sine' | 'sawtooth' | 'square') => {
        setClips(prevClips => prevClips.map(clip =>
            clip.id === id && clip.type === 'synth' && clip.synthSettings
                ? { ...clip, synthSettings: { ...clip.synthSettings, waveform } }
                : clip
        ));
    }, []);

    class WavEncoder {
        encode(audioData: { sampleRate: number; channelData: Float32Array[] }): Promise<ArrayBuffer> {
            const { sampleRate, channelData } = audioData;
            const numberOfChannels = channelData.length;
            const length = channelData[0].length;
            const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
            const view = new DataView(buffer);
            let offset = 0;

            // Write WAV header
            this.writeString(view, offset, 'RIFF'); offset += 4;
            view.setUint32(offset, 36 + length * numberOfChannels * 2, true); offset += 4;
            this.writeString(view, offset, 'WAVE'); offset += 4;
            this.writeString(view, offset, 'fmt '); offset += 4;
            view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size for PCM
            view.setUint16(offset, 1, true); offset += 2; // AudioFormat (1 = PCM)
            view.setUint16(offset, numberOfChannels, true); offset += 2; // NumChannels
            view.setUint32(offset, sampleRate, true); offset += 4; // SampleRate
            view.setUint32(offset, sampleRate * numberOfChannels * 2, true); offset += 4; // ByteRate
            view.setUint16(offset, numberOfChannels * 2, true); offset += 2; // BlockAlign
            view.setUint16(offset, 16, true); offset += 2; // BitsPerSample
            this.writeString(view, offset, 'data'); offset += 4;
            view.setUint32(offset, length * numberOfChannels * 2, true); offset += 4;

            // Write PCM data
            for (let i = 0; i < length; i++) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                    const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
                    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                    offset += 2;
                }
            }
            return Promise.resolve(buffer);
        }

        private writeString(view: DataView, offset: number, s: string) {
            for (let i = 0; i < s.length; i++) {
                view.setUint8(offset + i, s.charCodeAt(i));
            }
        }
    }

    const exportMixAsWav = useCallback(async () => {
        setIsExporting(true);
        showToast('Exporting mix... This may take a moment.', 'info');
        try {
            let maxDuration = 0;
            if (clips.length > 0) {
                // For simplicity, only audio clips are mixed. Video clips are not rendered to WAV.
                maxDuration = Math.max(...clips.filter(c => c.type !== 'video').map(c => c.audioBuffer?.duration || 0));
            } else {
                showToast('No clips to export.', 'error');
                setIsExporting(false);
                return;
            }
            // Add a small buffer to maxDuration to ensure all sounds fully render
            const offlineRenderContext = new OfflineAudioContext(2, (maxDuration + 2) * audioContext.sampleRate, audioContext.sampleRate);

            for (const clip of clips) {
                // Only process audio-type clips for WAV export
                if (clip.type === 'audio' && clip.audioBuffer) {
                    const source = offlineRenderContext.createBufferSource();
                    source.buffer = clip.audioBuffer;
                    source.playbackRate.value = clip.mixer.tempo;

                    const gainNode = offlineRenderContext.createGain();
                    gainNode.gain.value = clip.mixer.volume;

                    const pannerNode = offlineRenderContext.createStereoPanner();
                    pannerNode.pan.value = clip.mixer.pan;

                    const lowEq = offlineRenderContext.createBiquadFilter();
                    lowEq.type = "lowshelf"; lowEq.frequency.setValueAtTime(250, offlineRenderContext.currentTime); lowEq.gain.setValueAtTime(clip.mixer.eqLow, offlineRenderContext.currentTime);
                    const midEq = offlineRenderContext.createBiquadFilter();
                    midEq.type = "peaking"; midEq.frequency.setValueAtTime(1000, offlineRenderContext.currentTime); midEq.Q.setValueAtTime(1.0, offlineRenderContext.currentTime);
                    midEq.gain.setValueAtTime(clip.mixer.eqMid, offlineRenderContext.currentTime);
                    const highEq = offlineRenderContext.createBiquadFilter();
                    highEq.type = "highshelf"; highEq.frequency.setValueAtTime(4000, offlineRenderContext.currentTime); highEq.gain.setValueAtTime(clip.mixer.eqHigh, offlineRenderContext.currentTime);

                    source.connect(gainNode);
                    gainNode.connect(pannerNode);
                    pannerNode.connect(lowEq);
                    lowEq.connect(midEq);
                    midEq.connect(highEq);
                    highEq.connect(offlineRenderContext.destination);
                    source.start(0);
                }
            }
            const renderedBuffer = await offlineRenderContext.startRendering();

            // Convert to WAV
            const wavEncoder = new WavEncoder();
            const wavBuffer = await wavEncoder.encode({
                sampleRate: renderedBuffer.sampleRate,
                channelData: Array.from({ length: renderedBuffer.numberOfChannels }, (_, i) => renderedBuffer.getChannelData(i)),
            });

            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/T|:/g, '-');
            a.download = `smuve-mix-${timestamp}.wav`;
            document.body.appendChild(a);
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Mix exported successfully!', 'success');
        } catch (error) {
            console.error("Error exporting mix:", error);
            showToast('Failed to export mix. Please try again.', 'error');
        } finally {
            setIsExporting(false);
        }
    }, [clips, showToast]);

    const addClipFromSample = useCallback(async (sample: { name: string, url: string }) => {
        try {
            const response = await fetch(sample.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const newClip: Clip = {
                id: Date.now(),
                name: sample.name,
                url: sample.url,
                isPlaying: false,
                audioBuffer: audioBuffer,
                playbackCurrentTime: 0,
                playbackDuration: audioBuffer.duration,
                type: 'audio',
                metadata: { title: sample.name, artist: currentUser?.username || 'Unknown', album: 'Sample Library', genre: sample.name, comments: 'From S.M.U.V.E. Sample Library' },
                mixer: {
                    volume: 1, pan: 0, eqLow: 0, eqMid: 0, eqHigh: 0,
                    compressorThreshold: -24, compressorRatio: 4, compressorAttack: 0.003, compressorRelease: 0.25,
                    reverbWetDry: 0, autoTuneOn: false, autoTuneAmount: 0.5, limiterOn: false, noiseGateOn: false, noiseGateThreshold: -60,
                    pitch: 0, tempo: 1
                }
            };
            setClips(prev => [...prev, newClip]);
            showToast(`Sample "${sample.name}" added to Vocal Booth.`, 'success');
        } catch (error) {
            console.error("Error adding sample to Vocal Booth:", error);
            showToast(`Failed to add sample "${sample.name}".`, 'error');
        }
    }, [currentUser, showToast]);


    // ========================================================================================
    // --- DRUM MACHINE & MIDI ---
    // ========================================================================================

    // Drum machine playback engine (simplified)
    const drumOutputsRef = useRef<Map<number, GainNode>>(new Map());
    const drumPannerNodesRef = useRef<Map<number, StereoPannerNode>>(new Map());
    const drumFilterNodesRef = useRef<Map<number, BiquadFilterNode>>(new Map());
    const drumEQNodesRef = useRef<Map<number, BiquadFilterNode[]>>(new Map()); // [low, mid, high]
    const currentDrumBeatSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    const loadDrumInstrument = useCallback(async (instrument: Instrument): Promise<Instrument> => {
        if (instrument.buffer || instrument.soundLoadingError || instrument.isLoading) {
            return instrument; // Already loaded, errored, or loading
        }
        setDrumMachineState(prev => ({
            ...prev,
            currentInstruments: prev.currentInstruments.map(inst =>
                inst.name === instrument.name ? { ...inst, isLoading: true, soundLoadingError: undefined } : inst
            )
        }));

        try {
            const response = await fetch(instrument.defaultSoundUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setDrumMachineState(prev => ({
                ...prev,
                currentInstruments: prev.currentInstruments.map(inst =>
                    inst.name === instrument.name ? { ...inst, buffer: audioBuffer, isLoading: false } : inst
                )
            }));
            return { ...instrument, buffer: audioBuffer, isLoading: false };
        } catch (error: any) {
            console.error(`Error loading drum sample for ${instrument.name}:`, error);
            setDrumMachineState(prev => ({
                ...prev,
                currentInstruments: prev.currentInstruments.map(inst =>
                    inst.name === instrument.name ? { ...inst, soundLoadingError: error.message, isLoading: false } : inst
                )
            }));
            return { ...instrument, soundLoadingError: error.message, isLoading: false };
        }
    }, []);

    const setDrumKit = useCallback(async (index: number) => {
        setDrumMachineState(prev => ({ ...prev, isLoadingSounds: true }));
        const kit = defaultKitsData[index];
        if (!kit) return;

        // Load all instruments in the kit
        const loadedInstruments = await Promise.all(
            kit.instruments.map(async (inst) => await loadDrumInstrument(inst))
        );

        const newDrumGrid = loadedInstruments.map(() => Array(drumMachineState.patternLength).fill(false));
        const newNoteGrid = loadedInstruments.map(() => [] as Note[]); // Clear note grid for new kit

        setDrumMachineState(prev => ({
            ...prev,
            selectedKitIndex: index,
            currentInstruments: loadedInstruments,
            drumGrid: newDrumGrid,
            noteGrid: newNoteGrid,
            isLoadingSounds: false,
        }));
    }, [drumMachineState.patternLength, loadDrumInstrument]);

    useEffect(() => {
        // Load default kit on mount
        if (drumMachineState.currentInstruments.length === 0 && defaultKitsData.length > 0) {
            setDrumKit(0);
        }
    }, [drumMachineState.currentInstruments.length, setDrumKit]);

    const playDrumSound = useCallback((instrumentIndex: number, playbackTime?: number, pitch?: string) => {
        const instrument = drumMachineState.currentInstruments[instrumentIndex];
        if (!instrument || !instrument.buffer || instrument.isMuted || (drumMachineState.currentInstruments.some(i => i.isSoloed) && !instrument.isSoloed)) {
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = instrument.buffer;

        // Apply pitch shift if needed (for pitched instruments)
        if (instrument.isPitched && pitch && instrument.baseNote) {
            const baseMidi = noteToMidiMap[instrument.baseNote];
            const targetMidi = noteToMidiMap[pitch];
            if (baseMidi !== undefined && targetMidi !== undefined) {
                const centsDifference = (targetMidi - baseMidi) * 100;
                source.detune.value = centsDifference;
            }
        }

        // Setup mixer nodes if not already
        if (!drumOutputsRef.current.has(instrumentIndex)) {
            const gainNode = audioContext.createGain();
            const pannerNode = audioContext.createStereoPanner();
            const filterNode = audioContext.createBiquadFilter();
            filterNode.type = 'lowpass'; // Default

            const lowEq = audioContext.createBiquadFilter(); lowEq.type = "lowshelf"; lowEq.frequency.setValueAtTime(150, audioContext.currentTime);
            const midEq = audioContext.createBiquadFilter(); midEq.type = "peaking"; midEq.frequency.setValueAtTime(1000, audioContext.currentTime); midEq.Q.setValueAtTime(1.0, audioContext.currentTime);
            const highEq = audioContext.createBiquadFilter(); highEq.type = "highshelf"; highEq.frequency.setValueAtTime(5000, audioContext.currentTime);

            gainNode.connect(pannerNode);
            pannerNode.connect(filterNode);
            filterNode.connect(lowEq);
            lowEq.connect(midEq);
            midEq.connect(highEq);
            highEq.connect(drumBusGainNode.current!); // Connect to drum bus

            drumOutputsRef.current.set(instrumentIndex, gainNode);
            drumPannerNodesRef.current.set(instrumentIndex, pannerNode);
            drumFilterNodesRef.current.set(instrumentIndex, filterNode);
            drumEQNodesRef.current.set(instrumentIndex, [lowEq, midEq, highEq]);
        }

        const gainNode = drumOutputsRef.current.get(instrumentIndex)!;
        const pannerNode = drumPannerNodesRef.current.get(instrumentIndex)!;
        const filterNode = drumFilterNodesRef.current.get(instrumentIndex)!;
        const [lowEq, midEq, highEq] = drumEQNodesRef.current.get(instrumentIndex)!;

        // Apply current mixer settings
        gainNode.gain.setValueAtTime(instrument.mixer.volume, audioContext.currentTime);
        pannerNode.pan.setValueAtTime(instrument.mixer.pan, audioContext.currentTime);
        filterNode.frequency.setValueAtTime(instrument.mixer.filterCutoff, audioContext.currentTime);
        lowEq.gain.setValueAtTime(instrument.mixer.eqLow, audioContext.currentTime);
        midEq.gain.setValueAtTime(instrument.mixer.eqMid, audioContext.currentTime);
        highEq.gain.setValueAtTime(instrument.mixer.eqHigh, audioContext.currentTime);

        source.connect(gainNode);
        source.start(playbackTime || audioContext.currentTime);
        currentDrumBeatSourcesRef.current.push(source); // Keep track to stop all on `stop`
        source.onended = () => {
            currentDrumBeatSourcesRef.current = currentDrumBeatSourcesRef.current.filter(s => s !== source);
            source.disconnect();
        };

    }, [drumMachineState.currentInstruments, drumOutputsRef, drumPannerNodesRef, drumFilterNodesRef, drumEQNodesRef, noteToMidiMap]);

    const toggleDrumMachinePlay = useCallback(() => {
        resumeAudioContext();
        setDrumMachineState(prev => {
            const newIsPlaying = !prev.isPlaying;
            if (newIsPlaying) {
                let currentStep = -1;
                let nextStepTime = audioContext.currentTime;
                const intervalTime = 60 / prev.bpm / 4; // Time per 16th note

                const loop = () => {
                    currentStep = (currentStep + 1) % prev.patternLength;
                    const swingOffset = (currentStep % 2 === 1) ? (prev.swingAmount / 100) * (intervalTime / 2) : 0;
                    const scheduledTime = nextStepTime + swingOffset;

                    prev.currentInstruments.forEach((instrument, instIndex) => {
                        // Regular drum grid
                        if (!instrument.isPitched && prev.drumGrid[instIndex]?.[currentStep]) {
                            playDrumSound(instIndex, scheduledTime);
                        }
                        // Piano roll notes
                        if (instrument.isPitched) {
                            prev.noteGrid[instIndex]?.filter(note => note.step === currentStep).forEach(note => {
                                playDrumSound(instIndex, scheduledTime, note.pitch);
                            });
                        }
                    });

                    // Metronome
                    if (prev.metronomeOn && currentStep % 4 === 0) {
                        // Play metronome sound (simple click for now)
                        const oscillator = audioContext.createOscillator();
                        oscillator.frequency.setValueAtTime(currentStep === 0 ? 880 : 440, scheduledTime); // Higher pitch on downbeat
                        const gainNode = audioContext.createGain();
                        gainNode.gain.setValueAtTime(0.5, scheduledTime);
                        oscillator.connect(gainNode);
                        gainNode.connect(masterGainNode);
                        oscillator.start(scheduledTime);
                        oscillator.stop(scheduledTime + 0.05); // Short click
                    }

                    setDrumMachineState(p => ({ ...p, currentStep }));
                    nextStepTime += intervalTime;
                    drumMachineTimerRef.current = setTimeout(loop, (nextStepTime - audioContext.currentTime - 0.01) * 1000) as unknown as number; // -0.01 for slight lookahead
                };
                loop();
            } else {
                if (drumMachineTimerRef.current) clearTimeout(drumMachineTimerRef.current);
                currentDrumBeatSourcesRef.current.forEach(source => source.stop());
                currentDrumBeatSourcesRef.current = [];
                setDrumMachineState(p => ({ ...p, currentStep: -1 }));
            }
            return { ...prev, isPlaying: newIsPlaying };
        });
    }, [playDrumSound, masterGainNode]);

    const setDrumBpm = useCallback((bpm: number) => {
        setDrumMachineState(prev => {
            const wasPlaying = prev.isPlaying;
            if (wasPlaying && drumMachineTimerRef.current) {
                clearTimeout(drumMachineTimerRef.current);
            }
            const newBpm = Math.max(60, Math.min(200, bpm));
            const newState = { ...prev, bpm: newBpm };
            if (wasPlaying) {
                // Restart playback with new BPM
                setTimeout(() => {
                    setDrumMachineState(p => ({ ...p, isPlaying: false })); // Temporarily stop
                    setTimeout(() => toggleDrumMachinePlay(), 0); // Then restart
                }, 0);
            }
            return newState;
        });
    }, [toggleDrumMachinePlay]);

    const toggleDrumStep = useCallback((instrumentIndex: number, stepIndex: number) => {
        setDrumMachineState(prev => {
            const newDrumGrid = prev.drumGrid.map((row, rIdx) =>
                rIdx === instrumentIndex ? row.map((isActive, sIdx) =>
                    sIdx === stepIndex ? !isActive : isActive
                ) : row
            );
            return { ...prev, drumGrid: newDrumGrid };
        });
    }, []);

    const setNote = useCallback((instrumentIndex: number, stepIndex: number, pitch: string) => {
        setDrumMachineState(prev => {
            const existingNotes = prev.noteGrid[instrumentIndex] || [];
            const noteExists = existingNotes.some(n => n.pitch === pitch && n.step === stepIndex);

            const newNotes = noteExists
                ? existingNotes.filter(n => !(n.pitch === pitch && n.step === stepIndex))
                : [...existingNotes, { pitch, step: stepIndex }];

            const newNoteGrid = prev.noteGrid.map((row, rIdx) => rIdx === instrumentIndex ? newNotes : row);
            return { ...prev, noteGrid: newNoteGrid };
        });
    }, []);

    const handleDrumInstrumentMixerChange = useCallback((instIndex: number, param: string, value: number) => {
        setDrumMachineState(prev => ({
            ...prev,
            currentInstruments: prev.currentInstruments.map((inst, idx) =>
                idx === instIndex ? { ...inst, mixer: { ...inst.mixer, [param]: value } } : inst
            )
        }));
    }, []);

    const setDrumPatternLength = useCallback((length: number) => {
        setDrumMachineState(prev => {
            const newDrumGrid = prev.drumGrid.map(row => {
                const newRow = Array(length).fill(false);
                for (let i = 0; i < Math.min(row.length, length); i++) {
                    newRow[i] = row[i];
                }
                return newRow;
            });
            const newNoteGrid = prev.noteGrid.map(notes => notes.filter(note => note.step < length));
            return { ...prev, patternLength: length, drumGrid: newDrumGrid, noteGrid: newNoteGrid };
        });
    }, []);

    const setDrumSwing = useCallback((amount: number) => {
        setDrumMachineState(prev => ({ ...prev, swingAmount: amount }));
    }, []);

    const toggleDrumMetronome = useCallback(() => {
        setDrumMachineState(prev => ({ ...prev, metronomeOn: !prev.metronomeOn }));
    }, []);

    const handleDrumCustomSampleUpload = useCallback((instIndex: number, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const instName = drumMachineState.currentInstruments[instIndex]?.name ?? `Instrument ${instIndex}`;
        if (file) {
            setDrumMachineState(prev => ({
                ...prev,
                currentInstruments: prev.currentInstruments.map((inst, idx) =>
                    idx === instIndex ? { ...inst, isLoading: true, soundLoadingError: undefined } : inst
                ),
                isLoadingSounds: true,
            }));
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const audioBuffer = await audioContext.decodeAudioData(event.target!.result as ArrayBuffer);
                    setDrumMachineState(prev => ({
                        ...prev,
                        currentInstruments: prev.currentInstruments.map((inst, idx) =>
                            idx === instIndex ? { ...inst, buffer: audioBuffer, isCustom: true, isLoading: false } : inst
                        ),
                        isLoadingSounds: false,
                    }));
                    showToast(`Custom sample loaded for ${instName}.`, 'success');
                } catch (error: any) {
                    console.error("Error loading custom sample:", error);
                    setDrumMachineState(prev => ({
                        ...prev,
                        currentInstruments: prev.currentInstruments.map((inst, idx) =>
                            idx === instIndex ? { ...inst, soundLoadingError: error.message, isLoading: false } : inst
                        ),
                        isLoadingSounds: false,
                    }));
                    showToast(`Failed to load custom sample for ${instName}.`, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }, [showToast, drumMachineState]);

    const clearDrumPattern = useCallback(() => {
        setDrumMachineState(prev => ({
            ...prev,
            drumGrid: prev.currentInstruments.map(() => Array(prev.patternLength).fill(false)),
            noteGrid: prev.currentInstruments.map(() => []),
        }));
        showToast('Drum pattern cleared!', 'info');
    }, [showToast]);

    const toggleDrumMute = useCallback((instIndex: number) => {
        setDrumMachineState(prev => ({
            ...prev,
            currentInstruments: prev.currentInstruments.map((inst, idx) =>
                idx === instIndex ? { ...inst, isMuted: !inst.isMuted } : inst
            )
        }));
    }, []);

    const toggleDrumSolo = useCallback((instIndex: number) => {
        setDrumMachineState(prev => ({
            ...prev,
            currentInstruments: prev.currentInstruments.map((inst, idx) => {
                if (idx === instIndex) {
                    return { ...inst, isSoloed: !inst.isSoloed };
                }
                return { ...inst, isSoloed: false }; // Only one instrument can be soloed
            })
        }));
    }, []);

    const setDrumGrid = useCallback((newGrid: boolean[][]) => {
        setDrumMachineState(prev => ({ ...prev, drumGrid: newGrid }));
        showToast('AI pattern applied!', 'info');
    }, [showToast]);

    // Create drum analyser node and bus
    useEffect(() => {
        if (!drumAnalyserNode.current) {
            drumAnalyserNode.current = audioContext.createAnalyser();
            drumAnalyserNode.current.fftSize = 256;
            drumBusGainNode.current = audioContext.createGain(); // Create a dedicated bus
            drumBusGainNode.current.connect(drumAnalyserNode.current); // Connect bus to analyser
            drumAnalyserNode.current.connect(masterGainNode); // Connect analyser output to master
        }
    }, [masterGainNode]);

    // MIDI integration
    useEffect(() => {
        const onMIDISuccess = (midiAccess: MIDIAccess) => {
            if (midiAccess.inputs.size > 0) {
                setIsMidiConnected(true);
            }
            for (const input of midiAccess.inputs.values()) {
                input.onmidimessage = onMIDIMessage;
            }
            midiAccess.onstatechange = (event) => {
                if (event.port.type === 'input') {
                    setIsMidiConnected(midiAccess.inputs.size > 0);
                    // Re-assign listeners if ports change
                    for (const input of midiAccess.inputs.values()) {
                        input.onmidimessage = onMIDIMessage;
                    }
                }
            };
        };
        const onMIDIFailure = () => { console.error("Could not access MIDI devices."); setIsMidiConnected(false); };
        const onMIDIMessage = (event: MIDIMessageEvent) => {
            setIsMidiActive(true); // Set MIDI active on any message
            if (midiActivityTimeoutRef.current) {
                clearTimeout(midiActivityTimeoutRef.current);
            }
            midiActivityTimeoutRef.current = setTimeout(() => {
                setIsMidiActive(false);
            }, 200) as unknown as number; // Clear after 200ms

            const [command, midiNote, velocity] = event.data;
            if (command === 144 && velocity > 0) { // Note On
                const isCurrentKitPitched = drumMachineState.currentInstruments.some(inst => inst.isPitched);

                if (isCurrentKitPitched) {
                    const foundPitch = midiToNoteMap[midiNote]; // Look up exact pitch
                    if (foundPitch) {
                        drumMachineState.currentInstruments.forEach((instrument, instIndex) => {
                            if (instrument.isPitched) {
                                playDrumSound(instIndex, undefined, foundPitch);
                            }
                        });
                    }
                } else {
                    // For unpitched drums, map MIDI notes to drum pads
                    // Simple modulo mapping, or specific MIDI-to-drum mapping
                    const drumIndex = midiNote % drumMachineState.currentInstruments.length;
                    playDrumSound(drumIndex);
                }
            }
        };

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
        }
    }, [drumMachineState.currentInstruments, playDrumSound]);

    // ========================================================================================
    // --- INIT & CONTEXT VALUE ---
    // ========================================================================================

    useEffect(() => {
        // Fetch devices on mount
        const initDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setRecordingState(prev => ({ ...prev, audioInputs: devices.filter(d => d.kind === 'audioinput') }));
            } catch (e) { console.error("Could not enumerate devices:", e); }
        };
        initDevices();
    }, []);

    useEffect(() => {
        if (currentUser) {
            const savedPlaylist = localStorage.getItem(`music_player_playlist_${currentUser.username}`);
            if (savedPlaylist) {
                try {
                    const parsedPlaylist: Track[] = JSON.parse(savedPlaylist);
                    if (Array.isArray(parsedPlaylist) && parsedPlaylist.every(t => t.name && t.url)) {
                        setMusicPlayerState(prev => ({ ...prev, playlist: parsedPlaylist }));
                    }
                } catch (e) {
                    console.error("Failed to load saved playlist:", e);
                    localStorage.removeItem(`music_player_playlist_${currentUser.username}`);
                }
            }
        }
    }, [currentUser]);

    return (
        <GlobalAudioContext.Provider value={{
            masterVolume, setMasterVolume, masterAnalyserNode,
            isRecording,
            recordingState: { ...recordingState, ...recordingCallbacks },
            startRecording, stopRecording,
            djDecksState, djMixerState,
            togglePlayDeck,
            loadTrackToDeck,
            setDeckTempo,
            setDjMixer,
            musicPlayerState, togglePlayPause, playNext, playPrev, setMusicPlayerVolume, setMusicPlayerTempo, seekMusicPlayer,
            addTrackFromUrl, addTrackFromFile, removeTrack, savePlaylist, loadPlaylist, playMusicPlayerTrack,
            drumMachineState, toggleDrumMachinePlay, setDrumBpm, setDrumKit, toggleDrumStep, handleDrumInstrumentMixerChange,
            setDrumPatternLength, setDrumSwing, toggleDrumMetronome, handleDrumCustomSampleUpload, clearDrumPattern,
            saveDrumPattern, loadDrumPattern, defaultKits: defaultKitsData, toggleDrumMute, toggleDrumSolo, setDrumGrid, setNote,
            drumAnalyserNode: drumAnalyserNode.current,
            isMidiConnected, isMidiActive, // Expose MIDI activity
            clips, addClip, addVideoClip, deleteClip, playClip, stopClip, handleClipMixerChange, handleClipToggle,
            addSynthTrack, handleClipMetadataChange, handleSynthWaveformChange, exportMixAsWav, isExporting,
            saveSession, loadSession, addClipFromSample, masterEffects, handleMasterEffectChange,
            drumMachineTimerRef, // Expose drumMachineTimerRef
        }}>
            {children}
            {/* ... audio elements ... */}
        </GlobalAudioContext.Provider>
    );
};

export const useGlobalAudio = () => {
    const context = useContext(GlobalAudioContext);
    if (context === undefined) throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
    return context;
};