import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  showAuthModal: boolean; // New: State to control auth modal visibility
  toggleAuthModal: (show: boolean) => void; // New: Function to toggle auth modal
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'smuve_users';

// This is a placeholder for client-side hashing. 
// In a real application, hashing should be done on the server with a strong algorithm like bcrypt.
const pseudoHash = (str: string) => btoa(str.split('').reverse().join('') + str);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // New: Auth modal state

  useEffect(() => {
    // Check for a saved user session on initial load
    const savedUser = localStorage.getItem('smuve_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setShowAuthModal(false); // If user found, hide modal
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem('smuve_user');
        setShowAuthModal(true); // If parse fails, show modal
      }
    } else {
        setShowAuthModal(true); // If no user found, show modal
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    const userRecord = users[username];

    if (!userRecord) {
      throw new Error('Invalid username or password.');
    }

    const passwordHash = pseudoHash(password);
    if (userRecord.passwordHash !== passwordHash) {
      throw new Error('Invalid username or password.');
    }
    
    const user: User = { username };
    localStorage.setItem('smuve_user', JSON.stringify(user));
    setCurrentUser(user);
    setShowAuthModal(false); // Hide modal on successful login
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
    
    if (users[username]) {
      throw new Error('Username already exists. Please choose another one.');
    }
    
    const passwordHash = pseudoHash(password);
    users[username] = { email, passwordHash };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    
    // Automatically log in after registration
    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    const savedUser = localStorage.getItem('smuve_user');
    if (savedUser) {
        try {
            const user: User = JSON.parse(savedUser);
            // Clear user-specific data upon logout for privacy
            localStorage.removeItem(`notepad_content_${user.username}`);
            localStorage.removeItem(`vocal_booth_session_${user.username}`);
            localStorage.removeItem(`drum_machine_pattern_${user.username}`);
            localStorage.removeItem(`music_player_playlist_${user.username}`);
            localStorage.removeItem(`onboarding_completed_${user.username}`);
        } catch(e) {
            console.error("Could not parse user on logout", e);
        }
    }
    localStorage.removeItem('smuve_user');
    setCurrentUser(null);
    setShowAuthModal(true); // Show modal on logout
  }, []);

  const toggleAuthModal = useCallback((show: boolean) => {
    setShowAuthModal(show);
  }, []);

  const value = {
    isAuthenticated: !!currentUser,
    currentUser,
    login,
    register,
    logout,
    showAuthModal,
    toggleAuthModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};