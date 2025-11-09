import React, { useState, ChangeEvent } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import MixerKnob from '../components/common/MixerKnob';
import WaveformDisplay from '../components/common/WaveformDisplay'; // Import WaveformDisplay
import { useGlobalAudio } from '../services/GlobalAudioContext';

const MusicPlayer: React.FC = () => {
  const { 
    musicPlayerState,
    togglePlayPause,
    playNext,
    playPrev,
    setMusicPlayerVolume,
    setMusicPlayerTempo,
    seekMusicPlayer,
    addTrackFromUrl,
    addTrackFromFile,
    removeTrack,
    savePlaylist,
    loadPlaylist,
    playMusicPlayerTrack, // Added to fix compilation as it's used directly in playlist map
  } = useGlobalAudio();

  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = () => {
      addTrackFromUrl(urlInput);
      setUrlInput('');
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addTrackFromFile(file);
      e.target.value = '';
    }
  };

  const handleLoadPlaylist = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPlaylist(file);
      e.target.value = '';
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  
  const currentTrack = musicPlayerState.currentTrackIndex !== null ? musicPlayerState.playlist[musicPlayerState.currentTrackIndex] : null;

  return (
    <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-indigo-400 font-orbitron">Music Player</h2>
        <p className="text-gray-400 mt-2">Load up your tracks for practice and review.</p>
      </div>
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        <Card className="flex flex-col justify-between bg-gray-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <div className="text-center">
                <div className="w-48 h-48 bg-gray-900/50 rounded-lg mx-auto flex items-center justify-center border border-indigo-700 overflow-hidden">
                    {musicPlayerState.currentAudioBuffer ? (
                        <WaveformDisplay 
                            clipBuffer={musicPlayerState.currentAudioBuffer} 
                            playbackProgress={musicPlayerState.progress / 100} // Convert 0-100 to 0-1
                            color="#8b5cf6" // Indigo color for waveform
                            width={192} // Match container width (48*4)
                            height={192} // Match container height
                        />
                    ) : (
                        <i className="fas fa-music text-6xl text-indigo-400"></i>
                    )}
                </div>
                <h3 className="text-xl font-bold mt-4 truncate">{currentTrack?.name || 'No Track Selected'}</h3>
                <p className="text-gray-400 text-sm">{currentTrack ? (musicPlayerState.isPlaying ? 'Playing...' : 'Paused') : 'Awaiting track'}</p>
            </div>
            <div className="mt-6">
                <input type="range" value={musicPlayerState.progress} onChange={(e) => seekMusicPlayer(Number(e.target.value))} className="w-full accent-indigo-500" disabled={!currentTrack} />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(musicPlayerState.currentTime)}</span>
                    <span>{formatTime(musicPlayerState.duration)}</span>
                </div>
            </div>
            <div className="flex justify-center items-center gap-6 mt-4">
                <Button variant="secondary" onClick={playPrev} disabled={musicPlayerState.playlist.length <= 1}><i className="fas fa-backward"></i></Button>
                <Button variant="primary" onClick={togglePlayPause} className="w-16 h-16 rounded-full text-2xl" disabled={!currentTrack}>
                    <i className={`fas ${musicPlayerState.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                </Button>
                <Button variant="secondary" onClick={playNext} disabled={musicPlayerState.playlist.length <= 1}><i className="fas fa-forward"></i></Button>
            </div>
             <div className="flex items-center gap-2 mt-6">
                <i className="fas fa-volume-down text-gray-400"></i>
                <input type="range" min="0" max="1" step="0.01" value={musicPlayerState.volume} onChange={(e) => setMusicPlayerVolume(Number(e.target.value))} className="w-full accent-indigo-500" />
                <i className="fas fa-volume-up text-gray-400"></i>
            </div>
            <div className="mt-6 flex flex-col items-center">
                <MixerKnob
                    label="Tempo (BPM)"
                    value={musicPlayerState.tempoRate}
                    onChange={setMusicPlayerTempo}
                    min={0.5} max={2.0} step={0.05}
                    unit="x"
                    color="cyan"
                />
            </div>
        </Card>
        <div className="flex flex-col gap-4">
            <Card className="bg-gray-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <h3 className="text-xl font-semibold mb-4 text-indigo-300">Add Tracks</h3>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste audio URL..."
                        className="flex-grow bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                    />
                    <Button onClick={handleAddUrl} disabled={!urlInput.trim()}>Add</Button>
                </div>
                <label htmlFor="music-player-file-upload" className="w-full mt-2 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-indigo-400 border border-gray-600/50 cursor-pointer">
                    <i className="fas fa-upload mr-2"></i> Upload Local File
                </label>
                <input id="music-player-file-upload" type="file" onChange={handleFileUpload} accept="audio/*" className="hidden" />
                <div className="flex gap-2 mt-2">
                    <Button onClick={savePlaylist} icon={<i className="fas fa-save"></i>} variant="secondary" className="flex-grow">
                        Save Playlist
                    </Button>
                    <label htmlFor="loadPlaylist" className="px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-indigo-400 border border-gray-600/50 cursor-pointer flex-grow">
                        <i className="fas fa-folder-open"></i> Load Playlist
                    </label>
                    <input id="loadPlaylist" type="file" accept=".json" onChange={handleLoadPlaylist} className="hidden" />
                </div>
                <p className="text-xs text-gray-500 mt-2">Note: Local files cannot be re-loaded from saved playlists.</p>
            </Card>
            <Card className="flex-grow flex flex-col bg-gray-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <h3 className="text-xl font-semibold mb-4 text-indigo-300">Playlist</h3>
                <ul className="overflow-y-auto flex-grow pr-2 custom-scrollbar">
                    {musicPlayerState.playlist.map((track, index) => (
                        <li key={index} 
                            className={`p-2 rounded-md cursor-pointer flex items-center justify-between gap-3 transition-colors duration-150 ${musicPlayerState.currentTrackIndex === index ? 'bg-indigo-600/50' : 'hover:bg-gray-700/50'}`}>
                            <div onClick={() => {
                                if (musicPlayerState.currentTrackIndex === index) {
                                    togglePlayPause();
                                } else {
                                    // Start playing new track if clicked
                                    playMusicPlayerTrack(index);
                                }
                            }} className="flex items-center gap-3 flex-grow min-w-0">
                                <i className={`fas ${musicPlayerState.currentTrackIndex === index && musicPlayerState.isPlaying ? 'fa-volume-up text-indigo-400' : 'fa-music text-gray-400'}`}></i>
                                <span className="truncate text-gray-200">{track.name}</span>
                            </div>
                            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); removeTrack(index); }} className="p-1 w-8 h-8 flex-shrink-0 bg-red-800/50 hover:bg-red-700/50 text-red-300 border-red-500/50">
                                <i className="fas fa-times"></i>
                            </Button>
                        </li>
                    ))}
                    {musicPlayerState.playlist.length === 0 && <p className="text-gray-500 text-center mt-4">Playlist is empty.</p>}
                </ul>
            </Card>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #00000030;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #6366f180;
          border-radius: 10px;
          border: 2px solid #00000030;
        }
      `}</style>
    </div>
  );
};

export default React.memo(MusicPlayer);