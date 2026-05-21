import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldCheck,
  AlertCircle,
  Droplets,
  Zap,
  X,
  MapPin,
  Send,
  ShieldAlert,
  Navigation,
  Info,
  Search,
  Crosshair,
  ChevronLeft
} from 'lucide-react';
import { useApp } from '../AppContext.tsx';
import { TopBar, BottomNav } from '../components/Navigation.tsx';

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

const createHazardIcon = (type: string) => {
  let color = '#3B82F6'; // Default (Blue)
  if (type === 'Safe') color = '#10B981'; // Emerald
  if (type === 'Hazard') color = '#F59E0B'; // Amber
  if (type === 'Flooded') color = '#3B82F6'; // Blue
  if (type === 'High-risk' || type === 'Traffic') color = '#E11D48'; // Rose

  return new L.DivIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:white;border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;border:3px solid ${color};">
      <div style="width:14px;height:14px;background:${color};border-radius:3px;transform:rotate(45deg);"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
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
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function Report() {
  usePingAnimation();
  const navigate = useNavigate();
  const { addHazard, userPosition } = useApp();
  const mapRef = useRef<L.Map | null>(null);

  const [step, setStep] = useState<'details' | 'location'>('details');
  const [selectedCategory, setSelectedCategory] = useState<'Safe' | 'Hazard' | 'Flooded' | 'High-risk' | 'Traffic'>('Hazard');
  const [description, setDescription] = useState('');
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(null);

  // Search state for map
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (userPosition && !pickedPosition) {
      setPickedPosition(userPosition);
    }
  }, [userPosition]);

  const handleSave = async () => {
    if (!pickedPosition) return;

    await addHazard({
      type: selectedCategory,
      title: selectedCategory === 'Safe' ? 'Verified Safe' : 
             selectedCategory === 'Traffic' ? 'Heavy Traffic' : 
             selectedCategory === 'Flooded' ? 'Flooding Reported' :
             selectedCategory === 'High-risk' ? 'High Risk Area' : 'Caution Advised',
      description: description || 'No additional details provided.',
      coords: { 
        lat: pickedPosition[0], 
        lng: pickedPosition[1] 
      }
    });
    navigate('/map');
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const lat = typeof e.latlng.lat === 'function' ? e.latlng.lat() : Number(e.latlng.lat);
    const lng = typeof e.latlng.lng === 'function' ? e.latlng.lng() : Number(e.latlng.lng);
    if (isNaN(lat) || isNaN(lng)) return;
    setPickedPosition([lat, lng]);
  };

  const handlePlaceSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setPickedPosition([lat, lon]);
    setSearchResults([]);
    setSearchQuery(place.display_name);
    if (mapRef.current) mapRef.current.setView([lat, lon], 16);
  };

  // Search debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || step === 'details') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const categories = [
    { id: 'Safe', icon: ShieldCheck, label: 'Safe Zone', sub: 'Verified Path', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
    { id: 'Hazard', icon: AlertCircle, label: 'Hazard', sub: 'Obstacles', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
    { id: 'Traffic', icon: ShieldAlert, label: 'Traffic', sub: 'Heavy Flow', color: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
    { id: 'Flooded', icon: Droplets, label: 'Flooding', sub: 'Water accumulation', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
    { id: 'High-risk', icon: Zap, label: 'High Risk', sub: 'Danger', color: 'bg-rose-50 text-rose-600', dot: 'bg-rose-500' },
  ] as const;

  return (
    <div className="bg-slate-50 font-sans text-slate-800 min-h-screen flex flex-col overflow-hidden">
      <TopBar title={step === 'details' ? "Report Issue" : "Confirm Location"} showBack={step === 'location'} />

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div
              key="details"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col p-6 overflow-y-auto pb-32"
            >
              <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 mb-6">
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Report Hazard</h2>
                <p className="text-slate-500 font-medium mb-8">What kind of safety update are you sharing?</p>

                <div className="grid grid-cols-2 gap-3 mb-10">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`
                        flex flex-col items-start p-4 rounded-3xl transition-all border-2 text-left relative overflow-hidden group
                        ${selectedCategory === cat.id
                          ? 'border-slate-800 bg-slate-800 text-white shadow-lg'
                          : 'border-slate-100 bg-white hover:border-slate-200'}
                      `}
                    >
                      <cat.icon className={`w-6 h-6 mb-3 ${selectedCategory === cat.id ? 'text-white' : 'text-slate-400'}`} />
                      <div>
                        <span className="font-bold text-sm block leading-tight">{cat.label}</span>
                        <span className={`text-[10px] uppercase font-bold mt-1 tracking-wider block ${selectedCategory === cat.id ? 'opacity-60' : 'text-slate-400'}`}>
                          {cat.sub}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 block ml-2">Context (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-200 rounded-3xl p-6 text-slate-700 placeholder:text-slate-300 font-sans focus:ring-4 focus:ring-slate-100 transition-all resize-none font-bold min-h-[140px]"
                    placeholder="Provide details about the hazard..."
                  />
                  <div className="text-right text-[10px] font-bold text-slate-300 uppercase tracking-widest mr-2">{description.length}/240</div>
                </div>
              </div>

              <button
                onClick={() => setStep('location')}
                className="w-full h-16 rounded-3xl bg-slate-900 text-white font-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                <span className="tracking-widest uppercase text-xs">Confirm Location</span>
                <Navigation size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="location"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col"
            >
              {/* --- MAP FOR PINNING --- */}
              <div className="absolute inset-0 z-0">
                <MapContainer
                  center={pickedPosition || userPosition || [11.10, 125.00]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapEvents onMapClick={handleMapClick} />

                  {/* User Marker */}
                  {userPosition && (
                    <Marker position={userPosition} icon={createUserIcon()} />
                  )}

                  {/* Picked Position Marker (The Hazard Pin) */}
                  {pickedPosition && (
                    <Marker position={pickedPosition} icon={createHazardIcon(selectedCategory)} />
                  )}
                </MapContainer>
              </div>

              {/* --- SEARCH OVERLAY (Similar to MapView) --- */}
              <div className="absolute top-4 left-4 right-4 z-[1001] flex flex-col gap-2">
                <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100 p-1">
                  <button
                    onClick={() => setStep('details')}
                    className="p-3 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <input
                    type="text"
                    className="flex-1 py-3 text-slate-700 placeholder-slate-400 outline-none text-base font-medium"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-3 text-slate-400">
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
                          <span className="text-sm text-slate-600 truncate font-medium">{res.display_name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* --- MAP CONTROLS --- */}
              <div className="absolute bottom-64 right-4 flex flex-col gap-3 z-[1001]">
                <button
                  onClick={() => {
                    if (userPosition) {
                      setPickedPosition(userPosition);
                      mapRef.current?.setView(userPosition, 16);
                    }
                  }}
                  className="bg-white text-slate-600 p-4 rounded-full shadow-xl border border-slate-100 active:scale-95 transition-transform"
                >
                  <Crosshair size={24} />
                </button>
              </div>

              {/* --- CONFIRM CARD (Drawer-like) --- */}
              <div className="absolute bottom-0 left-0 right-0 z-[1002] p-6 pb-28">
                <div className="bg-white rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] p-8 border border-slate-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                      categories.find(c => c.id === selectedCategory)?.dot || 'bg-slate-800'
                    }`}>
                      {React.createElement(categories.find(c => c.id === selectedCategory)?.icon || AlertCircle, { size: 24 })}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pinning Point</p>
                      <p className="font-bold text-slate-800 truncate">
                        {pickedPosition ? `${pickedPosition[0].toFixed(6)}, ${pickedPosition[1].toFixed(6)}` : 'Picking location...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('details')}
                      className="flex-1 h-16 rounded-2xl bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-xs active:scale-95 transition-all"
                    >
                      Back
                    </button>
                    <button
                      disabled={!pickedPosition}
                      onClick={handleSave}
                      className="flex-[2] h-16 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <span className="tracking-widest uppercase text-xs">Publish Report</span>
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
