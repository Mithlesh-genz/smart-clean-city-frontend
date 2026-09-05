import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      console.log('Login response:', res);

      // Token extraction – adjust if needed
      const token = res.data?.token || res.token;
      if (!token) {
        throw new Error('Login succeeded but no token received');
      }

      localStorage.setItem('token', token);

      // Try React Router navigation first
      try {
        navigate('/dashboard');
        console.log('navigate called, current path:', window.location.pathname);
      } catch (navErr) {
        console.warn('React Router navigate failed, using fallback:', navErr);
        window.location.href = '/dashboard'; // fallback
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl w-96">
        <h2 className="text-2xl font-bold text-white mb-6">Login</h2>
        {error && <div className="bg-red-500/20 text-red-500 p-2 rounded mb-4 text-sm">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white mb-4"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p className="text-gray-400 text-sm mt-4 text-center">
          Don't have an account? <a href="/register" className="text-primary">Register</a>
        </p>
      </form>
    </div>
  );
};

export default Login;