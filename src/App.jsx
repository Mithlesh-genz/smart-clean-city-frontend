// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import AppRoutes from './AppRoutes';

// ==============================================
// 1. ErrorBoundary (inline)
// ==============================================
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-500 min-h-screen bg-bg flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-sm text-red-400">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==============================================
// 2. ToastContainer (placeholder)
// ==============================================
const ToastContainer = () => null;

// ==============================================
// 3. ModalContainer (placeholder)
// ==============================================
const ModalContainer = () => null;

// ==============================================
// 4. LoadingSpinner (inline)
// ==============================================
const LoadingSpinner = ({ fullPage = false }) => {
  const spinner = <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />;
  if (fullPage) return <div className="flex items-center justify-center min-h-screen bg-bg">{spinner}</div>;
  return spinner;
};

// ==============================================
// 5. App Component
// ==============================================
function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <LoadingSpinner />
        <p className="text-gray-400 mt-4 ml-3">Loading...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <SocketProvider>
              <AppRoutes />
              <ToastContainer />
              <ModalContainer />
            </SocketProvider>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;