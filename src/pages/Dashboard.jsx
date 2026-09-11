// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
    speakAnnouncement,
    speakMultipleLanguages,
    getAnnouncementText,
} from '../services/speakerService';
import toast from 'react-hot-toast';
import {
    Camera,
    Trash2,
    Mic,
    Activity,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    Clock,
    Bell,
    Speaker,
    FileText,
    TrendingUp,
    X,
} from 'lucide-react';

// ─── Local StatCard ──────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
    const colorMap = {
        blue: 'border-blue-500/30 bg-blue-500/10',
        green: 'border-green-500/30 bg-green-500/10',
        yellow: 'border-yellow-500/30 bg-yellow-500/10',
        red: 'border-red-500/30 bg-red-500/10',
        purple: 'border-purple-500/30 bg-purple-500/10',
        orange: 'border-orange-500/30 bg-orange-500/10',
        teal: 'border-teal-500/30 bg-teal-500/10',
        gray: 'border-gray-500/30 bg-gray-500/10',
    };
    const iconColorMap = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        red: 'text-red-400',
        purple: 'text-purple-400',
        orange: 'text-orange-400',
        teal: 'text-teal-400',
        gray: 'text-gray-400',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value ?? 0}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-2 rounded-lg bg-gray-800/50 ${iconColorMap[color] || iconColorMap.gray}`}>
                    {Icon && <Icon className="w-5 h-5" />}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const socketContext = useSocket();
    const socket = socketContext?.socket || null;
    const isConnected = socketContext?.isConnected || false;

    // ─── Language ──────────────────────────────────────────────
    const [lang, setLang] = useState(() => localStorage.getItem('speakerLang') || 'hi');

    // ─── Popup cooldown ──────────────────────────────────────────
    const lastPopupTime = useRef(0);
    const POPUP_COOLDOWN = 5000;

    // ─── Redirect if not authenticated ────────────────────────
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate]);

    // ─── API calls – only for endpoints that exist ────────────
    const { data: statsData, loading: statsLoading, error: statsError, refetch: refetchStats } =
        useFetch('/dashboard/stats', {
            immediate: true,
            cacheTime: 5000,
            onError: () => toast.error('Failed to load dashboard stats'),
        });

    const { data: realtimeData, refetch: refetchRealtime } = useFetch('/dashboard/realtime', {
        immediate: true,
        refetchInterval: 10000,
        onError: () => console.warn('Realtime fetch failed – using fallback'),
    });

    // ─── Memoised data ──────────────────────────────────────────
    const stats = useMemo(() => statsData?.data || statsData || {}, [statsData]);
    const realtime = useMemo(() => realtimeData?.data || realtimeData || {}, [realtimeData]);

    // ─── Fallback data for missing endpoints ──────────────────
    const trends = [];        // no trends fetch
    const activities = [];    // no activity fetch
    const notifications = []; // no notifications fetch

    // ─── Socket event: new event detection ────────────────────
    const handleNewEvent = useCallback(
        (data) => {
            if (!data?.distance) return;

            // Speak announcements
            if (data.announcement && typeof data.announcement === 'object') {
                const languages = Object.keys(data.announcement);
                if (languages.length > 0) {
                    speakMultipleLanguages(data.distance, languages);
                } else {
                    speakMultipleLanguages(data.distance, ['en', 'hi', 'pa', 'ta', 'ur']);
                }
            } else {
                speakAnnouncement(data.distance, lang);
            }

            // Popup notification (with cooldown)
            const now = Date.now();
            if (now - lastPopupTime.current >= POPUP_COOLDOWN) {
                const text = getAnnouncementText(data.distance, lang);
                const zoneName = data.zoneName || 'Unknown zone';
                toast.custom(
                    (t) => (
                        <div className="bg-gray-900 border border-yellow-500/50 rounded-lg p-4 max-w-md shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white text-sm font-medium">⚠️ Litter Detected</p>
                                    <p className="text-gray-300 text-sm mt-1">{text}</p>
                                    <p className="text-xs text-gray-500 mt-1">📍 Zone: {zoneName}</p>
                                </div>
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="text-gray-400 hover:text-white transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ),
                    { duration: 8000, position: 'top-right' }
                );
                lastPopupTime.current = now;
            }

            // Refresh stats & realtime
            refetchStats();
            refetchRealtime();
        },
        [lang, refetchStats, refetchRealtime]
    );

    useEffect(() => {
        if (!socket) return;
        socket.on('event:new', handleNewEvent);
        return () => {
            socket.off('event:new', handleNewEvent);
        };
    }, [socket, handleNewEvent]);

    // ─── Language change handler ──────────────────────────────
    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setLang(newLang);
        localStorage.setItem('speakerLang', newLang);
    };

    // ─── Test speaker ──────────────────────────────────────────
    const handleTestSpeaker = () => {
        const testDistance = 25;
        speakAnnouncement(testDistance, lang);
        const text = getAnnouncementText(testDistance, lang);
        toast.success(`🔊 Test: ${text}`, { duration: 4000 });
    };

    // ─── Loading & Error states ──────────────────────────────
    if (authLoading || statsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (statsError) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-xl max-w-md mx-auto">
                    <p className="text-lg font-medium mb-2">Failed to load dashboard</p>
                    <p className="text-sm opacity-80">{statsError}</p>
                    <button
                        onClick={refetchStats}
                        className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 inline mr-2" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleTestSpeaker}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                        title="Test speaker & popup"
                    >
                        <Speaker className="w-4 h-4" /> Test
                    </button>

                    <div className="flex items-center gap-2">
                        <Speaker className="w-4 h-4 text-gray-400" />
                        <select
                            value={lang}
                            onChange={handleLangChange}
                            className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="en">English</option>
                            <option value="hi">हिन्दी</option>
                            <option value="pa">ਪੰਜਾਬੀ</option>
                            <option value="ta">தமிழ்</option>
                            <option value="te">తెలుగు</option>
                            <option value="kn">ಕನ್ನಡ</option>
                            <option value="ml">മലയാളം</option>
                            <option value="mr">मराठी</option>
                            <option value="gu">ગુજરાતી</option>
                            <option value="or">ଓଡ଼ିଆ</option>
                            <option value="bn">বাংলা</option>
                            <option value="ur">اردو</option>
                        </select>
                    </div>

                    <span className="text-sm text-gray-400">
                        {isConnected ? '🟢 Live' : '🔴 Disconnected'}
                    </span>

                    <button
                        onClick={() => { refetchStats(); refetchRealtime(); }}
                        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        disabled={statsLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ─── Stats Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Total Cameras"
                    value={stats.totalCameras || 0}
                    icon={Camera}
                    color="blue"
                    subtitle={`${stats.onlineCameras || 0} online`}
                />
                <StatCard
                    title="Online Cameras"
                    value={stats.onlineCameras || 0}
                    icon={CheckCircle}
                    color="green"
                    subtitle={
                        stats.totalCameras
                            ? `${Math.round((stats.onlineCameras / stats.totalCameras) * 100)}% uptime`
                            : 'No cameras'
                    }
                />
                <StatCard
                    title="Events Today"
                    value={stats.eventsToday || 0}
                    icon={AlertTriangle}
                    color="yellow"
                    subtitle={`${stats.announcementsToday || 0} announcements`}
                />
                <StatCard
                    title="Dustbins Full"
                    value={stats.dustbinsFull || 0}
                    icon={Trash2}
                    color="red"
                    subtitle={
                        stats.totalDustbins
                            ? `${Math.round((stats.dustbinsFull / stats.totalDustbins) * 100)}% utilization`
                            : 'No dustbins'
                    }
                />
                <StatCard
                    title="Online Speakers"
                    value={stats.onlineSpeakers || 0}
                    icon={Mic}
                    color="purple"
                    subtitle={`${stats.totalSpeakers || 0} total`}
                />
                <StatCard
                    title="Cleanliness Score"
                    value={`${stats.cleanlinessScore || 0}%`}
                    icon={Activity}
                    color="green"
                    subtitle={
                        stats.cleanlinessScore >= 80
                            ? '✅ Excellent'
                            : stats.cleanlinessScore >= 60
                                ? '⚠️ Good'
                                : '❌ Needs improvement'
                    }
                />
                <StatCard
                    title="Open Tasks"
                    value={stats.openTasks || 0}
                    icon={Clock}
                    color="orange"
                    subtitle="Pending cleaning tasks"
                />
                <StatCard
                    title="Resolution Rate"
                    value={`${stats.resolutionRate || 0}%`}
                    icon={TrendingUp}
                    color="teal"
                    subtitle="Event resolution rate"
                />
            </div>

            {/* ─── Real-time Stats ────────────────────────────────── */}
            {realtime && Object.keys(realtime).length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                    <div>
                        <p className="text-gray-400 text-sm">Events (last hour)</p>
                        <p className="text-2xl font-bold text-white">{realtime.events?.lastHour || 0}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Per minute</p>
                        <p className="text-2xl font-bold text-white">{realtime.events?.perMinute || 0}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Camera uptime</p>
                        <p className="text-2xl font-bold text-green-400">{realtime.cameras?.uptime || 0}%</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Dustbins at risk</p>
                        <p className="text-2xl font-bold text-red-400">{realtime.dustbins?.high || 0}</p>
                    </div>
                </div>
            )}

            {/* ─── Trends (placeholder) ───────────────────────────── */}
            <div className="mt-6 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Trends (Last 7 Days)</h3>
                <p className="text-gray-400 text-sm">Trend data not available yet. Please implement the backend endpoint.</p>
            </div>

            {/* ─── Recent Activity & Notifications (placeholders) ── */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-4 border border-white/10 rounded-xl">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Recent Activity
                    </h3>
                    <p className="text-gray-400 text-sm">No recent activity (endpoint missing).</p>
                </div>
                <div className="glass-card p-4 border border-white/10 rounded-xl">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Notifications
                    </h3>
                    <p className="text-gray-400 text-sm">No notifications (endpoint missing).</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;