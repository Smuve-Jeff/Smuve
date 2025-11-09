import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './ToastContext';

// ### Interfaces and Types
export interface Track {
  name: string;
  url: string; // URL for streaming/loading
  isLocal: boolean; // True if it's from a local file
}

export interface Clip {
  id: string;
  name: string;
  buffer: AudioBuffer;
  startTime: number; // Start time within the timeline (in seconds)
  offset: number; // Start offset within the audio buffer (in seconds)
  duration: number; // Duration to play from the buffer (in seconds)
  volume: number; // Individual clip volume (0-1)
  pan: number; // Individual clip pan (-1 to 1)
}

interface MusicPlayerState {
  playlist: Track[];
  currentTrackIndex: number | null;
  isPlaying: boolean;
  volume: number; // 0-1
  tempoRate: number; // Playback rate
  progress: number; // 0-100
  currentTime: number; // in seconds
  duration: number; // in seconds
  currentAudioBuffer: AudioBuffer | null;
}

interface VocalBoothState {
  clips: Clip[];
  isPlaying: boolean;
  isRecording: boolean;
  metronomeEnabled: boolean;
  timelinePosition: number; // in seconds
  masterVolume: number; // 0-1
  bpm: number;
}

interface GlobalAudioState {
  audioContext: AudioContext | null;
  musicPlayerState: MusicPlayerState;
  vocalBoothState: VocalBoothState;
  
  // Music Player Actions
  addTrackFromUrl: (url: string) => void;
  addTrackFromFile: (file: File) => void;
  removeTrack: (index: number) => void;
  playMusicPlayerTrack: (index: number) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seekMusicPlayer: (progressPercent: number) => void;
  setMusicPlayerVolume: (volume: number) => void;
  setMusicPlayerTempo: (rate: number) => void;
  savePlaylist: () => void;
  loadPlaylist: (file: File) => void;

  // Vocal Booth Actions
  addClipFromSample: (sample: { name: string, url: string }) => Promise<void>;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  playVocalBooth: () => void;
  pauseVocalBooth: () => void;
  stopVocalBooth: () => void;
  setVocalBoothMasterVolume: (volume: number) => void;
  setVocalBoothBpm: (bpm: number) => void;
  toggleMetronome: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}

// ### Context Definition
const GlobalAudioContext = createContext<GlobalAudioState | undefined>(undefined);

// ### Custom Hook
export const useGlobalAudio = () => {
  const context = useContext(GlobalAudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
};

// ### Provider Component
export const GlobalAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Player Refs
  const playerSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playerGainNodeRef = useRef<GainNode | null>(null);
  const playerStartTimeRef = useRef<number>(0);
  const playerPauseOffsetRef = useRef<number>(0);

  // Booth Refs
  const boothSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const boothGainNodeRef = useRef<GainNode | null>(null);
  const metronomeTimerRef = useRef<number | null>(null);

  // State
  const [musicPlayerState, setMusicPlayerState] = useState<MusicPlayerState>({
    playlist: [],
    currentTrackIndex: null,
    isPlaying: false,
    volume: 0.8,
    tempoRate: 1.0,
    progress: 0,
    currentTime: 0,
    duration: 0,
    currentAudioBuffer: null,
  });

  const [vocalBoothState, setVocalBoothState] = useState<VocalBoothState>({
    clips: [],
    isPlaying: false,
    isRecording: false,
    metronomeEnabled: true,
    timelinePosition: 0,
    masterVolume: 0.8,
    bpm: 120,
  });

  // ### Core Audio Initialization
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        playerGainNodeRef.current = audioContextRef.current.createGain();
        playerGainNodeRef.current.connect(audioContextRef.current.destination);
        
        boothGainNodeRef.current = audioContextRef.current.createGain();
        boothGainNodeRef.current.connect(audioContextRef.current.destination);

      } catch (e) {
        showToast('Web Audio API is not supported in this browser.', 'error');
        console.error("Error initializing AudioContext:", e);
      }
    }

    // Cleanup
    return () => {
      audioContextRef.current?.close();
    };
  }, [showToast]);

  // ### Audio Loading Utility
  const loadAudioToBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await audioContextRef.current.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error(`Error loading or decoding audio from ${url}:`, error);
      showToast(`Failed to load audio: ${url.split('/').pop()}`, 'error');
      return null;
    }
  }, [showToast]);

  // ### Music Player Logic
  const playCurrentMusicTrack = useCallback(() => {
    const { currentTrackIndex, playlist, tempoRate } = musicPlayerState;
    if (currentTrackIndex === null || !audioContextRef.current || !playerGainNodeRef.current || !musicPlayerState.currentAudioBuffer) return;

    if (playerSourceRef.current) {
      playerSourceRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = musicPlayerState.currentAudioBuffer;
    source.playbackRate.value = tempoRate;
    source.connect(playerGainNodeRef.current);

    playerStartTimeRef.current = audioContextRef.current.currentTime - playerPauseOffsetRef.current;
    source.start(0, playerPauseOffsetRef.current);

    playerSourceRef.current = source;
    setMusicPlayerState(prev => ({ ...prev, isPlaying: true }));

    source.onended = () => {
      if (playerSourceRef.current === source) { // Ensure it's the current source
        const isTrackFinished = playerPauseOffsetRef.current >= (source.buffer?.duration || 0) - 0.1;
        playerPauseOffsetRef.current = 0; 
        if(isTrackFinished) playNext();
      }
    };
  }, [musicPlayerState.currentAudioBuffer, musicPlayerState.currentTrackIndex, musicPlayerState.tempoRate, playNext]);

  const playMusicPlayerTrack = useCallback(async (index: number) => {
    if (index < 0 || index >= musicPlayerState.playlist.length) return;

    setMusicPlayerState(prev => ({ ...prev, progress: 0, currentTime: 0, duration: 0, isPlaying: false, currentAudioBuffer: null }));
    playerPauseOffsetRef.current = 0;
    if (playerSourceRef.current) {
      playerSourceRef.current.stop();
      playerSourceRef.current = null;
    }

    const track = musicPlayerState.playlist[index];
    const buffer = await loadAudioToBuffer(track.url);

    if (buffer) {
      setMusicPlayerState(prev => ({ ...prev, currentTrackIndex: index, duration: buffer.duration, currentAudioBuffer: buffer }));
      playCurrentMusicTrack();
    } else {
      showToast(`Could not play "${track.name}"`, 'error');
    }
  }, [musicPlayerState.playlist, loadAudioToBuffer, showToast, playCurrentMusicTrack]);

  const togglePlayPause = useCallback(() => {
    if (musicPlayerState.isPlaying) {
      if (!audioContextRef.current || !playerSourceRef.current) return;
      playerPauseOffsetRef.current = audioContextRef.current.currentTime - playerStartTimeRef.current;
      playerSourceRef.current.stop();
      playerSourceRef.current = null;
      setMusicPlayerState(prev => ({...prev, isPlaying: false}));
    } else {
      playCurrentMusicTrack();
    }
  }, [musicPlayerState.isPlaying, playCurrentMusicTrack]);

  const playNext = useCallback(() => {
    const { currentTrackIndex, playlist } = musicPlayerState;
    if (currentTrackIndex !== null) {
      const nextIndex = (currentTrackIndex + 1) % playlist.length;
      playMusicPlayerTrack(nextIndex);
    }
  }, [musicPlayerState, playMusicPlayerTrack]);

  const playPrev = useCallback(() => {
    const { currentTrackIndex, playlist } = musicPlayerState;
    if (currentTrackIndex !== null) {
      const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      playMusicPlayerTrack(prevIndex);
    }
  }, [musicPlayerState, playMusicPlayerTrack]);

  const setMusicPlayerVolume = useCallback((volume: number) => {
    if (playerGainNodeRef.current) playerGainNodeRef.current.gain.value = volume;
    setMusicPlayerState(prev => ({ ...prev, volume }));
  }, []);

  const setMusicPlayerTempo = useCallback((rate: number) => {
    if (playerSourceRef.current) playerSourceRef.current.playbackRate.value = rate;
    setMusicPlayerState(prev => ({ ...prev, tempoRate: rate }));
  }, []);

  const seekMusicPlayer = (progressPercent: number) => {
    const { duration, isPlaying } = musicPlayerState;
    if (duration > 0) {
        const seekTime = duration * (progressPercent / 100);
        playerPauseOffsetRef.current = seekTime;
        if (isPlaying) {
            playCurrentMusicTrack();
        } else {
          // Update time display even when paused
          setMusicPlayerState(p => ({...p, progress: progressPercent, currentTime: seekTime}));
        }
    }
  };

  // Update progress bar
  useEffect(() => {
    if (!musicPlayerState.isPlaying || !audioContextRef.current) return;
    const interval = setInterval(() => {
      const currentTime = audioContextRef.current!.currentTime - playerStartTimeRef.current;
      const duration = musicPlayerState.duration;
      if (duration > 0) {
        const progress = Math.min((currentTime / duration) * 100, 100);
        setMusicPlayerState(p => ({ ...p, currentTime, progress }));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [musicPlayerState.isPlaying, musicPlayerState.duration]);

  const addTrackFromUrl = async (url: string) => {
    if (!url.trim()) return;
    const name = url.split('/').pop() || 'New Track';
    const newTrack: Track = { name, url, isLocal: false };
    setMusicPlayerState(prev => ({...prev, playlist: [...prev.playlist, newTrack]}));
    showToast(`"${name}" added to playlist!`, 'success');
  };

  const addTrackFromFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const newTrack: Track = { name: file.name, url, isLocal: true };
    setMusicPlayerState(prev => ({...prev, playlist: [...prev.playlist, newTrack]}));
    showToast(`"${file.name}" added to playlist!`, 'success');
  };

  const removeTrack = (index: number) => {
    const trackToRemove = musicPlayerState.playlist[index];
    if (trackToRemove.isLocal) {
      URL.revokeObjectURL(trackToRemove.url);
    }
    setMusicPlayerState(prev => {
      const newPlaylist = prev.playlist.filter((_, i) => i !== index);
      if (prev.currentTrackIndex === index) {
        // If currently playing track is removed, stop playback
        if (playerSourceRef.current) playerSourceRef.current.stop();
        playerPauseOffsetRef.current = 0;
        return { ...prev, playlist: newPlaylist, isPlaying: false, currentTrackIndex: null, progress: 0, currentTime: 0, duration: 0, currentAudioBuffer: null };
      }
      // Adjust current track index if a track before it was removed
      const newIndex = prev.currentTrackIndex !== null && index < prev.currentTrackIndex ? prev.currentTrackIndex - 1 : prev.currentTrackIndex;
      return { ...prev, playlist: newPlaylist, currentTrackIndex: newIndex };
    });
    showToast(`"${trackToRemove.name}" removed.`, 'info');
  };

  const savePlaylist = () => {
    const playlistToSave = musicPlayerState.playlist.filter(t => !t.isLocal);
    if (playlistToSave.length === 0) {
      showToast("Cannot save playlist with only local files.", 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(playlistToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smuve_playlist.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Playlist saved!", 'success');
  };

  const loadPlaylist = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const newPlaylist = JSON.parse(event.target?.result as string);
        setMusicPlayerState(prev => ({...prev, playlist: newPlaylist }));
        showToast('Playlist loaded!', 'success');
      } catch (e) {
        showToast('Failed to parse playlist file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ### Vocal Booth Logic
  const addClipFromSample = async ({ name, url }: { name: string, url: string }) => {
    const buffer = await loadAudioToBuffer(url);
    if (buffer) {
      const newClip: Clip = {
        id: `clip_${Date.now()}`,
        name,
        buffer,
        startTime: 0,
        offset: 0,
        duration: buffer.duration,
        volume: 1,
        pan: 0,
      };
      setVocalBoothState(prev => ({ ...prev, clips: [...prev.clips, newClip] }));
    }
  };

  const updateClip = (id: string, updates: Partial<Clip>) => {
      setVocalBoothState(prev => ({...prev, clips: prev.clips.map(c => c.id === id ? {...c, ...updates} : c)}));
  };

  const removeClip = (id: string) => {
      setVocalBoothState(prev => ({...prev, clips: prev.clips.filter(c => c.id !== id)}));
  }
  
  // Dummy implementations for vocal booth playback/recording
  const playVocalBooth = () => showToast('Vocal booth playback not yet implemented', 'info');
  const pauseVocalBooth = () => showToast('Vocal booth pause not yet implemented', 'info');
  const stopVocalBooth = () => showToast('Vocal booth stop not yet implemented', 'info');
  const setVocalBoothMasterVolume = (volume: number) => setVocalBoothState(p => ({...p, masterVolume: volume}));
  const setVocalBoothBpm = (bpm: number) => setVocalBoothState(p => ({...p, bpm}));
  const toggleMetronome = () => setVocalBoothState(p => ({...p, metronomeEnabled: !p.metronomeEnabled}));
  const startRecording = () => showToast('Vocal booth recording not yet implemented', 'info');
  const stopRecording = () => showToast('Vocal booth recording not yet implemented', 'info');


  // ### Context Value
  const value: GlobalAudioState = {
    audioContext: audioContextRef.current,
    musicPlayerState,
    vocalBoothState,
    // Music Player
    addTrackFromUrl,
    addTrackFromFile,
    removeTrack,
    playMusicPlayerTrack,
    togglePlayPause,
    playNext,
    playPrev,
    seekMusicPlayer,
    setMusicPlayerVolume,
    setMusicPlayerTempo,
    savePlaylist,
    loadPlaylist,
    // Vocal Booth
    addClipFromSample,
    updateClip,
    removeClip,
    playVocalBooth,
    pauseVocalBooth,
    stopVocalBooth,
    setVocalBoothMasterVolume,
    setVocalBoothBpm,
    toggleMetronome,
    startRecording,
    stopRecording
  };

  return (
    <GlobalAudioContext.Provider value={value}>
      {children}
    </GlobalAudioContext.Provider>
  );
};
