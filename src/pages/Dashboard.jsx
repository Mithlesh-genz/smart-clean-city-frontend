// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
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

const Dashboard = () => {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const socketContext = useSocket();
    const socket = socketContext?.socket || null;
    const isConnected = socketContext?.isConnected || false;

    // ─── Speaker language state ──────────────────────────────
    const [lang, setLang] = useState(localStorage.getItem('speakerLang') || 'hi');

    // ─── Redirect if not authenticated ────────────────────────────
    useEffect(() => {
        if (!authLoading && !isAuthenticated && window.location.pathname !== '/login') {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate]);

    // ─── Fetch main stats ──────────────────────────────────────────
    const { data: statsData, loading: statsLoading, error: statsError, refetch: refetchStats } =
        useFetch('/dashboard/stats', {
            immediate: true,
            cacheTime: 5000,
            onError: () => toast.error('Failed to load dashboard data'),
        });

    const { data: realtimeData, refetch: refetchRealtime } = useFetch('/dashboard/realtime', {
        immediate: true,
        refetchInterval: 10000,
    });

    const { data: trendsData } = useFetch('/dashboard/trends?period=week', {
        immediate: true,
    });

    const { data: activityData } = useFetch('/dashboard/recent-activity?limit=10', {
        immediate: true,
    });

    const { data: notificationsData } = useFetch('/dashboard/notifications?unreadOnly=true', {
        immediate: true,
    });

    // ─── Popup cooldown (5 seconds) ──────────────────────────────
    const [lastPopupTime, setLastPopupTime] = useState(0);
    const POPUP_COOLDOWN = 5000;

    // ─── Socket event listener for AI detections ──────────────────
    useEffect(() => {
        if (!socket) {
            console.log('Socket not available – event listener skipped');
            return;
        }

        const handleNewEvent = (data) => {
            console.log('📢 New event received:', data);
            if (data?.distance) {
                // 1. If the backend sent per‑language announcements, play all
                if (data.announcement && typeof data.announcement === 'object') {
                    const languages = Object.keys(data.announcement);
                    if (languages.length > 0) {
                        speakMultipleLanguages(data.distance, languages);
                    } else {
                        speakMultipleLanguages(data.distance, ['en', 'hi', 'pa', 'ta', 'ur', 'kht']);
                    }
                } else {
                    // Fallback: speak only the user’s selected language
                    speakAnnouncement(data.distance, lang);
                }

                // 2. Show popup notification (with own cooldown)
                const now = Date.now();
                if (now - lastPopupTime >= POPUP_COOLDOWN) {
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

                    setLastPopupTime(now);
                } else {
                    console.log('Popup cooldown active, skipping popup');
                }

                // Refresh stats
                refetchStats();
                refetchRealtime();
            }
        };

        socket.on('event:new', handleNewEvent);

        return () => {
            socket.off('event:new', handleNewEvent);
        };
    }, [socket, lang, refetchStats, refetchRealtime, lastPopupTime]);

    // ─── Language change handler ──────────────────────────────────
    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setLang(newLang);
        localStorage.setItem('speakerLang', newLang);
    };

    // ─── Extract data ──────────────────────────────────────────────
    const stats = useMemo(() => statsData?.data || statsData || {}, [statsData]);
    const realtime = useMemo(() => realtimeData?.data || realtimeData || {}, [realtimeData]);
    const trends = useMemo(() => trendsData?.data || trendsData || [], [trendsData]);
    const activities = useMemo(() => activityData?.data || activityData || [], [activityData]);
    const notifications = useMemo(() => notificationsData?.data || notificationsData || [], [notificationsData]);

    // ─── Loading ──────────────────────────────────────────────────
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

    return (
        <div className="p-4 md:p-6">
            {/* ─── Header with Language Switcher ───────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* ─── Test Speaker ─────────────────────────────────────── */}
                    <button
                        onClick={() => {
                            const testDistance = 25;
                            speakAnnouncement(testDistance, lang);
                            const text = getAnnouncementText(testDistance, lang);
                            toast.success(`🔊 Test: ${text}`, { duration: 4000 });
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                        title="Test speaker & popup"
                    >
                        <Speaker className="w-4 h-4" /> Test
                    </button>

                    {/* ─── Language Switcher ───────────────────────────────── */}
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

                    {/* ─── Socket status ───────────────────────────────────── */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">
                            {isConnected ? '🟢 Live' : '🔴 Disconnected'}
                        </span>
                    </div>

                    {/* ─── Refresh button ──────────────────────────────────── */}
                    <button
                        onClick={() => { refetchStats(); refetchRealtime(); }}
                        className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        disabled={statsLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ─── Stats Grid ────────────────────────────────────────── */}
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

            {/* ─── Real-time Stats ────────────────────────────────────── */}
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

            {/* ─── Trends Chart ────────────────────────────────── */}
            <div className="mt-6 bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                <h3 className="text-white font-semibold mb-3">Trends (Last 7 Days)</h3>
                <div className="flex items-end gap-2 h-32">
                    {trends.length > 0 ? (
                        trends.map((item, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-primary/50 rounded-t"
                                    style={{ height: `${(item.events / Math.max(...trends.map(t => t.events))) * 100}%` }}
                                />
                                <span className="text-xs text-gray-400 mt-1">{item.time}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-sm">No trend data available.</p>
                    )}
                </div>
            </div>

            {/* ─── Recent Activity & Notifications ────────────────────── */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-4 border border-white/10 rounded-xl">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Recent Activity
                    </h3>
                    {activities.length === 0 ? (
                        <p className="text-gray-400 text-sm">No recent activity.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activities.slice(0, 5).map((act, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm border-b border-gray-800/50 pb-2">
                                    <span className="text-gray-400">{act.action || 'Unknown'}</span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-300">{act.resource || 'Resource'}</span>
                                    <span className="ml-auto text-xs text-gray-500">
                                        {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-card p-4 border border-white/10 rounded-xl">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Notifications
                        {notifications.length > 0 && (
                            <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                {notifications.length} unread
                            </span>
                        )}
                    </h3>
                    {notifications.length === 0 ? (
                        <p className="text-gray-400 text-sm">No unread notifications.</p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {notifications.map((notif) => (
                                <div key={notif._id} className="flex items-start gap-2 text-sm border-b border-gray-800/50 pb-2">
                                    <span className="text-yellow-400 mt-0.5">🔔</span>
                                    <div>
                                        <p className="text-gray-300">{notif.message || 'Notification'}</p>
                                        <p className="text-xs text-gray-500">
                                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;