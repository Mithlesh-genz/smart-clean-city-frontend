import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            setLoading(false);
            setIsAuthenticated(false);
            return;
        }

        // Set auth header for verification
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verify token with backend
        api
            .get('/auth/me')
            .then((res) => {
                const userData = res.data?.data || res.data;
                setUser(userData);
                setIsAuthenticated(true);
                // Store user in localStorage for quick restore
                localStorage.setItem('user', JSON.stringify(userData));
            })
            .catch((err) => {
                // Token is invalid – clear everything
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                delete api.defaults.headers.common['Authorization'];
                setIsAuthenticated(false);
                setUser(null);
                console.warn('Session expired or invalid token');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
        window.dispatchEvent(new Event('logout'));
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);