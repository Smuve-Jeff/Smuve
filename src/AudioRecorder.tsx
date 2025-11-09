import React, { useState, useRef, useCallback, useEffect } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import MixerKnob from './common/MixerKnob';
import ToggleSwitch from './common/ToggleSwitch';
import WaveformDisplay from './common/WaveformDisplay';
import LevelMeter from './common/LevelMeter';
import { useGlobalAudio } from './services/GlobalAudioContext';
import { Clip } from './types';
import Spinner from './common/Spinner';
import { getMixingTipsForTrack } from './services/geminiService';
import { useToast } from './services/ToastContext';

interface AiMixModalProps {
  clip: Clip;
  onClose: () => void;
  onApply: (settings: any) => void;
}

const AiMixModal: React.FC<AiMixModalProps> = React.memo(({ clip, onClose, onApply }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mixSuggestion, setMixSuggestion] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await getMixingTipsForTrack(clip.metadata.genre || clip.name);
      const parsedResult = JSON.parse(result);
      if (parsedResult.error) {
        setError(parsedResult.error);
      } else {
        setMixSuggestion(parsedResult);
      }
    } catch (e) {
      setError('Failed to get mixing tips.');
    } finally {
      setIsLoading(false);
    }
  }, [clip.name, clip.metadata.genre]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono" onClick={onClose}>
      <div className="bg-gray-900 border border-green-500/50 rounded-lg shadow-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-green-400 mb-4">AI Mix Assist for "{clip.name}"</h3>
        {!mixSuggestion && !isLoading && !error && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Let S.M.U.V.E. suggest EQ and Compression settings for this track.</p>
            <Button onClick={handleGenerate} icon={<i className="fas fa-brain"></i>}>Generate Suggestion</Button>
          </div>
        )}
        {isLoading && <div className="flex justify-center"><Spinner /></div>}
        {error && <p className="text-red-400 text-center">{error}</p>}
        {mixSuggestion && (
          <div>
            <p className="italic text-green-300 mb-4">"{mixSuggestion.suggestion}"</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="font-bold">EQ Low:</p><p>{mixSuggestion.eqLow.toFixed(1)} dB</p></div>
              <div><p className="font-bold">EQ Mid:</p><p>{mixSuggestion.eqMid.toFixed(1)} dB</p></div>
              <div><p className="font-bold">EQ High:</p><p>{mixSuggestion.eqHigh.toFixed(1)} dB</p></div>
              <div><p className="font-bold">Comp Threshold:</p><p>{mixSuggestion.compressorThreshold.toFixed(1)} dB</p></div>
              <div><p className="font-bold">Comp Ratio:</p><p>{mixSuggestion.compressorRatio}:1</p></div>
            </div>
            <Button onClick={() => onApply(mixSuggestion)} className="w-full mt-6">Apply Settings</Button>
          </div>
        )}
      </div>
    </div>
  );
});
AiMixModal.displayName = 'AiMixModal';

interface ClipTrackProps {
  clip: Clip;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onPlay: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (id: number) => void;
  onMixerChange: (id: number, param: string, value: number) => void;
  onToggleChange: (id: number, param: keyof Clip['mixer']) => void;
  onMetadataChange: (id: number, field: keyof Clip['metadata'], value: string) => void;
  onSynthWaveformChange: (id: number, waveform: 'sine' | 'sawtooth' | 'square') => void;
  onOpenAiMix: (clip: Clip) => void;
}

const ClipTrack: React.FC<ClipTrackProps> = React.memo(({ clip, isExpanded, onToggleExpand, onPlay, onStop, onDelete, onMixerChange, onToggleChange, onMetadataChange, onSynthWaveformChange, onOpenAiMix }) => {
  return (
    <Card className="bg-gray-800/60 border-gray-700/50 p-3">
      {/* --- Track Header --- */}
      <div className="flex items-center gap-4">
        <Button onClick={() => onToggleExpand(clip.id)} variant="secondary" className="p-2 w-10 h-10"><i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i></Button>
        <Button onClick={() => clip.isPlaying ? onStop(clip.id) : onPlay(clip.id)} className={`w-12 h-10 ${clip.isPlaying ? 'bg-red-600' : 'bg-green-600'}`}><i className={`fas ${clip.isPlaying ? 'fa-stop' : 'fa-play'}`}></i></Button>
        <div className="flex-grow">
          <input
            type="text"
            value={clip.metadata.title || clip.name}
            onChange={(e) => onMetadataChange(clip.id, 'title', e.target.value)}
            className="bg-transparent text-lg font-bold text-gray-200 focus:outline-none focus:bg-gray-700/50 rounded px-2 w-full truncate"
            placeholder="Track Name"
          />
          <p className="text-xs text-gray-400 capitalize">{clip.type} Track</p>
        </div>
        <Button onClick={() => onDelete(clip.id)} variant="secondary" className="p-2 w-10 h-10 bg-red-900/50 text-red-300 hover:bg-red-800/50"><i className="fas fa-trash"></i></Button>
      </div>
      {/* --- Expanded View --- */}
      {isExpanded && (
        <div className="mt-4 border-t border-gray-700/50 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Waveform & Metadata */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              <div className="bg-black rounded-lg overflow-hidden">
                {clip.type === 'video' && clip.videoUrl ? (
                  <video src={clip.videoUrl} controls className="w-full h-auto max-h-36 object-contain" />
                ) : (
                  <WaveformDisplay clipBuffer={clip.audioBuffer} playbackProgress={clip.playbackCurrentTime / clip.playbackDuration} color="#4ade80" />
                )}
              </div>
              <input type="text" value={clip.metadata.artist} onChange={e => onMetadataChange(clip.id, 'artist', e.target.value)} placeholder="Artist" className="bg-gray-800/70 border border-gray-600/50 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500" />
              <input type="text" value={clip.metadata.album} onChange={e => onMetadataChange(clip.id, 'album', e.target.value)} placeholder="Album" className="bg-gray-800/70 border border-gray-600/50 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500" />
              <input type="text" value={clip.metadata.genre} onChange={e => onMetadataChange(clip.id, 'genre', e.target.value)} placeholder="Genre" className="bg-gray-800/70 border border-gray-600/50 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500" />
              {clip.type === 'synth' && (
                <select value={clip.synthSettings?.waveform} onChange={e => onSynthWaveformChange(clip.id, e.target.value as any)} className="bg-gray-800/70 border border-gray-600/50 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="sawtooth">Sawtooth</option>
                </select>
              )}
            </div>
            {/* Mixer & Effects */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-6 bg-gray-900/50 p-4 rounded-lg">
                <MixerKnob label="Volume" value={clip.mixer.volume} onChange={v => onMixerChange(clip.id, 'volume', v)} min={0} max={1.5} step={0.01} color="green" />
                <MixerKnob label="Pan" value={clip.mixer.pan} onChange={v => onMixerChange(clip.id, 'pan', v)} min={-1} max={1} step={0.01} color="blue" />
                <MixerKnob label="EQ Low" value={clip.mixer.eqLow} onChange={v => onMixerChange(clip.id, 'eqLow', v)} min={-12} max={12} step={1} unit="dB" color="purple" />
                <MixerKnob label="EQ Mid" value={clip.mixer.eqMid} onChange={v => onMixerChange(clip.id, 'eqMid', v)} min={-12} max={12} step={1} unit="dB" color="pink" />
                <MixerKnob label="EQ High" value={clip.mixer.eqHigh} onChange={v => onMixerChange(clip.id, 'eqHigh', v)} min={-12} max={12} step={1} unit="dB" color="yellow" />
                <MixerKnob label="Comp Thresh" value={clip.mixer.compressorThreshold} onChange={v => onMixerChange(clip.id, 'compressorThreshold', v)} min={-60} max={0} step={1} unit="dB" color="orange" />
                <MixerKnob label="Comp Ratio" value={clip.mixer.compressorRatio} onChange={v => onMixerChange(clip.id, 'compressorRatio', v)} min={1} max={20} step={1} unit=":1" color="orange" />
                <MixerKnob label="Reverb" value={clip.mixer.reverbWetDry} onChange={v => onMixerChange(clip.id, 'reverbWetDry', v)} min={0} max={1} step={0.01} color="cyan" />
              </div>
              <div className="flex flex-wrap justify-around items-center gap-4 bg-gray-900/50 p-4 rounded-lg">
                <ToggleSwitch label="Auto-Tune" isOn={clip.mixer.autoTuneOn} onToggle={() => onToggleChange(clip.id, 'autoTuneOn')} color="teal" />
                <ToggleSwitch label="Limiter" isOn={clip.mixer.limiterOn} onToggle={() => onToggleChange(clip.id, 'limiterOn')} color="rose" />
                <ToggleSwitch label="Noise Gate" isOn={clip.mixer.noiseGateOn} onToggle={() => onToggleChange(clip.id, 'noiseGateOn')} color="amber" />
                <Button onClick={() => onOpenAiMix(clip)} icon={<i className="fas fa-brain"></i>} className="bg-green-700 hover:bg-green-600">AI Mix Assist</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
});
ClipTrack.displayName = 'ClipTrack';


const AudioRecorder: React.FC = () => {
  const {
    clips, addClip, deleteClip, playClip, stopClip, handleClipMixerChange,
    handleClipToggle,
    isRecording, startRecording, stopRecording,
    recordingState,
    addSynthTrack, handleClipMetadataChange, handleSynthWaveformChange,
    exportMixAsWav, isExporting, saveSession, loadSession,
    masterEffects, handleMasterEffectChange,
    addVideoClip, // New: from GlobalAudioContext
  } = useGlobalAudio();

  const { showToast } = useToast();
  const [expandedClipId, setExpandedClipId] = useState<number | null>(null);
  const [modalClip, setModalClip] = useState<Clip | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null); // New ref for video preview

  const [isCapturingVideo, setIsCapturingVideo] = useState(false); // New state for video capture toggle

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedClipId(prev => (prev === id ? null : id));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Differentiate between audio and video files
      if (file.type.startsWith('audio/')) {
        addClip(file);
        showToast(`Imported "${file.name}"`, 'success');
      } else if (file.type.startsWith('video/')) {
        addVideoClip(file);
        showToast(`Imported video "${file.name}"`, 'success');
      } else {
        showToast('Unsupported file type.', 'error');
      }
    }
  };

  const handleManualLoadSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadSession({ fromFile: file });
    }
  };

  const getRecordingStatusText = () => {
    switch (recordingState.status) {
      case 'recording': return '● Recording';
      case 'counting-in': return `Counting In... ${recordingState.countIn}`;
      case 'ready': return 'Ready';
      default: return 'Vocal Booth';
    }
  };

  // Effect to manage video preview stream
  useEffect(() => {
    const videoElement = videoPreviewRef.current;
    if (videoElement && recordingState.videoStream) {
      videoElement.srcObject = recordingState.videoStream;
      videoElement.play().catch(e => console.error("Error playing video stream:", e));
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
  }, [recordingState.videoStream]);


  return (
    <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
      {modalClip && <AiMixModal clip={modalClip} onClose={() => setModalClip(null)} onApply={(settings) => {
        handleClipMixerChange(modalClip.id, 'eqLow', settings.eqLow);
        handleClipMixerChange(modalClip.id, 'eqMid', settings.eqMid);
        handleClipMixerChange(modalClip.id, 'eqHigh', settings.eqHigh);
        handleClipMixerChange(modalClip.id, 'compressorThreshold', settings.compressorThreshold);
        handleClipMixerChange(modalClip.id, 'compressorRatio', settings.compressorRatio);
        showToast(`AI Mix applied to "${modalClip.name}"`, 'info');
        setModalClip(null);
      }} />}
      <Card className="w-full max-w-7xl flex flex-col gap-4 bg-gray-900/50 border-green-500/30 shadow-lg shadow-green-500/10 p-4 h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
          <h2 className="text-3xl font-bold text-green-400 font-orbitron" id="sidebar-vocal-booth">
            {getRecordingStatusText()}
          </h2>
          <div className="flex-grow flex items-center justify-center min-h-[60px]">
            {isCapturingVideo && recordingState.videoStream ? (
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-auto max-h-[100px] object-cover rounded-lg"></video>
            ) : recordingState.waveformData && recordingState.waveformData.length > 0 && isRecording ? (
              <WaveformDisplay isRecording={isRecording} audioData={recordingState.waveformData} color="#4ade80" width={400} height={60} />
            ) : (
              <div className="w-full h-[60px] bg-black rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">No audio/video input</p>
              </div>
            )}
          </div>
          <Button onClick={() => startRecording(isCapturingVideo)} variant="primary" className={`w-32 h-12 text-lg ${isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-green-600 hover:bg-green-500'}`}>
            <i className={`fas ${isRecording ? 'fa-stop' : (isCapturingVideo ? 'fa-video' : 'fa-microphone')}`}></i>
            <span className="ml-2">{isRecording ? 'Stop' : 'Record'}</span>
          </Button>
        </div>

        <div className="w-full grid lg:grid-cols-4 gap-4 flex-grow overflow-hidden">
          {/* Tracklist */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-green-300">Tracks</h3>
              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" icon={<i className="fas fa-upload"></i>}>Import Media</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*,video/*" className="hidden" />
                <Button onClick={addSynthTrack} variant="secondary" icon={<i className="fas fa-wave-square"></i>}>Add Synth</Button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {clips.map(clip => (
                <ClipTrack
                  key={clip.id}
                  clip={clip}
                  isExpanded={expandedClipId === clip.id}
                  onToggleExpand={handleToggleExpand}
                  onPlay={playClip}
                  onStop={stopClip}
                  onDelete={deleteClip}
                  onMixerChange={handleClipMixerChange}
                  onToggleChange={handleClipToggle}
                  onMetadataChange={handleClipMetadataChange}
                  onSynthWaveformChange={handleSynthWaveformChange}
                  onOpenAiMix={setModalClip}
                />
              ))}
              {clips.length === 0 && <p className="text-center text-gray-500 mt-8">Your session is empty. Record or import audio/video to begin.</p>}
            </div>
          </div>
          {/* Right Column: Input, Metronome, Master */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <Card className="bg-gray-800/40 border-gray-700/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">Input Channel</h3>
              <div className="space-y-4">
                <select
                  value={recordingState.selectedInput}
                  onChange={e => recordingState.setInputDevice(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="default">Default Microphone</option>
                  {recordingState.audioInputs.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                  ))}
                </select>
                <div className="flex justify-around items-center">
                  <MixerKnob label="Input Gain" value={recordingState.inputGain} onChange={recordingState.setInputGain} min={0} max={2} step={0.05} color="green" />
                  <LevelMeter analyserNode={recordingState.inputAnalyserNode} isRecording={isRecording} />
                </div>
                <ToggleSwitch label="Capture Video" isOn={isCapturingVideo} onToggle={() => setIsCapturingVideo(prev => !prev)} color="cyan" disabled={isRecording} />
              </div>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">Metronome</h3>
              <div className="flex justify-around items-center">
                <MixerKnob label="BPM" value={recordingState.metronomeBpm} onChange={recordingState.setMetronomeBpm} min={60} max={200} step={1} color="yellow" />
                <div className="flex flex-col gap-3">
                  <ToggleSwitch label="Metronome" isOn={recordingState.metronomeOn} onToggle={recordingState.toggleMetronome} color="yellow" />
                  <ToggleSwitch label="Count-in" isOn={recordingState.countInOn} onToggle={recordingState.toggleCountIn} color="yellow" />
                  <ToggleSwitch label="Monitor" isOn={recordingState.monitorOn} onToggle={recordingState.toggleMonitor} color="cyan" />
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">Master Effects</h3>
              <div className="flex justify-around">
                <MixerKnob label="Delay" value={masterEffects.delayWetDry} onChange={(v) => handleMasterEffectChange('delayWetDry', v)} min={0} max={1} step={0.01} color="purple" />
                <MixerKnob label="Chorus" value={masterEffects.chorusWetDry} onChange={(v) => handleMasterEffectChange('chorusWetDry', v)} min={0} max={1} step={0.01} color="blue" />
              </div>
            </Card>

            <Card className="bg-gray-800/40 border-gray-700/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">Session</h3>
              <div className="flex flex-col gap-2">
                <Button onClick={saveSession} icon={<i className="fas fa-save"></i>}>Save Session</Button>
                <label htmlFor="load-session" className="px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 cursor-pointer">
                  <i className="fas fa-folder-open"></i> Load Session
                </label>
                <input type="file" id="load-session" className="hidden" accept=".json" onChange={handleManualLoadSession} />
                <Button onClick={exportMixAsWav} disabled={isExporting} icon={<i className="fas fa-file-audio"></i>} variant="primary" className="bg-green-700 hover:bg-green-600">
                  {isExporting ? <Spinner /> : 'Export Mix'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Card>
      <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4ade80; border-radius: 4px; border: 2px solid #1f2937; }
      `}</style>
    </div>
  );
};

export default React.memo(AudioRecorder);