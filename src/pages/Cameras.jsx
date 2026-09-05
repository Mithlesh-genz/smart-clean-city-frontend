import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Grid,
  List,
  LayoutGrid,
  MapPin,
  Activity,
  AlertCircle,
  CheckCircle,
  Video,
  VideoOff,
  Settings,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  MoreVertical,
  Copy,
  Share2,
  Calendar,
  Clock,
  Zap,
  Shield,
  Users,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import CameraCard, { CameraCardGrid } from '../components/CameraCard';
import StatCard from '../components/StatCard';

// ========================================
// Cameras Page Component
// ========================================

const Cameras = () => {
  // ========================================
  // State
  // ========================================

  const [cameras, setCameras] = useState([]);
  const [filteredCameras, setFilteredCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | list | compact
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    zoneId: '',
    streamUrl_encrypted: '',
    fps: 30,
    confidenceThreshold: 0.70
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const refreshTimerRef = useRef(null);
  const { isConnected, subscribe, unsubscribe, addEventListener, removeEventListener } = useSocket();

  // ========================================
  // Status Options
  // ========================================

  const statusOptions = [
    { value: 'ONLINE', label: 'Online', color: 'text-green-500' },
    { value: 'OFFLINE', label: 'Offline', color: 'text-red-500' },
    { value: 'WARNING', label: 'Warning', color: 'text-yellow-500' }
  ];

  // ========================================
  // Fetch Data
  // ========================================

  const fetchCameras = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);

    try {
      const params = {};
      if (selectedZone) params.zoneId = selectedZone;
      if (selectedStatus.length > 0) params.status = selectedStatus.join(',');
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/api/cameras', { params });
      setCameras(response.data.data);
      setFilteredCameras(response.data.data);
    } catch (err) {
      console.error('Error fetching cameras:', err);
      toast.error('Failed to load cameras');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedZone, selectedStatus, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/cameras/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const response = await api.get('/api/zones');
      setZones(response.data.data);
    } catch (err) {
      console.error('Error fetching zones:', err);
    }
  }, []);

  // ========================================
  // Socket Event Handlers
  // ========================================

  useEffect(() => {
    if (isConnected) {
      subscribe('camera', ['*']);

      const handleCameraNew = (data) => {
        setCameras(prev => [data.camera, ...prev]);
        setFilteredCameras(prev => [data.camera, ...prev]);
        fetchStats();
        toast.success(`📷 New camera added: ${data.camera.name}`);
      };

      const handleCameraStatus = (data) => {
        setCameras(prev => prev.map(c => 
          c._id === data.cameraId ? { ...c, status: data.newStatus } : c
        ));
        setFilteredCameras(prev => prev.map(c => 
          c._id === data.cameraId ? { ...c, status: data.newStatus } : c
        ));
        fetchStats();

        if (data.newStatus === 'OFFLINE') {
          toast.error(`📷 Camera went offline`);
        } else if (data.newStatus === 'ONLINE') {
          toast.success(`📷 Camera is online`);
        }
      };

      const handleCameraUpdate = (data) => {
        setCameras(prev => prev.map(c => 
          c._id === data.camera._id ? { ...c, ...data.camera } : c
        ));
        setFilteredCameras(prev => prev.map(c => 
          c._id === data.camera._id ? { ...c, ...data.camera } : c
        ));
        fetchStats();
      };

      const handleCameraDelete = (data) => {
        setCameras(prev => prev.filter(c => c._id !== data.cameraId));
        setFilteredCameras(prev => prev.filter(c => c._id !== data.cameraId));
        fetchStats();
        toast.info(`📷 Camera deleted`);
      };

      addEventListener('camera:new', handleCameraNew);
      addEventListener('camera:status', handleCameraStatus);
      addEventListener('camera:update', handleCameraUpdate);
      addEventListener('camera:delete', handleCameraDelete);

      return () => {
        unsubscribe('camera', ['*']);
        removeEventListener('camera:new');
        removeEventListener('camera:status');
        removeEventListener('camera:update');
        removeEventListener('camera:delete');
      };
    }
  }, [isConnected, subscribe, unsubscribe, addEventListener, removeEventListener, fetchStats]);

  // ========================================
  // Auto-refresh
  // ========================================

  useEffect(() => {
    if (autoRefresh && !isLoading) {
      refreshTimerRef.current = setInterval(() => {
        fetchCameras(false);
        fetchStats();
      }, refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, isLoading, fetchCameras, fetchStats]);

  // ========================================
  // Initial Load
  // ========================================

  useEffect(() => {
    fetchCameras();
    fetchStats();
    fetchZones();
  }, [fetchCameras, fetchStats, fetchZones]);

  // ========================================
  // Apply Filters
  // ========================================

  useEffect(() => {
    let filtered = [...cameras];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.zoneId?.name?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus.length > 0) {
      filtered = filtered.filter(c => selectedStatus.includes(c.status));
    }

    if (selectedZone) {
      filtered = filtered.filter(c => c.zoneId?._id === selectedZone);
    }

    setFilteredCameras(filtered);
  }, [cameras, searchQuery, selectedStatus, selectedZone]);

  // ========================================
  // Handlers
  // ========================================

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const response = await api.post('/api/cameras', formData);
      toast.success('Camera created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchCameras();
      fetchStats();
    } catch (err) {
      console.error('Error creating camera:', err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || 'Failed to create camera');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCamera = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    try {
      await api.put(`/api/cameras/${editingCamera._id}`, formData);
      toast.success('Camera updated successfully');
      setShowEditModal(false);
      setEditingCamera(null);
      resetForm();
      fetchCameras();
      fetchStats();
    } catch (err) {
      console.error('Error updating camera:', err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || 'Failed to update camera');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;

    try {
      await api.delete(`/api/cameras/${cameraId}`);
      toast.success('Camera deleted successfully');
      setCameras(prev => prev.filter(c => c._id !== cameraId));
      setFilteredCameras(prev => prev.filter(c => c._id !== cameraId));
      fetchStats();
    } catch (err) {
      console.error('Error deleting camera:', err);
      toast.error(err.response?.data?.message || 'Failed to delete camera');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedCameras.length === 0) {
      toast.error('Please select cameras first');
      return;
    }

    setIsBulkUpdating(true);
    try {
      if (action === 'delete') {
        if (!window.confirm(`Delete ${selectedCameras.length} cameras?`)) {
          setIsBulkUpdating(false);
          return;
        }
        await Promise.all(selectedCameras.map(id => api.delete(`/api/cameras/${id}`)));
        toast.success(`Deleted ${selectedCameras.length} cameras`);
      } else if (action === 'online' || action === 'offline') {
        await api.post('/api/cameras/bulk-status', {
          cameraIds: selectedCameras,
          status: action.toUpperCase()
        });
        toast.success(`Updated ${selectedCameras.length} cameras to ${action}`);
      }

      setSelectedCameras([]);
      fetchCameras();
      fetchStats();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      toast.error('Failed to perform bulk action');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleEditClick = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      zoneId: camera.zoneId?._id || '',
      streamUrl_encrypted: camera.streamUrl_encrypted || '',
      fps: camera.fps || 30,
      confidenceThreshold: camera.confidenceThreshold || 0.70
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      zoneId: '',
      streamUrl_encrypted: '',
      fps: 30,
      confidenceThreshold: 0.70
    });
    setFormErrors({});
  };

  const toggleCameraSelection = (cameraId) => {
    setSelectedCameras(prev => 
      prev.includes(cameraId) 
        ? prev.filter(id => id !== cameraId)
        : [...prev, cameraId]
    );
  };

  const selectAllCameras = () => {
    if (selectedCameras.length === filteredCameras.length) {
      setSelectedCameras([]);
    } else {
      setSelectedCameras(filteredCameras.map(c => c._id));
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/cameras/export', {
        params: {
          format: 'csv',
          zoneId: selectedZone || undefined
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cameras_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Cameras exported successfully');
    } catch (err) {
      console.error('Error exporting cameras:', err);
      toast.error('Failed to export cameras');
    }
  };

  // ========================================
  // Render Stats
  // ========================================

  const renderStats = () => {
    if (!stats) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          title="Total Cameras"
          value={stats.total || 0}
          icon={Camera}
          color="primary"
          subtitle={`${stats.online || 0} online`}
          progress={stats.total > 0 ? ((stats.online || 0) / stats.total * 100) : 0}
          progressLabel="Uptime"
        />

        <StatCard
          title="Online"
          value={stats.online || 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${stats.onlinePercentage || 0}% uptime`}
          trend="up"
          trendLabel="Online"
        />

        <StatCard
          title="Offline"
          value={stats.offline || 0}
          icon={AlertCircle}
          color="red"
          subtitle="Need attention"
          trend={stats.offline > 0 ? 'down' : 'neutral'}
          trendLabel={stats.offline > 0 ? 'Offline' : 'All Online'}
        />

        <StatCard
          title="Avg FPS"
          value={stats.avgFps || 30}
          icon={Activity}
          color="blue"
          subtitle={`${stats.warning || 0} warnings`}
          progress={stats.avgFps > 25 ? 100 : stats.avgFps > 15 ? 70 : 30}
          progressLabel="Performance"
        />
      </motion.div>
    );
  };

  // ========================================
  // Render Filters
  // ========================================

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gray-900/80 rounded-xl border border-gray-800 p-4 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras..."
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              multiple
              value={selectedStatus}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedStatus(options);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary min-h-[80px]"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Zone</label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary"
            >
              <option value="">All Zones</option>
              {zones.map(zone => (
                <option key={zone._id} value={zone._id}>{zone.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedStatus([]);
              setSelectedZone('');
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={() => setShowFilters(false)}
            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    );
  };

  // ========================================
  // Render Create/Edit Modal
  // ========================================

  const renderModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const title = isEdit ? 'Edit Camera' : 'Add New Camera';
    const onSubmit = isEdit ? handleUpdateCamera : handleCreateCamera;

    if (!isOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
            <h3 className="text-white font-semibold">{title}</h3>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-2 bg-gray-800 border ${
                  formErrors.name ? 'border-red-500' : 'border-gray-700'
                } rounded-lg text-white focus:outline-none focus:border-primary`}
                placeholder="Enter camera name"
                required
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Zone */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Zone *</label>
              <select
                value={formData.zoneId}
                onChange={(e) => setFormData(prev => ({ ...prev, zoneId: e.target.value }))}
                className={`w-full px-4 py-2 bg-gray-800 border ${
                  formErrors.zoneId ? 'border-red-500' : 'border-gray-700'
                } rounded-lg text-white focus:outline-none focus:border-primary`}
                required
              >
                <option value="">Select Zone</option>
                {zones.map(zone => (
                  <option key={zone._id} value={zone._id}>{zone.name}</option>
                ))}
              </select>
              {formErrors.zoneId && (
                <p className="text-red-500 text-xs mt-1">{formErrors.zoneId}</p>
              )}
            </div>

            {/* Stream URL */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stream URL</label>
              <input
                type="text"
                value={formData.streamUrl_encrypted}
                onChange={(e) => setFormData(prev => ({ ...prev, streamUrl_encrypted: e.target.value }))}
                className={`w-full px-4 py-2 bg-gray-800 border ${
                  formErrors.streamUrl_encrypted ? 'border-red-500' : 'border-gray-700'
                } rounded-lg text-white focus:outline-none focus:border-primary`}
                placeholder="rtsp://..."
              />
              {formErrors.streamUrl_encrypted && (
                <p className="text-red-500 text-xs mt-1">{formErrors.streamUrl_encrypted}</p>
              )}
            </div>

            {/* FPS */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                FPS: {formData.fps}
              </label>
              <input
                type="range"
                min="5"
                max="60"
                value={formData.fps}
                onChange={(e) => setFormData(prev => ({ ...prev, fps: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5</span>
                <span>60</span>
              </div>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Confidence Threshold: {Math.round(formData.confidenceThreshold * 100)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={formData.confidenceThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>30%</span>
                <span>95%</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  isEdit ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  // ========================================
  // Main Render
  // ========================================

  return (
    <div className="min-h-screen bg-bg p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" />
            Cameras
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage and monitor all security cameras
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${
              autoRefresh ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400'
            }`}
            title="Auto-refresh"
          >
            <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
          </button>

          {/* View Mode */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'compact' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Add Camera */}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Stats */}
      {showStats && renderStats()}

      {/* Filters */}
      <AnimatePresence>
        {renderFilters()}
      </AnimatePresence>

      {/* Bulk Actions */}
      {selectedCameras.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="text-white text-sm">
            {selectedCameras.length} cameras selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('online')}
              disabled={isBulkUpdating}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('offline')}
              disabled={isBulkUpdating}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Deactivate
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkUpdating}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedCameras([])}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Camera List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-lg font-medium mb-2">No Cameras Found</h3>
          <p className="text-gray-400">Add your first camera to get started</p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            Add Camera
          </button>
        </div>
      ) : (
        <CameraCardGrid columns={viewMode === 'compact' ? 4 : viewMode === 'list' ? 1 : 2}>
          {filteredCameras.map((camera) => (
            <CameraCard
              key={camera._id}
              camera={camera}
              onUpdate={() => fetchCameras(false)}
              onDelete={handleDeleteCamera}
              onViewStream={(cam) => {
                setSelectedCamera(cam);
                // Open stream view
              }}
              onEdit={handleEditClick}
              isSelected={selectedCameras.includes(camera._id)}
              onSelect={() => toggleCameraSelection(camera._id)}
              compact={viewMode === 'compact'}
              isAdmin={true}
            />
          ))}
        </CameraCardGrid>
      )}

      {/* Modals */}
      <AnimatePresence>
        {renderModal(false)}
        {renderModal(true)}
      </AnimatePresence>
    </div>
  );
};

// ========================================
// Add to global CSS for slow spin animation
// ========================================

// Add this to your index.css or tailwind config:
// .animate-spin-slow { animation: spin 3s linear infinite; }

export default Cameras;