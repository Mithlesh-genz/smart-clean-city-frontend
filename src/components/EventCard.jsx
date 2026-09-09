import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Mic,
  Trash2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const STATUS_CONFIG = {
  DETECTED: { color: 'bg-yellow-500/20 text-yellow-500', icon: AlertTriangle, label: 'Detected' },
  PENDING: { color: 'bg-orange-500/20 text-orange-500', icon: Clock, label: 'Pending' },
  CONFIRMED: { color: 'bg-blue-500/20 text-blue-500', icon: CheckCircle, label: 'Confirmed' },
  ANNOUNCEMENT_SENT: { color: 'bg-purple-500/20 text-purple-500', icon: Mic, label: 'Announced' },
  RESOLVED: { color: 'bg-green-500/20 text-green-500', icon: CheckCircle, label: 'Resolved' },
  FALSE_POSITIVE: { color: 'bg-gray-500/20 text-gray-500', icon: XCircle, label: 'False Positive' },
};

const EventCard = ({ event, onStatusChange, onDelete }) => {
  const { _id, eventId, zoneId, cameraId, confidence, status, detectedAt, distanceToDustbin } = event;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.DETECTED;
  const StatusIcon = statusConfig.icon;

  const handleResolve = async () => {
    try {
      await api.put(`/events/${_id}/status`, { status: 'RESOLVED' });
      toast.success('Event resolved');
      onStatusChange?.();
    } catch (err) {
      toast.error('Failed to resolve event');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this event?')) {
      try {
        await api.delete(`/events/${_id}`);
        toast.success('Event deleted');
        onDelete?.();
      } catch (err) {
        toast.error('Failed to delete event');
      }
    }
  };

  const timeAgo = detectedAt ? new Date(detectedAt).toLocaleString() : 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 rounded-xl border border-gray-800/50 p-4 hover:border-gray-700/50 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConfig.label}
            </span>
            <span className="text-xs font-mono text-gray-400">{eventId}</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-medium text-white">{zoneId?.name || 'Unknown Zone'}</h3>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> {cameraId?.name || 'Unknown'}</span>
              {distanceToDustbin && (
                <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" /> {Math.round(distanceToDustbin)}m</span>
              )}
              <span>Confidence: {Math.round(confidence * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          {status !== 'RESOLVED' && status !== 'FALSE_POSITIVE' && (
            <button
              onClick={handleResolve}
              className="px-3 py-1 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 text-sm"
            >
              Resolve
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;