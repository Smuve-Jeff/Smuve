import React, { useEffect, useState } from 'react';
import { Persona } from '../../services/AiServiceContext'; // Import Persona type

interface SmuveAvatarProps {
  isLoadingAi: boolean;
  isTtsEnabled: boolean;
  aiTranscript: string;
  avatarStyle: string;
  persona: Persona; // New: Persona prop
}

interface SmuveAvatarConfig {
  id: string;
  name: string;
  baseGradient: { from: string; to: string; };
  idleOverlay: string;
  thinkingOverlay: { from: string; to: string; };
  speakingOverlay: { from: string; via: string; to: string; };
  coreIdleColor: string;
  coreThinkingColor: string;
  coreSpeakingColor: string;
  coreIdleShadow: string;
  coreThinkingShadow: string;
  coreSpeakingShadow: string;
}

export const avatarConfigs: SmuveAvatarConfig[] = [
  {
    id: 'deep-tech',
    name: 'Deep Tech',
    baseGradient: { from: 'from-indigo-800', to: 'to-purple-800' },
    idleOverlay: 'bg-green-500/30',
    thinkingOverlay: { from: 'from-green-500/70', to: 'to-red-500/70' },
    speakingOverlay: { from: 'from-red-500/80', via: 'via-yellow-500/80', to: 'to-green-500/80' },
    coreIdleColor: 'bg-green-400',
    coreThinkingColor: 'bg-purple-400',
    coreSpeakingColor: 'bg-red-400',
    coreIdleShadow: 'shadow-green-500/30',
    coreThinkingShadow: 'shadow-purple-500/50',
    coreSpeakingShadow: 'shadow-red-500/70',
  },
  {
    id: 'cyber-fusion',
    name: 'Cyber Fusion',
    baseGradient: { from: 'from-blue-900', to: 'to-cyan-800' },
    idleOverlay: 'bg-yellow-500/30',
    thinkingOverlay: { from: 'from-cyan-500/70', to: 'to-yellow-500/70' },
    speakingOverlay: { from: 'from-yellow-500/80', via: 'via-blue-500/80', to: 'to-cyan-500/80' },
    coreIdleColor: 'bg-yellow-300',
    coreThinkingColor: 'bg-blue-300',
    coreSpeakingColor: 'bg-cyan-300',
    coreIdleShadow: 'shadow-yellow-500/30',
    coreThinkingShadow: 'shadow-blue-500/50',
    coreSpeakingShadow: 'shadow-cyan-500/70',
  },
  {
    id: 'lava-tech',
    name: 'Lava Tech',
    baseGradient: { from: 'from-red-900', to: 'to-orange-800' },
    idleOverlay: 'bg-orange-500/30',
    thinkingOverlay: { from: 'from-orange-500/70', to: 'to-red-500/70' },
    speakingOverlay: { from: 'from-red-500/80', via: 'via-purple-500/80', to: 'to-orange-500/80' },
    coreIdleColor: 'bg-orange-400',
    coreThinkingColor: 'bg-red-400',
    coreSpeakingColor: 'bg-purple-400',
    coreIdleShadow: 'shadow-orange-500/30',
    coreThinkingShadow: 'shadow-red-500/50',
    coreSpeakingShadow: 'shadow-purple-500/70',
  },
  {
    id: 'emerald-flow',
    name: 'Emerald Flow',
    baseGradient: { from: 'from-emerald-900', to: 'to-teal-800' },
    idleOverlay: 'bg-purple-500/30',
    thinkingOverlay: { from: 'from-teal-500/70', to: 'to-indigo-500/70' },
    speakingOverlay: { from: 'from-indigo-500/80', via: 'via-emerald-500/80', to: 'to-teal-500/80' },
    coreIdleColor: 'bg-emerald-300',
    coreThinkingColor: 'bg-teal-300',
    coreSpeakingColor: 'bg-indigo-300',
    coreIdleShadow: 'shadow-emerald-500/30',
    coreThinkingShadow: 'shadow-teal-500/50',
    coreSpeakingShadow: 'shadow-indigo-500/70',
  },
];

const SmuveAvatar: React.FC<SmuveAvatarProps> = ({ isLoadingAi, isTtsEnabled, aiTranscript, avatarStyle, persona }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimeoutRef = React.useRef<number | null>(null);
  
  const selectedConfig = avatarConfigs.find(c => c.id === avatarStyle) || avatarConfigs[0];

  useEffect(() => {
    if (isTtsEnabled && aiTranscript) {
      setIsSpeaking(true);
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      speakingTimeoutRef.current = window.setTimeout(() => {
        setIsSpeaking(false);
      }, 500); 
    } else if (!aiTranscript && speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
        speakingTimeoutRef.current = null;
        setIsSpeaking(false);
    }
    return () => {
        if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
        }
    };
  }, [isTtsEnabled, aiTranscript]);

  const avatarState = isLoadingAi ? 'thinking' : (isSpeaking ? 'speaking' : 'idle');

  return (
    <div className="relative w-40 h-24 flex items-center justify-center pointer-events-none select-none">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Core structure */}
        <div className={`w-full h-full bg-gradient-to-br ${selectedConfig.baseGradient.from} ${selectedConfig.baseGradient.to} rounded-full opacity-60 transition-opacity duration-500
                        ${avatarState === 'thinking' ? 'animate-pulse-slow opacity-70' : ''}
                        ${avatarState === 'speaking' ? 'animate-pulse-fast opacity-80' : ''}`}
        ></div>
        {/* Dynamic Overlay */}
        <div className={`absolute inset-0 rounded-full blur-sm transition-all duration-500
                        ${avatarState === 'idle' ? `w-2/3 h-2/3 ${selectedConfig.idleOverlay}` : ''}
                        ${avatarState === 'thinking' ? `w-full h-full bg-gradient-to-tr ${selectedConfig.thinkingOverlay.from} ${selectedConfig.thinkingOverlay.to} animate-spin-fast-reverse opacity-80` : ''}
                        ${avatarState === 'speaking' ? `w-full h-full bg-gradient-to-br ${selectedConfig.speakingOverlay.from} ${selectedConfig.speakingOverlay.via} ${selectedConfig.speakingOverlay.to} animate-spin-slow-reverse opacity-90` : ''}`}
        ></div>
        {/* Central glowing core */}
        <div className={`absolute w-10 h-10 rounded-full transition-all duration-500
                        ${avatarState === 'idle' ? `${selectedConfig.coreIdleColor} opacity-40 ${selectedConfig.coreIdleShadow} shadow-lg` : ''}
                        ${avatarState === 'thinking' ? `${selectedConfig.coreThinkingColor} opacity-70 ${selectedConfig.coreThinkingShadow} shadow-xl animate-bounce-slow` : ''}
                        ${avatarState === 'speaking' ? `${selectedConfig.coreSpeakingColor} opacity-90 ${selectedConfig.coreSpeakingShadow} shadow-2xl animate-ping-strong` : ''}`}
        ></div>
        {/* Text Overlay */}
        <div className={`absolute text-white font-orbitron text-xl md:text-2xl font-bold tracking-widest transition-opacity duration-500
                         ${avatarState === 'idle' ? 'opacity-70' : 'opacity-90'}`}>
          S.M.U.V.E.
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes pulse-fast {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes spin-fast-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes ping-strong {
            0% { transform: scale(0.2); opacity: 0.9; }
            80% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(0.2); opacity: 0; }
        }

        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
        .animate-pulse-fast { animation: pulse-fast 1s infinite ease-in-out; }
        .animate-spin-fast-reverse { animation: spin-fast-reverse 10s linear infinite; }
        .animate-spin-slow-reverse { animation: spin-slow-reverse 20s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s infinite ease-in-out; }
        .animate-ping-strong { animation: ping-strong 0.7s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default React.memo(SmuveAvatar);