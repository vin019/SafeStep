import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef,
  InfoWindow
} from '@vis.gl/react-google-maps';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import PathFinder from '../components/PathFinder.tsx';
import { useApp } from '../AppContext.tsx';
import { Search, MapPin, Navigation, Info, ShieldCheck, AlertCircle, ZoomIn, ZoomOut, Target, X, Clock, User as UserIcon, CheckCircle, ChevronUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Hazard } from '../types.ts';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || 'AIzaSyASF0ZMWEyIFVq1PD6uHrUYnayafokYS4c';

// --- Helper Functions ---
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<google.maps.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    if (map) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

const isPointNearPath = (point: {lat: number, lng: number}, path: any[], radiusMeters: number) => {
  if (!window.google) return false;
  return path.some(pathPoint => {
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(point.lat, point.lng),
      new google.maps.LatLng(pathPoint.lat, pathPoint.lng)
    );
    return distance <= radiusMeters;
  });
};

// --- Components ---

function HazardMarker({ hazard, onClick }: { hazard: Hazard, onClick: () => void, key?: React.Key }) {
  const isHazardous = ['Hazard', 'High-risk', 'Flooded', 'Traffic'].includes(hazard.type);
  const color = hazard.type === 'Safe' ? '#10b981' : 
                hazard.type === 'High-risk' ? '#ef4444' : 
                hazard.type === 'Flooded' ? '#3b82f6' : '#f59e0b';

  return (
    <AdvancedMarker position={hazard.coords} onClick={onClick}>
      <div className="relative group">
        <div className={`p-2 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110 ${
          hazard.type === 'Safe' ? 'bg-emerald-500' : 
          hazard.type === 'Hazard' ? 'bg-amber-500' : 
          hazard.type === 'Flooded' ? 'bg-blue-500' :
          'bg-rose-500'
        }`}>
          {hazard.type === 'Safe' && <ShieldCheck size={18} className="text-white" />}
          {hazard.type === 'Hazard' && <AlertCircle size={18} className="text-white" />}
          {hazard.type === 'Flooded' && <AlertCircle size={18} className="text-white" />}
          {hazard.type === 'High-risk' && <ShieldAlert size={18} className="text-white" />}
        </div>
        {isHazardous && (
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20 -z-10" />
        )}
      </div>
    </AdvancedMarker>
  );
}

// Reuse similar icon logic but for Google Maps
function CustomPinLayer({ hazards, onHazardClick }: { hazards: Hazard[], onHazardClick: (h: Hazard) => void }) {
  return (
    <>
      {hazards.map(h => (
        <HazardMarker key={h.id} hazard={h} onClick={() => onHazardClick(h)} />
      ))}
    </>
  );
}

export default function MapView() {
  const { hazards, selectedRoute, setSelectedRoute, destinationPosition, setDestinationPosition, userPosition, verifyHazard } = useApp();
  const navigate = useNavigate();
  const mapRef = useRef<google.maps.Map | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isRoutingActive, setIsRoutingActive] = useState(false);

  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [routeActiveWarning, setRouteActiveWarning] = useState(false);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

  // Initialize Session Token for Search
  useEffect(() => {
    if (placesLib && !sessionToken) {
      setSessionToken(new placesLib.AutocompleteSessionToken());
    }
  }, [placesLib, sessionToken]);

  useEffect(() => {
    if (!placesLib || !searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Using the recommended AutocompleteSuggestion pattern (New Places API v3)
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompletePredictions({
          input: searchQuery,
          sessionToken: sessionToken || undefined,
          locationBias: mapRef.current?.getCenter() || undefined
        });

        // Convert suggestions to a format we can display
        const results = await Promise.all(suggestions.map(async (s) => {
          return s.place; // This returns a Place instance
        }));

        setSearchResults(results);
      } catch (err) {
        console.error("Search Error:", err);
        // Fallback to searchByText if suggestions fail
        placesLib.Place.searchByText({
          textQuery: searchQuery,
          fields: ['displayName', 'location', 'id'],
          maxResultCount: 5,
          locationBias: mapRef.current?.getCenter() || undefined
        }).then(({ places }) => {
          setSearchResults(places);
        }).catch(e => console.error("Fallback Search Error:", e));
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, placesLib, sessionToken]);

  useEffect(() => {
    if (destinationPosition) {
      console.log("SafeStep UI: Rendering destination marker at", destinationPosition);
    }
  }, [destinationPosition]);

  const handlePlaceSelect = async (place: google.maps.places.Place) => {
    console.log("SafeStep: Resolving place", place.displayName);

    // Highly Resilient Lazy Resolver Pipeline
    const resolvePlaceCoordinates = async (p: google.maps.places.Place) => {
      // 1. Try modern fetchFields first
      try {
        if (!p.location) {
          await p.fetchFields({ fields: ['location', 'viewport', 'displayName'] });
        }
        if (p.location) return p.location;
      } catch (e) {
        console.warn("SafeStep: fetchFields failed, trying legacy PlacesService fallback");
      }

      // 2. Fallback to PlacesService (Resilient Resolver)
      if (window.google && mapRef.current) {
        const service = new google.maps.places.PlacesService(mapRef.current);
        return new Promise<google.maps.LatLng | null>((resolve) => {
          service.getDetails({ placeId: p.id, fields: ['geometry', 'name'] }, (result, status) => {
            if (status === 'OK' && result?.geometry?.location) {
              resolve(result.geometry.location);
            } else {
              resolve(null);
            }
          });
        });
      }
      return null;
    };

    try {
      const location = await resolvePlaceCoordinates(place);

      if (location) {
        const lat = location.lat();
        const lng = location.lng();

        console.log("SafeStep: Unified Sync ->", { lat, lng });

        // Seamless Global Context Sync
        setDestinationPosition([lat, lng]);

        if (mapRef.current) {
          mapRef.current.panTo(location);
          mapRef.current.setZoom(16);
        }

        setSearchQuery(place.displayName || '');
        setSearchResults([]);
        setSelectedRoute(null);
        setIsRoutingActive(true);
        setIsRoutePlannerOpen(true); // Automatic Drawer Pop
      }
    } catch (err) {
      console.error("SafeStep: Fatal Resolve Error", err);
    }
  };

  const handleMapClick = async (e: any) => {
    if (!e.detail.latLng) return;

    const lat = e.detail.latLng.lat;
    const lng = e.detail.latLng.lng;

    console.log("SafeStep: Direct Map Pinning at", lat, lng);

    // 1. Unified State Synchronization
    setDestinationPosition([lat, lng]);
    setSelectedRoute(null);
    setIsRoutingActive(true);
    setIsRoutePlannerOpen(true); // Automatic Drawer Pop

    // 2. Geocoded Pinned Coordinates (Lazy Geocoder)
    if (window.google) {
      const geocoder = new google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: e.detail.latLng });
        if (response.results && response.results[0]) {
          const address = response.results[0].formatted_address;
          setSearchQuery(address);
        } else {
          setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch (err) {
        console.error("SafeStep: Reverse Geocode failed", err);
        setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    }
  };

  const handleZoomIn = () => mapRef.current?.setZoom((mapRef.current?.getZoom() || 13) + 1);
  const handleZoomOut = () => mapRef.current?.setZoom((mapRef.current?.getZoom() || 13) - 1);
  const handleReCenter = () => {
    if (userPosition) {
      mapRef.current?.panTo({ lat: userPosition[0], lng: userPosition[1] });
      mapRef.current?.setZoom(16);
    }
  };

  const memoizedOrigin = React.useMemo(() =>
    userPosition ? { lat: userPosition[0], lng: userPosition[1] } : null,
    [userPosition?.[0], userPosition?.[1]]
  );

  const memoizedDestination = React.useMemo(() =>
    destinationPosition ? { lat: destinationPosition[0], lng: destinationPosition[1] } : null,
    [destinationPosition?.[0], destinationPosition?.[1]]
  );

  const handleRouteCalculated = React.useCallback((routes: any[]) => {
    setAvailableRoutes(routes);
  }, []);

  // Sync selected route when availableRoutes or selectedRouteIndex changes
  useEffect(() => {
    if (availableRoutes.length > 0) {
      const routes = availableRoutes;
      let indexToUse = selectedRouteIndex;

      // If we have routes but none selected, find the safest one
      if (!selectedRoute && selectedRouteIndex === 0) {
        let maxScore = -1;
        routes.forEach((r, idx) => {
          if (r.score > maxScore) {
            maxScore = r.score;
            indexToUse = idx;
          }
        });
        if (indexToUse !== selectedRouteIndex) {
          setSelectedRouteIndex(indexToUse);
          return; // Effect will re-run with new index
        }
      }

      const best = routes[indexToUse] || routes[0];
      if (best && best.legs && best.legs[0]) {
        setSelectedRoute({
          id: `route-${indexToUse}`,
          type: best.score > 90 ? 'Safest' : (best.score > 60 ? 'Recommended' : 'Caution'),
          via: 'Safety-Optimized Path',
          time: Math.round(best.legs[0].duration.value / 60),
          score: best.score,
          tags: best.score === 100 ? ['No Risks Detected'] : (best.score > 80 ? ['Low Risk'] : ['Community Hazards Nearby']),
          coordinates: []
        });
      }
    }
  }, [availableRoutes, selectedRouteIndex, setSelectedRoute]);

  return (
    <APIProvider apiKey={API_KEY} solutionChannel="GMP_GCC_aistudio_v1">
      <div className="relative w-full h-screen bg-surface-container overflow-hidden">
        <TopBar />
        
        {/* Route Info Overlay */}
        <AnimatePresence>
          {selectedRoute && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-24 left-0 w-full z-50 px-6"
            >
              <div className="max-w-md mx-auto bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border-b-4 border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative">
                    <ShieldCheck className="w-5 h-5 fill-white" />
                    <div className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {selectedRoute.score}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      {selectedRoute.type} Route Active
                    </div>
                    <div className="font-bold text-sm">
                      {selectedRoute.score === 100
                        ? '100% Risk-Free Path Found'
                        : `Safety Score: ${selectedRoute.score}% • Caution Advised`}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedRoute(null);
                    setDestinationPosition(null);
                    setIsRoutingActive(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Overlay */}
        {!selectedRoute && (
          <div className="fixed top-20 left-0 w-full z-40 px-6">
            <div className="relative max-w-md mx-auto group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-outline" />
              </div>
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Where are you going?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full h-12 pl-12 pr-4 bg-white/95 backdrop-blur-md border-none rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] focus:ring-2 focus:ring-primary focus:bg-white transition-all font-bold text-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setDestinationPosition(null);
                    setSelectedRoute(null);
                    setIsRoutingActive(false);
                  }}
                  className="absolute inset-y-0 right-4 flex items-center"
                >
                  <X className="w-4 h-4 text-outline" />
                </button>
              )}

              {/* Search results dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden z-[100]"
                  >
                    {searchResults.map((place) => (
                      <button 
                        key={place.id}
                        onClick={() => handlePlaceSelect(place)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-surface-container text-left transition-colors border-b border-outline-variant/10 last:border-none"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface line-clamp-1">{place.displayName}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Tap to set as destination</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-0">
          <Map
            defaultCenter={userPosition ? { lat: userPosition[0], lng: userPosition[1] } : { lat: 40.7128, lng: -74.0060 }}
            defaultZoom={13}
            mapId="SAFE_STEP_MAP_v1"
            disableDefaultUI
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
          >
            <MapRefSetter mapRef={mapRef} />
            {userPosition && (
              <AdvancedMarker position={{ lat: userPosition[0], lng: userPosition[1] }}>
                 <div className="relative">
                    <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-30" />
                    <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                    </div>
                 </div>
              </AdvancedMarker>
            )}

            {destinationPosition && (
              <AdvancedMarker position={{ lat: destinationPosition[0], lng: destinationPosition[1] }}>
                <Pin
                  background={'#EA4335'}
                  borderColor={'#B31412'}
                  glyphColor={'#ffffff'}
                  scale={1.2}
                />
              </AdvancedMarker>
            )}

            <CustomPinLayer hazards={hazards} onHazardClick={setSelectedHazard} />

            {userPosition && destinationPosition && isRoutingActive && (
              <PathFinder
                origin={memoizedOrigin}
                destination={memoizedDestination}
                hazards={hazards}
                selectedRouteIndex={selectedRouteIndex}
                setIsCalculating={setIsCalculatingRoute}
                onRoutesCalculated={handleRouteCalculated}
              />
            )}
          </Map>
        </div>

        {/* Floating Controls */}
        <div className="fixed right-6 top-36 z-40 flex flex-col gap-3">
          <button 
            onClick={handleZoomIn}
            className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors active:scale-95"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors active:scale-95"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button 
            onClick={handleReCenter}
            className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-primary hover:bg-surface-container transition-colors active:scale-95"
          >
            <Target className="w-5 h-5" />
          </button>
        </div>

        {/* Hazard Detail Bottom Sheet */}
        <AnimatePresence>
          {selectedHazard && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedHazard(null)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 w-full z-[70] bg-surface rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] border-t border-white/50 px-6 pt-2 pb-12"
              >
                <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto my-4" />
                
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                         selectedHazard.type === 'Safe' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {selectedHazard.type}
                      </div>
                      <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Community Update</span>
                    </div>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight leading-tight">{selectedHazard.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedHazard(null)}
                    className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <p className="text-on-surface-variant text-sm font-medium leading-relaxed mb-8">
                  {selectedHazard.description}
                </p>

                <div className="bg-surface-container-low rounded-3xl p-5 mb-8 flex items-center justify-between border border-outline-variant/10">
                   <div className="flex items-center gap-4">
                     <img 
                        src={selectedHazard.reporterAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&auto=format&fit=crop'} 
                        className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                     />
                     <div>
                       <p className="text-on-surface font-black text-sm">{selectedHazard.reporterName || 'Verified User'}</p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                         <ShieldCheck className="w-3 h-3 text-primary" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-primary">Community Contributor</span>
                       </div>
                     </div>
                   </div>
                   <div className="text-right">
                     <span className="block text-2xl font-black text-primary">{selectedHazard.verificationCount || 0}</span>
                     <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/70">Verifications</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                        verifyHazard(selectedHazard.id, 'valid');
                        setSelectedHazard(null);
                    }}
                    className="h-16 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Verify Valid
                  </button>
                  <button 
                    onClick={() => {
                        verifyHazard(selectedHazard.id, 'invalid');
                        setSelectedHazard(null);
                    }}
                    className="h-16 rounded-2xl bg-surface-container-high text-on-surface font-black text-xs uppercase tracking-[0.2em] border border-outline-variant/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <AlertCircle className="w-5 h-5" />
                    Report Issue
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-4 items-center">
          {!selectedRoute && (
            <motion.button 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => navigate('/report')}
              className="bg-primary text-white p-4 h-14 w-14 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
              title="Report Hazard"
            >
              <AlertCircle className="w-6 h-6" />
            </motion.button>
          )}
          
          <button 
            onClick={() => {
              if (selectedRoute) {
                setSelectedRoute(null);
                setDestinationPosition(null);
                setSearchQuery('');
                setIsRoutingActive(false);
              } else if (destinationPosition) {
                setIsRoutingActive(true);
              } else {
                // Focus search bar if no destination
                searchInputRef.current?.focus();
              }
            }}
            className={`${selectedRoute ? 'bg-rose-600' : 'bg-emerald-600'} text-white p-4 h-16 w-16 rounded-full shadow-2xl hover:scale-105 active:scale-90 transition-all flex items-center justify-center group`}
          >
            {selectedRoute ? (
              <X className="w-7 h-7" />
            ) : (
              <Navigation className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            )}
          </button>
        </div>

        {/* Route Planner Bottom Sheet */}
        <AnimatePresence>
          {isRoutePlannerOpen && destinationPosition && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsRoutePlannerOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 w-full z-[70] bg-surface rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] border-t border-white/50 px-6 pt-2 pb-12"
              >
                <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto my-4" />

                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest block mb-1">SafeStep Route Planner</span>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight leading-tight">
                      {searchQuery || 'Custom Destination'}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsRoutePlannerOpen(false);
                      setIsRoutingActive(false);
                      setSelectedRoute(null);
                      setDestinationPosition(null);
                      setSearchQuery('');
                    }}
                    className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {isCalculatingRoute ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-sm font-black text-on-surface animate-pulse tracking-tight">Analyzing Safety Buffers...</p>
                  </div>
                ) : !isRoutingActive ? (
                  <button
                    onClick={() => setIsRoutingActive(true)}
                    className="w-full h-16 rounded-2xl bg-emerald-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    <Navigation className="w-6 h-6 fill-white" />
                    Calculate Safest Route
                  </button>
                ) : availableRoutes.length > 0 ? (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {availableRoutes.map((route, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedRouteIndex(idx)}
                        className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${
                          selectedRouteIndex === idx
                            ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                            : 'border-outline-variant/10 bg-surface hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                             route.isSafest ? 'bg-emerald-500 text-white' : (route.isFastest ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white')
                          }`}>
                            {route.isSafest ? <ShieldCheck size={24} /> : (route.isFastest ? <Clock size={24} /> : <AlertCircle size={24} />)}
                          </div>
                          <div className="text-left">
                            <p className="font-black text-on-surface text-base">
                              {route.isSafest ? 'Safest Path' : (route.isFastest ? 'Fastest Path' : 'Alternative Path')}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                route.score > 90 ? 'bg-emerald-100 text-emerald-700' : (route.score > 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')
                              }`}>
                                {route.score}% Safe • {route.legs[0].duration.text}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedRouteIndex === idx && (
                          <div className="bg-emerald-500 rounded-full p-1.5 shadow-md">
                            <CheckCircle className="text-white w-4 h-4" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Info className="w-10 h-10 text-outline" />
                    <p className="text-sm font-bold text-on-surface">Calculating Alternative Routes...</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-black">Scanning for walkable surface data</p>
                  </div>
                )}

                <p className="mt-6 text-center text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                  SafeStep Analysis Engine Active
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    </APIProvider>
  );
}

