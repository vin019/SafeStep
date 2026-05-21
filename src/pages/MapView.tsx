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

// --- Components ---

function HazardMarker({ hazard, onClick }: { hazard: Hazard, onClick: () => void, key?: React.Key }) {
  const isHazardous = ['Hazard', 'High-risk', 'Flooded', 'Traffic'].includes(hazard.type);

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
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<google.maps.places.Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);

  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');

  // Initialize Session Token
  useEffect(() => {
    if (placesLib && !sessionToken) {
      setSessionToken(new placesLib.AutocompleteSessionToken());
    }
  }, [placesLib, sessionToken]);

  // Search Logic (Places API v3)
  useEffect(() => {
    if (!placesLib || !searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompletePredictions({
          input: searchQuery,
          sessionToken: sessionToken || undefined,
          locationBias: mapRef.current?.getCenter() || undefined
        });

        const results = await Promise.all(suggestions.map(async (s) => s.place));
        setSearchResults(results);
      } catch (err) {
        console.error("Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, placesLib, sessionToken]);

  const handlePlaceSelect = async (place: google.maps.places.Place) => {
    try {
      if (!place.location) await place.fetchFields({ fields: ['location', 'viewport', 'displayName'] });

      if (place.location) {
        setDestinationPosition([place.location.lat(), place.location.lng()]);
        mapRef.current?.panTo(place.location);
        mapRef.current?.setZoom(16);
        setSearchQuery(place.displayName || '');
        setSearchResults([]);
        setIsCalculatingRoute(true);
        setIsRoutingActive(true);
        setIsRoutePlannerOpen(true);
      }
    } catch (err) {
      console.error("Fatal Resolve Error", err);
    }
  };

  const handleMapClick = async (e: any) => {
    if (!e.detail.latLng) return;
    const { lat, lng } = e.detail.latLng;
    setDestinationPosition([lat, lng]);
    setIsCalculatingRoute(true);
    setIsRoutingActive(true);
    setIsRoutePlannerOpen(true);

    if (geocodingLib) {
      const geocoder = new geocodingLib.Geocoder();
      try {
        const response = await geocoder.geocode({ location: e.detail.latLng });
        setSearchQuery(response.results[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch (err) {
        setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } else {
       setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleRouteCalculated = React.useCallback((routes: any[]) => {
    setAvailableRoutes(routes);
    if (routes.length > 0) {
      let maxScore = -1, safestIdx = 0;
      routes.forEach((r, idx) => { if (r.score > maxScore) { maxScore = r.score; safestIdx = idx; } });
      setSelectedRouteIndex(safestIdx);
    }
  }, []);

  useEffect(() => {
    const active = availableRoutes[selectedRouteIndex];
    if (active && active.legs && active.legs[0]) {
      setSelectedRoute({
        id: `route-${selectedRouteIndex}`,
        type: active.isSafest ? 'Safest' : (active.isFastest ? 'Fastest' : 'Alternative'),
        via: 'Analyzed Road Network',
        time: Math.round(active.legs[0].duration.value / 60),
        score: active.score,
        tags: active.score === 100 ? ['Verified Safe'] : ['Caution Advised'],
        coordinates: []
      });
    }
  }, [availableRoutes, selectedRouteIndex, setSelectedRoute]);

  const memoizedOrigin = React.useMemo(() => userPosition ? { lat: userPosition[0], lng: userPosition[1] } : null, [userPosition?.[0], userPosition?.[1]]);
  const memoizedDestination = React.useMemo(() => destinationPosition ? { lat: destinationPosition[0], lng: destinationPosition[1] } : null, [destinationPosition?.[0], destinationPosition?.[1]]);

  return (
    <APIProvider apiKey={API_KEY} solutionChannel="GMP_GCC_aistudio_v1">
      <div className="relative w-full h-screen bg-surface-container overflow-hidden font-sans">
        <TopBar />
        
        {/* Route Info Dashboard */}
        <AnimatePresence>
          {selectedRoute && (
            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-24 left-0 w-full z-50 px-6">
              <div className="max-w-md mx-auto bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border-b-4 border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative">
                    <ShieldCheck className="w-5 h-5 fill-white" />
                    <div className="absolute -top-1 -right-1 bg-white text-emerald-600 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {selectedRoute.score}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">{selectedRoute.type} Route Active</div>
                    <div className="font-bold text-sm">Safety Score: {selectedRoute.score}% • {selectedRoute.time} mins</div>
                  </div>
                </div>
                <button onClick={() => {
                  setIsRoutingActive(false);
                  setSelectedRoute(null);
                  setDestinationPosition(null);
                  setIsCalculatingRoute(false);
                }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Overlay */}
        {!selectedRoute && (
          <div className="fixed top-20 left-0 w-full z-40 px-6">
            <div className="relative max-w-md mx-auto group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="w-5 h-5 text-outline" /></div>
              <input ref={searchInputRef} type="text" placeholder="Where are you going?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full h-12 pl-12 pr-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl focus:ring-2 focus:ring-primary transition-all font-bold text-sm" />
              {searchQuery && <button onClick={() => { setSearchQuery(''); setDestinationPosition(null); setSelectedRoute(null); setIsRoutingActive(false); }} className="absolute inset-y-0 right-4 flex items-center"><X className="w-4 h-4 text-outline" /></button>}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden z-[100]">
                    {searchResults.map((place) => (
                      <button key={place.id} onClick={() => handlePlaceSelect(place)} className="w-full p-4 flex items-center gap-3 hover:bg-surface-container text-left transition-colors border-b border-outline-variant/10 last:border-none">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><MapPin size={16} /></div>
                        <div>
                          <p className="text-sm font-bold text-on-surface line-clamp-1">{place.displayName}</p>
                          <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Tap to set destination</p>
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
          <Map defaultCenter={userPosition ? { lat: userPosition[0], lng: userPosition[1] } : { lat: 40.7128, lng: -74.0060 }} defaultZoom={13} mapId="SAFE_STEP_MAP_v1" disableDefaultUI style={{ width: '100%', height: '100%' }} onClick={handleMapClick}>
            <MapRefSetter mapRef={mapRef} />
            {userPosition && (
              <AdvancedMarker position={{ lat: userPosition[0], lng: userPosition[1] }}>
                 <div className="relative">
                    <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-30" />
                    <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary"><div className="w-3 h-3 bg-primary rounded-full" /></div>
                 </div>
              </AdvancedMarker>
            )}
            {destinationPosition && (
              <AdvancedMarker position={{ lat: destinationPosition[0], lng: destinationPosition[1] }}>
                <Pin background={'#EA4335'} borderColor={'#B31412'} glyphColor={'#ffffff'} scale={1.2} />
              </AdvancedMarker>
            )}
            <CustomPinLayer hazards={hazards} onHazardClick={setSelectedHazard} />
            {userPosition && destinationPosition && (
              <PathFinder
                origin={memoizedOrigin}
                destination={memoizedDestination}
                hazards={hazards}
                selectedRouteIndex={selectedRouteIndex}
                setIsCalculating={setIsCalculatingRoute}
                onRoutesCalculated={handleRouteCalculated}
                isActive={isRoutingActive}
              />
            )}
          </Map>
        </div>

        {/* Floating Controls */}
        <div className="fixed right-6 top-36 z-40 flex flex-col gap-3">
          <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 13) + 1)} className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-on-surface transition-colors active:scale-95"><ZoomIn className="w-5 h-5" /></button>
          <button onClick={() => mapRef.current?.setZoom((mapRef.current?.getZoom() || 13) - 1)} className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-on-surface transition-colors active:scale-95"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={() => userPosition && mapRef.current?.panTo({ lat: userPosition[0], lng: userPosition[1] })} className="w-12 h-12 bg-white/95 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-primary transition-colors active:scale-95"><Target className="w-5 h-5" /></button>
        </div>

        {/* Route Planner Bottom Sheet */}
        <AnimatePresence>
          {isRoutePlannerOpen && destinationPosition && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRoutePlannerOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]" />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 w-full z-[70] bg-white rounded-t-[2.5rem] shadow-2xl border-t border-gray-100 px-6 pt-2 pb-12">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-1">SafeStep Route Planner</span>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight line-clamp-1">{searchQuery || 'Custom Destination'}</h3>
                  </div>
                  <button onClick={() => {
                    setIsRoutePlannerOpen(false);
                    setIsRoutingActive(false);
                    setSelectedRoute(null);
                    setDestinationPosition(null);
                    setIsCalculatingRoute(false);
                    setAvailableRoutes([]);
                  }} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"><X className="w-6 h-6" /></button>
                </div>

                {isCalculatingRoute ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-sm font-black text-gray-900 animate-pulse tracking-tight">Scanning Safe Paths...</p>
                  </div>
                ) : availableRoutes.length > 0 ? (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {availableRoutes.map((route, idx) => (
                      <button key={idx} onClick={() => setSelectedRouteIndex(idx)} className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between ${selectedRouteIndex === idx ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${route.isSafest ? 'bg-emerald-500 text-white' : (route.isFastest ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white')}`}>
                            {route.isSafest ? <ShieldCheck size={24} /> : (route.isFastest ? <Clock size={24} /> : <AlertCircle size={24} />)}
                          </div>
                          <div className="text-left">
                            <p className="font-black text-gray-900 text-base">{route.isSafest ? 'Safest Path' : (route.isFastest ? 'Fastest Path' : 'Alternative Path')}</p>
                            <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] font-black uppercase tracking-widest">{route.score}% Safe • {Math.round(route.legs[0].duration.value / 60)} mins</span></div>
                          </div>
                        </div>
                        {selectedRouteIndex === idx && <div className="bg-emerald-500 rounded-full p-1.5 shadow-md"><CheckCircle className="text-white w-4 h-4" /></div>}
                      </button>
                    ))}
                  </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                    <Info className="w-10 h-10 text-gray-400" />
                    <p className="text-sm font-bold text-gray-900">Calculating Alternative Routes...</p>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>
    </APIProvider>
  );
}
