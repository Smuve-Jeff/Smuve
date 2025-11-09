import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { View } from './types';
import Sidebar from './components/layout/Sidebar';
import BottomNavBar from './components/layout/BottomNavBar';
import MatrixBackground from './views/MatrixBackground';
import { setupAudioContextResumeOnVisibilityChange } from './services/audioContextService';
import { AiServiceProvider } from './services/AiServiceContext';
import { useGlobalAudio } from './services/GlobalAudioContext';
import Spinner from './components/common/Spinner';
import { useAuth } from './services/AuthContext';
import { useToast } from './services/ToastContext';
import ToastContainer from './components/common/Toast';
import OnboardingGuide from './components/layout/OnboardingGuide';
import MasterChannel from './components/layout/MasterChannel';
import Modal from './components/common/Modal';
import AuthModal from './components/AuthModal';
import { getMusicFeedback } from './services/geminiService';

const AiManager = lazy(() => import('./views/AiManager'));
const DjTurntables = lazy(() => import('./views/DjTurntables'));
const AudioRecorder = lazy(() => import('./views/AudioRecorder'));
const DrumMachine = lazy(() => import('./views/DrumMachine'));
const Analytics = lazy(() => import('./views/Analytics'));
const MusicPlayer = lazy(() => import('./views/MusicPlayer'));
const Notepad = lazy(() => import('./views/Notepad'));
const ArtistHub = lazy(() => import('./views/ArtistHub'));
const TheSpot = lazy(() => import('./views/TheSpot'));
const SampleLibrary = lazy(() => import('./views/SampleLibrary'));
const MerchDesigner = lazy(() => import('./views/MerchDesigner')); // New: Merch Designer
const FloatingAiWidget = lazy(() => import('./components/common/FloatingAiWidget'));

const MainApp: React.FC = () => {
  const { currentUser, logout, isAuthenticated, showAuthModal, toggleAuthModal } = useAuth();
  const { saveSession, loadSession, saveDrumPattern, loadDrumPattern } = useGlobalAudio();
  const { showToast } = useToast();

  const notepadStorageKey = `notepad_content_${currentUser?.username}`;
  const [appNotepadContent, setAppNotepadContent] = useState<string>(() => {
    if (currentUser?.username) {
        return localStorage.getItem(notepadStorageKey) || '';
    }
    return '';
  });

  const [currentView, setCurrentView] = useState<View>(View.AiManager);
  const [sharedContentToAi, setSharedContentToAi] = useState<string | null>(null);

  const [widgetWidth, setWidgetWidth] = useState(250);
  const [widgetHeight, setWidgetHeight] = useState(200);
  const [isNotepadMatrixVisible, setIsNotepadMatrixVisible] = useState(true);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [aiModalContent, setAiModalContent] = useState('');

  const onboardingKey = `onboarding_completed_${currentUser?.username}`;
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleOnboardingComplete = () => {
    if (currentUser?.username) {
        localStorage.setItem(`onboarding_completed_${currentUser.username}`, 'true');
    }
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (currentUser?.username) {
        localStorage.setItem(notepadStorageKey, appNotepadContent);
    } else {
        localStorage.removeItem(notepadStorageKey);
    }
  }, [appNotepadContent, notepadStorageKey, currentUser]);

  useEffect(() => {
    setupAudioContextResumeOnVisibilityChange();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadSession();
      loadDrumPattern();
      const currentUserNotepadKey = `notepad_content_${currentUser.username}`;
      setAppNotepadContent(localStorage.getItem(currentUserNotepadKey) || '');
      setShowOnboarding(!localStorage.getItem(`onboarding_completed_${currentUser.username}`));
    } else {
        setAppNotepadContent('');
        setShowOnboarding(false);
    }
  }, [isAuthenticated, currentUser, loadSession, loadDrumPattern]);


  const handleNavigate = useCallback((view: View, contentToShare: string | null = null) => {
    if (!isAuthenticated) {
        toggleAuthModal(true);
        showToast("Please log in to access this feature.", 'info');
        return;
    }
    if (contentToShare) {
      setSharedContentToAi(contentToShare);
    } else {
      setSharedContentToAi(null);
    }
    setCurrentView(view);
  }, [isAuthenticated, toggleAuthModal, showToast]);
  
  const handleShareNotepadToAi = useCallback((content: string) => {
    handleNavigate(View.AiManager, content);
  }, [handleNavigate]);

  const toggleNotepadMatrix = useCallback(() => {
    setIsNotepadMatrixVisible(v => !v);
  }, []);

  const handleAiContentProcessed = useCallback(() => {
    setSharedContentToAi(null);
  }, []);

  const handleWidgetResize = useCallback((newWidth: number, newHeight: number) => {
    setWidgetWidth(newWidth);
    setWidgetHeight(newHeight);
  }, []);

  const handleOpenAiModal = useCallback((title: string, content: string) => {
    setAiModalTitle(title);
    setAiModalContent(content);
    setIsAiModalOpen(true);
  }, []);

  const handleCloseAiModal = useCallback(() => {
    setIsAiModalOpen(false);
    setAiModalTitle('');
    setAiModalContent('');
  }, []);

  const handleGetAiFeedbackFromNotepad = useCallback(async (notepadContent: string) => {
    if (!notepadContent.trim()) {
      showToast('Notepad is empty. Nothing to analyze.', 'error');
      return;
    }
    showToast('Getting lyric feedback from S.M.U.V.E...', 'info');
    try {
      const feedback = await getMusicFeedback(notepadContent);
      handleOpenAiModal('Lyric Feedback from S.M.U.V.E.', feedback);
    } catch (error: any) {
      console.error("Error getting lyric feedback:", error);
      showToast('Failed to get lyric feedback. Please try again.', 'error');
    }
  }, [showToast, handleOpenAiModal]);

  const handleLogout = useCallback(() => {
    saveSession();
    saveDrumPattern();
    logout();
  }, [saveSession, saveDrumPattern, logout]);

  const renderView = () => {
    if (!isAuthenticated) {
      return null; // Don't render any feature views if not authenticated, AuthModal takes over
    }
    switch (currentView) {
      case View.AiManager:
        return <AiManager
          sharedContent={sharedContentToAi}
          onContentProcessed={handleAiContentProcessed}
          isModalOpen={isAiModalOpen}
          modalTitle={aiModalTitle}
          modalContent={aiModalContent}
          onCloseModal={handleCloseAiModal}
        />;
      case View.DjTurntables: return <DjTurntables />;
      case View.AudioRecorder: return <AudioRecorder />;
      case View.DrumMachine: return <DrumMachine />;
      case View.ArtistHub: return <ArtistHub />;
      case View.Analytics: return <Analytics />;
      case View.MusicPlayer: return <MusicPlayer />;
      case View.Notepad:
        return <Notepad
          onShareToAiManager={handleShareNotepadToAi}
          onGetAiFeedback={handleGetAiFeedbackFromNotepad}
          content={appNotepadContent}
          onContentChange={setAppNotepadContent}
          isMatrixVisible={isNotepadMatrixVisible}
          onToggleMatrixVisibility={toggleNotepadMatrix}
        />;
      case View.TheSpot: return <TheSpot />;
      case View.SampleLibrary: return <SampleLibrary />;
      case View.MerchDesigner: return <MerchDesigner />; {/* New: Merch Designer View */}
      default: return <AiManager 
                        sharedContent={sharedContentToAi} 
                        onContentProcessed={handleAiContentProcessed} 
                        isModalOpen={isAiModalOpen}
                        modalTitle={aiModalTitle}
                        modalContent={aiModalContent}
                        onCloseModal={handleCloseAiModal}
                      />;
    }
  };

  const SuspenseFallback = () => (
    <div className="w-full h-full flex items-center justify-center"><Spinner /></div>
  );

  return (
    <AiServiceProvider
      initialNotepadContent={appNotepadContent}
      setGlobalNotepadContent={setAppNotepadContent}
      initialCurrentView={currentView} // Pass the current view for proactive suggestions
      globalNavigateAppToView={handleNavigate}
    >
      <div className="flex h-screen bg-gray-900 text-gray-200 relative">
        {showAuthModal && (
            <AuthModal isOpen={showAuthModal} onClose={() => toggleAuthModal(false)} />
        )}

        {isAuthenticated && showOnboarding && <OnboardingGuide onComplete={handleOnboardingComplete} />}
        {isAiModalOpen && <Modal title={aiModalTitle} content={aiModalContent} onClose={handleCloseAiModal} />}
        
        {currentView === View.AiManager && isAuthenticated && <MatrixBackground />}
        {currentView === View.Notepad && isAuthenticated && isNotepadMatrixVisible && (
          <MatrixBackground
            isWidget={true}
            widgetWidth={widgetWidth}
            widgetHeight={widgetHeight}
            onWidgetResize={handleWidgetResize}
          />
        )}
        
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className={`flex-1 p-4 sm:p-8 overflow-y-auto ${currentView === View.AiManager ? 'bg-transparent' : 'bg-gray-900/80 backdrop-blur-[2px]'} z-10 md:pb-8 pb-24`}>
          <div className="max-w-7xl mx-auto h-full">
            <Suspense fallback={<SuspenseFallback />}>
                <div key={currentView} className="view-transition-enter"> {/* Add key and class for transition */}
                  {renderView()}
                </div>
            </Suspense>
          </div>
        </main>
        {isAuthenticated && <MasterChannel />}
        {isAuthenticated && <Suspense fallback={null}><FloatingAiWidget /></Suspense>}
        <BottomNavBar
          currentView={currentView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
        <ToastContainer />
      </div>
    </AiServiceProvider>
  );
};

export default MainApp;