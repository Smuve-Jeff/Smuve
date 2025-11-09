
import React, { createContext, useContext, useState, useCallback } from 'react';
import { findLocalArtists, getMerchIdeas, getMusicRecommendations, getBrandingIdeas } from './geminiService';

interface AiServiceContextType {
  getGeolocation: () => void;
  locationPermissionStatus: string;
  userLocation: { lat: number; lng: number } | null;
  setRememberedArtistName: (name: string) => void;
  setRememberedGenre: (genre: string) => void;
  getMerchIdeas: (artistName: string) => Promise<string>;
  findLocalArtists: (genre: string, location: { lat: number; lng: number }) => Promise<string>;
  getMusicRecommendations: (profile: { genre: string; influences: string; mood: string; goals: string }) => Promise<string>;
  getBrandingIdeas: (theme: string) => Promise<any>;
}

const AiServiceContext = createContext<AiServiceContextType | undefined>(undefined);

export const AiServiceProvider: React.FC = ({ children }) => {
  const [locationPermissionStatus, setLocationPermissionStatus] = useState('prompt');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getGeolocation = useCallback(() => {
    // Placeholder for geolocation logic
    console.log('Getting geolocation...');
  }, []);

  const setRememberedArtistName = useCallback((name: string) => {
    // Placeholder for storing artist name
    console.log(`Remembering artist name: ${name}`);
  }, []);

  const setRememberedGenre = useCallback((genre: string) => {
    // Placeholder for storing genre
    console.log(`Remembering genre: ${genre}`);
  }, []);

  return (
    <AiServiceContext.Provider
      value={{
        getGeolocation,
        locationPermissionStatus,
        userLocation,
        setRememberedArtistName,
        setRememberedGenre,
        getMerchIdeas,
        findLocalArtists,
        getMusicRecommendations,
        getBrandingIdeas,
      }}
    >
      {children}
    </AiServiceContext.Provider>
  );
};

export const useAiService = () => {
  const context = useContext(AiServiceContext);
  if (!context) {
    throw new Error('useAiService must be used within an AiServiceProvider');
  }
  return context;
};
