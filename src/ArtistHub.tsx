
import React, { useState, useCallback, useEffect } from 'react';
import { getArtists, addArtist, updateArtist, deleteArtist, Artist } from './services/artists';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useAiService } from './services/AiServiceContext';
import MapView from './common/MapView';

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
    const [artists, setArtists] = useState<Artist[]>([]);
    const [newArtist, setNewArtist] = useState<Omit<Artist, 'id'>>({ name: '', genre: '', bio: '' });
    const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
    const [isLoadingArtists, setIsLoadingArtists] = useState(true);
    const [merchIdeas, setMerchIdeas] = useState('');
    const [artistName, setArtistName] = useState('My Band');
    const [isLoadingMerch, setIsLoadingMerch] = useState(false);
    
    const [proStatus, setProStatus] = useState<ProConnectionStatus>(
        pros.reduce((acc, pro) => ({ ...acc, [pro.id]: 'idle' }), {})
    );

    const { getGeolocation, locationPermissionStatus, userLocation, findLocalArtists, getMerchIdeas, getMusicRecommendations, getBrandingIdeas, setRememberedArtistName, setRememberedGenre } = useAiService();
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

    const fetchArtists = useCallback(async () => {
        setIsLoadingArtists(true);
        try {
            const artistsData = await getArtists();
            setArtists(artistsData);
        } catch (error) {
            console.error("Error fetching artists:", error);
        } finally {
            setIsLoadingArtists(false);
        }
    }, []);

    useEffect(() => {
        fetchArtists();
    }, [fetchArtists]);

    const handleAddArtist = async () => {
        if (!newArtist.name) return;
        try {
            await addArtist(newArtist);
            setNewArtist({ name: '', genre: '', bio: '' });
            fetchArtists();
        } catch (error) {
            console.error("Error adding artist:", error);
        }
    };

    const handleUpdateArtist = async (id: string) => {
        if (!editingArtist) return;
        try {
            await updateArtist(id, editingArtist);
            setEditingArtist(null);
            fetchArtists();
        } catch (error) {
            console.error("Error updating artist:", error);
        }
    };

    const handleDeleteArtist = async (id: string) => {
        try {
            await deleteArtist(id);
            fetchArtists();
        } catch (error) {
            console.error("Error deleting artist:", error);
        }
    };

    const handleFindLocalArtists = async () => {
        if (!userLocation) {
            getGeolocation();
            return;
        }

        setIsLoadingLocal(true);
        setLocalError('');
        try {
            const result = await findLocalArtists(musicProfile.genre, userLocation);
            setLocalArtistsResult(result);
        } catch (error) {
            setLocalError('Could not find local artists. Please try again later.');
        } finally {
            setIsLoadingLocal(false);
        }
    };

    const handleGetMerchIdeas = async () => {
        setIsLoadingMerch(true);
        try {
            const ideas = await getMerchIdeas(artistName);
            setMerchIdeas(ideas);
        } finally {
            setIsLoadingMerch(false);
        }
    };

    const handleGetMusicRecommendations = async () => {
        setIsLoadingRecs(true);
        try {
            const recs = await getMusicRecommendations(musicProfile);
            setRecommendations(recs);
        } finally {
            setIsLoadingRecs(false);
        }
    };

    const handleGetBrandingIdeas = async () => {
        setIsLoadingBranding(true);
        try {
            const ideas = await getBrandingIdeas(brandingTheme);
            setBrandingIdeas(ideas);
        } finally {
            setIsLoadingBranding(false);
        }
    };

    return (
        <div>
            {/* Find Local Artists UI */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Find Local Artists</h2>
                <div className="flex items-center gap-4">
                    <Button onClick={handleFindLocalArtists} disabled={isLoadingLocal || locationPermissionStatus !== 'granted'}>
                        {isLoadingLocal ? <Spinner /> : 'Find Artists'}
                    </Button>
                    {locationPermissionStatus === 'denied' && <p className="text-red-500">Location permission denied.</p>}
                </div>
                {localError && <p className="text-red-500 mt-4">{localError}</p>}
                {localArtistsResult && (
                    <div className="mt-4">
                        <h3 className="font-bold">Local Artists:</h3>
                        <p>{localArtistsResult}</p>
                    </div>
                )}
            </Card>

            {/* Get Merch Ideas UI */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Get Merch Ideas</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        className="border border-gray-300 rounded-md p-2"
                    />
                    <Button onClick={handleGetMerchIdeas} disabled={isLoadingMerch}>
                        {isLoadingMerch ? <Spinner /> : 'Get Ideas'}
                    </Button>
                </div>
                {merchIdeas && (
                    <div className="mt-4">
                        <h3 className="font-bold">Merch Ideas:</h3>
                        <p>{merchIdeas}</p>
                    </div>
                )}
            </Card>

            {/* Get Music Recommendations UI */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Get Music Recommendations</h2>
                <Button onClick={handleGetMusicRecommendations} disabled={isLoadingRecs}>
                    {isLoadingRecs ? <Spinner /> : 'Get Recommendations'}
                </Button>
                {recommendations && (
                    <div className="mt-4">
                        <h3 className="font-bold">Recommendations:</h3>
                        <p>{recommendations}</p>
                    </div>
                )}
            </Card>

            {/* Get Branding Ideas UI */}
            <Card>
                <h2 className="text-xl font-bold mb-4">Get Branding Ideas</h2>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={brandingTheme}
                        onChange={(e) => setBrandingTheme(e.target.value)}
                        className="border border-gray-300 rounded-md p-2"
                    />
                    <Button onClick={handleGetBrandingIdeas} disabled={isLoadingBranding}>
                        {isLoadingBranding ? <Spinner /> : 'Get Ideas'}
                    </Button>
                </div>
                {brandingIdeas && (
                    <div className="mt-4">
                        <h3 className="font-bold">Branding Ideas:</h3>
                        {brandingIdeas.logoConcept && <p>Logo Concept: {brandingIdeas.logoConcept}</p>}
                        {brandingIdeas.colorPalette && <p>Color Palette: {brandingIdeas.colorPalette.join(', ')}</p>}
                        {brandingIdeas.fontPairings && <p>Font Pairings: {brandingIdeas.fontPairings.headingFont} / {brandingIdeas.fontPairings.bodyFont}</p>}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ArtistHub;
