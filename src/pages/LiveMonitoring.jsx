// LiveMonitoring.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './LiveMonitoring.css'; // Optional: for styling

// Live Monitoring Component
const LiveMonitoring = ({
  // Data props
  data = {
    devices: [],
    metrics: {},
    alerts: [],
    status: {},
    history: [],
  },
  onDataUpdate,
  onAlertAcknowledge,
  onDeviceControl,
  onThresholdUpdate,
  
  // Configuration
  updateInterval = 5000, // ms
  maxHistoryPoints = 100,
  alertThresholds = {
    critical: 90,
    warning: 70,
    info: 50,
  },
  
  // UI props
  isLoading = false,
  error = null,
  showMetrics = true,
  showAlerts = true,
  showHistory = true,
  showStatusGrid = true,
  showControls = true,
  showCharts = true,
  showFilters = true,
  showSearch = true,
  showAutoScroll = true,
  
  // Theme and styling
  theme = 'dark',
  className = '',
  style = {},
  statusColors = {
    online: '#4CAF50',
    offline: '#9E9E9E',
    warning: '#FF9800',
    error: '#F44336',
    critical: '#D32F2F',
    idle: '#2196F3',
  },
  
  // Custom render props
  renderDeviceCard,
  renderMetric,
  renderAlert,
  renderStatusIndicator,
  renderChart,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  renderControls,
  
  // Event handlers
  onDeviceSelect,
  onAlertClick,
  onMetricClick,
  onStatusClick,
  onRefresh,
  onExport,
  
  // Children
  children,
}) => {
  // State
  const [monitoringData, setMonitoringData] = useState(data);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [alerts, setAlerts] = useState(data.alerts || []);
  const [history, setHistory] = useState(data.history || []);
  const [status, setStatus] = useState(data.status || {});
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
  });
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoScroll, setAutoScroll] = useState(showAutoScroll);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());
  const [alertCounts, setAlertCounts] = useState({
    critical: 0,
    warning: 0,
    info: 0,
  });
  
  // Refs
  const wsRef = useRef(null);
  const historyRef = useRef(null);
  const alertRef = useRef(null);
  const intervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const chartRefs = useRef({});

  // Derived data
  const devicesData = useMemo(() => {
    return monitoringData.devices || [];
  }, [monitoringData]);

  const metricsData = useMemo(() => {
    return monitoringData.metrics || {};
  }, [monitoringData]);

  const statusData = useMemo(() => {
    return monitoringData.status || {};
  }, [monitoringData]);

  // Filter devices
  const filteredDevices = useMemo(() => {
    let result = [...devicesData];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(device =>
        device.name?.toLowerCase().includes(searchLower) ||
        device.id?.toLowerCase().includes(searchLower) ||
        device.type?.toLowerCase().includes(searchLower) ||
        device.location?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status) {
      result = result.filter(device => device.status === filters.status);
    }
    
    if (filters.type) {
      result = result.filter(device => device.type === filters.type);
    }
    
    if (filters.priority) {
      result = result.filter(device => device.priority === filters.priority);
    }
    
    return result;
  }, [devicesData, searchTerm, filters]);

  // Calculate alert counts
  useEffect(() => {
    const counts = alerts.reduce((acc, alert) => {
      if (alert.priority === 'critical') acc.critical++;
      else if (alert.priority === 'warning') acc.warning++;
      else if (alert.priority === 'info') acc.info++;
      return acc;
    }, { critical: 0, warning: 0, info: 0 });
    setAlertCounts(counts);
  }, [alerts]);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // In a real app, you would connect to your WebSocket server
        // const ws = new WebSocket('ws://your-server.com/monitoring');
        // wsRef.current = ws;
        
        // Simulate WebSocket connection
        console.log('WebSocket connecting...');
        setIsConnected(true);
        
        // ws.onopen = () => {
        //   console.log('WebSocket connected');
        //   setIsConnected(true);
        // };
        // 
        // ws.onmessage = (event) => {
        //   const data = JSON.parse(event.data);
        //   handleWebSocketMessage(data);
        // };
        // 
        // ws.onclose = () => {
        //   console.log('WebSocket disconnected');
        //   setIsConnected(false);
        //   attemptReconnect();
        // };
        // 
        // ws.onerror = (error) => {
        //   console.error('WebSocket error:', error);
        // };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Auto-reconnect
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      // WebSocket reconnection logic
    }, 5000);
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'device_update':
        updateDevice(message.data);
        break;
      case 'metric_update':
        updateMetric(message.data);
        break;
      case 'alert':
        addAlert(message.data);
        break;
      case 'status_change':
        updateStatus(message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  // Update device
  const updateDevice = useCallback((deviceData) => {
    setMonitoringData(prev => {
      const devices = prev.devices || [];
      const index = devices.findIndex(d => d.id === deviceData.id);
      
      let updatedDevices;
      if (index >= 0) {
        updatedDevices = [...devices];
        updatedDevices[index] = { ...updatedDevices[index], ...deviceData };
      } else {
        updatedDevices = [...devices, deviceData];
      }
      
      return { ...prev, devices: updatedDevices };
    });
  }, []);

  // Update metric
  const updateMetric = useCallback((metricData) => {
    setMonitoringData(prev => ({
      ...prev,
      metrics: { ...prev.metrics, ...metricData }
    }));
    
    // Add to history
    const newHistory = {
      timestamp: new Date(),
      ...metricData
    };
    
    setHistory(prev => {
      const updated = [newHistory, ...prev];
      return updated.slice(0, maxHistoryPoints);
    });
  }, [maxHistoryPoints]);

  // Add alert
  const addAlert = useCallback((alertData) => {
    const newAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };
    
    setAlerts(prev => [newAlert, ...prev]);
    
    // Show notification if browser supports it
    if (alertData.priority === 'critical' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Critical Alert!', {
            body: alertData.message,
            icon: '🚨'
          });
        }
      });
    }
    
    // Trigger alert sound for critical alerts
    if (alertData.priority === 'critical') {
      // In a real app, you would play an alert sound
      // playAlertSound();
    }
  }, []);

  // Update status
  const updateStatus = useCallback((statusData) => {
    setStatus(prev => ({ ...prev, ...statusData }));
  }, []);

  // Simulate data updates
  useEffect(() => {
    if (!onDataUpdate) return;
    
    intervalRef.current = setInterval(() => {
      // Simulate real-time data updates
      onDataUpdate({
        timestamp: new Date(),
        data: monitoringData,
      });
      
      setLastUpdate(new Date());
    }, updateInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [onDataUpdate, monitoringData, updateInterval]);

  // Alert handlers
  const handleAcknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true } 
          : alert
      )
    );
    onAlertAcknowledge?.(alertId);
  }, [onAlertAcknowledge]);

  const handleExpandAlert = useCallback((alertId) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);

  const handleClearAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => alert.acknowledged));
  }, []);

  const handleClearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Device control handler
  const handleDeviceControl = useCallback((deviceId, action, params = {}) => {
    onDeviceControl?.(deviceId, action, params);
  }, [onDeviceControl]);

  // Search handler
  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Filter handler
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    setLastUpdate(new Date());
  }, [onRefresh]);

  // Export data
  const handleExport = useCallback((format = 'json') => {
    onExport?.({
      format,
      data: monitoringData,
      alerts,
      history,
    });
  }, [monitoringData, alerts, history, onExport]);

  // Format time
  const formatTime = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  // Format date
  const formatDate = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get status color
  const getStatusColor = useCallback((status) => {
    return statusColors[status] || '#9E9E9E';
  }, [statusColors]);

  // Get alert priority color
  const getAlertPriorityColor = useCallback((priority) => {
    const colors = {
      critical: statusColors.critical,
      warning: statusColors.warning,
      info: statusColors.info,
    };
    return colors[priority] || statusColors.info;
  }, [statusColors]);

  // Render device card
  const renderDeviceCardItem = useCallback((device) => {
    if (renderDeviceCard) {
      return renderDeviceCard(device, {
        onSelect: () => onDeviceSelect?.(device.id),
        onControl: (action, params) => handleDeviceControl(device.id, action, params),
        isSelected: selectedDevice?.id === device.id,
      });
    }

    const statusColor = getStatusColor(device.status);

    return (
      <div 
        key={device.id}
        className={`device-card ${selectedDevice?.id === device.id ? 'selected' : ''}`}
        onClick={() => {
          setSelectedDevice(device);
          onDeviceSelect?.(device.id);
        }}
        style={{ borderLeftColor: statusColor }}
      >
        <div className="device-card-header">
          <div className="device-icon">
            {device.icon || '📡'}
          </div>
          <div className="device-info">
            <h4 className="device-name">{device.name}</h4>
            <span className="device-type">{device.type}</span>
          </div>
          <div 
            className={`device-status ${device.status}`}
            style={{ backgroundColor: statusColor }}
          >
            <span className="status-dot"></span>
            {device.status}
          </div>
        </div>
        
        <div className="device-card-body">
          {device.location && (
            <div className="device-location">
              📍 {device.location}
            </div>
          )}
          {device.metrics && (
            <div className="device-metrics">
              {Object.entries(device.metrics).map(([key, value]) => (
                <div key={key} className="device-metric">
                  <span className="metric-label">{key}</span>
                  <span className="metric-value">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {showControls && (
          <div className="device-card-actions">
            <button 
              className="control-btn view-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDevice(device);
                onDeviceSelect?.(device.id);
              }}
            >
              View Details
            </button>
            {device.status === 'online' && (
              <>
                <button 
                  className="control-btn control-btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeviceControl(device.id, 'restart');
                  }}
                >
                  🔄 Restart
                </button>
                <button 
                  className="control-btn control-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeviceControl(device.id, 'shutdown');
                  }}
                >
                  ⏻ Shutdown
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }, [
    selectedDevice, renderDeviceCard, onDeviceSelect,
    handleDeviceControl, getStatusColor, showControls
  ]);

  // Render metric
  const renderMetricItem = useCallback((metric) => {
    if (renderMetric) {
      return renderMetric(metric);
    }

    const value = metricsData[metric.key];
    const threshold = alertThresholds[metric.priority] || 50;
    const isCritical = value > threshold;
    const status = isCritical ? 'critical' : 'normal';

    return (
      <div 
        key={metric.key}
        className={`metric-item metric-${status}`}
        onClick={() => {
          setSelectedMetric(metric);
          onMetricClick?.(metric);
        }}
      >
        <div className="metric-header">
          <span className="metric-icon">{metric.icon || '📊'}</span>
          <span className="metric-name">{metric.label}</span>
        </div>
        <div className="metric-value-display">
          <span className="metric-current">{value}</span>
          <span className="metric-unit">{metric.unit || ''}</span>
        </div>
        <div className="metric-progress">
          <div 
            className="metric-progress-bar"
            style={{
              width: `${Math.min((value / threshold) * 100, 100)}%`,
              backgroundColor: isCritical ? statusColors.critical : statusColors.online
            }}
          />
        </div>
        <div className="metric-threshold">
          <span>Threshold: {threshold}</span>
          <span className={`metric-status ${status}`}>
            {isCritical ? '⚠️ Critical' : '✅ Normal'}
          </span>
        </div>
      </div>
    );
  }, [metricsData, alertThresholds, statusColors, onMetricClick, renderMetric]);

  // Render alert
  const renderAlertItem = useCallback((alert) => {
    if (renderAlert) {
      return renderAlert(alert, {
        onAcknowledge: () => handleAcknowledgeAlert(alert.id),
        onExpand: () => handleExpandAlert(alert.id),
        isExpanded: expandedAlerts.has(alert.id),
      });
    }

    const priorityColor = getAlertPriorityColor(alert.priority);
    const isExpanded = expandedAlerts.has(alert.id);

    return (
      <div 
        key={alert.id}
        className={`alert-item alert-${alert.priority} ${alert.acknowledged ? 'acknowledged' : ''}`}
        style={{ borderLeftColor: priorityColor }}
      >
        <div className="alert-header">
          <div className="alert-icon">
            {alert.priority === 'critical' && '🚨'}
            {alert.priority === 'warning' && '⚠️'}
            {alert.priority === 'info' && 'ℹ️'}
          </div>
          <div className="alert-info">
            <span className="alert-title">{alert.title}</span>
            <span className="alert-time">{formatTime(alert.timestamp)}</span>
          </div>
          <div className="alert-actions">
            {!alert.acknowledged && (
              <button 
                className="acknowledge-btn"
                onClick={() => handleAcknowledgeAlert(alert.id)}
              >
                ✓ Acknowledge
              </button>
            )}
            <button 
              className="expand-btn"
              onClick={() => handleExpandAlert(alert.id)}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
        
        <div className="alert-message">
          {alert.message}
        </div>
        
        {isExpanded && alert.details && (
          <div className="alert-details">
            {Object.entries(alert.details).map(([key, value]) => (
              <div key={key} className="alert-detail-item">
                <span className="detail-label">{key}</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}
          </div>
        )}
        
        {alert.acknowledged && (
          <div className="alert-acknowledged">
            ✅ Acknowledged
          </div>
        )}
      </div>
    );
  }, [
    expandedAlerts, formatTime, getAlertPriorityColor,
    handleAcknowledgeAlert, handleExpandAlert, renderAlert
  ]);

  // Render chart
  const renderChartComponent = useCallback(() => {
    if (renderChart) {
      return renderChart({
        data: history,
        metrics: metricsData,
        status: statusData,
      });
    }

    if (!showCharts || history.length === 0) return null;

    return (
      <div className="monitoring-chart">
        <div className="chart-header">
          <h4>Real-time History</h4>
          <span className="chart-points">{history.length} data points</span>
        </div>
        <div className="chart-container">
          <svg viewBox="0 0 800 200" className="history-chart">
            {history.map((point, index) => {
              const x = (index / history.length) * 800;
              // Find the first metric value
              const metricKey = Object.keys(point).find(k => k !== 'timestamp');
              const value = metricKey ? point[metricKey] : 0;
              const y = 200 - (value / 100) * 180;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={3}
                  fill={statusColors.online}
                  opacity={0.8}
                />
              );
            })}
            <polyline
              points={history.map((point, index) => {
                const x = (index / history.length) * 800;
                const metricKey = Object.keys(point).find(k => k !== 'timestamp');
                const value = metricKey ? point[metricKey] : 0;
                const y = 200 - (value / 100) * 180;
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke={statusColors.online}
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="chart-footer">
          <span>Last update: {formatTime(lastUpdate)}</span>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live' : '🔴 Disconnected'}
          </span>
        </div>
      </div>
    );
  }, [history, metricsData, statusData, showCharts, statusColors, lastUpdate, isConnected, formatTime, renderChart]);

  // Effects - Auto-scroll alerts
  useEffect(() => {
    if (autoScroll && alertRef.current) {
      alertRef.current.scrollTop = 0;
    }
  }, [alerts, autoScroll]);

  // Effects - Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="monitoring-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to monitoring system...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="monitoring-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (!monitoringData || Object.keys(monitoringData).length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="monitoring-empty">
        <span className="empty-icon">📡</span>
        <h3>No Monitoring Data</h3>
        <p>Waiting for data from monitoring system...</p>
        <button className="refresh-btn" onClick={handleRefresh}>
          Refresh
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div 
      className={`monitoring-container monitoring-${theme} ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="monitoring-header">
        <div className="monitoring-header-left">
          <h2 className="monitoring-title">Live Monitoring</h2>
          <div className="monitoring-status-summary">
            <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Live' : '🔴 Disconnected'}
            </span>
            <span className="last-update">
              Updated: {formatTime(lastUpdate)}
            </span>
          </div>
        </div>
        
        <div className="monitoring-header-right">
          {showSearch && (
            <div className="monitoring-search">
              <input
                type="text"
                placeholder="Search devices..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          )}
          
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            title="Refresh data"
          >
            🔄
          </button>
          
          <button 
            className="export-btn"
            onClick={() => handleExport('json')}
            title="Export data"
          >
            📤
          </button>
          
          {renderControls && renderControls({
            onRefresh: handleRefresh,
            onExport: handleExport,
            isConnected,
            lastUpdate,
          })}
        </div>
      </div>

      {/* Status Grid */}
      {showStatusGrid && Object.keys(statusData).length > 0 && (
        <div className="status-grid">
          {Object.entries(statusData).map(([key, value]) => (
            <div 
              key={key}
              className="status-item"
              onClick={() => onStatusClick?.(key, value)}
            >
              <span className="status-label">{key}</span>
              <span 
                className="status-value"
                style={{ color: getStatusColor(value.status) }}
              >
                {value.value || value.status || value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alert Summary */}
      {showAlerts && (
        <div className="alert-summary">
          <div className="alert-summary-header">
            <h4>Alerts</h4>
            <div className="alert-counts">
              {alertCounts.critical > 0 && (
                <span className="alert-count critical">
                  🔴 {alertCounts.critical} Critical
                </span>
              )}
              {alertCounts.warning > 0 && (
                <span className="alert-count warning">
                  🟡 {alertCounts.warning} Warning
                </span>
              )}
              {alertCounts.info > 0 && (
                <span className="alert-count info">
                  🔵 {alertCounts.info} Info
                </span>
              )}
            </div>
            <div className="alert-actions-bulk">
              <button 
                className="clear-alerts-btn"
                onClick={handleClearAlerts}
                disabled={alerts.filter(a => a.acknowledged).length === 0}
              >
                Clear Acknowledged
              </button>
              <button 
                className="clear-all-alerts-btn"
                onClick={handleClearAllAlerts}
                disabled={alerts.length === 0}
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="alert-list" ref={alertRef}>
            {alerts.length > 0 ? (
              alerts.map(alert => renderAlertItem(alert))
            ) : (
              <div className="no-alerts">
                <span>✅ No alerts</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="monitoring-content">
        {/* Devices Grid */}
        <div className="devices-section">
          {showFilters && (
            <div className="devices-filters">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="">All Types</option>
                <option value="sensor">Sensor</option>
                <option value="actuator">Actuator</option>
                <option value="gateway">Gateway</option>
                <option value="device">Device</option>
              </select>
              
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="filter-select"
              >
                <option value="">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
          
          <div className="devices-grid">
            {filteredDevices.length > 0 ? (
              filteredDevices.map(device => renderDeviceCardItem(device))
            ) : (
              <div className="no-devices">
                <span>📭 No devices found</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Metrics and Charts */}
        <div className="monitoring-sidebar">
          {/* Metrics */}
          {showMetrics && Object.keys(metricsData).length > 0 && (
            <div className="metrics-section">
              <h4>Key Metrics</h4>
              <div className="metrics-grid">
                {Object.entries(metricsData).map(([key, value]) => {
                  const metric = {
                    key,
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                    value,
                    unit: '',
                    priority: 'info',
                    icon: '📊',
                  };
                  return renderMetricItem(metric);
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          {renderChartComponent()}

          {/* Children */}
          {children && (
            <div className="monitoring-children">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="device-detail-modal" onClick={() => setSelectedDevice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDevice.name}</h3>
              <button className="modal-close" onClick={() => setSelectedDevice(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="device-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">ID</span>
                  <span className="detail-value">{selectedDevice.id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{selectedDevice.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span 
                    className="detail-value"
                    style={{ color: getStatusColor(selectedDevice.status) }}
                  >
                    {selectedDevice.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{selectedDevice.location || 'N/A'}</span>
                </div>
              </div>
              {selectedDevice.metrics && (
                <div className="device-metrics-detail">
                  <h4>Metrics</h4>
                  <div className="metrics-detail-grid">
                    {Object.entries(selectedDevice.metrics).map(([key, value]) => (
                      <div key={key} className="metric-detail-item">
                        <span className="metric-detail-label">{key}</span>
                        <span className="metric-detail-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;