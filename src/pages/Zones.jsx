// frontend/src/pages/Zones.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import {
    Search,
    Plus,
    RefreshCw,
    Eye,
    Edit,
    Trash2,
    MapPin,
    Camera,
    Trash2 as Dustbin,
    Speaker,
    Activity,
    Layers,
    ChevronDown,
    ChevronUp,
    Navigation,
    Crosshair,
    Wifi,
} from 'lucide-react';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom user location marker (blue dot)
const userIcon = L.divIcon({
    html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.6);"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// ─── Helper: Generate random color ──────────────────────────────
const getRandomColor = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
};

const Zones = () => {
    const socket = useSocket();
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zonePositions, setZonePositions] = useState({});
    const [selectedZone, setSelectedZone] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All Types');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [zoneDetail, setZoneDetail] = useState(null);
    const [showMap, setShowMap] = useState(true);
    const [newZone, setNewZone] = useState({
        name: '',
        type: 'public',
        lat: '',
        lng: '',
        radius: 100,
    });
    const [editZone, setEditZone] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ─── Geolocation state for map ──────────────────────────────────
    const [userLocation, setUserLocation] = useState(null);
    const [userAccuracy, setUserAccuracy] = useState(null);
    const [watchId, setWatchId] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const mapRef = useRef(null);

    // ─── Extract zones ──────────────────────────────────────────────
    const extractZones = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.zones && Array.isArray(data.zones)) return data.zones;
        if (data.data && Array.isArray(data.data)) return data.data;
        if (data.success && data.data && Array.isArray(data.data)) return data.data;
        if (data.data?.zones && Array.isArray(data.data.zones)) return data.data.zones;
        for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) return data[key];
        }
        return [];
    };

    // ─── Fetch zones ────────────────────────────────────────────────
    const fetchZones = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/zones');
            const zoneArray = extractZones(response);
            setZones(zoneArray);
        } catch (err) {
            console.error('Failed to fetch zones:', err);
            setError('Could not load zones. Please try again.');
            toast.error('Failed to load zones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchZones();
    }, []);

    // ─── WebSocket live updates ────────────────────────────────────
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') {
            console.warn('Socket not available – live updates disabled');
            return;
        }
        const handleLocationUpdate = (data) => {
            setZonePositions((prev) => ({
                ...prev,
                [data.zoneId]: { lat: data.lat, lng: data.lng, timestamp: data.timestamp },
            }));
        };
        socket.on('zone:location', handleLocationUpdate);
        return () => socket.off('zone:location', handleLocationUpdate);
    }, [socket]);

    // ─── Geolocation: start watching (map) ──────────────────────────
    const startWatchingLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        setLocationError(null);
        const id = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                setUserAccuracy(accuracy);
                setIsLocating(false);
                if (mapRef.current && !userLocation) {
                    mapRef.current.setView([latitude, longitude], 14);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                let msg = 'Failed to get your location.';
                if (err.code === 1) msg = 'Location access denied. Please allow location permissions.';
                else if (err.code === 2) msg = 'Location unavailable.';
                else if (err.code === 3) msg = 'Location request timed out.';
                setLocationError(msg);
                toast.error(msg);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
        setWatchId(id);
    };

    const stopWatchingLocation = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            setWatchId(null);
            setUserLocation(null);
            setUserAccuracy(null);
            setLocationError(null);
            toast('Location tracking stopped');
        }
    };

    const toggleLocationTracking = () => {
        if (watchId !== null) {
            stopWatchingLocation();
        } else {
            startWatchingLocation();
        }
    };

    const centerOnUser = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.setView([userLocation.lat, userLocation.lng], 16);
            toast.success('Centered on your location');
        } else {
            toast.error('No location available. Click "Find Me" first.');
        }
    };

    // ─── Cleanup geolocation on unmount ────────────────────────────
    useEffect(() => {
        return () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [watchId]);

    // ─── Get current location for form (one‑time) ──────────────────
    const getCurrentLocation = (callback) => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported by your browser.');
            if (callback) callback(null);
            return;
        }
        toast.loading('Fetching your location...', { id: 'location-fetch' });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (callback) {
                    callback({ lat: latitude.toFixed(6), lng: longitude.toFixed(6) });
                }
                toast.success('📍 Location fetched', { id: 'location-fetch' });
            },
            (err) => {
                console.error('Geolocation error:', err);
                let msg = 'Could not fetch location. Please enter manually.';
                if (err.code === 1) msg = 'Location access denied. Please allow permissions.';
                else if (err.code === 2) msg = 'Location unavailable.';
                else if (err.code === 3) msg = 'Location request timed out.';
                toast.error(msg, { id: 'location-fetch' });
                if (callback) callback(null);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ─── Open Create Modal and auto-fetch location ────────────────
    const openCreateModal = () => {
        setShowCreateModal(true);
        setNewZone({ name: '', type: 'public', lat: '', lng: '', radius: 100 });
        // Auto-fetch location
        getCurrentLocation((coords) => {
            if (coords) {
                setNewZone((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
            }
        });
    };

    // ─── Manual detect location inside modal ──────────────────────
    const handleDetectLocation = () => {
        getCurrentLocation((coords) => {
            if (coords) {
                setNewZone((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
            }
        });
    };

    // ─── Detail modal ──────────────────────────────────────────────
    const fetchZoneDetail = async (zoneId) => {
        setLoadingDetail(true);
        try {
            const response = await api.get(`/zones/${zoneId}`);
            setZoneDetail(response);
            setShowDetailModal(true);
        } catch (err) {
            toast.error('Failed to load zone details');
            console.error(err);
        } finally {
            setLoadingDetail(false);
        }
    };

    // ─── CRUD handlers ─────────────────────────────────────────────
    const handleCreateZone = async (e) => {
        e.preventDefault();
        if (!newZone.name.trim()) {
            toast.error('Please enter a zone name');
            return;
        }
        if (!newZone.lat || !newZone.lng) {
            toast.error('Please enter latitude and longitude');
            return;
        }
        setIsCreating(true);
        try {
            const typeMap = { public: 'PUBLIC', private: 'PRIVATE', restricted: 'RESTRICTED' };
            const payload = {
                name: newZone.name.trim(),
                type: typeMap[newZone.type] || 'PUBLIC',
                location: { type: 'Point', coordinates: [parseFloat(newZone.lng), parseFloat(newZone.lat)] },
                radius: parseInt(newZone.radius) || 100,
            };
            await api.post('/zones', payload);
            toast.success(`Zone "${newZone.name}" created`);
            setShowCreateModal(false);
            setNewZone({ name: '', type: 'public', lat: '', lng: '', radius: 100 });
            await fetchZones();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create zone');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditZone = async (e) => {
        e.preventDefault();
        if (!editZone.name.trim()) {
            toast.error('Please enter a zone name');
            return;
        }
        if (!editZone.lat || !editZone.lng) {
            toast.error('Please enter latitude and longitude');
            return;
        }
        setIsUpdating(true);
        try {
            const typeMap = { public: 'PUBLIC', private: 'PRIVATE', restricted: 'RESTRICTED' };
            const payload = {
                name: editZone.name.trim(),
                type: typeMap[editZone.type] || 'PUBLIC',
                location: { type: 'Point', coordinates: [parseFloat(editZone.lng), parseFloat(editZone.lat)] },
                radius: parseInt(editZone.radius) || 100,
            };
            await api.put(`/zones/${editZone._id}`, payload);
            toast.success(`Zone "${editZone.name}" updated`);
            setShowEditModal(false);
            setEditZone(null);
            await fetchZones();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update zone');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteZone = async () => {
        if (!selectedZone) return;
        setIsDeleting(true);
        try {
            await api.delete(`/zones/${selectedZone._id}`);
            toast.success(`Zone "${selectedZone.name}" deleted`);
            setShowDeleteModal(false);
            setSelectedZone(null);
            await fetchZones();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to delete zone';
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (zone) => {
        const coords = zone.location?.coordinates || [0, 0];
        setEditZone({
            ...zone,
            lat: coords[1] || zone.lat || 0,
            lng: coords[0] || zone.lng || 0,
            type: zone.type?.toLowerCase() || 'public',
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (zone) => {
        setSelectedZone(zone);
        setShowDeleteModal(true);
    };

    // ─── Computed stats ────────────────────────────────────────────
    const totalZones = zones.length;
    const activeZones = zones.filter((z) => zonePositions[z._id] !== undefined).length;
    const zoneTypes = [...new Set(zones.map((z) => z.type))];

    // ─── Filtering ─────────────────────────────────────────────────
    const filteredZones = zones.filter((zone) => {
        const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All Types' || zone.type === filterType;
        return matchesSearch && matchesType;
    });

    // ─── Map center ────────────────────────────────────────────────
    const defaultCenter =
        zones.length > 0 && zones[0].location?.coordinates
            ? [zones[0].location.coordinates[1], zones[0].location.coordinates[0]]
            : [20.5937, 78.9629];

    // ─── Loading / Error ───────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 p-4">
                Error: {error}
                <button onClick={fetchZones} className="ml-4 text-sm hover:underline">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Zone Overview</h1>
                    <p className="text-gray-400 text-sm">Manage and monitor different zones of your smart city</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
                    >
                        <Plus className="w-4 h-4" /> Add Zone
                    </button>
                    <button
                        onClick={fetchZones}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowMap(!showMap)}
                        className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                        title="Toggle Map"
                    >
                        {showMap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ─── Stats Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Layers className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Zones</p>
                            <p className="text-2xl font-bold text-white">{totalZones}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Active Zones</p>
                            <p className="text-2xl font-bold text-white">{activeZones}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <Dustbin className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Dustbins</p>
                            <p className="text-2xl font-bold text-white">
                                {zones.reduce((sum, z) => sum + (z.stats?.dustbinCount || 0), 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Camera className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Cameras</p>
                            <p className="text-2xl font-bold text-white">
                                {zones.reduce((sum, z) => sum + (z.stats?.cameraCount || 0), 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Search & Filter ─────────────────────────────────────── */}
            <div className="flex flex-wrap gap-4 items-center mb-6">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search zones, locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="All Types">All Types</option>
                        {zoneTypes.map((type) => (
                            <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-400">
                    Showing {filteredZones.length} of {totalZones} zones
                </div>
            </div>

            {/* ─── Map (Collapsible) ───────────────────────────────────── */}
            {showMap && (
                <div className="mb-6 rounded-xl overflow-hidden border border-gray-700 h-[400px] relative" style={{ zIndex: 1 }}>
                    <MapContainer
                        center={defaultCenter}
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                        ref={mapRef}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {zones.map((zone) => {
                            const coords = zone.location?.coordinates;
                            const lat = coords ? coords[1] : zone.lat;
                            const lng = coords ? coords[0] : zone.lng;
                            const livePos = zonePositions[zone._id];
                            const finalLat = livePos?.lat ?? lat;
                            const finalLng = livePos?.lng ?? lng;
                            if (!finalLat || !finalLng) return null;
                            const color = getRandomColor(zone._id);
                            return (
                                <React.Fragment key={zone._id}>
                                    <Circle
                                        center={[finalLat, finalLng]}
                                        radius={zone.radius || 100}
                                        pathOptions={{
                                            color: color,
                                            fillColor: color,
                                            fillOpacity: 0.25,
                                            weight: 2,
                                            dashArray: '5,5',
                                        }}
                                    />
                                    <Marker position={[finalLat, finalLng]}>
                                        <Popup>
                                            <div className="text-sm">
                                                <h3 className="font-bold">{zone.name}</h3>
                                                <p className="text-gray-500 capitalize">{zone.type}</p>
                                                {zone.camera ? (
                                                    <p className="text-xs text-emerald-400">
                                                        🟢 Camera available
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-400">
                                                        🔴 No camera
                                                    </p>
                                                )}
                                                {livePos && (
                                                    <p className="text-xs text-emerald-400 mt-1">
                                                        🟢 Live updated {new Date(livePos.timestamp).toLocaleTimeString()}
                                                    </p>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                            );
                        })}
                        {userLocation && (
                            <>
                                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                    <Popup>Your current location</Popup>
                                </Marker>
                                {userAccuracy && (
                                    <Circle
                                        center={[userLocation.lat, userLocation.lng]}
                                        radius={userAccuracy}
                                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                                    />
                                )}
                            </>
                        )}
                    </MapContainer>

                    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                        <button
                            onClick={toggleLocationTracking}
                            className={`p-2 rounded-lg shadow-lg transition ${watchId !== null
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                }`}
                            title={watchId !== null ? 'Stop tracking' : 'Find my location'}
                        >
                            <Crosshair className="w-5 h-5" />
                        </button>
                        {userLocation && (
                            <button
                                onClick={centerOnUser}
                                className="p-2 bg-green-500/20 text-green-400 rounded-lg shadow-lg hover:bg-green-500/30 transition"
                                title="Center on my location"
                            >
                                <Navigation className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    {isLocating && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm z-10">
                            🔍 Locating...
                        </div>
                    )}
                    {locationError && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm z-10">
                            ⚠️ {locationError}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Zone Cards ──────────────────────────────────────────── */}
            {filteredZones.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>No zones found matching your criteria.</p>
                    {searchTerm || filterType !== 'All Types' ? (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterType('All Types');
                            }}
                            className="mt-2 text-primary hover:underline"
                        >
                            Clear filters
                        </button>
                    ) : (
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition"
                        >
                            Add your first zone
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredZones.map((zone) => {
                        const coords = zone.location?.coordinates;
                        const lat = coords ? coords[1] : zone.lat;
                        const lng = coords ? coords[0] : zone.lng;
                        const livePos = zonePositions[zone._id];
                        const stats = zone.stats || {};
                        return (
                            <div
                                key={zone._id}
                                className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:border-primary/30 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-white font-semibold">{zone.name}</h3>
                                        <p className="text-gray-400 text-sm capitalize">{zone.type}</p>
                                    </div>
                                    {livePos && (
                                        <span className="flex items-center gap-1 text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            LIVE
                                        </span>
                                    )}
                                </div>

                                {lat && lng && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        📍 {lat.toFixed(4)}, {lng.toFixed(4)}
                                    </p>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-gray-400">
                                    <div>🗑️ Dustbins: <span className="text-white">{stats.dustbinCount || 0}</span></div>
                                    <div>📷 Cameras: <span className="text-white">{stats.cameraCount || 0}</span></div>
                                    <div>🔊 Speakers: <span className="text-white">{stats.speakerCount || 0}</span></div>
                                    <div>📊 Events (7d): <span className="text-white">{stats.eventCountLast7Days || 0}</span></div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => fetchZoneDetail(zone._id)}
                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
                                    >
                                        <Eye className="w-3 h-3" /> Details
                                    </button>
                                    <button
                                        onClick={() => openEditModal(zone)}
                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition"
                                    >
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(zone)}
                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Create Modal ────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Add Zone</h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewZone({ name: '', type: 'public', lat: '', lng: '', radius: 100 });
                                }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <span className="text-gray-400 text-xl">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreateZone} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Central Park"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Type</label>
                                <select
                                    value={newZone.type}
                                    onChange={(e) => setNewZone({ ...newZone, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                    <option value="restricted">Restricted</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Latitude</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={newZone.lat}
                                            onChange={(e) => setNewZone({ ...newZone, lat: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="28.6139"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDetectLocation}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary/70 transition"
                                            title="Detect current location"
                                        >
                                            <Crosshair className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {!newZone.lat && (
                                        <p className="text-xs text-yellow-400 mt-1">Click the crosshair icon to detect your location.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={newZone.lng}
                                        onChange={(e) => setNewZone({ ...newZone, lng: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="77.2090"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Radius (meters)</label>
                                <input
                                    type="number"
                                    value={newZone.radius}
                                    onChange={(e) => setNewZone({ ...newZone, radius: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    min="10"
                                    max="1000"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewZone({ name: '', type: 'public', lat: '', lng: '', radius: 100 });
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {isCreating ? 'Creating...' : 'Create Zone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Edit Modal ──────────────────────────────────────────── */}
            {showEditModal && editZone && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">Edit Zone</h2>
                            <button
                                onClick={() => { setShowEditModal(false); setEditZone(null); }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <span className="text-gray-400 text-xl">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleEditZone} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editZone.name}
                                    onChange={(e) => setEditZone({ ...editZone, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Type</label>
                                <select
                                    value={editZone.type}
                                    onChange={(e) => setEditZone({ ...editZone, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="public">Public</option>
                                    <option value="private">Private</option>
                                    <option value="restricted">Restricted</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editZone.lat}
                                        onChange={(e) => setEditZone({ ...editZone, lat: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editZone.lng}
                                        onChange={(e) => setEditZone({ ...editZone, lng: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Radius (meters)</label>
                                <input
                                    type="number"
                                    value={editZone.radius}
                                    onChange={(e) => setEditZone({ ...editZone, radius: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    min="10"
                                    max="1000"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditZone(null); }}
                                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition disabled:opacity-50"
                                >
                                    {isUpdating ? 'Updating...' : 'Update Zone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Delete Modal ────────────────────────────────────────── */}
            {showDeleteModal && selectedZone && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-white mb-3">Delete Zone</h2>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to delete <span className="text-red-400 font-semibold">{selectedZone.name}</span>?
                            This action cannot be undone. If devices are attached, deletion will be blocked.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setSelectedZone(null); }}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteZone}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Detail Modal ────────────────────────────────────────── */}
            {showDetailModal && zoneDetail && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
                    <div className="bg-gray-900 rounded-xl max-w-3xl w-full border border-gray-700 p-6 my-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-white">{zoneDetail.name} – Details</h2>
                            <button
                                onClick={() => { setShowDetailModal(false); setZoneDetail(null); }}
                                className="p-1 hover:bg-gray-800 rounded-lg"
                            >
                                <span className="text-gray-400 text-xl">&times;</span>
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-400">Name:</span> {zoneDetail.name}</div>
                                    <div><span className="text-gray-400">Type:</span> {zoneDetail.type}</div>
                                    <div><span className="text-gray-400">Status:</span> {zoneDetail.status}</div>
                                    <div><span className="text-gray-400">Radius:</span> {zoneDetail.radius} m</div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">📊 Statistics</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-800/50 p-3 rounded-lg">
                                        <div>🗑️ Dustbins: <span className="text-white">{zoneDetail.stats?.dustbinCount || 0}</span></div>
                                        <div>📷 Cameras: <span className="text-white">{zoneDetail.stats?.cameraCount || 0}</span></div>
                                        <div>🔊 Speakers: <span className="text-white">{zoneDetail.stats?.speakerCount || 0}</span></div>
                                        <div>📊 Events: <span className="text-white">{zoneDetail.stats?.eventCount || 0}</span></div>
                                        <div>🧹 Avg Fill: <span className="text-white">{zoneDetail.stats?.avgFillLevel || 0}%</span></div>
                                        <div>⭐ Cleanliness: <span className="text-white">{zoneDetail.cleanlinessScore || 0}</span></div>
                                    </div>
                                </div>

                                {zoneDetail.stats?.recentEvents?.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2">🕒 Recent Events</h4>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {zoneDetail.stats.recentEvents.map((evt) => (
                                                <div key={evt._id} className="text-xs bg-gray-800/50 p-2 rounded flex justify-between">
                                                    <span>{evt.eventId}</span>
                                                    <span className="text-gray-400">{new Date(evt.detectedAt).toLocaleString()}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${evt.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                                        evt.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-blue-500/20 text-blue-400'
                                                        }`}>{evt.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => { setShowDetailModal(false); setZoneDetail(null); }}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Zones;