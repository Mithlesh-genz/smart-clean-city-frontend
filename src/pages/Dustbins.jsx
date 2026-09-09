// frontend/src/pages/Dustbins.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import {
    Trash2,
    Edit,
    Plus,
    X,
    RefreshCw,
    Save,
    Search,
    ChevronDown,
    ChevronUp,
    Eye,
    BarChart3,
    AlertTriangle,
    Clock,
    Power,
    PowerOff,
    Activity,
    Gauge,
    MapPin,
    Calendar,
    Droplet,
    Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Dustbins = () => {
    const navigate = useNavigate();
    const socket = useSocket();
    const { data: dustbinsData, loading, error, refetch } = useFetch('/dustbins', { immediate: true });

    // ─── State ──────────────────────────────────────────────────────
    const [dustbins, setDustbins] = useState([]);
    const [zones, setZones] = useState([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [zoneError, setZoneError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingDustbin, setEditingDustbin] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [filterZone, setFilterZone] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFill, setFilterFill] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDustbin, setExpandedDustbin] = useState(null);
    const [stats, setStats] = useState(null);

    const [newDustbin, setNewDustbin] = useState({
        name: '',
        zoneId: '',
        location: { coordinates: ['', ''] },
        capacity: 240,
        fillPercent: 0,
        status: 'AVAILABLE',
    });

    // ─── Fetch Zones ──────────────────────────────────────────────
    const fetchZones = async (showToast = true) => {
        setZonesLoading(true);
        setZoneError(null);
        try {
            const response = await api.get('/zones');
            let zoneArray = [];
            if (Array.isArray(response)) zoneArray = response;
            else if (response?.data && Array.isArray(response.data)) zoneArray = response.data;
            else if (response?.success && Array.isArray(response.data)) zoneArray = response.data;
            else {
                for (const key in response) {
                    if (Array.isArray(response[key])) {
                        zoneArray = response[key];
                        break;
                    }
                }
            }
            if (zoneArray.length === 0 && showToast) {
                toast.error('No zones found. Please create a zone first.');
            }
            setZones(zoneArray);
            return zoneArray;
        } catch (err) {
            console.error('Failed to fetch zones:', err);
            setZoneError(err.message || 'Could not load zones');
            if (showToast) toast.error('Could not load zones. Please try again.');
            setZones([]);
            return [];
        } finally {
            setZonesLoading(false);
        }
    };

    // ─── Fetch Stats ──────────────────────────────────────────────
    const fetchStats = async () => {
        try {
            const response = await api.get('/dustbins/stats');
            setStats(response);
        } catch (err) {
            console.warn('Failed to fetch stats:', err);
        }
    };

    useEffect(() => {
        fetchZones(true);
        fetchStats();
    }, []);

    // ─── Parse dustbins data ──────────────────────────────────────
    useEffect(() => {
        if (dustbinsData) {
            const list = Array.isArray(dustbinsData)
                ? dustbinsData
                : dustbinsData?.data && Array.isArray(dustbinsData.data)
                    ? dustbinsData.data
                    : [];
            setDustbins(list);
        }
    }, [dustbinsData]);

    // ─── Socket live updates ─────────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;

        const handleFillUpdate = (data) => {
            setDustbins((prev) =>
                prev.map((d) =>
                    d._id === data.dustbinId
                        ? { ...d, fillPercent: data.fillPercent, status: data.status }
                        : d
                )
            );
        };

        const handleStatusUpdate = (data) => {
            setDustbins((prev) =>
                prev.map((d) =>
                    d._id === data.dustbinId
                        ? { ...d, status: data.newStatus, fillPercent: data.fillPercent || d.fillPercent }
                        : d
                )
            );
        };

        const handleNewDustbin = (data) => {
            setDustbins((prev) => [data.dustbin, ...prev]);
        };

        const handleDelete = (data) => {
            setDustbins((prev) => prev.filter((d) => d._id !== data.dustbinId));
        };

        socket.on('dustbin:fill', handleFillUpdate);
        socket.on('dustbin:status', handleStatusUpdate);
        socket.on('dustbin:new', handleNewDustbin);
        socket.on('dustbin:delete', handleDelete);

        return () => {
            socket.off('dustbin:fill', handleFillUpdate);
            socket.off('dustbin:status', handleStatusUpdate);
            socket.off('dustbin:new', handleNewDustbin);
            socket.off('dustbin:delete', handleDelete);
        };
    }, [socket]);

    // ─── Filtering ────────────────────────────────────────────────
    const filteredDustbins = dustbins.filter((d) => {
        const matchZone = filterZone ? d.zoneId?._id === filterZone || d.zoneId === filterZone : true;
        const matchStatus = filterStatus ? d.status === filterStatus : true;
        const matchFill = filterFill
            ? (() => {
                if (filterFill === 'LOW') return d.fillPercent < 33;
                if (filterFill === 'MEDIUM') return d.fillPercent >= 33 && d.fillPercent < 66;
                if (filterFill === 'HIGH') return d.fillPercent >= 66 && d.fillPercent < 90;
                if (filterFill === 'FULL') return d.fillPercent >= 90;
                return true;
            })()
            : true;
        const matchSearch = searchTerm
            ? d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.zoneId?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        return matchZone && matchStatus && matchFill && matchSearch;
    });

    // ─── CRUD Operations ──────────────────────────────────────────
    const handleAddDustbin = async (e) => {
        e.preventDefault();
        if (!newDustbin.name.trim() || !newDustbin.zoneId) {
            toast.error('Name and zone are required');
            return;
        }
        if (!newDustbin.location.coordinates[0] || !newDustbin.location.coordinates[1]) {
            toast.error('Please provide longitude and latitude');
            return;
        }
        setIsAdding(true);
        try {
            const payload = {
                name: newDustbin.name.trim(),
                zoneId: newDustbin.zoneId,
                location: {
                    type: 'Point',
                    coordinates: [
                        parseFloat(newDustbin.location.coordinates[0]),
                        parseFloat(newDustbin.location.coordinates[1]),
                    ],
                },
                capacity: parseInt(newDustbin.capacity) || 240,
                fillPercent: parseFloat(newDustbin.fillPercent) || 0,
                status: newDustbin.status,
            };
            const response = await api.post('/dustbins', payload);
            toast.success(`Dustbin "${response.name}" created`);
            setShowAddModal(false);
            setNewDustbin({
                name: '',
                zoneId: '',
                location: { coordinates: ['', ''] },
                capacity: 240,
                fillPercent: 0,
                status: 'AVAILABLE',
            });
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create dustbin');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateDustbin = async (e) => {
        e.preventDefault();
        if (!editingDustbin) return;
        try {
            const payload = { ...editingDustbin };
            delete payload._id;
            delete payload.createdAt;
            delete payload.updatedAt;
            // Ensure location is in correct GeoJSON format
            if (payload.location && payload.location.coordinates) {
                payload.location = {
                    type: 'Point',
                    coordinates: payload.location.coordinates,
                };
            }
            const response = await api.put(`/dustbins/${editingDustbin._id}`, payload);
            toast.success(`Dustbin "${response.name}" updated`);
            setEditingDustbin(null);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update dustbin');
        }
    };

    const handleDeleteDustbin = async (id) => {
        try {
            await api.delete(`/dustbins/${id}`);
            toast.success('Dustbin deleted');
            setShowDeleteConfirm(null);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete dustbin');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
        try {
            await api.put(`/dustbins/${id}/fill`, { status: newStatus });
            toast.success(`Dustbin ${newStatus}`);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleSimulateFill = async (id) => {
        // Prompt for fill percentage
        const fill = prompt('Enter fill percentage (0-100):', '50');
        if (fill === null) return;
        const percent = parseFloat(fill);
        if (isNaN(percent) || percent < 0 || percent > 100) {
            toast.error('Invalid fill percentage');
            return;
        }
        try {
            await api.post(`/dustbins/${id}/simulate-fill`, { fillPercent: percent });
            toast.success(`Fill simulated to ${percent}%`);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to simulate fill');
        }
    };

    // ─── Refresh ──────────────────────────────────────────────────
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([refetch(), fetchZones(false), fetchStats()]);
        setIsRefreshing(false);
        toast.success('Refreshed');
    };

    // ─── Render helpers ───────────────────────────────────────────
    const getStatusBadge = (status) => {
        const colors = {
            AVAILABLE: 'bg-green-500/20 text-green-400',
            NEARLY_FULL: 'bg-yellow-500/20 text-yellow-400',
            FULL: 'bg-red-500/20 text-red-400',
            OFFLINE: 'bg-gray-500/20 text-gray-400',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    const getFillColor = (fill) => {
        if (fill >= 90) return 'bg-red-500';
        if (fill >= 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // ─── Render ────────────────────────────────────────────────────
    if (loading || zonesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading dustbins: {error}
                <button onClick={handleRefresh} className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                    Retry
                </button>
            </div>
        );
    }

    const canAddDustbin = zones.length > 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dustbins</h1>
                    <p className="text-sm text-gray-400">
                        {filteredDustbins.length} of {dustbins.length} dustbin{dustbins.length !== 1 ? 's' : ''} configured
                        {zoneError && ` (Zone fetch error: ${zoneError})`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={!canAddDustbin}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${canAddDustbin
                                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        title={!canAddDustbin ? 'Please create a zone first' : ''}
                    >
                        <Plus className="w-4 h-4" /> Add Dustbin
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ─── Stats Summary ───────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                    <div className="bg-gray-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-gray-400">Total</p>
                    </div>
                    <div className="bg-green-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-400">{stats.available}</p>
                        <p className="text-xs text-gray-400">Available</p>
                    </div>
                    <div className="bg-yellow-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-yellow-400">{stats.nearlyFull}</p>
                        <p className="text-xs text-gray-400">Nearly Full</p>
                    </div>
                    <div className="bg-red-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-400">{stats.full}</p>
                        <p className="text-xs text-gray-400">Full</p>
                    </div>
                    <div className="bg-blue-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-400">{stats.avgFill}%</p>
                        <p className="text-xs text-gray-400">Avg Fill</p>
                    </div>
                    <div className="bg-purple-800/50 p-3 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-400">{stats.totalCapacity}</p>
                        <p className="text-xs text-gray-400">Total Cap.</p>
                    </div>
                </div>
            )}

            {/* ─── Filters ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or zone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border border-gray-700 rounded-lg px-3 py-1.5 text-white w-full focus:ring-2 focus:ring-primary"
                    />
                </div>
                <select
                    value={filterZone}
                    onChange={(e) => setFilterZone(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Zones</option>
                    {zones.map((z) => (
                        <option key={z._id} value={z._id}>{z.name}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="NEARLY_FULL">Nearly Full</option>
                    <option value="FULL">Full</option>
                    <option value="OFFLINE">Offline</option>
                </select>
                <select
                    value={filterFill}
                    onChange={(e) => setFilterFill(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">Fill Level</option>
                    <option value="LOW">Low (&lt;33%)</option>
                    <option value="MEDIUM">Medium (33-66%)</option>
                    <option value="HIGH">High (66-90%)</option>
                    <option value="FULL">Full (≥90%)</option>
                </select>
                {zoneError && (
                    <button
                        onClick={() => fetchZones(true)}
                        className="text-xs text-yellow-400 hover:underline"
                    >
                        Retry zones
                    </button>
                )}
            </div>

            {/* ─── Warning: No zones ───────────────────────────────── */}
            {!canAddDustbin && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-400">
                    ⚠️ You need at least one zone before you can add a dustbin.
                    <button
                        onClick={() => navigate('/zones')}
                        className="ml-4 text-primary hover:underline"
                    >
                        Create a zone
                    </button>
                    <button
                        onClick={() => fetchZones(true)}
                        className="ml-4 text-blue-400 hover:underline"
                    >
                        Reload zones
                    </button>
                </div>
            )}

            {/* ─── Dustbin Grid ────────────────────────────────────── */}
            {filteredDustbins.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <Gauge className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>{dustbins.length === 0 ? 'No dustbins found.' : 'No dustbins match your filters.'}</p>
                    {canAddDustbin && dustbins.length === 0 && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            Add your first dustbin
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDustbins.map((db) => (
                        <div
                            key={db._id}
                            className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 hover:border-primary/30 transition-all overflow-hidden"
                        >
                            {/* ─── Fill Level Bar ───────────────────────────── */}
                            <div className="relative h-3 bg-gray-800">
                                <div
                                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${getFillColor(db.fillPercent)}`}
                                    style={{ width: `${Math.min(db.fillPercent, 100)}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                    {Math.round(db.fillPercent)}%
                                </span>
                            </div>

                            {/* ─── Card Body ────────────────────────────────── */}
                            <div className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-white font-semibold">{db.name}</h3>
                                        <p className="text-gray-400 text-sm flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {db.zoneId?.name || 'Unknown zone'}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(db.status)}`}
                                    >
                                        {db.status}
                                    </span>
                                </div>

                                {/* Quick metrics */}
                                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
                                    <div><span className="text-gray-500">Capacity:</span> {db.capacity} L</div>
                                    <div><span className="text-gray-500">Last updated:</span> {db.lastUpdate ? new Date(db.lastUpdate).toLocaleTimeString() : 'Never'}</div>
                                    {db.estimatedDaysToFull && (
                                        <div className="col-span-2">
                                            <span className="text-gray-500">Estimated to full:</span> {db.estimatedDaysToFull} days
                                        </div>
                                    )}
                                </div>

                                {/* ─── Action Buttons ────────────────────────── */}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => handleSimulateFill(db._id)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"
                                        title="Simulate fill (demo)"
                                    >
                                        <Droplet className="w-4 h-4" /> Simulate
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(db._id, db.status)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition text-sm"
                                        title={db.status === 'AVAILABLE' ? 'Set Offline' : 'Set Available'}
                                    >
                                        {db.status === 'AVAILABLE' ? (
                                            <PowerOff className="w-4 h-4 text-red-400" />
                                        ) : (
                                            <Power className="w-4 h-4 text-green-400" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setEditingDustbin(db)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition text-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(db._id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-red-600/50 transition text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setExpandedDustbin(expandedDustbin === db._id ? null : db._id)}
                                        className="flex items-center justify-center px-2 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition"
                                    >
                                        {expandedDustbin === db._id ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* ─── Expanded details ────────────────────────── */}
                                {expandedDustbin === db._id && (
                                    <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-300 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => navigate(`/dustbins/${db._id}/history`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                                            >
                                                <Clock className="w-3 h-3" /> History
                                            </button>
                                            <button
                                                onClick={() => navigate(`/dustbins/${db._id}/cleaning`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                                            >
                                                <Calendar className="w-3 h-3" /> Cleaning
                                            </button>
                                            <button
                                                onClick={() => navigate(`/dustbins/${db._id}/maintenance`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20"
                                            >
                                                <Activity className="w-3 h-3" /> Maintenance
                                            </button>
                                            <button
                                                onClick={() => navigate(`/dustbins/${db._id}/performance`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20"
                                            >
                                                <BarChart3 className="w-3 h-3" /> Performance
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            ID: {db._id} · Created: {new Date(db.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Coordinates: {db.location?.coordinates?.join(', ') || 'N/A'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Add/Edit Modal ────────────────────────────────────── */}
            {(showAddModal || editingDustbin) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                {editingDustbin ? 'Edit Dustbin' : 'Add Dustbin'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingDustbin(null);
                                }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={editingDustbin ? handleUpdateDustbin : handleAddDustbin} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingDustbin ? editingDustbin.name : newDustbin.name}
                                    onChange={(e) =>
                                        editingDustbin
                                            ? setEditingDustbin({ ...editingDustbin, name: e.target.value })
                                            : setNewDustbin({ ...newDustbin, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Bin A-12"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Zone</label>
                                <select
                                    value={editingDustbin ? editingDustbin.zoneId : newDustbin.zoneId}
                                    onChange={(e) =>
                                        editingDustbin
                                            ? setEditingDustbin({ ...editingDustbin, zoneId: e.target.value })
                                            : setNewDustbin({ ...newDustbin, zoneId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    disabled={zones.length === 0}
                                >
                                    <option value="">Select a zone</option>
                                    {zones.map((z) => (
                                        <option key={z._id} value={z._id}>{z.name}</option>
                                    ))}
                                </select>
                                {zones.length === 0 && (
                                    <p className="text-yellow-400 text-sm mt-1">No zones available. Please create one first.</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editingDustbin ? editingDustbin.location?.coordinates?.[0] || '' : newDustbin.location.coordinates[0]}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingDustbin) {
                                                setEditingDustbin({
                                                    ...editingDustbin,
                                                    location: {
                                                        ...editingDustbin.location,
                                                        coordinates: [val, editingDustbin.location?.coordinates?.[1] || ''],
                                                    },
                                                });
                                            } else {
                                                setNewDustbin({
                                                    ...newDustbin,
                                                    location: {
                                                        ...newDustbin.location,
                                                        coordinates: [val, newDustbin.location.coordinates[1]],
                                                    },
                                                });
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="77.2090"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editingDustbin ? editingDustbin.location?.coordinates?.[1] || '' : newDustbin.location.coordinates[1]}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (editingDustbin) {
                                                setEditingDustbin({
                                                    ...editingDustbin,
                                                    location: {
                                                        ...editingDustbin.location,
                                                        coordinates: [editingDustbin.location?.coordinates?.[0] || '', val],
                                                    },
                                                });
                                            } else {
                                                setNewDustbin({
                                                    ...newDustbin,
                                                    location: {
                                                        ...newDustbin.location,
                                                        coordinates: [newDustbin.location.coordinates[0], val],
                                                    },
                                                });
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="28.6139"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Capacity (L)</label>
                                    <input
                                        type="number"
                                        value={editingDustbin ? editingDustbin.capacity : newDustbin.capacity}
                                        onChange={(e) =>
                                            editingDustbin
                                                ? setEditingDustbin({ ...editingDustbin, capacity: parseInt(e.target.value) || 240 })
                                                : setNewDustbin({ ...newDustbin, capacity: parseInt(e.target.value) || 240 })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Fill %</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editingDustbin ? editingDustbin.fillPercent : newDustbin.fillPercent}
                                        onChange={(e) =>
                                            editingDustbin
                                                ? setEditingDustbin({ ...editingDustbin, fillPercent: parseFloat(e.target.value) || 0 })
                                                : setNewDustbin({ ...newDustbin, fillPercent: parseFloat(e.target.value) || 0 })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Status</label>
                                <select
                                    value={editingDustbin ? editingDustbin.status : newDustbin.status}
                                    onChange={(e) =>
                                        editingDustbin
                                            ? setEditingDustbin({ ...editingDustbin, status: e.target.value })
                                            : setNewDustbin({ ...newDustbin, status: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="NEARLY_FULL">Nearly Full</option>
                                    <option value="FULL">Full</option>
                                    <option value="OFFLINE">Offline</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingDustbin(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding || zones.length === 0}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAdding ? 'Saving...' : (editingDustbin ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                        <p className="text-gray-400 mt-2">Are you sure you want to delete this dustbin? This action cannot be undone.</p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteDustbin(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dustbins;