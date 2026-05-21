import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Map, Bell, PlusCircle, User as UserIcon, ArrowLeft, MoreVertical, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase.ts';

export const TopBar: React.FC<{ title?: string; showBack?: boolean }> = ({ title = "SafeStep", showBack = false }) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md flex justify-between items-center px-6 h-16 shadow-none">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={() => window.history.back()} className="p-2 hover:bg-surface-container-high rounded-full transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
        ) : (
          <ShieldCheck className="w-6 h-6 text-primary" />
        )}
        <h1 className="font-display font-extrabold tracking-tighter text-lg text-primary">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors active:scale-95">
          <MoreVertical className="w-5 h-5" />
        </button>
        <NavLink to="/profile" className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-white overflow-hidden shadow-sm active:scale-95 transition-transform">
           <img 
            src={auth.currentUser?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuDdv0niOSsRwuQ8hetECW3gZzYM2imZjeu3-fr7PxBbooD7gEytDwgvIVzqaNbuIpU9fbIoZIFY5CSwSvFs2aY2OVduPWItmbFQubnm0-bvDElKHLUglkKFqnwQquXqnxaEFT1Y3znNXDqzO7uaR8J38PpgnG5EqhORnFJtFqDUxTAwlW3ko1jHfDT1bAaX_C436oD3FSJmMUduHgutbid6NzizDq9uAsh-eDkfK14E7Gs6dJbhCSesA_IwrstLP2dRB4xDl5QtU6Q"} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </NavLink>
      </div>
    </header>
  );
};

export const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { to: "/map", icon: Map, label: "Map" },
    { to: "/report", icon: PlusCircle, label: "Report" },
    { to: "/profile", icon: UserIcon, label: "Profile" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-2 bg-white/90 backdrop-blur-xl rounded-t-3xl z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `
            flex flex-col items-center justify-center px-5 py-2 transition-all duration-150 active:scale-90
            ${isActive 
              ? 'bg-primary/5 text-primary rounded-2xl scale-110' 
              : 'text-on-surface-variant hover:text-primary'}
          `}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-wider mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
