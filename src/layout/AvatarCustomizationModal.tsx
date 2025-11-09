import React from 'react';
import { useAiService, Persona } from '../services/AiServiceContext';
import { avatarConfigs } from './SmuveAvatar';
import Button from '../common/Button';
import Card from '../common/Card';

interface AvatarCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: string;
  onStyleChange: (styleId: string) => void;
}

const AvatarCustomizationModal: React.FC<AvatarCustomizationModalProps> = ({
  isOpen,
  onClose,
  currentStyle,
  onStyleChange,
}) => {
  const { persona, setPersona } = useAiService();

  if (!isOpen) {
    return null;
  }

  const personas: { id: Persona; name: string; description: string }[] = [
    { id: 'Commanding', name: 'Commanding (He/Him)', description: 'Authoritative, deep voice. The relentless manager.' },
    { id: 'Strategic', name: 'Strategic (She/Her)', description: 'Encouraging, clear voice. The insightful tactician.' },
    { id: 'Analytical', name: 'Analytical (They/Them)', description: 'Calm, neutral voice. The data-driven expert.' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono"
      onClick={onClose}
    >
      <Card
        className="bg-gray-900 border border-green-500/50 shadow-lg p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-green-400 font-orbitron">Customize S.M.U.V.E.</h3>
          <Button onClick={onClose} variant="secondary" className="w-10 h-10 p-0 rounded-full">
            <i className="fas fa-times"></i>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Persona Selection */}
          <div>
            <h4 className="text-lg font-semibold text-green-300 mb-4">Persona &amp; Voice</h4>
            <div className="space-y-3">
              {personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    persona === p.id
                      ? 'bg-green-800/50 border-green-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-green-600'
                  }`}
                >
                  <p className="font-bold text-green-200">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Style Selection */}
          <div>
            <h4 className="text-lg font-semibold text-green-300 mb-4">Avatar Style</h4>
            <div className="grid grid-cols-2 gap-3">
              {avatarConfigs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => onStyleChange(config.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    currentStyle === config.id
                      ? 'bg-green-800/50 border-green-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-green-600'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 bg-gradient-to-br ${config.baseGradient.from} ${config.baseGradient.to}`}></div>
                  <p className="text-sm font-semibold text-green-200">{config.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(AvatarCustomizationModal);