// ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// ==============================================
// Theme Configuration
// ==============================================

// Color palettes
const colors = {
  // Primary colors
  primary: {
    light: '#42A5F5',
    main: '#1976D2',
    dark: '#0D47A1',
    contrast: '#FFFFFF',
  },
  secondary: {
    light: '#FFB74D',
    main: '#FF9800',
    dark: '#E65100',
    contrast: '#000000',
  },
  // Semantic colors
  success: {
    light: '#81C784',
    main: '#4CAF50',
    dark: '#2E7D32',
    contrast: '#FFFFFF',
  },
  error: {
    light: '#EF5350',
    main: '#F44336',
    dark: '#C62828',
    contrast: '#FFFFFF',
  },
  warning: {
    light: '#FFD54F',
    main: '#FFC107',
    dark: '#F57F17',
    contrast: '#000000',
  },
  info: {
    light: '#64B5F6',
    main: '#2196F3',
    dark: '#1565C0',
    contrast: '#FFFFFF',
  },
  // Neutral colors
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Light theme
const lightTheme = {
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    grey: colors.grey,
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
      disabled: '#9E9E9E',
    },
    divider: '#E0E0E0',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.3 },
    h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0,0,0,0.05)',
    '0px 1px 3px rgba(0,0,0,0.08)',
    '0px 2px 6px rgba(0,0,0,0.08)',
    '0px 4px 12px rgba(0,0,0,0.1)',
    '0px 6px 20px rgba(0,0,0,0.1)',
    '0px 8px 24px rgba(0,0,0,0.12)',
    '0px 12px 32px rgba(0,0,0,0.12)',
    '0px 16px 48px rgba(0,0,0,0.15)',
    '0px 20px 56px rgba(0,0,0,0.15)',
    '0px 24px 64px rgba(0,0,0,0.18)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
};

// Dark theme
const darkTheme = {
  palette: {
    mode: 'dark',
    primary: {
      light: '#64B5F6',
      main: '#42A5F5',
      dark: '#1976D2',
      contrast: '#FFFFFF',
    },
    secondary: {
      light: '#FFB74D',
      main: '#FF9800',
      dark: '#F57C00',
      contrast: '#000000',
    },
    success: {
      light: '#81C784',
      main: '#4CAF50',
      dark: '#388E3C',
      contrast: '#FFFFFF',
    },
    error: {
      light: '#EF5350',
      main: '#F44336',
      dark: '#D32F2F',
      contrast: '#FFFFFF',
    },
    warning: {
      light: '#FFD54F',
      main: '#FFC107',
      dark: '#F9A825',
      contrast: '#000000',
    },
    info: {
      light: '#64B5F6',
      main: '#2196F3',
      dark: '#1976D2',
      contrast: '#FFFFFF',
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    background: {
      default: '#0A0A1A',
      paper: '#1A1A2E',
    },
    text: {
      primary: '#E8EDF2',
      secondary: '#B0B8C4',
      disabled: '#6B7280',
    },
    divider: '#2D2D44',
    action: {
      active: 'rgba(255, 255, 255, 0.54)',
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
      disabled: 'rgba(255, 255, 255, 0.26)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.2 },
    h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.3 },
    h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0,0,0,0.3)',
    '0px 1px 3px rgba(0,0,0,0.4)',
    '0px 2px 6px rgba(0,0,0,0.4)',
    '0px 4px 12px rgba(0,0,0,0.5)',
    '0px 6px 20px rgba(0,0,0,0.5)',
    '0px 8px 24px rgba(0,0,0,0.6)',
    '0px 12px 32px rgba(0,0,0,0.6)',
    '0px 16px 48px rgba(0,0,0,0.7)',
    '0px 20px 56px rgba(0,0,0,0.7)',
    '0px 24px 64px rgba(0,0,0,0.8)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 1px 3px rgba(0,0,0,0.3)',
          background: '#1A1A2E',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          background: '#1A1A2E',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#1A1A2E',
          borderBottom: '1px solid #2D2D44',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#0A0A1A',
          borderRight: '1px solid #2D2D44',
        },
      },
    },
  },
};

// Custom theme options
const customThemeOptions = {
  // Additional spacing
  spacing: 8,
  // Custom breakpoints
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  // Custom z-index values
  zIndex: {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
  // Custom transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

// ==============================================
// Theme Context
// ==============================================

const ThemeContext = createContext(null);

// ==============================================
// Custom Hook
// ==============================================

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ==============================================
// Theme Provider Component
// ==============================================

export const ThemeProvider = ({ 
  children,
  defaultTheme = 'light',
  enableSystem = true,
  storageKey = 'theme-preference',
  customColors = {},
}) => {
  // State
  const [mode, setMode] = useState(defaultTheme);
  const [systemTheme, setSystemTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customTheme, setCustomTheme] = useState(customColors);
  const [fontSize, setFontSize] = useState('medium');
  const [density, setDensity] = useState('comfortable');

  // Detect system preference
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem]);

  // Load saved preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Check localStorage
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          setMode(parsed.mode || defaultTheme);
          if (parsed.fontSize) setFontSize(parsed.fontSize);
          if (parsed.density) setDensity(parsed.density);
          if (parsed.customColors) setCustomTheme(parsed.customColors);
        } else if (enableSystem && systemTheme) {
          setMode(systemTheme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [defaultTheme, enableSystem, systemTheme, storageKey]);

  // Save theme preference
  const saveThemePreference = useCallback((newMode, newFontSize, newDensity, newColors) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        mode: newMode || mode,
        fontSize: newFontSize || fontSize,
        density: newDensity || density,
        customColors: newColors || customTheme,
      }));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [mode, fontSize, density, customTheme, storageKey]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    saveThemePreference(newMode);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newMode);
  }, [mode, saveThemePreference]);

  // Set specific theme
  const setTheme = useCallback((newMode) => {
    if (newMode !== 'light' && newMode !== 'dark') {
      console.warn('Invalid theme mode. Use "light" or "dark".');
      return;
    }
    setMode(newMode);
    saveThemePreference(newMode);
    document.documentElement.setAttribute('data-theme', newMode);
  }, [saveThemePreference]);

  // Reset to system preference
  const resetToSystem = useCallback(() => {
    if (systemTheme) {
      setMode(systemTheme);
      saveThemePreference(systemTheme);
      document.documentElement.setAttribute('data-theme', systemTheme);
    }
  }, [systemTheme, saveThemePreference]);

  // Update custom colors
  const updateCustomColors = useCallback((colors) => {
    setCustomTheme(colors);
    saveThemePreference(null, null, null, colors);
  }, [saveThemePreference]);

  // Update font size
  const updateFontSize = useCallback((size) => {
    if (!['small', 'medium', 'large'].includes(size)) {
      console.warn('Invalid font size. Use "small", "medium", or "large".');
      return;
    }
    setFontSize(size);
    saveThemePreference(null, size);
    
    // Apply font size to document
    document.documentElement.style.fontSize = 
      size === 'small' ? '14px' :
      size === 'large' ? '18px' :
      '16px';
  }, [saveThemePreference]);

  // Update density
  const updateDensity = useCallback((newDensity) => {
    if (!['compact', 'comfortable', 'spacious'].includes(newDensity)) {
      console.warn('Invalid density. Use "compact", "comfortable", or "spacious".');
      return;
    }
    setDensity(newDensity);
    saveThemePreference(null, null, newDensity);
  }, [saveThemePreference]);

  // Get current effective theme
  const effectiveMode = useMemo(() => {
    return mode === 'system' ? systemTheme || 'light' : mode;
  }, [mode, systemTheme]);

  // Create MUI theme
  const muiTheme = useMemo(() => {
    // Select base theme
    const baseTheme = effectiveMode === 'light' ? lightTheme : darkTheme;
    
    // Apply font size
    const fontSizeMap = {
      small: 14,
      medium: 16,
      large: 18,
    };
    
    // Apply density
    const densityMap = {
      compact: { spacing: 6, padding: 1 },
      comfortable: { spacing: 8, padding: 2 },
      spacious: { spacing: 12, padding: 3 },
    };
    
    // Merge with customizations
    const themeConfig = {
      ...baseTheme,
      ...customThemeOptions,
      palette: {
        ...baseTheme.palette,
        ...customTheme,
      },
      typography: {
        ...baseTheme.typography,
        fontSize: fontSizeMap[fontSize] || 16,
      },
      spacing: (factor) => {
        const baseSpacing = densityMap[density]?.spacing || 8;
        return `${baseSpacing * factor}px`;
      },
      components: {
        ...baseTheme.components,
        MuiButton: {
          styleOverrides: {
            root: {
              padding: density === 'compact' ? '6px 12px' :
                     density === 'spacious' ? '12px 24px' :
                     '8px 16px',
            },
          },
        },
      },
    };

    return createTheme(themeConfig);
  }, [effectiveMode, customTheme, fontSize, density]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveMode);
    document.documentElement.style.fontSize = 
      fontSize === 'small' ? '14px' :
      fontSize === 'large' ? '18px' :
      '16px';
    
    // Add theme class to body
    document.body.className = `theme-${effectiveMode}`;
  }, [effectiveMode, fontSize]);

  // Context value
  const contextValue = useMemo(() => ({
    // Current state
    mode,
    effectiveMode,
    systemTheme,
    isLoading,
    fontSize,
    density,
    customTheme,
    isDark: effectiveMode === 'dark',
    isLight: effectiveMode === 'light',
    
    // Theme configuration
    colors,
    muiTheme,
    
    // Actions
    toggleTheme,
    setTheme,
    resetToSystem,
    updateCustomColors,
    updateFontSize,
    updateDensity,
    saveThemePreference,
    
    // Utility
    getColor: (colorName, shade = 'main') => {
      const color = colors[colorName];
      return color?.[shade] || color?.main || '#000000';
    },
    isSystemPreference: mode === 'system',
  }), [
    mode, effectiveMode, systemTheme, isLoading, fontSize,
    density, customTheme, muiTheme, toggleTheme, setTheme,
    resetToSystem, updateCustomColors, updateFontSize,
    updateDensity, saveThemePreference,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: effectiveMode === 'dark' ? '#0A0A1A' : '#F5F7FA',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: `4px solid ${effectiveMode === 'dark' ? '#2D2D44' : '#E0E0E0'}`,
            borderTop: `4px solid ${colors.primary.main}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
          <p style={{ marginTop: 16, color: effectiveMode === 'dark' ? '#B0B8C4' : '#616161' }}>
            Loading theme...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// ==============================================
// Higher-Order Component
// ==============================================

export const withTheme = (Component) => {
  return function WithThemeComponent(props) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};

// ==============================================
// Hooks for specific theme features
// ==============================================

// Hook for responsive design
export const useMediaQuery = (breakpoint) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(breakpoint);
    setMatches(media.matches);

    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [breakpoint]);

  return matches;
};

// Hook for theme colors
export const useThemeColor = (colorName, shade = 'main') => {
  const { getColor } = useTheme();
  return getColor(colorName, shade);
};

// Hook for responsive spacing
export const useSpacing = () => {
  const { muiTheme } = useTheme();
  return (factor) => muiTheme.spacing(factor);
};

// Hook for responsive typography
export const useTypography = () => {
  const { muiTheme } = useTheme();
  return (variant) => muiTheme.typography[variant];
};

// ==============================================
// CSS Variables Injection
// ==============================================

export const ThemeStyles = () => {
  const { effectiveMode, colors } = useTheme();

  const cssVariables = {
    '--color-primary': colors.primary.main,
    '--color-primary-light': colors.primary.light,
    '--color-primary-dark': colors.primary.dark,
    '--color-secondary': colors.secondary.main,
    '--color-success': colors.success.main,
    '--color-error': colors.error.main,
    '--color-warning': colors.warning.main,
    '--color-info': colors.info.main,
    '--color-background': effectiveMode === 'dark' ? '#0A0A1A' : '#F5F7FA',
    '--color-surface': effectiveMode === 'dark' ? '#1A1A2E' : '#FFFFFF',
    '--color-text-primary': effectiveMode === 'dark' ? '#E8EDF2' : '#212121',
    '--color-text-secondary': effectiveMode === 'dark' ? '#B0B8C4' : '#616161',
    '--color-border': effectiveMode === 'dark' ? '#2D2D44' : '#E0E0E0',
  };

  return (
    <style>{`
      :root {
        ${Object.entries(cssVariables).map(([key, value]) => `${key}: ${value};`).join('\n')}
      }
    `}</style>
  );
};

// ==============================================
// Default Export
// ==============================================

export default ThemeProvider;