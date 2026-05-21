import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, ShieldCheck, ArrowRight, ShieldCheck as ShieldIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase.ts';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { useApp } from '../AppContext.tsx';

export default function Register() {
  const { loginWithGoogle, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/map', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const trimmedEmail = email.trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Create profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name,
        email: trimmedEmail,
        reputation: 0,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&h=200&auto=format&fit=crop'
      });
      // Navigation is handled by the useEffect once auth state updates
    } catch (err: any) {
      setError(err.message.includes('auth/operation-not-allowed') 
        ? 'Email registration is disabled. Please enable it in Firebase Console or use Google Account.' 
        : err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/map');
    } catch (err: any) {
      setError(err.message || 'Google registration failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden bg-surface">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6 shadow-sm">
            <ShieldCheck className="text-primary w-10 h-10" />
          </div>
          <h1 className="font-display font-extrabold text-4xl tracking-tighter text-on-surface mb-2">SafeStep</h1>
          <p className="text-on-surface-variant font-medium">Create your secure profile to stay protected.</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && <div className="p-3 bg-error/10 text-error text-xs font-bold rounded-lg">{error}</div>}
            <div className="space-y-2">
              <label className="font-sans text-sm font-bold text-on-surface-variant ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="w-5 h-5 text-outline" />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-surface-container-highest rounded-xl border-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-sans text-sm font-bold text-on-surface-variant ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-outline" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-surface-container-highest rounded-xl border-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-sans text-sm font-bold text-on-surface-variant ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-outline" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-surface-container-highest rounded-xl border-none focus:ring-2 focus:ring-primary transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-tertiary-container/10 p-4 rounded-xl border border-tertiary/10">
              <ShieldIcon className="w-5 h-5 text-tertiary shrink-0" />
              <p className="text-[12px] leading-snug text-tertiary font-medium">
                Your data is encrypted using military-grade standards. We never share your location without explicit permission.
              </p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full h-14 mt-4 bg-primary text-white font-bold text-lg rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 group ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span>{loading ? 'Processing...' : 'Sign Up'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-outline-variant/30"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-4 text-outline font-black tracking-widest leading-none py-1">Secure Fast-Track</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-14 bg-surface-container-low text-on-surface font-bold text-sm rounded-full border border-outline-variant/10 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Register with Google Account</span>
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-on-surface-variant text-sm font-medium">
              Already have an account? 
              <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline ml-1">Log In</button>
            </p>
          </div>
        </div>
      </motion.div>

      <div className="fixed bottom-8 left-0 w-full text-center px-6">
        <button className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest hover:text-primary transition-colors">
          Privacy Policy & Terms of Service
        </button>
      </div>
    </div>
  );
}
