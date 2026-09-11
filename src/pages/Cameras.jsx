// frontend/src/pages/Cameras.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import {
    Camera,
    Plus,
    X,
    RefreshCw,
    Save,
    Video,
    VideoOff,
    Edit,
    Trash2,
    Play,
    Search,
    ChevronDown,
    ChevronUp,
    Eye,
    BarChart3,
    AlertTriangle,
    Power,
    PowerOff,
    Activity,
    CheckCircle,
    WifiOff,
    AlertCircle,
    MoreVertical,
    Volume2,
    Settings,
    Speaker,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { speakAnnouncement } from '../services/speakerService';

// ─── Conditional HLS import ──────────────────────────────────────
let Hls;
try {
    Hls = (await import('hls.js')).default;
} catch {
    Hls = null;
}

// ─── Placeholder image ──────────────────────────────────────────
const PLACEHOLDER_IMAGE =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%231a1a1a'/%3E%3Ctext x='320' y='180' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='24' font-family='sans-serif'%3EStream Unavailable%3C/text%3E%3C/svg%3E";

// ─── Utilities ──────────────────────────────────────────────────
const getCacheBustUrl = (url) => {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_t=${Date.now()}`;
};

const guessStreamType = (url) => {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) return 'mp4';
    if (lower.includes('mjpeg') || lower.includes('cgi-bin') || lower.includes('stream') || lower.includes('snapshot')) {
        return 'mjpeg';
    }
    return 'unknown';
};

const isMJPEG = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('mjpeg') || lower.includes('cgi-bin') || lower.includes('stream') || lower.includes('snapshot');
};

const isAllowedStream = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://') || lower.includes('.m3u8');
};

const isRTSP = (url) => url?.toLowerCase().startsWith('rtsp://');

const getStatusBadge = (status) => {
    const map = {
        ONLINE: 'bg-green-500/20 text-green-400 border border-green-500/30',
        OFFLINE: 'bg-red-500/20 text-red-400 border border-red-500/30',
        WARNING: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
};

// ─── Language templates ────────────────────────────────────────
const templates = {
    en: (dist) => `Please help keep this area clean. Nearest dustbin is ${dist} meters away.`,
    hi: (dist) =>
        `कृपया इस क्षेत्र को साफ रखें। नजदीकी डस्टबिन ${dist} मीटर दूर है। कूड़ा डस्टबिन में ही डालें।`,
    pa: (dist) =>
        `ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਖੇਤਰ ਨੂੰ ਸਾਫ਼ ਰੱਖੋ। ਨਜ਼ਦੀਕੀ ਡਸਟਬਿਨ ${dist} ਮੀਟਰ ਦੂਰ ਹੈ।`,
};

const Cameras = () => {
    const navigate = useNavigate();
    const socket = useSocket();
    const { data: camerasData, loading, error, refetch } = useFetch('/cameras', { immediate: true });

    // ─── State ──────────────────────────────────────────────────────
    const [cameras, setCameras] = useState([]);
    const [zones, setZones] = useState([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [zoneError, setZoneError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [filterZone, setFilterZone] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCamera, setExpandedCamera] = useState(null);

    // Language state for announcements (sync with localStorage)
    const [lang, setLang] = useState(localStorage.getItem('speakerLang') || 'hi');

    // Live modal state
    const [liveModalOpen, setLiveModalOpen] = useState(false);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [streamType, setStreamType] = useState('auto');
    const [streamError, setStreamError] = useState(false);
    const [streamActuallyWorking, setStreamActuallyWorking] = useState(false); // NEW
    const [retryKey, setRetryKey] = useState(0);
    const videoRef = useRef(null);
    const imgRef = useRef(null);
    const hlsRef = useRef(null);
    const mjpegIntervalRef = useRef(null);

    const [newCamera, setNewCamera] = useState({
        name: '',
        zoneId: '',
        streamUrl_encrypted: '',
        fps: 30,
        confidenceThreshold: 0.7,
        status: 'ONLINE',
    });

    // ─── Auto‑refresh every 30 seconds ────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 30000);
        return () => clearInterval(interval);
    }, [refetch]);

    // ─── Fetch Zones ──────────────────────────────────────────────
    const fetchZones = useCallback(async (showToast = true) => {
        setZonesLoading(true);
        setZoneError(null);
        try {
            const response = await api.get('/zones');
            let zoneArray = [];
            if (Array.isArray(response)) zoneArray = response;
            else if (response?.data && Array.isArray(response.data)) zoneArray = response.data;
            else if (response?.success && Array.isArray(response.data)) zoneArray = response.data;
            else {
                for (const key in response) {
                    if (Array.isArray(response[key])) {
                        zoneArray = response[key];
                        break;
                    }
                }
            }
            if (zoneArray.length === 0 && showToast) {
                toast.error('No zones found. Please create a zone first.');
            }
            setZones(zoneArray);
            return zoneArray;
        } catch (err) {
            console.error('Failed to fetch zones:', err);
            setZoneError(err.message || 'Could not load zones');
            if (showToast) toast.error('Could not load zones. Please try again.');
            setZones([]);
            return [];
        } finally {
            setZonesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchZones(true);
    }, [fetchZones]);

    // ─── Parse cameras data ──────────────────────────────────────
    useEffect(() => {
        if (camerasData) {
            const camArray = Array.isArray(camerasData)
                ? camerasData
                : camerasData?.data && Array.isArray(camerasData.data)
                    ? camerasData.data
                    : [];
            setCameras(camArray);
        }
    }, [camerasData]);

    // ─── Socket live updates ─────────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;

        const handleStatusUpdate = (data) => {
            setCameras((prev) =>
                prev.map((cam) => {
                    if (cam._id === data.cameraId) {
                        const statusText = data.newStatus === 'ONLINE' ? 'Online' : 'Offline';
                        toast.success(`📷 ${cam.name} is now ${statusText}`, {
                            icon: data.newStatus === 'ONLINE' ? '🟢' : '🔴',
                            duration: 4000,
                        });
                        return { ...cam, status: data.newStatus };
                    }
                    return cam;
                })
            );
        };

        const handleNewEvent = (data) => {
            const distance = data.distance || 10;
            const message = templates[lang] ? templates[lang](distance) : templates.en(distance);
            toast(message, {
                icon: '🗑️',
                duration: 8000,
                style: {
                    background: '#1e293b',
                    color: '#f1f5f9',
                    border: '1px solid #f59e0b',
                },
            });
            speakAnnouncement(distance, lang);
        };

        socket.on('camera:status', handleStatusUpdate);
        socket.on('event:new', handleNewEvent);

        return () => {
            socket.off('camera:status', handleStatusUpdate);
            socket.off('event:new', handleNewEvent);
        };
    }, [socket, lang]);

    // ─── Filter cameras ──────────────────────────────────────────
    const filteredCameras = useMemo(() => {
        return cameras.filter((cam) => {
            const matchZone = filterZone ? cam.zoneId?._id === filterZone || cam.zoneId === filterZone : true;
            const matchStatus = filterStatus ? cam.status === filterStatus : true;
            const matchSearch = searchTerm
                ? cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (cam.zoneId?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
                : true;
            return matchZone && matchStatus && matchSearch;
        });
    }, [cameras, filterZone, filterStatus, searchTerm]);

    // ─── CRUD Operations ──────────────────────────────────────────
    const handleAddCamera = async (e) => {
        e.preventDefault();
        if (!newCamera.name.trim() || !newCamera.zoneId) {
            toast.error('Name and zone are required');
            return;
        }
        setIsAdding(true);
        try {
            const payload = { ...newCamera };
            delete payload.status;
            const response = await api.post('/cameras', payload);
            toast.success(`Camera "${response.name}" created`);
            setShowAddModal(false);
            setNewCamera({
                name: '',
                zoneId: '',
                streamUrl_encrypted: '',
                fps: 30,
                confidenceThreshold: 0.7,
                status: 'ONLINE',
            });
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create camera');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateCamera = async (e) => {
        e.preventDefault();
        if (!editingCamera) return;
        try {
            const payload = { ...editingCamera };
            delete payload._id;
            delete payload.createdAt;
            delete payload.updatedAt;
            const response = await api.put(`/cameras/${editingCamera._id}`, payload);
            toast.success(`Camera "${response.name}" updated`);
            setEditingCamera(null);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update camera');
        }
    };

    const handleDeleteCamera = async (id) => {
        try {
            await api.delete(`/cameras/${id}`);
            toast.success('Camera deleted');
            setShowDeleteConfirm(null);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete camera');
        }
    };

    // ─── Force status to ONLINE (workaround) ─────────────────────
    const forceStatusOnline = async (cameraId) => {
        try {
            // Adjust endpoint if your backend uses a different path
            await api.patch(`/cameras/${cameraId}/status`, { status: 'ONLINE' });
            toast.success('Camera status forced to ONLINE');
            refetch();
            // Also update local state immediately
            setCameras((prev) =>
                prev.map((cam) =>
                    cam._id === cameraId ? { ...cam, status: 'ONLINE' } : cam
                )
            );
        } catch (err) {
            toast.error('Failed to force status. Check backend endpoint.');
        }
    };

    // ─── Language change handler ──────────────────────────────────
    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setLang(newLang);
        localStorage.setItem('speakerLang', newLang);
    };

    // ─── Live modal handlers ──────────────────────────────────────
    const openLiveModal = useCallback((camera) => {
        setSelectedCamera(camera);
        setStreamType('auto');
        setStreamError(false);
        setStreamActuallyWorking(false); // reset
        setRetryKey((prev) => prev + 1);
        setLiveModalOpen(true);
    }, []);

    const closeLiveModal = useCallback(() => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (mjpegIntervalRef.current) {
            clearInterval(mjpegIntervalRef.current);
            mjpegIntervalRef.current = null;
        }
        setLiveModalOpen(false);
        setSelectedCamera(null);
    }, []);

    const handleRetryStream = useCallback(() => {
        setStreamError(false);
        setStreamActuallyWorking(false);
        setRetryKey((prev) => prev + 1);
        toast.loading('Retrying...', { id: 'stream-retry' });
        setTimeout(() => toast.dismiss('stream-retry'), 2000);
    }, []);

    // ─── Initialize stream when modal opens ──────────────────────
    useEffect(() => {
        if (!liveModalOpen || !selectedCamera) return;

        const streamUrl = selectedCamera.streamUrl_encrypted;
        if (!streamUrl) {
            setStreamError(true);
            return;
        }

        let type = streamType;
        if (type === 'auto') {
            type = guessStreamType(streamUrl);
            if (type === 'unknown') type = 'hls';
        }

        if (mjpegIntervalRef.current) {
            clearInterval(mjpegIntervalRef.current);
            mjpegIntervalRef.current = null;
        }
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const video = videoRef.current;
        const img = imgRef.current;

        // Helper to mark stream as working
        const markWorking = () => {
            setStreamActuallyWorking(true);
            setStreamError(false);
        };

        if (type === 'mjpeg') {
            if (img) {
                const loadImage = () => {
                    const url = getCacheBustUrl(streamUrl);
                    img.src = url;
                    img.onerror = () => {
                        setStreamError(true);
                        setStreamActuallyWorking(false);
                        if (mjpegIntervalRef.current) {
                            clearInterval(mjpegIntervalRef.current);
                            mjpegIntervalRef.current = null;
                        }
                        toast.error('MJPEG stream failed – check camera address.');
                    };
                    img.onload = () => {
                        markWorking();
                    };
                    img.style.display = 'block';
                };
                loadImage();

                mjpegIntervalRef.current = setInterval(() => {
                    if (!streamError) {
                        const url = getCacheBustUrl(streamUrl);
                        img.src = url;
                        // We'll rely on onload to set working each time
                    }
                }, 2000);
            }
            if (video) video.style.display = 'none';
        } else {
            if (video) {
                video.style.display = 'block';
                const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

                if (isHls && Hls && Hls.isSupported()) {
                    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
                    hls.loadSource(streamUrl);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        video.play().catch(() => { });
                        markWorking();
                    });
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            setStreamError(true);
                            setStreamActuallyWorking(false);
                            toast.error('HLS stream error – try switching to MJPEG.');
                        }
                    });
                    hlsRef.current = hls;
                } else {
                    video.src = streamUrl;
                    video.poster = PLACEHOLDER_IMAGE;
                    video.play().catch(() => { });
                    // If can play through, mark working
                    video.oncanplay = () => {
                        markWorking();
                    };
                    video.onerror = () => {
                        setStreamError(true);
                        setStreamActuallyWorking(false);
                        toast.error('Video stream error – try switching to MJPEG.');
                    };
                }
            }
            if (img) img.style.display = 'none';
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (mjpegIntervalRef.current) {
                clearInterval(mjpegIntervalRef.current);
                mjpegIntervalRef.current = null;
            }
        };
    }, [liveModalOpen, selectedCamera, streamType, retryKey, streamError]);

    // ─── Refresh handler ──────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Promise.all([refetch(), fetchZones(false)]);
        setIsRefreshing(false);
        toast.success('Refreshed');
    }, [refetch, fetchZones]);

    // ─── Render helpers ──────────────────────────────────────────
    const renderCameraCard = (cam) => {
        const isMJPEGStream = isMJPEG(cam.streamUrl_encrypted);
        const isRTSPStream = isRTSP(cam.streamUrl_encrypted);
        const isAllowed = isAllowedStream(cam.streamUrl_encrypted);
        const canPreview = isAllowed && !isRTSPStream;

        return (
            <div
                key={cam._id}
                className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-primary/40 transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-primary/5 group"
            >
                <div className="relative aspect-video bg-black flex items-center justify-center">
                    {canPreview ? (
                        isMJPEGStream ? (
                            <img
                                src={getCacheBustUrl(cam.streamUrl_encrypted)}
                                alt="MJPEG stream"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = PLACEHOLDER_IMAGE;
                                }}
                            />
                        ) : (
                            <video
                                src={cam.streamUrl_encrypted}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                controls
                                poster={PLACEHOLDER_IMAGE}
                            />
                        )
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            {cam.streamUrl_encrypted ? (
                                <>
                                    <VideoOff className="w-12 h-12 mb-2 text-yellow-400" />
                                    <span className="text-xs text-yellow-400 text-center px-2">
                                        {isRTSPStream
                                            ? 'RTSP – use HLS proxy'
                                            : !isAllowed
                                                ? 'Unsupported protocol'
                                                : 'Stream unavailable'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <VideoOff className="w-12 h-12 mb-2" />
                                    <span className="text-sm">No stream</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2">
                        <span
                            className={`text-xs px-2 py-1 rounded-full border ${getStatusBadge(cam.status)}`}
                        >
                            {cam.status}
                        </span>
                    </div>

                    {/* Quick action overlay */}
                    <div className="absolute bottom-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => {
                                setEditingCamera({
                                    ...cam,
                                });
                            }}
                            className="p-1.5 bg-black/60 rounded-lg hover:bg-primary/60 transition-colors"
                            title="Edit"
                        >
                            <Edit className="w-4 h-4 text-white" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(cam._id)}
                            className="p-1.5 bg-black/60 rounded-lg hover:bg-red-600/60 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                    </div>

                    <button
                        onClick={() => setExpandedCamera(expandedCamera === cam._id ? null : cam._id)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-primary/60 transition-colors"
                    >
                        {expandedCamera === cam._id ? (
                            <ChevronUp className="w-4 h-4 text-white" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-white" />
                        )}
                    </button>
                </div>

                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-white font-semibold truncate">{cam.name}</h3>
                            <p className="text-gray-400 text-sm truncate">
                                Zone: {cam.zoneId?.name || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-gray-400">
                        <div><span className="text-gray-500">FPS</span> {cam.fps || 30}</div>
                        <div><span className="text-gray-500">Threshold</span> {cam.confidenceThreshold || 0.7}</div>
                        <div><span className="text-gray-500">Heartbeat</span> {cam.lastHeartbeat ? new Date(cam.lastHeartbeat).toLocaleTimeString() : 'Never'}</div>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                        <button
                            onClick={() => openLiveModal(cam)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"
                        >
                            <Play className="w-4 h-4" /> Live
                        </button>
                        <button
                            onClick={() => navigate(`/cameras/${cam._id}/events`)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700/30 text-gray-300 rounded-lg hover:bg-gray-600/50 transition text-sm"
                        >
                            <Eye className="w-4 h-4" /> Events
                        </button>
                    </div>

                    {expandedCamera === cam._id && (
                        <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-300 space-y-2">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => navigate(`/cameras/${cam._id}/alerts`)}
                                    className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20"
                                >
                                    <AlertTriangle className="w-3 h-3" /> Alerts
                                </button>
                                <button
                                    onClick={() => navigate(`/cameras/${cam._id}/analytics`)}
                                    className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20"
                                >
                                    <BarChart3 className="w-3 h-3" /> Analytics
                                </button>
                                <button
                                    onClick={() => navigate(`/cameras/${cam._id}/health`)}
                                    className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                                >
                                    <Activity className="w-3 h-3" /> Health
                                </button>
                            </div>
                            <div className="text-xs text-gray-500">
                                ID: {cam._id} · Created: {new Date(cam.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─── Loading / Error states ──────────────────────────────────
    if (loading || zonesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4 flex flex-col items-center">
                <AlertCircle className="w-12 h-12 mb-2" />
                <p>Error loading cameras: {error}</p>
                <button onClick={handleRefresh} className="mt-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition">
                    Retry
                </button>
            </div>
        );
    }

    const canAddCamera = zones.length > 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Camera className="w-7 h-7 text-primary" /> Cameras
                    </h1>
                    <p className="text-sm text-gray-400">
                        {filteredCameras.length} of {cameras.length} camera{cameras.length !== 1 ? 's' : ''} configured
                        {zoneError && ` (Zone fetch error: ${zoneError})`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-2 py-1.5 border border-gray-700">
                        <Speaker className="w-4 h-4 text-gray-400" />
                        <select
                            value={lang}
                            onChange={handleLangChange}
                            className="bg-transparent text-white text-sm border-0 focus:ring-0 outline-none"
                        >
                            <option value="en">English</option>
                            <option value="hi">हिन्दी</option>
                            <option value="pa">ਪੰਜਾਬੀ</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={!canAddCamera}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${canAddCamera
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        title={!canAddCamera ? 'Please create a zone first' : ''}
                    >
                        <Plus className="w-4 h-4" /> Add Camera
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ─── Filters ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or zone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border border-gray-700 rounded-lg px-3 py-1.5 text-white w-full focus:ring-2 focus:ring-primary"
                    />
                </div>
                <select
                    value={filterZone}
                    onChange={(e) => setFilterZone(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Zones</option>
                    {zones.map((z) => (
                        <option key={z._id} value={z._id}>{z.name}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Status</option>
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="WARNING">Warning</option>
                </select>
                {zoneError && (
                    <button
                        onClick={() => fetchZones(true)}
                        className="text-xs text-yellow-400 hover:underline"
                    >
                        Retry zones
                    </button>
                )}
            </div>

            {/* ─── No zones or zone fetch error ───────────────────── */}
            {(!canAddCamera || zoneError) && (
                <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${zoneError
                    ? 'bg-red-900/20 border border-red-700 text-red-400'
                    : 'bg-yellow-900/20 border border-yellow-700 text-yellow-400'
                    }`}>
                    {zoneError ? (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="flex-1">
                        {zoneError
                            ? `Could not load zones: ${zoneError}`
                            : 'You need at least one zone before you can add a camera.'
                        }
                    </span>
                    {zoneError ? (
                        <button
                            onClick={() => fetchZones(true)}
                            className="ml-auto text-primary hover:underline whitespace-nowrap"
                        >
                            Retry
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/zones')}
                            className="ml-auto text-primary hover:underline whitespace-nowrap"
                        >
                            Create a zone
                        </button>
                    )}
                </div>
            )}

            {/* ─── Camera Grid ──────────────────────────────────────── */}
            {filteredCameras.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>{cameras.length === 0 ? 'No cameras found.' : 'No cameras match your filters.'}</p>
                    {canAddCamera && cameras.length === 0 && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            Add your first camera
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCameras.map(renderCameraCard)}
                </div>
            )}

            {/* ─── Live Video Modal ────────────────────────────────── */}
            {liveModalOpen && selectedCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-4xl w-full border border-gray-700 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                {selectedCamera.name}
                                <span
                                    className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(selectedCamera.status)}`}
                                >
                                    {selectedCamera.status}
                                </span>
                                {/* NEW: Show stream working indicator */}
                                {streamActuallyWorking && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                        Stream Active
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {/* NEW: Force online button */}
                                {selectedCamera.status !== 'ONLINE' && (
                                    <button
                                        onClick={() => forceStatusOnline(selectedCamera._id)}
                                        className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 text-sm flex items-center gap-1"
                                    >
                                        <Power className="w-3 h-3" /> Force Online
                                    </button>
                                )}
                                <button
                                    onClick={closeLiveModal}
                                    className="p-1 hover:bg-gray-800 rounded-lg"
                                >
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                            <img
                                ref={imgRef}
                                src={PLACEHOLDER_IMAGE}
                                alt="MJPEG stream"
                                className="w-full h-full object-contain"
                                style={{ display: 'none' }}
                                onError={() => {
                                    setStreamError(true);
                                    if (imgRef.current) imgRef.current.src = PLACEHOLDER_IMAGE;
                                }}
                            />
                            <video
                                ref={videoRef}
                                className="w-full h-full object-contain"
                                controls
                                autoPlay
                                playsInline
                                poster={PLACEHOLDER_IMAGE}
                                style={{ display: 'none' }}
                            />
                            <div className="absolute bottom-4 left-4 flex gap-2 z-10 bg-black/60 rounded-lg p-1.5">
                                <button
                                    onClick={() => setStreamType('auto')}
                                    className={`px-2 py-1 text-xs rounded ${streamType === 'auto' ? 'bg-primary/50 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Auto
                                </button>
                                <button
                                    onClick={() => setStreamType('mjpeg')}
                                    className={`px-2 py-1 text-xs rounded ${streamType === 'mjpeg' ? 'bg-primary/50 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    MJPEG
                                </button>
                                <button
                                    onClick={() => setStreamType('hls')}
                                    className={`px-2 py-1 text-xs rounded ${streamType === 'hls' ? 'bg-primary/50 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    HLS/MP4
                                </button>
                            </div>
                            {streamError && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                                    <VideoOff className="w-12 h-12 text-red-400 mb-2" />
                                    <p className="text-white text-sm">Stream unavailable</p>
                                    <p className="text-gray-400 text-xs mt-1">Try switching to MJPEG or HLS/MP4</p>
                                    <button
                                        onClick={handleRetryStream}
                                        className="mt-3 px-4 py-1.5 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm transition"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {/* Show offline status only if stream not working and status offline */}
                            {selectedCamera.status !== 'ONLINE' && !streamError && !streamActuallyWorking && (
                                <div className="absolute top-2 left-2 bg-red-500/80 text-white px-3 py-1 rounded-lg text-sm">
                                    Camera Offline (but stream may load)
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex justify-between text-sm text-gray-400">
                            <span>Zone: {selectedCamera.zoneId?.name || 'Unknown'}</span>
                            <span>FPS: {selectedCamera.fps || 30}</span>
                            <span>Threshold: {selectedCamera.confidenceThreshold || 0.7}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Add/Edit Modal ────────────────────────────────────── */}
            {(showAddModal || editingCamera) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                {editingCamera ? 'Edit Camera' : 'Add Camera'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingCamera(null);
                                }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={editingCamera ? handleUpdateCamera : handleAddCamera} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingCamera ? editingCamera.name || '' : newCamera.name}
                                    onChange={(e) =>
                                        editingCamera
                                            ? setEditingCamera({ ...editingCamera, name: e.target.value })
                                            : setNewCamera({ ...newCamera, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Main Entrance"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Zone</label>
                                <select
                                    value={editingCamera ? editingCamera.zoneId || '' : newCamera.zoneId}
                                    onChange={(e) =>
                                        editingCamera
                                            ? setEditingCamera({ ...editingCamera, zoneId: e.target.value })
                                            : setNewCamera({ ...newCamera, zoneId: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    disabled={zones.length === 0}
                                >
                                    <option value="">Select a zone</option>
                                    {zones.map((z) => (
                                        <option key={z._id} value={z._id}>{z.name}</option>
                                    ))}
                                </select>
                                {zones.length === 0 && (
                                    <p className="text-yellow-400 text-sm mt-1">No zones available. Please create one first.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Stream URL</label>
                                <input
                                    type="text"
                                    value={editingCamera ? editingCamera.streamUrl_encrypted || '' : newCamera.streamUrl_encrypted}
                                    onChange={(e) =>
                                        editingCamera
                                            ? setEditingCamera({ ...editingCamera, streamUrl_encrypted: e.target.value })
                                            : setNewCamera({ ...newCamera, streamUrl_encrypted: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="http://.../mjpeg or http://.../hls/stream.m3u8"
                                />
                                <p className="text-xs text-yellow-400 mt-1">
                                    ⚠️ Use direct stream URL (HTTP/HTTPS). RTSP is not supported.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">FPS</label>
                                    <input
                                        type="number"
                                        value={editingCamera ? editingCamera.fps ?? 30 : newCamera.fps}
                                        onChange={(e) =>
                                            editingCamera
                                                ? setEditingCamera({ ...editingCamera, fps: parseInt(e.target.value) || 30 })
                                                : setNewCamera({ ...newCamera, fps: parseInt(e.target.value) || 30 })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        min="1"
                                        max="60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Threshold</label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        value={editingCamera ? editingCamera.confidenceThreshold ?? 0.7 : newCamera.confidenceThreshold}
                                        onChange={(e) =>
                                            editingCamera
                                                ? setEditingCamera({ ...editingCamera, confidenceThreshold: parseFloat(e.target.value) || 0.7 })
                                                : setNewCamera({ ...newCamera, confidenceThreshold: parseFloat(e.target.value) || 0.7 })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        min="0"
                                        max="1"
                                    />
                                </div>
                            </div>
                            {!editingCamera && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Status</label>
                                    <select
                                        value={newCamera.status}
                                        onChange={(e) => setNewCamera({ ...newCamera, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="ONLINE">Online</option>
                                        <option value="OFFLINE">Offline</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingCamera(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding || zones.length === 0}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAdding ? 'Saving...' : (editingCamera ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation Modal ────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                        <p className="text-gray-400 mt-2">Are you sure you want to delete this camera? This action cannot be undone.</p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteCamera(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cameras;