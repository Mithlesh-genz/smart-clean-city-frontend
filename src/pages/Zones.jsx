// Zone.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Zone.css'; // Optional: for styling

// Zone Component
const Zone = ({
  // Core props
  id,
  name,
  description,
  type = 'residential', // 'residential', 'commercial', 'industrial', 'mixed', 'park', 'water'
  status = 'active', // 'active', 'inactive', 'maintenance', 'restricted'
  
  // Geographic/Location props
  coordinates = [],
  boundary = [],
  center = { lat: 0, lng: 0 },
  area = 0,
  
  // Statistical props
  stats = {
    totalDustbins: 0,
    activeDustbins: 0,
    fillLevelAverage: 0,
    collectionFrequency: 'daily',
    lastCollection: null,
    nextCollection: null,
  },
  
  // Capacity props
  capacity = {
    total: 0,
    used: 0,
    available: 0,
    unit: 'kg',
  },
  
  // UI props
  isSelected = false,
  isHighlighted = false,
  isExpanded = false,
  onSelect,
  onClick,
  onAction,
  onExpand,
  onEdit,
  onDelete,
  onStatusChange,
  
  // Styling props
  className = '',
  style = {},
  theme = 'light', // 'light', 'dark', 'colorful'
  size = 'medium', // 'small', 'medium', 'large'
  showStats = true,
  showMap = false,
  showActions = true,
  showDetails = false,
  
  // Children
  children,
  renderHeader,
  renderStats,
  renderDetails,
  renderActions,
}) => {
  // Local state
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(isExpanded);
  const [localStats, setLocalStats] = useState(stats);
  const [animate, setAnimate] = useState(false);

  // Calculate zone utilization
  const utilizationPercentage = useMemo(() => {
    if (capacity.total === 0) return 0;
    return Math.round((capacity.used / capacity.total) * 100);
  }, [capacity.total, capacity.used]);

  // Status configuration
  const statusConfig = useMemo(() => ({
    active: {
      label: 'Active',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      icon: '🟢',
    },
    inactive: {
      label: 'Inactive',
      color: '#9E9E9E',
      bgColor: '#F5F5F5',
      icon: '⚪',
    },
    maintenance: {
      label: 'Maintenance',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      icon: '🟡',
    },
    restricted: {
      label: 'Restricted',
      color: '#F44336',
      bgColor: '#FFEBEE',
      icon: '🔴',
    },
  }), []);

  // Type configuration
  const typeConfig = useMemo(() => ({
    residential: {
      label: 'Residential',
      icon: '🏘️',
      color: '#2196F3',
      bgColor: '#E3F2FD',
    },
    commercial: {
      label: 'Commercial',
      icon: '🏢',
      color: '#9C27B0',
      bgColor: '#F3E5F5',
    },
    industrial: {
      label: 'Industrial',
      icon: '🏭',
      color: '#607D8B',
      bgColor: '#ECEFF1',
    },
    mixed: {
      label: 'Mixed Use',
      icon: '🏙️',
      color: '#FF5722',
      bgColor: '#FBE9E7',
    },
    park: {
      label: 'Park',
      icon: '🌳',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
    },
    water: {
      label: 'Water',
      icon: '🌊',
      color: '#00BCD4',
      bgColor: '#E0F7FA',
    },
  }), []);

  const currentStatus = statusConfig[status] || statusConfig.active;
  const currentType = typeConfig[type] || typeConfig.residential;

  // Handle expand toggle
  const handleToggleExpand = useCallback(() => {
    setIsOpen(!isOpen);
    if (onExpand) {
      onExpand(id, !isOpen);
    }
  }, [id, isOpen, onExpand]);

  // Handle card click
  const handleCardClick = useCallback((e) => {
    if (onClick) {
      onClick(id, e);
    }
    if (onSelect && !isSelected) {
      onSelect(id);
    }
  }, [id, onClick, onSelect, isSelected]);

  // Handle status change
  const handleStatusChange = useCallback((newStatus) => {
    if (onStatusChange) {
      onStatusChange(id, newStatus);
    }
  }, [id, onStatusChange]);

  // Trigger animation on mount
  useEffect(() => {
    setAnimate(true);
    const timer = setTimeout(() => setAnimate(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Update local stats when props change
  useEffect(() => {
    setLocalStats(stats);
  }, [stats]);

  // Format date helper
  const formatDate = useCallback((date) => {
    if (!date) return 'Not scheduled';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get size classes
  const sizeClasses = {
    small: 'zone-small',
    medium: 'zone-medium',
    large: 'zone-large',
  };

  // Get theme classes
  const themeClasses = {
    light: 'zone-light',
    dark: 'zone-dark',
    colorful: 'zone-colorful',
  };

  // Zone class name
  const zoneClassName = `
    zone 
    zone-${status}
    ${sizeClasses[size] || sizeClasses.medium}
    ${themeClasses[theme] || themeClasses.light}
    ${isSelected ? 'zone-selected' : ''}
    ${isHighlighted ? 'zone-highlighted' : ''}
    ${isHovered ? 'zone-hovered' : ''}
    ${isOpen ? 'zone-expanded' : ''}
    ${animate ? 'zone-animate' : ''}
    ${className}
  `.trim();

  return (
    <div
      className={zoneClassName}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-zone-id={id}
      data-zone-status={status}
      data-zone-type={type}
    >
      {/* Header Section */}
      <div className="zone-header" style={{ borderColor: currentStatus.color }}>
        <div className="zone-header-left">
          <div className="zone-type-badge" style={{ 
            backgroundColor: currentType.bgColor,
            color: currentType.color,
          }}>
            <span className="zone-type-icon">{currentType.icon}</span>
            <span className="zone-type-label">{currentType.label}</span>
          </div>
          <div className="zone-status-badge" style={{
            backgroundColor: currentStatus.bgColor,
            color: currentStatus.color,
          }}>
            <span className="zone-status-icon">{currentStatus.icon}</span>
            <span className="zone-status-label">{currentStatus.label}</span>
          </div>
        </div>

        <div className="zone-header-right">
          {renderHeader ? (
            renderHeader({ id, name, status, type })
          ) : (
            <>
              <h3 className="zone-name">{name || `Zone #${id}`}</h3>
              {description && <p className="zone-description">{description}</p>}
            </>
          )}
          
          {showActions && (
            <div className="zone-actions">
              {onEdit && (
                <button
                  className="zone-action-btn zone-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(id);
                  }}
                  title="Edit Zone"
                >
                  ✏️
                </button>
              )}
              {onDelete && (
                <button
                  className="zone-action-btn zone-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete zone "${name || id}"?`)) {
                      onDelete(id);
                    }
                  }}
                  title="Delete Zone"
                >
                  🗑️
                </button>
              )}
              {onExpand && (
                <button
                  className="zone-action-btn zone-expand-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpand();
                  }}
                  title={isOpen ? 'Collapse' : 'Expand'}
                >
                  {isOpen ? '▲' : '▼'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="zone-body">
        {/* Map Preview */}
        {showMap && boundary.length > 0 && (
          <div className="zone-map-preview">
            <div className="zone-map-placeholder">
              <span className="map-icon">🗺️</span>
              <span className="map-text">{boundary.length} points mapped</span>
              {area > 0 && <span className="map-area">{area} m²</span>}
            </div>
            {/* You can integrate a real map component here */}
          </div>
        )}

        {/* Stats Section */}
        {showStats && (
          <div className="zone-stats-grid">
            <div className="zone-stat-item">
              <span className="stat-label">Total Dustbins</span>
              <span className="stat-value">{localStats.totalDustbins || 0}</span>
            </div>
            <div className="zone-stat-item">
              <span className="stat-label">Active</span>
              <span className="stat-value" style={{ color: '#4CAF50' }}>
                {localStats.activeDustbins || 0}
              </span>
            </div>
            <div className="zone-stat-item">
              <span className="stat-label">Avg. Fill</span>
              <span className="stat-value" style={{
                color: (localStats.fillLevelAverage || 0) > 80 ? '#F44336' :
                       (localStats.fillLevelAverage || 0) > 50 ? '#FF9800' :
                       '#4CAF50'
              }}>
                {localStats.fillLevelAverage || 0}%
              </span>
            </div>
            <div className="zone-stat-item">
              <span className="stat-label">Collection</span>
              <span className="stat-value" style={{ fontSize: '12px' }}>
                {localStats.collectionFrequency || 'N/A'}
              </span>
            </div>
          </div>
        )}

        {/* Capacity Bar */}
        {capacity.total > 0 && (
          <div className="zone-capacity">
            <div className="capacity-header">
              <span className="capacity-label">Capacity Usage</span>
              <span className="capacity-value">
                {capacity.used} / {capacity.total} {capacity.unit}
              </span>
            </div>
            <div className="capacity-bar">
              <div
                className="capacity-fill"
                style={{
                  width: `${Math.min(utilizationPercentage, 100)}%`,
                  backgroundColor: utilizationPercentage > 90 ? '#F44336' :
                                 utilizationPercentage > 70 ? '#FF9800' :
                                 '#4CAF50',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <div className="capacity-details">
              <span className="capacity-available">
                Available: {capacity.available} {capacity.unit}
              </span>
              <span className="capacity-percentage">{utilizationPercentage}%</span>
            </div>
          </div>
        )}

        {/* Collection Schedule */}
        <div className="zone-schedule">
          {localStats.lastCollection && (
            <div className="schedule-item">
              <span className="schedule-label">Last Collection</span>
              <span className="schedule-value">{formatDate(localStats.lastCollection)}</span>
            </div>
          )}
          {localStats.nextCollection && (
            <div className="schedule-item">
              <span className="schedule-label">Next Collection</span>
              <span className="schedule-value" style={{ color: '#2196F3' }}>
                {formatDate(localStats.nextCollection)}
              </span>
            </div>
          )}
        </div>

        {/* Custom Details */}
        {isOpen && showDetails && (
          <div className="zone-details">
            {renderDetails ? (
              renderDetails({ id, name, status, type, stats: localStats, capacity })
            ) : (
              <div className="zone-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Zone ID</span>
                  <span className="detail-value">{id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{currentType.label}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{currentStatus.label}</span>
                </div>
                {area > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Area</span>
                    <span className="detail-value">{area} m²</span>
                  </div>
                )}
                {center.lat && center.lng && (
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Coordinates</span>
                    <span className="detail-value">
                      {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Stats */}
        {isOpen && renderStats && (
          <div className="zone-custom-stats">
            {renderStats({ id, stats: localStats, capacity })}
          </div>
        )}

        {/* Children */}
        {children && (
          <div className="zone-children">
            {children}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {showActions && (
        <div className="zone-footer">
          {renderActions ? (
            renderActions({ id, status, onStatusChange: handleStatusChange })
          ) : (
            <div className="zone-footer-actions">
              <button
                className="zone-footer-btn zone-view-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAction) onAction('view', id);
                }}
              >
                View Details
              </button>
              {status !== 'inactive' && (
                <button
                  className="zone-footer-btn zone-schedule-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAction) onAction('schedule', id);
                  }}
                >
                  Schedule Collection
                </button>
              )}
              <select
                className="zone-status-select"
                value={status}
                onChange={(e) => {
                  e.stopPropagation();
                  handleStatusChange(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="restricted">Restricted</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Zone List Component
export const ZoneList = ({
  zones = [],
  onZoneSelect,
  onZoneAction,
  selectedZoneId,
  className = '',
  ...props
}) => {
  return (
    <div className={`zone-list ${className}`}>
      {zones.map((zone) => (
        <Zone
          key={zone.id}
          {...zone}
          {...props}
          isSelected={zone.id === selectedZoneId}
          onSelect={onZoneSelect}
          onAction={(action, id) => onZoneAction?.(action, id)}
        />
      ))}
      {zones.length === 0 && (
        <div className="zone-empty-state">
          <span className="empty-icon">🗺️</span>
          <p className="empty-text">No zones available</p>
        </div>
      )}
    </div>
  );
};

// Zone Grid Component
export const ZoneGrid = ({
  zones = [],
  columns = 3,
  onZoneSelect,
  onZoneAction,
  selectedZoneId,
  className = '',
  ...props
}) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '20px',
  };

  return (
    <div className={`zone-grid ${className}`} style={gridStyle}>
      {zones.map((zone) => (
        <Zone
          key={zone.id}
          {...zone}
          {...props}
          isSelected={zone.id === selectedZoneId}
          onSelect={onZoneSelect}
          onAction={(action, id) => onZoneAction?.(action, id)}
        />
      ))}
      {zones.length === 0 && (
        <div className="zone-empty-state zone-empty-grid">
          <span className="empty-icon">🗺️</span>
          <p className="empty-text">No zones available</p>
        </div>
      )}
    </div>
  );
};

export default Zone;