import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket as useSocketContext } from '../context/SocketContext';

/**
 * useSocket – Re‑export from SocketContext for convenience
 * This hook provides real‑time socket functionality.
 * @returns {object} { isConnected, events, subscribe, unsubscribe, ... }
 */
export const useSocket = () => {
    const context = useSocketContext();
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

// If you prefer a standalone implementation without context,
// you could use the code below, but the context approach is cleaner
// and already provided in SocketContext.jsx. We'll just re‑export it.