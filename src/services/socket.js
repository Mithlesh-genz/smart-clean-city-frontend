// socket.js
import { io } from 'socket.io-client';
import store from './store'; // Assuming you have a Redux store
import { 
  updateDeviceStatus,
  addAlert,
  updateMetric,
  updateDustbinFillLevel,
  updateSpeakerStatus,
  addNotification
} from './actions'; // Your action creators

// ==============================================
// Socket Configuration
// ==============================================

const SOCKET_CONFIG = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:5000',
  options: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20000,
    autoConnect: false,
    path: '/socket.io',
    query: {},
    withCredentials: true,
  },
};

// ==============================================
// Socket Class
// ==============================================

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.eventHandlers = new Map();
    this.pendingEvents = [];
    this.authToken = null;
    this.userId = null;
    this.heartbeatInterval = null;
    this.lastPing = null;
    this.lastPong = null;
    this.latency = 0;
    
    // Event queues for offline mode
    this.offlineEventQueue = [];
    this.isOffline = false;
    this.processingQueue = false;
  }

  // ==============================================
  // Connection Methods
  // ==============================================

  // Initialize socket connection
  initialize(token = null, userId = null) {
    if (this.socket) {
      this.disconnect();
    }

    this.authToken = token || localStorage.getItem('authToken');
    this.userId = userId || localStorage.getItem('userId');

    if (!this.authToken) {
      console.warn('Socket: No auth token provided');
      return this;
    }

    // Set up socket options with auth
    const options = {
      ...SOCKET_CONFIG.options,
      query: {
        token: this.authToken,
        userId: this.userId,
        ...SOCKET_CONFIG.options.query,
      },
    };

    this.socket = io(SOCKET_CONFIG.url, options);
    this.setupEventListeners();
    
    return this;
  }

  // Connect to socket
  connect() {
    if (!this.socket) {
      console.warn('Socket: Not initialized. Call initialize() first.');
      return this;
    }

    if (this.isConnected) {
      return this;
    }

    this.isConnecting = true;
    this.socket.connect();
    
    return this;
  }

  // Disconnect socket
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.lastPing = null;
    this.lastPong = null;
    this.latency = 0;

    return this;
  }

  // ==============================================
  // Event Listeners Setup
  // ==============================================

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('reconnect', this.handleReconnect.bind(this));
    this.socket.on('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.socket.on('reconnect_error', this.handleReconnectError.bind(this));
    this.socket.on('reconnect_failed', this.handleReconnectFailed.bind(this));
    this.socket.on('error', this.handleError.bind(this));
    this.socket.on('ping', this.handlePing.bind(this));
    this.socket.on('pong', this.handlePong.bind(this));

    // Heartbeat
    this.socket.on('heartbeat', this.handleHeartbeat.bind(this));

    // Application events
    this.socket.on('device:update', this.handleDeviceUpdate.bind(this));
    this.socket.on('device:status', this.handleDeviceStatus.bind(this));
    this.socket.on('alert:new', this.handleNewAlert.bind(this));
    this.socket.on('alert:acknowledged', this.handleAlertAcknowledged.bind(this));
    this.socket.on('metric:update', this.handleMetricUpdate.bind(this));
    this.socket.on('dustbin:update', this.handleDustbinUpdate.bind(this));
    this.socket.on('dustbin:fillLevel', this.handleDustbinFillLevel.bind(this));
    this.socket.on('dustbin:collection', this.handleDustbinCollection.bind(this));
    this.socket.on('speaker:update', this.handleSpeakerUpdate.bind(this));
    this.socket.on('speaker:status', this.handleSpeakerStatus.bind(this));
    this.socket.on('speaker:audio', this.handleSpeakerAudio.bind(this));
    this.socket.on('notification:new', this.handleNewNotification.bind(this));
    this.socket.on('notification:read', this.handleNotificationRead.bind(this));
    this.socket.on('user:update', this.handleUserUpdate.bind(this));
    this.socket.on('user:status', this.handleUserStatus.bind(this));
    this.socket.on('system:announcement', this.handleSystemAnnouncement.bind(this));
    this.socket.on('system:maintenance', this.handleSystemMaintenance.bind(this));

    // Custom event handlers
    this.socket.onAny(this.handleAnyEvent.bind(this));
  }

  // ==============================================
  // Connection Handlers
  // ==============================================

  handleConnect() {
    console.log('Socket: Connected successfully');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Process pending events
    this.processPendingEvents();

    // Process offline queue
    this.processOfflineQueue();

    // Emit connection event
    this.emit('connection:established', {
      userId: this.userId,
      timestamp: new Date().toISOString(),
    });

    // Trigger connection event
    this.triggerEvent('connected', {
      socketId: this.socket.id,
      userId: this.userId,
    });
  }

  handleConnectError(error) {
    console.error('Socket: Connection error:', error);
    this.isConnecting = false;
    
    // Trigger error event
    this.triggerEvent('error', {
      type: 'connection',
      error: error.message,
    });
  }

  handleDisconnect(reason) {
    console.log('Socket: Disconnected. Reason:', reason);
    this.isConnected = false;
    this.isConnecting = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Trigger disconnect event
    this.triggerEvent('disconnected', {
      reason,
      timestamp: new Date().toISOString(),
    });

    // If server disconnected, try to reconnect
    if (reason === 'io server disconnect') {
      this.connect();
    }
  }

  handleReconnect(attemptNumber) {
    console.log('Socket: Reconnected after', attemptNumber, 'attempts');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Trigger reconnect event
    this.triggerEvent('reconnected', {
      attempts: attemptNumber,
      timestamp: new Date().toISOString(),
    });
  }

  handleReconnectAttempt(attemptNumber) {
    console.log('Socket: Reconnection attempt', attemptNumber);
    this.reconnectAttempts = attemptNumber;
    
    // Trigger reconnecting event
    this.triggerEvent('reconnecting', {
      attempt: attemptNumber,
      maxAttempts: this.maxReconnectAttempts,
    });
  }

  handleReconnectError(error) {
    console.error('Socket: Reconnection error:', error);
    
    // Trigger error event
    this.triggerEvent('error', {
      type: 'reconnection',
      error: error.message,
      attempt: this.reconnectAttempts,
    });
  }

  handleReconnectFailed() {
    console.error('Socket: Reconnection failed after maximum attempts');
    this.isConnecting = false;
    
    // Trigger connection failed event
    this.triggerEvent('connection_failed', {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    });
  }

  handleError(error) {
    console.error('Socket: Error:', error);
    
    // Trigger error event
    this.triggerEvent('error', {
      type: 'socket',
      error: error.message || error,
    });
  }

  handlePing() {
    this.lastPing = Date.now();
  }

  handlePong(latency) {
    this.lastPong = Date.now();
    this.latency = latency || (this.lastPong - this.lastPing);
    
    // Update latency metric
    this.triggerEvent('latency_updated', {
      latency: this.latency,
      timestamp: new Date().toISOString(),
    });
  }

  handleHeartbeat(data) {
    // Respond to server heartbeat
    this.emit('heartbeat:response', {
      timestamp: new Date().toISOString(),
      clientTime: Date.now(),
      serverTime: data.timestamp,
    });
  }

  // ==============================================
  // Heartbeat Management
  // ==============================================

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.emit('heartbeat:ping', {
          timestamp: new Date().toISOString(),
          clientTime: Date.now(),
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // ==============================================
  // Event Handlers
  // ==============================================

  handleDeviceUpdate(data) {
    console.log('Socket: Device update:', data);
    this.triggerEvent('device:update', data);
    
    // Dispatch to Redux if available
    if (store && store.dispatch) {
      store.dispatch(updateDeviceStatus(data));
    }
  }

  handleDeviceStatus(data) {
    console.log('Socket: Device status:', data);
    this.triggerEvent('device:status', data);
  }

  handleNewAlert(data) {
    console.log('Socket: New alert:', data);
    this.triggerEvent('alert:new', data);
    
    // Show browser notification for critical alerts
    if (data.priority === 'critical' && 'Notification' in window) {
      this.showNotification(data);
    }
    
    // Dispatch to Redux
    if (store && store.dispatch) {
      store.dispatch(addAlert(data));
    }
  }

  handleAlertAcknowledged(data) {
    console.log('Socket: Alert acknowledged:', data);
    this.triggerEvent('alert:acknowledged', data);
  }

  handleMetricUpdate(data) {
    console.log('Socket: Metric update:', data);
    this.triggerEvent('metric:update', data);
    
    if (store && store.dispatch) {
      store.dispatch(updateMetric(data));
    }
  }

  handleDustbinUpdate(data) {
    console.log('Socket: Dustbin update:', data);
    this.triggerEvent('dustbin:update', data);
  }

  handleDustbinFillLevel(data) {
    console.log('Socket: Dustbin fill level:', data);
    this.triggerEvent('dustbin:fillLevel', data);
    
    if (store && store.dispatch) {
      store.dispatch(updateDustbinFillLevel(data.id, data.fillLevel));
    }
  }

  handleDustbinCollection(data) {
    console.log('Socket: Dustbin collection:', data);
    this.triggerEvent('dustbin:collection', data);
  }

  handleSpeakerUpdate(data) {
    console.log('Socket: Speaker update:', data);
    this.triggerEvent('speaker:update', data);
  }

  handleSpeakerStatus(data) {
    console.log('Socket: Speaker status:', data);
    this.triggerEvent('speaker:status', data);
    
    if (store && store.dispatch) {
      store.dispatch(updateSpeakerStatus(data));
    }
  }

  handleSpeakerAudio(data) {
    console.log('Socket: Speaker audio update:', data);
    this.triggerEvent('speaker:audio', data);
  }

  handleNewNotification(data) {
    console.log('Socket: New notification:', data);
    this.triggerEvent('notification:new', data);
    
    // Show browser notification
    if ('Notification' in window) {
      this.showNotification(data);
    }
    
    if (store && store.dispatch) {
      store.dispatch(addNotification(data));
    }
  }

  handleNotificationRead(data) {
    console.log('Socket: Notification read:', data);
    this.triggerEvent('notification:read', data);
  }

  handleUserUpdate(data) {
    console.log('Socket: User update:', data);
    this.triggerEvent('user:update', data);
  }

  handleUserStatus(data) {
    console.log('Socket: User status:', data);
    this.triggerEvent('user:status', data);
  }

  handleSystemAnnouncement(data) {
    console.log('Socket: System announcement:', data);
    this.triggerEvent('system:announcement', data);
    
    // Show system announcement
    if (data.important) {
      this.showNotification({
        title: 'System Announcement',
        body: data.message,
        priority: data.priority || 'info',
      });
    }
  }

  handleSystemMaintenance(data) {
    console.log('Socket: System maintenance:', data);
    this.triggerEvent('system:maintenance', data);
    
    // Show maintenance notification
    if (data.startTime) {
      const start = new Date(data.startTime);
      const message = data.message || `System maintenance scheduled for ${start.toLocaleString()}`;
      this.showNotification({
        title: 'System Maintenance',
        body: message,
        priority: 'warning',
      });
    }
  }

  handleAnyEvent(event, ...args) {
    // Log all events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Socket: Event:', event, args);
    }
  }

  // ==============================================
  // Notification Helper
  // ==============================================

  showNotification(data) {
    try {
      const title = data.title || data.message || 'New Notification';
      const options = {
        body: data.message || data.body || '',
        icon: data.icon || '/favicon.ico',
        tag: data.id || Math.random().toString(),
        requireInteraction: data.priority === 'critical' || data.priority === 'warning',
        silent: data.silent || false,
      };

      // Request permission if not granted
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, options);
          }
        });
      }
    } catch (error) {
      console.error('Socket: Notification error:', error);
    }
  }

  // ==============================================
  // Event Management
  // ==============================================

  // Register event handler
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
    return this;
  }

  // Remove event handler
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.eventHandlers.delete(event);
      }
    }
    return this;
  }

  // Trigger event
  triggerEvent(event, data) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Socket: Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ==============================================
  // Emit Methods
  // ==============================================

  // Generic emit
  emit(event, data, callback = null) {
    if (this.isConnected && this.socket) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      // Queue event for when connection is restored
      this.pendingEvents.push({ event, data, callback });
      
      // Store in offline queue if offline
      if (this.isOffline) {
        this.offlineEventQueue.push({ event, data, callback });
      }
      
      console.warn('Socket: Not connected. Event queued:', event);
    }
    return this;
  }

  // Process pending events
  processPendingEvents() {
    if (this.pendingEvents.length === 0) return;
    
    console.log(`Socket: Processing ${this.pendingEvents.length} pending events`);
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    
    events.forEach(({ event, data, callback }) => {
      this.emit(event, data, callback);
    });
  }

  // Process offline queue
  async processOfflineQueue() {
    if (this.processingQueue || this.offlineEventQueue.length === 0) return;
    
    this.processingQueue = true;
    console.log(`Socket: Processing ${this.offlineEventQueue.length} offline events`);
    
    while (this.offlineEventQueue.length > 0) {
      const event = this.offlineEventQueue.shift();
      try {
        await new Promise((resolve, reject) => {
          this.emit(event.event, event.data, (response) => {
            if (response && response.error) {
              reject(response.error);
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        console.error('Socket: Error processing offline event:', error);
        // Re-queue event
        this.offlineEventQueue.push(event);
        break;
      }
    }
    
    this.processingQueue = false;
  }

  // ==============================================
  // Specific Emit Methods
  // ==============================================

  // Authentication
  authenticate(token, userId) {
    this.authToken = token;
    this.userId = userId;
    
    if (this.isConnected) {
      this.emit('auth:login', { token, userId });
    }
    return this;
  }

  // Device control
  controlDevice(deviceId, command, params = {}) {
    this.emit('device:control', {
      deviceId,
      command,
      params,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  // Dustbin operations
  scheduleCollection(dustbinId, scheduleData) {
    this.emit('dustbin:schedule', {
      dustbinId,
      ...scheduleData,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  // Speaker control
  controlSpeaker(speakerId, command, params = {}) {
    this.emit('speaker:control', {
      speakerId,
      command,
      params,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  // Join rooms
  joinRoom(room, data = {}) {
    this.emit('room:join', { room, ...data });
    return this;
  }

  leaveRoom(room, data = {}) {
    this.emit('room:leave', { room, ...data });
    return this;
  }

  // ==============================================
  // Utility Methods
  // ==============================================

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      socketId: this.socket?.id || null,
      latency: this.latency,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id || null;
  }

  // Check if connected
  isConnectedToServer() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Set offline mode
  setOfflineMode(isOffline) {
    this.isOffline = isOffline;
    if (!isOffline) {
      this.processOfflineQueue();
    }
    return this;
  }

  // Clear all event handlers
  clearEventHandlers() {
    this.eventHandlers.clear();
    return this;
  }

  // ==============================================
  // Cleanup
  // ==============================================

  destroy() {
    this.clearEventHandlers();
    this.disconnect();
    this.offlineEventQueue = [];
    this.pendingEvents = [];
    this.isOffline = false;
    this.processingQueue = false;
    
    return this;
  }
}

// ==============================================
// Singleton Instance
// ==============================================

let socketInstance = null;

export const getSocketInstance = () => {
  if (!socketInstance) {
    socketInstance = new SocketService();
  }
  return socketInstance;
};

export const initializeSocket = (token = null, userId = null) => {
  const instance = getSocketInstance();
  return instance.initialize(token, userId);
};

export const connectSocket = () => {
  const instance = getSocketInstance();
  return instance.connect();
};

export const disconnectSocket = () => {
  const instance = getSocketInstance();
  return instance.disconnect();
};

// ==============================================
// React Hook
// ==============================================

import { useEffect, useState } from 'react';

export const useSocket = (events = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [latency, setLatency] = useState(0);
  const socket = getSocketInstance();

  useEffect(() => {
    // Connection event handlers
    const onConnected = (data) => {
      setIsConnected(true);
      setSocketId(data.socketId || socket.getSocketId());
    };

    const onDisconnected = () => {
      setIsConnected(false);
    };

    const onReconnected = (data) => {
      setIsConnected(true);
      setSocketId(data.socketId || socket.getSocketId());
    };

    const onLatencyUpdated = (data) => {
      setLatency(data.latency);
    };

    // Register handlers
    socket.on('connected', onConnected);
    socket.on('disconnected', onDisconnected);
    socket.on('reconnected', onReconnected);
    socket.on('latency_updated', onLatencyUpdated);

    // Register custom event handlers
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Connect if not already connected
    if (!socket.isConnected) {
      socket.connect();
    } else {
      setIsConnected(true);
      setSocketId(socket.getSocketId());
    }

    // Cleanup
    return () => {
      socket.off('connected', onConnected);
      socket.off('disconnected', onDisconnected);
      socket.off('reconnected', onReconnected);
      socket.off('latency_updated', onLatencyUpdated);
      
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, events]);

  return {
    socket,
    isConnected,
    socketId,
    latency,
    emit: socket.emit.bind(socket),
    on: socket.on.bind(socket),
    off: socket.off.bind(socket),
  };
};

// ==============================================
// Export default
// ==============================================

export default {
  SocketService,
  getSocketInstance,
  initializeSocket,
  connectSocket,
  disconnectSocket,
  useSocket,
};