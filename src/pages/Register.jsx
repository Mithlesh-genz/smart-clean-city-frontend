import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Eye,
    EyeOff,
    User,
    Mail,
    Lock,
    CheckCircle,
    AlertCircle,
    Shield,
    Leaf,
    Users,
    Chrome,
    Apple,
    Monitor,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null);
    const navigate = useNavigate();
    const nameInputRef = useRef(null);

    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Full name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (formData.confirmPassword !== formData.password) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { name, email, password } = formData;
            await api.post('/auth/register', { name, email, password });
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(message);
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        setSocialLoading(provider);
        // Simulate social login – in production, redirect to OAuth
        setTimeout(() => {
            toast.info(`${provider} login coming soon!`);
            setSocialLoading(null);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-bg">
            {/* ========== LEFT PANEL – Form ========== */}
            <div className="flex-1 flex items-center justify-center px-4 py-12 lg:py-0">
                <div className="w-full max-w-md">
                    <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-800/60 p-8 shadow-2xl shadow-black/30">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="text-3xl mb-1">🏙️</div>
                            <h2 className="text-2xl font-bold text-white">Create Account</h2>
                            <p className="text-gray-400 text-sm mt-1">Join Clean &amp; Green Smart City</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border ${errors.name ? 'border-red-500' : 'border-gray-700'
                                            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors`}
                                    />
                                </div>
                                {errors.name && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border ${errors.email ? 'border-red-500' : 'border-gray-700'
                                            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors`}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Min 6 characters"
                                        className={`w-full pl-10 pr-12 py-2.5 bg-gray-800/50 border ${errors.password ? 'border-red-500' : 'border-gray-700'
                                            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.password}
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm your password"
                                        className={`w-full pl-10 pr-12 py-2.5 bg-gray-800/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                                            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        Create Account
                                    </>
                                )}
                            </button>
                        </form>

                        {/* OR Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700/60"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-gray-900/60 text-gray-400">OR</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Google')}
                                disabled={!!socialLoading}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                            >
                                {socialLoading === 'Google' ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                ) : (
                                    <Chrome className="w-4 h-4" />
                                )}
                                <span className="text-xs hidden sm:inline">Google</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Apple')}
                                disabled={!!socialLoading}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                            >
                                {socialLoading === 'Apple' ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                ) : (
                                    <Apple className="w-4 h-4" />
                                )}
                                <span className="text-xs hidden sm:inline">Apple</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Microsoft')}
                                disabled={!!socialLoading}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-colors text-gray-300 hover:text-white disabled:opacity-50"
                            >
                                {socialLoading === 'Microsoft' ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                ) : (
                                    <Monitor className="w-4 h-4" />
                                )}
                                <span className="text-xs hidden sm:inline">Microsoft</span>
                            </button>
                        </div>

                        {/* Footer */}
                        <p className="text-gray-400 text-sm mt-6 text-center">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* ========== RIGHT PANEL – Features ========== */}
            <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary/20 via-primary/5 to-bg flex-col justify-between p-12 border-l border-gray-800/50 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl">🏙️</span>
                        <span className="text-2xl font-bold text-white">
                            Clean<span className="text-primary">&amp;Green</span>
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm tracking-wider">SmartCity.CleanFuture.</p>
                </div>

                <div className="relative z-10 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Join the Movement</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Be part of a smarter, cleaner future
                        </p>
                    </div>

                    {/* Feature Cards */}
                    <div className="space-y-4">
                        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 hover:border-primary/30 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:bg-primary/30 transition-colors">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Secure &amp; Safe</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Your data is protected with top security
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 hover:border-primary/30 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500/30 transition-colors">
                                    <Leaf className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Eco Friendly</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Together we build a cleaner tomorrow
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-xl border border-white/10 hover:border-primary/30 transition-colors group">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Smart Community</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Join a community that cares
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-gray-500">
                    © 2026 Clean & Green. All rights reserved.
                </div>
            </div>

            {/* ========== MOBILE FEATURES (visible on small screens) ========== */}
            <div className="lg:hidden px-4 pb-8 -mt-4">
                <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-xs text-gray-300">Secure & Safe – Your data is protected</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                        <Leaf className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-300">Eco Friendly – Together for a cleaner tomorrow</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-300">Smart Community – Join a community that cares</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;