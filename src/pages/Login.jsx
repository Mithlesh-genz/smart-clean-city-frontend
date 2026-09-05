// frontend/src/pages/auth/Login.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, Leaf, Cpu, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      // Axios puts data in response.data
      const data = response.data;
      const token = data.token;
      const user = data.user;

      if (!token) {
        throw new Error('Login succeeded but no token received');
      }

      login(token, user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      // Handle network errors (CORS, offline, etc.)
      if (err.message === 'Network Error' || !err.response) {
        setError('Unable to connect to the server. Please check your internet connection.');
        toast.error('Network error – please try again later.');
      } else {
        const msg = err.response?.data?.message || err.message || 'Login failed';
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      {/* Left panel – unchanged */}
      <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-primary/20 via-primary/5 to-bg flex-col justify-between p-12 border-r border-gray-800/50 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🏙️</span>
            <span className="text-2xl font-bold text-white">Clean<span className="text-primary">&amp;Green</span></span>
          </div>
          <p className="text-gray-400 text-sm tracking-wider">SmartCity.CleanFuture.</p>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">Welcome Back</h1>
            <p className="text-gray-400 mt-2">Sign in to your Clean &amp; Green account</p>
          </div>
          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Leaf className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Cleaner Environment</p>
                <p className="text-xs text-gray-400">Together for a sustainable future</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Cpu className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Smart Solutions</p>
                <p className="text-xs text-gray-400">AI &amp; IoT powered clean city systems</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Better Tomorrow</p>
                <p className="text-xs text-gray-400">Building healthier communities</p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-gray-500">© 2026 Clean & Green. All rights reserved.</div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-0">
        <div className="w-full max-w-md">
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800/60 p-8 shadow-2xl shadow-black/30">
            <div className="md:hidden text-center mb-6">
              <div className="text-3xl mb-1">🏙️</div>
              <h2 className="text-xl font-bold text-white">Clean<span className="text-primary">&amp;Green</span></h2>
              <p className="text-gray-400 text-xs">SmartCity.CleanFuture.</p>
            </div>
            <h2 className="text-2xl font-bold text-white text-center md:text-left">Welcome Back</h2>
            <p className="text-gray-400 text-sm text-center md:text-left mb-6">Sign in to your Clean &amp; Green account</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In
                  </>
                )}
              </button>
            </form>

            <p className="text-gray-400 text-sm mt-6 text-center">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">Create one</Link>
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 md:hidden">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                <Leaf className="w-4 h-4 text-primary" />
                <span className="text-xs text-gray-300">Cleaner Environment – sustainable future</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs text-gray-300">Smart Solutions – AI &amp; IoT powered</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-gray-300">Better Tomorrow – healthier communities</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;