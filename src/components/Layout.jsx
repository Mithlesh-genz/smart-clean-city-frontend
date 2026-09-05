import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X,
    LayoutDashboard,
    Camera,
    MapPin,
    Trash2,
    Mic,
    AlertTriangle,
    ClipboardList,
    BarChart3,
    Users,
    Settings,
    LogOut,
    Bell,
    User,
    ChevronDown,
    Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Sidebar Link ────────────────────────────────────────────────
const SidebarLink = ({ to, icon: Icon, children, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                ? 'bg-primary/10 text-primary shadow-lg shadow-primary/5'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
            }`
        }
    >
        {({ isActive }) => (
            <>
                {isActive && (
                    <motion.span
                        layoutId="active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                )}
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{children}</span>
            </>
        )}
    </NavLink>
);

// ─── Main Layout ──────────────────────────────────────────────────
const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // Notification count (mock – replace with real data later)
    const notificationCount = 3;

    return (
        <div className="min-h-screen bg-bg text-white flex">
            {/* ─── Sidebar ──────────────────────────────────────────── */}
            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 256 : 80 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="bg-gray-900/80 backdrop-blur-xl border-r border-gray-800/60 flex flex-col fixed md:relative h-screen z-40 shadow-2xl shadow-black/20"
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800/60">
                    <Link
                        to="/"
                        className={`flex items-center gap-2 font-bold text-primary text-xl ${!sidebarOpen && 'justify-center w-full'
                            }`}
                    >
                        <span className="text-2xl">🏙️</span>
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                            transition={{ duration: 0.2 }}
                            className="whitespace-nowrap overflow-hidden"
                        >
                            Clean&Green
                        </motion.span>
                    </Link>
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-1 rounded-lg hover:bg-gray-800/60 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
                    <SidebarLink to="/" icon={LayoutDashboard}>Dashboard</SidebarLink>
                    <SidebarLink to="/live" icon={Camera}>Live Monitoring</SidebarLink>
                    <SidebarLink to="/cameras" icon={Camera}>Cameras</SidebarLink>
                    <SidebarLink to="/zones" icon={MapPin}>Zones</SidebarLink>
                    <SidebarLink to="/dustbins" icon={Trash2}>Dustbins</SidebarLink>
                    <SidebarLink to="/speakers" icon={Mic}>Speakers</SidebarLink>
                    <SidebarLink to="/events" icon={AlertTriangle}>Events</SidebarLink>
                    <SidebarLink to="/tasks" icon={ClipboardList}>Tasks</SidebarLink>
                    <SidebarLink to="/analytics" icon={BarChart3}>Analytics</SidebarLink>
                    <SidebarLink to="/users" icon={Users}>Users</SidebarLink>
                    <SidebarLink to="/settings" icon={Settings}>Settings</SidebarLink>
                </nav>

                {/* Logout */}
                <div className="border-t border-gray-800/60 p-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <motion.span
                            initial={false}
                            animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm font-medium overflow-hidden whitespace-nowrap"
                        >
                            Logout
                        </motion.span>
                    </button>
                </div>
            </motion.aside>

            {/* Mobile overlay when sidebar open */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={toggleSidebar}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* ─── Main Content ──────────────────────────────────────── */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'
                    }`}
            >
                {/* Navbar */}
                <header className="sticky top-0 z-30 bg-gray-900/70 backdrop-blur-xl border-b border-gray-800/60 h-16 flex items-center px-4 shadow-sm">
                    <div className="flex items-center gap-3 w-full">
                        {/* Mobile hamburger */}
                        <button
                            onClick={toggleSidebar}
                            className="md:hidden p-1.5 rounded-lg hover:bg-gray-800/60 transition-colors"
                        >
                            <Menu className="w-6 h-6 text-gray-400" />
                        </button>

                        {/* Optional Search (can be enabled) */}
                        {/* <div className="hidden md:flex items-center bg-gray-800/50 rounded-lg px-3 py-1.5 border border-gray-700/50 focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm text-white px-2 py-0.5 w-48"
              />
            </div> */}

                        <div className="flex-1" />

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                                {notificationCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                                        {notificationCount > 9 ? '9+' : notificationCount}
                                    </span>
                                )}
                            </button>

                            {/* User dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800/60 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-lg shadow-primary/10">
                                        {user?.name?.[0] || user?.email?.[0] || 'U'}
                                    </div>
                                    <span className="hidden sm:inline text-sm text-gray-300 font-medium">
                                        {user?.name || 'User'}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 mt-2 w-52 bg-gray-800/90 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl shadow-black/30 py-1 z-50 overflow-hidden"
                                        >
                                            <div className="px-4 py-3 border-b border-gray-700/50">
                                                <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                                                <p className="text-xs text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
                                            </div>
                                            <Link
                                                to="/profile"
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Link>
                                            <hr className="border-gray-700/50 my-1" />
                                            <button
                                                onClick={() => {
                                                    setDropdownOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
};

export default Layout;