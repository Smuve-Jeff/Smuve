import React, { useState, useCallback, useEffect } from 'react';
import { getMerchIdeas, findLocalArtists, getMusicRecommendations, getBrandingIdeas } from '../services/geminiService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { useAiService } from '../services/AiServiceContext';
import MapView from '../components/common/MapView';

interface ProConnectionStatus {
    [key: string]: 'idle' | 'connecting' | 'synced';
}

interface BrandingIdeas {
    colorPalette?: string[];
    fontPairings?: { headingFont: string; bodyFont: string };
    logoConcept?: string;
    error?: string;
}

const pros = [
    { id: 'ascap', name: 'ASCAP', description: 'American Society of Composers, Authors and Publishers.' },
    { id: 'bmi', name: 'BMI', description: 'Broadcast Music, Inc.' },
    { id: 'sesac', name: 'SESAC', description: 'Society of European Stage Authors and Composers.' },
    { id: 'soundexchange', name: 'SoundExchange', description: 'Collects and distributes digital performance royalties.' },
    { id: 'mlc', name: 'The MLC', description: 'The Mechanical Licensing Collective.' },
    { id: 'alltrack', name: 'AllTrack', description: 'Music Rights, Simplified.' },
];


const ArtistHub: React.FC = () => {
    const [merchIdeas, setMerchIdeas] = useState('');
    const [artistName, setArtistName] = useState('My Band');
    const [isLoadingMerch, setIsLoadingMerch] = useState(false);
    
    const [proStatus, setProStatus] = useState<ProConnectionStatus>(
        pros.reduce((acc, pro) => ({ ...acc, [pro.id]: 'idle' }), {})
    );

    const { getGeolocation, locationPermissionStatus, userLocation, setRememberedArtistName, setRememberedGenre } = useAiService();
    const [localArtistsResult, setLocalArtistsResult] = useState('');
    const [isLoadingLocal, setIsLoadingLocal] = useState(false);
    const [localError, setLocalError] = useState('');
    const [mapMarkers, setMapMarkers] = useState<{ lat: number; lng: number; title: string }[]>([]);

    const [musicProfile, setMusicProfile] = useState({ genre: 'Indie Rock', influences: 'The Strokes, Arctic Monkeys', mood: 'Nostalgic', goals: 'Write a catchy single' });
    const [recommendations, setRecommendations] = useState('');
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);

    const [brandingTheme, setBrandingTheme] = useState('Urban Nightlife');
    const [brandingIdeas, setBrandingIdeas] = useState<BrandingIdeas | null>(null);
    const [isLoadingBranding, setIsLoadingBranding] = useState(false);

    const [mapCenter, setMapCenter] = useState({ lat: 34.0522, lng: -118.2437 }); // Default to LA
    
    useEffect(() => {
        if (userLocation) {
            setMapCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
        }
    }, [userLocation]);

    // Update AI's memory when artistName or musicProfile.genre changes
    useEffect(() => {
        setRememberedArtistName(artistName);
    }, [artistName, setRememberedArtistName]);

    useEffect(() => {
        setRememberedGenre(musicProfile.genre);
    }, [musicProfile.genre, setRememberedGenre]);


    const handleGenerateMerch = useCallback(async () => {
        setIsLoadingMerch(true);
        setMerchIdeas('');
        try {
            const result = await getMerchIdeas(artistName);
            setMerchIdeas(result);
        } catch (error) {
            console.error(error);
            setMerchIdeas('An error occurred. Please try again.');
        } finally {
            setIsLoadingMerch(false);
        }
    }, [artistName]);

    const handleSyncPro = (proId: string) => {
        setProStatus(prev => ({ ...prev, [proId]: 'connecting' }));
        setTimeout(() => {
            setProStatus(prev => ({ ...prev, [proId]: 'synced' }));
        }, 1500 + Math.random() * 1000);
    };

    const handleFindLocalArtists = useCallback(async () => {
        setIsLoadingLocal(true);
        setLocalError('');
        setLocalArtistsResult('');
        setMapMarkers([]);
        
        let currentLocation = userLocation;

        if (!currentLocation && locationPermissionStatus !== 'denied') {
            try {
                currentLocation = await getGeolocation();
            } catch (error: any) {
                setLocalError(error.message);
                setIsLoadingLocal(false);
                return;
            }
        }

        if (!currentLocation) {
            setLocalError('Location access is required. Please enable it in your browser settings.');
            setIsLoadingLocal(false);
            return;
        }
        
        setMapCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });

        try {
            const response = await findLocalArtists(currentLocation.latitude, currentLocation.longitude, musicProfile);
            setLocalArtistsResult(response.text);
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                const markers = groundingChunks
                    .filter((c: any) => c.maps?.location)
                    .map((c: any) => ({
                        lat: c.maps.location.latitude,
                        lng: c.maps.location.longitude,
                        title: c.maps.title || 'Local Artist/Venue'
                    }));
                setMapMarkers(markers);
            }

        } catch (error: any) {
            setLocalError(error.message);
        } finally {
            setIsLoadingLocal(false);
        }
    }, [userLocation, locationPermissionStatus, getGeolocation, musicProfile]);

    const handleGetRecommendations = useCallback(async () => {
        setIsLoadingRecs(true);
        setRecommendations('');
        try {
            const result = await getMusicRecommendations(musicProfile);
            setRecommendations(result);
        } catch (error) {
            setRecommendations('Failed to get recommendations.');
        } finally {
            setIsLoadingRecs(false);
        }
    }, [musicProfile]);
    
    const handleGenerateBranding = useCallback(async () => {
        setIsLoadingBranding(true);
        setBrandingIdeas(null);
        try {
            const result = await getBrandingIdeas(brandingTheme);
            const parsedResult = JSON.parse(result); // Already parsing here
            if (parsedResult.error) {
                setBrandingIdeas({ error: parsedResult.error });
            } else {
                setBrandingIdeas(parsedResult);
            }
        } catch (error) {
            console.error("Error generating branding ideas:", error);
            setBrandingIdeas({ error: 'Failed to generate branding ideas.' });
        } finally {
            setIsLoadingBranding(false);
        }
    }, [brandingTheme]);
    
    return (
        <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-purple-400 font-orbitron">Artist Hub</h2>
            <p className="text-gray-400 mt-2">Manage your brand, connections, and career.</p>
          </div>
          <div className="w-full max-w-7xl grid lg:grid-cols-3 gap-6 flex-grow overflow-y-auto custom-scrollbar pr-2">
            
            {/* Column 1: Branding & Merch */}
            <div className="flex flex-col gap-6">
                <Card>
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">Branding AI</h3>
                    <input type="text" value={brandingTheme} onChange={e => setBrandingTheme(e.target.value)} placeholder="e.g., Vintage Soul" className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 mb-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <Button onClick={handleGenerateBranding} disabled={isLoadingBranding} className="w-full">
                        {isLoadingBranding ? <Spinner/> : 'Generate Brand Identity'}
                    </Button>
                    {brandingIdeas && !isLoadingBranding && (
                        <div className="mt-4 text-sm">
                            {brandingIdeas.error ? (
                                <p className="text-red-400">{brandingIdeas.error}</p>
                            ) : (
                                <>
                                    <p className="font-bold text-gray-300">Logo Concept:</p>
                                    <p className="text-gray-400 italic mb-2">"{brandingIdeas.logoConcept}"</p>
                                    
                                    {brandingIdeas.colorPalette && brandingIdeas.colorPalette.length > 0 && (
                                        <>
                                            <p className="font-bold text-gray-300">Color Palette:</p>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {brandingIdeas.colorPalette.map((c, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="w-10 h-10 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-100" 
                                                        style={{backgroundColor: c}} 
                                                        title={c}
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {brandingIdeas.fontPairings && (
                                        <>
                                            <p className="font-bold text-gray-300">Fonts:</p>
                                            <div className="mb-2">
                                                <p className="text-gray-400">Heading: <span className="text-lg" style={{ fontFamily: `'${brandingIdeas.fontPairings.headingFont}', sans-serif` }}>{brandingIdeas.fontPairings.headingFont || 'N/A'}</span></p>
                                                <p className="text-gray-400">Body: <span style={{ fontFamily: `'${brandingIdeas.fontPairings.bodyFont}', sans-serif` }}>{brandingIdeas.fontPairings.bodyFont || 'N/A'}</span></p>
                                                <p className="text-xs text-gray-500 mt-1">Note: Fonts are displayed using closest system fonts or fallback `sans-serif`.</p>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">Merch Idea Generator</h3>
                    <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 mb-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <Button onClick={handleGenerateMerch} disabled={isLoadingMerch} className="w-full">
                        {isLoadingMerch ? 'Generating...' : 'Get Merch Ideas'}
                    </Button>
                    {merchIdeas && <div className="mt-4 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: merchIdeas.replace(/\n/g, '<br />') }} />}
                </Card>
            </div>
            
            {/* Column 2: PROs & Local Network */}
            <div className="flex flex-col gap-6">
                <Card className="flex flex-col">
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">Local Network</h3>
                    <div className="h-64 w-full rounded-lg overflow-hidden mb-4 border border-gray-700">
                        <MapView center={mapCenter} markers={mapMarkers} />
                    </div>
                    <Button onClick={handleFindLocalArtists} disabled={isLoadingLocal} className="w-full">
                        {isLoadingLocal ? <Spinner/> : 'Find Local Collaborators'}
                    </Button>
                    {localError && <p className="text-red-400 mt-2 text-sm text-center">{localError}</p>}
                    {localArtistsResult && (
                        <div className="mt-4 prose prose-invert prose-sm max-h-48 overflow-y-auto custom-scrollbar pr-1" dangerouslySetInnerHTML={{ __html: localArtistsResult.replace(/\n/g, '<br />') }} />
                    )}
                </Card>
                <Card>
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">PRO Sync (Simulated)</h3>
                    <div className="space-y-3">
                        {pros.map(pro => (
                            <div key={pro.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                                <div>
                                    <p className="font-bold">{pro.name}</p>
                                    <p className="text-xs text-gray-400">{pro.description}</p>
                                </div>
                                <Button onClick={() => handleSyncPro(pro.id)} disabled={proStatus[pro.id] !== 'idle'} variant="secondary" className="w-28">
                                    {proStatus[pro.id] === 'idle' && 'Sync'}
                                    {proStatus[pro.id] === 'connecting' && <Spinner/>}
                                    {proStatus[pro.id] === 'synced' && <><i className="fas fa-check text-green-400"></i> Synced</>}
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Column 3: Artist Profile & Recommendations */}
            <div className="flex flex-col gap-6">
                 <Card>
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">Artist Profile</h3>
                    <div className="space-y-2 text-sm">
                        <div><label className="font-bold text-gray-400">Genre:</label><input type="text" value={musicProfile.genre} onChange={e => setMusicProfile(p => ({...p, genre: e.target.value}))} className="w-full bg-transparent border-b border-gray-700 focus:border-purple-500 focus:outline-none"/></div>
                        <div><label className="font-bold text-gray-400">Influences:</label><input type="text" value={musicProfile.influences} onChange={e => setMusicProfile(p => ({...p, influences: e.target.value}))} className="w-full bg-transparent border-b border-gray-700 focus:border-purple-500 focus:outline-none"/></div>
                        <div><label className="font-bold text-gray-400">Current Vibe:</label><input type="text" value={musicProfile.mood} onChange={e => setMusicProfile(p => ({...p, mood: e.target.value}))} className="w-full bg-transparent border-b border-gray-700 focus:border-purple-500 focus:outline-none"/></div>
                        <div><label className="font-bold text-gray-400">Goals:</label><input type="text" value={musicProfile.goals} onChange={e => setMusicProfile(p => ({...p, goals: e.target.value}))} className="w-full bg-transparent border-b border-gray-700 focus:border-purple-500 focus:outline-none"/></div>
                    </div>
                </Card>
                <Card className="flex flex-col flex-grow">
                    <h3 className="text-xl font-semibold text-purple-300 mb-4">Music Recommendations</h3>
                    <Button onClick={handleGetRecommendations} disabled={isLoadingRecs} className="w-full mb-4">
                        {isLoadingRecs ? <Spinner/> : 'Get Inspired'}
                    </Button>
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                        {recommendations ? 
                            <div className="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: recommendations.replace(/\n/g, '<br />') }}></div>
                            : <p className="text-center text-gray-500">Recommendations for you will appear here.</p>
                        }
                    </div>
                </Card>
            </div>

          </div>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #a855f7; border-radius: 4px; border: 2px solid #1f2937; }
          `}</style>
        </div>
      );
};

export default React.memo(ArtistHub);