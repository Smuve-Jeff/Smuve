import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from '../common/Button';

interface ChatMessage {
  sender: 'user' | 'opponent';
  text: string;
}

interface OnlineGameHUDProps {
  opponentName: string;
  chatMessages: ChatMessage[];
  onSendChatMessage: (sender: 'user' | 'opponent', text: string) => void;
  game: 'Chess' | 'Blackjack' | 'Dominoes';
}

const quickChatOptions = [
  "Good game!", "Thinking...", "My turn!", "Your turn!", "Nice move!", "Unlucky!", "GG!"
];

const OnlineGameHUD: React.FC<OnlineGameHUDProps> = ({
  opponentName,
  chatMessages,
  onSendChatMessage,
  game,
}) => {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (chatInput.trim()) {
      onSendChatMessage('user', chatInput.trim());
      setChatInput('');
    }
  }, [chatInput, onSendChatMessage]);

  const handleQuickChat = useCallback((message: string) => {
    onSendChatMessage('user', message);
  }, [onSendChatMessage]);

  const gameColors = {
    Chess: { border: 'border-purple-500/50', bg: 'bg-purple-900/30', text: 'text-purple-300' },
    Blackjack: { border: 'border-green-500/50', bg: 'bg-green-900/30', text: 'text-green-300' },
    Dominoes: { border: 'border-emerald-500/50', bg: 'bg-emerald-900/30', text: 'text-emerald-300' },
  };

  const colors = gameColors[game] || gameColors.Chess;

  return (
    <div className={`absolute bottom-2 right-2 w-72 h-[calc(100%-1rem)] max-h-96 ${colors.border} ${colors.bg} backdrop-blur-sm rounded-lg shadow-xl flex flex-col p-2 overflow-hidden z-20`}>
      {/* Multiplayer Status Banner */}
      <div className={`p-2 mb-2 rounded-md border ${colors.border} bg-gray-900/50 text-center font-bold text-yellow-300 text-sm`}>
        <i className="fas fa-wifi mr-2 text-blue-400 animate-pulse"></i> Online Match vs {opponentName}
      </div>

      {/* Chat Window */}
      <div className="flex-grow overflow-y-auto custom-scrollbar-chat pr-1 mb-2">
        {chatMessages.map((msg, index) => (
          <div key={index} className={`text-sm mb-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg max-w-[80%] ${
              msg.sender === 'user' ? 'bg-blue-800/60 text-blue-200' : 'bg-gray-800/60 text-green-200'
            }`}>
              {msg.sender === 'opponent' && <strong className="block text-yellow-400">{opponentName}:</strong>}
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chat */}
      <div className="flex flex-wrap gap-1 mb-2">
        {quickChatOptions.map((msg, index) => (
          <Button
            key={index}
            onClick={() => handleQuickChat(msg)}
            className="text-xs px-2 py-1 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300"
            variant="secondary"
          >
            {msg}
          </Button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendChat} className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type message..."
          className={`flex-grow bg-gray-900/80 border ${colors.border} rounded-md p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 ${colors.text} placeholder-gray-500`}
        />
        <Button type="submit" variant="primary" className="bg-yellow-600 hover:bg-yellow-500 text-black p-2" aria-label="Send Chat">
          <i className="fas fa-paper-plane text-sm"></i>
        </Button>
      </form>
       <style>{`
        .custom-scrollbar-chat::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-chat::-webkit-scrollbar-track {
          background: #00000030;
        }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb {
          background-color: #eab30880; /* yellow-500 with transparency */
          border-radius: 10px;
          border: 1px solid #00000030;
        }
      `}</style>
    </div>
  );
};

export default React.memo(OnlineGameHUD);