import React, { useState, useCallback } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { useToast } from '../services/ToastContext';

interface NotepadProps {
  onShareToAiManager: (content: string) => void;
  onGetAiFeedback: (content: string) => void; // New prop for AI feedback
  content: string;
  onContentChange: (content: string) => void;
  isMatrixVisible: boolean;
  onToggleMatrixVisibility: () => void;
}

const Notepad: React.FC<NotepadProps> = ({
  onShareToAiManager,
  onGetAiFeedback, // Destructure new prop
  content,
  onContentChange,
  isMatrixVisible,
  onToggleMatrixVisibility
}) => {
  const [isSpellCheckOn, setIsSpellCheckOn] = useState(false);
  const { showToast } = useToast();

  const handleSaveContent = useCallback(() => {
    if (!content.trim()) {
      showToast('Lyrics area is empty!', 'error');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/T|:/g, '-');
    a.download = `lyrics-notes-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Lyrics saved to file!', 'success');
  }, [content, showToast]);

  const handleShareToAi = useCallback(() => {
    if (!content.trim()) {
      showToast('Lyrics area is empty! Nothing to send.', 'error');
      return;
    }
    onShareToAiManager(content);
    showToast('Content sent to S.M.U.V.E.', 'info');
  }, [content, onShareToAiManager, showToast]);

  const handleGetFeedback = useCallback(() => {
    if (!content.trim()) {
      showToast('Lyrics area is empty! Nothing to analyze.', 'error');
      return;
    }
    onGetAiFeedback(content);
  }, [content, onGetAiFeedback, showToast]);

  return (
    <div className="h-full flex flex-col justify-center font-mono text-gray-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-blue-400 font-orbitron" id="sidebar-lyrics">Lyrics</h2>
        <p className="text-gray-400 mt-2">Draft your ideas, lyrics, and plans before sending to S.M.U.V.E.</p>
      </div>

      <Card className="flex flex-col flex-grow bg-gray-900/50 border-blue-500/30 shadow-lg shadow-blue-500/10 max-w-4xl mx-auto w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 to-gray-900/50">
        <div className="flex justify-end items-center gap-4 mb-4">
          <Button
            onClick={handleSaveContent}
            icon={<i className="fas fa-save"></i>}
            className="text-xs bg-blue-600/30 hover:bg-blue-500/30 text-blue-300 border border-blue-500/50"
            variant="secondary"
          >
            Save
          </Button>
          <ToggleSwitch
            label="Matrix BG"
            isOn={isMatrixVisible}
            onToggle={onToggleMatrixVisibility}
            color="blue"
          />
          {/* Toggle native spell check */}
          <ToggleSwitch
            label="Spell Check"
            isOn={isSpellCheckOn}
            onToggle={() => setIsSpellCheckOn(!isSpellCheckOn)}
            color="blue"
            disabled={false}
          />
        </div>
        {/* Removed "Note: Spell Check is currently simulated." */}

        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Start writing your song ideas, marketing plans, or notes here..."
          className="flex-grow w-full bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y custom-scrollbar text-base"
          style={{ minHeight: '300px' }}
          spellCheck={isSpellCheckOn}
        />

        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleGetFeedback}
            icon={<i className="fas fa-comment-dots"></i>}
            variant="secondary"
            className="flex-grow bg-blue-600/30 hover:bg-blue-500/30 text-blue-300 border border-blue-500/50"
          >
            Get AI Feedback
          </Button>
          <Button
            onClick={handleShareToAi}
            icon={<i className="fas fa-robot"></i>}
            variant="primary"
            className="flex-grow bg-blue-600 hover:bg-blue-500 focus:ring-blue-500 text-white"
          >
            Send to S.M.U.V.E.
          </Button>
        </div>
      </Card>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2d3748;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #60a5fa;
          border-radius: 4px;
          border: 2px solid #2d3748;
        }
      `}</style>
    </div>
  );
};

export default React.memo(Notepad);