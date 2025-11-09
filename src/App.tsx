import React from 'react';
import { AuthProvider } from './services/AuthContext';
import { GlobalAudioProvider } from './services/GlobalAudioContext';
import { ToastProvider } from './services/ToastContext';
import MainApp from './MainApp';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <GlobalAudioProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </GlobalAudioProvider>
    </AuthProvider>
  );
};

export default App;