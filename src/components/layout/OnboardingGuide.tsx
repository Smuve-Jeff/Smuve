import React, { useState } from 'react';
import Button from '../common/Button';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const onboardingSteps = [
  {
    targetId: 'sidebar-ai-manager',
    title: 'Welcome to S.M.U.V.E. 2.0!',
    content: "This is your AI Manager, S.M.U.V.E. Use this chat to get creative ideas, marketing help, legal drafts, and even control the app with your voice.",
    position: 'right-start',
  },
  {
    targetId: 'sidebar-lyrics',
    title: 'Your Notepad',
    content: "Draft your song lyrics, marketing plans, or any ideas here. You can send your notes directly to S.M.U.V.E. for feedback and analysis.",
    position: 'right-start',
  },
  {
    targetId: 'sidebar-vocal-booth',
    title: 'The Vocal Booth',
    content: 'Record vocals, import audio clips, and mix your tracks. Your entire session state (clips, mixer settings) is automatically saved to your profile!',
    position: 'right-start',
  },
  {
    targetId: 'floating-ai-widget',
    title: 'Quick Chat',
    content: 'S.M.U.V.E. is always available through this widget, no matter where you are in the app. Click to open a compact chat window.',
    position: 'top-end',
  },
];

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const handleNext = () => {
    if (stepIndex < onboardingSteps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete();
    }
  };
  
  const handleSkip = () => {
      onComplete();
  };

  const currentStep = onboardingSteps[stepIndex];
  const targetElement = document.getElementById(currentStep.targetId);

  if (!targetElement) {
      if (stepIndex < onboardingSteps.length - 1) {
          setStepIndex(s => s + 1);
      } else {
          onComplete();
      }
      return null;
  }

  const rect = targetElement.getBoundingClientRect();

  const getTooltipPosition = () => {
      switch (currentStep.position) {
          case 'right-start':
              return { top: rect.top, left: rect.right + 10 };
          case 'top-end':
              return { bottom: window.innerHeight - rect.top + 10, right: window.innerWidth - rect.right };
          default:
              return { top: rect.bottom + 10, left: rect.left };
      }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[10000]">
      <div
        className="fixed rounded-lg border-4 border-dashed border-indigo-400 transition-all duration-300"
        style={{
          top: rect.top - 5,
          left: rect.left - 5,
          width: rect.width + 10,
          height: rect.height + 10,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
        }}
      ></div>

      <div
        className="fixed w-72 bg-gray-800 p-4 rounded-lg shadow-xl border border-indigo-500/50"
        style={getTooltipPosition()}
      >
        <h4 className="text-lg font-bold text-indigo-300 mb-2">{currentStep.title}</h4>
        <p className="text-sm text-gray-300 mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">{stepIndex + 1} / {onboardingSteps.length}</span>
          <div>
            <Button onClick={handleSkip} variant="secondary" className="text-xs mr-2">Skip</Button>
            <Button onClick={handleNext}>
              {stepIndex === onboardingSteps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OnboardingGuide);