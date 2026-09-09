// frontend/src/utils/streamUtils.js

export const getCacheBustUrl = (url) => {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_t=${Date.now()}`;
};

export const guessStreamType = (url) => {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) return 'mp4';
    if (lower.includes('mjpeg') || lower.includes('cgi-bin') || lower.includes('stream') || lower.includes('snapshot')) {
        return 'mjpeg';
    }
    return 'unknown';
};

export const isMJPEG = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('mjpeg') || lower.includes('cgi-bin') || lower.includes('stream') || lower.includes('snapshot');
};

export const isAllowedStream = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://') || lower.includes('.m3u8');
};

export const isRTSP = (url) => url?.toLowerCase().startsWith('rtsp://');

export const getStatusBadge = (status) => {
    const map = {
        ONLINE: 'bg-green-500/20 text-green-400 border border-green-500/30',
        OFFLINE: 'bg-red-500/20 text-red-400 border border-red-500/30',
        WARNING: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
};