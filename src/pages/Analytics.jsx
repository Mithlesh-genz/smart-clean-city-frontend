// Analytics.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Analytics.css'; // Optional: for styling

// Analytics Dashboard Component
const Analytics = ({
  // Data props
  data = {
    metrics: {},
    charts: [],
    reports: [],
    events: [],
    trends: {},
  },
  onDataRefresh,
  onExport,
  onFilterChange,
  onDateRangeChange,
  
  // Configuration
  metrics = [],
  chartTypes = ['line', 'bar', 'pie', 'doughnut', 'area'],
  timeRanges = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom'],
  defaultTimeRange = 'Last 7 Days',
  
  // UI props
  isLoading = false,
  error = null,
  showMetrics = true,
  showCharts = true,
  showReports = true,
  showEvents = true,
  showFilters = true,
  showExport = true,
  showRefresh = true,
  showDatePicker = true,
  showComparison = true,
  
  // Theme and styling
  theme = 'light',
  className = '',
  style = {},
  colors = {
    primary: '#1976D2',
    secondary: '#FF9800',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FFC107',
    info: '#2196F3',
    chartColors: [
      '#1976D2', '#FF9800', '#4CAF50', '#F44336',
      '#9C27B0', '#00BCD4', '#FFEB3B', '#795548',
      '#607D8B', '#E91E63'
    ]
  },
  
  // Custom render props
  renderMetric,
  renderChart,
  renderReport,
  renderEvent,
  renderCustomWidget,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  
  // Children
  children,
}) => {
  // State
  const [analyticsData, setAnalyticsData] = useState(data);
  const [selectedTimeRange, setSelectedTimeRange] = useState(defaultTimeRange);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [selectedCharts, setSelectedCharts] = useState([]);
  const [filters, setFilters] = useState({});
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'reports', 'events'
  
  // Refs
  const chartRefs = useRef({});
  const containerRef = useRef(null);

  // Derived data
  const metricsData = useMemo(() => {
    return analyticsData.metrics || {};
  }, [analyticsData]);

  const chartsData = useMemo(() => {
    return analyticsData.charts || [];
  }, [analyticsData]);

  const reportsData = useMemo(() => {
    return analyticsData.reports || [];
  }, [analyticsData]);

  const eventsData = useMemo(() => {
    return analyticsData.events || [];
  }, [analyticsData]);

  const trendsData = useMemo(() => {
    return analyticsData.trends || {};
  }, [analyticsData]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!metricsData || Object.keys(metricsData).length === 0) {
      return [
        { label: 'Total Users', value: '0', change: '+0%', icon: '👥' },
        { label: 'Revenue', value: '$0', change: '+0%', icon: '💰' },
        { label: 'Conversion Rate', value: '0%', change: '+0%', icon: '📊' },
        { label: 'Active Sessions', value: '0', change: '+0%', icon: '🔄' },
      ];
    }

    // Extract metrics from data
    const totalUsers = metricsData.totalUsers || metricsData.users || 0;
    const revenue = metricsData.revenue || metricsData.totalRevenue || 0;
    const conversionRate = metricsData.conversionRate || metricsData.conversion || 0;
    const activeSessions = metricsData.activeSessions || metricsData.sessions || 0;
    
    // Calculate changes (in a real app, these would come from the data)
    const changes = {
      users: metricsData.userChange || '+12.5%',
      revenue: metricsData.revenueChange || '+8.3%',
      conversion: metricsData.conversionChange || '+2.1%',
      sessions: metricsData.sessionChange || '+5.7%',
    };

    return [
      { 
        label: 'Total Users', 
        value: formatNumber(totalUsers), 
        change: changes.users || '+0%',
        icon: '👥',
        color: colors.primary
      },
      { 
        label: 'Revenue', 
        value: formatCurrency(revenue), 
        change: changes.revenue || '+0%',
        icon: '💰',
        color: colors.success
      },
      { 
        label: 'Conversion Rate', 
        value: `${conversionRate}%`, 
        change: changes.conversion || '+0%',
        icon: '📊',
        color: colors.warning
      },
      { 
        label: 'Active Sessions', 
        value: formatNumber(activeSessions), 
        change: changes.sessions || '+0%',
        icon: '🔄',
        color: colors.info
      },
    ];
  }, [metricsData, colors]);

  // Helper functions
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getChangeColor(change) {
    if (!change) return colors.secondary;
    const num = parseFloat(change);
    if (num > 0) return colors.success;
    if (num < 0) return colors.danger;
    return colors.secondary;
  }

  // Event handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onDataRefresh) {
      await onDataRefresh({
        timeRange: selectedTimeRange,
        dateRange,
        filters,
      });
    }
    setIsRefreshing(false);
  }, [onDataRefresh, selectedTimeRange, dateRange, filters]);

  const handleExport = useCallback((format = 'csv') => {
    if (onExport) {
      onExport({
        format,
        data: analyticsData,
        timeRange: selectedTimeRange,
        dateRange,
        filters,
      });
    }
  }, [onExport, analyticsData, selectedTimeRange, dateRange, filters]);

  const handleTimeRangeChange = useCallback((range) => {
    setSelectedTimeRange(range);
    if (range === 'Custom') {
      // Open date picker
    } else {
      setDateRange({ start: null, end: null });
      onDateRangeChange?.(range, null);
    }
  }, [onDateRangeChange]);

  const handleDateRangeChange = useCallback((start, end) => {
    setDateRange({ start, end });
    onDateRangeChange?.(selectedTimeRange, { start, end });
  }, [selectedTimeRange, onDateRangeChange]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    onFilterChange?.({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleMetricSelect = useCallback((metric) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  }, []);

  const handleChartSelect = useCallback((chartId) => {
    setSelectedCharts(prev => {
      if (prev.includes(chartId)) {
        return prev.filter(id => id !== chartId);
      }
      return [...prev, chartId];
    });
  }, []);

  // Render methods
  const renderMetricCard = useCallback((metric, index) => {
    if (renderMetric) {
      return renderMetric(metric, index);
    }

    const isPositive = metric.change?.startsWith('+');

    return (
      <div 
        key={index} 
        className="metric-card"
        style={{ borderTopColor: metric.color || colors.primary }}
      >
        <div className="metric-header">
          <span className="metric-icon">{metric.icon}</span>
          <span className="metric-label">{metric.label}</span>
        </div>
        <div className="metric-value">{metric.value}</div>
        <div className="metric-footer">
          <span 
            className="metric-change"
            style={{ 
              color: metric.color || getChangeColor(metric.change),
              backgroundColor: (metric.color || getChangeColor(metric.change)) + '20'
            }}
          >
            {metric.change}
          </span>
          <span className="metric-period">vs previous period</span>
        </div>
      </div>
    );
  }, [renderMetric, colors.primary]);

  const renderChartComponent = useCallback((chart, index) => {
    if (renderChart) {
      return renderChart(chart, index);
    }

    const chartColors = colors.chartColors;

    return (
      <div key={chart.id || index} className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">{chart.title}</h4>
          {chart.description && (
            <p className="chart-description">{chart.description}</p>
          )}
          <div className="chart-actions">
            {chart.legend && (
              <div className="chart-legend">
                {chart.legend.map((item, i) => (
                  <span key={i} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: item.color || chartColors[i % chartColors.length] }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            )}
            <button className="chart-expand-btn">⛶</button>
          </div>
        </div>
        <div className="chart-body">
          {/* Chart placeholder - In a real app, you'd integrate a charting library like Chart.js, Recharts, or D3 */}
          <div className="chart-placeholder">
            <div className="chart-grid">
              {chart.type === 'line' && (
                <div className="line-chart-placeholder">
                  <svg viewBox="0 0 600 200">
                    <polyline
                      points={chart.data?.map((point, i) => 
                        `${(i / (chart.data.length - 1)) * 600},${200 - (point / Math.max(...chart.data)) * 180}`
                      ).join(' ')}
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
              {chart.type === 'bar' && (
                <div className="bar-chart-placeholder">
                  {chart.data?.map((value, i) => (
                    <div 
                      key={i}
                      className="bar"
                      style={{
                        height: `${(value / Math.max(...chart.data)) * 80}%`,
                        backgroundColor: chartColors[i % chartColors.length]
                      }}
                    >
                      <span className="bar-label">{chart.labels?.[i] || i}</span>
                    </div>
                  ))}
                </div>
              )}
              {chart.type === 'pie' && (
                <div className="pie-chart-placeholder">
                  <div className="pie">
                    {chart.data?.map((value, i) => {
                      const percentage = (value / chart.data.reduce((a, b) => a + b, 0)) * 100;
                      const rotation = chart.data.slice(0, i).reduce((a, b) => 
                        a + (b / chart.data.reduce((a, b) => a + b, 0)) * 360, 0
                      );
                      return (
                        <div 
                          key={i}
                          className="pie-slice"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            backgroundColor: chartColors[i % chartColors.length],
                            clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos(2 * Math.PI * percentage / 100)}% ${50 - 50 * Math.sin(2 * Math.PI * percentage / 100)}%)`
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {chart.type === 'area' && (
                <div className="area-chart-placeholder">
                  <svg viewBox="0 0 600 200">
                    <polygon
                      points={`0,200 ${chart.data?.map((point, i) => 
                        `${(i / (chart.data.length - 1)) * 600},${200 - (point / Math.max(...chart.data)) * 180}`
                      ).join(' ')} ${(chart.data?.length - 1) / (chart.data?.length - 1) * 600},200`}
                      fill={colors.primary + '40'}
                      stroke={colors.primary}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        {chart.footer && (
          <div className="chart-footer">
            <span className="chart-total">Total: {chart.footer.total}</span>
            <span className="chart-change">{chart.footer.change}</span>
          </div>
        )}
      </div>
    );
  }, [colors, renderChart]);

  const renderReportItem = useCallback((report, index) => {
    if (renderReport) {
      return renderReport(report, index);
    }

    return (
      <div key={report.id || index} className="report-item">
        <div className="report-header">
          <div className="report-icon">{report.icon || '📄'}</div>
          <div className="report-info">
            <h4 className="report-title">{report.title}</h4>
            <p className="report-description">{report.description}</p>
          </div>
          <span className="report-date">{formatDate(report.createdAt || report.date)}</span>
        </div>
        <div className="report-stats">
          {report.stats?.map((stat, i) => (
            <div key={i} className="report-stat">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-value">{stat.value}</span>
            </div>
          ))}
        </div>
        <div className="report-actions">
          <button className="report-view-btn">View Report</button>
          <button className="report-download-btn">⬇️ Download</button>
        </div>
      </div>
    );
  }, [renderReport]);

  const renderEventItem = useCallback((event, index) => {
    if (renderEvent) {
      return renderEvent(event, index);
    }

    const eventColors = {
      success: colors.success,
      error: colors.danger,
      warning: colors.warning,
      info: colors.info,
    };

    const eventIcons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    return (
      <div 
        key={event.id || index} 
        className={`event-item event-${event.type || 'info'}`}
        style={{ borderLeftColor: eventColors[event.type] || colors.info }}
      >
        <div className="event-icon">
          {eventIcons[event.type] || 'ℹ️'}
        </div>
        <div className="event-content">
          <div className="event-header">
            <span className="event-title">{event.title}</span>
            <span className="event-time">{formatTime(event.timestamp || event.createdAt)}</span>
          </div>
          <p className="event-description">{event.description}</p>
          {event.metadata && (
            <div className="event-metadata">
              {Object.entries(event.metadata).map(([key, value]) => (
                <span key={key} className="metadata-item">
                  <strong>{key}:</strong> {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }, [colors, renderEvent]);

  // Effects
  useEffect(() => {
    setAnalyticsData(data);
  }, [data]);

  useEffect(() => {
    if (defaultTimeRange) {
      handleTimeRangeChange(defaultTimeRange);
    }
  }, [defaultTimeRange]);

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, []);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'dashboard') {
        handleRefresh();
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [handleRefresh, viewMode]);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="analytics-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (!analyticsData || Object.keys(analyticsData).length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="analytics-empty">
        <span className="empty-icon">📊</span>
        <h3>No Analytics Data</h3>
        <p>Start collecting data to see insights here.</p>
        <button className="refresh-btn" onClick={handleRefresh}>
          Refresh Data
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div 
      className={`analytics-container analytics-${theme} ${className}`}
      style={style}
      ref={containerRef}
    >
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-header-left">
          <h2 className="analytics-title">Analytics Dashboard</h2>
          <div className="analytics-controls">
            {/* Time Range Selector */}
            {showDatePicker && (
              <select
                className="time-range-select"
                value={selectedTimeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
              >
                {timeRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            )}
            
            {/* View Mode Toggle */}
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                onClick={() => setViewMode('dashboard')}
              >
                📊 Dashboard
              </button>
              <button
                className={`view-btn ${viewMode === 'reports' ? 'active' : ''}`}
                onClick={() => setViewMode('reports')}
              >
                📄 Reports
              </button>
              <button
                className={`view-btn ${viewMode === 'events' ? 'active' : ''}`}
                onClick={() => setViewMode('events')}
              >
                🔔 Events
              </button>
            </div>
          </div>
        </div>

        <div className="analytics-header-right">
          {showComparison && (
            <button
              className={`comparison-toggle ${comparisonMode ? 'active' : ''}`}
              onClick={() => setComparisonMode(!comparisonMode)}
            >
              {comparisonMode ? '🔀 Comparing' : '🔄 Compare'}
            </button>
          )}
          
          {showRefresh && (
            <button 
              className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? '⟳' : '🔄'}
            </button>
          )}
          
          {showExport && (
            <div className="export-dropdown">
              <button className="export-btn">📤 Export</button>
              <div className="export-options">
                <button onClick={() => handleExport('csv')}>CSV</button>
                <button onClick={() => handleExport('json')}>JSON</button>
                <button onClick={() => handleExport('pdf')}>PDF</button>
                <button onClick={() => handleExport('png')}>PNG</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="analytics-filters">
          <div className="filters-row">
            <select
              className="filter-select"
              value={filters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="users">Users</option>
              <option value="revenue">Revenue</option>
              <option value="engagement">Engagement</option>
              <option value="performance">Performance</option>
            </select>

            <select
              className="filter-select"
              value={filters.segment || ''}
              onChange={(e) => handleFilterChange('segment', e.target.value)}
            >
              <option value="">All Segments</option>
              <option value="new">New Users</option>
              <option value="returning">Returning Users</option>
              <option value="premium">Premium Users</option>
            </select>

            <input
              type="text"
              className="filter-input"
              placeholder="Search analytics..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Custom Widgets */}
      {renderCustomWidget && (
        <div className="custom-widgets">
          {renderCustomWidget({ data: analyticsData, filters })}
        </div>
      )}

      {/* Main Content */}
      <div className="analytics-content">
        {viewMode === 'dashboard' && (
          <>
            {/* Metrics Grid */}
            {showMetrics && summaryMetrics.length > 0 && (
              <div className="metrics-grid">
                {summaryMetrics.map((metric, index) => renderMetricCard(metric, index))}
              </div>
            )}

            {/* Charts Grid */}
            {showCharts && chartsData.length > 0 && (
              <div className="charts-grid">
                {chartsData.map((chart, index) => renderChartComponent(chart, index))}
              </div>
            )}

            {/* Trends and Additional Data */}
            {Object.keys(trendsData).length > 0 && (
              <div className="trends-section">
                <h3>Trends Analysis</h3>
                <div className="trends-grid">
                  {Object.entries(trendsData).map(([key, value]) => (
                    <div key={key} className="trend-item">
                      <span className="trend-label">{key}</span>
                      <span className="trend-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === 'reports' && showReports && (
          <div className="reports-section">
            <div className="reports-header">
              <h3>Reports</h3>
              <button className="generate-report-btn">+ Generate Report</button>
            </div>
            <div className="reports-list">
              {reportsData.map((report, index) => renderReportItem(report, index))}
            </div>
          </div>
        )}

        {viewMode === 'events' && showEvents && (
          <div className="events-section">
            <div className="events-header">
              <h3>Real-time Events</h3>
              <span className="events-count">{eventsData.length} events</span>
            </div>
            <div className="events-list">
              {eventsData.map((event, index) => renderEventItem(event, index))}
            </div>
          </div>
        )}

        {/* Children */}
        {children && (
          <div className="analytics-children">
            {children}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="analytics-footer">
        <span className="last-updated">
          Last updated: {new Date().toLocaleString()}
        </span>
        {isRefreshing && (
          <span className="refreshing-status">Refreshing...</span>
        )}
      </div>
    </div>
  );
};

// Sub-components for modular usage

// Metrics Component
export const MetricsGrid = ({ metrics, className, ...props }) => {
  return (
    <div className={`metrics-grid ${className}`}>
      {metrics.map((metric, index) => (
        <div key={index} className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">{metric.icon}</span>
            <span className="metric-label">{metric.label}</span>
          </div>
          <div className="metric-value">{metric.value}</div>
          {metric.change && (
            <div className="metric-change" style={{ color: getChangeColor(metric.change) }}>
              {metric.change}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Chart Component
export const Chart = ({ type, data, labels, title, colors, ...props }) => {
  const chartColors = colors || ['#1976D2', '#FF9800', '#4CAF50', '#F44336'];

  return (
    <div className="chart-container">
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="chart-body">
        {/* Chart rendering based on type */}
        <div className="chart-placeholder">
          {type === 'line' && (
            <svg viewBox="0 0 400 200">
              <polyline
                points={data.map((point, i) => 
                  `${(i / (data.length - 1)) * 400},${200 - (point / Math.max(...data)) * 180}`
                ).join(' ')}
                fill="none"
                stroke={chartColors[0]}
                strokeWidth="2"
              />
            </svg>
          )}
          {type === 'bar' && (
            <div className="bar-chart">
              {data.map((value, i) => (
                <div 
                  key={i}
                  className="bar"
                  style={{
                    height: `${(value / Math.max(...data)) * 80}%`,
                    backgroundColor: chartColors[i % chartColors.length]
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reports Component
export const ReportsList = ({ reports, onView, onDownload, className, ...props }) => {
  return (
    <div className={`reports-list ${className}`}>
      {reports.map((report, index) => (
        <div key={report.id || index} className="report-item">
          <div className="report-info">
            <h4>{report.title}</h4>
            <p>{report.description}</p>
            <span className="report-date">{new Date(report.date).toLocaleDateString()}</span>
          </div>
          <div className="report-actions">
            <button onClick={() => onView?.(report)}>View</button>
            <button onClick={() => onDownload?.(report)}>Download</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Events Component
export const EventsList = ({ events, className, ...props }) => {
  const eventColors = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  };

  return (
    <div className={`events-list ${className}`}>
      {events.map((event, index) => (
        <div 
          key={event.id || index}
          className="event-item"
          style={{ borderLeftColor: eventColors[event.type] || eventColors.info }}
        >
          <div className="event-icon">
            {event.type === 'success' && '✅'}
            {event.type === 'error' && '❌'}
            {event.type === 'warning' && '⚠️'}
            {event.type === 'info' && 'ℹ️'}
          </div>
          <div className="event-content">
            <div className="event-header">
              <span className="event-title">{event.title}</span>
              <span className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="event-description">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Analytics;