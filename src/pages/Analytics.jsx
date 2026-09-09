// frontend/src/pages/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Calendar, TrendingUp, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

const Analytics = () => {
    const { user } = useAuth();
    const canViewAnalytics = ['SUPER_ADMIN', 'ADMIN', 'VIEWER'].includes(user?.role);
    const [period, setPeriod] = useState('today');
    const [activeTab, setActiveTab] = useState('dashboard');

    // ─── Fetch main dashboard analytics ──────────────────────────
    const {
        data: dashboardData,
        loading: dashboardLoading,
        error: dashboardError,
        refetch: refetchDashboard
    } = useFetch(
        canViewAnalytics ? `/analytics/dashboard?period=${period}` : null,
        {
            immediate: canViewAnalytics,
            cacheTime: 60000,
            onError: (err) => {
                if (err.response?.status === 403) return;
                toast.error('Failed to load dashboard analytics');
            },
        }
    );

    // ─── Fetch widget data (dustbin status, system health) ──────
    const [dustbinData, setDustbinData] = useState(null);
    const [systemData, setSystemData] = useState(null);
    const [loadingWidgets, setLoadingWidgets] = useState(false);

    useEffect(() => {
        if (!canViewAnalytics) return;
        const fetchWidgets = async () => {
            setLoadingWidgets(true);
            try {
                const [dustbinRes, systemRes] = await Promise.all([
                    api.get('/analytics/widgets/dustbin-status'),
                    api.get('/analytics/widgets/system-status'),
                ]);
                setDustbinData(dustbinRes);
                setSystemData(systemRes);
            } catch (err) {
                console.error('Widget fetch error:', err);
            } finally {
                setLoadingWidgets(false);
            }
        };
        fetchWidgets();
    }, [canViewAnalytics, period]);

    // ─── Permission check ─────────────────────────────────────────
    if (!canViewAnalytics) {
        return (
            <div className="p-6 text-yellow-400">
                You don’t have permission to view analytics.
            </div>
        );
    }

    if (dashboardLoading || loadingWidgets) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (dashboardError) {
        return (
            <div className="text-red-500 p-4">
                Error: {dashboardError}
                <button
                    onClick={() => refetchDashboard()}
                    className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    // ─── Extract data ─────────────────────────────────────────────
    const data = dashboardData?.data || {};
    const summary = data.summary || {};
    const eventsByHour = data.eventsByHour || [];
    const statusCounts = data.statusCounts || {};
    const eventTrend = data.eventTrend || [];

    // Transform status counts for pie chart
    const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
    }));

    // ─── Render ────────────────────────────────────────────────────
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-transparent text-white focus:outline-none"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="quarter">Last 90 Days</option>
                            <option value="year">Last Year</option>
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            refetchDashboard();
                            // re-fetch widgets too
                            const fetchWidgets = async () => {
                                try {
                                    const [dustbinRes, systemRes] = await Promise.all([
                                        api.get('/analytics/widgets/dustbin-status'),
                                        api.get('/analytics/widgets/system-status'),
                                    ]);
                                    setDustbinData(dustbinRes);
                                    setSystemData(systemRes);
                                } catch (err) { /* ignore */ }
                            };
                            fetchWidgets();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ─── Tab Navigation ──────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-2">
                {['dashboard', 'events', 'dustbins', 'zones', 'tasks', 'health'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg transition-colors capitalize ${activeTab === tab
                                ? 'bg-primary/20 text-primary'
                                : 'text-gray-400 hover:bg-gray-800'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ─── Tab Content ────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
                <>
                    {/* ─── Stats Cards ────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            title="Total Events"
                            value={summary.totalEvents || 0}
                            icon={<AlertCircle className="w-5 h-5" />}
                            color="text-blue-400"
                        />
                        <StatCard
                            title="Pending"
                            value={summary.pendingEvents || 0}
                            icon={<Clock className="w-5 h-5" />}
                            color="text-yellow-400"
                        />
                        <StatCard
                            title="Resolved"
                            value={summary.resolvedEvents || 0}
                            icon={<CheckCircle className="w-5 h-5" />}
                            color="text-green-400"
                        />
                        <StatCard
                            title="Resolution Rate"
                            value={`${summary.resolutionRate || 0}%`}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="text-purple-400"
                        />
                    </div>

                    {/* ─── Charts Row ────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Line Chart: Events over time */}
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                            <h3 className="text-white font-semibold mb-2">Events Over Time</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={eventTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="count" stroke="#3b82f6" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bar Chart: Hourly distribution */}
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                            <h3 className="text-white font-semibold mb-2">Events by Hour</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={eventsByHour}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="hour" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                                    <Bar dataKey="count" fill="#8b5cf6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ─── Pie Chart: Status Distribution ────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                            <h3 className="text-white font-semibold mb-2">Event Status Breakdown</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={statusPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label
                                    >
                                        {statusPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* ─── Dustbin Widget ──────────────────────────── */}
                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                            <h3 className="text-white font-semibold mb-2">Dustbin Fill Status</h3>
                            {dustbinData?.data?.criticalDustbins?.length > 0 ? (
                                <div className="space-y-2">
                                    {dustbinData.data.criticalDustbins.map((bin) => (
                                        <div key={bin._id} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">{bin.name}</span>
                                            <span className="text-red-400">{bin.fillPercent}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400">No critical dustbins</p>
                            )}
                            <div className="mt-3 text-sm text-gray-400">
                                <span>Total dustbins: {dustbinData?.data?.total || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── System Health Widget ──────────────────────── */}
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                        <h3 className="text-white font-semibold mb-2">System Health</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-400 text-sm">Cameras Online</p>
                                <p className="text-white text-xl">
                                    {systemData?.data?.cameras?.ONLINE || 0}
                                    <span className="text-sm text-gray-400 ml-1">
                                        / {systemData?.data?.cameras?.total || 0}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Speakers Online</p>
                                <p className="text-white text-xl">
                                    {systemData?.data?.speakers?.ONLINE || 0}
                                    <span className="text-sm text-gray-400 ml-1">
                                        / {systemData?.data?.speakers?.total || 0}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Events (last hour)</p>
                                <p className="text-white text-xl">{systemData?.data?.events?.lastHour || 0}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Announcements Today</p>
                                <p className="text-white text-xl">{systemData?.data?.events?.announcements || 0}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ─── Other tabs (placeholder) ───────────────────────── */}
            {activeTab !== 'dashboard' && (
                <div className="text-gray-400 p-8 text-center">
                    <p className="text-lg">Analytics for <span className="text-white">{activeTab}</span> coming soon.</p>
                    <p className="text-sm mt-2">Use the Dashboard tab for an overview.</p>
                </div>
            )}
        </div>
    );
};

// ─── Stat Card Component ─────────────────────────────────────────
const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-white text-2xl font-semibold">{value}</p>
            </div>
            <div className={`p-2 rounded-lg bg-${color.split('-')[0]}-500/10 ${color}`}>{icon}</div>
        </div>
    </div>
);

export default Analytics;