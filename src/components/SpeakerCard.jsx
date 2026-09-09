// frontend/src/components/SpeakerCard.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Languages,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Settings,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// ─── Status Config ──────────────────────────────────────────────
const statusConfig = {
  ONLINE: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    label: 'Online',
    dotColor: 'bg-green-500',
  },
  OFFLINE: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Offline',
    dotColor: 'bg-red-500',
  },
  WARNING: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    label: 'Warning',
    dotColor: 'bg-yellow-500',
  },
};

const languageLabels = { EN: 'English', HI: 'Hindi', PA: 'Punjabi', TE: 'Telugu', TA: 'Tamil' };

const SpeakerCard = ({
  speaker,
  onUpdate,
  onDelete,
  onSendAnnouncement,
  onTest,          // ← local test tone (Web Audio API)
  isSelected = false,
  onSelect,
  className = '',
  isAdmin = false,
  isStaff = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLanguage, setAnnouncementLanguage] = useState(speaker?.language || 'EN');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(speaker?.volume || 70);

  const status = statusConfig[speaker?.status] || statusConfig.OFFLINE;
  const StatusIcon = status.icon;

  // ─── Helpers ──────────────────────────────────────────────────
  const formatLastHeartbeat = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getLastAnnouncementTime = () => {
    if (!speaker?.lastAnnouncementAt) return 'No announcements';
    const diff = Date.now() - new Date(speaker.lastAnnouncementAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // ─── API Handlers ─────────────────────────────────────────────
  const handleTest = async () => {
    // Use the local test tone (Web Audio API) instead of calling the backend.
    // If you need the backend test endpoint, uncomment the API call below.
    if (onTest) {
      onTest();
      return;
    }
    // Fallback API call (if no onTest prop)
    setIsLoading(true);
    try {
      await api.post(`/speakers/${speaker._id}/test`, { volume });
      toast.success(`Test signal sent to ${speaker.name}`);
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 3000);
      if (onTest) onTest(); // still call the prop if it exists
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You need admin privileges to test speakers');
      } else {
        toast.error(err.response?.data?.message || 'Failed to test speaker');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMessage.trim()) {
      toast.error('Please enter an announcement message');
      return;
    }
    setIsLoading(true);
    try {
      await api.post(`/speakers/${speaker._id}/announce`, {
        message: announcementMessage,
        language: announcementLanguage,
      });
      toast.success('Announcement sent successfully');
      setShowAnnouncementModal(false);
      setAnnouncementMessage('');
      if (onSendAnnouncement) onSendAnnouncement();
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You need admin privileges to send announcements');
      } else {
        toast.error(err.response?.data?.message || 'Failed to send announcement');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const newStatus = speaker.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      await api.put(`/speakers/${speaker._id}/status`, { status: newStatus });
      toast.success(`Speaker ${newStatus === 'ONLINE' ? 'activated' : 'deactivated'}`);
      if (onUpdate) onUpdate();
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You need admin privileges to change status');
      } else {
        toast.error('Failed to update speaker status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete speaker "${speaker.name}"?`)) return;
    setIsLoading(true);
    try {
      await api.delete(`/speakers/${speaker._id}`);
      toast.success('Speaker deleted successfully');
      if (onDelete) onDelete();
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('You need admin privileges to delete speakers');
      } else {
        toast.error('Failed to delete speaker');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Performance Trend (mock) ────────────────────────────────
  const getPerformanceTrend = () => {
    if (!speaker?.announcementCount) return { trend: 'neutral', value: 0 };
    const trend = Math.random() * 20 - 10;
    if (trend > 5) return { trend: 'up', value: Math.round(trend) };
    if (trend < -5) return { trend: 'down', value: Math.round(Math.abs(trend)) };
    return { trend: 'neutral', value: 0 };
  };

  const performance = getPerformanceTrend();

  const renderTrend = () => {
    if (performance.trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (performance.trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-gray-900/50 backdrop-blur-sm rounded-xl border ${status.border} hover:border-gray-700 transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-gray-900' : ''} ${className}`}
      >
        {/* ─── Card Header (always visible) ──────────────────── */}
        <div className="p-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.bg} ${status.color}`}>
                {speaker.status === 'ONLINE' ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium text-lg">{speaker.name}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center space-x-1 text-sm ${status.color}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dotColor} animate-pulse`} />
                    <span>{status.label}</span>
                  </span>
                  <span className="text-gray-500 text-sm">•</span>
                  <span className="text-gray-400 text-sm flex items-center space-x-1">
                    <Languages className="w-3.5 h-3.5" />
                    <span>{languageLabels[speaker.language] || speaker.language}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setVolume(Math.max(0, volume - 10)); }}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <VolumeX className="w-4 h-4 text-gray-400" />
                </button>
                <span className="text-xs text-gray-400 w-8 text-center">{volume}%</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setVolume(Math.min(100, volume + 10)); }}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Zone</p>
              <p className="text-white font-medium truncate">{speaker.zoneId?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Heartbeat</p>
              <p className="text-white font-medium">{formatLastHeartbeat(speaker.lastHeartbeat)}</p>
            </div>
            <div>
              <p className="text-gray-500">Announcements</p>
              <p className="text-white font-medium flex items-center space-x-1">
                <span>{speaker.announcementCount || 0}</span>
                <span className="ml-1">{renderTrend()}</span>
              </p>
            </div>
          </div>

          {speaker.lastAnnouncementAt && (
            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Last announcement: {getLastAnnouncementTime()}</span>
            </div>
          )}
        </div>

        {/* ─── Expanded Content ────────────────────────────────── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-800"
            >
              <div className="p-5 space-y-4 relative">
                {speaker.location && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="text-white text-sm">
                        Lat: {speaker.location.coordinates?.[1]?.toFixed(6) || 'N/A'},
                        Lng: {speaker.location.coordinates?.[0]?.toFixed(6) || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {(isAdmin || isStaff) && (
                    <button
                      onClick={() => setShowAnnouncementModal(true)}
                      disabled={isLoading || speaker.status !== 'ONLINE'}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Announce</span>
                    </button>
                  )}
                  <button
                    onClick={handleTest}
                    disabled={isLoading || speaker.status !== 'ONLINE'}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Playing' : 'Test'}</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleStatusToggle}
                      disabled={isLoading}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {speaker.status === 'ONLINE' ? (
                        <><PowerOff className="w-4 h-4" /><span>Deactivate</span></>
                      ) : (
                        <><Power className="w-4 h-4" /><span>Activate</span></>
                      )}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Announcement Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setShowAnnouncementModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-xl font-semibold mb-4">Send Announcement</h3>
              <p className="text-gray-400 text-sm mb-4">To: <span className="text-white font-medium">{speaker.name}</span></p>

              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Language</label>
                  <div className="flex space-x-2">
                    {['EN', 'HI', 'PA', 'TE', 'TA'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setAnnouncementLanguage(lang)}
                        className={`px-4 py-2 rounded-lg transition-colors ${announcementLanguage === lang
                            ? 'bg-primary text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Message</label>
                  <textarea
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your announcement message..."
                    maxLength="500"
                  />
                  <p className="text-gray-500 text-xs mt-1 text-right">{announcementMessage.length}/500</p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!announcementMessage.trim() || isLoading}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SpeakerCard;