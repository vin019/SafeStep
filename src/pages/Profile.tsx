import React from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { useApp } from '../AppContext.tsx';
import { Settings, LogOut, Verified, Pin, CheckCircle2, ChevronRight, AlertTriangle, ShieldAlert, Clock, CheckSquare, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { ActivityItem } from '../types.ts';
import { formatDistanceToNow } from 'date-fns';

export default function Profile() {
  const { user, logout, fetchUserProfileStats, fetchRecentActivity } = useApp();
  const navigate = useNavigate();

  const [stats, setStats] = React.useState({ pinsAdded: 0, verifications: 0 });
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      if (user) {
        setLoadingData(true);
        const [s, a] = await Promise.all([
          fetchUserProfileStats(user.id),
          fetchRecentActivity(user.id)
        ]);
        setStats(s);
        setActivities(a);
        setLoadingData(false);
      }
    }
    loadData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const claimAdmin = async () => {
    try {
      await setDoc(doc(db, 'admins', user.id), { email: user.email });
      alert('Admin rights granted! Please refreshing the page.');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Failed to claim admin. Make sure your email matches bacsarsav@gmail.com');
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      <TopBar />
      
      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-10">
        {/* Profile Hero Section */}
        <section className="flex flex-col items-center text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="w-36 h-36 rounded-full p-1.5 bg-gradient-to-tr from-primary to-orange-400 shadow-2xl">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-full h-full object-cover rounded-full border-4 border-surface" 
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-secondary text-white px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.12em] shadow-2xl flex items-center gap-1.5 border-2 border-white ring-4 ring-secondary/10">
              <Verified className="w-4 h-4 fill-white text-secondary" />
              {user.role === 'admin' ? 'System Admin' : 'Top Guide'}
            </div>
          </motion.div>

          <div>
            <h2 className="font-display font-black text-4xl tracking-tighter text-on-surface">{user.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="bg-[#002203] text-white px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.12em] shadow-md ring-1 ring-white/20">
                Reputation: +{user.reputation || 0}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-md pt-4">
            {user.role === 'admin' ? (
              <button 
                  onClick={() => navigate('/admin')}
                  className="w-full bg-secondary-container text-white rounded-full h-14 font-display font-black text-sm uppercase tracking-widest shadow-xl shadow-secondary/20 active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-white/20"
              >
                  <ShieldAlert className="w-5 h-5" />
                  Admin Hub
              </button>
            ) : user.email === 'bacsarsav@gmail.com' && (
              <button 
                  onClick={claimAdmin}
                  className="w-full bg-error text-white rounded-full h-14 font-display font-black text-sm uppercase tracking-widest shadow-xl shadow-error/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                  <ShieldAlert className="w-5 h-5" />
                  Claim Admin Access
              </button>
            )}
            <div className="flex gap-4 w-full">
              <button 
                  onClick={() => navigate('/settings')}
                  className="flex-1 bg-primary text-white rounded-full h-14 font-display font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                  <Settings className="w-4 h-4" />
                  Settings
              </button>
              <button 
                  onClick={handleLogout}
                  className="px-8 bg-white border-2 border-outline-variant text-on-surface-variant rounded-full h-14 font-display font-black text-sm uppercase tracking-widest hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                  <LogOut className="w-4 h-4" />
                  Exit
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid Contributions */}
        <section className="space-y-6">
          <h3 className="font-display font-black text-xl px-2 tracking-tight">My Contributions</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Pins Added */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-[2rem] flex flex-col justify-between h-44 relative overflow-hidden group shadow-sm border border-outline-variant/30"
            >
              <div className="absolute -top-4 -right-4 bg-primary/5 rounded-full w-28 h-28 group-hover:scale-110 transition-transform" />
              <Pin className="text-primary relative z-10 w-8 h-8 fill-primary/10" />
              <div className="relative z-10">
                <span className="block text-5xl font-black font-display text-on-surface tracking-tighter">
                  {loadingData ? '...' : stats.pinsAdded}
                </span>
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-1 block">Pins Added</span>
              </div>
            </motion.div>

            {/* Verifications */}
            <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-[2rem] flex flex-col justify-between h-44 relative overflow-hidden group shadow-sm border border-outline-variant/30"
            >
              <div className="absolute -top-4 -right-4 bg-tertiary/5 rounded-full w-28 h-28 group-hover:scale-110 transition-transform" />
              <CheckCircle2 className="text-tertiary relative z-10 w-8 h-8 fill-tertiary/10" />
              <div className="relative z-10">
                <span className="block text-5xl font-black font-display text-on-surface tracking-tighter">
                  {loadingData ? '...' : stats.verifications}
                </span>
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-1 block">Verifications</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-display font-black text-xl tracking-tight">Recent Activity</h3>
            <button className="text-primary text-xs font-black uppercase tracking-[0.2em] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {loadingData ? (
               <div className="py-20 text-center">
                 <p className="text-on-surface-variant text-sm font-bold animate-pulse">Syncing your activity...</p>
               </div>
            ) : activities.length > 0 ? (
              activities.map((activity) => (
                <motion.div 
                  key={activity.id}
                  whileHover={{ x: 5 }}
                  className="bg-white p-5 rounded-2xl flex items-center gap-4 transition-all shadow-sm border border-outline-variant/20 hover:border-primary/20 cursor-pointer"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    activity.type === 'HAZARD_REPORTED' ? 'bg-error-container text-error' : 'bg-tertiary/10 text-tertiary'
                  }`}>
                    {activity.type === 'HAZARD_REPORTED' ? <AlertTriangle className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-on-surface font-bold text-sm tracking-tight">{activity.title}</p>
                    <p className="text-on-surface-variant text-[11px] font-medium mt-1 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })} • {activity.statusText}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-outline-variant" />
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center bg-surface-variant/10 rounded-3xl border border-dashed border-outline-variant">
                <p className="text-on-surface-variant/60 font-bold text-xs uppercase tracking-widest">No activity yet</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
