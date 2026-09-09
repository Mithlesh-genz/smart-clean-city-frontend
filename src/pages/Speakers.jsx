// frontend/src/pages/Speakers.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useSocket } from '../context/SocketContext';
import {
    Mic,
    MicOff,
    Send,
    X,
    Plus,
    RefreshCw,
    Save,
    Edit,
    Trash2,
    Play,
    Volume2,
    VolumeX,
    Search,
    ChevronDown,
    ChevronUp,
    Eye,
    BarChart3,
    Clock,
    Power,
    PowerOff,
    AlertTriangle,
    CheckCircle,
    Languages,
    Network,
    Crosshair,
    Bluetooth,
    Wifi,
    Speaker,
    TestTube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const LANGUAGE_OPTIONS = [
    { code: 'EN', label: 'English' },
    { code: 'HI', label: 'हिन्दी' },
    { code: 'PA', label: 'ਪੰਜਾਬੀ' },
    { code: 'TA', label: 'தமிழ்' },
    { code: 'TE', label: 'తెలుగు' },
    { code: 'KN', label: 'ಕನ್ನಡ' },
    { code: 'ML', label: 'മലയാളം' },
    { code: 'MR', label: 'मराठी' },
    { code: 'GU', label: 'ગુજરાતી' },
    { code: 'BN', label: 'বাংলা' },
    { code: 'UR', label: 'اردو' },
];

const TEST_MESSAGE =
    'This is a test announcement. The smart city speaker system is working correctly.';

const Speakers = () => {
    const navigate = useNavigate();
    const socket = useSocket();
    const { data: speakersData, loading, error, refetch } = useFetch('/speakers', { immediate: true });

    // ─── State ──────────────────────────────────────────────────────
    const [speakers, setSpeakers] = useState([]);
    const [zones, setZones] = useState([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [zoneError, setZoneError] = useState(null);

    const [filterZone, setFilterZone] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLanguage, setFilterLanguage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [expandedSpeaker, setExpandedSpeaker] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSpeaker, setEditingSpeaker] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [newSpeaker, setNewSpeaker] = useState({
        name: '',
        zoneId: '',
        type: 'IP',
        ipAddress: '',
        bluetoothId: '',
        lat: '',
        lng: '',
        language: 'EN',
        languages: ['EN', 'HI', 'PA'],
        status: 'ONLINE',
        volume: 70,
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [announceModal, setAnnounceModal] = useState({
        open: false,
        speakerId: null,
        message: '',
        language: 'EN',
        languages: ['EN'],
    });
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedSpeakerIds, setSelectedSpeakerIds] = useState([]);
    const [bulkMessage, setBulkMessage] = useState('');
    const [bulkLanguages, setBulkLanguages] = useState(['EN', 'HI', 'PA']);
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    const [micActive, setMicActive] = useState(false);
    const [micVolume, setMicVolume] = useState(0);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);

    const [isTestSending, setIsTestSending] = useState(false);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState([]);

    // ─── Fetch Zones ──────────────────────────────────────────────
    const fetchZones = async (showToast = true) => {
        setZonesLoading(true);
        setZoneError(null);
        try {
            const response = await api.get('/zones?_=' + Date.now());
            console.log('📦 Raw zones response (full):', JSON.stringify(response, null, 2));

            let zoneArray = [];

            // If response is already an array
            if (Array.isArray(response)) {
                zoneArray = response;
            }
            // If response has a 'data' property that's an array
            else if (response?.data && Array.isArray(response.data)) {
                zoneArray = response.data;
            }
            // If response has a 'zones' property
            else if (response?.zones && Array.isArray(response.zones)) {
                zoneArray = response.zones;
            }
            // If response has an 'items' property
            else if (response?.items && Array.isArray(response.items)) {
                zoneArray = response.items;
            }
            // Fallback: search any property for an array
            else if (typeof response === 'object') {
                for (const key in response) {
                    if (Array.isArray(response[key])) {
                        zoneArray = response[key];
                        break;
                    }
                }
            }

            setZones(zoneArray);
            console.log(`✅ Found ${zoneArray.length} zones:`, zoneArray);

            if (zoneArray.length === 0 && showToast) {
                toast.error('No zones found. Please create a zone first.');
            }
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
    };

    useEffect(() => {
        fetchZones(true);
    }, []);

    // ─── Parse speakers data ──────────────────────────────────────
    useEffect(() => {
        if (speakersData) {
            const speakerArray = Array.isArray(speakersData)
                ? speakersData
                : speakersData?.data && Array.isArray(speakersData.data)
                    ? speakersData.data
                    : [];
            setSpeakers(speakerArray);
        }
    }, [speakersData]);

    // ─── Socket live updates ─────────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;
        const handleStatusUpdate = (data) => {
            setSpeakers((prev) =>
                prev.map((sp) => (sp._id === data.speakerId ? { ...sp, status: data.newStatus } : sp))
            );
        };
        const handleAnnouncement = (data) => {
            setSpeakers((prev) =>
                prev.map((sp) =>
                    sp._id === data.speakerId ? { ...sp, lastAnnouncementAt: data.timestamp } : sp
                )
            );
        };
        socket.on('speaker:status', handleStatusUpdate);
        socket.on('speaker:announcement', handleAnnouncement);
        return () => {
            socket.off('speaker:status', handleStatusUpdate);
            socket.off('speaker:announcement', handleAnnouncement);
        };
    }, [socket]);

    // ─── Filter speakers ──────────────────────────────────────────
    const filteredSpeakers = speakers.filter((sp) => {
        const matchZone = filterZone ? sp.zoneId?._id === filterZone || sp.zoneId === filterZone : true;
        const matchStatus = filterStatus ? sp.status === filterStatus : true;
        const matchLanguage = filterLanguage ? sp.language === filterLanguage : true;
        const matchSearch = searchTerm
            ? sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sp.zoneId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sp.ipAddress || '').toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        return matchZone && matchStatus && matchLanguage && matchSearch;
    });

    // ─── Location detection ──────────────────────────────────────
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by your browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude.toFixed(6),
                        lng: pos.coords.longitude.toFixed(6),
                    });
                },
                (err) => {
                    let msg = 'Could not fetch location.';
                    if (err.code === 1) msg = 'Location access denied. Please allow permissions.';
                    else if (err.code === 2) msg = 'Location unavailable.';
                    else if (err.code === 3) msg = 'Location request timed out.';
                    reject(new Error(msg));
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    const handleDetectLocation = async () => {
        setIsLocating(true);
        try {
            const coords = await getCurrentLocation();
            if (editingSpeaker) {
                setEditingSpeaker({ ...editingSpeaker, lat: coords.lat, lng: coords.lng });
                await autoDetectZone(coords.lat, coords.lng, editingSpeaker);
            } else {
                setNewSpeaker({ ...newSpeaker, lat: coords.lat, lng: coords.lng });
                await autoDetectZone(coords.lat, coords.lng, null);
            }
            toast.success('📍 Location detected');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsLocating(false);
        }
    };

    const autoDetectZone = async (lat, lng, currentSpeaker) => {
        try {
            const response = await api.get(`/zones/nearby?lat=${lat}&lng=${lng}&limit=1`);
            if (response?.data) {
                const zoneId = response.data._id;
                if (currentSpeaker) {
                    setEditingSpeaker({ ...currentSpeaker, zoneId });
                } else {
                    setNewSpeaker((prev) => ({ ...prev, zoneId }));
                }
                toast.success(`Zone "${response.data.name}" detected automatically`);
            }
        } catch (err) {
            console.warn('Auto‑detect zone failed:', err);
        }
    };

    // ─── Speaker Discovery ──────────────────────────────────────
    const handleDiscoverSpeakers = async () => {
        setIsDiscovering(true);
        try {
            const response = await api.get('/speakers/discover');
            setDiscoveredDevices(response.data || []);
            if (response.data.length === 0) {
                toast.info('No speakers discovered on the network.');
            } else {
                toast.success(`Found ${response.data.length} speakers`);
            }
        } catch (err) {
            toast.error('Discovery failed: ' + err.message);
        } finally {
            setIsDiscovering(false);
        }
    };

    const addDiscoveredSpeaker = (device) => {
        setNewSpeaker((prev) => ({
            ...prev,
            name: device.name || 'Discovered Speaker',
            ipAddress: device.ip || '',
            type: 'IP',
        }));
        setDiscoveredDevices([]);
        toast.success('Device added to form');
    };

    // ─── Bluetooth connection ────────────────────────────────────
    const connectBluetooth = async () => {
        try {
            // Valid service UUIDs recognized by Web Bluetooth API
            const validServices = [
                'generic_access',           // 0x1800 – most common, works for many BLE devices
                'device_information',       // 0x180A
                'battery_service',          // 0x180F
                0x1853,                     // Common Audio Service (16-bit UUID)
                '00001853-0000-1000-8000-00805f9b34fb', // Common Audio Service (full UUID)
                '00001800-0000-1000-8000-00805f9b34fb', // Generic Access (full UUID)
            ];

            const device = await navigator.bluetooth.requestDevice({
                filters: validServices.map(service => ({ services: [service] })),
                optionalServices: validServices,
            });

            const server = await device.gatt.connect();
            console.log('Connected to:', device.name || 'Unknown device');

            if (editingSpeaker) {
                setEditingSpeaker({
                    ...editingSpeaker,
                    bluetoothId: device.id,
                    type: 'BLUETOOTH',
                    name: device.name || editingSpeaker.name,
                });
            } else {
                setNewSpeaker({
                    ...newSpeaker,
                    bluetoothId: device.id,
                    type: 'BLUETOOTH',
                    name: device.name || newSpeaker.name,
                });
            }

            toast.success(`Connected to ${device.name || 'Bluetooth speaker'}`);
        } catch (err) {
            console.error('Bluetooth error:', err);

            // ─── Handle user cancellation gracefully ──────────────────
            if (err.name === 'NotFoundError' && err.message?.includes('cancelled')) {
                toast.info('Bluetooth device selection cancelled.');
                return;
            }

            let message = 'Bluetooth connection failed.';
            if (err.message.includes('No matching device')) {
                message = 'No Bluetooth speaker found. Make sure your device is in pairing mode.';
            } else if (err.message.includes('SecurityError')) {
                message = 'Bluetooth permission denied. Please allow Bluetooth access.';
            } else if (err.name === 'NotFoundError') {
                // This catches other cases like no adapter or no device found
                message = 'No Bluetooth adapter found or device not found.';
            } else if (err.message.includes('Invalid Service name')) {
                message = 'Invalid service name. Please enter a valid service UUID.';
            }
            toast.error(message);
        }
    };

    // ─── CRUD Operations ──────────────────────────────────────────
    const handleAddSpeaker = async (e) => {
        e.preventDefault();
        const { name, zoneId, type, ipAddress, bluetoothId, lat, lng, language, languages, status, volume } = newSpeaker;
        if (!name.trim() || !zoneId || !lat || !lng) {
            toast.error('Name, zone, and location are required');
            return;
        }
        if (type === 'IP' && !ipAddress) {
            toast.error('IP address is required for IP speakers');
            return;
        }
        if (type === 'BLUETOOTH' && !bluetoothId) {
            toast.error('Bluetooth ID is required for Bluetooth speakers');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                name: name.trim(),
                zoneId,
                type,
                ipAddress,
                bluetoothId,
                location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                language,
                languages: languages || ['EN', 'HI', 'PA'],
                status: status || 'OFFLINE',
                volume: parseInt(volume) || 70,
            };
            const response = await api.post('/speakers', payload);
            toast.success(`Speaker "${response.data.name}" created`);
            setShowAddModal(false);
            setNewSpeaker({
                name: '',
                zoneId: '',
                type: 'IP',
                ipAddress: '',
                bluetoothId: '',
                lat: '',
                lng: '',
                language: 'EN',
                languages: ['EN', 'HI', 'PA'],
                status: 'ONLINE',
                volume: 70,
            });
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create speaker');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateSpeaker = async (e) => {
        e.preventDefault();
        if (!editingSpeaker) return;
        const { _id, name, zoneId, type, ipAddress, bluetoothId, lat, lng, language, languages, status, volume } = editingSpeaker;
        if (!name.trim() || !zoneId || !lat || !lng) {
            toast.error('Name, zone, and location are required');
            return;
        }
        if (type === 'IP' && !ipAddress) {
            toast.error('IP address is required for IP speakers');
            return;
        }
        if (type === 'BLUETOOTH' && !bluetoothId) {
            toast.error('Bluetooth ID is required for Bluetooth speakers');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                name: name.trim(),
                zoneId,
                type,
                ipAddress,
                bluetoothId,
                location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                language,
                languages: languages || ['EN', 'HI', 'PA'],
                status,
                volume: parseInt(volume) || 70,
            };
            const response = await api.put(`/speakers/${_id}`, payload);
            toast.success(`Speaker "${response.data.name}" updated`);
            setEditingSpeaker(null);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update speaker');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSpeaker = async (id) => {
        try {
            await api.delete(`/speakers/${id}`);
            toast.success('Speaker deleted');
            setShowDeleteConfirm(null);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete speaker');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
        try {
            await api.put(`/speakers/${id}/status`, { status: newStatus });
            toast.success(`Speaker ${newStatus}`);
            refetch();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    // ─── Test tone ────────────────────────────────────────────────
    const playTestTone = (speakerId, volume = 100) => {
        try {
            const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
            if (!AudioContextClass) {
                toast.error('Web Audio is not supported in this browser');
                return;
            }

            const ctx = audioCtxRef.current || new AudioContextClass();
            if (!audioCtxRef.current) audioCtxRef.current = ctx;
            if (ctx.state === 'suspended') ctx.resume();

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.3);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);

            api
                .post(`/speakers/${speakerId}/test`, { volume: volume * 100 })
                .then(() => toast.success('Test signal sent'))
                .catch(() => toast.warning('Test logged, but speaker may not respond'));

            toast.success('🔊 Test tone playing');
        } catch (err) {
            console.error('Test tone error:', err);
            toast.error('Could not play test tone – check audio permissions');
        }
    };

    // ─── Individual announcement ──────────────────────────────────
    const handleSendAnnouncement = async (e) => {
        e.preventDefault();
        const { speakerId, message, language, languages } = announceModal;
        if (!message.trim()) {
            toast.error('Please enter a message');
            return;
        }
        try {
            await api.post(`/speakers/${speakerId}/announce`, {
                message,
                language,
                languages: languages || [language],
            });
            toast.success('Announcement sent');
            setAnnounceModal({ open: false, speakerId: null, message: '', language: 'EN', languages: ['EN'] });
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send announcement');
        }
    };

    // ─── Bulk announcement ────────────────────────────────────────
    const toggleSelectAll = () => {
        if (selectedSpeakerIds.length === speakers.length) {
            setSelectedSpeakerIds([]);
        } else {
            setSelectedSpeakerIds(speakers.map((s) => s._id));
        }
    };

    const toggleSelect = (id) => {
        setSelectedSpeakerIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleBulkAnnounce = async (e) => {
        e.preventDefault();
        if (!bulkMessage.trim()) {
            toast.error('Please enter a message');
            return;
        }
        if (selectedSpeakerIds.length === 0) {
            toast.error('Select at least one speaker');
            return;
        }
        setIsSendingBulk(true);
        try {
            const payload = {
                speakerIds: selectedSpeakerIds,
                text: bulkMessage,
                languages: bulkLanguages,
            };
            await api.post('/speakers/multiple-announce', payload);
            toast.success(`📢 Announcement sent to ${selectedSpeakerIds.length} speaker(s)`);
            setShowBulkModal(false);
            setBulkMessage('');
            setSelectedSpeakerIds([]);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send announcements');
        } finally {
            setIsSendingBulk(false);
        }
    };

    // ─── Test all speakers ──────────────────────────────────────
    const handleTestAllSpeakers = async () => {
        setIsTestSending(true);
        try {
            await api.post('/speakers/test-announcement');
            toast.success('✅ Test announcement sent to all online speakers');
        } catch (err) {
            toast.error('Failed to send test announcement');
        } finally {
            setIsTestSending(false);
        }
    };

    // ─── Microphone ──────────────────────────────────────────────
    const toggleMicrophone = async () => {
        if (micActive) {
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            setMicActive(false);
            setMicVolume(0);
            toast('Microphone stopped', { icon: '🎤' });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            if (!audioCtxRef.current) audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            sourceRef.current = source;
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length;
                const percent = Math.min(100, (avg / 255) * 100);
                setMicVolume(Math.round(percent));
                animationRef.current = requestAnimationFrame(updateVolume);
            };

            setMicActive(true);
            updateVolume();
            toast.success('Microphone active');
        } catch (err) {
            console.error('Mic error:', err);
            let message = 'Could not access microphone.';
            if (err.name === 'NotAllowedError') {
                message = 'Microphone access denied. Please allow microphone permissions in browser settings.';
            } else if (err.name === 'NotFoundError') {
                message = 'No microphone found. Please connect a microphone.';
            }
            toast.error(message);
            setMicActive(false);
            setMicVolume(0);
        }
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    // ─── Refresh ──────────────────────────────────────────────────
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([refetch(), fetchZones(false)]);
        setIsRefreshing(false);
        toast.success('Refreshed');
    };

    // ─── Render ────────────────────────────────────────────────────
    if (loading || zonesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error loading speakers: {error}
                <button onClick={handleRefresh} className="ml-4 px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm">
                    Retry
                </button>
            </div>
        );
    }

    const canAddSpeaker = zones.length > 0;
    const getLatLng = (speaker) => ({
        lat: speaker.location?.coordinates?.[1] ?? '',
        lng: speaker.location?.coordinates?.[0] ?? '',
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Speaker className="w-7 h-7 text-primary" /> Smart Speakers
                    </h1>
                    <p className="text-sm text-gray-400">
                        {filteredSpeakers.length} of {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} configured
                        {zoneError && ` (Zone fetch error: ${zoneError})`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* ─── Test All Speakers ──────────────────────────── */}
                    <button
                        onClick={handleTestAllSpeakers}
                        disabled={isTestSending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                        <TestTube className="w-4 h-4" />
                        {isTestSending ? 'Sending...' : 'Test All'}
                    </button>
                    {/* ─── Discover Speakers ──────────────────────────── */}
                    <button
                        onClick={handleDiscoverSpeakers}
                        disabled={isDiscovering}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                    >
                        <Network className="w-4 h-4" />
                        {isDiscovering ? 'Scanning...' : 'Discover'}
                    </button>
                    {/* ─── Add Speaker ─────────────────────────────────── */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={!canAddSpeaker}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${canAddSpeaker
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        title={!canAddSpeaker ? 'Please create a zone first' : ''}
                    >
                        <Plus className="w-4 h-4" /> Add Speaker
                    </button>
                    {/* ─── Bulk Announce ──────────────────────────────── */}
                    <button
                        onClick={() => setShowBulkModal(true)}
                        disabled={speakers.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" /> Bulk
                    </button>
                    {/* ─── Microphone ──────────────────────────────────── */}
                    <button
                        onClick={toggleMicrophone}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${micActive
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                            }`}
                    >
                        {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        {micActive ? 'Stop Mic' : 'Start Mic'}
                        {micActive && (
                            <span className="ml-2 text-xs bg-gray-800 px-2 py-0.5 rounded-full">{micVolume}%</span>
                        )}
                    </button>
                    {/* ─── Refresh ────────────────────────────────────── */}
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

            {/* ─── Mic volume bar ──────────────────────────────────── */}
            {micActive && (
                <div className="mb-6">
                    <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${micVolume}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Mic volume</p>
                </div>
            )}

            {/* ─── Discovered devices ────────────────────────────── */}
            {discoveredDevices.length > 0 && (
                <div className="mb-6 bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Discovered Speakers</h4>
                    <div className="flex flex-wrap gap-2">
                        {discoveredDevices.map((device, idx) => (
                            <button
                                key={idx}
                                onClick={() => addDiscoveredSpeaker(device)}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
                            >
                                {device.name} ({device.ip})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Filters ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, zone, or IP..."
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
                </select>
                <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white"
                >
                    <option value="">All Languages</option>
                    {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
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

            {/* ─── Warning: No zones ───────────────────────────────── */}
            {!canAddSpeaker && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6 text-yellow-400">
                    ⚠️ You need at least one zone before you can add a speaker.
                    <button onClick={() => navigate('/zones')} className="ml-4 text-primary hover:underline">
                        Create a zone
                    </button>
                    <button onClick={() => fetchZones(true)} className="ml-4 text-blue-400 hover:underline">
                        Reload zones
                    </button>
                </div>
            )}

            {/* ─── Speaker Grid ──────────────────────────────────────── */}
            {filteredSpeakers.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <Speaker className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p>{speakers.length === 0 ? 'No speakers found.' : 'No speakers match your filters.'}</p>
                    {canAddSpeaker && speakers.length === 0 && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                        >
                            Add your first speaker
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSpeakers.map((sp) => {
                        const { lat, lng } = getLatLng(sp);
                        return (
                            <div
                                key={sp._id}
                                className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 hover:border-primary/30 transition-all overflow-hidden"
                            >
                                {/* ─── Card Header ──────────────────────────────── */}
                                <div className="p-4 pb-0 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-white font-semibold">{sp.name}</h3>
                                        <p className="text-gray-400 text-sm">Zone: {sp.zoneId?.name || 'Unknown'}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${sp.status === 'ONLINE'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {sp.status}
                                            </span>
                                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
                                                {sp.language}
                                            </span>
                                            <span className="text-xs text-gray-500">Vol: {sp.volume}%</span>
                                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400 flex items-center gap-1">
                                                {sp.type === 'BLUETOOTH' ? (
                                                    <Bluetooth className="w-3 h-3" />
                                                ) : (
                                                    <Wifi className="w-3 h-3" />
                                                )}
                                                {sp.type === 'BLUETOOTH' ? sp.bluetoothId || 'BLE' : sp.ipAddress || 'No IP'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Quick Actions ───────────────────────────── */}
                                <div className="p-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingSpeaker({
                                                ...sp,
                                                lat: lat || '',
                                                lng: lng || '',
                                                ipAddress: sp.ipAddress || '',
                                                bluetoothId: sp.bluetoothId || '',
                                                name: sp.name || '',
                                                zoneId: sp.zoneId || '',
                                                language: sp.language || 'EN',
                                                languages: sp.languages || ['EN', 'HI', 'PA'],
                                                status: sp.status || 'OFFLINE',
                                                volume: sp.volume ?? 70,
                                                type: sp.type || 'IP',
                                            });
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition text-sm"
                                    >
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => playTestTone(sp._id, 0.3)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm"
                                    >
                                        <Play className="w-3 h-3" /> Test
                                    </button>
                                    <button
                                        onClick={() =>
                                            setAnnounceModal({
                                                open: true,
                                                speakerId: sp._id,
                                                message: '',
                                                language: sp.language || 'EN',
                                                languages: sp.languages || ['EN', 'HI', 'PA'],
                                            })
                                        }
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm"
                                    >
                                        <Send className="w-3 h-3" /> Announce
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(sp._id, sp.status)}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition text-sm ${sp.status === 'ONLINE'
                                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                            }`}
                                    >
                                        {sp.status === 'ONLINE' ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                                        {sp.status === 'ONLINE' ? 'Offline' : 'Online'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(sp._id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>

                                {/* ─── Expand / Collapse ───────────────────────── */}
                                <button
                                    onClick={() => setExpandedSpeaker(expandedSpeaker === sp._id ? null : sp._id)}
                                    className="w-full px-4 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 transition flex items-center justify-center gap-1 border-t border-gray-700"
                                >
                                    {expandedSpeaker === sp._id ? (
                                        <>
                                            <ChevronUp className="w-3 h-3" /> Hide Details
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-3 h-3" /> Show Details
                                        </>
                                    )}
                                </button>

                                {/* ─── Expanded Details ────────────────────────── */}
                                {expandedSpeaker === sp._id && (
                                    <div className="px-4 pb-4 pt-2 border-t border-gray-700 text-sm text-gray-300 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-gray-500">Type:</span> {sp.type || 'IP'}
                                            </div>
                                            <div>
                                                <span className="text-gray-500">IP Address:</span> {sp.ipAddress || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Bluetooth ID:</span> {sp.bluetoothId || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Last Heartbeat:</span>{' '}
                                                {sp.lastHeartbeat ? new Date(sp.lastHeartbeat).toLocaleString() : 'Never'}
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Last Announcement:</span>{' '}
                                                {sp.lastAnnouncementAt ? new Date(sp.lastAnnouncementAt).toLocaleString() : 'Never'}
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Location:</span>{' '}
                                                {sp.location?.coordinates
                                                    ? `${sp.location.coordinates[1]?.toFixed(4)}, ${sp.location.coordinates[0]?.toFixed(4)}`
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <button
                                                onClick={() => navigate(`/speakers/${sp._id}/history`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                                            >
                                                <Clock className="w-3 h-3" /> History
                                            </button>
                                            <button
                                                onClick={() => navigate(`/speakers/${sp._id}/performance`)}
                                                className="flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                                            >
                                                <BarChart3 className="w-3 h-3" /> Performance
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Add/Edit Speaker Modal ───────────────────────────── */}
            {(showAddModal || editingSpeaker) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">
                                {editingSpeaker ? 'Edit Speaker' : 'Add Speaker'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingSpeaker(null);
                                }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={editingSpeaker ? handleUpdateSpeaker : handleAddSpeaker} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingSpeaker ? editingSpeaker.name || '' : newSpeaker.name}
                                    onChange={(e) =>
                                        editingSpeaker
                                            ? setEditingSpeaker({ ...editingSpeaker, name: e.target.value })
                                            : setNewSpeaker({ ...newSpeaker, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Central Speaker"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Zone</label>
                                <select
                                    value={editingSpeaker ? editingSpeaker.zoneId || '' : newSpeaker.zoneId}
                                    onChange={(e) =>
                                        editingSpeaker
                                            ? setEditingSpeaker({ ...editingSpeaker, zoneId: e.target.value })
                                            : setNewSpeaker({ ...newSpeaker, zoneId: e.target.value })
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

                            {/* ─── Speaker Type ───────────────────────────────── */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingSpeaker) {
                                                setEditingSpeaker({ ...editingSpeaker, type: 'IP' });
                                            } else {
                                                setNewSpeaker({ ...newSpeaker, type: 'IP' });
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${(editingSpeaker ? editingSpeaker.type : newSpeaker.type) === 'IP'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <Wifi className="w-4 h-4" /> IP Speaker
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (editingSpeaker) {
                                                setEditingSpeaker({ ...editingSpeaker, type: 'BLUETOOTH' });
                                            } else {
                                                setNewSpeaker({ ...newSpeaker, type: 'BLUETOOTH' });
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${(editingSpeaker ? editingSpeaker.type : newSpeaker.type) === 'BLUETOOTH'
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <Bluetooth className="w-4 h-4" /> Bluetooth
                                    </button>
                                </div>
                            </div>

                            {/* ─── IP Address ─────────────────────────────────── */}
                            {(editingSpeaker ? editingSpeaker.type : newSpeaker.type) === 'IP' && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        value={editingSpeaker ? editingSpeaker.ipAddress || '' : newSpeaker.ipAddress}
                                        onChange={(e) =>
                                            editingSpeaker
                                                ? setEditingSpeaker({ ...editingSpeaker, ipAddress: e.target.value })
                                                : setNewSpeaker({ ...newSpeaker, ipAddress: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="192.168.1.100"
                                        required={!editingSpeaker || (editingSpeaker.type === 'IP')}
                                    />
                                </div>
                            )}

                            {/* ─── Bluetooth ID ───────────────────────────────── */}
                            {(editingSpeaker ? editingSpeaker.type : newSpeaker.type) === 'BLUETOOTH' && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Bluetooth ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editingSpeaker ? editingSpeaker.bluetoothId || '' : newSpeaker.bluetoothId}
                                            onChange={(e) =>
                                                editingSpeaker
                                                    ? setEditingSpeaker({ ...editingSpeaker, bluetoothId: e.target.value })
                                                    : setNewSpeaker({ ...newSpeaker, bluetoothId: e.target.value })
                                            }
                                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Device ID or MAC"
                                            required={!editingSpeaker || (editingSpeaker.type === 'BLUETOOTH')}
                                        />
                                        <button
                                            type="button"
                                            onClick={connectBluetooth}
                                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                        >
                                            <Bluetooth className="w-4 h-4" /> Connect
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ─── Location ───────────────────────────────────── */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Latitude</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={editingSpeaker ? editingSpeaker.lat || '' : newSpeaker.lat}
                                            onChange={(e) =>
                                                editingSpeaker
                                                    ? setEditingSpeaker({ ...editingSpeaker, lat: e.target.value })
                                                    : setNewSpeaker({ ...newSpeaker, lat: e.target.value })
                                            }
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="28.6139"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDetectLocation}
                                            disabled={isLocating}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary/70 transition disabled:opacity-50"
                                            title="Detect current location"
                                        >
                                            {isLocating ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Crosshair className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    {!editingSpeaker && !newSpeaker.lat && (
                                        <p className="text-xs text-yellow-400 mt-1">Click the crosshair to detect your location.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editingSpeaker ? editingSpeaker.lng || '' : newSpeaker.lng}
                                        onChange={(e) =>
                                            editingSpeaker
                                                ? setEditingSpeaker({ ...editingSpeaker, lng: e.target.value })
                                                : setNewSpeaker({ ...newSpeaker, lng: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="77.2090"
                                        required
                                    />
                                </div>
                            </div>

                            {/* ─── Language ───────────────────────────────────── */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Primary Language</label>
                                    <select
                                        value={editingSpeaker ? editingSpeaker.language || 'EN' : newSpeaker.language}
                                        onChange={(e) =>
                                            editingSpeaker
                                                ? setEditingSpeaker({ ...editingSpeaker, language: e.target.value })
                                                : setNewSpeaker({ ...newSpeaker, language: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {LANGUAGE_OPTIONS.map((lang) => (
                                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Volume (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editingSpeaker ? editingSpeaker.volume ?? 70 : newSpeaker.volume}
                                        onChange={(e) =>
                                            editingSpeaker
                                                ? setEditingSpeaker({ ...editingSpeaker, volume: parseInt(e.target.value) || 70 })
                                                : setNewSpeaker({ ...newSpeaker, volume: parseInt(e.target.value) || 70 })
                                        }
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* ─── Supported Languages ───────────────────────── */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Supported Languages</label>
                                <div className="flex flex-wrap gap-2">
                                    {LANGUAGE_OPTIONS.map((lang) => {
                                        const currentLangs = editingSpeaker
                                            ? editingSpeaker.languages || ['EN', 'HI', 'PA']
                                            : newSpeaker.languages || ['EN', 'HI', 'PA'];
                                        const isChecked = currentLangs.includes(lang.code);
                                        const toggleLang = () => {
                                            let newLangs;
                                            if (isChecked) {
                                                newLangs = currentLangs.filter((l) => l !== lang.code);
                                                if (newLangs.length === 0) newLangs = ['EN'];
                                            } else {
                                                newLangs = [...currentLangs, lang.code];
                                            }
                                            if (editingSpeaker) {
                                                setEditingSpeaker({ ...editingSpeaker, languages: newLangs });
                                            } else {
                                                setNewSpeaker({ ...newSpeaker, languages: newLangs });
                                            }
                                        };
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={toggleLang}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${isChecked
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {lang.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Select which languages this speaker supports.</p>
                            </div>

                            {!editingSpeaker && (
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Status</label>
                                    <select
                                        value={newSpeaker.status}
                                        onChange={(e) => setNewSpeaker({ ...newSpeaker, status: e.target.value })}
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
                                        setEditingSpeaker(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || zones.length === 0}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving ? 'Saving...' : editingSpeaker ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ────────────────────────────────── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-sm w-full border border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                        <p className="text-gray-400 mt-2">
                            Are you sure you want to delete this speaker? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteSpeaker(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Individual Announcement Modal ─────────────────────── */}
            {announceModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Send Announcement</h2>
                            <button
                                onClick={() =>
                                    setAnnounceModal({ open: false, speakerId: null, message: '', language: 'EN', languages: ['EN'] })
                                }
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSendAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Message</label>
                                <textarea
                                    value={announceModal.message}
                                    onChange={(e) => setAnnounceModal({ ...announceModal, message: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Enter your announcement..."
                                    maxLength="500"
                                    required
                                />
                                <p className="text-gray-500 text-xs mt-1 text-right">{announceModal.message.length}/500</p>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Languages</label>
                                <div className="flex flex-wrap gap-2">
                                    {LANGUAGE_OPTIONS.map((lang) => {
                                        const isChecked = (announceModal.languages || ['EN']).includes(lang.code);
                                        const toggleLang = () => {
                                            let newLangs = announceModal.languages || ['EN'];
                                            if (isChecked) {
                                                newLangs = newLangs.filter((l) => l !== lang.code);
                                                if (newLangs.length === 0) newLangs = ['EN'];
                                            } else {
                                                newLangs = [...newLangs, lang.code];
                                            }
                                            setAnnounceModal({ ...announceModal, languages: newLangs });
                                        };
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={toggleLang}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${isChecked
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {lang.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAnnounceModal({ open: false, speakerId: null, message: '', language: 'EN', languages: ['EN'] })
                                    }
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!announceModal.message.trim()}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" /> Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Bulk Announcement Modal ───────────────────────────── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Bulk Announcement</h2>
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleBulkAnnounce} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Languages</label>
                                <div className="flex flex-wrap gap-2">
                                    {LANGUAGE_OPTIONS.map((lang) => {
                                        const isChecked = bulkLanguages.includes(lang.code);
                                        const toggleLang = () => {
                                            let newLangs;
                                            if (isChecked) {
                                                newLangs = bulkLanguages.filter((l) => l !== lang.code);
                                                if (newLangs.length === 0) newLangs = ['EN'];
                                            } else {
                                                newLangs = [...bulkLanguages, lang.code];
                                            }
                                            setBulkLanguages(newLangs);
                                        };
                                        return (
                                            <button
                                                key={lang.code}
                                                type="button"
                                                onClick={toggleLang}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${isChecked
                                                    ? 'bg-primary text-white'
                                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {lang.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Message</label>
                                <textarea
                                    value={bulkMessage}
                                    onChange={(e) => setBulkMessage(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Enter message for all selected speakers..."
                                    maxLength="500"
                                    required
                                />
                                <p className="text-gray-500 text-xs mt-1 text-right">{bulkMessage.length}/500</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-gray-400 text-sm">Select Speakers</label>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        {selectedSpeakerIds.length === speakers.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto bg-gray-800/50 rounded-lg border border-gray-700 p-3 space-y-2">
                                    {speakers.map((sp) => (
                                        <label
                                            key={sp._id}
                                            className="flex items-center gap-3 text-sm cursor-pointer hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSpeakerIds.includes(sp._id)}
                                                onChange={() => toggleSelect(sp._id)}
                                                className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary"
                                            />
                                            <span className="text-white">{sp.name}</span>
                                            <span className="text-gray-400 text-xs ml-auto">
                                                {sp.status === 'ONLINE' ? '🟢' : '🔴'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedSpeakerIds.length} of {speakers.length} selected
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSendingBulk || selectedSpeakerIds.length === 0 || !bulkMessage.trim()}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSendingBulk ? 'Sending...' : (
                                        <>
                                            <Send className="w-4 h-4" /> Send
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Speakers;