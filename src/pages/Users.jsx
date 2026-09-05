// Users.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Users.css'; // Optional: for styling

// User Management Component
const Users = ({
  // Core props
  users = [],
  onUserUpdate,
  onUserDelete,
  onUserCreate,
  onUserSelect,
  selectedUserId = null,
  
  // Filter/Search props
  searchable = true,
  filterable = true,
  sortable = true,
  pagination = true,
  pageSize = 10,
  
  // UI props
  isLoading = false,
  error = null,
  readOnly = false,
  showActions = true,
  showFilters = true,
  showSearch = true,
  showPagination = true,
  showBulkActions = true,
  showRoleBadges = true,
  showStatusIndicators = true,
  showProfilePicture = true,
  
  // Role management
  roles = ['admin', 'manager', 'operator', 'viewer'],
  roleColors = {
    admin: '#F44336',
    manager: '#FF9800',
    operator: '#2196F3',
    viewer: '#4CAF50',
  },
  
  // Custom render props
  renderUserCard,
  renderUserForm,
  renderUserActions,
  renderUserFilters,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  
  // Event handlers
  onFilterChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onBulkAction,
  onRoleChange,
  onStatusChange,
  
  // Styling
  className = '',
  style = {},
  theme = 'light',
  layout = 'grid', // 'grid', 'list', 'table'
  columns = 3,
}) => {
  // State
  const [usersList, setUsersList] = useState(users);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    department: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Refs
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Derived data
  const filteredUsers = useMemo(() => {
    let result = [...usersList];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.id?.toString().includes(searchLower)
      );
    }

    // Role filter
    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(user => user.status === filters.status);
    }

    // Department filter
    if (filters.department) {
      result = result.filter(user => user.department === filters.department);
    }

    return result;
  }, [usersList, searchTerm, filters]);

  // Sorted data
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredUsers, sortConfig]);

  // Paginated data
  const paginatedUsers = useMemo(() => {
    if (!pagination) return sortedUsers;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedUsers.slice(start, end);
  }, [sortedUsers, currentPage, pageSize, pagination]);

  // Total pages
  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.ceil(sortedUsers.length / pageSize);
  }, [sortedUsers.length, pageSize, pagination]);

  // Available departments
  const departments = useMemo(() => {
    const deps = new Set(usersList.map(user => user.department).filter(Boolean));
    return [...deps];
  }, [usersList]);

  // Status config
  const statusConfig = {
    active: { label: 'Active', color: '#4CAF50', icon: '🟢' },
    inactive: { label: 'Inactive', color: '#9E9E9E', icon: '⚪' },
    pending: { label: 'Pending', color: '#FF9800', icon: '🟡' },
    suspended: { label: 'Suspended', color: '#F44336', icon: '🔴' },
  };

  // Effects
  useEffect(() => {
    setUsersList(users);
  }, [users]);

  useEffect(() => {
    // Reset page when filters change
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Event handlers
  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    onFilterChange?.({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    onSortChange?.(sortConfig);
  }, [sortConfig, onSortChange]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    onPageChange?.(page);
  }, [onPageChange]);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(user => user.id));
    }
  }, [selectedUsers, paginatedUsers]);

  const handleUserClick = useCallback((user) => {
    onUserSelect?.(user.id);
  }, [onUserSelect]);

  const handleEditUser = useCallback((user) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  }, []);

  const handleDeleteUser = useCallback((userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      onUserDelete?.(userId);
    }
  }, [onUserDelete]);

  const handleCreateUser = useCallback(() => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      username: '',
      role: 'viewer',
      status: 'active',
      department: '',
      phone: '',
    });
    setIsModalOpen(true);
  }, []);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    if (editingUser) {
      onUserUpdate?.(formData);
    } else {
      onUserCreate?.(formData);
    }
    setIsModalOpen(false);
    setEditingUser(null);
  }, [editingUser, formData, onUserUpdate, onUserCreate]);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleBulkAction = useCallback((action) => {
    onBulkAction?.(action, selectedUsers);
    setSelectedUsers([]);
  }, [selectedUsers, onBulkAction]);

  const handleRoleChange = useCallback((userId, newRole) => {
    onRoleChange?.(userId, newRole);
  }, [onRoleChange]);

  const handleStatusChange = useCallback((userId, newStatus) => {
    onStatusChange?.(userId, newStatus);
  }, [onStatusChange]);

  // Modal close handler
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingUser(null);
  }, []);

  // Click outside modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleModalClose();
      }
    };
    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen, handleModalClose]);

  // Render functions
  const renderUserItem = useCallback((user) => {
    if (renderUserCard) {
      return renderUserCard(user, {
        isSelected: selectedUsers.includes(user.id),
        isEditing: editingUser?.id === user.id,
        onSelect: () => handleSelectUser(user.id),
        onEdit: () => handleEditUser(user),
        onDelete: () => handleDeleteUser(user.id),
        onRoleChange: (role) => handleRoleChange(user.id, role),
        onStatusChange: (status) => handleStatusChange(user.id, status),
      });
    }

    const status = statusConfig[user.status] || statusConfig.active;

    return (
      <div
        key={user.id}
        className={`user-item ${selectedUsers.includes(user.id) ? 'user-selected' : ''}`}
        onClick={() => handleUserClick(user)}
      >
        <div className="user-item-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedUsers.includes(user.id)}
            onChange={() => handleSelectUser(user.id)}
          />
        </div>
        
        <div className="user-item-avatar">
          {showProfilePicture && (user.avatar || user.profilePicture) ? (
            <img src={user.avatar || user.profilePicture} alt={user.name} />
          ) : (
            <div className="user-avatar-placeholder" style={{
              backgroundColor: roleColors[user.role] || '#9E9E9E',
            }}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <div className="user-item-info">
          <div className="user-item-name">
            {user.name}
            {showRoleBadges && (
              <span className="user-role-badge" style={{
                backgroundColor: roleColors[user.role] || '#9E9E9E',
              }}>
                {user.role}
              </span>
            )}
          </div>
          <div className="user-item-details">
            <span className="user-email">{user.email}</span>
            {user.department && (
              <span className="user-department">{user.department}</span>
            )}
          </div>
        </div>

        <div className="user-item-meta">
          {showStatusIndicators && (
            <span className="user-status" style={{ color: status.color }}>
              {status.icon} {status.label}
            </span>
          )}
          <span className="user-joined">
            Joined: {new Date(user.createdAt || user.joinedDate).toLocaleDateString()}
          </span>
        </div>

        {showActions && !readOnly && (
          <div className="user-item-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="action-btn edit-btn"
              onClick={() => handleEditUser(user)}
              title="Edit User"
            >
              ✏️
            </button>
            <button
              className="action-btn delete-btn"
              onClick={() => handleDeleteUser(user.id)}
              title="Delete User"
            >
              🗑️
            </button>
            <select
              className="user-role-select"
              value={user.role}
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }, [
    selectedUsers, editingUser, showProfilePicture, roleColors,
    showRoleBadges, showStatusIndicators, showActions, readOnly,
    roles, handleSelectUser, handleUserClick, handleEditUser,
    handleDeleteUser, handleRoleChange, handleStatusChange,
    renderUserCard, statusConfig,
  ]);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="users-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="users-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (usersList.length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="users-empty">
        <span className="empty-icon">👥</span>
        <h3>No Users Found</h3>
        <p>Get started by adding your first user.</p>
        {!readOnly && (
          <button className="create-user-btn" onClick={handleCreateUser}>
            + Add User
          </button>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div className={`users-container users-${theme} ${className}`} style={style}>
      {/* Header */}
      <div className="users-header">
        <div className="users-header-left">
          <h2 className="users-title">User Management</h2>
          <span className="users-count">
            {filteredUsers.length} users
            {filteredUsers.length !== usersList.length && ` (${usersList.length} total)`}
          </span>
        </div>
        <div className="users-header-actions">
          {!readOnly && (
            <button className="create-user-btn" onClick={handleCreateUser}>
              + Add User
            </button>
          )}
          {showBulkActions && selectedUsers.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedUsers.length} selected</span>
              <button onClick={() => handleBulkAction('delete')}>Delete</button>
              <button onClick={() => handleBulkAction('activate')}>Activate</button>
              <button onClick={() => handleBulkAction('deactivate')}>Deactivate</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {(showSearch || showFilters) && (
        <div className="users-filters">
          {showSearch && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          )}
          
          {showFilters && (
            <div className="filters-container">
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="filter-select"
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>

              {departments.length > 0 && (
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}

              {renderUserFilters && renderUserFilters({ filters, onFilterChange: handleFilterChange })}
            </div>
          )}
        </div>
      )}

      {/* Users List */}
      <div className={`users-list users-layout-${layout}`}>
        {layout === 'grid' && (
          <div className="users-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {paginatedUsers.map(user => renderUserItem(user))}
          </div>
        )}

        {layout === 'list' && (
          <div className="users-list-view">
            {paginatedUsers.map(user => renderUserItem(user))}
          </div>
        )}

        {layout === 'table' && (
          <table className="users-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('name')}>
                  Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('email')}>
                  Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('role')}>
                  Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(user => {
                const status = statusConfig[user.status] || statusConfig.active;
                return (
                  <tr key={user.id} className={selectedUsers.includes(user.id) ? 'user-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td>
                      <div className="table-user-info">
                        {showProfilePicture && (user.avatar || user.profilePicture) ? (
                          <img src={user.avatar || user.profilePicture} alt={user.name} className="table-avatar" />
                        ) : (
                          <div className="table-avatar-placeholder" style={{
                            backgroundColor: roleColors[user.role] || '#9E9E9E',
                          }}>
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {showRoleBadges && (
                        <span className="user-role-badge" style={{
                          backgroundColor: roleColors[user.role] || '#9E9E9E',
                        }}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      {showStatusIndicators && (
                        <span className="user-status" style={{ color: status.color }}>
                          {status.icon} {status.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {showActions && !readOnly && (
                        <div className="table-actions">
                          <button onClick={() => handleEditUser(user)}>✏️</button>
                          <button onClick={() => handleDeleteUser(user.id)}>🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {showPagination && pagination && totalPages > 1 && (
        <div className="users-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-btn"
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`page-number ${page === currentPage ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            Next
          </button>

          <span className="page-info">
            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length}
          </span>
        </div>
      )}

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="users-modal-overlay">
          <div className="users-modal" ref={modalRef}>
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create User'}</h3>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="user-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role || 'viewer'}
                    onChange={handleFormChange}
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status || 'active'}
                    onChange={handleFormChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {renderUserForm && renderUserForm({
                formData,
                isEditing: !!editingUser,
                onChange: handleFormChange,
              })}

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;