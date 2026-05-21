import React, { useState, useEffect } from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { ShieldCheck, AlertCircle, Droplets, Zap, X, MapPin, Send, ShieldAlert, Navigation, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.tsx';

export default function Report() {
  const navigate = useNavigate();
  const { addHazard, userPosition } = useApp();
  const [step, setStep] = useState<'details' | 'location'>('details');
  const [selectedCategory, setSelectedCategory] = useState<'Safe' | 'Hazard' | 'Flooded' | 'High-risk' | 'Traffic'>('Hazard');
  const [description, setDescription] = useState('');
  const [pickedPosition, setPickedPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (userPosition) {
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

  const categories = [
    { id: 'Safe', icon: ShieldCheck, label: 'Safe Zone', sub: 'Verified Path', color: 'bg-tertiary-container text-tertiary' },
    { id: 'Hazard', icon: AlertCircle, label: 'Physical Hazard', sub: 'Obstacles or Damage', color: 'bg-secondary-container text-white' },
    { id: 'Traffic', icon: ShieldAlert, label: 'Traffic Safety', sub: 'Dangerous Crossing', color: 'bg-error/10 text-error' },
    { id: 'Flooded', icon: Droplets, label: 'Flooding', sub: 'Water accumulation', color: 'bg-surface-container-low text-primary' },
    { id: 'High-risk', icon: Zap, label: 'Major Incident', sub: 'Immediate Danger', color: 'bg-surface-container-low text-error' },
  ] as const;

  return (
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
                          <span className="tracking-widest uppercase text-[11px]">Next: Confirm Location</span>
                          <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </button>
                  </div>
              </motion.div>
          ) : (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-30 bg-surface flex flex-col items-center justify-center p-6"
              >
                  <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col gap-8 border border-outline-variant/10">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <Navigation className="w-10 h-10 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-display font-black text-2xl tracking-tight text-on-surface">Confirm Location</h3>
                            <p className="text-on-surface-variant font-medium mt-1">Using your current GPS coordinates</p>
                        </div>
                    </div>

                    <div className="bg-surface-container-low rounded-3xl p-6 border-2 border-outline-variant/10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <MapPin size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Report Position</p>
                                <p className="font-sans font-bold text-sm text-on-surface tabular-nums">
                                    {pickedPosition ? `${pickedPosition[0].toFixed(6)}, ${pickedPosition[1].toFixed(6)}` : 'Detecting GPS...'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-primary/80 leading-relaxed uppercase tracking-wider">
                                GPS coordinates are captured automatically for maximum accuracy.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button 
                            disabled={!pickedPosition}
                            onClick={handleSave}
                            className="w-full h-16 rounded-2xl bg-primary text-white font-display font-black flex items-center justify-center gap-4 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all group disabled:opacity-50 disabled:grayscale relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="tracking-widest uppercase text-[13px]">Publish Report</span>
                            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => setStep('details')}
                            className="w-full h-14 rounded-2xl bg-surface-container-high text-on-surface-variant font-display font-black flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                        >
                            <X className="w-4 h-4" />
                            <span className="tracking-widest uppercase text-[11px]">Back to Details</span>
                        </button>
                    </div>
                  </div>
              </motion.div>
          )}
      </div>

      <BottomNav />
    </div>
  );
}
