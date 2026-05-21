import React from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { useApp } from '../AppContext.tsx';
import { Mail, Lock, ChevronRight, Bell, Radar, MapPin, Ghost, HelpCircle, PhoneCall, Info, LogOut, FileText, FileDown, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="px-2 text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">{children}</h3>
  );

  const { user } = useApp();

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen">
      <TopBar title="Settings" showBack />
      
      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-10">
        <div className="px-2">
            <h2 className="text-4xl font-display font-black tracking-tighter text-on-surface">Preferences</h2>
            <p className="text-on-surface-variant font-medium mt-2">Manage your account and safety thresholds.</p>
        </div>

        {/* Account Settings */}
        <section>
          <SectionTitle>Account Security</SectionTitle>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30">
            <button className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Email Address</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">{user?.email || 'user@example.com'}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors group text-left border-t border-outline-variant/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Access Password</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">Last changed 3 months ago</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <SectionTitle>Real-time Alerts</SectionTitle>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container/10 flex items-center justify-center text-secondary-container">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Push Protocol</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">Instant hazard notifications</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
            
            <div className="p-5 bg-surface-container-low/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-container/10 flex items-center justify-center text-secondary-container">
                    <Radar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-on-surface tracking-tight">Detection Radius</div>
                    <div className="text-xs font-medium text-on-surface-variant mt-0.5">Alert distance threshold</div>
                  </div>
                </div>
                <span className="font-black text-primary text-sm uppercase tracking-tighter">500m</span>
              </div>
              <input type="range" min="100" max="2000" defaultValue="500" className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex justify-between mt-3 text-[9px] font-black text-outline uppercase tracking-[0.2em]">
                <span>100m</span>
                <span>2km</span>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <SectionTitle>Anonymity Grid</SectionTitle>
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30">
            <button 
              onClick={() => navigate('/privacy')}
              className="w-full flex items-center justify-between p-5 border-b border-outline-variant/10 text-left hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Compliance Protocol</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">GDPR, CCPA & ISO Standards</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-outline" />
            </button>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Trace Sharing</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">Passive community awareness</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                  <Ghost className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-on-surface tracking-tight">Stealth Reporting</div>
                  <div className="text-xs font-medium text-on-surface-variant mt-0.5">Hide identity on public feeds</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </section>

        {/* Data Sovereignty (GDPR) */}
        <section>
          <SectionTitle>Data Sovereignty</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => alert('Data export initiated. You will receive an encrypted bundle via email.')}
              className="bg-white p-5 rounded-3xl shadow-sm border border-outline-variant/30 hover:bg-primary/5 transition-all group text-left"
            >
              <FileDown className="w-8 h-8 text-primary mb-3" />
              <div className="font-bold text-on-surface tracking-tight uppercase text-[10px] tracking-[0.15em]">Export My Data</div>
              <p className="text-[9px] text-on-surface-variant mt-1 font-medium italic">JSON Bundle (ISO 17267)</p>
            </button>
            <button 
              onClick={() => confirm('Are you sure? This action is irreversible per GDPR Art. 17.') && handleLogout()}
              className="bg-white p-5 rounded-3xl shadow-sm border border-outline-variant/30 hover:bg-error/5 transition-all group text-left border-error/10"
            >
              <Trash2 className="w-8 h-8 text-error mb-3" />
              <div className="font-bold text-error tracking-tight uppercase text-[10px] tracking-[0.15em]">Delete Records</div>
              <p className="text-[9px] text-error/60 mt-1 font-medium italic">Purge All Cloud Data</p>
            </button>
          </div>
        </section>

        {/* Support */}
        <section className="grid grid-cols-2 gap-4">
          <button className="bg-white p-5 rounded-3xl shadow-sm border border-outline-variant/30 hover:bg-primary/5 transition-all group text-left">
            <HelpCircle className="w-8 h-8 text-primary mb-3" />
            <div className="font-bold text-on-surface tracking-tight uppercase text-xs tracking-[0.1em]">Help Portal</div>
          </button>
          <button className="bg-white p-5 rounded-3xl shadow-sm border border-outline-variant/30 hover:bg-primary/5 transition-all group text-left">
            <PhoneCall className="w-8 h-8 text-primary mb-3" />
            <div className="font-bold text-on-surface tracking-tight uppercase text-xs tracking-[0.1em]">Direct Comms</div>
          </button>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-outline-variant/30 col-span-2 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
              <Info className="w-5 h-5 text-outline" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-on-surface tracking-tight">Build Integrity</div>
              <div className="text-xs font-black text-on-surface-variant uppercase tracking-widest mt-0.5">Version 2.4.0 (Build 892)</div>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" />
          </div>
        </section>

        {/* Logout */}
        <div className="pt-6">
            <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-5 bg-error-container text-on-error-container font-display font-black text-sm uppercase tracking-[0.2em] rounded-full active:scale-95 transition-all shadow-sm"
            >
                <LogOut className="w-4 h-4" />
                Disconnect Session
            </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
