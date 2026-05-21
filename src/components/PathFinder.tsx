import React, { useEffect, useRef, useMemo } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Hazard } from '../types.ts';

interface PathFinderProps {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  hazards: Hazard[];
  onRoutesCalculated: (routes: any[]) => void;
  selectedRouteIndex: number;
  setIsCalculating?: (val: boolean) => void;
  isActive: boolean;
}

const HAZARD_WEIGHTS: Record<string, number> = {
  'High-risk': 100,
  'Flooded': 80,
  'Hazard': 50,
  'Traffic': 20,
  'Safe': -10
};

export default function PathFinder({
  origin,
  destination,
  hazards,
  onRoutesCalculated,
  selectedRouteIndex,
  setIsCalculating,
  isActive
}: PathFinderProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');

  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const lastKey = useRef<string>("");

  // Store callbacks in refs to prevent the effect from re-running when they change
  const onRoutesCalculatedRef = useRef(onRoutesCalculated);
  onRoutesCalculatedRef.current = onRoutesCalculated;

  const setIsCalculatingRef = useRef(setIsCalculating);
  setIsCalculatingRef.current = setIsCalculating;

  // Memoize hazard IDs and active status for dependency stability
  const hazardHash = useMemo(() => {
    return hazards
      .filter(h => h.status === 'active')
      .map(h => h.id)
      .sort()
      .join(',');
  }, [hazards]);

  const getDist = (p1: google.maps.LatLng, p2: { lat: number; lng: number }) => {
    if (geometryLib) return geometryLib.spherical.computeDistanceBetween(p1, new google.maps.LatLng(p2.lat, p2.lng));
    return 9999;
  };

  // 1. Initialize Renderer (Isolated)
  useEffect(() => {
    if (!routesLib || !map) return;
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: '#10B981',
        strokeWeight: 8,
        strokeOpacity: 0.9,
        zIndex: 9999
      }
    });
    rendererRef.current = renderer;
    return () => {
      renderer.setMap(null);
      rendererRef.current = null;
    };
  }, [routesLib, map]);

  // 2. Routing Logic
  useEffect(() => {
    // Reset key if navigation is deactivated to allow fresh re-triggers
    if (!isActive) {
      lastKey.current = "";
      return;
    }

    // Strict Guard: Wait for both essential libraries to mount on mobile
    if (!routesLib || !geometryLib || !map || !origin || !destination) return;

    const currentKey = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}|${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
    if (lastKey.current === currentKey) return;
    lastKey.current = currentKey;

    const svc = new routesLib.DirectionsService();

    const fetchRoutes = (mode: string) => {
      if (setIsCalculatingRef.current) setIsCalculatingRef.current(true);

      const timeout = setTimeout(() => {
        if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
      }, 8000);

      svc.route({
        origin,
        destination,
        travelMode: mode as any, // Use string literals 'WALKING' or 'DRIVING'
        provideRouteAlternatives: true
      }, (result, status) => {
        clearTimeout(timeout);

        if (status === 'OK' && result) {
          const processed = result.routes.map(route => {
            const safetyPoints = hazards.reduce((acc, h) => {
              if (h.status !== 'active') return acc;
              const isNear = route.overview_path.some(pt => getDist(pt, h.coords) <= 150);
              return isNear ? acc + (HAZARD_WEIGHTS[h.type] || 0) : acc;
            }, 0);
            return {
              ...route,
              score: Math.max(0, 100 - safetyPoints),
              durationValue: route.legs[0].duration?.value || 0,
              isSafest: false,
              isFastest: false
            };
          });

          let s = 0, f = 0;
          processed.forEach((r, i) => {
            if (r.score > processed[s].score) s = i;
            if (r.durationValue < processed[f].durationValue) f = i;
          });
          processed[s].isSafest = true;
          processed[f].isFastest = true;

          if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
          onRoutesCalculatedRef.current(processed);

          if (rendererRef.current) {
            rendererRef.current.setDirections(result);
            rendererRef.current.setRouteIndex(selectedRouteIndex);
          }
        } else if (mode === 'WALKING') {
          fetchRoutes('DRIVING');
        } else {
          if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
          onRoutesCalculatedRef.current([]);
        }
      });
    };

    fetchRoutes('WALKING');
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, hazardHash, routesLib, geometryLib, map, isActive]);

  // 3. Selection Update
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setRouteIndex(selectedRouteIndex);
    }
  }, [selectedRouteIndex]);

  return null;
}
