// frontend/src/pages/Speakers.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
    Speaker,
    Plus,
    X,
    RefreshCw,
    Edit,
    Trash2,
    Power,
    PowerOff,
    Play,
    Volume2,
    AlertCircle,
    Search,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────

// Simple in‑memory cache with TTL
const cache = {
    zones: { data: null, timestamp: 0, ttl: 60000 }, // 1 minute
    speakers: { data: null, timestamp: 0, ttl: 30000 }, // 30 seconds
};

const getCache = (key) => {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
        entry.data = null;
        return null;
    }
    return entry.data;
};

const setCache = (key, data) => {
    cache[key].data = data;
    cache[key].timestamp = Date.now();
};

// Fetch with exponential backoff for 429
const fetchWithRetry = async (url, options = {}, retries = 3, delay = 500) => {
    try {
        const response = await api.get(url, options);
        return response;
    } catch (err) {
        if (err.response?.status === 429 && retries > 0) {
            const wait = delay * (4 - retries); // 500, 1000, 2000
            await new Promise(resolve => setTimeout(resolve, wait));
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw err;
    }
};

// ─── Main Component ──────────────────────────────────────────────

const Speakers = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const socket = useSocket()?.socket;

    // ─── State ──────────────────────────────────────────────────────
    const [speakers, setSpeakers] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSpeaker, setEditingSpeaker] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [announceModal, setAnnounceModal] = useState(null);
    const [announceText, setAnnounceText] = useState('');
    const [filterZone, setFilterZone] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSpeaker, setExpandedSpeaker] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // ─── Data fetching (with cache and dedupe) ──────────────────
    const fetchData = useCallback(async (force = false) => {
        // Prevent concurrent fetches
        if (fetchData.lock && !force) return;
        fetchData.lock = true;

        try {
            setError(null);
            if (!force) setLoading(true);

            // 1. Fetch zones (cached)
            let zonesData = getCache('zones');
            if (!zonesData || force) {
                const resp = await fetchWithRetry('/zones');
                zonesData = resp.data?.zones || (Array.isArray(resp.data) ? resp.data : []);
                setCache('zones', zonesData);
            }
            setZones(zonesData);

            // 2. Fetch speakers (cached)
            let speakersData = getCache('speakers');
            if (!speakersData || force) {
                const resp = await fetchWithRetry('/speakers');
                speakersData = resp.data?.speakers || (Array.isArray(resp.data) ? resp.data : []);
                setCache('speakers', speakersData);
            }
            setSpeakers(speakersData);

        } catch (err) {
            console.error('Fetch error:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to load data';
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error('Session expired. Please login again.');
                logout();
                navigate('/login');
            } else if (err.response?.status === 429) {
                toast.error('Too many requests – please wait a moment.');
            } else {
                setError(msg);
                toast.error(msg);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchData.lock = false;
        }
    }, [logout, navigate]);

    // Unlock on unmount
    useEffect(() => {
        return () => { fetchData.lock = false; };
    }, []);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Debounced refetch ──────────────────────────────────────
    const refetchDebounce = useRef(null);
    const refetch = useCallback((force = false) => {
        if (refetchDebounce.current) {
            clearTimeout(refetchDebounce.current);
        }
        setRefreshing(true);
        refetchDebounce.current = setTimeout(() => {
            fetchData(force);
        }, 500);
    }, [fetchData]);

    // ─── Socket events ──────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handleStatusUpdate = () => {
            // Refresh speakers (with debounce) but not zones (they don't change)
            refetch(false);
        };
        socket.on('speaker:status', handleStatusUpdate);
        return () => {
            socket.off('speaker:status', handleStatusUpdate);
        };
    }, [socket, refetch]);

    // ─── Filtered list ──────────────────────────────────────────
    const filteredSpeakers = useMemo(() => {
        return speakers.filter((sp) => {
            const matchZone = filterZone ? sp.zoneId?._id === filterZone : true;
            const matchSearch = searchTerm
                ? sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (sp.zoneId?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
                : true;
            return matchZone && matchSearch;
        });
    }, [speakers, filterZone, searchTerm]);

    // ─── CRUD operations ────────────────────────────────────────
    const handleAddSpeaker = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value.trim();
        const zoneId = form.zoneId.value;
        const ipAddress = form.ipAddress.value.trim();
        const port = form.port.value || 8080;
        const volume = form.volume.value || 80;

        if (!name || !zoneId) {
            toast.error('Name and zone are required');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/speakers', { name, zoneId, ipAddress, port, volume });
            toast.success('Speaker added');
            setShowAddModal(false);
            refetch(true); // force refresh
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to add speaker';
            if (err.response?.status === 403) {
                toast.error('Permission denied. Please login again.');
                logout();
                navigate('/login');
            } else {
                toast.error(msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSpeaker = async (e) => {
        e.preventDefault();
        if (!editingSpeaker) return;
        const form = e.target;
        const name = form.name.value.trim();
        const zoneId = form.zoneId.value;
        const ipAddress = form.ipAddress.value.trim();
        const port = form.port.value || 8080;
        const volume = form.volume.value || 80;

        if (!name || !zoneId) {
            toast.error('Name and zone are required');
            return;
        }

        setIsSaving(true);
        try {
            await api.put(`/speakers/${editingSpeaker._id}`, { name, zoneId, ipAddress, port, volume });
            toast.success('Speaker updated');
            setEditingSpeaker(null);
            refetch(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update speaker';
            if (err.response?.status === 403) {
                toast.error('Permission denied. Please login again.');
                logout();
                navigate('/login');
            } else {
                toast.error(msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSpeaker = async (id) => {
        try {
            await api.delete(`/speakers/${id}`);
            toast.success('Speaker deleted');
            setDeleteConfirm(null);
            refetch(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete speaker';
            if (err.response?.status === 403) {
                toast.error('Permission denied. Please login again.');
                logout();
                navigate('/login');
            } else {
                toast.error(msg);
            }
        }
    };

    const handleToggleStatus = async (speaker) => {
        const newStatus = speaker.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        try {
            await api.put(`/speakers/${speaker._id}/status`, { status: newStatus });
            toast.success(`Speaker ${newStatus.toLowerCase()}`);
            refetch(false); // don't force, just refresh cache
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to toggle status';
            if (err.response?.status === 403) {
                toast.error('Permission denied. Please login again.');
                logout();
                navigate('/login');
            } else {
                toast.error(msg);
            }
        }
    };

    const handleAnnounce = async (speakerId) => {
        if (!announceText.trim()) {
            toast.error('Announcement text is required');
            return;
        }
        try {
            await api.post(`/speakers/${speakerId}/announce`, { text: announceText });
            toast.success('Announcement sent');
            setAnnounceModal(null);
            setAnnounceText('');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send announcement';
            if (err.response?.status === 403) {
                toast.error('Permission denied. Please login again.');
                logout();
                navigate('/login');
            } else {
                toast.error(msg);
            }
        }
    };

    // ─── Loading / Error ──────────────────────────────────────────
    if (loading && !speakers.length && !zones.length) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error && !speakers.length && !zones.length) {
        return (
            <div className="p-6 text-center">
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-xl max-w-md mx-auto">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Failed to load data</p>
                    <p className="text-sm opacity-80">{error}</p>
                    <button
                        onClick={() => refetch(true)}
                        className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                    >
                        <RefreshCw className="w-4 h-4 inline mr-2" /> Retry
                    </button>
                </div>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Speaker className="w-7 h-7 text-primary" /> Speakers
                    </h1>
                    <p className="text-sm text-gray-400">
                        {filteredSpeakers.length} of {speakers.length} speaker{speakers.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Speaker
                    </button>
                    <button
                        onClick={() => refetch(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
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
            </div>

            {/* Grid */}
            {filteredSpeakers.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <Speaker className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>{speakers.length === 0 ? 'No speakers found.' : 'No speakers match your filters.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSpeakers.map((sp) => (
                        <SpeakerCard
                            key={sp._id}
                            speaker={sp}
                            onEdit={() => setEditingSpeaker(sp)}
                            onDelete={() => setDeleteConfirm(sp._id)}
                            onToggle={() => handleToggleStatus(sp)}
                            onAnnounce={() => setAnnounceModal(sp._id)}
                            expanded={expandedSpeaker === sp._id}
                            setExpanded={() => setExpandedSpeaker(expandedSpeaker === sp._id ? null : sp._id)}
                            zoneName={zones.find(z => z._id === sp.zoneId?._id)?.name || 'Unknown'}
                        />
                    ))}
                </div>
            )}

            {/* Modals (unchanged from previous version) */}
            {/* Add/Edit Modal */}
            {(showAddModal || editingSpeaker) && (
                <Modal
                    title={editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSpeaker(null);
                    }}
                    onSubmit={editingSpeaker ? handleUpdateSpeaker : handleAddSpeaker}
                    isSaving={isSaving}
                >
                    <SpeakerForm
                        initialData={editingSpeaker}
                        zones={zones}
                        onCancel={() => {
                            setShowAddModal(false);
                            setEditingSpeaker(null);
                        }}
                    />
                </Modal>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <ConfirmModal
                    title="Delete Speaker"
                    message="Are you sure you want to delete this speaker? This action cannot be undone."
                    onConfirm={() => handleDeleteSpeaker(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}

            {/* Announce Modal */}
            {announceModal && (
                <Modal
                    title="Send Announcement"
                    onClose={() => {
                        setAnnounceModal(null);
                        setAnnounceText('');
                    }}
                    onSubmit={() => handleAnnounce(announceModal)}
                    isSaving={false}
                    submitLabel="Send"
                >
                    <div className="space-y-4">
                        <label className="block text-gray-400 text-sm">Announcement Text</label>
                        <textarea
                            value={announceText}
                            onChange={(e) => setAnnounceText(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            rows="3"
                            placeholder="Enter the announcement..."
                        />
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── Sub‑components (same as before) ─────────────────────────────

const SpeakerCard = ({ speaker, onEdit, onDelete, onToggle, onAnnounce, expanded, setExpanded, zoneName }) => {
    const statusBadge = speaker.status === 'ONLINE'
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30';

    return (
        <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-primary/40 transition-all overflow-hidden hover:shadow-lg hover:shadow-primary/5 group">
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-white font-semibold truncate">{speaker.name}</h3>
                        <p className="text-gray-400 text-sm truncate">Zone: {zoneName}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusBadge}`}>
                        {speaker.status}
                    </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-400">
                    <div><span className="text-gray-500">IP:</span> {speaker.ipAddress || 'N/A'}</div>
                    <div><span className="text-gray-500">Port:</span> {speaker.port || 8080}</div>
                    <div><span className="text-gray-500">Volume:</span> {speaker.volume || 80}%</div>
                    <div><span className="text-gray-500">Last Heartbeat:</span> {speaker.lastHeartbeat ? new Date(speaker.lastHeartbeat).toLocaleTimeString() : 'Never'}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        onClick={onAnnounce}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm"
                    >
                        <Volume2 className="w-4 h-4" /> Announce
                    </button>
                    <button
                        onClick={onToggle}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition text-sm ${speaker.status === 'ONLINE'
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                    >
                        {speaker.status === 'ONLINE' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        {speaker.status === 'ONLINE' ? 'Offline' : 'Online'}
                    </button>
                    <button
                        onClick={setExpanded}
                        className="p-1.5 bg-gray-700/30 rounded-lg hover:bg-gray-600/50 transition"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {expanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                        <button
                            onClick={onEdit}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"
                        >
                            <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button
                            onClick={onDelete}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Modal = ({ title, onClose, onSubmit, isSaving, children, submitLabel = 'Save' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
            </div>
            <form onSubmit={onSubmit}>
                {children}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const SpeakerForm = ({ initialData, zones, onCancel }) => {
    const [data, setData] = useState({
        name: initialData?.name || '',
        zoneId: initialData?.zoneId?._id || initialData?.zoneId || '',
        ipAddress: initialData?.ipAddress || '',
        port: initialData?.port || 8080,
        volume: initialData?.volume || 80,
    });

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-gray-400 text-sm mb-1">Name</label>
                <input
                    type="text"
                    name="name"
                    value={data.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                />
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">Zone</label>
                <select
                    name="zoneId"
                    value={data.zoneId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                >
                    <option value="">Select a zone</option>
                    {zones.map((z) => (
                        <option key={z._id} value={z._id}>{z.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-gray-400 text-sm mb-1">IP Address (optional)</label>
                <input
                    type="text"
                    name="ipAddress"
                    value={data.ipAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 192.168.1.100"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Port</label>
                    <input
                        type="number"
                        name="port"
                        value={data.port}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        min="1"
                        max="65535"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm mb-1">Volume (%)</label>
                    <input
                        type="number"
                        name="volume"
                        value={data.volume}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
                        max="100"
                    />
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-gray-400 mt-2">{message}</p>
            <div className="flex gap-3 mt-4">
                <button onClick={onCancel} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
                    Cancel
                </button>
                <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                    Delete
                </button>
            </div>
        </div>
    </div>
);

export default Speakers;