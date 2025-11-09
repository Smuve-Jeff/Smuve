// Declare google global for TypeScript to recognize Google Maps API. This is done via a global augment of the Window interface.
declare global {
  interface Window {
    google: any;
  }
}
import React, { useEffect, useRef, useState } from 'react';

interface MapViewProps {
  center: { lat: number; lng: number };
  markers: { lat: number; lng: number; title: string }[];
  zoom?: number;
}

// Dark theme for Google Maps to match the app's aesthetic
const mapStyles: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

const MapView: React.FC<MapViewProps> = ({ center, markers, zoom = 11 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any | null>(null);
  const infoWindowInstance = useRef<any | null>(null);
  const markerInstancesRef = useRef<any[]>([]);
  const [mapStatus, setMapStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!mapsApiKey) {
      console.error("GOOGLE_MAPS_API_KEY environment variable not set.");
      setMapStatus('error');
      return;
    }

    if (window.google && window.google.maps) {
      setMapStatus('loaded');
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
        // If script is already in the DOM, just wait for it to load.
        // The `mapStatus` will be updated by the script's `onload` event.
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapStatus('loaded');
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script.");
      setMapStatus('error');
    };
    document.head.appendChild(script);

  }, []);

  useEffect(() => {
    if (mapStatus !== 'loaded' || !mapRef.current) {
        return;
    }
    
    if (!mapInstance.current) {
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center,
            zoom,
            styles: mapStyles,
            disableDefaultUI: true,
            zoomControl: true,
            backgroundColor: '#111827',
        });
        infoWindowInstance.current = new window.google.maps.InfoWindow();
    } else {
        mapInstance.current.setCenter(center);
        mapInstance.current.setZoom(zoom);
    }
    
    // Clear old markers
    markerInstancesRef.current.forEach(marker => marker.setMap(null));
    markerInstancesRef.current = [];

    markers.forEach((markerInfo) => {
        const marker = new window.google.maps.Marker({
            position: { lat: markerInfo.lat, lng: markerInfo.lng },
            map: mapInstance.current,
            title: markerInfo.title,
            animation: window.google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
            if (infoWindowInstance.current) {
                infoWindowInstance.current.setContent(`<strong>${markerInfo.title}</strong>`);
                infoWindowInstance.current.open(mapInstance.current, marker);
            }
        });

        markerInstancesRef.current.push(marker);
    });

  }, [center, markers, zoom, mapStatus]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px', minHeight: '300px', backgroundColor: '#111827' }}>
      {mapStatus === 'loading' && <div className="flex items-center justify-center h-full text-gray-400">Loading Map...</div>}
      {mapStatus === 'error' && <div className="flex items-center justify-center h-full text-red-400 text-center p-4">Failed to load map. API key may be missing or invalid.</div>}
    </div>
  );
};

export default React.memo(MapView);