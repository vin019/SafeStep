import React, { useEffect, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Hazard } from '../types.ts';

interface PathFinderProps {
  origin: google.maps.LatLngLiteral | null;
  destination: google.maps.LatLngLiteral | null;
  hazards: Hazard[];
  onRoutesCalculated: (routes: any[]) => void;
  selectedRouteIndex: number;
  setIsCalculating?: (val: boolean) => void;
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
  setIsCalculating
}: PathFinderProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geometryLib = useMapsLibrary('geometry');

  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [currentResponse, setCurrentResponse] = useState<google.maps.DirectionsResult | null>(null);

  const getDistanceMeters = (p1: google.maps.LatLng, p2: { lat: number; lng: number }) => {
    if (geometryLib) {
      return geometryLib.spherical.computeDistanceBetween(p1, new google.maps.LatLng(p2.lat, p2.lng));
    }
    const R = 6371000;
    const dLat = ((p2.lat - p1.lat()) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng()) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat() * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!routesLib || !map) return;

    const service = new routesLib.DirectionsService();
    const renderer = new routesLib.DirectionsRenderer({
      map: map,
      suppressMarkers: true,
      preserveViewport: false,
      polylineOptions: {
        zIndex: 9999, // Ensure it's on top of almost everything
        strokeWeight: 8,
        strokeOpacity: 0.9
      }
    });

    setDirectionsService(service);
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [routesLib, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    const requestRoute = (mode: 'WALKING' | 'DRIVING') => {
      if (setIsCalculating) setIsCalculating(true);

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: mode as any,
          provideRouteAlternatives: true,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            console.log(`SafeStep: Found ${result.routes.length} paths using ${mode} engine`);

            // Map the routes to specific roles: Safest, Fastest, Alternative
            const processedRoutes = result.routes.map((route, index) => {
              const pathPoints = route.overview_path;
              const activeHazards = hazards.filter(h => h.status === 'active');

              const safetyPoints = activeHazards.reduce((acc, hazard) => {
                const isNear = pathPoints.some(point => getDistanceMeters(point, hazard.coords) <= 150);
                if (isNear) {
                  return acc + (HAZARD_WEIGHTS[hazard.type] || 0);
                }
                return acc;
              }, 0);

              const safetyScore = Math.max(0, 100 - safetyPoints);

              return {
                ...route,
                safetyScore,
                score: safetyScore,
                durationValue: route.legs[0].duration.value,
                isFastest: false,
                isSafest: false
              };
            });

            // Identify fastest and safest
            let fastestIdx = 0;
            let safestIdx = 0;
            processedRoutes.forEach((r, i) => {
              if (r.durationValue < processedRoutes[fastestIdx].durationValue) fastestIdx = i;
              if (r.safetyScore > processedRoutes[safestIdx].safetyScore) safestIdx = i;
            });

            processedRoutes[fastestIdx].isFastest = true;
            processedRoutes[safestIdx].isSafest = true;

            if (setIsCalculating) setIsCalculating(false);
            onRoutesCalculated(processedRoutes);
            setCurrentResponse(result);
            directionsRenderer.setDirections(result);
          } else if (mode === 'WALKING') {
            // Treat all roads as walkable by falling back to DRIVING engine
            console.warn("SafeStep: Falling back to road-inclusive navigation.");
            requestRoute('DRIVING');
          } else {
            console.error("SafeStep Directions API Error:", status);
            if (setIsCalculating) setIsCalculating(false);
            onRoutesCalculated([]);
          }
        }
      );
    };

    requestRoute('WALKING');
  }, [directionsService, directionsRenderer, origin.lat, origin.lng, destination.lat, destination.lng, hazards, geometryLib]);

  useEffect(() => {
    if (!directionsRenderer || !currentResponse || !currentResponse.routes[selectedRouteIndex]) return;

    const activeRoute = (currentResponse.routes as any)[selectedRouteIndex];

    // Safety-first Color Palette
    // Safest (Score > 90): Emerald Green
    // Moderate (Score 60-90): Amber/Orange
    // Dangerous (Score < 60): Rose/Red
    const score = activeRoute?.score ?? 100;
    const themeColor = score > 90 ? '#10B981' : (score > 60 ? '#F59E0B' : '#EF4444');

    directionsRenderer.setOptions({
      routeIndex: selectedRouteIndex,
      polylineOptions: {
        strokeColor: themeColor,
        strokeOpacity: 1.0,
        strokeWeight: 8,
        zIndex: 9999
      }
    });

    // Automatically fit the map to the selected route if it changes
    if (map && activeRoute.bounds) {
       map.fitBounds(activeRoute.bounds);
    }

  }, [selectedRouteIndex, directionsRenderer, currentResponse, map]);

  return null;
}
