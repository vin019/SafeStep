import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext.tsx';

export default function Login() {
  const { login, loginWithGoogle, resetPassword, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/map', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmedEmail = email.trim();
    try {
      await login(trimmedEmail, password);
      // Navigation is handled by the useEffect above once auth state updates
    } catch (err: any) {
      if (err.message.includes('auth/invalid-credential')) {
        setError('Invalid email or password. Please verify your credentials and try again.');
      } else if (err.message.includes('auth/operation-not-allowed')) {
        setError('Email login is disabled. Please enable it in Firebase Console or use Google Login.');
      } else {
        setError(err.message || 'Login failed');
      }
    }
  };

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      await resetPassword(trimmedEmail);
      setSuccess('Password reset link sent to your email!');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      // Navigation is handled by the useEffect above once auth state updates
    } catch (err: any) {
      setIsGoogleLoading(false);
      if (err.message.includes('localhost') || err.message.includes('auth/unauthorized-domain')) {
        setError("Setup Required: Add 'localhost' to your Authorized Domains in the Firebase Console (Authentication > Settings > Authorized domains).");
      } else {
        setError(err.message || 'Google login failed');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden bg-surface">
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary-container/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6 shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-display font-extrabold text-primary tracking-tighter mb-2">SafeStep</h1>
          <p className="text-on-surface-variant font-medium tracking-tight">Your path to security and calm.</p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-[0_24px_48px_rgba(0,0,0,0.04)] border border-white">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-1">Welcome back</h2>
            <p className="text-sm text-on-surface-variant font-medium">Please enter your details to continue.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && <div className="p-3 bg-error/10 text-error text-xs font-bold rounded-lg">{error}</div>}
            {success && <div className="p-3 bg-green-500/10 text-green-600 text-xs font-bold rounded-lg">{success}</div>}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface ml-1">Email address</label>
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
              <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-bold text-on-surface">Password</label>
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
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

            <button 
              type="submit"
              className="w-full h-14 rounded-full bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Sign In</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-surface-container"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-outline uppercase tracking-widest">or continue with</span>
              <div className="flex-grow border-t border-surface-container"></div>
            </div>
            
            <div className="flex flex-col gap-4 mt-6">
              <button 
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className={`flex items-center justify-center gap-3 h-14 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-95 border border-outline-variant/10 group ${isGoogleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isGoogleLoading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-on-surface font-bold text-sm">
                  {isGoogleLoading ? 'Connecting...' : 'Continue with Google Account'}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-on-surface-variant text-sm font-medium">
              Don't have an account? 
              <button onClick={() => navigate('/register')} className="text-primary font-bold hover:underline ml-1">Create an Account</button>
            </p>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-2">
             <div className="w-1 h-1 rounded-full bg-on-surface" />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Encrypted Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-on-surface" />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">ISO Certified</span>
          </div>
        </div>
      </motion.div>

      <footer className="mt-auto py-8 text-center">
        <p className="text-[11px] font-bold text-outline tracking-[0.2em] uppercase">© 2024 SafeStep Protocol • Privacy First Architecture</p>
      </footer>
    </div>
  );
}
