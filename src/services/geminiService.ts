import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse, Tool, Modality } from "@google/genai";
import { View } from '../types'; // Import View enum

// Utility function to get user's current geolocation
export const getGeolocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}. Please enable location services.`));
      },
      {
        enableHighAccuracy: true, // Request high accuracy
        timeout: 10000,         // 10 seconds timeout
        maximumAge: 60000       // Use cached position if less than 1 minute old
      }
    );
  });
};

// Placeholder functions for new AI tools (actual logic will be in AiServiceContext)
// These are primarily for FunctionDeclaration definition and will be called from context
export const readNotepadContent = async (): Promise<string> => {
  return 'Notepad content read (simulated)';
};

export const writeToNotepad = async (content: string): Promise<string> => {
  return `Content written to Notepad: "${content.substring(0, Math.min(content.length, 50))}"... (simulated)`;
};

export const navigateToView = async (view_name: View): Promise<string> => {
  return `Navigating to ${view_name} (simulated)`;
};

export const listAllViews = async (): Promise<View[]> => {
  return Object.values(View);
};

export const getCurrentView = async (): Promise<string> => {
  return 'Current view retrieved (simulated)';
};

export const getMusicFeedback = async (lyrics: string): Promise<string> => {
  // Always create a new instance to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze the following song lyrics for an independent artist. Provide constructive feedback on:
1.  **Theme & Message**: Is it clear, compelling, and consistent?
2.  **Structure**: Identify common song sections (verse, chorus, bridge, pre-chorus, outro, intro). Comment on the effectiveness of the current structure and suggest improvements for flow, impact, and memorability.
3.  **Originality**: How unique are the concepts and phrasing?
4.  **Emotional Impact**: Does it evoke emotion? Is the imagery strong?

Suggest 2-3 potential song titles. Format the output as clean markdown with clear headings for each section.

Lyrics:
---
${lyrics}
---
`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting music feedback:", error);
    return "Sorry, I couldn't analyze the lyrics right now. Please try again later.";
  }
};

export const getMerchIdeas = async (artistName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 5 creative and catchy merch slogans for an independent artist named "${artistName}". The slogans should be short, memorable, and suitable for T-shirts or hoodies. Format as markdown.`,
      config: {
        temperature: 0.8,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting merch ideas:", error);
    return "Sorry, I couldn't generate merch ideas right now. Please try again later.";
  }
};


export const getVideoStoryboard = async (lyrics: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Create a simple, scene-by-scene music video storyboard concept based on these lyrics. Describe the visuals, camera shots, and mood for each scene. Assume a low budget for an independent artist. Format as a markdown list.

Lyrics:
---
${lyrics}
---
`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting video storyboard:", error);
    return "Sorry, I couldn't generate a storyboard right now. Please try again later.";
  }
};

interface GeneralAiResponseOptions {
  prompt: string;
  systemInstruction: string;
  tools?: Tool[];
  lat?: number;
  lng?: number;
}

export const getGeneralAiResponse = async (options: GeneralAiResponseOptions): Promise<GenerateContentResponse> => {
  const { prompt, systemInstruction, tools, lat, lng } = options;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let toolConfig = {};
  if (lat !== undefined && lng !== undefined) {
    toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: lat,
          longitude: lng
        }
      }
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using a powerful model for general responses and tool calling
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        systemInstruction: systemInstruction,
        tools: tools, // Pass tools if provided
        toolConfig: toolConfig, // Pass toolConfig if provided for geolocation
      }
    });
    return response;
  } catch (error) {
    console.error("Error getting general AI response:", error);
    // Throw error to be handled by caller for specific error messages for tools
    throw new Error("I seem to be having trouble connecting to S.M.U.V.E. Please try again in a moment or check your connection.");
  }
};

export const generateSpeech = async (text: string, voiceName: string, promptPrefix: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `${promptPrefix}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data returned from API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate speech from text.");
  }
};

export const generateSocialMediaPost = async (topic: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are S.M.U.V.E., an AI Music Manager. A client needs a social media post.
Topic: "${topic}"
Generate a short, engaging social media post (like for Twitter/X or Instagram) about this topic. Include 2-3 relevant, popular hashtags. Keep it concise and impactful. Format as plain text.`,
      config: {
        temperature: 0.8,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating social media post:", error);
    return "I couldn't generate a post right now. Please try again.";
  }
};

export const generateLyricIdeas = async (theme: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are S.M.U.V.E., an AI Music Manager helping an artist with writer's block.
Theme/Mood: "${theme}"
Generate 3-4 short, creative lyrical concepts or opening lines based on this theme. Format as a simple list.`,
      config: {
        temperature: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating lyric ideas:", error);
    return "Couldn't come up with ideas at the moment. Let's try again.";
  }
};

export const generateLegalDocument = async (documentType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `You are S.M.U.V.E., an AI Music Manager. An artist needs a sample legal document.
Document Type: "${documentType}"

Generate a simplified, sample version of this document. It should outline the key sections and common clauses found in such an agreement.

**IMPORTANT DISCLAIMER:** Start the entire response with this exact disclaimer in bold markdown:
**"DISCLAIMER: This is a sample document for informational purposes only. It is not legal advice. Consult with a qualified legal professional before using or signing any contract."**

Format the rest of the document with clean markdown, using headers for sections.`,
      config: {
        temperature: 0.5,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating legal document:", error);
    return "I couldn't generate the document right now. Please try again.";
  }
};

export const findLocalPrintShops = async (lat: number, lng: number): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "I'm an independent music artist looking to get merch made. Find local t-shirt printing shops near me. Also, show me some local music venues or performance spaces.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response;
  } catch (error) {
    console.error("Error with Google Maps grounding:", error);
    throw new Error("Failed to get location-based data from AI.");
  }
};

export const findLocalArtists = async (
  lat: number,
  lng: number,
  profile?: { genre: string; influences: string }
): Promise<GenerateContentResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let prompt = "I'm a music artist looking for other local artists, musicians, or bands to collaborate with. Find potential collaborators near my location.";

  if (profile && profile.genre && profile.influences) {
    prompt = `I'm a ${profile.genre} artist, influenced by ${profile.influences}. I'm looking for other local artists, musicians, bands, or producers to collaborate with. Find potential collaborators near my location that would be a good stylistic fit.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response;
  } catch (error: any) {
    console.error("Error finding local artists with Google Maps grounding:", error);
    throw new Error("Failed to get local artist data from AI.");
  }
};

// Alias kept for backward compatibility with older imports
export const findLocalCollaborators = findLocalArtists;

// New: Function for personalized music recommendations
export const getMusicRecommendations = async (profileData: { genre: string; influences: string; mood: string; goals: string; }): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Based on the following artist profile, provide 3 music recommendations. For each, explain *why* it's a good fit and suggest one specific production technique, musical element, or songwriting approach the artist could learn from. Format as clean markdown.

**Artist Profile:**
- **Genre**: ${profileData.genre}
- **Influences**: ${profileData.influences}
- **Current Vibe**: ${profileData.mood}
- **Creative Goals**: ${profileData.goals}
`,
      config: {
        temperature: 0.8,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting music recommendations:", error);
    return "Sorry, I couldn't generate recommendations at the moment. Please try again.";
  }
};

// New: Function for artist branding ideas
export const getBrandingIdeas = async (theme: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a brand identity for an independent artist with the theme "${theme}".`,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorPalette: {
              type: Type.ARRAY,
              description: "An array of 5 hex color codes.",
              items: { type: Type.STRING }
            },
            fontPairings: {
              type: Type.OBJECT,
              description: "An object with heading and body font suggestions.",
              properties: {
                headingFont: { type: Type.STRING },
                bodyFont: { type: Type.STRING }
              },
              required: ['headingFont', 'bodyFont']
            },
            logoConcept: {
              type: Type.STRING,
              description: "A brief, one-sentence description for a simple, impactful logo concept."
            }
          },
          required: ['colorPalette', 'fontPairings', 'logoConcept']
        }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting branding ideas:", error);
    return '{"error": "Sorry, I couldn\'t generate branding ideas right now. Please try again later."}';
  }
};

// New: Function for generating drum patterns
export const generateDrumPattern = async (
  genre: string,
  mood: string,
  complexity: string,
  instruments: string[],
  patternLength: number
): Promise<boolean[][]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
        Create a ${patternLength}-step drum pattern for a drum machine.
        The desired genre is "${genre}" with a "${mood}" mood and "${complexity}" complexity.

        The available drum instruments are, in order: ${instruments.join(', ')}.

        The output should be a JSON object containing a "pattern" key. 
        The value of "pattern" should be a 2D array where each sub-array represents an and contains ${patternLength} boolean values (true for a hit, false for a miss).
        The order of the sub-arrays must match the instrument order provided above.
        Ensure the pattern is valid, meaning no missing steps or rows, and all values are strictly booleans.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pattern: {
              type: Type.ARRAY,
              description: `A 2D array of booleans representing the drum grid. It must have ${instruments.length} rows and ${patternLength} columns.`,
              items: {
                type: Type.ARRAY,
                items: { type: Type.BOOLEAN },
                minItems: patternLength,
                maxItems: patternLength,
              },
              minItems: instruments.length,
              maxItems: instruments.length,
            },
          },
          required: ['pattern']
        },
      }
    });

    let jsonStr = response.text.trim();
    const jsonResponse = JSON.parse(jsonStr);

    // Validate the response structure
    if (jsonResponse.pattern && Array.isArray(jsonResponse.pattern) && jsonResponse.pattern.length === instruments.length) {
      // Further validate that each sub-array has the correct length and contains booleans
      const isValid = jsonResponse.pattern.every((row: any) =>
        Array.isArray(row) && row.length === patternLength && row.every((item: any) => typeof item === 'boolean')
      );
      if (isValid) {
        return jsonResponse.pattern;
      } else {
        throw new Error('AI response pattern structure is invalid (incorrect row length or non-boolean values).');
      }
    } else {
      throw new Error('AI response did not match the expected format (missing or incorrect "pattern" array or incorrect number of rows).');
    }

  } catch (error) {
    console.error("Error generating drum pattern:", error);
    throw new Error("Sorry, I couldn't generate a drum pattern right now. Please try again.");
  }
};

export const generateChordProgression = async (key: string, mood: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a 4-chord progression in the key of ${key} with a "${mood}" mood.`,
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            progression: {
              type: Type.ARRAY,
              description: "An array of 4 strings, where each string is a chord name (e.g., 'Cmaj7', 'G', 'Am').",
              items: { type: Type.STRING }
            },
            description: {
              type: Type.STRING,
              description: "A brief, one-sentence explanation of why this progression fits the mood."
            }
          },
          required: ['progression', 'description']
        }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating chord progression:", error);
    return '{"error": "Sorry, I couldn\'t generate a chord progression right now. Please try again."}';
  }
};

export const getMusicTheoryAnswer = async (question: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `As a music theory expert, answer the following question clearly and concisely for a musician. Use markdown for formatting. Question: "${question}"`,
      config: {
        temperature: 0.3,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting music theory answer:", error);
    return "Sorry, I couldn't answer that music theory question right now.";
  }
};

// New: AI Mix Assist
export const getMixingTipsForTrack = async (trackInfo: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
        Provide professional mixing tips for a track described as: "${trackInfo}".
        Give starting point values for a 3-band EQ and a standard compressor.
        
        The output must be a valid JSON object with the following structure, and nothing else:
        {
          "eqLow": number,  // Gain in dB for low frequencies (e.g., -1.5)
          "eqMid": number,  // Gain in dB for mid frequencies (e.g., 2.0)
          "eqHigh": number, // Gain in dB for high frequencies (e.g., 0.5)
          "compressorThreshold": number, // Threshold in dB (e.g., -18)
          "compressorRatio": number, // Ratio (e.g., 4)
          "suggestion": "string" // A brief, one-sentence explanation for these settings.
        }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eqLow: { type: Type.NUMBER },
            eqMid: { type: Type.NUMBER },
            eqHigh: { type: Type.NUMBER },
            compressorThreshold: { type: Type.NUMBER },
            compressorRatio: { type: Type.NUMBER },
            suggestion: { type: Type.STRING }
          },
          required: ["eqLow", "eqMid", "eqHigh", "compressorThreshold", "compressorRatio", "suggestion"]
        }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting mixing tips:", error);
    return '{"error": "Sorry, I couldn\'t generate mixing tips right now."}';
  }
};

export const generateMerchImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // For high-quality image generation tasks, use 'imagen-4.0-generate-001'
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png', // Or jpeg
        aspectRatio: '1:1', // Common for merch designs
      },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating merch image:", error);
    throw new Error("Failed to generate merch image. Please try a different prompt.");
  }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData, // base64 encoded string
              mimeType: mimeType, // IANA standard MIME type
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
      },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from AI for editing.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image. Please try a different prompt or simpler terms.");
  }
};


// New: Tool to update S.M.U.V.E.'s internal memory of the artist's profile
export const updateArtistProfileMemory = async (artistName?: string, genre?: string): Promise<string> => {
  // This function will be handled internally by AiServiceContext, it doesn't make an API call
  console.log(`AI has been informed to remember: Artist Name: ${artistName || 'N/A'}, Genre: ${genre || 'N/A'}`);
  return `S.M.U.V.E. has updated its internal memory with artist info.`;
};


// Define Function Declarations for the AI to use
export const tools: FunctionDeclaration[] = [
  {
    name: 'generate_merch_ideas_for_artist',
    description: 'Generates creative merch slogans and a graphic design concept for a given artist or band name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        artist_name: {
          type: Type.STRING,
          description: 'The name of the artist or band for whom to generate merch ideas.',
        },
      },
      required: ['artist_name'],
    },
  },
  {
    name: 'create_social_media_post',
    description: 'Generates a short, engaging social media post (like for Twitter/X or Instagram) about a given topic, including relevant hashtags.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: 'The topic for the social media post.',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'brainstorm_lyric_ideas',
    description: 'Generates 3-4 short, creative lyrical concepts or opening lines based on a given theme or mood, to help with writer\'s block.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        theme: {
          type: Type.STRING,
          description: 'The theme or mood for which to generate lyrical concepts.',
        },
      },
      required: ['theme'],
    },
  },
  {
    name: 'draft_legal_document',
    description: 'Generates a simplified, sample version of a specified legal document (e.g., Management Agreement, Performance Contract, Recording Contract).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        document_type: {
          type: Type.STRING,
          description: 'The type of legal document to draft (e.g., "Management Agreement", "Performance Contract", "Recording Contract").',
          enum: ["Management Agreement", "Performance Contract", "Recording Contract", "Sync License Agreement", "Publisher Agreement"], // Added more options for variety
        },
      },
      required: ['document_type'],
    },
  },
  {
    name: 'find_local_resources',
    description: 'Finds local t-shirt printing shops or music venues/performance spaces near the user\'s current geographic location. Requires latitude and longitude.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        resource_type: {
          type: Type.STRING,
          description: 'The type of local resource to find ("print_shops" or "music_venues").',
          enum: ["print_shops", "music_venues"]
        },
        latitude: {
          type: Type.NUMBER,
          description: 'The latitude coordinate of the user\'s location.',
        },
        longitude: {
          type: Type.NUMBER,
          description: 'The longitude coordinate of the user\'s location.',
        },
      },
      required: ['resource_type', 'latitude', 'longitude'],
    },
  },
  {
    name: 'find_local_collaborators',
    description: 'Finds other local artists, musicians, or bands for collaboration near the user\'s current geographic location. Requires latitude and longitude.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        latitude: {
          type: Type.NUMBER,
          description: 'The latitude coordinate of the user\'s location.',
        },
        longitude: {
          type: Type.NUMBER,
          description: 'The longitude coordinate of the user\'s location.',
        },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'read_notepad_content',
    description: 'Reads and returns the current text content of the Lyrics/Notepad application section.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'write_to_notepad',
    description: 'Writes or overwrites the given text content to the Lyrics/Notepad application section.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description: 'The text content to write into the Notepad.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'navigate_to_view',
    description: 'Switches the main application interface to a specified view or page.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        view_name: {
          type: Type.STRING,
          description: 'The name of the view to navigate to. Must be one of: "AI_MANAGER", "DJ_TURNTABLES", "AUDIO_RECORDER", "DRUM_MACHINE", "ARTIST_HUB", "ANALYTICS", "MUSIC_PLAYER", "LYRICS", "THE_SPOT", "MERCH_DESIGNER".',
          enum: Object.values(View),
        },
      },
      required: ['view_name'],
    },
  },
  {
    name: 'list_all_views',
    description: 'Lists all available main application views or pages that the user can navigate to.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_current_view',
    description: 'Retrieves the name of the currently active main application view or page.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_chord_progression',
    description: 'Generates a 4-chord progression based on a musical key and desired mood.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: {
          type: Type.STRING,
          description: 'The musical key (e.g., "C Major", "A minor").',
        },
        mood: {
          type: Type.STRING,
          description: 'The desired mood (e.g., "happy", "sad", "jazzy", "epic").',
        },
      },
      required: ['key', 'mood'],
    },
  },
  {
    name: 'answer_music_theory_question',
    description: 'Answers a specific question related to music theory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: {
          type: Type.STRING,
          description: 'The music theory question to answer.',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'generate_merch_design_image',
    description: 'Generates an image for a merch design based on a detailed text prompt. Returns a base64 encoded image.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: {
          type: Type.STRING,
          description: 'A detailed text description for the merch image design (e.g., "a minimalist logo for a cyberpunk band on a black t-shirt").',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'edit_merch_design_image',
    description: 'Edits an existing image (e.g., generated design, uploaded photo) based on a text prompt. Useful for adding elements, removing backgrounds, changing colors, etc. Returns a base64 encoded image.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        base64_image_data: {
          type: Type.STRING,
          description: 'The base64 encoded string of the image to be edited. Must include the data prefix (e.g., "data:image/png;base64,...").',
        },
        mime_type: {
          type: Type.STRING,
          description: 'The MIME type of the image (e.g., "image/png", "image/jpeg").',
        },
        edit_prompt: {
          type: Type.STRING,
          description: 'A detailed text description of the desired edit (e.g., "add a small cat in the corner", "remove the background", "change text to green").',
        },
      },
      required: ['base64_image_data', 'mime_type', 'edit_prompt'],
    },
  },
  {
    name: 'update_artist_profile_memory',
    description: 'Updates S.M.U.V.E.\'s internal memory with the current artist\'s name and primary music genre for contextual responses. This helps S.M.U.V.E. provide more personalized assistance without needing the user to repeat details.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        artist_name: {
          type: Type.STRING,
          description: 'The current artist\'s name (e.g., "Smuve Jeff", "CyberFunk Collective").',
        },
        genre: {
          type: Type.STRING,
          description: 'The primary music genre of the artist (e.g., "Hip-Hop", "Techno", "R&B").',
        },
      },
      // No required fields, as either can be updated independently
    },
  },
];