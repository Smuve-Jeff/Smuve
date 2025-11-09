
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MatrixBackground from './MatrixBackground';
import Sidebar from './Sidebar';
import TheSpot from './TheSpot';
import ArtistHub from './ArtistHub';
import MerchDesigner from './MerchDesigner';
import SampleLibrary from './SampleLibrary';
import AudioRecorder from './AudioRecorder';
import MusicPlayer from './MusicPlayer';
import DjTurntables from './DjTurntables';
import DrumMachine from './DrumMachine';
import Analytics from './Analytics';
import AiManager from './AiManager';
import Notepad from './Notepad';
import LoginView from './LoginView';

const MainApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginView onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Router>
      <MatrixBackground />
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<TheSpot />} />
            <Route path="/artist-hub" element={<ArtistHub />} />
            <Route path="/merch-designer" element={<MerchDesigner />} />
            <Route path="/sample-library" element={<SampleLibrary />} />
            <Route path="/audio-recorder" element={<AudioRecorder />} />
            <Route path="/music-player" element={<MusicPlayer />} />
            <Route path="/dj-turntables" element={<DjTurntables />} />
            <Route path="/drum-machine" element={<DrumMachine />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-manager" element={<AiManager />} />
            <Route path="/notepad" element={<Notepad />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default MainApp;
