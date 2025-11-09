import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAiService } from '../services/AiServiceContext';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Spinner from '../components/common/Spinner';
import SmuveAvatar from '../components/layout/SmuveAvatar';
import AvatarCustomizationModal from '../components/layout/AvatarCustomizationModal';
import { View } from '../types';
import Modal from '../components/common/Modal'; // Import the new reusable Modal
import { useGlobalAudio } from '../services/GlobalAudioContext';

// The parseMarkdown function is removed from here as it's now centralized in src/components/common/Modal.tsx
// All markdown parsing for modals will be handled by the Modal component's internal logic.

interface AiManagerProps {
  sharedContent?: string | null;
  onContentProcessed: () => void;
  isModalOpen: boolean;
  modalTitle: string;
  modalContent: string;
  onCloseModal: () => void;
}

const AiManager: React.FC<AiManagerProps> = ({ 
    sharedContent, 
    onContentProcessed, 
    isModalOpen,
    modalTitle,
    modalContent,
    onCloseModal,
}) => {
  const { 
    chatMessages, 
    sendAiCommand, 
    isLoadingAi, 
    appendMessage,
    isTtsEnabled,
    toggleTts,
    voiceCommandState,
    toggleVoiceCommands,
    userTranscript,
    aiTranscript,
    speakTextOnDemand,
    persona,
  } = useAiService();
  const { recordingState } = useGlobalAudio();

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState('deep-tech');

  useEffect(() => {
    // Only append initial welcome if chat is empty AND it's not currently loading/processing a shared content.
    if (chatMessages.length === 0 && !sharedContent && !isLoadingAi) {
      appendMessage({
        sender: 'ai',
        text: `Greetings, Artist. I am S.M.U.V.E., your Strategic Music Utility Virtual Enhancer. How may I assist your ascent today?`,
      });
    }
  }, [chatMessages.length, appendMessage, sharedContent, isLoadingAi]);


  const handleSendMessage = useCallback(async (e?: React.FormEvent<HTMLFormElement> | string) => {
    if (typeof e === 'object' && e.preventDefault) {
      e.preventDefault();
    }
  
    const textToSend = typeof e === 'string' ? e : input.trim();
    if (!textToSend || isLoadingAi) return;
  
    await sendAiCommand(textToSend);
    setInput('');
  }, [input, isLoadingAi, sendAiCommand]);

  useEffect(() => {
    if (sharedContent) {
      setInput(sharedContent);
      handleSendMessage(sharedContent);
      onContentProcessed();
    }
  }, [sharedContent, handleSendMessage, onContentProcessed]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoadingAi]);

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };
  
  const handleQuickToolAction = (toolPrompt: string) => {
    setInput(toolPrompt);
    handleSendMessage(toolPrompt);
  }

  const promptSuggestions = [
    "What is a ii-V-I progression?",
    "Analyze my new lyrics...",
    "Help me set a weekly goal for more listeners.",
    "Write a marketing tweet for my new single.",
    "Give me 3 ideas for a unique music video.",
    "List all available app views.",
    "Run self-diagnostics",
    "Navigate to the Drum Machine view.",
  ];

  return (
    <div className="font-mono h-full">
       {isModalOpen && <Modal title={modalTitle} content={modalContent} onClose={onCloseModal} />}
       <AvatarCustomizationModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            currentStyle={avatarStyle}
            onStyleChange={setAvatarStyle}
       />
      <div className="h-full flex flex-col bg-black/60 relative overflow-hidden p-4 border-2 border-green-500/20 rounded-lg">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] z-0"></div>
        
        <div className="flex justify-between items-center text-center mb-4 z-10">
          <div className="w-10">
            <Button
              onClick={() => toggleVoiceCommands(recordingState.selectedInput)}
              variant="secondary"
              className={`w-10 h-10 p-0 rounded-full transition-colors ${
                  voiceCommandState === 'live' ? 'bg-green-700/50 text-green-300 animate-pulse' : 
                  voiceCommandState === 'connecting' ? 'bg-yellow-700/50 text-yellow-300' : 
                  'bg-gray-700/50 text-gray-400'
              }`}
              aria-label="Toggle Voice Commands"
              title={voiceCommandState === 'off' ? 'Start Live Conversation' : 'End Live Conversation'}
            >
              {voiceCommandState === 'connecting' ? <Spinner /> : <i className="fas fa-microphone"></i>}
            </Button>
          </div>
          {/* S.M.U.V.E Avatar Component */}
          <div className="flex flex-col items-center">
            <SmuveAvatar 
              isLoadingAi={isLoadingAi} 
              isTtsEnabled={isTtsEnabled} 
              aiTranscript={aiTranscript} 
              avatarStyle={avatarStyle}
              persona={persona} // Pass persona to avatar
            />
            <p className="text-xs text-green-600/80 tracking-widest mt-1">Strategic Music Utility Virtual Enhancer</p>
          </div>
          <div className="w-24 flex gap-1 justify-end">
             <Button
                onClick={() => setIsSettingsModalOpen(true)}
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full bg-gray-700/50 text-gray-400"
                aria-label="Customize Avatar"
                title="Customize S.M.U.V.E."
            >
                <i className="fas fa-cog"></i>
            </Button>
            <Button
              onClick={toggleTts}
              variant="secondary"
              className={`w-10 h-10 p-0 rounded-full ${isTtsEnabled ? 'bg-green-700/50 text-green-300' : 'bg-gray-700/50 text-gray-400'}`}
              aria-label={isTtsEnabled ? 'Disable Voice' : 'Enable Voice'}
            >
              <i className={`fas ${isTtsEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
            </Button>
          </div>
        </div>

        {/* Voice Command Status Indicator */}
        {voiceCommandState !== 'off' && (
          <div className="text-center mb-4 z-10 p-2 rounded-lg bg-gray-900/50 border border-green-900/50">
            {voiceCommandState === 'connecting' && (
              <p className="text-yellow-400 font-semibold">Connecting live session...</p>
            )}
            {voiceCommandState === 'live' && (
               <>
                <p className="text-green-400 animate-pulse font-semibold">Live Conversation Active</p>
                <div className="h-10 mt-1 text-sm overflow-hidden">
                    {userTranscript && <p className="text-blue-400 truncate">You: "{userTranscript}"</p>}
                    {aiTranscript && <p className="text-green-300 truncate">S.M.U.V.E.: "{aiTranscript}"</p>}
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 z-10">
          <Card variant="interactive" className="bg-gray-900/50 border-green-900/50">
            <h4 className="font-bold text-green-400 mb-2">Quick Post</h4>
            <input 
              type="text" 
              onKeyPress={(e) => { if (e.key === 'Enter') handleQuickToolAction(`Generate a social media post about ${e.currentTarget.value}`); }}
              placeholder="Topic..." 
              className="w-full bg-gray-800/70 border border-green-800/50 rounded p-1 mb-2 text-sm text-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" />
            <Button onClick={() => handleQuickToolAction(`Generate a social media post about ${document.querySelector<HTMLInputElement>('input[placeholder="Topic..."]')?.value || 'my music'}`)} disabled={!!isLoadingAi} className="w-full text-xs bg-green-800/70 hover:bg-green-700/70 text-green-300">
              {isLoadingAi ? <Spinner /> : 'Generate'}
            </Button>
          </Card>
           <Card variant="interactive" className="bg-gray-900/50 border-green-900/50">
            <h4 className="font-bold text-green-400 mb-2">Lyric Idea</h4>
            <input 
              type="text" 
              onKeyPress={(e) => { if (e.key === 'Enter') handleQuickToolAction(`Brainstorm lyric ideas for the theme: ${e.currentTarget.value}`); }}
              placeholder="Theme/Mood..." 
              className="w-full bg-gray-800/70 border border-green-800/50 rounded p-1 mb-2 text-sm text-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" />
            <Button onClick={() => handleQuickToolAction(`Brainstorm lyric ideas for the theme: ${document.querySelector<HTMLInputElement>('input[placeholder="Theme/Mood..."]')?.value || 'inspiration'}`)} disabled={!!isLoadingAi} className="w-full text-xs bg-green-800/70 hover:bg-green-700/70 text-green-300">
              {isLoadingAi ? <Spinner /> : 'Spark Idea'}
            </Button>
          </Card>
          <Card variant="interactive" className="bg-gray-900/50 border-green-900/50">
            <h4 className="font-bold text-green-400 mb-2">Doc Generator</h4>
            <select 
              className="w-full bg-gray-800/70 border border-green-800/50 rounded p-1 mb-2 text-sm text-green-300 focus:outline-none focus:ring-1 focus:focus:ring-green-500">
                <option value="Management Agreement">Management Agreement</option>
                <option value="Performance Contract">Performance Contract</option>
                <option value="Recording Contract">Recording Contract</option>
                <option value="Sync License Agreement">Sync License Agreement</option>
                <option value="Publisher Agreement">Publisher Agreement</option>
            </select>
            <Button onClick={() => handleQuickToolAction(`Draft a legal document for: ${document.querySelector<HTMLSelectElement>('select')?.value || 'Management Agreement'}`)} disabled={!!isLoadingAi} className="w-full text-xs bg-green-800/70 hover:bg-green-700/70 text-green-300">
                {isLoadingAi ? <Spinner /> : 'Generate'}
            </Button>
          </Card>
          <Card variant="interactive" className="bg-gray-900/50 border-green-900/50 md:col-span-3">
            <h4 className="font-bold text-green-400 mb-2">Chord Progression</h4>
            <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  id="chord-key"
                  placeholder="Key (e.g. C Major)" 
                  className="w-full bg-gray-800/70 border border-green-800/50 rounded p-1 text-sm text-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" />
                <input 
                  type="text" 
                  id="chord-mood"
                  placeholder="Mood (e.g. hopeful)" 
                  className="w-full bg-gray-800/70 border border-green-800/50 rounded p-1 text-sm text-green-300 focus:outline-none focus:ring-1 focus:ring-green-500" />
                <Button onClick={() => handleQuickToolAction(`Generate a chord progression in the key of ${document.querySelector<HTMLInputElement>('#chord-key')?.value || 'C Major'} with a mood of ${document.querySelector<HTMLInputElement>('#chord-mood')?.value || 'happy'}`)} disabled={!!isLoadingAi} className="text-xs bg-green-800/70 hover:bg-green-700/70 text-green-300 px-4">
                  {isLoadingAi ? <Spinner /> : 'Create'}
                </Button>
            </div>
          </Card>
        </div>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 custom-scrollbar z-10">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`mb-4 flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className={`p-3 rounded-lg max-w-xl relative group ${
                msg.sender === 'user' 
                ? 'bg-blue-900/50 text-blue-300' 
                : index === 0 ? 'w-full' : 'bg-gray-800/50 text-green-400'
              }`}>
                 {index === 0 ? null : msg.sender === 'ai' && <strong className="block mb-2 text-green-500">S.M.U.V.E.&gt;</strong>}
                 {msg.isThinking && <Spinner />}
                <div 
                  className={`whitespace-pre-wrap ${
                    index === 0 ? 'font-orbitron text-2xl text-center text-green-400' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.text }} // Use msg.text directly, markdown parsing will be handled by Modal if passed.
                />
                {msg.sender === 'ai' && !msg.isThinking && index > 0 && (
                  <Button
                      onClick={() => speakTextOnDemand(msg.text)}
                      className="absolute top-2 right-2 w-8 h-8 p-0 rounded-full bg-gray-700/50 text-gray-400 hover:bg-green-700/50 hover:text-green-300 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Speak message"
                      title="Speak"
                      variant="secondary"
                  >
                      <i className="fas fa-volume-up text-xs"></i>
                  </Button>
                )}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                        <p className="font-bold text-green-500">References:</p>
                        <ul className="list-disc list-inside ml-2">
                            {msg.groundingUrls.map((url, urlIndex) => (
                                <li key={urlIndex} className="truncate">
                                    <a href={url.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                        {url.title || url.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          ))}
          {isLoadingAi && !chatMessages.some(m => m.isThinking) && (
            <div className="flex items-start">
              <div className="p-3 rounded-lg bg-gray-800/50 text-green-400">
                <strong className="block mb-2 text-green-500">S.M.U.V.E.&gt;</strong>
                <span>Thinking<span className="animate-pulse">...</span></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4 z-10">
          {promptSuggestions.map((prompt, i) => (
            <button key={i} onClick={() => handlePromptClick(prompt)} className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full hover:bg-green-800/70 transition-colors">
              {prompt.split('...')[0]}...
            </button>
          ))}
           <button onClick={() => handlePromptClick('Find local music venues near me.')} className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full hover:bg-green-800/70 transition-colors">
              Find Venues...
            </button>
             <button onClick={() => handlePromptClick('Find local artists I can collaborate with.')} className="text-xs bg-green-900/50 text-green-400 px-3 py-1 rounded-full hover:bg-green-800/70 transition-colors">
              Find Collaborators...
            </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2 z-10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voiceCommandState !== 'off' ? 'Live session active...' : 'Enter your command...'}
            className="flex-grow bg-gray-900/80 border border-green-500/50 rounded-lg p-3 text-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-green-700 disabled:opacity-50"
            aria-label="Chat input"
            disabled={voiceCommandState !== 'off'}
          />
          <Button type="submit" variant="primary" disabled={isLoadingAi || voiceCommandState !== 'off'} className="bg-green-600 hover:bg-green-500 focus:ring-green-500 text-black">
            <i className="fas fa-paper-plane"></i>
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>

      <style>{`
        .glow {
          text-shadow: 0 0 5px #22c55e, 0 0 10px #22c55e, 0 0 15px #22c55e;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #00000030;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #22c55e80;
          border-radius: 10px;
          border: 2px solid #00000030;
        }
      `}</style>
    </div>
  );
};

export default React.memo(AiManager);