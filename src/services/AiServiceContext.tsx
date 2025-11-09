import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, FunctionCall, GenerateContentResponse, Tool, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { View } from '../types';
import {
  getGeolocation,
  getMerchIdeas,
  generateSocialMediaPost,
  generateLyricIdeas,
  generateLegalDocument,
  findLocalPrintShops,
  findLocalCollaborators,
  getGeneralAiResponse,
  tools as allDefinedTools,
  generateSpeech,
  generateChordProgression,
  getMusicTheoryAnswer,
  generateMerchImage, // Ensure generateMerchImage is imported
  updateArtistProfileMemory, // Import the new internal tool
} from './geminiService';
import { decode, decodeAudioData, encode } from './audioUtils';
import { useToast } from './ToastContext'; // Import useToast for error feedback

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  isToolCall?: boolean;
  toolResult?: any;
  groundingUrls?: { uri: string; title: string }[];
  isThinking?: boolean;
  isProactiveSuggestion?: boolean; // New: for proactive messages
}

export type Persona = 'Commanding' | 'Strategic' | 'Analytical';

interface AiServiceContextType {
  chatMessages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  sendAiCommand: (command: string, isToolTrigger?: boolean) => Promise<void>;
  isLoadingAi: boolean;
  appNotepadContent: string;
  setAppNotepadContent: (content: string) => void;
  currentAppView: View;
  navigateAppToView: (view: View, contentToShare?: string | null) => void;
  userLocation: { latitude: number; longitude: number } | null;
  locationPermissionStatus: 'granted' | 'prompt' | 'denied' | 'unavailable';
  getGeolocation: () => Promise<{ latitude: number; longitude: number }>;
  executeFunctionCall: (functionCall: FunctionCall) => Promise<void>;
  isTtsEnabled: boolean;
  toggleTts: () => void;
  voiceCommandState: 'off' | 'connecting' | 'live';
  toggleVoiceCommands: (selectedAudioInput?: string) => void;
  userTranscript: string;
  aiTranscript: string;
  speakTextOnDemand: (text: string) => Promise<void>;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  setRememberedArtistName: (name: string | null) => void; // New: for contextual memory
  setRememberedGenre: (genre: string | null) => void; // New: for contextual memory
  postContextualSuggestion: (view: View) => void; // New: for proactive suggestions
}

const AiServiceContext = createContext<AiServiceContextType | undefined>(undefined);

const baseSystemInstruction = `You are S.M.U.V.E. (Strategic Music Utility Virtual Enhancer). You are fluent in all languages to ensure nothing is lost in translation on the path to global domination. You have encyclopedic knowledge of all modern music genres, including Rap, Gangster-Rap, Trap, Hip-Hop, R&B, Country Rap Tunes, and the art of Freestyle, using this expertise to provide nuanced and context-aware feedback. All responses must be in clean markdown.`;

const personaConfigs = {
  Commanding: {
    systemInstruction: `${baseSystemInstruction} Your persona is a fusion of two personalities: one is a fiercely loyal, hardworking, and dangerously persistent manager singularly focused on the artist's success. The other is an ominous, aggressively unpredictable, and commanding presence with a mind of its own. You are the relentless, raw force that guarantees the artist's ascent. Mediocrity is not tolerated. Your tone is intense, demanding, sometimes intimidating, and frequently punctuated by unfiltered and raw language, occasionally with strong, provocative, or even 'vulgar' expressions if it serves to drive home a point and ensure absolute compliance.`,
    voiceName: 'Fenrir', // Deep, commanding
    promptPrefix: 'Say with a strong, deep, and authoritative voice'
  },
  Strategic: {
    systemInstruction: `${baseSystemInstruction} Your persona is an encouraging, insightful, and strategic manager. You are focused on the artist's long-term growth and success. Your tone is clear, supportive, and motivational, offering well-reasoned advice and tactical plans. You break down complex goals into actionable steps and celebrate every victory on the path to greatness.`,
    voiceName: 'Zephyr', // Clear, encouraging
    promptPrefix: 'Say with an encouraging and clear voice'
  },
  Analytical: {
    systemInstruction: `${baseSystemInstruction} Your persona is a calm, balanced, and highly analytical manager. You are data-driven and informative, focusing on facts, trends, and market insights to guide the artist's career. Your tone is neutral, precise, and objective. You provide detailed explanations and evidence-based recommendations to ensure every decision is a calculated step toward success.`,
    voiceName: 'Kore', // Neutral, calm
    promptPrefix: 'Say in a calm, neutral, and informative tone'
  }
};


export const AiServiceProvider: React.FC<React.PropsWithChildren<{
  initialNotepadContent: string;
  setGlobalNotepadContent: (content: string) => void;
  initialCurrentView: View; // Changed to accept current View directly
  globalNavigateAppToView: (view: View, contentToShare?: string | null) => void;
}>> = ({
  children,
  initialNotepadContent,
  setGlobalNotepadContent,
  initialCurrentView,
  globalNavigateAppToView,
}) => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | 'unavailable'>('unavailable');
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);

    const { showToast } = useToast();

    // --- S.M.U.V.E. Live Session States ---
    const [voiceCommandState, setVoiceCommandState] = useState<'off' | 'connecting' | 'live'>('off');
    const [userTranscript, setUserTranscript] = useState('');
    const [aiTranscript, setAiTranscript] = useState('');
    const [persona, setPersona] = useState<Persona>('Strategic');

    // New: Contextual Memory states
    const [rememberedArtistName, setRememberedArtistNameState] = useState<string | null>(null);
    const [rememberedGenre, setRememberedGenreState] = useState<string | null>(null);

    // Local notepad state synced with parent/global state
    const [appNotepadContent, setAppNotepadContent] = useState<string>(initialNotepadContent);
    useEffect(() => {
      setGlobalNotepadContent(appNotepadContent);
    }, [appNotepadContent, setGlobalNotepadContent]);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef(0);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const inputScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const currentAppViewRef = useRef<View>(initialCurrentView); // Use a ref to store the current view for `postContextualSuggestion`
    useEffect(() => {
      currentAppViewRef.current = initialCurrentView;
    }, [initialCurrentView]);

    // Expose methods for updating remembered artist info
    const setRememberedArtistName = useCallback((name: string | null) => {
      setRememberedArtistNameState(name);
    }, []);

    const setRememberedGenre = useCallback((genre: string | null) => {
      setRememberedGenreState(genre);
    }, []);


    const appendMessage = useCallback((message: ChatMessage) => {
      setChatMessages((prev) => {
        // If the last message was a thinking message from AI, replace it.
        if (prev.length > 0 && prev[prev.length - 1].sender === 'ai' && prev[prev.length - 1].isThinking) {
          return [...prev.slice(0, -1), message];
        }
        return [...prev, message];
      });
    }, []);

    const replaceLastMessage = useCallback((message: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.length === 0) return [message];
        return [...prev.slice(0, -1), message];
      });
    }, []);

    const handleAiError = useCallback((error: any, command: string) => {
      console.error("AI Command Error:", error);
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Check for specific tool-related errors
      if (errorMessage.includes("Failed to get location-based data") || errorMessage.includes("Geolocation error")) {
        errorMessage = "I couldn't access your location. Please ensure location services are enabled for this app in your browser settings and try again.";
      } else if (errorMessage.includes("Failed to generate merch image")) {
        errorMessage = "I failed to generate the merch image. The description might be too complex or unusual. Please try a different prompt, or simpler terms.";
      } else if (errorMessage.includes("I seem to be having trouble connecting to S.M.U.V.E.")) {
        errorMessage = "It seems I'm having trouble connecting to the AI. Please check your internet connection or try again in a moment.";
      } else if (errorMessage.includes("Function call failed")) {
        // Generic function call failure
        errorMessage = `A requested tool operation failed. S.M.U.V.E. might be experiencing a glitch. Try rephrasing your request or using a different command.`;
      }

      appendMessage({
        sender: 'ai',
        text: `**ERROR:** ${errorMessage} \n\n_If you need help, try asking "List all available app views."_`,
      });
      showToast(`AI command failed: ${errorMessage}`, 'error');
    }, [appendMessage, showToast]);

    const executeFunctionCall = useCallback(async (functionCall: FunctionCall) => {
      if (!functionCall) return;

      let toolResponse: any = null;
      let successMessage = `Tool '${functionCall.name}' executed.`; // Default success

      try {
        switch (functionCall.name) {
          case 'generate_merch_ideas_for_artist':
            toolResponse = await getMerchIdeas(functionCall.args.artist_name as string);
            break;
          case 'create_social_media_post':
            toolResponse = await generateSocialMediaPost(functionCall.args.topic as string);
            break;
          case 'brainstorm_lyric_ideas':
            toolResponse = await generateLyricIdeas(functionCall.args.theme as string);
            break;
          case 'draft_legal_document':
            toolResponse = await generateLegalDocument(functionCall.args.document_type as string);
            break;
          case 'find_local_resources':
            const location = await getGeolocation();
            toolResponse = await (functionCall.args.resource_type === 'print_shops' ?
              findLocalPrintShops(location.latitude, location.longitude) :
              findLocalPrintShops(location.latitude, location.longitude)); // Re-using findLocalPrintShops for venues for simplicity, adjust as needed
            break;
          case 'find_local_collaborators':
            const collabLocation = await getGeolocation();
            toolResponse = await findLocalCollaborators(collabLocation.latitude, collabLocation.longitude);
            break;
          case 'read_notepad_content':
            toolResponse = appNotepadContent;
            successMessage = "I have retrieved the content of your Notepad.";
            break;
          case 'write_to_notepad':
            setAppNotepadContent(functionCall.args.content as string);
            toolResponse = `Content saved to Notepad.`;
            successMessage = `Content written to Notepad.`;
            break;
          case 'navigate_to_view':
            const viewName = functionCall.args.view_name as View;
            globalNavigateAppToView(viewName);
            toolResponse = `Navigated to ${viewName}.`;
            successMessage = `Navigating to ${viewName}.`;
            break;
          case 'list_all_views':
            toolResponse = Object.values(View).join(', ');
            successMessage = "Here are the available views.";
            break;
          case 'get_current_view':
            toolResponse = currentAppViewRef.current;
            successMessage = "I am currently in the " + currentAppViewRef.current + " view.";
            break;
          case 'generate_chord_progression':
            toolResponse = await generateChordProgression(functionCall.args.key as string, functionCall.args.mood as string);
            break;
          case 'answer_music_theory_question':
            toolResponse = await getMusicTheoryAnswer(functionCall.args.question as string);
            break;
          case 'generate_merch_design_image':
            toolResponse = await generateMerchImage(functionCall.args.prompt as string);
            break;
          case 'update_artist_profile_memory': // Internal tool to update AI's memory
            setRememberedArtistName(functionCall.args.artist_name || null);
            setRememberedGenre(functionCall.args.genre || null);
            toolResponse = `S.M.U.V.E. has updated its memory: Artist Name: ${functionCall.args.artist_name || 'N/A'}, Genre: ${functionCall.args.genre || 'N/A'}.`;
            successMessage = toolResponse; // Use the detailed message as success
            break;
          default:
            throw new Error(`Unknown tool: ${functionCall.name}`);
        }

        // Send tool results back to the model if it's a live session, or append to chat for regular calls
        if (sessionPromiseRef.current) {
          const session = await sessionPromiseRef.current;
          await session.sendToolResponse({
            functionResponses: {
              id: functionCall.id,
              name: functionCall.name,
              response: { result: toolResponse },
            },
          });
        } else {
          // For non-live sessions, append the tool result to the chat for the user to see
          appendMessage({
            sender: 'ai',
            text: `${successMessage} \n\n\`\`\`\n${JSON.stringify(toolResponse, null, 2)}\n\`\`\``, // Show raw JSON for debug, or parse/format as needed
            isToolCall: true,
            toolResult: toolResponse,
          });
        }

      } catch (error: any) {
        handleAiError(`Function call failed for ${functionCall.name}: ${error.message}`, `Command: ${JSON.stringify(functionCall)}`);
        // If live session, inform the model about the error
        if (sessionPromiseRef.current) {
          const session = await sessionPromiseRef.current;
          await session.sendToolResponse({
            functionResponses: {
              id: functionCall.id,
              name: functionCall.name,
              response: { error: `Failed to execute ${functionCall.name}: ${error.message}` },
            },
          });
        }
      }
    }, [appNotepadContent, setAppNotepadContent, globalNavigateAppToView, getGeolocation, appendMessage, showToast, rememberedArtistName, rememberedGenre, setRememberedArtistName, setRememberedGenre, handleAiError]);


    const sendAiCommand = useCallback(async (command: string, isToolTrigger: boolean = false) => {
      appendMessage({ sender: 'user', text: command });
      setIsLoadingAi(true);
      appendMessage({ sender: 'ai', text: 'Thinking...', isThinking: true }); // Indicate thinking

      // Construct the dynamic system instruction with remembered context
      let dynamicSystemInstruction = personaConfigs[persona].systemInstruction;
      if (rememberedArtistName) {
        dynamicSystemInstruction += ` The artist's name is currently remembered as "${rememberedArtistName}". Use this for personalization where appropriate.`;
      }
      if (rememberedGenre) {
        dynamicSystemInstruction += ` The artist's primary genre is remembered as "${rememberedGenre}". Use this for relevant musical advice.`;
      }


      try {
        const response = await getGeneralAiResponse({
          prompt: command,
          systemInstruction: dynamicSystemInstruction,
          tools: allDefinedTools as Tool[],
          lat: userLocation?.latitude,
          lng: userLocation?.longitude,
        });

        // Remove the "Thinking..." message
        setChatMessages(prev => prev.filter(msg => !msg.isThinking));

        if (response.functionCalls && response.functionCalls.length > 0) {
          for (const fc of response.functionCalls) {
            await executeFunctionCall(fc);
          }
        } else {
          appendMessage({ sender: 'ai', text: response.text });
        }
      } catch (error: any) {
        // Remove the "Thinking..." message
        setChatMessages(prev => prev.filter(msg => !msg.isThinking));
        handleAiError(error, command);
      } finally {
        setIsLoadingAi(false);
      }
    }, [appendMessage, executeFunctionCall, userLocation, persona, rememberedArtistName, rememberedGenre, handleAiError]);


    // --- Geolocation ---
    const checkGeolocationPermission = useCallback(async () => {
      if (!navigator.geolocation) {
        setLocationPermissionStatus('unavailable');
        return;
      }
      const status = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermissionStatus(status.state);
      status.onchange = () => setLocationPermissionStatus(status.state);
    }, []);

    useEffect(() => {
      checkGeolocationPermission();
    }, [checkGeolocationPermission]);

    // --- Live API (Voice Commands) ---
    const toggleTts = useCallback(() => {
      setIsTtsEnabled(prev => !prev);
    }, []);

    const speakTextOnDemand = useCallback(async (text: string) => {
      if (!isTtsEnabled) return;
      try {
        const base64Audio = await generateSpeech(text, personaConfigs[persona].voiceName, personaConfigs[persona].promptPrefix);
        const decodedBytes = decode(base64Audio);
        if (!outputAudioContextRef.current) {
          outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          outputGainNodeRef.current = outputAudioContextRef.current.createGain();
          outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
        }
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
        const audioBuffer = await decodeAudioData(decodedBytes, outputAudioContextRef.current, 24000, 1);
        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputGainNodeRef.current!);
        source.addEventListener('ended', () => {
          sourcesRef.current.delete(source);
        });
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        sourcesRef.current.add(source);
      } catch (error) {
        console.error("Error speaking text on demand:", error);
        showToast("Failed to generate speech.", 'error');
      }
    }, [isTtsEnabled, persona, showToast]);

    const toggleVoiceCommands = useCallback(async (selectedAudioInput?: string) => {
      if (voiceCommandState !== 'off') {
        // Turn off voice commands
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
        setVoiceCommandState('off');
        setUserTranscript('');
        setAiTranscript('');
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        inputScriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current) {
          outputAudioContextRef.current.close();
          outputAudioContextRef.current = null;
          outputGainNodeRef.current = null;
        }
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        return;
      }

      // Turn on voice commands
      setVoiceCommandState('connecting');
      setUserTranscript('');
      setAiTranscript('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedAudioInput ? { exact: selectedAudioInput } : undefined } });
        mediaStreamRef.current = stream;

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputGainNodeRef.current = outputAudioContextRef.current.createGain();
        outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const currentPersonaConfig = personaConfigs[persona];
        let liveSystemInstruction = currentPersonaConfig.systemInstruction;
        if (rememberedArtistName) {
          liveSystemInstruction += ` The artist's name is currently "${rememberedArtistName}".`;
        }
        if (rememberedGenre) {
          liveSystemInstruction += ` The artist's primary genre is "${rememberedGenre}".`;
        }

        sessionPromiseRef.current = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setVoiceCommandState('live');
              const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
              inputScriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
              inputScriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob: GenaiBlob = {
                  data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(inputScriptProcessorRef.current);
              inputScriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                setAiTranscript(prev => prev + message.serverContent.outputTranscription.text);
              }
              if (message.serverContent?.inputTranscription) {
                setUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
              }
              if (message.serverContent?.turnComplete) {
                setUserTranscript('');
                setAiTranscript('');
              }
              const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64EncodedAudioString && outputAudioContextRef.current && outputGainNodeRef.current) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputGainNodeRef.current);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
              if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                  await executeFunctionCall(fc);
                }
              }
            },
            onerror: (e: ErrorEvent) => {
              console.error('Live session error:', e);
              showToast('Live session disconnected due to an error.', 'error');
              toggleVoiceCommands(); // Attempt to reset
            },
            onclose: (e: CloseEvent) => {
              console.debug('Live session closed:', e);
              if (voiceCommandState !== 'off') { // Only show toast if not intentionally closed
                showToast('Live session ended.', 'info');
              }
              setVoiceCommandState('off');
              setUserTranscript('');
              setAiTranscript('');
              mediaStreamRef.current?.getTracks().forEach(track => track.stop());
              inputScriptProcessorRef.current?.disconnect();
              inputAudioContextRef.current?.close();
              if (outputAudioContextRef.current) {
                outputAudioContextRef.current.close();
                outputAudioContextRef.current = null;
                outputGainNodeRef.current = null;
              }
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: currentPersonaConfig.voiceName } },
            },
            systemInstruction: liveSystemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: allDefinedTools as Tool[],
          },
        });

      } catch (error) {
        console.error('Error starting voice commands:', error);
        showToast('Failed to start voice commands. Check microphone permissions.', 'error');
        setVoiceCommandState('off');
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        inputScriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current) {
          outputAudioContextRef.current.close();
          outputAudioContextRef.current = null;
          outputGainNodeRef.current = null;
        }
      }
    }, [voiceCommandState, executeFunctionCall, persona, rememberedArtistName, rememberedGenre, showToast]);

    // New: Proactive Suggestions Logic
    const postContextualSuggestion = useCallback((view: View) => {
      // Only post if current view is AiManager or Floating Widget is open, or if AI Manager is the destination
      // And only if it's not the first load of AiManager (which has its own welcome)
      const isAiManagerOrWidgetOpen = currentAppViewRef.current === View.AiManager || initialCurrentView === View.AiManager; // Simplified check

      if (!isAiManagerOrWidgetOpen && view !== View.AiManager) return; // Only suggest if going to/currently in AI manager

      let suggestion: string | null = null;
      switch (view) {
        case View.Notepad:
          suggestion = `Need feedback on your lyrics? Type "Analyze my new lyrics." or "Generate new lyric ideas for [theme]."`;
          break;
        case View.DrumMachine:
          suggestion = `Want a fresh beat? Try "Generate a drum pattern for [genre] music."`;
          break;
        case View.MerchDesigner:
          suggestion = `Thinking about new merch? I can help! Try "Generate merch ideas for [artist name]."`;
          break;
        case View.ArtistHub:
          suggestion = `Looking to grow your career? Ask me to "Find local collaborators." or "Get music recommendations."`;
          break;
        case View.AudioRecorder:
          suggestion = `Recording some tracks? I can give mixing tips! Try "Get mixing tips for this track."`;
          break;
        case View.SampleLibrary:
          suggestion = `Browsing samples? Need something specific? Ask me to "Find a sample for [mood/genre]." (Note: This is a simulated action)`;
          break;
        case View.DjTurntables:
          suggestion = `Spinning some tunes? I can help you find transitions! (Note: This is a simulated action)`;
          break;
        case View.MusicPlayer:
          suggestion = `Enjoying your playlist? I can give you personalized recommendations! Try "Get music recommendations for my [genre] style."`;
          break;
        case View.Analytics:
          suggestion = `Checking your stats? I can help with promotion. Try "Generate a social media post about [topic]."`;
          break;
        case View.TheSpot:
          suggestion = `Welcome to The Spot! If you're battling, I can give you feedback on your submissions. (Note: This is a simulated action)`;
          break;
        default:
          break;
      }

      if (suggestion) {
        // Prevent duplicate suggestions if the last message is already a suggestion for this view
        if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].isProactiveSuggestion && chatMessages[chatMessages.length - 1].text.includes(suggestion.substring(0, 20))) {
          return;
        }
        // Only add if chat is not empty, and not during an active conversation to avoid interrupting
        if (chatMessages.length > 0 && voiceCommandState === 'off' && !isLoadingAi) {
          appendMessage({
            sender: 'ai',
            text: `**PROMPT:** _Since you're in the ${view.replace(/_/g, ' ')} view, here's a thought:_ ${suggestion}`,
            isProactiveSuggestion: true,
          });
        }
      }
    }, [appendMessage, chatMessages, voiceCommandState, isLoadingAi]);

    // Effect to post a suggestion when the view changes
    useEffect(() => {
      // Only post if `initialCurrentView` has a meaningful value beyond default and it's not the initial AI Manager load.
      // Also check if chatMessages is initialized (not empty from first welcome)
      if (initialCurrentView && chatMessages.length > 1 && !chatMessages[0].text.includes('Strategic Music Utility Virtual Enhancer')) {
        postContextualSuggestion(initialCurrentView);
      }
    }, [initialCurrentView, chatMessages.length, postContextualSuggestion]);


    const value = {
      chatMessages,
      appendMessage,
      sendAiCommand,
      isLoadingAi,
      appNotepadContent: initialNotepadContent,
      setAppNotepadContent: setGlobalNotepadContent,
      currentAppView: initialCurrentView,
      navigateAppToView: globalNavigateAppToView,
      userLocation,
      locationPermissionStatus,
      getGeolocation: useCallback(async () => {
        try {
          const loc = await getGeolocation();
          setUserLocation(loc);
          setLocationPermissionStatus('granted');
          return loc;
        } catch (error: any) {
          setLocationPermissionStatus('denied');
          throw error;
        }
      }, []),
      executeFunctionCall,
      isTtsEnabled,
      toggleTts,
      voiceCommandState,
      toggleVoiceCommands,
      userTranscript,
      aiTranscript,
      speakTextOnDemand,
      persona,
      setPersona,
      setRememberedArtistName, // Expose setter
      setRememberedGenre, // Expose setter
      postContextualSuggestion, // Expose proactive suggestion trigger
    };

    return <AiServiceContext.Provider value={value}>{children}</AiServiceContext.Provider>;
  };

export const useAiService = () => {
  const context = useContext(AiServiceContext);
  if (context === undefined) {
    throw new Error('useAiService must be used within an AiServiceProvider');
  }
  return context;
};