import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import OnlineGameHUD from './OnlineGameHUD'; // New import

// --- TYPES & LOGIC ---
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface CardData { suit: Suit; rank: Rank; }
type Hand = CardData[];

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = (): CardData[] => SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })));
const shuffleDeck = (deck: CardData[]): CardData[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getCardValue = (card: CardData): number[] => {
    if (card.rank === 'A') return [1, 11];
    if (['K', 'Q', 'J'].includes(card.rank)) return [10];
    return [parseInt(card.rank)];
};

const getHandValue = (hand: Hand): number => {
    let sum = 0;
    let numAces = 0;
    hand.forEach(card => {
        const values = getCardValue(card);
        sum += values[0];
        if (values.length > 1) numAces++;
    });
    while (numAces > 0 && sum + 10 <= 21) {
        sum += 10;
        numAces--;
    }
    return sum;
};

// --- COMPONENTS ---
const PlayingCard: React.FC<{ card?: CardData; hidden?: boolean }> = React.memo(({ card, hidden }) => (
    <div className={`playing-card ${hidden ? 'hidden' : ''} ${card?.suit === '♥' || card?.suit === '♦' ? 'red' : 'black'}`}>
        {!hidden && card && (
            <>
                <div className="rank top">{card.rank}</div>
                <div className="suit">{card.suit}</div>
                <div className="rank bottom">{card.rank}</div>
            </>
        )}
    </div>
));
PlayingCard.displayName = 'PlayingCard';

interface BlackjackGameProps { 
    onBack: () => void; 
    isOnline: boolean; 
    opponentName: string;
    onlineChatMessages: { sender: 'user' | 'opponent'; text: string }[];
    onSendOnlineChatMessage: (sender: 'user' | 'opponent', text: string) => void;
}

const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBack, isOnline, opponentName, onlineChatMessages, onSendOnlineChatMessage }) => {
    const [deck, setDeck] = useState<CardData[]>([]);
    const [playerHand, setPlayerHand] = useState<Hand>([]);
    const [dealerHand, setDealerHand] = useState<Hand>([]);
    const [gameState, setGameState] = useState<'betting' | 'player' | 'dealer' | 'end'>('betting');
    const [message, setMessage] = useState('Place your bet to start.');
    const [bank, setBank] = useState(500);
    const [bet, setBet] = useState(10);
    
    const startRound = useCallback(() => {
        const newDeck = shuffleDeck(createDeck());
        setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
        setDealerHand([newDeck.pop()!, newDeck.pop()!]);
        setDeck(newDeck);
        setGameState('player');
        setMessage('Your turn. Hit or Stand?');
        if (isOnline) onSendOnlineChatMessage('opponent', "Let's play some cards!");
    }, [isOnline, onSendOnlineChatMessage]);

    useEffect(() => {
        if (gameState === 'player' && getHandValue(playerHand) >= 21) {
            setGameState('dealer');
        }
    }, [playerHand, gameState]);

    useEffect(() => {
        if (gameState === 'dealer') {
            const playerScore = getHandValue(playerHand);
            if (playerScore > 21) {
                setMessage('Bust! You lose.');
                setBank(prev => prev - bet);
                setGameState('end');
                if (isOnline) onSendOnlineChatMessage('opponent', "Looks like you busted. Better luck next time!");
                return;
            }

            if (isOnline) onSendOnlineChatMessage('opponent', "My turn now. Let's see...");
            let currentDealerHand = [...dealerHand];
            const dealerTurn = () => {
                let dealerScore = getHandValue(currentDealerHand);
                if (dealerScore < 17) {
                    const newCard = deck.pop()!;
                    currentDealerHand.push(newCard);
                    setDealerHand([...currentDealerHand]);
                    setDeck([...deck]);
                    if (isOnline) onSendOnlineChatMessage('opponent', "Hitting again!");
                    setTimeout(dealerTurn, 1000);
                } else {
                    if (dealerScore > 21 || playerScore > dealerScore) {
                        setMessage('You win!');
                        setBank(prev => prev + bet);
                        if (isOnline) onSendOnlineChatMessage('opponent', "Darn! You got me this round.");
                    } else if (playerScore < dealerScore) {
                        setMessage('You lose.');
                        setBank(prev => prev - bet);
                        if (isOnline) onSendOnlineChatMessage('opponent', "Dealer wins! Hard luck.");
                    } else {
                        setMessage('Push.');
                        if (isOnline) onSendOnlineChatMessage('opponent', "It's a push. Close one!");
                    }
                    setGameState('end');
                }
            };
            setTimeout(dealerTurn, 1000);
        }
    }, [gameState, dealerHand, playerHand, deck, bet, isOnline, onSendOnlineChatMessage]);


    const handleBet = (amount: number) => {
        if (gameState !== 'betting') return;
        setBet(amount);
        startRound();
        if (isOnline) onSendOnlineChatMessage('user', `Betting $${amount}`);
    };

    const handleHit = () => {
        if (gameState !== 'player') return;
        const newCard = deck.pop()!;
        setPlayerHand([...playerHand, newCard]);
        setDeck([...deck]);
        if (isOnline) onSendOnlineChatMessage('user', "Hit me!");
    };

    const handleStand = () => {
        if (gameState !== 'player') return;
        setGameState('dealer');
        if (isOnline) onSendOnlineChatMessage('user', "Standing.");
    };

    const handleNewRound = () => {
        setGameState('betting');
        setPlayerHand([]);
        setDealerHand([]);
        setMessage('Place your bet to start.');
        setBet(10);
        if (isOnline) onSendOnlineChatMessage('user', "New round!");
    };

    const displayOpponentName = isOnline ? opponentName : 'S.M.U.V.E.';

    return (
        <Card className="blackjack-container bg-green-900/50 border-green-500/30 shadow-lg shadow-green-500/20 w-full h-full p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <Button onClick={onBack} variant="secondary">Back to Lobby</Button>
                <div className="text-right">
                    <p className="text-xl font-bold text-yellow-300">Bank: ${bank}</p>
                    <p className="text-md text-gray-300">Bet: ${bet}</p>
                </div>
            </div>

            <div className="blackjack-table flex flex-col items-center justify-around flex-grow relative"> {/* Added relative for HUD positioning */}
                {/* Dealer's Area */}
                <div>
                    <h3 className="text-xl font-bold text-center mb-2">{displayOpponentName}'s Hand ({gameState === 'dealer' || gameState === 'end' ? getHandValue(dealerHand) : '?'})</h3>
                    <div className="hand">
                        {dealerHand.map((card, i) => <PlayingCard key={i} card={card} hidden={gameState === 'player' && i === 0} />)}
                    </div>
                </div>

                {/* Message Area */}
                <div className="game-status my-4">
                    <p className="text-2xl font-bold text-white text-center">{message}</p>
                </div>

                {/* Player's Area */}
                <div>
                    <div className="hand">
                        {playerHand.map((card, i) => <PlayingCard key={i} card={card} />)}
                    </div>
                    <h3 className="text-xl font-bold text-center mt-2">Your Hand ({getHandValue(playerHand)})</h3>
                </div>
                 {isOnline && (
                    <OnlineGameHUD 
                        opponentName={opponentName} 
                        chatMessages={onlineChatMessages} 
                        onSendChatMessage={onSendOnlineChatMessage} 
                        game="Blackjack"
                    />
                )}
            </div>

            {/* Controls */}
            <div className="game-controls flex justify-center items-center gap-4 p-4 bg-black/30 rounded-lg">
                {gameState === 'betting' && [10, 25, 50, 100].map(amount => (
                    <Button key={amount} onClick={() => handleBet(amount)} disabled={bank < amount} className="bet-chip bg-green-600 hover:bg-green-500 text-black">${amount}</Button>
                ))}
                {gameState === 'player' && (
                    <>
                        <Button onClick={handleHit} variant="primary" className="bg-green-600 hover:bg-green-500">Hit</Button>
                        <Button onClick={handleStand} variant="secondary">Stand</Button>
                    </>
                )}
                {gameState === 'end' && (
                    <Button onClick={handleNewRound} variant="primary" className="bg-green-600 hover:bg-green-500">New Round</Button>
                )}
            </div>
            <style>{`
                .blackjack-container {
                    background-image: url('https://www.transparenttextures.com/patterns/dark-green-fibers.png');
                    background-color: #065f46;
                }
                .blackjack-table {
                    position: relative;
                }
                .hand {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 10px;
                }
                .playing-card {
                    width: 70px;
                    height: 100px;
                    background-color: #fff;
                    border-radius: 8px;
                    border: 1px solid #333;
                    position: relative;
                    box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                    font-weight: bold;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    padding: 5px;
                }
                .playing-card.hidden {
                    background-color: #333;
                    background-image: linear-gradient(135deg, #444 25%, #555 25%, #555 50%, #444 50%, #444 75%, #555 75%, #555 100%);
                    background-size: 8px 8px;
                    color: transparent;
                }
                .playing-card .rank.top {
                    align-self: flex-start;
                    font-size: 1.1em;
                }
                .playing-card .rank.bottom {
                    align-self: flex-end;
                    transform: rotate(180deg);
                    font-size: 1.1em;
                }
                .playing-card .suit {
                    font-size: 2em;
                    line-height: 1;
                }
                .playing-card.red { color: #ef4444; } /* red-500 */
                .playing-card.black { color: #333; }
                .game-status {
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                }
                .bet-chip {
                    width: 60px;
                    height: 40px;
                    border-radius: 20px;
                    font-size: 1.1em;
                    box-shadow: inset 0 0 5px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.3);
                }
            `}</style>
        </Card>
    );
};

export default React.memo(BlackjackGame);