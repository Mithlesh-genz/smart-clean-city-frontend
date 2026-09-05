// frontend/src/pages/errors/NotFound.jsx
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  Search, 
  AlertTriangle,
  MapPin,
  Compass
} from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <div className="text-8xl md:text-9xl font-bold text-gray-800 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-primary/10 rounded-full flex items-center justify-center">
              <Compass className="w-16 h-16 md:w-20 md:h-20 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-white transition-all duration-200 group"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            <span>Go Back</span>
          </button>

          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-xl text-primary transition-all duration-200 group"
          >
            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-500 mb-4">
            Here are some helpful links:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              to="/dustbins"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Dustbins
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              to="/speakers"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Speakers
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              to="/cameras"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cameras
            </Link>
            <span className="text-gray-700">•</span>
            <Link
              to="/settings"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Help Message */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-800">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>
              Need help?{' '}
              <Link
                to="/help"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                Contact support
              </Link>
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-600 mt-8">
          &copy; {new Date().getFullYear()} Clean & Green. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default NotFound;