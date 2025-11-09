import React, { useState, useCallback, useEffect, useRef } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import OnlineGameHUD from './OnlineGameHUD';
import { useGlobalAudio } from '../../services/GlobalAudioContext';
import { useAiService } from '../../services/AiServiceContext';
import { useToast } from '../../services/ToastContext';
import { Clip, Track } from '../../types';

interface MusicBattleGameProps {
    onBack: () => void;
    isOnline: boolean;
    opponentName: string;
    onlineChatMessages: { sender: 'user' | 'opponent'; text: string }[];
    onSendOnlineChatMessage: (sender: 'user' | 'opponent', text: string) => void;
}

type BattlePhase = 'selection' | 'showcase' | 'judging' | 'results';
type BattleEntry = {
    type: 'clip' | 'track' | 'drum' | 'lyrics';
    id: number | string; // Unique ID for clips/tracks, fixed string for drum/lyrics
    name: string;
    content: string; // URL for audio, text for lyrics, description for drum
    thumbnail?: string; // Placeholder for visual representation
};

const MusicBattleGame: React.FC<MusicBattleGameProps> = ({ onBack, isOnline, opponentName, onlineChatMessages, onSendOnlineChatMessage }) => {
    const {
        clips,
        musicPlayerState,
        drumMachineState,
        playClip,
        stopClip,
        playMusicPlayerTrack,
        toggleDrumMachinePlay, // To play drum pattern for showcase
        drumMachineTimerRef, // Access the drum machine timer to stop it
    } = useGlobalAudio();
    const { appNotepadContent } = useAiService();
    const { showToast } = useToast();

    const [phase, setPhase] = useState<BattlePhase>('selection');
    const [userSelection, setUserSelection] = useState<BattleEntry | null>(null);
    const [aiSelection, setAiSelection] = useState<BattleEntry | null>(null);
    const [battleResult, setBattleResult] = useState<'win' | 'lose' | 'tie' | null>(null);
    const [isLoadingBattle, setIsLoadingBattle] = useState(false);
    const [playingContentId, setPlayingContentId] = useState<number | null>(null); // For clips
    const playingMusicPlayerTrackIndexRef = useRef<number | null>(null); // For music player tracks
    const isDrumPlayingRef = useRef(false); // For drum patterns

    const playerAvailableCreations: BattleEntry[] = [
        ...clips.map(c => ({
            type: 'clip',
            id: c.id,
            name: c.name,
            content: c.url,
            thumbnail: 'fas fa-microphone', // Icon for clips
        } as BattleEntry)),
        ...musicPlayerState.playlist.map((t, idx) => ({
            type: 'track',
            id: `playlist-${idx}`, // Unique ID for playlist items
            name: t.name,
            content: t.url,
            thumbnail: 'fas fa-music', // Icon for tracks
        } as BattleEntry)),
        ...(drumMachineState.drumGrid.length > 0 && !drumMachineState.drumGrid.every(row => row.every(step => !step)) ? [{
            type: 'drum',
            id: 'drum-pattern',
            name: drumMachineState.songTitle || 'Untitled Beat',
            content: `A ${drumMachineState.patternLength}-step beat at ${drumMachineState.bpm} BPM.`,
            thumbnail: 'fas fa-drum', // Icon for drum patterns
        } as BattleEntry] : []),
        ...(appNotepadContent.trim() !== '' ? [{
            type: 'lyrics',
            id: 'lyrics',
            name: 'My Latest Lyrics',
            content: appNotepadContent,
            thumbnail: 'fas fa-feather-alt', // Icon for lyrics
        } as BattleEntry] : []),
    ];

    const stopAllPlayback = useCallback(() => {
        if (playingContentId !== null) {
            stopClip(playingContentId);
            setPlayingContentId(null);
        }
        if (playingMusicPlayerTrackIndexRef.current !== null) {
            // Need a way to stop music player without advancing or affecting its state much
            // For now, will just pause if it's the active track.
            // If the current track is playing, togglePlayPause will pause it.
            // This is a workaround, a dedicated pause method would be better.
            if (musicPlayerState.isPlaying && musicPlayerState.currentTrackIndex === playingMusicPlayerTrackIndexRef.current) {
                // If the currently playing Music Player track is the one we're trying to stop,
                // calling playMusicPlayerTrack again will toggle it to pause.
                playMusicPlayerTrack(musicPlayerState.currentTrackIndex);
            }
            playingMusicPlayerTrackIndexRef.current = null;
        }
        if (isDrumPlayingRef.current) {
            toggleDrumMachinePlay(); // Toggle to stop
            isDrumPlayingRef.current = false;
        }
        // Also stop any actively playing drum machine.
        if (drumMachineState.isPlaying) {
             toggleDrumMachinePlay();
        }
    }, [playingContentId, stopClip, musicPlayerState.isPlaying, musicPlayerState.currentTrackIndex, playMusicPlayerTrack, drumMachineState.isPlaying, toggleDrumMachinePlay]);

    useEffect(() => {
        return () => {
            stopAllPlayback();
        };
    }, [stopAllPlayback]);

    const handleSelectCreation = useCallback((entry: BattleEntry) => {
        setUserSelection(entry);
        // Simulate AI selecting a random entry
        const aiOptions = [
            { type: 'drum', id: 'ai-drum', name: 'AI Generated Beat', content: 'A powerful AI-generated beat at 125 BPM.', thumbnail: 'fas fa-drum' },
            { type: 'lyrics', id: 'ai-lyrics', name: 'AI Freestyle Rap', content: 'Yo, in the digital realm, where the beats collide, SMUVE\'s the name, by my side, can\'t hide...', thumbnail: 'fas fa-feather-alt' },
            { type: 'track', id: 'ai-track', name: 'AI Synth Anthem', content: 'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/loops/house-beat-120.wav', thumbnail: 'fas fa-music' },
        ];
        setAiSelection(aiOptions[Math.floor(Math.random() * aiOptions.length)] as BattleEntry);
        setPhase('showcase');
        onSendOnlineChatMessage('user', `I'm entering the battle with my ${entry.type}!`);
        onSendOnlineChatMessage('opponent', `Alright, my turn! I'll counter with my latest ${aiOptions[0].type}.`); // Use first AI option for initial chat
    }, [onSendOnlineChatMessage]);

    const handlePlayContent = useCallback(async (entry: BattleEntry) => {
        stopAllPlayback(); // Ensure other content is stopped
        if (entry.type === 'clip') {
            playClip(entry.id as number);
            setPlayingContentId(entry.id as number);
        } else if (entry.type === 'track') {
            const trackIndex = musicPlayerState.playlist.findIndex(t => t.url === entry.content);
            if (trackIndex !== -1) {
                await playMusicPlayerTrack(trackIndex);
                playingMusicPlayerTrackIndexRef.current = trackIndex;
            } else {
                // If it's an AI track, need to manually create an audio element
                const audio = new Audio(entry.content);
                audio.volume = 0.5; // Lower volume for AI track
                audio.play();
                const timeout = setTimeout(() => audio.pause(), 5000); // Play for 5 seconds
                audio.onended = () => clearTimeout(timeout);
                showToast('Playing AI track...', 'info');
            }
        } else if (entry.type === 'drum') {
            if (!drumMachineState.isPlaying) { // Only toggle if not already playing
                 toggleDrumMachinePlay();
            }
            isDrumPlayingRef.current = true;
            // Stop after a set time if it's a drum pattern loop
            if (drumMachineTimerRef.current) clearTimeout(drumMachineTimerRef.current);
            drumMachineTimerRef.current = setTimeout(() => {
                if (drumMachineState.isPlaying) { // Check if still playing
                    toggleDrumMachinePlay();
                    isDrumPlayingRef.current = false;
                }
            }, 10000) as unknown as number; // Play for 10 seconds
        }
        showToast(`Playing ${entry.type}: "${entry.name}"`, 'info');
    }, [stopAllPlayback, playClip, musicPlayerState.playlist, musicPlayerState.isPlaying, playMusicPlayerTrack, drumMachineState.isPlaying, toggleDrumMachinePlay, drumMachineTimerRef, showToast]);


    const handleJudgeBattle = useCallback(() => {
        setIsLoadingBattle(true);
        stopAllPlayback();
        onSendOnlineChatMessage('opponent', "The judges are deliberating...");
        setTimeout(() => {
            const outcome = Math.random();
            let result: 'win' | 'lose' | 'tie';
            let message: string;
            if (outcome < 0.4) {
                result = 'win';
                message = "You won! The crowd loved it!";
                onSendOnlineChatMessage('opponent', "Darn! You got me this round. Well played!");
            } else if (outcome < 0.8) {
                result = 'lose';
                message = `${opponentName} wins! Better luck next time.`;
                onSendOnlineChatMessage('opponent', "Haha! Looks like the judges sided with me. Good battle!");
            } else {
                result = 'tie';
                message = "It's a tie! A truly epic clash!";
                onSendOnlineChatMessage('opponent', "A tie! A battle for the ages. Respect!");
            }
            setBattleResult(result);
            setMessage(message); // Update local message
            setPhase('results');
            setIsLoadingBattle(false);
            showToast(message, result === 'win' ? 'success' : result === 'tie' ? 'info' : 'error');
        }, 3000);
    }, [opponentName, onSendOnlineChatMessage, showToast, stopAllPlayback]);

    const handleRematch = useCallback(() => {
        setPhase('selection');
        setUserSelection(null);
        setAiSelection(null);
        setBattleResult(null);
        setMessage('Select your creation to battle!');
        onSendOnlineChatMessage('user', "Rematch?");
    }, [onSendOnlineChatMessage]);

    const [message, setMessage] = useState('Select your creation to battle!');
    const displayOpponentName = isOnline ? opponentName : 'S.M.U.V.E.';

    return (
        <Card className="music-battle-container bg-gray-900/50 border-purple-500/30 shadow-lg shadow-purple-500/20 w-full h-full p-4 flex flex-col justify-between relative">
            <div className="flex justify-between items-start">
                <Button onClick={onBack} variant="secondary">Back to Lobby</Button>
                {phase !== 'selection' && <Button onClick={handleRematch} variant="secondary">Rematch</Button>}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <h3 className="text-3xl font-bold text-purple-300 font-orbitron mb-4">Music Battle</h3>
                <p className="text-white text-xl text-center mb-6">{message}</p>

                {phase === 'selection' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                        {playerAvailableCreations.length === 0 ? (
                            <p className="text-gray-500 col-span-full text-center">You haven't created any content yet! Visit Vocal Booth, Music Player, Drum Machine, or Lyrics to create something.</p>
                        ) : (
                            playerAvailableCreations.map((entry, index) => (
                                <Card key={index} variant="interactive" className="bg-gray-800/60 border-purple-700/50 p-4 flex flex-col items-center text-center">
                                    <i className={`fas ${entry.thumbnail || 'fa-file-alt'} text-4xl text-purple-400 mb-3`}></i>
                                    <h4 className="font-bold text-lg text-purple-200 mb-1 truncate w-full">{entry.name}</h4>
                                    <p className="text-xs text-gray-400 mb-3">{entry.type}</p>
                                    <Button onClick={() => handleSelectCreation(entry)} className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                                        Select
                                    </Button>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {(phase === 'showcase' || phase === 'judging' || phase === 'results') && userSelection && aiSelection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-4">
                        {/* User's Entry */}
                        <Card className="bg-gray-800/60 border-blue-500/50 p-4 flex flex-col items-center text-center relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-1 rounded-full text-sm font-semibold">YOU</span>
                            <i className={`fas ${userSelection.thumbnail || 'fa-file-alt'} text-5xl text-blue-400 mb-4`}></i>
                            <h4 className="font-bold text-xl text-blue-200 mb-2">{userSelection.name}</h4>
                            <p className="text-sm text-gray-400 mb-4 italic">({userSelection.type})</p>
                            {userSelection.type !== 'lyrics' && (
                                <Button 
                                    onClick={() => handlePlayContent(userSelection)} 
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                                    disabled={isLoadingBattle}
                                >
                                    <i className="fas fa-play mr-2"></i> Play Showcase
                                </Button>
                            )}
                            {userSelection.type === 'lyrics' && (
                                <div className="max-h-40 overflow-y-auto custom-scrollbar text-sm text-gray-300 mt-4 p-2 bg-gray-900/50 rounded-md w-full text-left">
                                    {userSelection.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            )}
                        </Card>

                        <div className="relative flex items-center justify-center">
                            <span className="text-5xl font-bold text-white font-orbitron">VS</span>
                        </div>

                        {/* AI Opponent's Entry */}
                        <Card className="bg-gray-800/60 border-red-500/50 p-4 flex flex-col items-center text-center relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 px-3 py-1 rounded-full text-sm font-semibold">{displayOpponentName.toUpperCase()}</span>
                            <i className={`fas ${aiSelection.thumbnail || 'fa-robot'} text-5xl text-red-400 mb-4`}></i>
                            <h4 className="font-bold text-xl text-red-200 mb-2">{aiSelection.name}</h4>
                            <p className="text-sm text-gray-400 mb-4 italic">({aiSelection.type})</p>
                            {aiSelection.type !== 'lyrics' && (
                                <Button 
                                    onClick={() => handlePlayContent(aiSelection)} 
                                    className="w-full bg-red-600 hover:bg-red-500 text-white"
                                    disabled={isLoadingBattle}
                                >
                                    <i className="fas fa-play mr-2"></i> Play Showcase
                                </Button>
                            )}
                            {aiSelection.type === 'lyrics' && (
                                <div className="max-h-40 overflow-y-auto custom-scrollbar text-sm text-gray-300 mt-4 p-2 bg-gray-900/50 rounded-md w-full text-left">
                                    {aiSelection.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {(phase === 'showcase' || phase === 'judging') && (
                    <Button onClick={handleJudgeBattle} disabled={isLoadingBattle} className="mt-8 bg-green-600 hover:bg-green-500 text-black px-8 py-3 text-lg">
                        {isLoadingBattle ? <Spinner /> : <><i className="fas fa-gavel mr-2"></i> Judge Battle</>}
                    </Button>
                )}

                {phase === 'results' && battleResult && (
                    <div className={`mt-8 p-6 rounded-lg text-center ${battleResult === 'win' ? 'bg-green-800/50 border-green-500' : battleResult === 'lose' ? 'bg-red-800/50 border-red-500' : 'bg-yellow-800/50 border-yellow-500'} border-2`}>
                        <p className="text-4xl font-bold font-orbitron mb-4">
                            {battleResult === 'win' ? 'VICTORY!' : battleResult === 'lose' ? 'DEFEAT' : 'TIE!'}
                        </p>
                        <p className="text-lg text-gray-200">{message}</p>
                    </div>
                )}
            </div>

            {isOnline && (
                <OnlineGameHUD
                    opponentName={opponentName}
                    chatMessages={onlineChatMessages}
                    onSendChatMessage={onSendOnlineChatMessage}
                    game="Chess" // Can be any game type, just for styling
                />
            )}
            <style>{`
                .music-battle-container {
                    background-image: url('https://www.transparenttextures.com/patterns/clean-textile.png');
                    background-color: #4c1d95; /* Deep purple */
                }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #a855f7; border-radius: 4px; border: 2px solid #1f2937; }
            `}</style>
        </Card>
    );
};

export default MusicBattleGame;