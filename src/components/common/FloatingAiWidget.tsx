import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAiService } from '../../services/AiServiceContext';
import Button from './Button';
import Spinner from './Spinner';

// The parseMarkdown function is removed from here as it's now centralized in src/components/common/Modal.tsx
// All markdown parsing for modals will be handled by the Modal component's internal logic.

const FloatingAiWidget: React.FC = () => {
  const { chatMessages, sendAiCommand, isLoadingAi, isTtsEnabled, toggleTts, voiceCommandState, toggleVoiceCommands, userTranscript, aiTranscript, speakTextOnDemand } = useAiService();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      // Switch from bottom/right to top/left positioning for dragging
      widgetRef.current.style.bottom = 'auto';
      widgetRef.current.style.right = 'auto';
      widgetRef.current.style.top = `${rect.top}px`;
      widgetRef.current.style.left = `${rect.left}px`;
      // Disable transition during drag for smoother movement
      widgetRef.current.classList.remove('transition-all', 'duration-300');

      setIsDragging(true);
      offset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && widgetRef.current) {
      e.preventDefault();
      widgetRef.current.style.left = `${e.clientX - offset.current.x}px`;
      widgetRef.current.style.top = `${e.clientY - offset.current.y}px`;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (widgetRef.current) {
      // Re-enable transition after drag
      widgetRef.current.classList.add('transition-all', 'duration-300');
    }
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen, isLoadingAi]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoadingAi) return;

    await sendAiCommand(input);
    setInput('');
  }, [input, isLoadingAi, sendAiCommand]);

  const displayMessages = chatMessages.slice(-5);

  return (
    <div
      ref={widgetRef}
      id="floating-ai-widget"
      className="fixed z-50 transition-all duration-300"
      style={isOpen 
        ? { width: '320px', height: '400px', bottom: '1rem', right: '1rem' } 
        : { bottom: '1rem', right: '1rem' }
      }
    >
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-green-700 hover:bg-green-600 shadow-lg flex items-center justify-center text-2xl text-white border-2 border-green-500 cursor-grab"
          style={{boxShadow: '0 0 15px rgba(34, 197, 94, 0.7)'}}
          onMouseDown={handleMouseDown}
        >
          <i className="fas fa-brain"></i>
        </Button>
      )}

      {isOpen && (
        <div 
          ref={chatWindowRef}
          className="bg-gray-900 border border-green-500/50 rounded-lg shadow-2xl flex flex-col h-full overflow-hidden"
          style={{boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'}}
        >
          <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-green-500/50 cursor-grab" onMouseDown={handleMouseDown}>
            <h3 className="text-md font-bold text-green-400 font-orbitron">S.M.U.V.E. Chat</h3>
            <div className="flex items-center gap-2">
                <Button
                    onClick={toggleVoiceCommands}
                    variant="secondary"
                    className={`w-8 h-8 p-0 rounded-full text-xs transition-colors ${
                        voiceCommandState === 'live' ? 'bg-green-700/50 text-green-300 animate-pulse' : 
                        voiceCommandState === 'connecting' ? 'bg-yellow-700/50 text-yellow-300' : 
                        'bg-gray-700/50 text-gray-400'
                    }`}
                    aria-label="Toggle Voice Commands"
                    title={voiceCommandState === 'off' ? 'Start Live Conversation' : 'End Live Conversation'}
                >
                    {voiceCommandState === 'connecting' ? <Spinner /> : <i className="fas fa-microphone"></i>}
                </Button>
                <Button
                    onClick={toggleTts}
                    variant="secondary"
                    className={`w-8 h-8 p-0 rounded-full text-xs ${isTtsEnabled ? 'bg-green-700/50 text-green-300' : 'bg-gray-700/50 text-gray-400'}`}
                    aria-label={isTtsEnabled ? 'Disable Voice' : 'Enable Voice'}
                >
                    <i className={`fas ${isTtsEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                </Button>
                <Button onClick={() => setIsOpen(false)} variant="secondary" className="w-8 h-8 p-0 bg-gray-700 hover:bg-red-600 text-red-400" aria-label="Close Chat">
                    <i className="fas fa-times"></i>
                </Button>
            </div>
          </div>
          {voiceCommandState !== 'off' && (
            <div className="text-center p-1 text-xs bg-gray-800 border-b border-green-500/50">
              {voiceCommandState === 'connecting' && <p className="text-yellow-400">Connecting...</p>}
              {voiceCommandState === 'live' && (
                <>
                  <p className="text-green-400 animate-pulse font-semibold">Live</p>
                  {userTranscript && <p className="text-blue-400 mt-1 h-4 truncate">You: "{userTranscript}"</p>}
                  {aiTranscript && <p className="text-green-300 h-4 truncate">AI: "{aiTranscript}"</p>}
                </>
              )}
            </div>
          )}
          <div className="flex-grow overflow-y-auto p-3 text-sm custom-scrollbar">
            {displayMessages.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded-lg max-w-[80%] relative group ${
                  msg.sender === 'user' ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800/50 text-green-400'
                }`}>
                  {msg.sender === 'ai' && <strong className="block text-green-500 mb-1">S.M.U.V.E.&gt;</strong>}
                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                  {msg.isThinking && (
                    <div className="mt-1 flex items-center justify-end text-xs text-gray-500">
                        <Spinner />
                        <span className="ml-2">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoadingAi && !displayMessages.some(m => m.isThinking) && (
              <div className="flex items-start mb-2">
                <div className="p-2 rounded-lg bg-gray-800/50 text-green-400">
                  <strong className="block text-green-500 mb-1">S.M.U.V.E.&gt;</strong>
                  <span>Thinking<span className="animate-pulse">...</span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex p-3 border-t border-green-500/50 bg-gray-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceCommandState !== 'off' ? 'Live session active...' : 'Chat with S.M.U.V.E...'}
              className="flex-grow bg-gray-900/80 border border-green-700/50 rounded-md p-2 text-green-300 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
              disabled={isLoadingAi || voiceCommandState !== 'off'}
            />
            <Button type="submit" variant="primary" className="ml-2 bg-green-600 hover:bg-green-500 text-black p-2" disabled={isLoadingAi || voiceCommandState !== 'off'} aria-label="Send Message">
              <i className="fas fa-paper-plane text-sm"></i>
            </Button>
          </form>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #00000030;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #22c55e80;
          border-radius: 10px;
          border: 1px solid #00000030;
        }
        .font-orbitron {
            font-family: 'Orbitron', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default React.memo(FloatingAiWidget);