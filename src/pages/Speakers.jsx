// Speakers.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Speakers.css'; // Optional: for styling

// Speakers Management Component
const Speakers = ({
  // Core props
  speakers = [],
  onSpeakerUpdate,
  onSpeakerDelete,
  onSpeakerCreate,
  onSpeakerSelect,
  selectedSpeakerId = null,
  
  // Audio/Device props
  showAudioControls = true,
  showVolumeControl = true,
  showEQSettings = true,
  showConnectivity = true,
  showBatteryStatus = true,
  showDeviceInfo = true,
  
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
  showStatusIndicators = true,
  showDeviceImage = true,
  
  // Device management
  deviceStatuses = ['online', 'offline', 'connecting', 'error', 'updating'],
  connectivityTypes = ['bluetooth', 'wifi', 'ethernet', 'usb', 'aux'],
  
  // Color schemes
  statusColors = {
    online: '#4CAF50',
    offline: '#9E9E9E',
    connecting: '#FF9800',
    error: '#F44336',
    updating: '#2196F3',
  },
  
  // Custom render props
  renderSpeakerCard,
  renderSpeakerForm,
  renderSpeakerActions,
  renderSpeakerFilters,
  renderAudioControls,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  
  // Event handlers
  onFilterChange,
  onSearchChange,
  onSortChange,
  onPageChange,
  onBulkAction,
  onVolumeChange,
  onMuteToggle,
  onPowerToggle,
  onConnectivityChange,
  onEQChange,
  onFirmwareUpdate,
  
  // Styling
  className = '',
  style = {},
  theme = 'light',
  layout = 'grid', // 'grid', 'list', 'table'
  columns = 3,
}) => {
  // State
  const [speakersList, setSpeakersList] = useState(speakers);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    connectivity: '',
    location: '',
    brand: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [formData, setFormData] = useState({});
  const [audioState, setAudioState] = useState({});
  
  // Refs
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Derived data
  const filteredSpeakers = useMemo(() => {
    let result = [...speakersList];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(speaker =>
        speaker.name?.toLowerCase().includes(searchLower) ||
        speaker.model?.toLowerCase().includes(searchLower) ||
        speaker.brand?.toLowerCase().includes(searchLower) ||
        speaker.location?.toLowerCase().includes(searchLower) ||
        speaker.id?.toString().includes(searchLower) ||
        speaker.serialNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status) {
      result = result.filter(speaker => speaker.status === filters.status);
    }

    // Connectivity filter
    if (filters.connectivity) {
      result = result.filter(speaker => speaker.connectivity === filters.connectivity);
    }

    // Location filter
    if (filters.location) {
      result = result.filter(speaker => speaker.location === filters.location);
    }

    // Brand filter
    if (filters.brand) {
      result = result.filter(speaker => speaker.brand === filters.brand);
    }

    return result;
  }, [speakersList, searchTerm, filters]);

  // Sorted data
  const sortedSpeakers = useMemo(() => {
    const sorted = [...filteredSpeakers];
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
  }, [filteredSpeakers, sortConfig]);

  // Paginated data
  const paginatedSpeakers = useMemo(() => {
    if (!pagination) return sortedSpeakers;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedSpeakers.slice(start, end);
  }, [sortedSpeakers, currentPage, pageSize, pagination]);

  // Total pages
  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.ceil(sortedSpeakers.length / pageSize);
  }, [sortedSpeakers.length, pageSize, pagination]);

  // Available locations
  const locations = useMemo(() => {
    const locs = new Set(speakersList.map(s => s.location).filter(Boolean));
    return [...locs];
  }, [speakersList]);

  // Available brands
  const brands = useMemo(() => {
    const br = new Set(speakersList.map(s => s.brand).filter(Boolean));
    return [...br];
  }, [speakersList]);

  // Status config
  const statusConfig = {
    online: { label: 'Online', color: '#4CAF50', icon: '🟢', animation: 'pulse' },
    offline: { label: 'Offline', color: '#9E9E9E', icon: '⚪', animation: 'none' },
    connecting: { label: 'Connecting', color: '#FF9800', icon: '🟡', animation: 'spin' },
    error: { label: 'Error', color: '#F44336', icon: '🔴', animation: 'shake' },
    updating: { label: 'Updating', color: '#2196F3', icon: '🔵', animation: 'pulse' },
  };

  // Connectivity config
  const connectivityConfig = {
    bluetooth: { label: 'Bluetooth', icon: '📶', color: '#2196F3' },
    wifi: { label: 'WiFi', icon: '📶', color: '#4CAF50' },
    ethernet: { label: 'Ethernet', icon: '🔌', color: '#FF9800' },
    usb: { label: 'USB', icon: '🔗', color: '#9C27B0' },
    aux: { label: 'AUX', icon: '🎧', color: '#607D8B' },
  };

  // Effects
  useEffect(() => {
    setSpeakersList(speakers);
  }, [speakers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Audio control functions
  const handleVolumeChange = useCallback((speakerId, volume) => {
    setAudioState(prev => ({
      ...prev,
      [speakerId]: { ...prev[speakerId], volume }
    }));
    onVolumeChange?.(speakerId, volume);
  }, [onVolumeChange]);

  const handleMuteToggle = useCallback((speakerId) => {
    setAudioState(prev => ({
      ...prev,
      [speakerId]: {
        ...prev[speakerId],
        isMuted: !prev[speakerId]?.isMuted
      }
    }));
    onMuteToggle?.(speakerId);
  }, [onMuteToggle]);

  const handlePowerToggle = useCallback((speakerId) => {
    const speaker = speakersList.find(s => s.id === speakerId);
    const newStatus = speaker?.status === 'online' ? 'offline' : 'online';
    onPowerToggle?.(speakerId, newStatus);
  }, [speakersList, onPowerToggle]);

  const handleEQChange = useCallback((speakerId, eqSettings) => {
    setAudioState(prev => ({
      ...prev,
      [speakerId]: { ...prev[speakerId], eq: eqSettings }
    }));
    onEQChange?.(speakerId, eqSettings);
  }, [onEQChange]);

  // Main CRUD handlers
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

  const handleSelectSpeaker = useCallback((speakerId) => {
    setSelectedSpeakers(prev => {
      if (prev.includes(speakerId)) {
        return prev.filter(id => id !== speakerId);
      }
      return [...prev, speakerId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedSpeakers.length === paginatedSpeakers.length) {
      setSelectedSpeakers([]);
    } else {
      setSelectedSpeakers(paginatedSpeakers.map(s => s.id));
    }
  }, [selectedSpeakers, paginatedSpeakers]);

  const handleSpeakerClick = useCallback((speaker) => {
    onSpeakerSelect?.(speaker.id);
  }, [onSpeakerSelect]);

  const handleEditSpeaker = useCallback((speaker) => {
    setEditingSpeaker(speaker);
    setFormData(speaker);
    if (speaker.id && audioState[speaker.id]) {
      setAudioState(prev => ({
        ...prev,
        [speaker.id]: { ...prev[speaker.id] }
      }));
    }
    setIsModalOpen(true);
  }, [audioState]);

  const handleDeleteSpeaker = useCallback((speakerId) => {
    if (window.confirm('Are you sure you want to delete this speaker?')) {
      onSpeakerDelete?.(speakerId);
    }
  }, [onSpeakerDelete]);

  const handleCreateSpeaker = useCallback(() => {
    setEditingSpeaker(null);
    setFormData({
      name: '',
      model: '',
      brand: '',
      status: 'offline',
      connectivity: 'bluetooth',
      location: '',
      serialNumber: '',
      firmwareVersion: '',
      volume: 50,
      isMuted: false,
      eq: { bass: 0, mid: 0, treble: 0 },
      batteryLevel: 100,
      ipAddress: '',
      macAddress: '',
    });
    setIsModalOpen(true);
  }, []);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    if (editingSpeaker) {
      onSpeakerUpdate?.({ ...formData, id: editingSpeaker.id });
    } else {
      onSpeakerCreate?.(formData);
    }
    setIsModalOpen(false);
    setEditingSpeaker(null);
  }, [editingSpeaker, formData, onSpeakerUpdate, onSpeakerCreate]);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleBulkAction = useCallback((action) => {
    onBulkAction?.(action, selectedSpeakers);
    setSelectedSpeakers([]);
  }, [selectedSpeakers, onBulkAction]);

  const handleConnectivityChange = useCallback((speakerId, connectivity) => {
    onConnectivityChange?.(speakerId, connectivity);
  }, [onConnectivityChange]);

  const handleFirmwareUpdate = useCallback((speakerId) => {
    onFirmwareUpdate?.(speakerId);
  }, [onFirmwareUpdate]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingSpeaker(null);
  }, []);

  // Render functions
  const renderAudioControlsComponent = useCallback((speaker) => {
    if (renderAudioControls) {
      return renderAudioControls(speaker, {
        volume: audioState[speaker.id]?.volume || speaker.volume || 50,
        isMuted: audioState[speaker.id]?.isMuted || speaker.isMuted || false,
        eq: audioState[speaker.id]?.eq || speaker.eq || { bass: 0, mid: 0, treble: 0 },
        onVolumeChange: (vol) => handleVolumeChange(speaker.id, vol),
        onMuteToggle: () => handleMuteToggle(speaker.id),
        onEQChange: (eq) => handleEQChange(speaker.id, eq),
      });
    }

    const volume = audioState[speaker.id]?.volume ?? speaker.volume ?? 50;
    const isMuted = audioState[speaker.id]?.isMuted ?? speaker.isMuted ?? false;

    return (
      <div className="audio-controls">
        <div className="volume-control">
          <button
            className="mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleMuteToggle(speaker.id);
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(speaker.id, parseInt(e.target.value))}
            className="volume-slider"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="volume-value">{volume}%</span>
        </div>

        {showEQSettings && (
          <div className="eq-controls">
            <div className="eq-slider">
              <span>Bass</span>
              <input
                type="range"
                min="-10"
                max="10"
                value={audioState[speaker.id]?.eq?.bass ?? speaker.eq?.bass ?? 0}
                onChange={(e) => {
                  const newEQ = {
                    ...(audioState[speaker.id]?.eq || speaker.eq || { bass: 0, mid: 0, treble: 0 }),
                    bass: parseInt(e.target.value)
                  };
                  handleEQChange(speaker.id, newEQ);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="eq-slider">
              <span>Mid</span>
              <input
                type="range"
                min="-10"
                max="10"
                value={audioState[speaker.id]?.eq?.mid ?? speaker.eq?.mid ?? 0}
                onChange={(e) => {
                  const newEQ = {
                    ...(audioState[speaker.id]?.eq || speaker.eq || { bass: 0, mid: 0, treble: 0 }),
                    mid: parseInt(e.target.value)
                  };
                  handleEQChange(speaker.id, newEQ);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="eq-slider">
              <span>Treble</span>
              <input
                type="range"
                min="-10"
                max="10"
                value={audioState[speaker.id]?.eq?.treble ?? speaker.eq?.treble ?? 0}
                onChange={(e) => {
                  const newEQ = {
                    ...(audioState[speaker.id]?.eq || speaker.eq || { bass: 0, mid: 0, treble: 0 }),
                    treble: parseInt(e.target.value)
                  };
                  handleEQChange(speaker.id, newEQ);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    );
  }, [
    audioState, handleVolumeChange, handleMuteToggle,
    handleEQChange, showEQSettings, renderAudioControls
  ]);

  const renderSpeakerItem = useCallback((speaker) => {
    if (renderSpeakerCard) {
      return renderSpeakerCard(speaker, {
        isSelected: selectedSpeakers.includes(speaker.id),
        isEditing: editingSpeaker?.id === speaker.id,
        audioState: audioState[speaker.id] || {},
        onSelect: () => handleSelectSpeaker(speaker.id),
        onEdit: () => handleEditSpeaker(speaker),
        onDelete: () => handleDeleteSpeaker(speaker.id),
        onVolumeChange: (vol) => handleVolumeChange(speaker.id, vol),
        onMuteToggle: () => handleMuteToggle(speaker.id),
        onPowerToggle: () => handlePowerToggle(speaker.id),
        onConnectivityChange: (conn) => handleConnectivityChange(speaker.id, conn),
        onFirmwareUpdate: () => handleFirmwareUpdate(speaker.id),
      });
    }

    const status = statusConfig[speaker.status] || statusConfig.offline;
    const connectivity = connectivityConfig[speaker.connectivity] || connectivityConfig.bluetooth;

    return (
      <div
        key={speaker.id}
        className={`speaker-item ${selectedSpeakers.includes(speaker.id) ? 'speaker-selected' : ''}`}
        onClick={() => handleSpeakerClick(speaker)}
      >
        <div className="speaker-item-checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedSpeakers.includes(speaker.id)}
            onChange={() => handleSelectSpeaker(speaker.id)}
          />
        </div>
        
        <div className="speaker-item-image">
          {showDeviceImage && speaker.image ? (
            <img src={speaker.image} alt={speaker.name} />
          ) : (
            <div className="speaker-image-placeholder">
              <span className="speaker-icon">🔊</span>
            </div>
          )}
        </div>

        <div className="speaker-item-info">
          <div className="speaker-item-name">
            {speaker.name}
            <span className="speaker-brand">{speaker.brand}</span>
          </div>
          <div className="speaker-item-details">
            <span className="speaker-model">{speaker.model}</span>
            {speaker.location && (
              <span className="speaker-location">📍 {speaker.location}</span>
            )}
          </div>
          <div className="speaker-item-specs">
            <span className="speaker-serial">SN: {speaker.serialNumber}</span>
            {speaker.firmwareVersion && (
              <span className="speaker-firmware">FW: v{speaker.firmwareVersion}</span>
            )}
          </div>
        </div>

        <div className="speaker-item-status">
          {showStatusIndicators && (
            <div className="speaker-status-container">
              <span
                className={`status-indicator ${status.animation}`}
                style={{ backgroundColor: status.color }}
              />
              <span className="status-label" style={{ color: status.color }}>
                {status.icon} {status.label}
              </span>
            </div>
          )}
          
          {showConnectivity && (
            <span className="connectivity-badge" style={{
              backgroundColor: connectivity.color + '20',
              color: connectivity.color,
            }}>
              {connectivity.icon} {connectivity.label}
            </span>
          )}

          {showBatteryStatus && speaker.batteryLevel !== undefined && (
            <div className="battery-indicator">
              <span className="battery-icon">
                {speaker.batteryLevel > 50 ? '🔋' :
                 speaker.batteryLevel > 20 ? '🪫' : '⚠️'}
              </span>
              <span className="battery-level">{speaker.batteryLevel}%</span>
            </div>
          )}
        </div>

        {showAudioControls && (
          <div className="speaker-item-audio" onClick={(e) => e.stopPropagation()}>
            {renderAudioControlsComponent(speaker)}
          </div>
        )}

        {showActions && !readOnly && (
          <div className="speaker-item-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="action-btn power-btn"
              onClick={() => handlePowerToggle(speaker.id)}
              title={speaker.status === 'online' ? 'Power Off' : 'Power On'}
            >
              {speaker.status === 'online' ? '⏻' : '⏽'}
            </button>
            <button
              className="action-btn edit-btn"
              onClick={() => handleEditSpeaker(speaker)}
              title="Edit Speaker"
            >
              ✏️
            </button>
            <button
              className="action-btn delete-btn"
              onClick={() => handleDeleteSpeaker(speaker.id)}
              title="Delete Speaker"
            >
              🗑️
            </button>
            {speaker.firmwareVersion && (
              <button
                className="action-btn update-btn"
                onClick={() => handleFirmwareUpdate(speaker.id)}
                title="Update Firmware"
              >
                ⬆️
              </button>
            )}
          </div>
        )}
      </div>
    );
  }, [
    selectedSpeakers, editingSpeaker, audioState, showDeviceImage,
    showStatusIndicators, showConnectivity, showBatteryStatus,
    showAudioControls, showActions, readOnly, handleSelectSpeaker,
    handleSpeakerClick, handleEditSpeaker, handleDeleteSpeaker,
    handleVolumeChange, handleMuteToggle, handlePowerToggle,
    handleConnectivityChange, handleFirmwareUpdate,
    renderSpeakerCard, renderAudioControlsComponent, statusConfig,
    connectivityConfig
  ]);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="speakers-loading">
        <div className="loading-spinner"></div>
        <p>Loading speakers...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="speakers-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (speakersList.length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="speakers-empty">
        <span className="empty-icon">🔊</span>
        <h3>No Speakers Found</h3>
        <p>Get started by adding your first speaker device.</p>
        {!readOnly && (
          <button className="create-speaker-btn" onClick={handleCreateSpeaker}>
            + Add Speaker
          </button>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div className={`speakers-container speakers-${theme} ${className}`} style={style}>
      {/* Header */}
      <div className="speakers-header">
        <div className="speakers-header-left">
          <h2 className="speakers-title">Speaker Management</h2>
          <span className="speakers-count">
            {filteredSpeakers.length} speakers
            {filteredSpeakers.length !== speakersList.length && ` (${speakersList.length} total)`}
          </span>
          <div className="speakers-status-summary">
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = speakersList.filter(s => s.status === key).length;
              return count > 0 && (
                <span key={key} className="status-summary-item" style={{ color: config.color }}>
                  {config.icon} {count}
                </span>
              );
            })}
          </div>
        </div>
        <div className="speakers-header-actions">
          {!readOnly && (
            <button className="create-speaker-btn" onClick={handleCreateSpeaker}>
              + Add Speaker
            </button>
          )}
          {showBulkActions && selectedSpeakers.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedSpeakers.length} selected</span>
              <button onClick={() => handleBulkAction('powerOn')}>Power On</button>
              <button onClick={() => handleBulkAction('powerOff')}>Power Off</button>
              <button onClick={() => handleBulkAction('delete')}>Delete</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {(showSearch || showFilters) && (
        <div className="speakers-filters">
          {showSearch && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search speakers..."
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
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                {deviceStatuses.map(status => (
                  <option key={status} value={status}>
                    {statusConfig[status]?.label || status}
                  </option>
                ))}
              </select>

              <select
                value={filters.connectivity}
                onChange={(e) => handleFilterChange('connectivity', e.target.value)}
                className="filter-select"
              >
                <option value="">All Connectivity</option>
                {connectivityTypes.map(type => (
                  <option key={type} value={type}>
                    {connectivityConfig[type]?.label || type}
                  </option>
                ))}
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

              {brands.length > 0 && (
                <select
                  value={filters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              )}

              {renderSpeakerFilters && renderSpeakerFilters({ filters, onFilterChange: handleFilterChange })}
            </div>
          )}
        </div>
      )}

      {/* Speakers List */}
      <div className="speakers-list">
        {layout === 'grid' && (
          <div className="speakers-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {paginatedSpeakers.map(speaker => renderSpeakerItem(speaker))}
          </div>
        )}

        {layout === 'list' && (
          <div className="speakers-list-view">
            {paginatedSpeakers.map(speaker => renderSpeakerItem(speaker))}
          </div>
        )}

        {layout === 'table' && (
          <table className="speakers-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedSpeakers.length === paginatedSpeakers.length && paginatedSpeakers.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th onClick={() => handleSort('name')}>
                  Device {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('brand')}>
                  Brand {sortConfig.key === 'brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('model')}>
                  Model {sortConfig.key === 'model' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('location')}>
                  Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Connectivity</th>
                <th>Audio</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSpeakers.map(speaker => {
                const status = statusConfig[speaker.status] || statusConfig.offline;
                return (
                  <tr key={speaker.id} className={selectedSpeakers.includes(speaker.id) ? 'speaker-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSpeakers.includes(speaker.id)}
                        onChange={() => handleSelectSpeaker(speaker.id)}
                      />
                    </td>
                    <td>
                      <div className="table-speaker-info">
                        {showDeviceImage && speaker.image ? (
                          <img src={speaker.image} alt={speaker.name} className="table-avatar" />
                        ) : (
                          <div className="table-avatar-placeholder">🔊</div>
                        )}
                        <span>{speaker.name}</span>
                      </div>
                    </td>
                    <td>{speaker.brand}</td>
                    <td>{speaker.model}</td>
                    <td>
                      {showStatusIndicators && (
                        <span className="speaker-status" style={{ color: status.color }}>
                          {status.icon} {status.label}
                        </span>
                      )}
                    </td>
                    <td>{speaker.location || '—'}</td>
                    <td>
                      {showConnectivity && (
                        <span className="connectivity-badge" style={{
                          backgroundColor: connectivityConfig[speaker.connectivity]?.color + '20',
                          color: connectivityConfig[speaker.connectivity]?.color,
                        }}>
                          {connectivityConfig[speaker.connectivity]?.icon || '📶'}
                          {' '}
                          {connectivityConfig[speaker.connectivity]?.label || speaker.connectivity}
                        </span>
                      )}
                    </td>
                    <td>
                      {showAudioControls && speaker.status === 'online' && (
                        <div className="table-audio-controls">
                          <button onClick={() => handleMuteToggle(speaker.id)}>
                            {audioState[speaker.id]?.isMuted || speaker.isMuted ? '🔇' : '🔊'}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={audioState[speaker.id]?.volume ?? speaker.volume ?? 50}
                            onChange={(e) => handleVolumeChange(speaker.id, parseInt(e.target.value))}
                            className="table-volume-slider"
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      {showActions && !readOnly && (
                        <div className="table-actions">
                          <button onClick={() => handlePowerToggle(speaker.id)} title="Power">
                            {speaker.status === 'online' ? '⏻' : '⏽'}
                          </button>
                          <button onClick={() => handleEditSpeaker(speaker)}>✏️</button>
                          <button onClick={() => handleDeleteSpeaker(speaker.id)}>🗑️</button>
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
        <div className="speakers-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-btn"
          >
            Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 7) {
                if (currentPage <= 4) {
                  if (i === 6) return '...';
                } else if (currentPage >= totalPages - 3) {
                  if (i === 0) return '...';
                  page = totalPages - 6 + i;
                } else {
                  if (i === 0) return '...';
                  if (i === 6) return '...';
                  page = currentPage - 2 + i;
                }
              }
              return page;
            }).map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`page-number ${page === currentPage ? 'active' : ''}`}
                >
                  {page}
                </button>
              )
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
            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedSpeakers.length)} of {sortedSpeakers.length}
          </span>
        </div>
      )}

      {/* Speaker Form Modal */}
      {isModalOpen && (
        <div className="speakers-modal-overlay">
          <div className="speakers-modal" ref={modalRef}>
            <div className="modal-header">
              <h3>{editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}</h3>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="speaker-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Living Room Speaker"
                  />
                </div>

                <div className="form-group">
                  <label>Brand *</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand || ''}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Bose"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model *</label>
                  <input
                    type="text"
                    name="model