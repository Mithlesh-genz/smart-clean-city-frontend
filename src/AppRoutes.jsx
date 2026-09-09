// frontend/src/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import Zones from './pages/Zones';
import Dustbins from './pages/Dustbins';
import Speakers from './pages/Speakers';
import Events from './pages/Events';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import LiveMonitoring from './pages/LiveMonitoring';
import Notifications from './pages/Notifications';

const NotFound = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-gray-400 mt-2">Page not found</p>
      <a href="/dashboard" className="text-primary hover:underline mt-4 inline-block">
        Go back to Dashboard
      </a>
    </div>
  </div>
);

// ─── Protected Route (authentication only) ────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

// ─── Admin Route (authentication + admin role) ────────────────
const AdminProtectedRoute = ({ children }) => (
  <ProtectedRoute>
    <AdminRoute>{children}</AdminRoute>
  </ProtectedRoute>
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Root redirects to dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* Regular protected routes (all users) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live"
        element={
          <ProtectedRoute>
            <LiveMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cameras"
        element={
          <ProtectedRoute>
            <Cameras />
          </ProtectedRoute>
        }
      />
      <Route
        path="/zones"
        element={
          <ProtectedRoute>
            <Zones />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dustbins"
        element={
          <ProtectedRoute>
            <Dustbins />
          </ProtectedRoute>
        }
      />
      <Route
        path="/speakers"
        element={
          <ProtectedRoute>
            <Speakers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
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
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/analytics"
        element={
          <AdminProtectedRoute>
            <Analytics />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <AdminProtectedRoute>
            <Users />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminProtectedRoute>
            <Settings />
          </AdminProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;