import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ToggleSwitch from '../components/common/ToggleSwitch';
import Spinner from '../components/common/Spinner';
import { useToast } from '../services/ToastContext';
import OnlineGameHUD from '../components/games/OnlineGameHUD'; // New import
import UserCreations from '../components/thespot/UserCreations'; // New import for UserCreations

// Lazy load games for faster initial load
const ChessGame = lazy(() => import('../components/games/ChessGame'));
const BlackjackGame = lazy(() => import('../components/games/BlackjackGame'));
const DominoesGame = lazy(() => import('../components/games/DominoesGame'));
const MusicBattleGame = lazy(() => import('../components/games/MusicBattleGame')); // New: Music Battle Game

interface OnlinePlayer {
    id: number;
    name: string;
    status: 'Online' | 'In Game';
}

const TheSpot: React.FC = () => {
    const { showToast } = useToast();
    const [selectedGame, setSelectedGame] = useState<'chess' | 'blackjack' | 'dominoes' | 'music-battle' | null>(null);
    const [isOnlineMode, setIsOnlineMode] = useState(false);
    const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([
        { id: 1, name: 'Smuve_AI_Bot', status: 'Online' },
        { id: 2, name: 'BeatMaster99', status: 'In Game' },
        { id: 3, name: 'LyricLover22', status: 'Online' },
    ]);
    const [selectedOnlinePlayer, setSelectedOnlinePlayer] = useState<OnlinePlayer | null>(null);
    const [currentOnlineOpponentName, setCurrentOnlineOpponentName] = useState('S.M.U.V.E.'); // Default opponent is AI
    const [onlineChatMessages, setOnlineChatMessages] = useState<{ sender: 'user' | 'opponent'; text: string }[]>([]);


    useEffect(() => {
        if (!isOnlineMode) {
            setCurrentOnlineOpponentName('S.M.U.V.E.'); // Reset to AI if not online
            setSelectedOnlinePlayer(null);
            setOnlineChatMessages([]);
        }
    }, [isOnlineMode]);

    const handleBackToLobby = useCallback(() => {
        setSelectedGame(null);
        setOnlineChatMessages([]); // Clear chat when returning to lobby
        // If coming back from online game, reset opponent to AI
        if (selectedOnlinePlayer) {
            setCurrentOnlineOpponentName('S.M.U.V.E.');
            setSelectedOnlinePlayer(null);
            setIsOnlineMode(false); // Assume leaving online mode when backing to lobby
        }
    }, [selectedOnlinePlayer]);

    const handleSelectGame = useCallback((game: 'chess' | 'blackjack' | 'dominoes' | 'music-battle') => {
        if (!isOnlineMode) {
            setCurrentOnlineOpponentName('S.M.U.V.E.'); // Ensure AI is opponent if offline
        } else if (!selectedOnlinePlayer) {
             showToast("Please select an online opponent to play against.", 'error');
             return;
        }
        setSelectedGame(game);
        setOnlineChatMessages([]); // Clear chat for new game
    }, [isOnlineMode, selectedOnlinePlayer, showToast]);

    const handleJoinOnlineMatch = useCallback((player: OnlinePlayer) => {
        setSelectedOnlinePlayer(player);
        setCurrentOnlineOpponentName(player.name);
        setIsOnlineMode(true);
        showToast(`Joined online match with ${player.name}!`, 'success');
        // Simulate initial chat message from opponent
        setOnlineChatMessages([{ sender: 'opponent', text: `Hey, ready to play? 👋` }]);
    }, [showToast]);

    const handleSendOnlineChatMessage = useCallback((sender: 'user' | 'opponent', text: string) => {
        setOnlineChatMessages(prev => [...prev, { sender, text }]);
        // Simple AI response for opponent
        if (sender === 'user' && currentOnlineOpponentName === 'Smuve_AI_Bot') {
            setTimeout(() => {
                const aiResponses = [
                    "Thinking...",
                    "Got it!",
                    "That's a good point.",
                    "Hmm, interesting move.",
                    "Haha, nice one!",
                    "I agree.",
                    "Let's see...",
                ];
                setOnlineChatMessages(prev => [...prev, { sender: 'opponent', text: aiResponses[Math.floor(Math.random() * aiResponses.length)] }]);
            }, 1000);
        }
    }, [currentOnlineOpponentName]);

    return (
        <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200 relative">
            <div className="text-center mb-8 z-10">
                <h2 className="text-3xl font-bold text-cyan-400 font-orbitron">Tha Spot</h2>
                <p className="text-gray-400 mt-2">Connect, compete, and showcase your creations!</p>
            </div>

            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#00ffff12_1px,transparent_1px),linear-gradient(to_bottom,#00ffff12_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] z-0"></div>

            {selectedGame === null ? (
                <Card className="flex flex-col items-center bg-gray-900/50 border-cyan-500/30 shadow-lg shadow-cyan-500/10 max-w-4xl mx-auto w-full p-8 relative z-10">
                    <h3 className="text-2xl font-bold mb-6 text-cyan-300">Game Lobby</h3>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <ToggleSwitch label="Online Mode" isOn={isOnlineMode} onToggle={() => setIsOnlineMode(!isOnlineMode)} color="cyan" />
                        {isOnlineMode && selectedOnlinePlayer && (
                            <span className="text-green-400 font-semibold">Playing vs: {selectedOnlinePlayer.name}</span>
                        )}
                        {!isOnlineMode && <span className="text-gray-400 font-semibold">Playing vs: S.M.U.V.E.</span>}
                    </div>

                    {isOnlineMode && !selectedOnlinePlayer && (
                        <div className="mb-6 w-full">
                            <h4 className="text-xl font-bold text-yellow-300 mb-4">Online Players</h4>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 border border-gray-700/50 rounded-lg">
                                {onlinePlayers.map(player => (
                                    <div key={player.id} className="flex justify-between items-center bg-gray-800/60 p-3 rounded-md mb-2 last:mb-0">
                                        <div className={`flex items-center gap-3`}>
                                            <div className={`w-3 h-3 rounded-full ${player.status === 'Online' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                                            <span className="text-gray-200">{player.name}</span>
                                            <span className="text-xs text-gray-500">({player.status})</span>
                                        </div>
                                        <Button onClick={() => handleJoinOnlineMatch(player)} disabled={player.status === 'In Game'} className="text-sm bg-cyan-600 hover:bg-cyan-500 text-black">
                                            Join Match
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Only players marked "Online" can be joined.</p>
                        </div>
                    )}

                    <h4 className="text-xl font-bold text-cyan-300 mb-4">Select a Game</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-2xl">
                        <Button 
                            onClick={() => handleSelectGame('chess')} 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                            disabled={isOnlineMode && selectedOnlinePlayer === null}
                        >
                            <i className="fas fa-chess-knight mr-2"></i> Chess
                        </Button>
                        <Button 
                            onClick={() => handleSelectGame('blackjack')} 
                            className="w-full bg-green-600 hover:bg-green-500 text-black"
                            disabled={isOnlineMode && selectedOnlinePlayer === null}
                        >
                            <i className="fas fa-dice mr-2"></i> Blackjack
                        </Button>
                        <Button 
                            onClick={() => handleSelectGame('dominoes')} 
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-black"
                            disabled={isOnlineMode && selectedOnlinePlayer === null}
                        >
                            <i className="fas fa-grip-lines-vertical mr-2"></i> Dominoes
                        </Button>
                        <Button 
                            onClick={() => handleSelectGame('music-battle')} 
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                            disabled={isOnlineMode && selectedOnlinePlayer === null}
                        >
                            <i className="fas fa-drum mr-2"></i> Music Battle
                        </Button>
                    </div>

                    <h4 className="text-xl font-bold text-cyan-300 mt-8 mb-4">Your Creations</h4>
                    <UserCreations 
                        onlinePlayers={onlinePlayers} 
                        isOnlineMode={isOnlineMode && selectedOnlinePlayer !== null} 
                        currentOnlineOpponentName={currentOnlineOpponentName}
                        onSendOnlineChatMessage={handleSendOnlineChatMessage}
                    />
                </Card>
            ) : (
                <div className="game-screen w-full h-full max-w-7xl mx-auto z-10 p-4 rounded-lg">
                    <Suspense fallback={<Spinner />}>
                        {selectedGame === 'chess' && (
                            <ChessGame
                                onBack={handleBackToLobby}
                                isOnline={isOnlineMode}
                                opponentName={currentOnlineOpponentName}
                                onlineChatMessages={onlineChatMessages}
                                onSendOnlineChatMessage={handleSendOnlineChatMessage}
                            />
                        )}
                        {selectedGame === 'blackjack' && (
                            <BlackjackGame
                                onBack={handleBackToLobby}
                                isOnline={isOnlineMode}
                                opponentName={currentOnlineOpponentName}
                                onlineChatMessages={onlineChatMessages}
                                onSendOnlineChatMessage={handleSendOnlineChatMessage}
                            />
                        )}
                        {selectedGame === 'dominoes' && (
                            <DominoesGame
                                onBack={handleBackToLobby}
                                isOnline={isOnlineMode}
                                opponentName={currentOnlineOpponentName}
                                onlineChatMessages={onlineChatMessages}
                                onSendOnlineChatMessage={handleSendOnlineChatMessage}
                            />
                        )}
                        {selectedGame === 'music-battle' && (
                            <MusicBattleGame
                                onBack={handleBackToLobby}
                                isOnline={isOnlineMode}
                                opponentName={currentOnlineOpponentName}
                                onlineChatMessages={onlineChatMessages}
                                onSendOnlineChatMessage={handleSendOnlineChatMessage}
                            />
                        )}
                    </Suspense>
                </div>
            )}
             <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #00000030;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: #06b6d480; /* cyan-500 with transparency */
                  border-radius: 10px;
                  border: 2px solid #00000030;
                }
            `}</style>
        </div>
    );
};

export default TheSpot;