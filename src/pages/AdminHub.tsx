import React, { useState } from 'react';
import { TopBar, BottomNav } from '../components/Navigation.tsx';
import { ShieldCheck, AlertCircle, Trash2, Users, MapPin, ChevronRight, Filter, ShieldAlert, Zap, Droplets, ArrowLeft, Navigation, Edit, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.tsx';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Hazard } from '../types.ts';

export default function AdminHub() {
  const navigate = useNavigate();
  const { user, hazards, fetchAllVerifications, fetchAllNotificationLogs, purgeNotificationLogs, updateHazardStatus } = useApp();
  const [activeTab, setActiveTab] = useState<'hazards' | 'logs' | 'verifications'>('hazards');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [notifLogs, setNotifLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterType, setFilterType] = useState<string | 'all'>('all');
  const [editingHazard, setEditingHazard] = useState<Hazard | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [deletedHazardIds, setDeletedHazardIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    setLoadingLogs(true);
    Promise.all([
        fetchAllVerifications(),
        fetchAllNotificationLogs()
    ]).then(([v, l]) => {
        setVerifications(v);
        setNotifLogs(l);
        setLoadingLogs(false);
    });
  }, []);

  React.useEffect(() => {
    // Refresh current tab data if needed, but the main fetch handles initial load
    if (activeTab === 'verifications' && verifications.length === 0) {
        fetchAllVerifications().then(setVerifications);
    } else if (activeTab === 'logs' && notifLogs.length === 0) {
        fetchAllNotificationLogs().then(setNotifLogs);
    }
  }, [activeTab]);

  const handlePurge = async () => {
    if (!window.confirm('Delete all notification records? This action is permanent.')) return;
    setLoadingLogs(true);
    await purgeNotificationLogs();
    const l = await fetchAllNotificationLogs();
    setNotifLogs(l);
    setLoadingLogs(false);
  };

  const handleResolveHazard = async (id: string) => {
    await updateHazardStatus(id, 'archived');
  };

  const handleEditClick = (hazard: Hazard) => {
    setEditingHazard(hazard);
    setEditForm({ title: hazard.title, description: hazard.description });
  };

  const handleSaveEdit = async () => {
    if (!editingHazard) return;
    try {
        await updateDoc(doc(db, 'hazards', editingHazard.id), {
            title: editForm.title,
            description: editForm.description
        });
        setEditingHazard(null);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `hazards/${editingHazard.id}`);
    }
  };

  // Security Gate
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-error mb-4" />
        <h1 className="text-3xl font-display font-black text-on-surface mb-2">Access Denied</h1>
        <p className="text-on-surface-variant mb-8 max-w-xs font-medium">This area is reserved for SafeWalker administrators only.</p>
        <button 
            onClick={() => navigate('/map')}
            className="px-8 py-4 bg-primary text-white rounded-full font-display font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
            Return to Safety
        </button>
      </div>
    );
  }

  const handleDeleteHazard = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this community report? This action cannot be undone.')) return;
    
    try {
      // Optimistically remove it from UI immediately
      setDeletedHazardIds(prev => [...prev, id]);
      
      await deleteDoc(doc(db, 'hazards', id));
      
      setToast({ message: 'Hazard successfully deleted', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      // Revert local deletion on error
      setDeletedHazardIds(prev => prev.filter(deletedId => deletedId !== id));
      setToast({ message: 'Failed to delete hazard', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      handleFirestoreError(error, OperationType.DELETE, `hazards/${id}`);
    }
  };

  const filteredHazards = (filterType === 'all' 
    ? hazards 
    : hazards.filter(h => h.type === filterType)
  ).filter(h => !deletedHazardIds.includes(h.id));

  const categories = [
    { id: 'all', label: 'All Reports', icon: Filter },
    { id: 'Hazard', label: 'Hazards', icon: AlertCircle },
    { id: 'Traffic', label: 'Traffic', icon: ShieldAlert },
    { id: 'Flooded', label: 'Flooded', icon: Droplets },
    { id: 'High-risk', label: 'High-risk', icon: Zap },
    { id: 'Safe', label: 'Safe Zones', icon: ShieldCheck },
  ];

  return (
    <div className="bg-surface font-sans text-on-surface min-h-screen pb-32">
        <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 px-8 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/profile')} className="p-2 hover:bg-surface-container-low rounded-full transition-colors active:scale-90">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-display font-black text-3xl tracking-tight leading-none">Admin Hub</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">Operational Authority</p>
                    </div>
                </div>
                <div className="flex bg-surface-container-low p-1 rounded-2xl">
                    <button 
                        onClick={() => setActiveTab('hazards')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'hazards' ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant'}`}
                    >
                        Hazards
                    </button>
                    <button 
                        onClick={() => setActiveTab('verifications')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'verifications' ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant'}`}
                    >
                        Trust Logs
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'logs' ? 'bg-white shadow-md text-primary' : 'text-on-surface-variant'}`}
                    >
                        Nav Logs
                    </button>
                </div>
            </div>
        </div>

        <main className="p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface-container-high/50 p-6 rounded-3xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Build Integrity</p>
                    <h2 className="text-sm font-black text-on-surface mt-1">SAFE_STEP_PRD_V4.2.0</h2>
                    <div className="mt-3 flex items-center gap-1 bg-emerald-500/10 text-emerald-600 w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        System Online
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Active Threats</p>
                    <h2 className="text-2xl font-black text-on-surface mt-1">{hazards.filter(h => h.status === 'active').length}</h2>
                    <p className="text-[9px] font-bold text-secondary mt-1 uppercase tracking-tighter">Requires Validation</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Traffic Volume</p>
                    <h2 className="text-2xl font-black text-primary mt-1">{notifLogs.length}</h2>
                    <p className="text-[9px] font-bold text-outline mt-1 uppercase tracking-tighter">Notification Instances</p>
                </div>
            </div>

            {activeTab === 'hazards' ? (
                <div className="space-y-8">
                    {/* Filter Bar */}
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-8 px-8">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterType(cat.id)}
                                className={`
                                    flex items-center gap-3 px-6 py-3 rounded-2xl whitespace-nowrap border-2 transition-all font-black text-xs uppercase tracking-widest
                                    ${filterType === cat.id 
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                        : 'bg-white border-outline-variant/20 text-on-surface-variant hover:border-primary/40'}
                                `}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredHazards.map((hazard) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={hazard.id}
                                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={`
                                            w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 
                                            ${hazard.type === 'Safe' ? 'bg-tertiary-container shadow-inner' : 'bg-surface-container-high'}
                                        `}>
                                            {hazard.type === 'Safe' && <ShieldCheck className="w-7 h-7 text-tertiary" />}
                                            {hazard.type === 'Hazard' && <AlertCircle className="w-7 h-7 text-secondary" />}
                                            {hazard.type === 'Traffic' && <ShieldAlert className="w-7 h-7 text-error" />}
                                            {hazard.type === 'Flooded' && <Droplets className="w-7 h-7 text-primary" />}
                                            {hazard.type === 'High-risk' && <Zap className="w-7 h-7 text-error" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-on-surface">{hazard.title}</h3>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-surface-container-highest px-2 py-0.5 rounded-full text-on-surface-variant">
                                                    ID: {hazard.id.slice(0, 8)}
                                                </span>
                                            </div>
                                            <p className="text-on-surface-variant text-sm font-medium mb-3 line-clamp-2">{hazard.description}</p>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    <span className="text-[11px] font-bold text-on-surface truncate">{hazard.coords.lat.toFixed(4)}, {hazard.coords.lng.toFixed(4)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-outline shrink-0" />
                                                    <span className="text-[11px] font-bold text-outline uppercase tracking-tighter">UID: {hazard.reporterId?.slice(0, 6)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
                                        <button 
                                            onClick={() => handleEditClick(hazard)}
                                            className="h-12 w-12 rounded-2xl bg-surface-container-high flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleResolveHazard(hazard.id)}
                                            className={`
                                                flex-1 sm:flex-none h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                                ${hazard.status === 'archived' 
                                                    ? 'bg-emerald-100 text-emerald-700 pointer-events-none' 
                                                    : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95'}
                                            `}
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            {hazard.status === 'archived' ? 'Resolved' : 'Resolve'}
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteHazard(hazard.id)}
                                            className="h-12 w-12 rounded-2xl bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredHazards.length === 0 && (
                            <div className="bg-surface-container-low rounded-[2rem] border-2 border-dashed border-outline-variant/30 py-20 text-center">
                                <ShieldCheck className="w-16 h-16 text-outline/20 mx-auto mb-4" />
                                <h3 className="font-display font-black text-xl text-on-surface">No reports found</h3>
                                <p className="text-on-surface-variant font-medium mt-1">Adjust your filters or take a well-deserved break.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'verifications' ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="font-display font-black text-xl tracking-tight leading-none text-on-surface">Community Verification Flow</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant underline underline-offset-4 decoration-primary/30">Live Stream</p>
                    </div>
                    <div className="grid gap-3">
                        {loadingLogs ? (
                            <div className="py-20 text-center animate-pulse">
                                <ShieldCheck className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                                <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">Indexing Trust Matrix...</p>
                            </div>
                        ) : verifications.length > 0 ? (
                            verifications.map((v, i) => (
                                <div key={i} className="bg-white p-5 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4 group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${v.status === 'valid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {v.status === 'valid' ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-on-surface font-sans">
                                            User <span className="text-primary tracking-tighter">{v.userId.slice(0, 8)}</span> verified hazard <span className="opacity-60">{v.hazardId?.slice(0, 8)}</span> as <span className={v.status === 'valid' ? 'text-emerald-600' : 'text-rose-600'}>{v.status.toUpperCase()}</span>
                                        </p>
                                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1 opacity-60">
                                            {new Date(v.timestamp?.seconds * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/20">
                                <Users className="w-12 h-12 text-outline/20 mx-auto mb-4" />
                                <p className="text-on-surface-variant text-xs font-black uppercase tracking-widest">No recent verifications</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div>
                            <h3 className="font-display font-black text-xl tracking-tight leading-none text-on-surface">Navigation Traffic</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-2">Active Notifications & Alerts</p>
                        </div>
                        <button 
                            onClick={handlePurge}
                            className="bg-error text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-error/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Purge Records
                        </button>
                    </div>
                    <div className="grid gap-3">
                        {loadingLogs ? (
                            <div className="py-20 text-center animate-pulse">
                                <Zap className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                                <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">Parsing Satellite Logs...</p>
                            </div>
                        ) : notifLogs.length > 0 ? (
                            notifLogs.map((log) => (
                                <div key={log.id} className="bg-white p-5 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center gap-4 transition-all hover:bg-surface-container-low group">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${log.type === 'nav_risk' ? 'bg-primary text-white shadow-inner' : 'bg-secondary text-white'}`}>
                                        {log.type === 'nav_risk' ? <Navigation size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">System Notification</p>
                                            <p className="text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-1.5 py-0.5 rounded uppercase">{log.type.replace('_', ' ')}</p>
                                        </div>
                                        <p className="text-sm font-bold text-on-surface leading-tight tracking-tight">{log.message}</p>
                                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-2 opacity-50">
                                            {formatDistanceToNow(log.timestamp?.toDate ? log.timestamp.toDate() : new Date(), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-surface-container-low rounded-[3rem] border-2 border-dashed border-outline-variant/20">
                                <ShieldCheck className="w-12 h-12 text-outline/20 mx-auto mb-4" />
                                <p className="text-on-surface-variant text-xs font-black uppercase tracking-widest">Logs are clear</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>

        <BottomNav />

        {/* Edit Modal */}
        <AnimatePresence>
            {editingHazard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
                        onClick={() => setEditingHazard(null)}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-outline-variant/10"
                    >
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-display font-black text-on-surface tracking-tight">Edit Report</h2>
                                <button onClick={() => setEditingHazard(null)} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">Report Title</label>
                                    <input 
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                        className="w-full h-14 px-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-4">Detailed Description</label>
                                    <textarea 
                                        rows={4}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                        className="w-full p-6 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/30 font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setEditingHazard(null)}
                                    className="flex-1 h-14 rounded-full font-display font-black text-sm uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEdit}
                                    className="flex-3 h-14 rounded-full bg-primary text-white font-display font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    Synchronize Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Dynamic Toast Feedback System */}
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-4 bg-on-surface/95 backdrop-blur-xl text-white rounded-2xl shadow-xl border border-outline-variant/10"
                >
                    {toast.type === 'success' ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="text-xs font-black uppercase tracking-widest leading-none">{toast.message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}
