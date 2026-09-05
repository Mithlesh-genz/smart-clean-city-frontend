import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Create socket only once
        if (!socketRef.current) {
            socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                autoConnect: true,
            });

            socketRef.current.on('connect', () => {
                console.log('🔌 Socket connected');
                setIsConnected(true);
            });

            socketRef.current.on('disconnect', (reason) => {
                console.log('🔌 Socket disconnected:', reason);
                setIsConnected(false);
            });

            socketRef.current.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
            });

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

        // Do NOT disconnect on unmount – keep socket alive
    }, []); // ✅ runs only once

    // Expose methods
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

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    };

    return (
        <SocketContext.Provider
            value={{
                socket: socketRef.current,
                isConnected,
                events,
                subscribe,
                unsubscribe,
                joinRooms,
                disconnect,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};