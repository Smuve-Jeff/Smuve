
import React from 'react';
import MainApp from './MainApp';
import { AuthProvider } from './services/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
