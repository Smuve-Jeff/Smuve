import React, { useState, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './services/ToastContext';
import { getMerchIdeas, generateMerchImage, editImage } from './services/geminiService';
import { useAiService } from './services/AiServiceContext'; // For sharing content to AI manager

// Lazy load mockups
const TshirtMockup = lazy(() => import('./merch/TshirtMockup'));
const HoodieMockup = lazy(() => import('./merch/HoodieMockup'));

type MerchType = 'tshirt' | 'hoodie';
type GarmentColor = 'white' | 'black' | 'gray' | 'navy' | 'red';

// Helper to convert data URL to Blob for AI API
const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

const MerchDesigner: React.FC = () => {
    const { showToast } = useToast();
    const { navigateAppToView, setRememberedArtistName } = useAiService();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [artistName, setArtistName] = useState('My Band');
    const [merchDescription, setMerchDescription] = useState('a minimalist logo for an independent music artist');
    const [merchType, setMerchType] = useState<MerchType>('tshirt');
    const [garmentColor, setGarmentColor] = useState<GarmentColor>('black');
    const [aiEditPrompt, setAiEditPrompt] = useState(''); // New state for AI edit prompt

    const [sloganIdeas, setSloganIdeas] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

    const [isLoadingSlogans, setIsLoadingSlogans] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isAIPainting, setIsAIPainting] = useState(false); // New state for AI editing

    // Initialize canvas context
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                setCtx(context);
                canvas.width = 400; // Fixed size for consistency
                canvas.height = 400;
                context.fillStyle = 'rgba(0,0,0,0)'; // Transparent background
                context.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, []);

    // Draw image onto canvas when `canvasImage` or `generatedImageUrl` changes
    useEffect(() => {
        if (ctx && (canvasImage || generatedImageUrl)) {
            const imgToDraw = new Image();
            imgToDraw.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const aspectRatio = imgToDraw.width / imgToDraw.height;
                let drawWidth = canvas.width;
                let drawHeight = canvas.height;

                if (aspectRatio > 1) { // Landscape
                    drawHeight = canvas.width / aspectRatio;
                } else { // Portrait or square
                    drawWidth = canvas.height * aspectRatio;
                }
                const x = (canvas.width - drawWidth) / 2;
                const y = (canvas.height - drawHeight) / 2;
                ctx.drawImage(imgToDraw, x, y, drawWidth, drawHeight);
            };
            imgToDraw.src = canvasImage?.src || generatedImageUrl || '';
        } else if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear canvas if no image
        }
    }, [ctx, canvasImage, generatedImageUrl]);

    // Update AI's memory when artistName changes
    useEffect(() => {
        setRememberedArtistName(artistName);
    }, [artistName, setRememberedArtistName]);


    const handleGenerateSlogans = useCallback(async () => {
        if (!artistName.trim()) {
            showToast('Please enter an artist name.', 'error');
            return;
        }
        setIsLoadingSlogans(true);
        setSloganIdeas('');
        try {
            const result = await getMerchIdeas(artistName);
            setSloganIdeas(result);
            showToast('Slogan ideas generated!', 'success');
        } catch (error) {
            console.error("Error generating merch ideas:", error);
            showToast('Failed to generate slogan ideas. Please try again.', 'error');
        } finally {
            setIsLoadingSlogans(false);
        }
    }, [artistName, showToast]);

    const handleGenerateImage = useCallback(async () => {
        if (!merchDescription.trim()) {
            showToast('Please enter a description for the merch design.', 'error');
            return;
        }
        setIsLoadingImage(true);
        setGeneratedImageUrl(null);
        setCanvasImage(null); // Clear canvas image before new generation
        try {
            const prompt = `Merch design for an artist named "${artistName}": ${merchDescription}. Display as a standalone graphic, suitable for a ${garmentColor} ${merchType}.`;
            const imageUrl = await generateMerchImage(prompt);
            setGeneratedImageUrl(imageUrl);
            showToast('Merch design image generated!', 'success');
        } catch (error: any) {
            console.error("Error generating merch image:", error);
            showToast(`Failed to generate merch image: ${error.message}.`, 'error');
        } finally {
            setIsLoadingImage(false);
        }
    }, [artistName, merchDescription, merchType, garmentColor, showToast]);

    const handleClearDesign = useCallback(() => {
        setSloganIdeas('');
        setGeneratedImageUrl(null);
        setCanvasImage(null);
        if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        showToast('Design cleared.', 'info');
    }, [ctx, showToast]);

    const handleSaveDesign = useCallback(() => {
        if (canvasRef.current && (canvasImage || generatedImageUrl)) {
            const canvas = canvasRef.current;
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `smuve-merch-design-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Merch image saved!', 'success');
        } else {
            showToast('No image to save.', 'error');
        }
    }, [canvasImage, generatedImageUrl, showToast]);

    const handleUploadImageForEdit = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    setCanvasImage(img);
                    setGeneratedImageUrl(null); // Clear AI generated if manual image uploaded
                    showToast('Image loaded for editing.', 'success');
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiEdit = useCallback(async () => {
        if (!ctx || !canvasRef.current || (!canvasImage && !generatedImageUrl)) {
            showToast('Please generate or upload an image first to edit.', 'error');
            return;
        }
        if (!aiEditPrompt.trim()) {
            showToast('Please enter a prompt for AI editing.', 'error');
            return;
        }

        setIsAIPainting(true);
        try {
            const canvas = canvasRef.current;
            const imageDataUrl = canvas.toDataURL('image/png');
            const mimeType = 'image/png'; // Assuming output from canvas is PNG

            const editedImageUrl = await editImage(imageDataUrl.split(',')[1], mimeType, aiEditPrompt); // Pass base64 data without prefix
            
            const img = new Image();
            img.onload = () => {
                setCanvasImage(img); // Update canvas with the AI-edited image
                setGeneratedImageUrl(editedImageUrl); // Also update the generated URL for mockup
                showToast('Image edited by AI!', 'success');
            };
            img.src = editedImageUrl;

        } catch (error: any) {
            console.error("Error with AI image editing:", error);
            showToast(`AI editing failed: ${error.message}`, 'error');
        } finally {
            setIsAIPainting(false);
        }
    }, [ctx, canvasImage, generatedImageUrl, aiEditPrompt, showToast]);


    const renderMockup = () => {
        const mockupProps = {
            designImage: generatedImageUrl, // Always pass AI generated image or the last edited canvas content
            garmentColor: garmentColor,
        };
        switch (merchType) {
            case 'tshirt':
                return <TshirtMockup {...mockupProps} />;
            case 'hoodie':
                return <HoodieMockup {...mockupProps} />;
            default:
                return null;
        }
    };

    const colorOptions: { label: string; value: GarmentColor; hex: string }[] = [
        { label: 'Black', value: 'black', hex: '#1f2937' },
        { label: 'White', value: 'white', hex: '#e5e7eb' },
        { label: 'Gray', value: 'gray', hex: '#6b7280' },
        { label: 'Navy', value: 'navy', hex: '#1e3a8a' },
        { label: 'Red', value: 'red', hex: '#dc2626' },
    ];

    const garmentTypeOptions: { label: string; value: MerchType; }[] = [
        { label: 'T-Shirt', value: 'tshirt' },
        { label: 'Hoodie', value: 'hoodie' },
    ];

    return (
        <div className="h-full flex flex-col items-center justify-center font-mono text-gray-200">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-yellow-400 font-orbitron">Merch Designer</h2>
                <p className="text-gray-400 mt-2">Generate slogans and visualize designs for your artist merch.</p>
            </div>

            <Card className="w-full max-w-7xl flex flex-col gap-6 bg-gray-900/50 border-yellow-500/30 shadow-lg shadow-yellow-500/10 p-6 flex-grow overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Inputs & Text Ideas */}
                    <div className="flex flex-col gap-6">
                        <Card className="bg-gray-800/60 border-gray-700/50 p-4">
                            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Design Inputs</h3>
                            <div className="mb-4">
                                <label htmlFor="artistName" className="block text-sm font-medium text-gray-400 mb-1">Artist/Band Name</label>
                                <input
                                    type="text"
                                    id="artistName"
                                    value={artistName}
                                    onChange={(e) => setArtistName(e.target.value)}
                                    placeholder="Enter your artist name"
                                    className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="merchDescription" className="block text-sm font-medium text-gray-400 mb-1">Design Description</label>
                                <textarea
                                    id="merchDescription"
                                    value={merchDescription}
                                    onChange={(e) => setMerchDescription(e.target.value)}
                                    placeholder="e.g., 'a vibrant, abstract synthwave pattern with a neon glow', or 'a black and white minimalist logo showing a stylized microphone'"
                                    rows={3}
                                    className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-y custom-scrollbar-thin"
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="merchType" className="block text-sm font-medium text-gray-400 mb-1">Garment Type</label>
                                <div className="flex gap-2">
                                    {garmentTypeOptions.map(option => (
                                        <Button
                                            key={option.value}
                                            onClick={() => setMerchType(option.value)}
                                            variant={merchType === option.value ? 'primary' : 'secondary'}
                                            className={`flex-grow ${merchType === option.value ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="garmentColor" className="block text-sm font-medium text-gray-400 mb-1">Garment Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {colorOptions.map(color => (
                                        <button
                                            key={color.value}
                                            onClick={() => setGarmentColor(color.value)}
                                            className={`w-10 h-10 rounded-full border-2 ${garmentColor === color.value ? 'border-yellow-400' : 'border-gray-700'} flex items-center justify-center`}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.label}
                                        >
                                            {garmentColor === color.value && <i className="fas fa-check text-white text-lg"></i>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-gray-800/60 border-gray-700/50 p-4 flex-grow">
                            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Slogan Ideas (AI)</h3>
                            <Button onClick={handleGenerateSlogans} disabled={isLoadingSlogans} className="w-full mb-4 bg-yellow-600 hover:bg-yellow-500 text-black">
                                {isLoadingSlogans ? <Spinner /> : <><i className="fas fa-lightbulb mr-2"></i> Generate Slogans</>}
                            </Button>
                            {sloganIdeas && (
                                <div className="prose prose-invert prose-sm max-h-64 overflow-y-auto custom-scrollbar-thin" dangerouslySetInnerHTML={{ __html: sloganIdeas.replace(/\n/g, '<br />') }}></div>
                            )}
                            {!sloganIdeas && !isLoadingSlogans && (
                                <p className="text-gray-500 italic">Slogans will appear here.</p>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Image Design & Mockup */}
                    <div className="flex flex-col gap-6">
                        <Card className="bg-gray-800/60 border-gray-700/50 p-4">
                            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Design Editor</h3>
                            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                                <Button onClick={handleGenerateImage} disabled={isLoadingImage} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black">
                                    {isLoadingImage ? <Spinner /> : <><i className="fas fa-magic mr-2"></i> Generate Design</>}
                                </Button>
                                <label htmlFor="upload-image-for-edit" className="w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 focus:ring-yellow-400 border border-gray-600/50 cursor-pointer">
                                    <i className="fas fa-upload mr-2"></i> Upload for Edit
                                </label>
                                <input type="file" id="upload-image-for-edit" ref={fileInputRef} onChange={handleUploadImageForEdit} accept="image/*" className="hidden" />
                            </div>

                            <div className="relative w-full aspect-square bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border border-gray-700 mb-4">
                                {(isLoadingImage || isAIPainting) ? (
                                    <Spinner />
                                ) : (
                                    <canvas ref={canvasRef} className="max-w-full max-h-full object-contain"></canvas>
                                )}
                                {!canvasImage && !generatedImageUrl && !(isLoadingImage || isAIPainting) && (
                                     <p className="absolute text-gray-500 text-center p-4">Generate or upload an image to start editing.</p>
                                )}
                            </div>
                             <div className="mb-4">
                                <label htmlFor="aiEditPrompt" className="block text-sm font-medium text-gray-400 mb-1">AI Edit Prompt</label>
                                <input
                                    type="text"
                                    id="aiEditPrompt"
                                    value={aiEditPrompt}
                                    onChange={(e) => setAiEditPrompt(e.target.value)}
                                    placeholder="e.g., 'add a llama', 'remove the background', 'change text to green'"
                                    className="w-full bg-gray-900/80 border border-gray-600/50 rounded-lg p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    disabled={!canvasImage && !generatedImageUrl || isAIPainting}
                                />
                            </div>
                             <Button onClick={handleAiEdit} disabled={!canvasImage && !generatedImageUrl || isAIPainting || !aiEditPrompt.trim()} className="w-full mb-4 bg-purple-600 hover:bg-purple-500 text-white">
                                {isAIPainting ? <Spinner /> : <><i className="fas fa-robot mr-2"></i> AI Edit Image</>}
                            </Button>

                            <div className="flex justify-between gap-2 mt-2">
                                <Button onClick={handleSaveDesign} disabled={!canvasImage && !generatedImageUrl} variant="secondary" className="flex-grow">
                                    <i className="fas fa-download mr-2"></i> Save Image
                                </Button>
                                <Button onClick={handleClearDesign} variant="secondary" className="flex-grow bg-red-800/50 hover:bg-red-700/50 text-red-300 border-red-500/50">
                                    <i className="fas fa-eraser mr-2"></i> Clear Design
                                </Button>
                            </div>
                        </Card>

                        <Card className="bg-gray-800/60 border-gray-700/50 p-4 flex-grow">
                            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Merch Mockup</h3>
                            <div className="w-full flex-grow flex items-center justify-center relative bg-gray-900/80 rounded-lg overflow-hidden border border-gray-700 p-2">
                                <Suspense fallback={<Spinner />}>
                                    {renderMockup()}
                                </Suspense>
                            </div>
                        </Card>
                    </div>
                </div>
            </Card>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #eab308; border-radius: 4px; border: 2px solid #1f2937; }
                .custom-scrollbar-thin::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb { background-color: #eab308; }
            `}</style>
        </div>
    );
};

export default MerchDesigner;