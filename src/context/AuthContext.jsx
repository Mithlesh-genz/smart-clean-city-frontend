// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Restore user from localStorage on initial load (optimistic)
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
    const validationAttempted = useRef(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            setIsAuthenticated(false);
            setUser(null);
            return;
        }

        // Set token in axios headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const validateToken = async (retries = 3) => {
            try {
                const res = await api.get('/auth/me', { timeout: 10000 }); // 10 seconds
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
                setIsAuthenticated(true);
                setLoading(false);
                validationAttempted.current = true;
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    // Token is definitely invalid – logout
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    delete api.defaults.headers.common['Authorization'];
                    setUser(null);
                    setIsAuthenticated(false);
                    setLoading(false);
                    validationAttempted.current = true;
                    toast.error('Session expired. Please login again.');
                } else if (retries > 0) {
                    // Network/timeout – retry
                    const delay = (4 - retries) * 1000; // 1s, 2s, 3s
                    console.warn(`Auth validation failed (${retries} retries left), retrying in ${delay}ms`);
                    setTimeout(() => validateToken(retries - 1), delay);
                } else {
                    // All retries exhausted – keep user logged in optimistically
                    console.warn('Auth validation failed after all retries – keeping user logged in.');
                    setLoading(false);
                    validationAttempted.current = true;
                }
            }
        };

        validateToken();
    }, []);

    // Inside AuthContext.jsx

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            const data = res.data || res;
            const token = data.token;
            const user = data.user;
            if (!token) throw new Error('No token received');
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            setIsAuthenticated(true);
            toast.success('Logged in successfully');
            return true;
        } catch (err) {
            throw err; // <--- rethrow so Login can handle it
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
        toast.success('Logged out');
    };

    const register = async (name, email, password, role = 'user') => {
        try {
            await api.post('/auth/register', { name, email, password, role });
            toast.success('Registration successful, please login');
            return true;
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, isAuthenticated, login, logout, register }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);