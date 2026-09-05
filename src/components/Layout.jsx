import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarLink = ({ to, icon: Icon, children, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`
        }
    >
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{children}</span>
    </NavLink>
);

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

    return (
        <div className="min-h-screen bg-bg text-white flex">
            {/* ========== SIDEBAR ========== */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 transition-all duration-300 flex flex-col fixed md:relative h-screen z-40`}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
                    <Link
                        to="/"
                        className={`flex items-center gap-2 font-bold text-primary text-xl ${!sidebarOpen && 'justify-center w-full'
                            }`}
                    >
                        <span>🏙️</span>
                        {sidebarOpen && <span>Clean&Green</span>}
                    </Link>
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-1 rounded-lg hover:bg-gray-800"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <SidebarLink to="/" icon={LayoutDashboard}>
                        Dashboard
                    </SidebarLink>
                    <SidebarLink to="/live" icon={Camera}>
                        Live Monitoring
                    </SidebarLink>
                    <SidebarLink to="/cameras" icon={Camera}>
                        Cameras
                    </SidebarLink>
                    <SidebarLink to="/zones" icon={MapPin}>
                        Zones
                    </SidebarLink>
                    <SidebarLink to="/dustbins" icon={Trash2}>
                        Dustbins
                    </SidebarLink>
                    <SidebarLink to="/speakers" icon={Mic}>
                        Speakers
                    </SidebarLink>
                    <SidebarLink to="/events" icon={AlertTriangle}>
                        Events
                    </SidebarLink>
                    <SidebarLink to="/tasks" icon={ClipboardList}>
                        Tasks
                    </SidebarLink>
                    <SidebarLink to="/analytics" icon={BarChart3}>
                        Analytics
                    </SidebarLink>
                    <SidebarLink to="/users" icon={Users}>
                        Users
                    </SidebarLink>
                    <SidebarLink to="/settings" icon={Settings}>
                        Settings
                    </SidebarLink>
                </nav>

                {/* Logout at bottom */}
                <div className="border-t border-gray-800 p-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* ========== MAIN CONTENT ========== */}
            <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
                {/* Top Navbar */}
                <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 h-16 flex items-center px-4">
                    <div className="flex items-center gap-3 w-full">
                        {/* Mobile hamburger */}
                        <button
                            onClick={toggleSidebar}
                            className="md:hidden p-1 rounded-lg hover:bg-gray-800"
                        >
                            <Menu className="w-6 h-6 text-gray-400" />
                        </button>

                        <div className="flex-1" />

                        {/* Right side: Notifications + User dropdown */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {user?.name?.[0] || 'U'}
                                    </div>
                                    <span className="hidden sm:inline text-sm text-gray-300">
                                        {user?.name || 'User'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-50">
                                        <Link
                                            to="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Link>
                                        <Link
                                            to="/settings"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </Link>
                                        <hr className="border-gray-700 my-1" />
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors w-full text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                )}
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