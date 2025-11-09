import React, { useState, useCallback, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useGlobalAudio } from '../../services/GlobalAudioContext';
import { useAiService } from '../../services/AiServiceContext';
import { useToast } from '../../services/ToastContext';
import { Clip, Track } from '../../types'; // Ensure Clip and Track types are imported

interface OnlinePlayer {
    id: number;
    name: string;
    status: 'Online' | 'In Game';
}

interface UserCreationsProps {
    onlinePlayers: OnlinePlayer[]; // To show players online for context
    isOnlineMode: boolean; // Whether 'The Spot' is in online mode
    onSendOnlineChatMessage: (sender: 'user' | 'opponent', text: string) => void;
    currentOnlineOpponentName: string; // If in online match, opponent name for sharing context
}

const UserCreations: React.FC<UserCreationsProps> = React.memo(({ isOnlineMode, onSendOnlineChatMessage, currentOnlineOpponentName }) => {
    const { clips, musicPlayerState, drumMachineState, playClip, stopClip, playMusicPlayerTrack } = useGlobalAudio();
    const { appNotepadContent } = useAiService();
    const { showToast } = useToast();

    const [playingClipId, setPlayingClipId] = useState<number | null>(null);
    // const [playingMusicPlayerTrackIndex, setPlayingMusicPlayerTrackIndex] = useState<number | null>(null); // Global audio context handles this

    // Stop all audio when leaving this tab or component unmounts
    useEffect(() => {
        return () => {
            if (playingClipId !== null) {
                stopClip(playingClipId);
                setPlayingClipId(null);
            }
            // Music player handles its own state on unmount or navigation
        };
    }, [playingClipId, stopClip]);


    const handlePlayToggleClip = useCallback((clip: Clip) => {
        if (playingClipId === clip.id) {
            stopClip(clip.id);
            setPlayingClipId(null);
        } else {
            if (playingClipId !== null) stopClip(playingClipId); // Stop previous if any
            playClip(clip.id);
            setPlayingClipId(clip.id);
            showToast(`Playing clip: "${clip.name}"`, 'info');
        }
    }, [playingClipId, playClip, stopClip, showToast]);

    const handlePlayToggleMusicPlayerTrack = useCallback((trackIndex: number) => {
        // This relies on the global music player state.
        // `playMusicPlayerTrack` will handle playing/pausing and setting the current track.
        playMusicPlayerTrack(trackIndex);
        showToast(`Toggling music player track: "${musicPlayerState.playlist[trackIndex].name}"`, 'info');
    }, [musicPlayerState.playlist, playMusicPlayerTrack, showToast]);


    const handleShareContent = useCallback((contentType: string, contentName: string, contentSnippet?: string) => {
        if (!isOnlineMode || !currentOnlineOpponentName) {
            showToast("You need to be in 'Online Match' mode and have an opponent to share with.", 'warning');
            return;
        }
        let message = '';
        if (contentSnippet) {
            message = `Hey ${currentOnlineOpponentName}, check out my ${contentType}: "${contentName}" - "${contentSnippet.substring(0, Math.min(contentSnippet.length, 50))}"...`;
        } else {
            message = `Hey ${currentOnlineOpponentName}, check out my ${contentType}: "${contentName}"!`;
        }
        onSendOnlineChatMessage('user', message);
        showToast(`Shared ${contentType} with ${currentOnlineOpponentName}!`, 'success');
    }, [isOnlineMode, onSendOnlineChatMessage, currentOnlineOpponentName, showToast]);

    const drumPatternDisplayName = drumMachineState.songTitle || "Untitled Beat";
    const drumPatternDetails = drumMachineState.drumGrid.length > 0 ? `(${drumMachineState.bpm} BPM, ${drumMachineState.patternLength} Steps)` : '';

    return (
        <Card className="flex flex-col items-center bg-gray-900/50 border-cyan-500/30 shadow-lg shadow-cyan-500/10 max-w-4xl mx-auto w-full p-8 relative z-10 h-full">
            <h3 className="text-3xl font-bold mb-4 text-cyan-300 font-orbitron">Your Creations</h3>
            <p className="text-gray-400 mb-8">Showcase your work to other players in The Spot!</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full flex-grow overflow-y-auto custom-scrollbar pr-2">
                {/* Vocal Booth Clips */}
                <Card className="bg-gray-800/60 border-gray-700/50 p-4 flex flex-col">
                    <h4 className="text-xl font-bold text-teal-300 mb-4">Vocal Booth Clips</h4>
                    {clips.length === 0 ? (
                        <p className="text-gray-500 italic">No clips in Vocal Booth.</p>
                    ) : (
                        <ul className="space-y-3 flex-grow overflow-y-auto custom-scrollbar-thin">
                            {clips.map(clip => (
                                <li key={clip.id} className="flex items-center justify-between bg-gray-900/70 p-2 rounded-md">
                                    <span className="truncate flex-grow mr-2">{clip.name}</span>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handlePlayToggleClip(clip)}
                                            className={`w-10 h-10 p-0 rounded-full ${playingClipId === clip.id ? 'bg-red-600' : 'bg-teal-600'}`}
                                            aria-label={playingClipId === clip.id ? `Stop ${clip.name}` : `Play ${clip.name}`}
                                        >
                                            <i className={`fas ${playingClipId === clip.id ? 'fa-stop' : 'fa-play'}`}></i>
                                        </Button>
                                        <Button
                                            onClick={() => handleShareContent('clip', clip.name, 'audio clip')}
                                            variant="secondary"
                                            className="w-10 h-10 p-0 rounded-full bg-blue-700/50 text-blue-300"
                                            title={`Share "${clip.name}"`}
                                            disabled={!isOnlineMode || !currentOnlineOpponentName}
                                        >
                                            <i className="fas fa-share-alt"></i>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Music Player Playlist */}
                <Card className="bg-gray-800/60 border-gray-700/50 p-4 flex flex-col">
                    <h4 className="text-xl font-bold text-indigo-300 mb-4">Music Player Playlist</h4>
                    {musicPlayerState.playlist.length === 0 ? (
                        <p className="text-gray-500 italic">Playlist is empty.</p>
                    ) : (
                        <ul className="space-y-3 flex-grow overflow-y-auto custom-scrollbar-thin">
                            {musicPlayerState.playlist.map((track, index) => (
                                <li key={index} className="flex items-center justify-between bg-gray-900/70 p-2 rounded-md">
                                    <span className="truncate flex-grow mr-2">{track.name}</span>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handlePlayToggleMusicPlayerTrack(index)}
                                            className={`w-10 h-10 p-0 rounded-full ${musicPlayerState.currentTrackIndex === index && musicPlayerState.isPlaying ? 'bg-red-600' : 'bg-indigo-600'}`}
                                            aria-label={musicPlayerState.currentTrackIndex === index && musicPlayerState.isPlaying ? `Pause ${track.name}` : `Play ${track.name}`}
                                        >
                                            <i className={`fas ${musicPlayerState.currentTrackIndex === index && musicPlayerState.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                                        </Button>
                                        <Button
                                            onClick={() => handleShareContent('track', track.name)}
                                            variant="secondary"
                                            className="w-10 h-10 p-0 rounded-full bg-blue-700/50 text-blue-300"
                                            title={`Share "${track.name}"`}
                                            disabled={!isOnlineMode || !currentOnlineOpponentName}
                                        >
                                            <i className="fas fa-share-alt"></i>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Current Drum Pattern */}
                <Card className="bg-gray-800/60 border-gray-700/50 p-4 col-span-full">
                    <h4 className="text-xl font-bold text-purple-300 mb-4">Current Drum Pattern</h4>
                    {drumMachineState.drumGrid.length === 0 || drumMachineState.drumGrid.every(row => row.every(step => !step)) ? (
                        <p className="text-gray-500 italic">No active drum pattern. Go to Drum Machine to create one!</p>
                    ) : (
                        <div className="flex items-center justify-between">
                            <p className="text-gray-200">
                                <span className="font-semibold">{drumPatternDisplayName}</span> {drumPatternDetails}
                            </p>
                            <Button
                                onClick={() => handleShareContent('drum pattern', drumPatternDisplayName, `a beat at ${drumMachineState.bpm} BPM`)}
                                variant="secondary"
                                className="w-10 h-10 p-0 rounded-full bg-blue-700/50 text-blue-300"
                                title={`Share "${drumPatternDisplayName}"`}
                                disabled={!isOnlineMode || !currentOnlineOpponentName}
                            >
                                <i className="fas fa-share-alt"></i>
                            </Button>
                        </div>
                    )}
                </Card>

                {/* Current Lyrics/Notes */}
                <Card className="bg-gray-800/60 border-gray-700/50 p-4 col-span-full flex flex-col">
                    <h4 className="text-xl font-bold text-blue-300 mb-4">Current Lyrics / Notes</h4>
                    {appNotepadContent.trim() === '' ? (
                        <p className="text-gray-500 italic">Notepad is empty. Write something in the Lyrics section!</p>
                    ) : (
                        <div className="flex items-center justify-between flex-grow">
                            <p className="text-gray-200 text-sm italic pr-4 max-h-24 overflow-hidden text-ellipsis custom-scrollbar-thin">
                                {appNotepadContent}
                            </p>
                            <Button
                                onClick={() => handleShareContent('lyrics', 'my latest ideas', appNotepadContent)}
                                variant="secondary"
                                className="w-10 h-10 p-0 rounded-full bg-blue-700/50 text-blue-300 flex-shrink-0"
                                title="Share Lyrics"
                                disabled={!isOnlineMode || !currentOnlineOpponentName}
                            >
                                <i className="fas fa-share-alt"></i>
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
             <style>{`
                .custom-scrollbar-thin::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-track {
                  background: #00000030;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb {
                  background-color: #60a5fa80; /* blue-500 with transparency */
                  border-radius: 10px;
                  border: 1px solid #00000030;
                }
            `}</style>
        </Card>
    );
});
UserCreations.displayName = 'UserCreations';

export default UserCreations;