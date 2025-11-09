import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { samples, Sample } from './services/sampleData';
import { useGlobalAudio } from './services/GlobalAudioContext';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAuth } from './services/AuthContext';
import { useToast } from './services/ToastContext';

interface UserSample extends Sample {
  isUserUploaded: boolean;
  dataBase64?: string; // Store base64 data for persistence if it's a user upload
  mimeType?: string; // Store mime type for persistence
}

const categories: (Sample['category'] | 'All' | 'User Uploads')[] = ['All', 'Drums', 'Loops', 'Vocals', 'FX', 'Instruments', 'User Uploads'];

interface SampleRowProps {
  sample: UserSample;
  isPlaying: boolean;
  isLoading: boolean;
  onPlayToggle: (sample: UserSample) => void;
  onAddToVocalBooth: (sample: UserSample) => void;
  onDeleteUserSample?: (id: number) => void; // Optional for user-uploaded samples
}

const SampleRow: React.FC<SampleRowProps> = React.memo(({ sample, isPlaying, isLoading, onPlayToggle, onAddToVocalBooth, onDeleteUserSample }) => {
  return (
    <li className="flex items-center justify-between gap-4 bg-gray-800/70 p-3 rounded-lg border border-gray-700/50" aria-label={`Sample: ${sample.name}, Category: ${sample.category}`}>
      <div className="flex items-center gap-4 flex-grow min-w-0">
        <Button
          onClick={() => onPlayToggle(sample)}
          className={`w-10 h-10 rounded-full text-lg flex-shrink-0 ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-teal-600 hover:bg-teal-500'}`}
          aria-label={isPlaying ? `Pause ${sample.name}` : `Play ${sample.name}`}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </Button>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-teal-300 truncate">{sample.name}</p>
          <p className="text-xs text-gray-400">{sample.isUserUploaded ? 'User Upload' : sample.category}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          onClick={() => onAddToVocalBooth(sample)}
          disabled={isLoading}
          variant="secondary"
          className="w-40 bg-indigo-700/50 hover:bg-indigo-600/50 text-indigo-300"
          aria-label={`Add ${sample.name} to Vocal Booth`}
        >
          {isLoading ? <Spinner /> : <><i className="fas fa-plus mr-2"></i>Add to Vocal Booth</>}
        </Button>
        {sample.isUserUploaded && onDeleteUserSample && (
          <Button
            onClick={() => onDeleteUserSample(sample.id)}
            variant="secondary"
            className="w-10 bg-red-800/50 hover:bg-red-700/50 text-red-300 border-red-500/50 p-0"
            aria-label={`Delete ${sample.name}`}
          >
            <i className="fas fa-trash"></i>
          </Button>
        )}
      </div>
    </li>
  );
});
SampleRow.displayName = 'SampleRow';

const SampleLibrary: React.FC = () => {
  const { addClipFromSample } = useGlobalAudio();
  const { currentUser, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userSamples, setUserSamples] = useState<UserSample[]>([]);

  const USER_SAMPLES_STORAGE_KEY = `smuve_user_samples_${currentUser?.username}`;

  // Load user samples from local storage on component mount
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      try {
        const storedSamples = localStorage.getItem(USER_SAMPLES_STORAGE_KEY);
        if (storedSamples) {
          const parsedSamples: UserSample[] = JSON.parse(storedSamples);
          const samplesWithValidUrls = parsedSamples.map(s => {
            if (s.isUserUploaded && s.dataBase64) { // Corrected from dataBase664 to dataBase64 to match new field for base64 storage
              // Reconstruct Blob from Base64 data. Note: this uses a lot of memory for large files.
              // For real-world, consider IndexedDB or server-side storage for large files.
              const byteCharacters = atob(s.dataBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: s.mimeType || 'audio/wav' });
              return { ...s, url: URL.createObjectURL(blob) };
            }
            return s;
          });
          setUserSamples(samplesWithValidUrls);
        }
      } catch (error) {
        console.error("Failed to load user samples from local storage:", error);
        localStorage.removeItem(USER_SAMPLES_STORAGE_KEY); // Clear potentially corrupted data
      }
    } else {
      setUserSamples([]); // Clear user samples if not authenticated
    }
  }, [isAuthenticated, currentUser, USER_SAMPLES_STORAGE_KEY]);

  // Save user samples to local storage whenever they change
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Before saving, ensure `dataBase64` and `mimeType` are present for user-uploaded samples.
      const serializableSamples = userSamples.map(s => {
        if (s.isUserUploaded && s.dataBase64) { // Only store base64 if it exists
          // We're storing dataBase64 directly, so the url is not needed for persistence
          return { ...s, url: s.url.startsWith('blob:') ? '' : s.url }; // Clear blob URLs before saving
        }
        return s;
      });
      localStorage.setItem(USER_SAMPLES_STORAGE_KEY, JSON.stringify(serializableSamples));
    }
  }, [userSamples, isAuthenticated, currentUser, USER_SAMPLES_STORAGE_KEY]);

  const allAvailableSamples: UserSample[] = useMemo(() => {
    return [
      ...samples.map(s => ({ ...s, isUserUploaded: false })),
      ...userSamples,
    ];
  }, [userSamples]);

  const filteredSamples = useMemo(() => {
    return allAvailableSamples.filter(sample => {
      const matchesCategory = activeCategory === 'All' ||
        (activeCategory === 'User Uploads' && sample.isUserUploaded) ||
        (activeCategory !== 'User Uploads' && !sample.isUserUploaded && sample.category === activeCategory);

      const matchesSearch = searchTerm.trim() === '' ||
        sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, activeCategory, allAvailableSamples]);

  const handlePlayToggle = useCallback((sample: UserSample) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === sample.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = sample.url;
      audio.play().then(() => {
        setPlayingId(sample.id);
      }).catch(err => {
        console.error("Error playing audio:", err);
        showToast(`Failed to play "${sample.name}".`, 'error');
        setPlayingId(null);
      });
    }
  }, [playingId, showToast]);

  const handleAddToVocalBooth = async (sample: UserSample) => {
    setLoadingId(sample.id);
    await addClipFromSample({ name: sample.name, url: sample.url });
    setLoadingId(null);
    showToast(`"${sample.name}" added to Vocal Booth.`, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      showToast("Please log in to upload samples.", 'error');
      e.target.value = ''; // Clear file input
      return;
    }
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = (event.target?.result as string).split(',')[1]; // Get base64 string
          const mimeType = file.type;

          const url = URL.createObjectURL(file); // Create transient URL for immediate playback
          const newSample: UserSample = {
            id: Date.now() + Math.random(), // Unique ID
            name: file.name,
            url,
            category: 'User Uploads',
            tags: ['user-upload', file.name.toLowerCase()],
            isUserUploaded: true,
            dataBase64: base64Data, // Store base64 for persistence
            mimeType: mimeType,
          };
          setUserSamples(prev => [...prev, newSample]);
          showToast(`Uploaded "${file.name}" to your library!`, 'success');
        };
        reader.readAsDataURL(file); // Read as Data URL to get base64
      });
    }
    e.target.value = ''; // Clear file input after upload
  };

  const handleDeleteUserSample = useCallback((id: number) => {
    // Revoke any blob URL associated with the deleted sample to free memory
    const sampleToDelete = userSamples.find(s => s.id === id);
    if (sampleToDelete && sampleToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(sampleToDelete.url);
    }
    setUserSamples(prev => prev.filter(sample => sample.id !== id));
    showToast('Sample deleted from your uploads.', 'info');
  }, [userSamples, showToast]);

  return (
    <div className="h-full flex flex-col font-mono text-gray-200">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-teal-400 font-orbitron" id="sidebar-sample-library">Sample Library</h2>
        <p className="text-gray-400 mt-2">Browse our collection of royalty-free sounds or upload your own!</p>
      </div>

      <Card className="flex flex-col flex-grow bg-gray-900/50 border-teal-500/30 shadow-lg shadow-teal-500/10 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search samples by name or tag (e.g., 'kick', 'lofi', 'my recording')..."
            className="flex-grow bg-gray-900/80 border border-gray-600/50 rounded-lg p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-500"
            aria-label="Search samples"
          />
          <div className="flex-shrink-0 flex items-center gap-2 bg-gray-800/60 p-1 rounded-lg overflow-x-auto custom-scrollbar-horizontal" role="tablist">
            {categories.map(cat => (
              <Button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                variant={activeCategory === cat ? 'primary' : 'secondary'}
                className={`text-sm flex-shrink-0 ${activeCategory === cat ? 'bg-teal-600 hover:bg-teal-500' : 'bg-transparent border-none'}`}
                role="tab"
                aria-selected={activeCategory === cat}
                aria-controls={`panel-${cat.toLowerCase().replace(/\s/g, '-')}`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="sample-upload-input" className={`w-full mt-2 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-teal-400 border border-gray-600/50 cursor-pointer ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`} tabIndex={!isAuthenticated ? -1 : 0} aria-disabled={!isAuthenticated}>
            <i className="fas fa-file-upload mr-2"></i> Upload Your Samples
          </label>
          <input
            type="file"
            id="sample-upload-input"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            multiple
            className="hidden"
            disabled={!isAuthenticated}
          />
          {!isAuthenticated && <p className="text-xs text-red-400 text-center mt-2">Log in to enable sample uploads.</p>}
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {filteredSamples.length > 0 ? (
            <ul className="space-y-3" role="tabpanel" id={`panel-${activeCategory.toLowerCase().replace(/\s/g, '-')}`} aria-labelledby={`tab-${activeCategory.toLowerCase().replace(/\s/g, '-')}`}>
              {filteredSamples.map(sample => (
                <SampleRow
                  key={sample.id}
                  sample={sample}
                  isPlaying={playingId === sample.id}
                  isLoading={loadingId === sample.id}
                  onPlayToggle={handlePlayToggle}
                  onAddToVocalBooth={handleAddToVocalBooth}
                  onDeleteUserSample={sample.isUserUploaded ? handleDeleteUserSample : undefined}
                />
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <p>No samples found.</p>
              <p className="text-sm">Try a different search term or category.</p>
            </div>
          )}
        </div>
      </Card>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => { if (audioRef.current?.currentTime === audioRef.current?.duration) setPlayingId(null); }} />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #2dd4bf;
          border-radius: 4px;
          border: 2px solid #1f2937;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
          background-color: #2dd4bf;
          border-radius: 3px;
          border: 1px solid #1f2937;
        }
      `}</style>
    </div>
  );
};

export default React.memo(SampleLibrary);