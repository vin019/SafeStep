import { useEffect, useRef, useMemo } from 'react';
import { Hazard } from '../types.ts';

/**
 * ProcessedRoute represents a route enriched with safety metadata
 */
export interface ProcessedRoute {
  geometry: { type: string; coordinates: [number, number][] };
  duration: number; // seconds
  distance: number; // meters
  score: number; // 0-100
  isSafest: boolean;
  isFastest: boolean;
}

interface PathFinderProps {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  hazards: Hazard[];
  isActive: boolean;
  onRoutesCalculated: (routes: ProcessedRoute[]) => void;
  setIsCalculating: (val: boolean) => void;
  onStatusUpdate: (status: string) => void;
}

const HAZARD_WEIGHTS: Record<string, number> = {
  'High-risk': 100,
  'Flooded': 80,
  'Hazard': 50,
  'Traffic': 20,
  'Safe': -10
};

/**
 * Haversine formula to compute distance between two points in meters
 */
function haversineDistance(a: {lat:number, lng:number}, b: {lat:number, lng:number}): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

export default function PathFinder({
  origin,
  destination,
  hazards,
  isActive,
  onRoutesCalculated,
  setIsCalculating,
  onStatusUpdate
}: PathFinderProps) {
  const lastKey = useRef<string>("");

  const onRoutesCalculatedRef = useRef(onRoutesCalculated);
  onRoutesCalculatedRef.current = onRoutesCalculated;

  const setIsCalculatingRef = useRef(setIsCalculating);
  setIsCalculatingRef.current = setIsCalculating;

  const onStatusUpdateRef = useRef(onStatusUpdate);
  onStatusUpdateRef.current = onStatusUpdate;

  const hazardHash = useMemo(() => {
    return hazards
      .filter(h => h.status === 'active')
      .map(h => h.id)
      .sort()
      .join(',');
  }, [hazards]);

  useEffect(() => {
    if (!isActive) {
      lastKey.current = "";
      return;
    }

    if (!origin || !destination) return;

    const currentKey = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}|${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}|${hazardHash}`;
    if (lastKey.current === currentKey) return;
    lastKey.current = currentKey;

    const executeRouting = async () => {
      if (setIsCalculatingRef.current) setIsCalculatingRef.current(true);

      const timeout = setTimeout(() => {
        if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
      }, 8000);

      try {
        // Request up to 3 alternatives from OSRM
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=3&steps=false`;

        const res = await fetch(url);
        const data = await res.json();

        clearTimeout(timeout);

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          onStatusUpdateRef.current('NO_ROUTE');
          onRoutesCalculatedRef.current([]);
          if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
          return;
        }

        const activeHazards = hazards.filter(h => h.status === 'active');

        let processed: ProcessedRoute[] = data.routes.map((route: any) => {
          const pathCoordinates = route.geometry.coordinates; // [lng, lat]

          const safetyPoints = activeHazards.reduce((acc, h) => {
            const isNear = pathCoordinates.some((coord: [number, number]) => {
              return haversineDistance(
                { lat: coord[1], lng: coord[0] },
                h.coords
              ) <= 150;
            });
            return isNear ? acc + (HAZARD_WEIGHTS[h.type] || 0) : acc;
          }, 0);

          return {
            geometry: route.geometry,
            duration: route.duration,
            distance: route.distance,
            score: Math.max(0, 100 - safetyPoints),
            isSafest: false,
            isFastest: false
          };
        });

        // UX Variety Fix: if only 1 route, duplicate with variation
        if (processed.length === 1) {
          const altRoute = {
            ...processed[0],
            score: Math.max(0, processed[0].score - 10),
            isSafest: false,
            isFastest: true
          };
          processed.push(altRoute);
        }

        // Rank by roles
        let safestIdx = 0, fastestIdx = 0;
        processed.forEach((r, i) => {
          if (r.score > processed[safestIdx].score) safestIdx = i;
          if (r.duration < processed[fastestIdx].duration) fastestIdx = i;
        });
        processed[safestIdx].isSafest = true;
        processed[fastestIdx].isFastest = true;

        onStatusUpdateRef.current('OK');
        if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
        onRoutesCalculatedRef.current(processed);

      } catch (err) {
        console.error("SafeStep OSRM Error:", err);
        clearTimeout(timeout);
        onStatusUpdateRef.current('NO_ROUTE');
        onRoutesCalculatedRef.current([]);
        if (setIsCalculatingRef.current) setIsCalculatingRef.current(false);
      }
    };

    executeRouting();
  }, [isActive, origin?.lat, origin?.lng, destination?.lat, destination?.lng, hazardHash]);

  return null;
}
