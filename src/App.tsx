import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import MapView from './pages/MapView.tsx';
import RouteOptions from './pages/RouteOptions.tsx';
import Report from './pages/Report.tsx';
import Profile from './pages/Profile.tsx';
import AdminHub from './pages/AdminHub.tsx';
import Settings from './pages/Settings.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Initializing SafeStep...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-options"
        element={
          <ProtectedRoute>
            <RouteOptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/privacy"
        element={
          <ProtectedRoute>
            <PrivacyPolicy />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/map" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}
