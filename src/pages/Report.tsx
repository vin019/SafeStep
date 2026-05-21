import React, { useState, useEffect, useRef } from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { ShieldCheck, AlertCircle, Droplets, Zap, X, MapPin, Send, ShieldAlert, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.tsx';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || 'AIzaSyASF0ZMWEyIFVq1PD6uHrUYnayafokYS4c';

function MapEventsListener({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onMapClick]);
  return null;
}

export default function Report() {
  const navigate = useNavigate();
  const { addHazard, userPosition } = useApp();
  const [step, setStep] = useState<'details' | 'location'>('details');
  const [selectedCategory, setSelectedCategory] = useState<'Safe' | 'Hazard' | 'Flooded' | 'High-risk' | 'Traffic'>('Hazard');
  const [description, setDescription] = useState('');
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (userPosition && !pickedPosition) {
      setPickedPosition(userPosition);
    }
  }, [userPosition, pickedPosition]);

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

  const categories = [
    { id: 'Safe', icon: ShieldCheck, label: 'Safe Zone', sub: 'Verified Path', color: 'bg-tertiary-container text-tertiary' },
    { id: 'Hazard', icon: AlertCircle, label: 'Physical Hazard', sub: 'Obstacles or Damage', color: 'bg-secondary-container text-white' },
    { id: 'Traffic', icon: ShieldAlert, label: 'Traffic Safety', sub: 'Dangerous Crossing', color: 'bg-error/10 text-error' },
    { id: 'Flooded', icon: Droplets, label: 'Flooding', sub: 'Water accumulation', color: 'bg-surface-container-low text-primary' },
    { id: 'High-risk', icon: Zap, label: 'Major Incident', sub: 'Immediate Danger', color: 'bg-surface-container-low text-error' },
  ] as const;

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="bg-surface font-sans text-on-surface min-h-screen">
        <TopBar />
        
        {/* Background Overlay */}
        <div className="fixed inset-0 z-10 bg-on-surface/30 backdrop-blur-md" />

        <div className="fixed inset-0 z-20 flex items-center justify-center">
            {step === 'details' ? (
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] mx-4"
                >
                    <div className="p-8 pb-4 flex justify-between items-start border-b border-outline-variant/10">
                        <div>
                            <h2 className="font-display font-black text-3xl tracking-tight text-on-surface">Report Hazard</h2>
                            <p className="text-on-surface-variant font-medium mt-1">What kind of safety update are you sharing?</p>
                        </div>
                        <button 
                            onClick={() => navigate('/map')}
                            className="p-3 hover:bg-surface-container-high rounded-full transition-all active:scale-90"
                        >
                            <X className="w-6 h-6 text-outline" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pt-6 space-y-8 scrollbar-hide">
                        <section>
                            <label className="font-display font-black text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-4 block">1. Select Information Type</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`
                                            flex flex-col items-start p-4 rounded-3xl transition-all border-2 text-left relative overflow-hidden group
                                            ${selectedCategory === cat.id 
                                                ? 'border-primary ring-4 ring-primary/10 shadow-lg ' + cat.color
                                                : 'border-outline-variant/20 bg-surface hover:border-primary/40'}
                                        `}
                                    >
                                        <cat.icon className={`w-7 h-7 mb-3 ${selectedCategory === cat.id ? 'fill-current opacity-90' : 'text-on-surface-variant'}`} />
                                        <div className="relative z-10">
                                            <span className="font-black text-sm block leading-tight">{cat.label}</span>
                                            <span className="text-[10px] uppercase font-black mt-1 opacity-60 tracking-wider block">{cat.sub}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="pb-8">
                            <label className="font-display font-black text-[11px] uppercase tracking-[0.25em] text-on-surface-variant mb-4 block">2. Add Context (Optional)</label>
                            <div className="relative group">
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                                    className="w-full bg-surface-container-low border-2 border-transparent group-focus-within:border-primary/20 rounded-3xl p-6 text-on-surface placeholder:text-outline font-sans focus:ring-4 focus:ring-primary/10 transition-all resize-none font-bold min-h-[140px] shadow-inner"
                                    placeholder="What should others know? e.g. 'Slippery patch near main entrance'..."
                                />
                                <div className="absolute bottom-4 right-6 text-[10px] font-black text-outline uppercase tracking-[0.2em] bg-white px-2 py-1 rounded-md">{description.length}/240</div>
                            </div>
                        </section>
                    </div>

                    <div className="px-8 pt-4 pb-12 bg-surface-container-lowest border-t border-outline-variant/10">
                        <button 
                            onClick={() => setStep('location')}
                            className="w-full h-14 rounded-3xl bg-primary text-white font-display font-black flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="tracking-widest uppercase text-[11px]">Next: Choose Location</span>
                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-30 bg-surface flex flex-col"
                >
                    <div className="absolute inset-0">
                        {pickedPosition && (
                            <Map
                                defaultCenter={{ lat: pickedPosition[0], lng: pickedPosition[1] }}
                                defaultZoom={17}
                                reuseMaps
                                mapId="SAFE_STEP_REPORT_v1"
                                disableDefaultUI
                                style={{ height: '100%', width: '100%' }}
                            >
                                <AdvancedMarker position={{ lat: pickedPosition[0], lng: pickedPosition[1] }}>
                                    <div className="p-3 bg-rose-600 rounded-full shadow-2xl border-2 border-white animate-bounce">
                                        <AlertCircle className="text-white w-6 h-6" />
                                    </div>
                                </AdvancedMarker>
                                <MapEventsListener onMapClick={(lat, lng) => setPickedPosition([lat, lng])} />
                            </Map>
                        )}
                    </div>

                    {/* Navigation Overlays */}
                    <div className="absolute top-12 left-8 right-8 z-[1000] flex justify-between items-start">
                         <button 
                            onClick={() => setStep('details')}
                            className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-outline-variant/20 flex items-center gap-3 active:scale-95 transition-all text-on-surface font-black uppercase text-[11px] tracking-widest"
                         >
                            <X className="w-5 h-5 text-error" /> Back to Labels
                         </button>
                         
                         <div className="bg-primary text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3 border-2 border-white/20">
                            <MapPin className="w-5 h-5 animate-bounce" />
                            <div className="text-left">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">Action Required</p>
                                <p className="text-xs font-black">Tap map to confirm pin</p>
                            </div>
                         </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="absolute bottom-24 left-8 right-8 z-[1000] flex flex-col gap-4">
                        <div className="bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl border border-outline-variant/20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${categories.find(c => c.id === selectedCategory)?.color}`}>
                                    {React.createElement(categories.find(c => c.id === selectedCategory)?.icon || AlertCircle, { size: 20 })}
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Reporting As</p>
                                    <p className="font-black text-on-surface text-sm">{categories.find(c => c.id === selectedCategory)?.label}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Pin Coordinates</p>
                                <p className="font-sans font-bold text-[11px] text-on-surface tabular-nums">
                                    {pickedPosition ? `${pickedPosition[0].toFixed(5)}, ${pickedPosition[1].toFixed(5)}` : 'Picking...'}
                                </p>
                            </div>
                        </div>
 
                        <button 
                            disabled={!pickedPosition}
                            onClick={handleSave}
                            className="w-full h-16 rounded-[2.5rem] bg-primary text-white font-display font-black flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all group disabled:opacity-50 disabled:grayscale relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="tracking-widest uppercase text-[13px]">Confirm & Publish Report</span>
                            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            )}
        </div>

        <BottomNav />
      </div>
    </APIProvider>
  );
}
