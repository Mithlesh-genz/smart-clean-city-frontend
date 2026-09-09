// frontend/src/pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    CheckCircle,
    AlertCircle,
    Info,
    Trash2,
    Check,
    CheckCheck,
    RefreshCw,
    Filter,
    Search,
    Clock,
    Eye,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useFetch, useMutation } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
    const { user } = useAuth();
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // Fetch notifications
    const {
        data: notificationsData,
        loading,
        error,
        refetch,
    } = useFetch('/notifications', {
        cacheTime: 30000, // 30s cache
    });

    const notifications = notificationsData?.data || [];

    // Mutations
    const { mutate: markRead } = useMutation('/notifications/:id/read', {
        method: 'PATCH',
        onSuccess: () => {
            toast.success('Marked as read');
            refetch();
        },
        onError: () => toast.error('Failed to mark as read'),
    });

    const { mutate: markAllRead } = useMutation('/notifications/read-all', {
        method: 'POST',
        onSuccess: () => {
            toast.success('All marked as read');
            refetch();
        },
        onError: () => toast.error('Failed to mark all as read'),
    });

    const { mutate: deleteNotif } = useMutation('/notifications/:id', {
        method: 'DELETE',
        onSuccess: () => {
            toast.success('Deleted');
            refetch();
        },
        onError: () => toast.error('Failed to delete'),
    });

    // Filtering
    const filtered = notifications.filter((n) => {
        if (filter === 'unread' && n.read) return false;
        if (filter === 'read' && !n.read) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                n.title?.toLowerCase().includes(q) ||
                n.message?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkRead = (id) => markRead({}, { url: `/notifications/${id}/read` });
    const handleDelete = (id) => {
        if (window.confirm('Delete this notification?')) {
            deleteNotif({}, { url: `/notifications/${id}` });
        }
    };
    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Delete ${selectedIds.length} notifications?`)) {
            selectedIds.forEach((id) => deleteNotif({}, { url: `/notifications/${id}` }));
            setSelectedIds([]);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map((n) => n._id));
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert':
                return <AlertCircle className="w-5 h-5 text-red-400" />;
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-400" />;
            default:
                return <Info className="w-5 h-5 text-blue-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto" />
                    <p className="mt-4 text-sm text-slate-400">Loading notifications...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg text-white">
                <div className="text-center max-w-md p-6 bg-white/5 rounded-2xl border border-white/10">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-slate-400">{error}</p>
                    <button onClick={refetch} className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-white p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Bell className="w-6 h-6 text-emerald-400" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="ml-2 text-sm bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                    {unreadCount} unread
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Stay updated with the latest city alerts and events
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={refetch}
                            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllRead()}
                                className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm transition"
                            >
                                <CheckCheck className="w-4 h-4" /> Mark all read
                            </button>
                        )}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition"
                            >
                                <Trash2 className="w-4 h-4" /> Delete selected ({selectedIds.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
                        {['all', 'unread', 'read'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm rounded-md transition ${filter === f
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
                        />
                    </div>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-12 text-center">
                        <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No notifications</p>
                        <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
                            <button onClick={toggleSelectAll} className="hover:text-white transition">
                                {selectedIds.length === filtered.length ? 'Deselect all' : 'Select all'}
                            </button>
                            <span>•</span>
                            <span>{filtered.length} items</span>
                        </div>
                        {filtered.map((notif) => (
                            <div
                                key={notif._id}
                                className={`group relative rounded-xl border transition-all duration-200 ${notif.read
                                        ? 'border-white/5 bg-white/[0.02]'
                                        : 'border-emerald-400/20 bg-emerald-500/[0.04]'
                                    } hover:border-emerald-400/40 hover:bg-white/[0.04]`}
                            >
                                <div className="flex items-start gap-4 p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(notif._id)}
                                        onChange={() => toggleSelect(notif._id)}
                                        className="mt-1 w-4 h-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400"
                                    />
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className={`text-sm font-medium ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                                {notif.title}
                                            </h4>
                                            {!notif.read && (
                                                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-sm mt-1 ${notif.read ? 'text-slate-400' : 'text-slate-300'}`}>
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </span>
                                            {notif.read && (
                                                <span className="flex items-center gap-1 text-slate-600">
                                                    <Eye className="w-3 h-3" /> Read
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                        {!notif.read && (
                                            <button
                                                onClick={() => handleMarkRead(notif._id)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition"
                                                title="Mark as read"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(notif._id)}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;