// frontend/src/pages/Users.jsx
import React, { useState, useMemo } from 'react';
import { useFetch, useMutation } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, ChevronLeft, ChevronRight, UserPlus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ─── Fetch users ──────────────────────────────────────────────
  const { data, loading, error, refetch } = useFetch('/users', {
    immediate: true,
    // transformData: (res) => res.data || [],
  });

  const users = data?.data || data || [];

  // ─── Mutations ─────────────────────────────────────────────────
  const { mutate: deleteUser } = useMutation('/users/:id', {
    method: 'DELETE',
    onSuccess: () => {
      toast.success('User deleted');
      refetch();
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const { mutate: updateUser } = useMutation('/users/:id', {
    method: 'PUT',
    onSuccess: () => {
      toast.success('User updated');
      refetch();
    },
    onError: () => toast.error('Failed to update user'),
  });

  // ─── Filtering & Pagination ──────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.username?.toLowerCase().includes(s)
      );
    }
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    if (statusFilter) result = result.filter(u => u.status === statusFilter);
    return result;
  }, [users, searchTerm, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ─── Handlers ──────────────────────────────────────────────────
  const handleDelete = (userId) => {
    if (window.confirm('Delete this user?')) {
      deleteUser(null, { url: `/users/${userId}` });
    }
  };

  const handleRoleChange = (userId, newRole) => {
    updateUser({ role: newRole }, { url: `/users/${userId}` });
  };

  const handleStatusChange = (userId, newStatus) => {
    updateUser({ status: newStatus }, { url: `/users/${userId}` });
  };

  // ─── Status config ────────────────────────────────────────────
  const statusConfig = {
    active: { label: 'Active', color: 'text-green-500', bg: 'bg-green-500/10' },
    inactive: { label: 'Inactive', color: 'text-gray-400', bg: 'bg-gray-500/10' },
    pending: { label: 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    suspended: { label: 'Suspended', color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const roleColors = {
    admin: 'bg-red-500/20 text-red-500',
    manager: 'bg-orange-500/20 text-orange-500',
    operator: 'bg-blue-500/20 text-blue-500',
    viewer: 'bg-green-500/20 text-green-500',
  };

  // ─── Render ────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" /></div>;
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm">{filteredUsers.length} users</p>
        </div>
        <button
          onClick={() => {/* open create modal */ }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="operator">Operator</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const status = statusConfig[user.status] || statusConfig.active;
                  const roleClass = roleColors[user.role] || 'bg-gray-500/20 text-gray-400';
                  return (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClass}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color} ${status.bg}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {/* edit modal */ }}
                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-gray-400 text-sm">
            Showing {((currentPage - 1) * pageSize) + 1} – {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="flex items-center px-4 text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 disabled:opacity-50 text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;