// frontend/src/pages/LiveMonitoring.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import {
    Camera,
    Video,
    VideoOff,
    Plus,
    RefreshCw,
    Play,
    Pause,
    Image,
    AlertCircle,
    Maximize2,
    Minimize2,
    Wifi,
    WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const LiveMonitoring = () => {
    const { data: camerasData, loading: camerasLoading, error: camerasError, refetch } = useFetch('/cameras', { immediate: true });
    const [cameras, setCameras] = useState([]);
    const [onlineCameras, setOnlineCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamType, setStreamType] = useState('unknown');
    const [mjpegInterval, setMjpegInterval] = useState(null);
    const [latestSnapshot, setLatestSnapshot] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [streamError, setStreamError] = useState(false); // tracks if stream has failed

    const videoRef = useRef(null);
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            stopStream();
        };
    }, []);

    const stopStream = useCallback(() => {
        if (mjpegInterval) {
            clearInterval(mjpegInterval);
            setMjpegInterval(null);
        }
        if (videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.load();
            videoRef.current.style.display = 'none';
        }
        if (imgRef.current) {
            imgRef.current.src = '';
            imgRef.current.style.display = 'none';
        }
        setIsStreaming(false);
        setStreamError(false);
        setError('');
    }, [mjpegInterval]);

    const startStream = useCallback(async () => {
        if (!selectedCamera) {
            toast.error('No camera selected');
            return;
        }

        const url = selectedCamera.streamUrl_encrypted;
        if (!url) {
            setError('No stream URL configured for this camera');
            toast.error('No stream URL');
            return;
        }

        if (!isAllowedStream(url) && !url.startsWith('0')) {
            setError('Unsupported stream protocol. Only HTTP/HTTPS is supported.');
            toast.error('Unsupported protocol');
            return;
        }

        setIsLoading(true);
        setError('');
        setStreamError(false);

        try {
            stopStream();

            const type = guessStreamType(url);
            setStreamType(type);

            if (type === 'mjpeg' || isMJPEG(url)) {
                if (imgRef.current) {
                    imgRef.current.crossOrigin = 'anonymous';
                    imgRef.current.style.display = 'block';

                    // Load image with error handling
                    const loadImage = () => {
                        if (!isMounted.current) return;
                        const imgUrl = getCacheBustUrl(url);
                        imgRef.current.src = imgUrl;
                    };

                    // Set onerror once
                    imgRef.current.onerror = () => {
                        if (!isMounted.current) return;
                        setStreamError(true);
                        setError('MJPEG stream error – camera unreachable or URL invalid.');
                        toast.error('MJPEG stream failed');
                        // Stop the interval
                        if (mjpegInterval) {
                            clearInterval(mjpegInterval);
                            setMjpegInterval(null);
                        }
                        setIsStreaming(false);
                        // Replace with placeholder
                        if (imgRef.current) {
                            imgRef.current.src = '';
                            imgRef.current.alt = 'Stream unavailable';
                        }
                    };

                    imgRef.current.onload = () => {
                        if (!isMounted.current) return;
                        setStreamError(false);
                        setIsStreaming(true);
                        setError('');
                    };

                    loadImage();

                    // Refresh every 2 seconds if no error
                    const interval = setInterval(() => {
                        if (isMounted.current && !streamError && imgRef.current) {
                            imgRef.current.src = getCacheBustUrl(url);
                        }
                    }, 2000);
                    setMjpegInterval(interval);
                }
            } else if (type === 'hls' || type === 'mp4') {
                if (videoRef.current) {
                    videoRef.current.crossOrigin = 'anonymous';
                    videoRef.current.src = url;
                    videoRef.current.style.display = 'block';
                    videoRef.current
                        .play()
                        .then(() => {
                            setIsStreaming(true);
                            setError('');
                        })
                        .catch((err) => {
                            setStreamError(true);
                            setError(`Video play error: ${err.message}`);
                            toast.error('Video stream error');
                        });
                    videoRef.current.onerror = () => {
                        setStreamError(true);
                        setError('Video stream error – check URL or format.');
                        toast.error('Video stream error');
                    };
                }
            } else {
                // fallback: try as video
                if (videoRef.current) {
                    videoRef.current.crossOrigin = 'anonymous';
                    videoRef.current.src = url;
                    videoRef.current.style.display = 'block';
                    videoRef.current
                        .play()
                        .then(() => {
                            setIsStreaming(true);
                            setError('');
                        })
                        .catch((err) => {
                            setStreamError(true);
                            setError(`Playback error: ${err.message}`);
                            toast.error('Stream playback error');
                        });
                    videoRef.current.onerror = () => {
                        setStreamError(true);
                        setError('Stream error – check URL.');
                        toast.error('Stream error');
                    };
                }
            }

            if (!streamError) {
                toast.success(`Streaming: ${selectedCamera.name}`);
            }
        } catch (err) {
            setError(`Failed to start stream: ${err.message}`);
            toast.error(`Failed: ${err.message}`);
            setStreamError(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCamera, stopStream, mjpegInterval, streamError]);

    const handleCameraSelect = (cam) => {
        if (isStreaming) stopStream();
        setSelectedCamera(cam);
        setStreamError(false);
        // Start after a short delay to allow state update
        setTimeout(() => startStream(), 200);
    };

    const takeSnapshot = () => {
        if (!isStreaming || streamError) {
            toast.error('No active stream');
            return;
        }

        try {
            let sourceElement = null;
            let width = 0,
                height = 0;

            if (streamType === 'mjpeg' && imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
                sourceElement = imgRef.current;
                width = sourceElement.naturalWidth;
                height = sourceElement.naturalHeight;
            } else if (videoRef.current && videoRef.current.videoWidth > 0) {
                sourceElement = videoRef.current;
                width = sourceElement.videoWidth;
                height = sourceElement.videoHeight;
            } else {
                if (imgRef.current && imgRef.current.style.display !== 'none' && imgRef.current.complete) {
                    sourceElement = imgRef.current;
                    width = imgRef.current.naturalWidth || 640;
                    height = imgRef.current.naturalHeight || 480;
                } else if (videoRef.current && videoRef.current.style.display !== 'none') {
                    sourceElement = videoRef.current;
                    width = videoRef.current.videoWidth || 640;
                    height = videoRef.current.videoHeight || 480;
                } else {
                    toast.error('No visible stream source');
                    return;
                }
            }

            if (!sourceElement || width === 0 || height === 0) {
                toast.error('Invalid stream source dimensions');
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast.error('Canvas context not available');
                return;
            }

            ctx.drawImage(sourceElement, 0, 0, width, height);

            try {
                const imageData = canvas.toDataURL('image/jpeg');
                setLatestSnapshot(imageData);
                toast.success('📸 Snapshot captured');
            } catch (exportErr) {
                if (exportErr.message.includes('Tainted')) {
                    toast.error(
                        'Cannot capture snapshot: CORS issue. The stream source does not allow cross-origin access.'
                    );
                } else {
                    toast.error(`Export failed: ${exportErr.message}`);
                }
                console.error('Export error:', exportErr);
            }
        } catch (err) {
            console.error('Snapshot error:', err);
            toast.error(`Snapshot failed: ${err.message}`);
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                toast.error('Fullscreen not supported');
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-start when selectedCamera changes (if already selected)
    useEffect(() => {
        if (selectedCamera) {
            startStream();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCamera]);

    // ─── Render ──────────────────────────────────────────────────
    if (camerasLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (camerasError) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-red-500 p-4">
                <AlertCircle className="w-12 h-12 mb-2" />
                <p>Failed to load cameras: {camerasError}</p>
                <button onClick={refetch} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg">
                    Retry
                </button>
            </div>
        );
    }

    if (cameras.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 p-4">
                <Camera className="w-16 h-16 mb-2 text-gray-600" />
                <p>No cameras configured</p>
                <button onClick={() => (window.location.href = '/cameras')} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg">
                    Go to Cameras
                </button>
            </div>
        );
    }

    if (onlineCameras.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-yellow-400 p-4">
                <VideoOff className="w-16 h-16 mb-2" />
                <p>No online cameras available</p>
                <p className="text-sm text-gray-400">Please check your camera connections</p>
                <button onClick={() => (window.location.href = '/cameras')} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg">
                    Manage Cameras
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-950 p-4 md:p-6 overflow-hidden" ref={containerRef}>
            {/* ─── Top Bar ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Camera className="w-6 h-6 text-primary" />
                    <h1 className="text-xl md:text-2xl font-bold text-white truncate">Live Monitoring</h1>
                    {selectedCamera && (
                        <span className="text-sm text-gray-400 hidden sm:inline">
                            • {selectedCamera.name}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {onlineCameras.map((cam) => (
                        <button
                            key={cam._id}
                            onClick={() => handleCameraSelect(cam)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedCamera?._id === cam._id
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {cam.name}
                        </button>
                    ))}
                    <button
                        onClick={() => (window.location.href = '/cameras')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add</span>
                    </button>
                    <button
                        onClick={isStreaming && !streamError ? stopStream : startStream}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${isStreaming && !streamError
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : isStreaming && !streamError ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                            {isStreaming && !streamError ? 'Stop' : 'Start'}
                        </span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-lg text-sm mb-4 shrink-0">
                    ⚠️ {error}
                    {streamError && (
                        <button
                            onClick={startStream}
                            className="ml-3 text-primary hover:underline"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {/* ─── Video + Snapshot ───────────────────────────────────── */}
            <div className="flex-1 min-h-0 flex gap-4">
                {/* Video Container */}
                <div className="flex-1 relative bg-black rounded-xl overflow-hidden border border-gray-800 aspect-video max-h-[calc(100vh-240px)]">
                    <video
                        ref={videoRef}
                        crossOrigin="anonymous"
                        autoPlay
                        playsInline
                        muted={streamType === 'webcam' ? false : true}
                        className="w-full h-full object-contain"
                        style={{ display: streamType === 'mjpeg' ? 'none' : 'block' }}
                    />
                    <img
                        ref={imgRef}
                        crossOrigin="anonymous"
                        alt="MJPEG stream"
                        className="w-full h-full object-contain"
                        style={{ display: streamType === 'mjpeg' ? 'block' : 'none' }}
                        onError={() => {
                            // This is handled in startStream, but keep as backup
                            if (!streamError) {
                                setStreamError(true);
                                setError('MJPEG stream error – camera unreachable.');
                                toast.error('MJPEG stream error');
                                if (mjpegInterval) {
                                    clearInterval(mjpegInterval);
                                    setMjpegInterval(null);
                                }
                                setIsStreaming(false);
                            }
                        }}
                    />

                    {(!isStreaming || streamError) && !isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                            <VideoOff className="w-16 h-16 mb-2" />
                            <p className="text-sm">{streamError ? 'Stream unavailable' : 'No active stream'}</p>
                            {streamError && (
                                <button
                                    onClick={startStream}
                                    className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
                                >
                                    Retry
                                </button>
                            )}
                            {!streamError && !isStreaming && (
                                <button
                                    onClick={startStream}
                                    className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
                                >
                                    Start Camera
                                </button>
                            )}
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                        </div>
                    )}
                    {isStreaming && !streamError && (
                        <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 rounded-lg text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            LIVE
                        </div>
                    )}
                    <button
                        onClick={toggleFullscreen}
                        className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition text-gray-300 hover:text-white"
                        title="Fullscreen"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>

                {/* Snapshot Panel */}
                <div className="w-48 bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 flex-shrink-0 hidden md:flex flex-col">
                    <div className="p-2 text-xs text-gray-400 border-b border-gray-700">Snapshot</div>
                    <div className="flex-1 flex items-center justify-center p-2">
                        {latestSnapshot ? (
                            <img src={latestSnapshot} alt="Snapshot" className="w-full object-cover rounded" />
                        ) : (
                            <div className="text-gray-500 text-sm text-center">No capture yet</div>
                        )}
                    </div>
                    <button
                        onClick={takeSnapshot}
                        disabled={!isStreaming || streamError}
                        className={`p-2 text-xs text-center border-t border-gray-700 transition ${isStreaming && !streamError
                                ? 'text-primary hover:bg-gray-700/50 cursor-pointer'
                                : 'text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        <Image className="w-4 h-4 inline mr-1" /> Capture
                    </button>
                </div>
            </div>

            {/* ─── Controls ────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mt-4 shrink-0">
                <button
                    onClick={takeSnapshot}
                    disabled={!isStreaming || streamError}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isStreaming && !streamError
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    <Image className="w-4 h-4" /> Capture Now
                </button>
                <button
                    onClick={startStream}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className="w-4 h-4" /> Reconnect
                </button>

                <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                    {selectedCamera ? (
                        <>
                            <span className="hidden sm:inline">{selectedCamera.name}</span>
                            {isStreaming && !streamError ? (
                                <span className="flex items-center gap-1 text-green-400">
                                    <Wifi className="w-4 h-4" /> Online
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-400">
                                    <WifiOff className="w-4 h-4" /> Offline
                                </span>
                            )}
                        </>
                    ) : (
                        <span>No camera</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveMonitoring;