// frontend/src/pages/Users.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    Shield,
    ShieldOff,
    RefreshCw,
    UserPlus,
    X,
    Edit,
    Trash2,
    Eye,
    Search,
    ChevronDown,
    ChevronUp,
    Power,
    PowerOff,
    Key,
    Mail,
    Phone,
    User,
    Building,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const UsersPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const isManager = user?.role === 'MANAGER' || isAdmin;

    // ─── State ──────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        role: '',
        status: '',
        department: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    });
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({});
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ─── Modals ────────────────────────────────────────────────────
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(null);
    const [showViewModal, setShowViewModal] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ─── Form states ──────────────────────────────────────────────
    const [newUser, setNewUser] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'viewer',
        department: '',
    });

    const [editUser, setEditUser] = useState(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // ─── Fetch users with filters ────────────────────────────────
    const fetchUsers = useCallback(async (showLoading = true) => {
        if (!isAdmin && !isManager) return;
        if (showLoading) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            const response = await api.get(`/users?${params.toString()}`);
            // response is the data from interceptor (success: true, users, pagination, stats)
            if (response.success === false) throw new Error(response.message);
            setUsers(response.users || []);
            setPagination(response.pagination || {});
            setStats(response.stats || {});
        } catch (err) {
            console.error('Fetch users error:', err);
            setError(err.message || 'Failed to load users');
            toast.error('Failed to load users');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [filters, isAdmin, isManager]);

    // ─── Initial fetch ─────────────────────────────────────────────
    useEffect(() => {
        if (isAdmin || isManager) {
            fetchUsers(true);
        }
    }, [fetchUsers, isAdmin, isManager]);

    // ─── Handlers ──────────────────────────────────────────────────
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchUsers(false);
        setIsRefreshing(false);
        toast.success('Refreshed');
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const handleSort = (field) => {
        setFilters((prev) => ({
            ...prev,
            sortBy: field,
            sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
        }));
    };

    // ─── CRUD ──────────────────────────────────────────────────────
    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
            toast.error('Please fill all required fields');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = { ...newUser };
            const response = await api.post('/users', payload);
            toast.success(`User ${response.user.firstName} ${response.user.lastName} created`);
            setShowAddModal(false);
            setNewUser({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                phone: '',
                role: 'viewer',
                department: '',
            });
            fetchUsers(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editUser) return;
        setIsSubmitting(true);
        try {
            const payload = { ...editUser };
            delete payload._id;
            delete payload.__v;
            delete payload.createdAt;
            delete payload.updatedAt;
            const response = await api.put(`/users/${editUser._id}`, payload);
            toast.success(`User ${response.user.firstName} updated`);
            setShowEditModal(false);
            setEditUser(null);
            fetchUsers(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            await api.delete(`/users/${id}`);
            toast.success('User deleted');
            setShowDeleteConfirm(null);
            fetchUsers(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await api.patch(`/users/${id}/status`, { status: newStatus });
            toast.success(`User ${newStatus}`);
            fetchUsers(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwordData;
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        setIsSubmitting(true);
        try {
            const userId = showPasswordModal;
            await api.post(`/users/${userId}/change-password`, {
                currentPassword,
                newPassword,
                confirmPassword,
            });
            toast.success('Password changed successfully');
            setShowPasswordModal(null);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Render helpers ───────────────────────────────────────────
    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-blue-500/20 text-blue-400',
            manager: 'bg-purple-500/20 text-purple-400',
            operator: 'bg-green-500/20 text-green-400',
            viewer: 'bg-gray-500/20 text-gray-400',
        };
        return colors[role] || 'bg-gray-500/20 text-gray-400';
    };

    const getStatusBadge = (status) => {
        const colors = {
            active: 'bg-green-500/20 text-green-400',
            inactive: 'bg-red-500/20 text-red-400',
            suspended: 'bg-yellow-500/20 text-yellow-400',
            pending: 'bg-orange-500/20 text-orange-400',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    // ─── Access control ────────────────────────────────────────────
    if (!isAdmin && !isManager) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                    <ShieldOff className="w-6 h-6 text-red-400" />
                    <h1 className="text-2xl font-bold text-white">Users</h1>
                </div>
                <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-8 text-center">
                    <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Restricted Access</p>
                    <p className="text-gray-500 text-sm mt-2">
                        You need <span className="text-primary">Admin</span> or{' '}
                        <span className="text-primary">Manager</span> privileges to view users.
                    </p>
                </div>
            </div>
        );
    }

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
                Error: {error}
                <button onClick={handleRefresh} className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
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
                    <h1 className="text-2xl font-bold text-white">Users</h1>
                    <p className="text-sm text-gray-400">
                        {pagination.total} user{pagination.total !== 1 ? 's' : ''} registered
                        {stats.active !== undefined && ` · ${stats.active} active`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Add User
                        </button>
                    )}
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

            {/* ─── Filters ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="bg-transparent border border-gray-700 rounded-lg px-3 py-1.5 text-white w-full focus:ring-2 focus:ring-primary"
                    />
                </div>
                <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                </select>
                <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                </select>
                <input
                    type="text"
                    placeholder="Department"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white w-32"
                />
                <button
                    onClick={() => {
                        setFilters({
                            page: 1,
                            limit: 10,
                            search: '',
                            role: '',
                            status: '',
                            department: '',
                            sortBy: 'createdAt',
                            sortOrder: 'desc',
                        });
                    }}
                    className="text-sm text-gray-400 hover:text-white transition"
                >
                    Clear
                </button>
            </div>

            {/* ─── User Table ───────────────────────────────────────── */}
            {users.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>No users found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-800/50 border-b border-gray-700">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                    onClick={() => handleSort('firstName')}
                                >
                                    Name
                                    {filters.sortBy === 'firstName' && (filters.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                    onClick={() => handleSort('role')}
                                >
                                    Role
                                    {filters.sortBy === 'role' && (filters.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                    {filters.sortBy === 'status' && (filters.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Department
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Joined
                                    {filters.sortBy === 'createdAt' && (filters.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {users.map((u) => (
                                <tr key={u._id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-white">
                                        {u.firstName} {u.lastName}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(u.role)}`}>
                                            {u.role?.toUpperCase() || 'VIEWER'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(u.status)}`}>
                                            {u.status || 'active'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">{u.department || '-'}</td>
                                    <td className="px-4 py-3 text-gray-400 text-sm">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => setShowViewModal(u)}
                                                className="p-1 hover:bg-gray-700 rounded-lg transition"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                                            </button>
                                            {(isAdmin || (isManager && u._id === user._id)) && (
                                                <button
                                                    onClick={() => {
                                                        setEditUser({ ...u });
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-1 hover:bg-gray-700 rounded-lg transition"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4 text-blue-400 hover:text-blue-300" />
                                                </button>
                                            )}
                                            {isAdmin && u._id !== user._id && (
                                                <button
                                                    onClick={() => setShowDeleteConfirm(u._id)}
                                                    className="p-1 hover:bg-gray-700 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                                                </button>
                                            )}
                                            {(isAdmin || u._id === user._id) && (
                                                <button
                                                    onClick={() => setShowPasswordModal(u._id)}
                                                    className="p-1 hover:bg-gray-700 rounded-lg transition"
                                                    title="Change Password"
                                                >
                                                    <Key className="w-4 h-4 text-yellow-400 hover:text-yellow-300" />
                                                </button>
                                            )}
                                            {isAdmin && u._id !== user._id && (
                                                <button
                                                    onClick={() => handleToggleStatus(u._id, u.status)}
                                                    className="p-1 hover:bg-gray-700 rounded-lg transition"
                                                    title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {u.status === 'active' ? (
                                                        <PowerOff className="w-4 h-4 text-red-400 hover:text-red-300" />
                                                    ) : (
                                                        <Power className="w-4 h-4 text-green-400 hover:text-green-300" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Pagination ────────────────────────────────────────── */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-400">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* ─── Add User Modal ────────────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Add User</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">First Name*</label>
                                    <input
                                        type="text"
                                        value={newUser.firstName}
                                        onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Last Name*</label>
                                    <input
                                        type="text"
                                        value={newUser.lastName}
                                        onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email*</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Password*</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    minLength="8"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={newUser.phone}
                                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="+1234567890"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="operator">Operator</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Department</label>
                                <input
                                    type="text"
                                    value={newUser.department}
                                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Edit User Modal ────────────────────────────────────── */}
            {showEditModal && editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Edit User</h2>
                            <button
                                onClick={() => { setShowEditModal(false); setEditUser(null); }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editUser.firstName}
                                        onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editUser.lastName}
                                        onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editUser.email}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={editUser.phone || ''}
                                    onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            {isAdmin && (
                                <>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Role</label>
                                        <select
                                            value={editUser.role}
                                            onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="operator">Operator</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Status</label>
                                        <select
                                            value={editUser.status}
                                            onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-1">Department</label>
                                        <input
                                            type="text"
                                            value={editUser.department || ''}
                                            onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditUser(null); }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Update User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ────────────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                        <p className="text-gray-400 mt-2">Are you sure you want to delete this user? This action cannot be undone.</p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteUser(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Change Password Modal ────────────────────────────── */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Change Password</h2>
                            <button
                                onClick={() => { setShowPasswordModal(null); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    minLength="8"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowPasswordModal(null); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── View User Modal ────────────────────────────────────── */}
            {showViewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">User Details</h2>
                            <button
                                onClick={() => setShowViewModal(null)}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-2 text-gray-300">
                            <p><span className="text-gray-400">Name:</span> {showViewModal.firstName} {showViewModal.lastName}</p>
                            <p><span className="text-gray-400">Email:</span> {showViewModal.email}</p>
                            <p><span className="text-gray-400">Phone:</span> {showViewModal.phone || '-'}</p>
                            <p><span className="text-gray-400">Role:</span> <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadge(showViewModal.role)}`}>{showViewModal.role?.toUpperCase()}</span></p>
                            <p><span className="text-gray-400">Status:</span> <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(showViewModal.status)}`}>{showViewModal.status}</span></p>
                            <p><span className="text-gray-400">Department:</span> {showViewModal.department || '-'}</p>
                            <p><span className="text-gray-400">Joined:</span> {new Date(showViewModal.createdAt).toLocaleString()}</p>
                            <p><span className="text-gray-400">Last Login:</span> {showViewModal.lastLogin ? new Date(showViewModal.lastLogin).toLocaleString() : 'Never'}</p>
                            <p><span className="text-gray-400">Email Verified:</span> {showViewModal.emailVerified ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => setShowViewModal(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;