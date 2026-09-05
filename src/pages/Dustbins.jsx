// Dustbin.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Dustbin.css'; // Optional: for styling

// Dustbin Management Component
const Dustbin = ({
  // Core props
  dustbins = [],
  onDustbinUpdate,
  onDustbinDelete,
  onDustbinCreate,
  onDustbinSelect,
  selectedDustbinId = null,
  
  // Monitoring props
  showFillLevel = true,
  showLocation = true,
  showStatus = true,
  showCollectionHistory = true,
  showSchedule = true,
  showAnalytics = true,
  showAlerts = true,
  
  // Filter/Search props
  searchable = true,
  filterable = true,
  sortable = true,
  pagination = true,
  pageSize = 12,
  
  // UI props
  isLoading = false,
  error = null,
  readOnly = false,
  showActions = true,
  showFilters = true,
  showSearch = true,
  showPagination = true,
  showBulkActions = true,
  showStatusIndicators = true,
  showTypeBadges = true,
  
  // Configuration
  dustbinTypes = ['general', 'recycling', 'organic', 'paper', 'glass', 'plastic', 'hazardous'],
  dustbinStatuses = ['empty', 'partial', 'full', 'overflow', 'maintenance', 'offline'],
  fillLevelThresholds = {
    empty: 20,
    partial: 60,
    full: 85,
    overflow: 95,
  },
  
  // Color schemes
  typeColors = {
    general: '#607D8B',
    recycling: '#2196F3',
    organic: '#4CAF50',
    paper: '#FF9800',
    glass: '#00BCD4',
    plastic: '#9C27B0',
    hazardous: '#F44336',
  },
  
  statusColors = {
    empty: '#4CAF50',
    partial: '#FFC107',
    full: '#FF5722',
    overflow: '#D32F2F',
    maintenance: '#FF9800',
    offline: '#9E9E9E',
  },
  
  // Custom render props
  renderDustbinCard,
  renderDustbinForm,
  renderDustbinActions,
  renderDustbinFilters,
  renderFillLevel,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  renderAnalytics,
  
  // Event handlers
  onFilterChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onBulkAction,
  onScheduleCollection,
  onAlertAcknowledge,
  onStatusChange,
  onLocationUpdate,
  
  // Styling
  className = '',
  style = {},
  theme = 'light',
  layout = 'grid', // 'grid', 'list', 'table'
  columns = 3,
}) => {
  // State
  const [dustbinsList, setDustbinsList] = useState(dustbins);
  const [selectedDustbins, setSelectedDustbins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    location: '',
    fillLevel: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDustbin, setEditingDustbin] = useState(null);
  const [formData, setFormData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [selectedDustbin, setSelectedDustbin] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'analytics', 'schedule'
  
  // Refs
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);
  const intervalRef = useRef(null);

  // Derived data
  const filteredDustbins = useMemo(() => {
    let result = [...dustbinsList];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(dustbin =>
        dustbin.name?.toLowerCase().includes(searchLower) ||
        dustbin.id?.toLowerCase().includes(searchLower) ||
        dustbin.location?.toLowerCase().includes(searchLower) ||
        dustbin.address?.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter(dustbin => dustbin.type === filters.type);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(dustbin => dustbin.status === filters.status);
    }

    // Location filter
    if (filters.location) {
      result = result.filter(dustbin => 
        dustbin.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Fill level filter
    if (filters.fillLevel) {
      result = result.filter(dustbin => {
        const fill = dustbin.fillLevel || 0;
        if (filters.fillLevel === 'empty') return fill < fillLevelThresholds.empty;
        if (filters.fillLevel === 'partial') return fill >= fillLevelThresholds.empty && fill < fillLevelThresholds.partial;
        if (filters.fillLevel === 'full') return fill >= fillLevelThresholds.partial && fill < fillLevelThresholds.full;
        if (filters.fillLevel === 'overflow') return fill >= fillLevelThresholds.full;
        return true;
      });
    }

    return result;
  }, [dustbinsList, searchTerm, filters, fillLevelThresholds]);

  // Sorted data
  const sortedDustbins = useMemo(() => {
    const sorted = [...filteredDustbins];
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
  }, [filteredDustbins, sortConfig]);

  // Paginated data
  const paginatedDustbins = useMemo(() => {
    if (!pagination) return sortedDustbins;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedDustbins.slice(start, end);
  }, [sortedDustbins, currentPage, pageSize, pagination]);

  // Total pages
  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.ceil(sortedDustbins.length / pageSize);
  }, [sortedDustbins.length, pageSize, pagination]);

  // Statistics
  const statistics = useMemo(() => {
    const total = dustbinsList.length;
    const filled = dustbinsList.filter(d => (d.fillLevel || 0) > fillLevelThresholds.partial).length;
    const overflow = dustbinsList.filter(d => (d.fillLevel || 0) > fillLevelThresholds.full).length;
    const active = dustbinsList.filter(d => d.status !== 'offline' && d.status !== 'maintenance').length;
    const avgFill = total > 0 ? dustbinsList.reduce((sum, d) => sum + (d.fillLevel || 0), 0) / total : 0;
    
    const typeDistribution = {};
    dustbinsList.forEach(d => {
      typeDistribution[d.type] = (typeDistribution[d.type] || 0) + 1;
    });
    
    const statusDistribution = {};
    dustbinsList.forEach(d => {
      statusDistribution[d.status] = (statusDistribution[d.status] || 0) + 1;
    });

    return {
      total,
      filled,
      overflow,
      active,
      avgFill: Math.round(avgFill),
      typeDistribution,
      statusDistribution,
    };
  }, [dustbinsList, fillLevelThresholds]);

  // Available locations
  const locations = useMemo(() => {
    const locs = new Set(dustbinsList.map(d => d.location).filter(Boolean));
    return [...locs];
  }, [dustbinsList]);

  // Status config
  const statusConfig = {
    empty: { label: 'Empty', color: '#4CAF50', icon: '🟢', action: 'Ready for collection' },
    partial: { label: 'Partial', color: '#FFC107', icon: '🟡', action: 'Monitor' },
    full: { label: 'Full', color: '#FF5722', icon: '🟠', action: 'Schedule collection' },
    overflow: { label: 'Overflow', color: '#D32F2F', icon: '🔴', action: 'Urgent collection needed' },
    maintenance: { label: 'Maintenance', color: '#FF9800', icon: '🔧', action: 'Under maintenance' },
    offline: { label: 'Offline', color: '#9E9E9E', icon: '⚪', action: 'Check connection' },
  };

  // Type config
  const typeConfig = {
    general: { label: 'General Waste', icon: '🗑️' },
    recycling: { label: 'Recycling', icon: '♻️' },
    organic: { label: 'Organic', icon: '🌱' },
    paper: { label: 'Paper', icon: '📄' },
    glass: { label: 'Glass', icon: '🫙' },
    plastic: { label: 'Plastic', icon: '🧴' },
    hazardous: { label: 'Hazardous', icon: '☣️' },
  };

  // Effects
  useEffect(() => {
    setDustbinsList(dustbins);
  }, [dustbins]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Auto-refresh fill levels
  useEffect(() => {
    if (viewMode === 'dashboard') {
      intervalRef.current = setInterval(() => {
        // Simulate real-time updates
        // In a real app, you would fetch updated data from API
        // or receive WebSocket updates
        updateFillLevels();
      }, 30000); // Update every 30 seconds
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [viewMode]);

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

  const handleSelectDustbin = useCallback((dustbinId) => {
    setSelectedDustbins(prev => {
      if (prev.includes(dustbinId)) {
        return prev.filter(id => id !== dustbinId);
      }
      return [...prev, dustbinId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedDustbins.length === paginatedDustbins.length) {
      setSelectedDustbins([]);
    } else {
      setSelectedDustbins(paginatedDustbins.map(d => d.id));
    }
  }, [selectedDustbins, paginatedDustbins]);

  const handleDustbinClick = useCallback((dustbin) => {
    setSelectedDustbin(dustbin);
    onDustbinSelect?.(dustbin.id);
  }, [onDustbinSelect]);

  const handleEditDustbin = useCallback((dustbin) => {
    setEditingDustbin(dustbin);
    setFormData(dustbin);
    setIsModalOpen(true);
  }, []);

  const handleDeleteDustbin = useCallback((dustbinId) => {
    if (window.confirm('Are you sure you want to delete this dustbin?')) {
      onDustbinDelete?.(dustbinId);
    }
  }, [onDustbinDelete]);

  const handleCreateDustbin = useCallback(() => {
    setEditingDustbin(null);
    setFormData({
      name: '',
      type: 'general',
      status: 'empty',
      location: '',
      address: '',
      capacity: 240,
      fillLevel: 0,
      lastEmptied: null,
      nextCollection: null,
      latitude: null,
      longitude: null,
    });
    setIsModalOpen(true);
  }, []);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    if (editingDustbin) {
      onDustbinUpdate?.({ ...formData, id: editingDustbin.id });
    } else {
      onDustbinCreate?.(formData);
    }
    setIsModalOpen(false);
    setEditingDustbin(null);
  }, [editingDustbin, formData, onDustbinUpdate, onDustbinCreate]);

  const handleFormChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  }, []);

  const handleBulkAction = useCallback((action) => {
    onBulkAction?.(action, selectedDustbins);
    setSelectedDustbins([]);
  }, [selectedDustbins, onBulkAction]);

  const handleScheduleCollection = useCallback((dustbinId) => {
    onScheduleCollection?.(dustbinId);
  }, [onScheduleCollection]);

  const handleStatusChange = useCallback((dustbinId, newStatus) => {
    onStatusChange?.(dustbinId, newStatus);
  }, [onStatusChange]);

  const handleAlertAcknowledge = useCallback((alertId) => {
    onAlertAcknowledge?.(alertId);
  }, [onAlertAcknowledge]);

  const handleLocationUpdate = useCallback((dustbinId, location) => {
    onLocationUpdate?.(dustbinId, location);
  }, [onLocationUpdate]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingDustbin(null);
  }, []);

  const updateFillLevels = useCallback(() => {
    setDustbinsList(prev => 
      prev.map(dustbin => {
        // Simulate fill level changes
        const change = Math.random() * 10 - 3; // -3 to +7
        let newFill = Math.max(0, Math.min(100, (dustbin.fillLevel || 0) + change));
        const newStatus = getFillLevelStatus(newFill);
        return {
          ...dustbin,
          fillLevel: Math.round(newFill),
          status: newStatus,
        };
      })
    );
  }, []);

  const getFillLevelStatus = useCallback((fillLevel) => {
    if (fillLevel > fillLevelThresholds.full) return 'overflow';
    if (fillLevel > fillLevelThresholds.partial) return 'full';
    if (fillLevel > fillLevelThresholds.empty) return 'partial';
    return 'empty';
  }, [fillLevelThresholds]);

  // Render functions
  const renderFillLevelComponent = useCallback((fillLevel, status) => {
    if (renderFillLevel) {
      return renderFillLevel(fillLevel, status);
    }

    const statusColor = statusColors[status] || '#9E9E9E';
    const fillPercentage = Math.min(Math.max(fillLevel, 0), 100);

    return (
      <div className="fill-level-container">
        <div className="fill-level-header">
          <span className="fill-label">Fill Level</span>
          <span className="fill-percentage" style={{ color: statusColor }}>
            {fillPercentage}%
          </span>
        </div>
        <div className="fill-bar">
          <div 
            className="fill-progress"
            style={{
              width: `${fillPercentage}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>
        <div className="fill-level-status">
          <span className="status-badge" style={{ 
            backgroundColor: statusColor + '20',
            color: statusColor,
          }}>
            {statusConfig[status]?.icon || '📊'} {statusConfig[status]?.label || status}
          </span>
        </div>
      </div>
    );
  }, [statusColors, statusConfig, renderFillLevel]);

  const renderDustbinItem = useCallback((dustbin) => {
    if (renderDustbinCard) {
      return renderDustbinCard(dustbin, {
        isSelected: selectedDustbins.includes(dustbin.id),
        isEditing: editingDustbin?.id === dustbin.id,
        onSelect: () => handleSelectDustbin(dustbin.id),
        onEdit: () => handleEditDustbin(dustbin),
        onDelete: () => handleDeleteDustbin(dustbin.id),
        onSchedule: () => handleScheduleCollection(dustbin.id),
        onStatusChange: (status) => handleStatusChange(dustbin.id, status),
      });
    }

    const status = statusConfig[dustbin.status] || statusConfig.empty;
    const type = typeConfig[dustbin.type] || typeConfig.general;
    const statusColor = statusColors[dustbin.status] || '#9E9E9E';
    const typeColor = typeColors[dustbin.type] || '#607D8B';

    return (
      <div
        key={dustbin.id}
        className={`dustbin-item ${selectedDustbins.includes(dustbin.id) ? 'dustbin-selected' : ''}`}
        onClick={() => handleDustbinClick(dustbin)}
        style={{ borderTopColor: statusColor }}
      >
        <div className="dustbin-item-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedDustbins.includes(dustbin.id)}
            onChange={() => handleSelectDustbin(dustbin.id)}
          />
        </div>

        <div className="dustbin-item-header">
          <div className="dustbin-item-left">
            <div className="dustbin-type-badge" style={{
              backgroundColor: typeColor + '20',
              color: typeColor,
            }}>
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </div>
            <h4 className="dustbin-name">{dustbin.name || `Dustbin #${dustbin.id}`}</h4>
          </div>
          {showStatusIndicators && (
            <div className="dustbin-status" style={{ color: statusColor }}>
              {status.icon} {status.label}
            </div>
          )}
        </div>

        {showLocation && dustbin.location && (
          <div className="dustbin-location">
            📍 {dustbin.location}
            {dustbin.address && (
              <span className="dustbin-address"> - {dustbin.address}</span>
            )}
          </div>
        )}

        {showFillLevel && (
          <div className="dustbin-fill" onClick={(e) => e.stopPropagation()}>
            {renderFillLevelComponent(dustbin.fillLevel || 0, dustbin.status)}
          </div>
        )}

        <div className="dustbin-meta">
          {dustbin.capacity && (
            <span className="dustbin-capacity">
              📦 Capacity: {dustbin.capacity}L
            </span>
          )}
          {dustbin.lastEmptied && (
            <span className="dustbin-last-emptied">
              🕐 Last emptied: {new Date(dustbin.lastEmptied).toLocaleDateString()}
            </span>
          )}
        </div>

        {showActions && !readOnly && (
          <div className="dustbin-item-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="action-btn schedule-btn"
              onClick={() => handleScheduleCollection(dustbin.id)}
              title="Schedule Collection"
            >
              📅
            </button>
            <button
              className="action-btn edit-btn"
              onClick={() => handleEditDustbin(dustbin)}
              title="Edit Dustbin"
            >
              ✏️
            </button>
            <button
              className="action-btn delete-btn"
              onClick={() => handleDeleteDustbin(dustbin.id)}
              title="Delete Dustbin"
            >
              🗑️
            </button>
            <select
              className="status-select"
              value={dustbin.status}
              onChange={(e) => handleStatusChange(dustbin.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {dustbinStatuses.map(statusOption => (
                <option key={statusOption} value={statusOption}>
                  {statusConfig[statusOption]?.label || statusOption}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }, [
    selectedDustbins, editingDustbin, statusColors, typeColors,
    statusConfig, typeConfig, showStatusIndicators, showLocation,
    showFillLevel, showActions, readOnly, handleSelectDustbin,
    handleDustbinClick, handleEditDustbin, handleDeleteDustbin,
    handleScheduleCollection, handleStatusChange,
    renderDustbinCard, renderFillLevelComponent
  ]);

  // Render analytics
  const renderAnalyticsComponent = useCallback(() => {
    if (renderAnalytics) {
      return renderAnalytics(statistics);
    }

    if (!showAnalytics) return null;

    return (
      <div className="analytics-panel">
        <h3>📊 Analytics Dashboard</h3>
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="analytics-label">Total Dustbins</div>
            <div className="analytics-value">{statistics.total}</div>
            <div className="analytics-sub">
              {statistics.active} active
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-label">Avg. Fill Level</div>
            <div className="analytics-value" style={{
              color: statistics.avgFill > fillLevelThresholds.partial ? '#FF5722' : '#4CAF50'
            }}>
              {statistics.avgFill}%
            </div>
            <div className="analytics-sub">
              {statistics.filled} need collection
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-label">Overflow</div>
            <div className="analytics-value" style={{ color: statistics.overflow > 0 ? '#D32F2F' : '#4CAF50' }}>
              {statistics.overflow}
            </div>
            <div className="analytics-sub">
              {statistics.overflow > 0 ? '⚠️ Needs immediate attention' : '✅ All clear'}
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-label">Collection Rate</div>
            <div className="analytics-value">
              {statistics.total > 0 ? Math.round((statistics.active / statistics.total) * 100) : 0}%
            </div>
            <div className="analytics-sub">
              {statistics.active} of {statistics.total} operational
            </div>
          </div>
        </div>

        <div className="analytics-distribution">
          <div className="distribution-section">
            <h4>By Type</h4>
            <div className="distribution-items">
              {Object.entries(statistics.typeDistribution).map(([type, count]) => (
                <div key={type} className="distribution-item">
                  <span className="dist-label">
                    {typeConfig[type]?.icon || '📦'} {typeConfig[type]?.label || type}
                  </span>
                  <span className="dist-count">{count}</span>
                  <div className="dist-bar">
                    <div 
                      className="dist-fill"
                      style={{
                        width: `${(count / statistics.total) * 100}%`,
                        backgroundColor: typeColors[type] || '#607D8B',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="distribution-section">
            <h4>By Status</h4>
            <div className="distribution-items">
              {Object.entries(statistics.statusDistribution).map(([status, count]) => (
                <div key={status} className="distribution-item">
                  <span className="dist-label">
                    {statusConfig[status]?.icon || '📊'} {statusConfig[status]?.label || status}
                  </span>
                  <span className="dist-count">{count}</span>
                  <div className="dist-bar">
                    <div 
                      className="dist-fill"
                      style={{
                        width: `${(count / statistics.total) * 100}%`,
                        backgroundColor: statusColors[status] || '#9E9E9E',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }, [statistics, showAnalytics, fillLevelThresholds, typeColors, statusColors, typeConfig, statusConfig, renderAnalytics]);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="dustbin-loading">
        <div className="loading-spinner"></div>
        <p>Loading dustbins...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="dustbin-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (dustbinsList.length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="dustbin-empty">
        <span className="empty-icon">🗑️</span>
        <h3>No Dustbins Found</h3>
        <p>Get started by adding your first dustbin.</p>
        {!readOnly && (
          <button className="create-dustbin-btn" onClick={handleCreateDustbin}>
            + Add Dustbin
          </button>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div 
      className={`dustbin-container dustbin-${theme} ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="dustbin-header">
        <div className="dustbin-header-left">
          <h2 className="dustbin-title">🗑️ Dustbin Management</h2>
          <span className="dustbin-count">
            {filteredDustbins.length} dustbins
            {filteredDustbins.length !== dustbinsList.length && ` (${dustbinsList.length} total)`}
          </span>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
            >
              📊 Dashboard
            </button>
            <button
              className={`view-btn ${viewMode === 'analytics' ? 'active' : ''}`}
              onClick={() => setViewMode('analytics')}
            >
              📈 Analytics
            </button>
          </div>
        </div>
        <div className="dustbin-header-actions">
          {!readOnly && (
            <button className="create-dustbin-btn" onClick={handleCreateDustbin}>
              + Add Dustbin
            </button>
          )}
          {showBulkActions && selectedDustbins.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedDustbins.length} selected</span>
              <button onClick={() => handleBulkAction('schedule')}>📅 Schedule</button>
              <button onClick={() => handleBulkAction('empty')}>🗑️ Empty</button>
              <button onClick={() => handleBulkAction('delete')}>🗑️ Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {(showSearch || showFilters) && (
        <div className="dustbin-filters">
          {showSearch && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search dustbins..."
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
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                {dustbinTypes.map(type => (
                  <option key={type} value={type}>
                    {typeConfig[type]?.icon || '📦'} {typeConfig[type]?.label || type}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                {dustbinStatuses.map(status => (
                  <option key={status} value={status}>
                    {statusConfig[status]?.icon || '📊'} {statusConfig[status]?.label || status}
                  </option>
                ))}
              </select>

              <select
                value={filters.fillLevel}
                onChange={(e) => handleFilterChange('fillLevel', e.target.value)}
                className="filter-select"
              >
                <option value="">All Fill Levels</option>
                <option value="empty">Empty (0-{fillLevelThresholds.empty}%)</option>
                <option value="partial">Partial ({fillLevelThresholds.empty}-{fillLevelThresholds.partial}%)</option>
                <option value="full">Full ({fillLevelThresholds.partial}-{fillLevelThresholds.full}%)</option>
                <option value="overflow">Overflow ({fillLevelThresholds.full}%+)</option>
              </select>

              {locations.length > 0 && (
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}

              {renderDustbinFilters && renderDustbinFilters({ filters, onFilterChange: handleFilterChange })}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="dustbin-content">
        {viewMode === 'dashboard' && (
          <>
            <div className="dustbin-list">
              {layout === 'grid' && (
                <div className="dustbin-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                  {paginatedDustbins.map(dustbin => renderDustbinItem(dustbin))}
                </div>
              )}

              {layout === 'list' && (
                <div className="dustbin-list-view">
                  {paginatedDustbins.map(dustbin => renderDustbinItem(dustbin))}
                </div>
              )}

              {layout === 'table' && (
                <table className="dustbin-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedDustbins.length === paginatedDustbins.length && paginatedDustbins.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th onClick={() => handleSort('name')}>
                        Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('type')}>
                        Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('location')}>
                        Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('fillLevel')}>
                        Fill Level {sortConfig.key === 'fillLevel' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('status')}>
                        Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDustbins.map(dustbin => {
                      const status = statusConfig[dustbin.status] || statusConfig.empty;
                      const type = typeConfig[dustbin.type] || typeConfig.general;
                      
                      return (
                        <tr key={dustbin.id} className={selectedDustbins.includes(dustbin.id) ? 'dustbin-selected' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedDustbins.includes(dustbin.id)}
                              onChange={() => handleSelectDustbin(dustbin.id)}
                            />
                          </td>
                          <td>{dustbin.name || `Dustbin #${dustbin.id}`}</td>
                          <td>
                            {showTypeBadges && (
                              <span className="type-badge" style={{
                                backgroundColor: typeColors[dustbin.type] + '20',
                                color: typeColors[dustbin.type],
                              }}>
                                {type.icon} {type.label}
                              </span>
                            )}
                          </td>
                          <td>{dustbin.location || 'N/A'}</td>
                          <td>
                            <div className="table-fill">
                              <div className="table-fill-bar">
                                <div 
                                  className="table-fill-progress"
                                  style={{
                                    width: `${Math.min(Math.max(dustbin.fillLevel || 0, 0), 100)}%`,
                                    backgroundColor: statusColors[dustbin.status] || '#4CAF50',
                                  }}
                                />
                              </div>
                              <span className="table-fill-value">{dustbin.fillLevel || 0}%</span>
                            </div>
                          </td>
                          <td>
                            {showStatusIndicators && (
                              <span className="status-badge" style={{ color: statusColors[dustbin.status] }}>
                                {status.icon} {status.label}
                              </span>
                            )}
                          </td>
                          <td>
                            {showActions && !readOnly && (
                              <div className="table-actions">
                                <button onClick={() => handleScheduleCollection(dustbin.id)}>📅</button>
                                <button onClick={() => handleEditDustbin(dustbin)}>✏️</button>
                                <button onClick={()