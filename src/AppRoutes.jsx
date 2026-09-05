import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

// Placeholder pages (you can create these later)
const LiveMonitoring = () => <div>Live Monitoring</div>;
const Cameras = () => <div>Cameras</div>;
const Zones = () => <div>Zones</div>;
const Dustbins = () => <div>Dustbins</div>;
const Speakers = () => <div>Speakers</div>;
const Events = () => <div>Events</div>;
const Tasks = () => <div>Tasks</div>;
const Analytics = () => <div>Analytics</div>;
const Users = () => <div>Users</div>;
const Settings = () => <div>Settings</div>;
const Profile = () => <div>Profile</div>;
const NotFound = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <p className="text-gray-400 mt-2">Page not found</p>
        </div>
    </div>
);

function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
                path="/*"
                element={
                    isAuthenticated ? (
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/live" element={<LiveMonitoring />} />
                                <Route path="/cameras" element={<Cameras />} />
                                <Route path="/zones" element={<Zones />} />
                                <Route path="/dustbins" element={<Dustbins />} />
                                <Route path="/speakers" element={<Speakers />} />
                                <Route path="/events" element={<Events />} />
                                <Route path="/tasks" element={<Tasks />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </Layout>
                    ) : (
                        <Navigate to="/login" state={{ from: location }} replace />
                    )
                }
            />
        </Routes>
    );
}

export default AppRoutes;