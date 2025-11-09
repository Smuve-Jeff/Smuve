import React from 'react';
import { View } from '../../types';
import { useAuth } from '../../services/AuthContext'; // Import useAuth

interface BottomNavBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}

const navItems = [
    { icon: 'fa-brain', label: 'AI', view: View.AiManager },
    { icon: 'fa-feather-alt', label: 'Lyrics', view: View.Notepad },
    { icon: 'fa-layer-group', label: 'Samples', view: View.SampleLibrary },
    { icon: 'fa-music', label: 'Player', view: View.MusicPlayer },
    { icon: 'fa-drum', label: 'Drums', view: View.DrumMachine },
    { icon: 'fa-tshirt', label: 'Merch', view: View.MerchDesigner }, // New: Merch Designer
    { icon: 'fa-gem', label: 'Hub', view: View.ArtistHub },
];

const NavItem: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void; }> = React.memo(({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
      isActive ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-400'
    }`}
    aria-label={label}
  >
    <i className={`fas ${icon} text-xl`}></i>
    <span className="text-xs mt-1">{label}</span>
  </button>
));
NavItem.displayName = 'NavItem';

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onNavigate, onLogout }) => {
  const { isAuthenticated, toggleAuthModal } = useAuth(); // Use isAuthenticated and toggleAuthModal

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50 flex justify-around items-center z-30">
      {isAuthenticated ? (
        navItems.map((item) => (
            <NavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                isActive={currentView === item.view}
                onClick={() => onNavigate(item.view)}
            />
        ))
      ) : (
        <p className="text-gray-400 text-xs text-center p-2 w-full">Log in to see navigation.</p>
      )}

       {isAuthenticated ? (
            <button
                onClick={onLogout}
                className="flex flex-col items-center justify-center w-full pt-2 pb-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                aria-label="Logout"
            >
                <i className="fas fa-sign-out-alt text-xl"></i>
                <span className="text-xs mt-1">Logout</span>
            </button>
       ) : (
            <button
                onClick={() => toggleAuthModal(true)} // Open AuthModal when not authenticated
                className="flex flex-col items-center justify-center w-full pt-2 pb-1 text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
                aria-label="Login / Register"
            >
                <i className="fas fa-sign-in-alt text-xl"></i>
                <span className="text-xs mt-1">Login</span>
            </button>
       )}
    </nav>
  );
};

export default React.memo(BottomNavBar);