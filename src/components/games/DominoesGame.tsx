import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import OnlineGameHUD from './OnlineGameHUD'; // New import

// --- TYPES & LOGIC ---
interface Domino { top: number; bottom: number; }
const createDominoSet = (): Domino[] => {
    const set: Domino[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            set.push({ top: i, bottom: j });
        }
    }
    return set;
};

// --- COMPONENTS ---
const DominoTile: React.FC<{ domino: Domino; orientation?: 'h' | 'v' }> = React.memo(({ domino, orientation = 'v' }) => (
    <div className={`domino-tile ${orientation}`}>
        <div className="half">{Array.from({ length: domino.top }).map((_, i) => <div key={i} className="pip" />)}</div>
        <div className="half">{Array.from({ length: domino.bottom }).map((_, i) => <div key={i} className="pip" />)}</div>
    </div>
));
DominoTile.displayName = 'DominoTile';

interface DominoesGameProps { 
    onBack: () => void; 
    isOnline: boolean; 
    opponentName: string;
    onlineChatMessages: { sender: 'user' | 'opponent'; text: string }[];
    onSendOnlineChatMessage: (sender: 'user' | 'opponent', text: string) => void;
}

const DominoesGame: React.FC<DominoesGameProps> = ({ onBack, isOnline, opponentName, onlineChatMessages, onSendOnlineChatMessage }) => {
    const [playerHand, setPlayerHand] = useState<Domino[]>([]);
    const [aiHand, setAiHand] = useState<Domino[]>([]);
    const [board, setBoard] = useState<Domino[]>([]);
    const [boneyard, setBoneyard] = useState<Domino[]>([]);
    const [turn, setTurn] = useState<'player' | 'ai'>('player');
    const [message, setMessage] = useState('Start the game!');

    const startGame = useCallback(() => {
        const set = createDominoSet().sort(() => Math.random() - 0.5);
        setPlayerHand(set.slice(0, 7));
        setAiHand(set.slice(7, 14));
        setBoneyard(set.slice(14));
        setBoard([]);
        setTurn('player');
        setMessage('Your turn to play.');
        if (isOnline) onSendOnlineChatMessage('opponent', "Ready to lay some tiles?");
    }, [isOnline, onSendOnlineChatMessage]);

    useEffect(startGame, [startGame]);

    const makeAiMove = useCallback(() => {
        if (isOnline) onSendOnlineChatMessage('opponent', "Thinking about my move...");
        setTimeout(() => {
            const ends = board.length === 0 ? [null, null] : [board[0].top, board[board.length - 1].bottom];
            for (let i = 0; i < aiHand.length; i++) {
                const tile = aiHand[i];
                if (board.length === 0 || tile.top === ends[1] || tile.bottom === ends[1] || tile.top === ends[0] || tile.bottom === ends[0]) {
                    const newAiHand = aiHand.filter((_, idx) => i !== idx);
                    let newBoard = [...board];
                    if (board.length === 0) {
                        newBoard.push(tile);
                    } else if(tile.top === ends[1]) {
                        newBoard.push(tile);
                    } else if (tile.bottom === ends[1]) {
                        newBoard.push({top: tile.bottom, bottom: tile.top});
                    } else if (tile.bottom === ends[0]) {
                        newBoard.unshift(tile);
                    } else { // tile.top === ends[0]
                        newBoard.unshift({top: tile.bottom, bottom: tile.top});
                    }
                    setAiHand(newAiHand);
                    setBoard(newBoard);
                    setTurn('player');
                    setMessage('Your turn.');
                    if (isOnline) onSendOnlineChatMessage('opponent', "My move!");
                    return;
                }
            }
            // Cannot play, draw from boneyard
            if (boneyard.length > 0) {
                const newTile = boneyard[0];
                setAiHand(prev => [...prev, newTile]);
                setBoneyard(prev => prev.slice(1));
                setMessage(`${displayOpponentName} drew from the boneyard.`);
                if (isOnline) onSendOnlineChatMessage('opponent', "No moves, drawing a tile.");
                makeAiMove(); // try again
            } else {
                setMessage(`${displayOpponentName} passed. Your turn.`);
                setTurn('player');
                if (isOnline) onSendOnlineChatMessage('opponent', "I have to pass. Your go!");
            }
        }, 1500);
    }, [aiHand, board, boneyard, isOnline, onSendOnlineChatMessage]);

    const handlePlayerMove = (tile: Domino, index: number) => {
        if (turn !== 'player') return;
        const ends = board.length === 0 ? [null, null] : [board[0].top, board[board.length - 1].bottom];
        let played = false;
        
        if (board.length === 0) {
            setBoard([tile]);
            played = true;
        } else if (tile.top === ends[1]) {
            setBoard(b => [...b, tile]); played = true;
        } else if (tile.bottom === ends[1]) {
            setBoard(b => [...b, {top: tile.bottom, bottom: tile.top}]); played = true;
        } else if (tile.bottom === ends[0]) {
            setBoard(b => [tile, ...b]); played = true;
        } else if (tile.top === ends[0]) {
            setBoard(b => [{top: tile.bottom, bottom: tile.top}, ...b]); played = true;
        }

        if (played) {
            setPlayerHand(prev => prev.filter((_, i) => i !== index));
            setTurn('ai');
            setMessage(`${displayOpponentName}'s turn.`);
            if (isOnline) onSendOnlineChatMessage('user', `Played a [${tile.top}|${tile.bottom}]`);
            makeAiMove();
        } else {
            setMessage('Invalid move.');
        }
    };
    
    const displayOpponentName = isOnline ? opponentName : 'S.M.U.V.E.';

    return (
        <Card className="dominoes-container bg-emerald-900/50 border-emerald-500/30 w-full h-full p-4 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <Button onClick={onBack} variant="secondary">Back to Lobby</Button>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-emerald-300">{displayOpponentName}'s Hand ({aiHand.length})</h3>
                    <div className="flex justify-center gap-1 mt-1">
                        {aiHand.map((_, i) => <div key={i} className="domino-tile-back" />)}
                    </div>
                </div>
                <Button onClick={startGame} variant="secondary">New Game</Button>
            </div>
            
            <div className="domino-table relative flex-grow"> {/* Added relative for HUD positioning */}
                <div className="domino-board">
                    {board.map((d, i) => <DominoTile key={i} domino={d} orientation="h" />)}
                </div>
                {isOnline && (
                    <OnlineGameHUD 
                        opponentName={opponentName} 
                        chatMessages={onlineChatMessages} 
                        onSendChatMessage={onSendOnlineChatMessage} 
                        game="Dominoes"
                    />
                )}
            </div>

            <div className="mt-auto pt-4">
                <div className="game-status text-center mb-4">
                    <p className="text-xl font-bold text-white">{message}</p>
                </div>
                <Card className="player-area bg-black/30 p-4">
                    <h3 className="text-lg font-bold text-center mb-2">Your Hand ({playerHand.length})</h3>
                    <div className="player-hand">
                        {playerHand.map((d, i) => (
                            <button key={i} onClick={() => handlePlayerMove(d, i)} className="domino-button">
                                <DominoTile domino={d} />
                            </button>
                        ))}
                    </div>
                </Card>
            </div>
            <style>{`
                .dominoes-container {
                    background-image: url('https://www.transparenttextures.com/patterns/dark-mosaic.png');
                    background-color: #047857; /* emerald-700 */
                }
                .domino-table {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-grow: 1;
                    padding: 20px;
                }
                .domino-board {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 5px;
                    border: 2px dashed #a7f3d0; /* emerald-200 */
                    padding: 10px;
                    border-radius: 8px;
                    background-color: rgba(0,0,0,0.1);
                }
                .domino-tile {
                    border: 2px solid #a7f3d0;
                    border-radius: 5px;
                    background-color: #f0fdf4; /* emerald-50 */
                    display: flex;
                    flex-direction: column;
                    justify-content: space-around;
                    align-items: center;
                    padding: 5px 0;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
                }
                .domino-tile.v { width: 35px; height: 75px; }
                .domino-tile.h { width: 75px; height: 35px; flex-direction: row; padding: 0 5px; }

                .domino-tile .half {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-content: center;
                    width: 100%;
                    height: 50%;
                    position: relative;
                }
                .domino-tile.v .half:first-child { border-bottom: 1px solid #a7f3d0; }
                .domino-tile.h .half:first-child { border-right: 1px solid #a7f3d0; }

                .domino-tile .pip {
                    width: 7px;
                    height: 7px;
                    background-color: #333;
                    border-radius: 50%;
                    margin: 2px;
                }
                .domino-tile-back {
                    width: 35px;
                    height: 75px;
                    background-color: #059669; /* emerald-600 */
                    border: 2px solid #a7f3d0;
                    border-radius: 5px;
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                    position: relative;
                }
                .domino-tile-back::before {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background-color: #f0fdf4;
                    border-radius: 50%;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 5px #f0fdf480;
                }
                .player-hand {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 10px;
                }
                .domino-button {
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    transition: transform 0.2s ease-out;
                }
                .domino-button:hover {
                    transform: translateY(-5px) scale(1.05);
                }
            `}</style>
        </Card>
    );
};

export default React.memo(DominoesGame);