import React from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { ShieldCheck, Bolt, MapPin, Navigation, ArrowLeft, Sun, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.tsx';

export default function RouteOptions() {
  const navigate = useNavigate();
  const { availableRoutes, selectedRoute, setSelectedRoute, destinationPosition, userPosition } = useApp();

  // Pick the first route as default if none selected
  React.useEffect(() => {
    if (!selectedRoute && availableRoutes.length > 0) {
      setSelectedRoute(availableRoutes[0]);
    }
  }, [availableRoutes, selectedRoute, setSelectedRoute]);

  return (
    <div className="min-h-screen bg-surface pb-24">
      <TopBar title="Route Options" showBack />
      
      <main className="w-full max-w-md mx-auto relative pt-16">
        {/* Map Header */}
        <section className="relative h-[240px] w-full overflow-hidden bg-surface-container-high shadow-inner">
          {(!userPosition || !destinationPosition) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-surface-container-low">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-primary opacity-40 animate-pulse" />
              </div>
              <h3 className="text-on-surface font-black text-lg mb-2">No Destination Set</h3>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed">
                Tap on the map to set a destination point before we can calculate the safest path for you.
              </p>
              <button 
                onClick={() => navigate('/map')}
                className="mt-6 px-6 py-1.5 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-transform"
              >
                Go to Map
              </button>
            </div>
          ) : (
            <>
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRn1gF-tew3Ign1ybBjVZdKtXEUQ1rSnyv3_8PbZaCpkq-obwYTd1tRug0AN99Oqi6BCL-Bc42sD2CkBtRVIV-EXBBUgIT8jozvjgV2rSKaAS-im2ajB-JPDi_A8mOf80CmYMnzl15-3D2cI2g3YsUmfAyAO27gRdTgWFv1qwlEyxbgu1NBQhmbCAHR-LTdjiL3seYYTys384cZq2RhqBm_OkiEoQN2mz6nCu3uzfQm1yGfYaUL4Es0l7gJ7KKKWPgl4t1iQfgZ0w" 
                alt="Map Preview"
                className="w-full h-full object-cover grayscale-[0.2] opacity-80"
              />
              <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            </>
          )}
        </section>

        {/* Route Details */}
        <section className="relative -mt-10 bg-surface rounded-t-[2.5rem] px-6 pt-8 pb-12 space-y-6 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] border-t border-white/50">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
          </div>

          <div className="space-y-4">
            <h2 className="text-on-surface text-xl font-extrabold tracking-tight">Recommended Paths</h2>

            <div className="space-y-4">
              {availableRoutes.map((route, index) => (
                <motion.div 
                  key={route.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedRoute(route)}
                  className={`p-5 rounded-2xl flex flex-col gap-4 shadow-sm relative overflow-hidden cursor-pointer transition-all border-2 ${
                    selectedRoute?.id === route.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 bg-white'
                  }`}
                >
                  {route.type === 'Safest' && (
                    <div className="absolute top-0 right-0 bg-primary px-4 py-1.5 rounded-bl-2xl">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">Recommended</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start pt-2">
                    <div>
                      <h3 className={`font-bold text-lg flex items-center gap-2 ${selectedRoute?.id === route.id ? 'text-primary' : 'text-on-surface'}`}>
                        {route.type === 'Safest' ? <ShieldCheck className="w-5 h-5 fill-primary/10" /> : <Bolt className="w-5 h-5 text-on-surface fill-on-surface/10" />}
                        {route.type} Route
                      </h3>
                      <span className="text-on-surface-variant text-sm font-medium">via {route.via}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-black text-on-surface">{route.time} <span className="text-sm font-medium text-on-surface-variant">mins</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-1">
                    <div className="flex-1 h-3 bg-surface-container-high rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${route.score}%` }}
                        className={`h-full ${route.type === 'Safest' ? 'bg-tertiary' : 'bg-secondary-container'}`}
                      />
                    </div>
                    <span className={`font-bold text-sm ${route.type === 'Safest' ? 'text-tertiary' : 'text-on-surface'}`}>{route.score}/100 Score</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {route.tags.map((tag, i) => (
                      <div key={i} className="bg-surface-container-high px-3 py-1 rounded-full flex items-center gap-1.5">
                        {i === 0 ? <Shield className="w-3 h-3 text-on-surface-variant" /> : <Sun className="w-3 h-3 text-on-surface-variant" />}
                        <span className="text-on-surface-variant text-xs font-bold">{tag}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button 
              onClick={() => navigate('/map')}
              className="w-full h-16 rounded-full bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              Start Navigation
              <Navigation className="w-5 h-5 fill-white" />
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
