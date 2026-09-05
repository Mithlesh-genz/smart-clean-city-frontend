import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token, socket will not connect');
      return;
    }

    // Only create socket if it doesn't exist or token changed
    if (!socketRef.current) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('🔌 Socket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
        // If the server kicked us due to auth, don't auto-reconnect
        if (reason === 'io server disconnect' || reason === 'transport error') {
          // Manual reconnect later
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.warn('Max reconnect attempts reached. Stopping.');
          socketRef.current?.disconnect();
        }
      });

      // Event handlers
      socketRef.current.on('event:new', (data) => {
        setEvents((prev) => [data, ...prev].slice(0, 50));
      });

      socketRef.current.on('event:status', (data) => {
        setEvents((prev) =>
          prev.map((e) =>
            e.event?._id === data.eventId
              ? { ...e, event: { ...e.event, status: data.newStatus } }
              : e
          )
        );
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, []); // Empty dependency array – only run once

  const subscribe = (type, ids) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('subscribe', { type, ids });
    }
  };

  const unsubscribe = (type, ids) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('unsubscribe', { type, ids });
    }
  };

  const joinRooms = (rooms) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-rooms', rooms);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    events,
    subscribe,
    unsubscribe,
    joinRooms,
  };
};

export default useSocket;