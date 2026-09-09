import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu, X, LayoutDashboard, Camera, MapPin, Trash2, Mic,
  AlertTriangle, ClipboardList, BarChart3, Users, Settings,
  LogOut, Bell, User, ChevronDown
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span>{children}</span>
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* ─── Sidebar (fixed) ─────────────────────────────────────── */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'
          } bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 flex flex-col sticky top-0 h-screen overflow-y-auto z-40 transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <Link to="/" className={`flex items-center gap-2 font-bold text-primary text-xl ${!sidebarOpen && 'justify-center w-full'}`}>
            <span><img src="/logo.png" alt="Logo" className="w-8 h-8" /></span>
            {sidebarOpen && <span>Clean&Green</span>}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1 rounded hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
        <div className="border-t border-gray-800 p-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main content ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header (sticky) */}
        <header className="sticky top-0 z-30 bg-gray-900/70 backdrop-blur-xl border-b border-gray-800 h-16 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded hover:bg-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded hover:bg-gray-800"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 rounded hover:bg-gray-800"
              >
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {user?.name?.[0] || 'U'}
                </span>
                <span className="hidden sm:inline text-sm">{user?.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-50">
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700">
                    Profile
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700">
                    Settings
                  </Link>
                  <hr className="border-gray-700" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 w-full text-left"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content – scrollable */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;