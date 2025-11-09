export interface Track {
  name: string;
  url: string;
}

export enum View {
  AiManager = 'AI_MANAGER',
  DjTurntables = 'DJ_TURNTABLES',
  AudioRecorder = 'AUDIO_RECORDER',
  DrumMachine = 'DRUM_MACHINE',
  ArtistHub = 'ARTIST_HUB',
  Analytics = 'ANALYTICS',
  MusicPlayer = 'MUSIC_PLAYER',
  Notepad = 'LYRICS',
  TheSpot = 'THE_SPOT',
  SampleLibrary = 'SAMPLE_LIBRARY',
  Auth = 'AUTH', // New: Auth view for login/register modal
  MerchDesigner = 'MERCH_DESIGNER', // New: Merch Designer view
}

export interface Clip {
  id: number;
  name: string;
  url: string;
  isPlaying: boolean;
  audioBuffer?: AudioBuffer;
  playbackCurrentTime: number;
  playbackDuration: number;
  type: 'audio' | 'synth' | 'video'; // Added 'video' type
  synthSettings?: {
    waveform: 'sine' | 'sawtooth' | 'square';
  };
  videoStream?: MediaStream; // Optional: For live video recording preview
  videoUrl?: string; // Optional: For recorded video playback
  videoThumbnailUrl?: string; // Optional: Thumbnail for video clips
  metadata: {
    title: string;
    artist: string;
    album: string;
    genre: string;
    comments: string;
  };
  mixer: {
    volume: number;
    pan: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
    compressorThreshold: number;
    compressorRatio: number;
    compressorAttack: number;
    compressorRelease: number;
    reverbWetDry: number;
    autoTuneOn: boolean;
    autoTuneAmount: number;
    limiterOn: boolean;
    noiseGateOn: boolean;
    noiseGateThreshold: number;
    pitch: number;
    tempo: number;
  };
}

export type Instrument = {
  name: string;
  defaultSoundUrl: string;
  buffer?: AudioBuffer;
  soundLoadingError?: string;
  isMuted: boolean;
  isSoloed: boolean;
  isCustom?: boolean;
  isPitched?: boolean;
  baseNote?: string;
  isLoading?: boolean;
  mixer: {
    volume: number;
    pan: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
    filterCutoff: number;
  };
};

export type Note = {
  pitch: string;
  step: number;
}

export type Kit = {
  name: string;
  instruments: Instrument[];
};

export type MerchDesignContent = {
  imageUrl: string | null;
  textSlogans: string | null;
  artistName: string;
  merchDescription: string;
  merchType: 'tshirt' | 'hoodie';
  garmentColor: 'white' | 'black' | 'gray' | 'navy' | 'red';
};