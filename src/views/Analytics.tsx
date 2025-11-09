import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getVideoStoryboard } from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const Toggle: React.FC<{ label: string; icon: string; color: string; }> = React.memo(({ label, icon, color }) => {
    const [isOn, setIsOn] = useState(false);
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <i className={`fab ${icon} text-2xl`} style={{ color }}></i>
                <span className="font-medium text-gray-300">{label}</span>
            </div>
            <button onClick={() => setIsOn(!isOn)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isOn ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transform transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </div>
    );
});
Toggle.displayName = 'Toggle';

const DspMetric: React.FC<{icon: string; label: string; value: string; color: string;}> = React.memo(({icon, label, value, color}) => (
    <div className="bg-gray-900/50 p-3 rounded-lg flex items-center gap-3">
        <i className={`fab ${icon} text-3xl`} style={{color}}></i>
        <div>
            <p className="text-md font-bold">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
        </div>
    </div>
));
DspMetric.displayName = 'DspMetric';

// Helper to extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  let videoId = null;
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  if (match && match[1]) {
      videoId = match[1];
  }
  return videoId;
};


const Analytics: React.FC = () => {
  const [lyrics, setLyrics] = useState('');
  const [storyboard, setStoryboard] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // YouTube Connection States
  const [isYouTubeConnected, setIsYouTubeConnected] = useState(false);
  const [youTubeChannelInput, setYouTubeChannelInput] = useState('');
  const [youTubeChannelName, setYouTubeChannelName] = useState('');
  const [isLoadingYouTube, setIsLoadingYouTube] = useState(false);
  const [youTubeConnectError, setYouTubeConnectError] = useState<string | null>(null);
  const [liveStreamMessage, setLiveStreamMessage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false); // New state for camera
  const liveVideoRef = useRef<HTMLVideoElement>(null); // New ref for live camera feed
  const localStreamRef = useRef<MediaStream | null>(null);

  // YouTube Video Player States
  const [youtubeVideoUrlInput, setYoutubeVideoUrlInput] = useState('');
  const [currentEmbeddedVideoId, setCurrentEmbeddedVideoId] = useState<string | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!lyrics.trim()) return;
    setIsLoading(true);
    setStoryboard('');
    try {
      const result = await getVideoStoryboard(lyrics);
      setStoryboard(result);
    } catch (error) {
      console.error(error);
      setStoryboard('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [lyrics]);

  const handleConnectYouTube = useCallback(async () => {
    if (!youTubeChannelInput.trim()) {
      setYouTubeConnectError("Please enter a YouTube Channel ID or Name.");
      return;
    }
    setIsLoadingYouTube(true);
    setYouTubeConnectError(null);
    setLiveStreamMessage(null);

    // Simulate API call to YouTube
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    if (youTubeChannelInput.includes('error')) { // Simulate an error case
      setYouTubeConnectError(`Failed to connect to "${youTubeChannelInput}". Invalid ID or network issue.`);
      setIsYouTubeConnected(false);
      setYouTubeChannelName('');
    } else {
      setIsYouTubeConnected(true);
      setYouTubeChannelName(youTubeChannelInput); // Use input as channel name for mock
      setYouTubeConnectError(null);
      setYouTubeChannelInput(''); // Clear input after successful connection
    }
    setIsLoadingYouTube(false);
  }, [youTubeChannelInput]);

  const handleDisconnectYouTube = useCallback(() => {
    setIsYouTubeConnected(false);
    setYouTubeChannelName('');
    setYouTubeConnectError(null);
    setLiveStreamMessage(null);
    if (isCameraActive) {
        setIsCameraActive(false);
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        localStreamRef.current = null;
    }
  }, [isCameraActive]);

  const handleGoLive = useCallback(async () => {
      if (isYouTubeConnected) {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
              localStreamRef.current = stream;
              if (liveVideoRef.current) {
                  liveVideoRef.current.srcObject = stream;
                  setIsCameraActive(true);
              }
              setLiveStreamMessage(`Connecting to YouTube channel: ${youTubeChannelName}...`);
              setTimeout(() => {
                  setLiveStreamMessage(`You are now LIVE on YouTube channel: ${youTubeChannelName}!`);
              }, 2000);
          } catch (error) {
              console.error("Error accessing camera for live stream:", error);
              setLiveStreamMessage("Failed to start camera. Check permissions.");
              setIsCameraActive(false);
          }
      } else {
          setLiveStreamMessage("Please connect a streaming platform first to go live.");
      }
  }, [isYouTubeConnected, youTubeChannelName]);

  const handleStopLive = useCallback(() => {
      setLiveStreamMessage(null);
      setIsCameraActive(false);
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      localStreamRef.current = null;
      // showToast("Live stream ended.", 'info'); // Commented out to avoid redundant toast
  }, []);


  const handleLoadVideo = useCallback(() => {
    setVideoLoadError(null);
    const videoId = extractYouTubeVideoId(youtubeVideoUrlInput);
    if (videoId) {
      setCurrentEmbeddedVideoId(videoId);
    } else {
      setVideoLoadError("Invalid YouTube URL. Please enter a valid video link.");
      setCurrentEmbeddedVideoId(null);
    }
    setYoutubeVideoUrlInput(''); // Clear input after attempt
  }, [youtubeVideoUrlInput]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-200" id="sidebar-analytics">Analytics Dashboard</h2>
        <p className="text-gray-400 mt-2">Monitor your performance, manage streams, and generate video concepts.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 flex-grow">
        <div className="flex flex-col gap-6">
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">Live Studio</h3>
                <div className="aspect-video bg-black rounded-md flex items-center justify-center mb-4 border border-gray-700 overflow-hidden">
                    {isCameraActive && liveVideoRef.current ? (
                        <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                        <p className="text-gray-500">Stream Preview: Offline</p>
                    )}
                </div>
                {/* YouTube Connection Section */}
                <div className="mb-4 p-3 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><i className="fab fa-youtube text-red-500"></i> YouTube Integration</h4>
                    {isYouTubeConnected ? (
                        <div>
                            <p className="text-green-400">Connected: <span className="font-bold">{youTubeChannelName}</span></p>
                            <Button onClick={handleDisconnectYouTube} variant="secondary" className="mt-2 w-full bg-red-700/50 hover:bg-red-600/50 text-red-300 border-red-500/50">
                                <i className="fas fa-unlink mr-2"></i> Disconnect
                            </Button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={youTubeChannelInput}
                                onChange={(e) => setYouTubeChannelInput(e.target.value)}
                                placeholder="Enter YouTube Channel ID/Name"
                                className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500 mb-2"
                                aria-label="YouTube Channel ID or Name"
                                disabled={isLoadingYouTube}
                            />
                            {youTubeConnectError && <p className="text-red-400 text-sm mb-2">{youTubeConnectError}</p>}
                            <Button onClick={handleConnectYouTube} disabled={isLoadingYouTube || !youTubeChannelInput.trim()} className="w-full bg-red-600 hover:bg-red-500 text-white">
                                {isLoadingYouTube ? <Spinner /> : <><i className="fas fa-plug mr-2"></i> Connect YouTube</>}
                            </Button>
                        </>
                    )}
                </div>

                <div className="space-y-3 mb-4">
                    <Toggle label="Twitch" icon="fa-twitch" color="#9146FF" />
                    <Toggle label="Instagram" icon="fa-instagram" color="#E4405F" />
                    <Toggle label="TikTok" icon="fa-tiktok" color="#FFFFFF" />
                </div>
                {isCameraActive ? (
                     <Button variant="primary" onClick={handleStopLive} className="w-full bg-red-600 hover:bg-red-500">
                        <i className="fas fa-stop mr-2"></i> Stop Live
                    </Button>
                ) : (
                    <Button variant="primary" onClick={handleGoLive} disabled={!isYouTubeConnected} className="w-full">
                        <i className="fas fa-satellite-dish mr-2"></i>Go Live
                    </Button>
                )}
                {liveStreamMessage && !isCameraActive && (
                    <p className="text-green-400 text-sm text-center mt-2">{liveStreamMessage}</p>
                )}
            </Card>
             <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">DSP Analytics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <DspMetric icon="fa-spotify" label="Spotify Streams" value="1,234,567" color="#1DB954" />
                    <DspMetric icon="fa-apple" label="Apple Music Plays" value="789,012" color="#FFFFFF" />
                    <DspMetric icon="fa-soundcloud" label="SoundCloud Plays" value="543,210" color="#FF5500" />
                    <DspMetric icon="fa-youtube" label="YouTube Views" value="987,654" color="#FF0000" /> {/* Mock YouTube metric */}
                    <DspMetric icon="fa-tidal" label="Tidal Streams" value="234,567" color="#00FFFF" />
                    <DspMetric icon="fa-amazon" label="Amazon Music Streams" value="456,789" color="#00A8E1" />
                </div>
                <Button variant="secondary" className="w-full">
                   <i className="fas fa-sync-alt mr-2"></i> Sync Data
                </Button>
            </Card>
            {/* New: YouTube Video Player Section */}
            <Card>
                <h3 className="text-xl font-semibold mb-4 text-gray-300">YouTube Video Player</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={youtubeVideoUrlInput}
                        onChange={(e) => setYoutubeVideoUrlInput(e.target.value)}
                        placeholder="Paste YouTube video URL here..."
                        className="flex-grow bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500"
                        aria-label="YouTube video URL"
                    />
                    <Button onClick={handleLoadVideo} disabled={!youtubeVideoUrlInput.trim()} className="bg-red-600 hover:bg-red-500 text-white">
                        Load Video
                    </Button>
                </div>
                {videoLoadError && <p className="text-red-400 text-sm mb-4">{videoLoadError}</p>}
                <div className="aspect-video bg-black rounded-md flex items-center justify-center overflow-hidden border border-gray-700">
                    {currentEmbeddedVideoId ? (
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${currentEmbeddedVideoId}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="no-referrer-when-downgrade" // Changed for broader compatibility, or strict-origin-when-cross-origin
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <p className="text-gray-500">Enter a YouTube URL to play a video.</p>
                    )}
                </div>
            </Card>
        </div>
        <Card className="flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-300">Storyboard AI</h3>
            <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste your song lyrics here to generate a storyboard..."
                className="w-full h-40 bg-gray-900/80 border border-gray-600/50 rounded-lg p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
             <Button onClick={handleGenerate} disabled={isLoading || !lyrics.trim()} className="my-4">
                {isLoading ? 'Generating...' : 'Generate Storyboard'}
            </Button>
            <div className="w-full flex-grow bg-gray-900/80 border border-gray-600/50 rounded-lg p-4 overflow-y-auto prose prose-invert prose-sm max-w-none">
            {isLoading && (
                <div className="flex items-center justify-center h-full">
                    <Spinner />
                </div>
            )}
            {storyboard && !isLoading && (
                <div dangerouslySetInnerHTML={{ __html: storyboard.replace(/\n/g, '<br />') }} />
            )}
            {!storyboard && !isLoading && (
                <p className="text-gray-500">Your storyboard will appear here.</p>
            )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(Analytics);