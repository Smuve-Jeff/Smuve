
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { AiServiceProvider } from './services/AiServiceContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AiServiceProvider>
      <App />
    </AiServiceProvider>
  </React.StrictMode>,
)
