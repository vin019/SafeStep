import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Navigation,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Zap,
  ChevronRight,
  Maximize2,
  Minimize2,
  Crosshair,
  User
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import PathFinder, { ProcessedRoute } from '../components/PathFinder';
import { TopBar, BottomNav } from '../components/Navigation';
import { Hazard } from '../types';

// --- STYLES INJECTION ---
const usePingAnimation = () => {
  useEffect(() => {
    if (!document.getElementById('ss-styles')) {
      const s = document.createElement('style');
      s.id = 'ss-styles';
      s.innerHTML = `@keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }`;
      document.head.appendChild(s);
    }
  }, []);
};

// --- INLINE STYLE ICONS ---
const createUserIcon = () => new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;inset:0;background:#3B82F6;border-radius:9999px;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.3;"></div>
    <div style="width:24px;height:24px;background:white;border-radius:9999px;box-shadow:0 2px 8px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;border:2.5px solid #3B82F6;position:relative;">
      <div style="width:10px;height:10px;background:#3B82F6;border-radius:9999px;"></div>
    </div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createDestIcon = () => new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="width:12px;height:12px;background:#E11D48;border-radius:9999px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);z-index:2;"></div>
    <div style="position:absolute;bottom:0;width:2px;height:16px;background:#E11D48;transform:translateY(4px);"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const createHazardIcon = (type: string) => {
  let color = '#3B82F6'; // Default (Blue)
  if (type === 'Safe') color = '#10B981'; // Emerald
  if (type === 'Hazard') color = '#F59E0B'; // Amber
  if (type === 'Flooded') color = '#3B82F6'; // Blue
  if (type === 'High-risk' || type === 'Traffic') color = '#E11D48'; // Rose

  return new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:white;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;border:2.5px solid ${color};">
      <div style="width:12px;height:12px;background:${color};border-radius:2px;transform:rotate(45deg);"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

// --- MAP SUB-COMPONENTS ---
function MapEvents({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// --- MAIN COMPONENT ---
export default function MapView() {
  usePingAnimation();
  const { userPosition, hazards } = useAppContext();
  const mapRef = useRef<L.Map | null>(null);

  // Core Routing State
  const [destinationPosition, setDestinationPosition] = useState<[number, number] | null>(null);
  const [isRoutingActive, setIsRoutingActive] = useState(false);
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<ProcessedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [lastStatus, setLastStatus] = useState('idle');

  // Search/UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Memoized Coords for PathFinder
  const memoizedOrigin = useMemo(() =>
    userPosition ? { lat: Number(userPosition[0]), lng: Number(userPosition[1]) } : null,
    [userPosition?.[0], userPosition?.[1]]
  );

  const memoizedDestination = useMemo(() =>
    destinationPosition ? { lat: Number(destinationPosition[0]), lng: Number(destinationPosition[1]) } : null,
    [destinationPosition?.[0], destinationPosition?.[1]]
  );

  // --- HANDLERS ---
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const lat = typeof e.latlng.lat === 'function' ? e.latlng.lat() : Number(e.latlng.lat);
    const lng = typeof e.latlng.lng === 'function' ? e.latlng.lng() : Number(e.latlng.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    setIsCalculatingRoute(true);
    setIsRoutingActive(true);
    setIsRoutePlannerOpen(true);
    setDestinationPosition([lat, lng]);
    setSearchQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  };

  const handlePlaceSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    setIsCalculatingRoute(true);
    setIsRoutingActive(true);
    setIsRoutePlannerOpen(true);
    setDestinationPosition([lat, lon]);
    setSearchQuery(place.display_name);
    setSearchResults([]);
  };

  const handleRouteCalculated = (routes: ProcessedRoute[]) => {
    setAvailableRoutes(routes);
    setSelectedRouteIndex(0);
    setIsCalculatingRoute(false);
  };

  const handleCloseDrawer = () => {
    setIsRoutePlannerOpen(false);
  };

  const handleReset = () => {
    setIsRoutingActive(false);
    setIsRoutePlannerOpen(false);
    setAvailableRoutes([]);
    setIsCalculatingRoute(false);
    setDestinationPosition(null);
    setSearchQuery('');
    setSelectedRouteIndex(0);
    setLastStatus('idle');
  };

  // Helper for search debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || isRoutingActive) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isRoutingActive]);

  const selectedRoute = availableRoutes[selectedRouteIndex] || null;

  return (
    <div className="relative h-screen w-full bg-slate-50 overflow-hidden flex flex-col font-sans">
      <TopBar title="SafeStep Map" />

      {/* --- SEARCH BAR --- */}
      <div className="absolute top-20 left-4 right-4 z-[1001] flex flex-col gap-2">
        <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100 p-1">
          <div className="p-3 text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            className="flex-1 py-3 text-slate-700 placeholder-slate-400 outline-none text-base"
            placeholder="Where are you going?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={handleReset} className="p-3 text-slate-400 hover:text-rose-500">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Autocomplete Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => handlePlaceSelect(res)}
                  className="w-full flex items-center gap-3 p-4 text-left border-b border-slate-50 last:border-0 active:bg-slate-50"
                >
                  <MapPin size={18} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600 truncate">{res.display_name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- ROUTE INFO DASHBOARD BANNER --- */}
      <AnimatePresence>
        {selectedRoute && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-4 right-4 z-[1002] bg-emerald-600 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Navigation size={24} />
              </div>
              <div>
                <div className="text-xs opacity-80 uppercase font-bold tracking-wider">Navigating Path</div>
                <div className="text-lg font-bold flex items-center gap-2">
                  {(selectedRoute.distance / 1000).toFixed(1)} km
                  <span className="opacity-40">•</span>
                  {Math.round(selectedRoute.duration / 60)} min
                </div>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAP CONTAINER --- */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={userPosition || [11.10, 125.00]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEvents onMapClick={handleMapClick} />
          <MapController center={userPosition} />

          {/* User Marker */}
          {userPosition && (
            <Marker position={userPosition} icon={createUserIcon()} />
          )}

          {/* Destination Marker */}
          {destinationPosition && (
            <Marker position={destinationPosition} icon={createDestIcon()} />
          )}

          {/* Hazard Markers */}
          {hazards.map((h) => (
            <Marker
              key={h.id}
              position={[h.coords.lat, h.coords.lng]}
              icon={createHazardIcon(h.type)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  setSelectedHazard(h);
                }
              }}
            />
          ))}

          {/* Route Polylines */}
          {availableRoutes.map((route, i) => {
            const positions = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
            const isSelected = i === selectedRouteIndex;

            return (
              <Polyline
                key={i}
                positions={positions as any}
                pathOptions={{
                  color: isSelected ? '#10B981' : '#64748b',
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 1 : 0.4,
                  lineJoin: 'round'
                }}
                eventHandlers={{
                  click: () => setSelectedRouteIndex(i)
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* --- FLOATING CONTROLS --- */}
      <div className="absolute bottom-32 right-4 flex flex-col gap-3 z-[1001]">
        {isRoutingActive && (
          <button
            onClick={handleReset}
            className="bg-rose-500 text-white p-4 rounded-full shadow-2xl active:scale-95 transition-transform"
          >
            <X size={24} />
          </button>
        )}
        <button
          onClick={() => {
            if (userPosition) mapRef.current?.setView(userPosition, 15);
          }}
          className="bg-white text-slate-600 p-4 rounded-full shadow-xl border border-slate-100 active:scale-95 transition-transform"
        >
          <Crosshair size={24} />
        </button>
        <div className="flex flex-col bg-white rounded-full shadow-xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-4 text-slate-600 border-b border-slate-50 active:bg-slate-50"
          >
            <Maximize2 size={20} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-4 text-slate-600 active:bg-slate-50"
          >
            <Minimize2 size={20} />
          </button>
        </div>
      </div>

      {/* --- BOTTOM DRAWER --- */}
      <AnimatePresence>
        {isRoutePlannerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-black/30 z-[1004]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[1005] px-6 pb-28 pt-4"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Route Suggestions</h3>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 bg-slate-50 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[50vh]">
                {isCalculatingRoute ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Analyzing Safety Buffers...</p>
                  </div>
                ) : availableRoutes.length > 0 ? (
                  availableRoutes.map((route, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedRouteIndex(i)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                        selectedRouteIndex === i
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-100 bg-white active:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-2">
                          {route.isSafest && (
                            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              <ShieldCheck size={12} /> Safest
                            </span>
                          )}
                          {route.isFastest && (
                            <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              <Zap size={12} /> Fastest
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <div className="text-2xl font-black text-slate-800 leading-tight">
                            {Math.round(route.duration / 60)} <span className="text-sm font-medium text-slate-500">mins</span>
                          </div>
                          <div className="text-sm text-slate-400 font-medium">
                            {(route.distance / 1000).toFixed(1)} km away
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
                          route.score > 80 ? 'bg-emerald-100 text-emerald-700' :
                          route.score > 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          Score: {route.score}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Info size={32} />
                    </div>
                    <p className="text-slate-500 font-medium max-w-[200px]">No routes found. Try a different destination.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- HAZARD INFO SHEET --- */}
      <AnimatePresence>
        {selectedHazard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHazard(null)}
              className="absolute inset-0 bg-black/40 z-[1002]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl z-[1003] p-8 pb-32"
            >
              <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />

              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedHazard.type === 'Safe' ? 'bg-emerald-500' :
                      selectedHazard.type === 'Hazard' ? 'bg-amber-500' :
                      selectedHazard.type === 'Flooded' ? 'bg-blue-500' :
                      'bg-rose-500'
                    }`} />
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      {selectedHazard.type || 'Unknown'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">
                    {selectedHazard.title || 'Reported Incident'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedHazard(null)}
                  className="p-3 bg-slate-50 rounded-2xl text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-3xl p-6 mb-8">
                <p className="text-slate-600 leading-relaxed italic">
                  "{selectedHazard.description || 'No additional details provided by the reporter.'}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="text-emerald-500 bg-emerald-50 p-2 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Verified By</div>
                    <div className="text-sm font-bold text-slate-700">
                      {selectedHazard.verificationCount || 0} users
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
                  <div className="text-slate-400 bg-slate-50 p-2 rounded-xl">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Reported By</div>
                    <div className="text-sm font-bold text-slate-700 truncate max-w-[80px]">
                      {selectedHazard.reporterName || 'Anonymous'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedHazard.createdAt && (
                <div className="mt-8 flex items-center gap-2 text-slate-300">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Reported on {new Date(selectedHazard.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PathFinder lives outside MapContainer sibling */}
      <PathFinder
        origin={memoizedOrigin}
        destination={memoizedDestination}
        hazards={hazards}
        setIsCalculating={setIsCalculatingRoute}
        onRoutesCalculated={handleRouteCalculated}
        onStatusUpdate={setLastStatus}
        isActive={isRoutingActive}
      />

      <BottomNav />
    </div>
  );
}
