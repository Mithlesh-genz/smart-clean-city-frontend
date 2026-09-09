// frontend/src/pages/Tasks.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import {
    RefreshCw, ChevronDown, ChevronUp, Eye, Edit, Trash2,
    CheckCircle, AlertCircle, Clock, Filter, X, Plus, UserPlus, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Tasks = () => {
    const socket = useSocket();
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        assignedTo: '',
        zoneId: '',
        eventId: '',
    });
    const [sort, setSort] = useState({ field: 'createdAt', order: 'desc' });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [selectedTasks, setSelectedTasks] = useState([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [zones, setZones] = useState([]);
    const [staff, setStaff] = useState([]);
    const [stats, setStats] = useState(null);

    // ─── Build query params ──────────────────────────────────────
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

    // ─── Fetch tasks ─────────────────────────────────────────────
    const { data: tasksData, loading, error, refetch } = useFetch(`/cleaning-tasks?${queryParams}`, { immediate: true });

    const taskList = Array.isArray(tasksData?.data) ? tasksData.data : [];
    const total = tasksData?.pagination?.total || 0;
    const pages = Math.ceil(total / pageSize);

    // ─── Fetch zones & staff ─────────────────────────────────────
    useEffect(() => {
        const fetchZones = async () => {
            try {
                const res = await api.get('/zones');
                const zoneArray = Array.isArray(res) ? res : res?.data || [];
                setZones(zoneArray);
            } catch (err) { console.warn('Zones fetch failed', err); }
        };
        const fetchStaff = async () => {
            try {
                const res = await api.get('/users?role=CLEANING_STAFF');
                const staffArr = Array.isArray(res) ? res : res?.data || [];
                setStaff(staffArr);
            } catch (err) { console.warn('Staff fetch failed', err); }
        };
        fetchZones();
        fetchStaff();
    }, []);

    // ─── Fetch stats ──────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/cleaning-tasks/stats');
            setStats(res);
        } catch (err) { console.warn('Stats fetch failed', err); }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // ─── Socket real-time ──────────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;

        const handlers = {
            'task:new': () => { toast.success('New task created'); refetch(); fetchStats(); },
            'task:update': () => { refetch(); fetchStats(); },
            'task:delete': () => { refetch(); fetchStats(); },
            'task:assigned': () => { refetch(); fetchStats(); }
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            Object.keys(handlers).forEach(event => {
                socket.off(event);
            });
        };
    }, [socket, refetch, fetchStats]);

    // ─── Handlers ──────────────────────────────────────────────────
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
        setSelectedTasks([]);
    };

    const handleSort = (field) => {
        setSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
        setPage(1);
    };

    const handleSelectAll = () => {
        if (selectedTasks.length === taskList.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(taskList.map(t => t._id));
        }
    };

    const handleSelectTask = (id) => {
        setSelectedTasks(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const openDetailModal = (task) => {
        setSelectedTask(task);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedTask(null);
    };

    const openCreateModal = () => setShowCreateModal(true);
    const closeCreateModal = () => setShowCreateModal(false);

    const handleBulkDelete = async () => {
        if (selectedTasks.length === 0) {
            toast.error('No tasks selected');
            return;
        }
        if (!window.confirm(`Delete ${selectedTasks.length} tasks?`)) return;
        try {
            for (const id of selectedTasks) {
                await api.delete(`/cleaning-tasks/${id}`);
            }
            toast.success(`Deleted ${selectedTasks.length} tasks`);
            setSelectedTasks([]);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk delete failed');
        }
    };

    const handleBulkStatus = async (newStatus) => {
        if (selectedTasks.length === 0) {
            toast.error('No tasks selected');
            return;
        }
        try {
            await api.post('/cleaning-tasks/bulk-status', { taskIds: selectedTasks, status: newStatus });
            toast.success(`Updated ${selectedTasks.length} tasks to ${newStatus}`);
            setSelectedTasks([]);
            refetch();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk update failed');
        }
    };

    // ─── Render ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading tasks: {error}
                <button onClick={refetch} className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cleaning Tasks</h1>
                    <p className="text-sm text-gray-400">{total} tasks total</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Task
                    </button>
                    <button
                        onClick={() => { refetch(); fetchStats(); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* ─── Stats Cards ─────────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Total</div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Pending</div>
                        <div className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">In Progress</div>
                        <div className="text-2xl font-bold text-blue-400">{stats.inProgress || 0}</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
                        <div className="text-gray-400 text-sm">Completed</div>
                        <div className="text-2xl font-bold text-green-400">{stats.completed || 0}</div>
                    </div>
                </div>
            )}

            {/* ─── Filters ──────────────────────────────────────────── */}
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
                    <option value="PENDING">Pending</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                >
                    <option value="">All Priority</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                </select>
                <select
                    value={filters.assignedTo}
                    onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm"
                >
                    <option value="">All Staff</option>
                    {staff.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
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
                    type="text"
                    placeholder="Event ID"
                    value={filters.eventId}
                    onChange={(e) => handleFilterChange('eventId', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm w-32"
                />
                <button
                    onClick={() => {
                        setFilters({ status: '', priority: '', assignedTo: '', zoneId: '', eventId: '' });
                        setPage(1);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition"
                >
                    <X className="w-3 h-3 inline" /> Clear
                </button>
            </div>

            {/* ─── Bulk Actions Bar ────────────────────────────────── */}
            {selectedTasks.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <span className="text-white text-sm">{selectedTasks.length} selected</span>
                    <button
                        onClick={() => handleBulkStatus('COMPLETED')}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
                    >
                        <CheckCircle className="w-3 h-3 inline mr-1" /> Complete
                    </button>
                    <button
                        onClick={() => handleBulkStatus('IN_PROGRESS')}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
                    >
                        <Clock className="w-3 h-3 inline mr-1" /> In Progress
                    </button>
                    <button
                        onClick={() => handleBulkStatus('CANCELLED')}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                    >
                        <AlertCircle className="w-3 h-3 inline mr-1" /> Cancel
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                    >
                        <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                    </button>
                    <button
                        onClick={() => setSelectedTasks([])}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
                    >
                        Deselect
                    </button>
                </div>
            )}

            {/* ─── Task List ────────────────────────────────────────── */}
            {taskList.length === 0 ? (
                <div className="text-center text-gray-400 py-12">No tasks found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 border-b border-gray-700">
                            <tr>
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedTasks.length === taskList.length && taskList.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-600 bg-gray-700"
                                    />
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('taskId')}>
                                    Task ID {sort.field === 'taskId' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('status')}>
                                    Status {sort.field === 'status' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('priority')}>
                                    Priority {sort.field === 'priority' && (sort.order === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                                </th>
                                <th className="px-4 py-3">Assigned To</th>
                                <th className="px-4 py-3">Zone</th>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taskList.map((task) => (
                                <tr key={task._id} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedTasks.includes(task._id)}
                                            onChange={() => handleSelectTask(task._id)}
                                            className="rounded border-gray-600 bg-gray-700"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-white">{task.taskId || task._id}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                                task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' :
                                                    task.status === 'ASSIGNED' ? 'bg-purple-500/20 text-purple-400' :
                                                        task.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                                task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-green-500/20 text-green-400'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{task.assignedTo?.name || 'Unassigned'}</td>
                                    <td className="px-4 py-3">{task.zoneId?.name || 'N/A'}</td>
                                    <td className="px-4 py-3">
                                        {task.eventId ? (
                                            <button
                                                onClick={() => {/* navigate to event detail */ }}
                                                className="text-blue-400 hover:underline text-xs"
                                            >
                                                {task.eventId.eventId || task.eventId}
                                            </button>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => openDetailModal(task)}
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

            {/* ─── Pagination ───────────────────────────────────────── */}
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

            {/* ─── Task Detail Modal ────────────────────────────────── */}
            {showDetailModal && selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={closeDetailModal}
                    onUpdate={() => { refetch(); fetchStats(); }}
                    staff={staff}
                    zones={zones}
                />
            )}

            {/* ─── Create Task Modal ────────────────────────────────── */}
            {showCreateModal && (
                <CreateTaskModal
                    onClose={closeCreateModal}
                    onCreated={() => { refetch(); fetchStats(); }}
                    zones={zones}
                    staff={staff}
                />
            )}
        </div>
    );
};

// ─── TaskDetailModal Component ────────────────────────────────────
const TaskDetailModal = ({ task, onClose, onUpdate, staff, zones }) => {
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({ ...task });
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };
            delete payload._id;
            delete payload.createdAt;
            delete payload.updatedAt;
            const res = await api.put(`/cleaning-tasks/${task._id}`, payload);
            toast.success('Task updated');
            setEditing(false);
            onUpdate();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this task?')) return;
        setLoading(true);
        try {
            await api.delete(`/cleaning-tasks/${task._id}`);
            toast.success('Task deleted');
            onUpdate();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Task Details</h2>
                        <p className="text-xs text-gray-400 font-mono">{task.taskId || task._id}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {editing ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Assigned To</label>
                            <select
                                value={formData.assignedTo?._id || formData.assignedTo || ''}
                                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            >
                                <option value="">Unassigned</option>
                                {staff.map(u => (
                                    <option key={u._id} value={u._id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Notes</label>
                            <textarea
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                                rows="3"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div><span className="text-gray-500">Status:</span> <span className="text-white">{task.status}</span></div>
                            <div><span className="text-gray-500">Priority:</span> <span className="text-white">{task.priority}</span></div>
                            <div><span className="text-gray-500">Assigned To:</span> <span className="text-white">{task.assignedTo?.name || 'Unassigned'}</span></div>
                            <div><span className="text-gray-500">Zone:</span> <span className="text-white">{task.zoneId?.name || 'N/A'}</span></div>
                            <div className="col-span-2"><span className="text-gray-500">Event:</span> <span className="text-white">{task.eventId?.eventId || 'N/A'}</span></div>
                            {task.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="text-white">{task.notes}</span></div>}
                            {task.completedAt && <div><span className="text-gray-500">Completed At:</span> <span className="text-white">{new Date(task.completedAt).toLocaleString()}</span></div>}
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                            >
                                <Edit className="w-4 h-4" /> Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── CreateTaskModal Component ────────────────────────────────────
const CreateTaskModal = ({ onClose, onCreated, zones, staff }) => {
    const [formData, setFormData] = useState({
        zoneId: '',
        assignedTo: '',
        priority: 'MEDIUM',
        notes: '',
        eventId: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.zoneId) {
            toast.error('Zone is required');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/cleaning-tasks', formData);
            toast.success(`Task ${res.taskId || 'created'}`);
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Creation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Create Task</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-lg">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Zone *</label>
                        <select
                            value={formData.zoneId}
                            onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            required
                        >
                            <option value="">Select Zone</option>
                            {zones.map(z => (
                                <option key={z._id} value={z._id}>{z.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Assigned To (optional)</label>
                        <select
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                            <option value="">Unassigned</option>
                            {staff.map(u => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Event ID (optional)</label>
                        <input
                            type="text"
                            value={formData.eventId}
                            onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            placeholder="Event ID"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Notes (optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                            rows="3"
                            placeholder="Task notes"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Tasks;