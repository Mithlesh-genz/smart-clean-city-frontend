// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Shield,
    Globe,
    Moon,
    Sun,
    Save,
    Key,
    Loader2,
    CheckCircle,
    AlertCircle,
    LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Settings = () => {
    const { user, logout, updateUser } = useAuth();

    // ─── State ──────────────────────────────────────────────────────
    // Profile
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [profileLoading, setProfileLoading] = useState(true);

    // Password change
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Preferences (stored in localStorage, will sync to backend later)
    const [preferences, setPreferences] = useState({
        theme: 'dark',
        language: 'en',
        notifications: true,
        emailNotifications: true,
        pushNotifications: false,
    });

    // System settings (camera defaults, etc. – stored in localStorage for now)
    const [systemSettings, setSystemSettings] = useState({
        defaultFps: 30,
        defaultConfidence: 0.7,
    });

    // UI states
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [savingSystem, setSavingSystem] = useState(false);

    // ─── Load profile ──────────────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userData = await api.get('/users/profile/me');
                setProfile({
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                });
                // Load preferences from localStorage (or backend)
                const savedPrefs = localStorage.getItem('app_preferences');
                if (savedPrefs) {
                    setPreferences(JSON.parse(savedPrefs));
                }
                const savedSystem = localStorage.getItem('app_system_settings');
                if (savedSystem) {
                    setSystemSettings(JSON.parse(savedSystem));
                }
            } catch (err) {
                toast.error('Failed to load profile');
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // ─── Save profile ──────────────────────────────────────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            // Update profile via /users/profile (own profile)
            const response = await api.put('/users/profile', {
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.phone,
            });
            // Also update the auth context
            if (updateUser) {
                updateUser(response.user);
            }
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    // ─── Change password ──────────────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        setPasswordLoading(true);
        try {
            await api.post(`/users/${user.id}/change-password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                confirmPassword: passwordData.confirmPassword,
            });
            toast.success('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    // ─── Save preferences (localStorage + future API) ────────────
    const handleSavePreferences = async () => {
        setSavingPrefs(true);
        try {
            // Save to localStorage (simulate backend call)
            localStorage.setItem('app_preferences', JSON.stringify(preferences));
            // If you have a backend endpoint for preferences, call it here.
            // Example: await api.put('/users/preferences', preferences);
            toast.success('Preferences saved');
        } catch (err) {
            toast.error('Failed to save preferences');
        } finally {
            setSavingPrefs(false);
        }
    };

    // ─── Save system settings ─────────────────────────────────────
    const handleSaveSystem = async () => {
        setSavingSystem(true);
        try {
            localStorage.setItem('app_system_settings', JSON.stringify(systemSettings));
            // Example: await api.put('/system/settings', systemSettings);
            toast.success('System settings saved');
        } catch (err) {
            toast.error('Failed to save system settings');
        } finally {
            setSavingSystem(false);
        }
    };

    // ─── Logout ─────────────────────────────────────────────────────
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    // ─── Render ────────────────────────────────────────────────────
    if (profileLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>

            <div className="space-y-6">
                {/* ─── Profile Section ────────────────────────────── */}
                <section className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary" /> Profile
                    </h2>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here. Contact admin.</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="+1234567890"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                        >
                            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Profile
                        </button>
                    </form>
                </section>

                {/* ─── Security ────────────────────────────────────── */}
                <section className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-primary" /> Security
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                                minLength="8"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters, with at least one uppercase, lowercase, number, and special character.</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition disabled:opacity-50"
                        >
                            {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                            Change Password
                        </button>
                    </form>
                </section>

                {/* ─── Preferences ──────────────────────────────────── */}
                <section className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Globe className="w-5 h-5 text-primary" /> Preferences
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Theme</label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${preferences.theme === 'dark'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                                        }`}
                                >
                                    <Moon className="w-4 h-4" /> Dark
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${preferences.theme === 'light'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                                        }`}
                                >
                                    <Sun className="w-4 h-4" /> Light
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Language</label>
                            <select
                                value={preferences.language}
                                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="pa">Punjabi</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={preferences.notifications}
                                    onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                                    className="rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
                                />
                                Enable general notifications
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={preferences.emailNotifications}
                                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                                    className="rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
                                />
                                Email notifications
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={preferences.pushNotifications}
                                    onChange={(e) => setPreferences({ ...preferences, pushNotifications: e.target.checked })}
                                    className="rounded border-gray-700 bg-gray-800 text-primary focus:ring-primary"
                                />
                                Push notifications
                            </label>
                        </div>
                        <button
                            onClick={handleSavePreferences}
                            disabled={savingPrefs}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition disabled:opacity-50"
                        >
                            {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Preferences
                        </button>
                    </div>
                </section>

                {/* ─── System Settings ─────────────────────────────── */}
                <section className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <SettingsIcon className="w-5 h-5 text-primary" /> System Settings
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Default FPS</label>
                            <input
                                type="number"
                                value={systemSettings.defaultFps}
                                onChange={(e) => setSystemSettings({ ...systemSettings, defaultFps: parseInt(e.target.value) || 30 })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                min="1"
                                max="60"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Default Confidence Threshold</label>
                            <input
                                type="number"
                                step="0.05"
                                value={systemSettings.defaultConfidence}
                                onChange={(e) => setSystemSettings({ ...systemSettings, defaultConfidence: parseFloat(e.target.value) || 0.7 })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                min="0"
                                max="1"
                            />
                        </div>
                        <button
                            onClick={handleSaveSystem}
                            disabled={savingSystem}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition disabled:opacity-50"
                        >
                            {savingSystem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save System Settings
                        </button>
                    </div>
                </section>

                {/* ─── Logout ───────────────────────────────────────── */}
                <section className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </section>
            </div>
        </div>
    );
};

export default Settings;