// frontend/src/pages/Events.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import {
    RefreshCw, ChevronDown, ChevronUp, Eye, Trash2,
    CheckCircle, AlertCircle, Filter, X,
    Send, UserCheck, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Events = () => {
    const socket = useSocket();

    // ─── State ──────────────────────────────────────────────────────
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [zones, setZones] = useState([]);
    const [stats, setStats] = useState(null);

    const [filters, setFilters] = useState({
        status: '',
        zoneId: '',
        dateFrom: '',
        dateTo: '',
        minConfidence: '',
        maxConfidence: '',
    });
    const [sort, setSort] = useState({ field: 'detectedAt', order: 'desc' });
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // ─── Query params ──────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });
        params.append('sortBy', sort.field);
        params.append('sortOrder', sort.order);
        params.append('page', page);
        params.append('limit', pageSize);
        return params.toString();
    }, [filters, sort, page, pageSize]);

    // ─── Fetch events ──────────────────────────────────────────────
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/events?${queryParams}`);
            // Expected: { success: true, data: [...], pagination: { total, page, limit, pages } }
            const data = response.data || [];
            const pagination = response.pagination || { total: 0, pages: 1 };
            setEvents(data);
            setTotal(pagination.total || 0);
            setPages(pagination.pages || 1);
        } catch (err) {
            console.error('Fetch events error:', err);
            setError(err.message || 'Failed to load events');
            toast.error('Could not load events');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    // ─── Fetch zones for filter ────────────────────────────────────
    const fetchZones = useCallback(async () => {
        try {
            const res = await api.get('/zones');
            const zoneArray = Array.isArray(res) ? res : res?.data || [];
            setZones(zoneArray);
        } catch (err) {
            console.warn('Failed to fetch zones', err);
        }
    }, []);

    // ─── Fetch stats ───────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/events/summary');
            setStats(res);
        } catch (err) {
            console.warn('Failed to fetch stats', err);
            // Fallback: compute from events? Not necessary.
        }
    }, []);

    // ─── Initial data load ─────────────────────────────────────────
    useEffect(() => {
        fetchEvents();
        fetchZones();
        fetchStats();
    }, [fetchEvents, fetchZones, fetchStats]);

    // ─── Re‑fetch when filters/page/sort change ──────────────────
    useEffect(() => {
        fetchEvents();
    }, [queryParams]);

    // ─── Socket real‑time updates ──────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;

        const handleNewEvent = () => {
            toast.success('New event detected!');
            fetchEvents();
            fetchStats();
        };
        const handleStatusUpdate = () => {
            fetchEvents();
            fetchStats();
        };
        const handleEventDelete = () => {
            fetchEvents();
            fetchStats();
        };

        socket.on('event:new', handleNewEvent);
        socket.on('event:status', handleStatusUpdate);
        socket.on('event:delete', handleEventDelete);

        return () => {
            socket.off('event:new', handleNewEvent);
            socket.off('event:status', handleStatusUpdate);
            socket.off('event:delete', handleEventDelete);
        };
    }, [socket, fetchEvents, fetchStats]);

    // ─── Handlers ──────────────────────────────────────────────────
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
        setSelectedEvents([]);
    };

    const handleSort = (field) => {
        setSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
        setPage(1);
    };

    const handleSelectAll = () => {
        if (selectedEvents.length === events.length) {
            setSelectedEvents([]);
        } else {
            setSelectedEvents(events.map(e => e._id));
        }
    };

    const handleSelectEvent = (id) => {
        setSelectedEvents(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedEvents.length === 0) {
            toast.error('No events selected');
            return;
        }
        try {
            // Use bulk endpoint if available, else loop
            await api.post('/events/bulk-status', { eventIds: selectedEvents, status: newStatus });
            toast.success(`Updated ${selectedEvents.length} events`);
            setSelectedEvents([]);
            fetchEvents();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk update failed');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedEvents.length === 0) {
            toast.error('No events selected');
            return;
        }
        if (!window.confirm(`Delete ${selectedEvents.length} events?`)) return;
        try {
            // Loop delete – better to have bulk delete endpoint
            for (const id of selectedEvents) {
                await api.delete(`/events/${id}`);
            }
            toast.success(`Deleted ${selectedEvents.length} events`);
            setSelectedEvents([]);
            fetchEvents();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk delete failed');
        }
    };

    const openDetailModal = (event) => {
        setSelectedEvent(event);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedEvent(null);
    };

    const handleEventAction = async (action, data) => {
        if (!selectedEvent) return;
        try {
            if (action === 'resolve') {
                await api.post(`/events/${selectedEvent._id}/resolve`, data);
                toast.success('Event resolved');
            } else if (action === 'assign') {
                await api.post(`/events/${selectedEvent._id}/assign`, data);
                toast.success('Event assigned');
            } else if (action === 'announce') {
                await api.post(`/events/${selectedEvent._id}/announce`, data);
                toast.success('Announcement sent');
            }
            closeDetailModal();
            fetchEvents();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    // ─── Render ────────────────────────────────────────────────────
    if (loading && events.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error: {error}
                <button onClick={fetchEvents} className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Events</h1>
                    <p className="text-sm text-gray-400">{total} events total</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => { fetchEvents(); fetchStats(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* ─── Stats Cards ─────────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Total</div>
                        <div className="text-2xl font-bold text-white">{stats.total || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Today</div>
                        <div className="text-2xl font-bold text-white">{stats.today || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Pending</div>
                        <div className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Resolved</div>
                        <div className="text-2xl font-bold text-green-400">{stats.resolvedToday || 0}</div>
                    </div>
                </div>
            )}

            {/* ─── Filters ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">Filters:</span>
                </div>
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                >
                    <option value="">All Status</option>
                    <option value="DETECTED">Detected</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ANNOUNCEMENT_SENT">Announced</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="FALSE_POSITIVE">False Positive</option>
                </select>
                <select
                    value={filters.zoneId}
                    onChange={(e) => handleFilterChange('zoneId', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                >
                    <option value="">All Zones</option>
                    {zones.map(z => (
                        <option key={z._id} value={z._id}>{z.name}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                />
                <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                />
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={filters.minConfidence}
                        onChange={(e) => handleFilterChange('minConfidence', e.target.value)}
                        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm"
                        placeholder="Min"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={filters.maxConfidence}
                        onChange={(e) => handleFilterChange('maxConfidence', e.target.value)}
                        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm"
                        placeholder="Max"
                    />
                </div>
                <button
                    onClick={() => {
                        setFilters({ status: '', zoneId: '', dateFrom: '', dateTo: '', minConfidence: '', maxConfidence: '' });
                        setPage(1);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition"
                >
                    <X className="w-3 h-3 inline" /> Clear
                </button>
            </div>

            {/* ─── Bulk Actions ────────────────────────────────────────── */}
            {selectedEvents.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <span className="text-white text-sm">{selectedEvents.length} selected</span>
                    <button
                        onClick={() => handleBulkStatusChange('RESOLVED')}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                    >
                        <CheckCircle className="w-3 h-3 inline mr-1" /> Resolve
                    </button>
                    <button
                        onClick={() => handleBulkStatusChange('FALSE_POSITIVE')}
                        className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30"
                    >
                        <AlertCircle className="w-3 h-3 inline mr-1" /> False Positive
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                    >
                        <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                    </button>
                    <button
                        onClick={() => setSelectedEvents([])}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                    >
                        Deselect
                    </button>
                </div>
            )}

            {/* ─── Table ────────────────────────────────────────────────── */}
            {events.length === 0 ? (
                <div className="text-center text-gray-400 py-12">No events found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 border-b border-gray-700">
                            <tr>
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.length === events.length && events.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-600 bg-gray-700"
                                    />
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('eventId')}>
                                    Event ID {sort.field === 'eventId' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('detectedAt')}>
                                    Detected {sort.field === 'detectedAt' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('status')}>
                                    Status {sort.field === 'status' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('confidence')}>
                                    Confidence {sort.field === 'confidence' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3">Zone</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => (
                                <tr key={event._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedEvents.includes(event._id)}
                                            onChange={() => handleSelectEvent(event._id)}
                                            className="rounded border-gray-600 bg-gray-700"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-white">{event.eventId}</td>
                                    <td className="px-4 py-3">{new Date(event.detectedAt).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${event.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                                event.status === 'FALSE_POSITIVE' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    event.status === 'ANNOUNCEMENT_SENT' ? 'bg-purple-500/20 text-purple-400' :
                                                        event.status === 'CONFIRMED' ? 'bg-blue-500/20 text-blue-400' :
                                                            event.status === 'PENDING' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{Math.round(event.confidence * 100)}%</td>
                                    <td className="px-4 py-3">{event.zoneId?.name || 'Unknown'}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => openDetailModal(event)}
                                            className="p-1 hover:bg-gray-700 rounded-lg transition"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4 text-blue-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Pagination ──────────────────────────────────────────── */}
            {pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <div className="text-gray-400 text-sm">
                        Showing {Math.min((page - 1) * pageSize + 1, total)} – {Math.min(page * pageSize, total)} of {total}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition"
                        >
                            Prev
                        </button>
                        <span className="flex items-center px-4 text-white">Page {page}</span>
                        <button
                            onClick={() => setPage(p => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            className="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Detail Modal ────────────────────────────────────────── */}
            {showDetailModal && selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={closeDetailModal}
                    onAction={handleEventAction}
                />
            )}
        </div>
    );
};

// ─── EventDetailModal ─────────────────────────────────────────────
const EventDetailModal = ({ event, onClose, onAction }) => {
    const [actionData, setActionData] = useState({});
    const [loading, setLoading] = useState(false);

    const handleResolve = async () => {
        setLoading(true);
        await onAction('resolve', { resolution: actionData.resolution || 'Resolved', note: actionData.note || '' });
        setLoading(false);
    };

    const handleAssign = async () => {
        if (!actionData.assignedTo) {
            toast.error('Select a staff member');
            return;
        }
        setLoading(true);
        await onAction('assign', { assignedTo: actionData.assignedTo, priority: actionData.priority || 'MEDIUM', note: actionData.note || '' });
        setLoading(false);
    };

    const handleAnnounce = async () => {
        setLoading(true);
        await onAction('announce', { message: actionData.message || 'Litter detected, please clean up.', language: actionData.language || 'EN' });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Event Details</h2>
                        <p className="text-xs text-gray-400 font-mono">{event.eventId}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><span className="text-gray-500">Status:</span> <span className="text-white">{event.status}</span></div>
                    <div><span className="text-gray-500">Confidence:</span> <span className="text-white">{Math.round(event.confidence * 100)}%</span></div>
                    <div><span className="text-gray-500">Detected:</span> <span className="text-white">{new Date(event.detectedAt).toLocaleString()}</span></div>
                    <div><span className="text-gray-500">Zone:</span> <span className="text-white">{event.zoneId?.name || 'Unknown'}</span></div>
                    <div><span className="text-gray-500">Camera:</span> <span className="text-white">{event.cameraId?.name || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Distance:</span> <span className="text-white">{event.distanceToDustbin ? `${Math.round(event.distanceToDustbin)}m` : 'N/A'}</span></div>
                    {event.announcementText && (
                        <div className="col-span-2"><span className="text-gray-500">Announcement:</span> <span className="text-white">{event.announcementText}</span></div>
                    )}
                    {event.location && (
                        <div className="col-span-2">
                            <span className="text-gray-500">Location:</span>
                            <span className="text-white">{event.location.coordinates[1]}, {event.location.coordinates[0]}</span>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-white mb-2">Actions</h4>
                    <div className="space-y-3">
                        {/* Resolve */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                placeholder="Resolution note"
                                value={actionData.resolution || ''}
                                onChange={(e) => setActionData(prev => ({ ...prev, resolution: e.target.value }))}
                                className="flex-1 min-w-[150px] px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            />
                            <button
                                onClick={handleResolve}
                                disabled={loading}
                                className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
                            >
                                Resolve
                            </button>
                        </div>

                        {/* Assign */}
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={actionData.assignedTo || ''}
                                onChange={(e) => setActionData(prev => ({ ...prev, assignedTo: e.target.value }))}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            >
                                <option value="">Assign to...</option>
                                <option value="staff1">Staff 1</option>
                                <option value="staff2">Staff 2</option>
                            </select>
                            <select
                                value={actionData.priority || 'MEDIUM'}
                                onChange={(e) => setActionData(prev => ({ ...prev, priority: e.target.value }))}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                            <input
                                placeholder="Note"
                                value={actionData.note || ''}
                                onChange={(e) => setActionData(prev => ({ ...prev, note: e.target.value }))}
                                className="flex-1 min-w-[100px] px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            />
                            <button
                                onClick={handleAssign}
                                disabled={loading || !actionData.assignedTo}
                                className="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50"
                            >
                                Assign
                            </button>
                        </div>

                        {/* Announce */}
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                placeholder="Custom announcement (optional)"
                                value={actionData.message || ''}
                                onChange={(e) => setActionData(prev => ({ ...prev, message: e.target.value }))}
                                className="flex-1 min-w-[200px] px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            />
                            <select
                                value={actionData.language || 'EN'}
                                onChange={(e) => setActionData(prev => ({ ...prev, language: e.target.value }))}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            >
                                <option value="EN">English</option>
                                <option value="HI">Hindi</option>
                                <option value="PA">Punjabi</option>
                            </select>
                            <button
                                onClick={handleAnnounce}
                                disabled={loading}
                                className="px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
                            >
                                Announce
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Events;