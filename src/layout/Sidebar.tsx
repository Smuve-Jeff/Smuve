
import React, { useState, useEffect } from 'react';
import { signOut, User } from 'firebase/auth';
import { View } from '../types';
import { useAuth } from '../services/AuthContext';
import { auth } from '../firebase';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  currentUser: User | null;
}

interface NavItemProps {
  icon: string;
  label: string;
  view: View;
  isActive: boolean;
  onClick: () => void;
  id?: string;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ id, icon, label, isActive, onClick }) => (
  <button
    id={id}
    onClick={onClick}
    className={`w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg'
        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
    }`}
  >
    <i className={`fas ${icon} w-6 text-center`}></i>
    <span className="ml-4 font-medium">{label}</span>
  </button>
));
NavItem.displayName = 'NavItem';

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, currentUser }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const { isAuthenticated, toggleAuthModal } = useAuth();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    const result = await installPrompt.prompt();
    console.log(`Install prompt outcome: ${result.outcome}`);
    setInstallPrompt(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'sidebar-ai-manager', icon: 'fa-brain', label: 'AI Manager', view: View.AiManager },
    { id: 'sidebar-lyrics', icon: 'fa-feather-alt', label: 'Lyrics', view: View.Notepad },
    { id: 'sidebar-sample-library', icon: 'fa-layer-group', label: 'Sample Library', view: View.SampleLibrary },
    { id: 'sidebar-music-player', icon: 'fa-music', label: 'Music Player', view: View.MusicPlayer },
    { id: 'sidebar-dj-booth', icon: 'fa-compact-disc', label: 'DJ Booth', view: View.DjTurntables },
    { id: 'sidebar-vocal-booth', icon: 'fa-microphone', label: 'Vocal Booth', view: View.AudioRecorder },
    { id: 'sidebar-drum-machine', icon: 'fa-drum', label: 'Drum Machine', view: View.DrumMachine },
    { id: 'sidebar-artist-hub', icon: 'fa-gem', label: 'Artist Hub', view: View.ArtistHub },
    { id: 'sidebar-merch-designer', icon: 'fa-tshirt', label: 'Merch Designer', view: View.MerchDesigner },
    { id: 'sidebar-analytics', icon: 'fa-chart-bar', label: 'Analytics', view: View.Analytics },
    { id: 'sidebar-tha-spot', icon: 'fa-gamepad', label: 'Tha Spot', view: View.TheSpot }, 
  ];

  return (
    <nav className="w-64 bg-gray-800/30 border-r border-gray-700/30 p-4 flex-col z-20 hidden md:flex">
      <div className="flex items-center mb-8">
        <i className="fas fa-wave-square text-3xl text-indigo-400"></i>
        <div className="ml-3">
          <h1 className="text-xl font-bold text-gray-200 font-exo">S.M.U.V.E. 3.0</h1>
        </div>
      </div>
      <div className="flex-grow">
        {isAuthenticated ? (
            navItems.map((item) => (
                <NavItem
                    key={item.view}
                    id={item.id}
                    icon={item.icon}
                    label={item.label}
                    view={item.view}
                    isActive={currentView === item.view}
                    onClick={() => onNavigate(item.view)}
                />
            ))
        ) : (
            <p className="text-gray-400 text-sm text-center py-4">Please log in to access features.</p>
        )}
      </div>
      
      <div className="mt-auto pt-4 space-y-4">
        {installPrompt && (
          <button
            onClick={handleInstallClick}
            className="w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 bg-green-600 text-white shadow-lg hover:bg-green-500"
            aria-label="Install App"
          >
            <i className="fas fa-download w-6 text-center"></i>
            <span className="ml-4 font-medium">Install App</span>
          </button>
        )}
        <a
          href="https://play.google.com/store/apps/details?id=com.smuve.ai.music.manager"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 bg-yellow-600/80 text-white shadow-lg hover:bg-yellow-500/80"
          aria-label="Rate our App"
        >
          <i className="fas fa-star w-6 text-center"></i>
          <span className="ml-4 font-medium">Rate our App</span>
        </a>

        <div className="border-t border-gray-700/50 pt-4 text-center">
            {currentUser && <p className="text-sm text-gray-400 mb-2">Logged in as <strong className="text-gray-200">{currentUser.email}</strong></p>}
            {isAuthenticated ? (
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 bg-red-800/70 text-red-200 shadow-lg hover:bg-red-700/70"
                    aria-label="Logout"
                >
                    <i className="fas fa-sign-out-alt w-6 text-center"></i>
                    <span className="ml-4 font-medium">Logout</span>
                </button>
            ) : (
                <button
                    onClick={() => toggleAuthModal(true)}
                    className="w-full flex items-center justify-center p-3 rounded-lg transition-colors duration-200 bg-indigo-600 text-white shadow-lg hover:bg-indigo-500"
                    aria-label="Login / Register"
                >
                    <i className="fas fa-sign-in-alt w-6 text-center"></i>
                    <span className="ml-4 font-medium">Login / Register</span>
                </button>
            )}
        </div>
        <div className="text-center text-white text-xs mt-2">
            <p>&copy; 2024 Smuve Jeff Presents</p>
        </div>
      </div>
    </nav>
  );
};

export default React.memo(Sidebar);
