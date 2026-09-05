// frontend/src/context/SocketContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            const socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling'],
            });
            socketInstance.on('connect', () => setIsConnected(true));
            socketInstance.on('disconnect', () => setIsConnected(false));
            setSocket(socketInstance);
            return () => socketInstance.disconnect();
        }
    }, []);

    const emit = (event, data) => {
        if (socket && isConnected) socket.emit(event, data);
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, emit }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;