// Settings.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Settings.css'; // Optional: for styling

// Settings Component
const Settings = ({
  // Core props
  settings = {},
  onSettingsUpdate,
  onSettingsReset,
  onSettingChange,
  
  // Configuration
  sections = [
    'general',
    'appearance',
    'notifications',
    'privacy',
    'security',
    'integrations',
    'advanced'
  ],
  sectionLabels = {
    general: 'General',
    appearance: 'Appearance',
    notifications: 'Notifications',
    privacy: 'Privacy & Security',
    security: 'Security',
    integrations: 'Integrations',
    advanced: 'Advanced'
  },
  sectionIcons = {
    general: '⚙️',
    appearance: '🎨',
    notifications: '🔔',
    privacy: '🔒',
    security: '🛡️',
    integrations: '🔗',
    advanced: '🚀'
  },
  
  // UI props
  isLoading = false,
  error = null,
  readOnly = false,
  showSaveButton = true,
  showResetButton = true,
  showSearch = true,
  showBreadcrumbs = true,
  showSectionIcons = true,
  showValidation = true,
  
  // Theme and styling
  theme = 'light',
  className = '',
  style = {},
  layout = 'tabs', // 'tabs', 'sidebar', 'cards'
  
  // Validation
  validators = {},
  
  // Custom render props
  renderSection,
  renderSetting,
  renderCustomSection,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  renderActions,
  
  // Event handlers
  onSave,
  onReset,
  onValidate,
  onTabChange,
  onSettingFocus,
  onSettingBlur,
  
  // Children
  children,
}) => {
  // State
  const [settingsState, setSettingsState] = useState(settings);
  const [activeSection, setActiveSection] = useState(sections[0] || 'general');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [themeMode, setThemeMode] = useState(theme);
  
  // Refs
  const formRef = useRef(null);
  const searchInputRef = useRef(null);
  const settingsRef = useRef({});

  // Default settings structure
  const defaultSettings = useMemo(() => ({
    general: {
      appName: 'My App',
      appVersion: '1.0.0',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '24h',
    },
    appearance: {
      theme: 'light',
      accentColor: '#1976D2',
      fontSize: 'medium',
      compactMode: false,
      animations: true,
      sidebarCollapsed: false,
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
      inApp: true,
      frequency: 'instant',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      categories: {
        updates: true,
        alerts: true,
        promotions: false,
        system: true,
      },
    },
    privacy: {
      shareData: false,
      analytics: true,
      cookies: true,
      marketingEmails: false,
      twoFactorAuth: false,
      sessionTimeout: 30,
    },
    security: {
      passwordLastChanged: null,
      twoFactorEnabled: false,
      trustedDevices: [],
      loginHistory: [],
      securityQuestions: [],
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecial: true,
      },
    },
    integrations: {
      enabled: [],
      connected: {},
      webhooks: [],
      apiKeys: [],
    },
    advanced: {
      debugMode: false,
      developerTools: false,
      experimentalFeatures: false,
      logLevel: 'info',
      cacheSize: 100,
      maxUploadSize: 10,
    },
  }), []);

  // Search filter
  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;
    
    const searchLower = searchTerm.toLowerCase();
    return sections.filter(section => {
      const sectionData = settingsState[section] || {};
      const matchesSection = sectionLabels[section]?.toLowerCase().includes(searchLower);
      const matchesSetting = Object.entries(sectionData).some(([key, value]) => {
        const keyMatch = key.toLowerCase().includes(searchLower);
        const valueMatch = String(value).toLowerCase().includes(searchLower);
        return keyMatch || valueMatch;
      });
      return matchesSection || matchesSetting;
    });
  }, [sections, searchTerm, settingsState, sectionLabels]);

  // Get current section settings
  const currentSettings = useMemo(() => {
    return settingsState[activeSection] || {};
  }, [settingsState, activeSection]);

  // Validation
  const validateSection = useCallback((section, data) => {
    const errors = {};
    const validator = validators[section];
    
    if (validator) {
      Object.keys(data).forEach(key => {
        const value = data[key];
        const rules = validator[key];
        
        if (rules) {
          if (rules.required && !value) {
            errors[key] = `${key} is required`;
          }
          if (rules.min && value < rules.min) {
            errors[key] = `${key} must be at least ${rules.min}`;
          }
          if (rules.max && value > rules.max) {
            errors[key] = `${key} must be at most ${rules.max}`;
          }
          if (rules.pattern && !rules.pattern.test(value)) {
            errors[key] = `${key} format is invalid`;
          }
          if (rules.custom && !rules.custom(value)) {
            errors[key] = `${key} is invalid`;
          }
        }
      });
    }
    
    return errors;
  }, [validators]);

  // Setting change handler
  const handleSettingChange = useCallback((section, key, value) => {
    setSettingsState(prev => {
      const sectionData = { ...prev[section] };
      sectionData[key] = value;
      
      // Check if value actually changed
      const oldValue = settings[section]?.[key];
      if (oldValue !== value) {
        setIsDirty(true);
      }
      
      return { ...prev, [section]: sectionData };
    });

    onSettingChange?.(section, key, value);
    
    // Validate if needed
    if (showValidation) {
      const errors = validateSection(section, { [key]: value });
      setValidationErrors(prev => ({
        ...prev,
        ...errors
      }));
    }
  }, [settings, onSettingChange, showValidation, validateSection]);

  // Save settings
  const handleSave = useCallback(async () => {
    // Validate all sections
    const allErrors = {};
    Object.keys(settingsState).forEach(section => {
      const errors = validateSection(section, settingsState[section]);
      if (Object.keys(errors).length > 0) {
        allErrors[section] = errors;
      }
    });
    
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(allErrors);
      return;
    }
    
    setIsSaving(true);
    try {
      await onSettingsUpdate?.(settingsState);
      await onSave?.(settingsState);
      setIsDirty(false);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [settingsState, validateSection, onSettingsUpdate, onSave]);

  // Reset settings
  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setIsResetting(true);
      try {
        setSettingsState(defaultSettings);
        onSettingsReset?.(defaultSettings);
        onReset?.(defaultSettings);
        setIsDirty(false);
        setValidationErrors({});
      } catch (err) {
        console.error('Reset error:', err);
      } finally {
        setIsResetting(false);
      }
    }
  }, [defaultSettings, onSettingsReset, onReset]);

  // Tab change handler
  const handleTabChange = useCallback((section) => {
    // Check for unsaved changes
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    
    setActiveSection(section);
    onTabChange?.(section);
    setSearchTerm('');
    setValidationErrors({});
  }, [isDirty, onTabChange]);

  // Search handler
  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Section expand toggle
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Render setting input
  const renderSettingInput = useCallback((key, value, section) => {
    if (renderSetting) {
      return renderSetting(key, value, section, {
        onChange: (val) => handleSettingChange(section, key, val),
        error: validationErrors[section]?.[key],
        isDirty: isDirty,
        readOnly,
      });
    }

    const error = validationErrors[section]?.[key];
    const isBoolean = typeof value === 'boolean';
    const isNumber = typeof value === 'number';
    const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
    const isArray = Array.isArray(value);

    // Boolean - Toggle
    if (isBoolean) {
      return (
        <div className="setting-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleSettingChange(section, key, e.target.checked)}
              disabled={readOnly}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="setting-value">{value ? 'On' : 'Off'}</span>
        </div>
      );
    }

    // Number - Range or Input
    if (isNumber) {
      return (
        <div className="setting-number">
          <input
            type="number"
            value={value}
            onChange={(e) => handleSettingChange(section, key, parseFloat(e.target.value) || 0)}
            className={error ? 'input-error' : ''}
            disabled={readOnly}
          />
          {error && <span className="error-message">{error}</span>}
        </div>
      );
    }

    // Object - Nested settings
    if (isObject) {
      return (
        <div className="setting-object">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="nested-setting">
              <label className="setting-label">
                {subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              {renderSettingInput(`${key}.${subKey}`, subValue, section)}
            </div>
          ))}
        </div>
      );
    }

    // Array - Simple display
    if (isArray) {
      return (
        <div className="setting-array">
          <div className="array-items">
            {value.map((item, index) => (
              <span key={index} className="array-item">
                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
              </span>
            ))}
          </div>
          {!readOnly && (
            <button 
              className="array-add-btn"
              onClick={() => {
                const newArray = [...value, ''];
                handleSettingChange(section, key, newArray);
              }}
            >
              + Add
            </button>
          )}
        </div>
      );
    }

    // String - Input or Select
    const stringOptions = getStringOptions(key);
    if (stringOptions) {
      return (
        <select
          value={value}
          onChange={(e) => handleSettingChange(section, key, e.target.value)}
          className={error ? 'input-error' : ''}
          disabled={readOnly}
        >
          <option value="">Select...</option>
          {stringOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    // Default - Text input
    return (
      <div className="setting-text">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleSettingChange(section, key, e.target.value)}
          className={error ? 'input-error' : ''}
          placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
          disabled={readOnly}
        />
        {error && <span className="error-message">{error}</span>}
      </div>
    );
  }, [validationErrors, isDirty, readOnly, handleSettingChange, renderSetting]);

  // Helper to get string options for specific keys
  const getStringOptions = useCallback((key) => {
    const options = {
      language: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ar', 'hi'],
      theme: ['light', 'dark', 'system'],
      fontSize: ['small', 'medium', 'large', 'xlarge'],
      dateFormat: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      timeFormat: ['12h', '24h'],
      frequency: ['instant', 'hourly', 'daily', 'weekly'],
      logLevel: ['debug', 'info', 'warn', 'error'],
    };
    return options[key] || null;
  }, []);

  // Render section content
  const renderSectionContent = useCallback((section) => {
    if (renderSection) {
      return renderSection(section, settingsState[section], {
        onChange: (key, value) => handleSettingChange(section, key, value),
        errors: validationErrors[section] || {},
        isDirty,
        readOnly,
      });
    }

    const sectionData = settingsState[section] || {};
    const entries = Object.entries(sectionData);

    if (entries.length === 0) {
      return (
        <div className="section-empty">
          <p>No settings available for this section.</p>
        </div>
      );
    }

    return (
      <div className="settings-section-content">
        {entries.map(([key, value]) => {
          // Skip nested objects with multiple properties for better layout
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length > 1) {
            return (
              <div key={key} className="setting-group">
                <h4 className="setting-group-title">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h4>
                <div className="setting-group-content">
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <div key={subKey} className="setting-item">
                      <label className="setting-label">
                        {subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      {renderSettingInput(`${key}.${subKey}`, subValue, section)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="setting-item">
              <label className="setting-label">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
              {renderSettingInput(key, value, section)}
            </div>
          );
        })}
      </div>
    );
  }, [settingsState, validationErrors, isDirty, readOnly, handleSettingChange, renderSettingInput, renderSection]);

  // Effects
  useEffect(() => {
    setSettingsState(settings);
  }, [settings]);

  useEffect(() => {
    setThemeMode(theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
      
      // Escape to close search
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, handleSave, searchTerm]);

  // Render loading state
  if (isLoading) {
    if (renderLoadingState) return renderLoadingState();
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    if (renderErrorState) return renderErrorState(error);
    return (
      <div className="settings-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render empty state
  if (!settingsState || Object.keys(settingsState).length === 0) {
    if (renderEmptyState) return renderEmptyState();
    return (
      <div className="settings-empty">
        <span className="empty-icon">⚙️</span>
        <h3>No Settings Available</h3>
        <p>Configure your application settings here.</p>
        {!readOnly && (
          <button className="reset-btn" onClick={handleReset}>
            Load Defaults
          </button>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div 
      className={`settings-container settings-${themeMode} ${className}`}
      style={style}
      ref={formRef}
    >
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <h2 className="settings-title">Settings</h2>
          {showBreadcrumbs && (
            <div className="settings-breadcrumbs">
              <span className="breadcrumb-item">Settings</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {sectionLabels[activeSection] || activeSection}
              </span>
            </div>
          )}
        </div>
        
        <div className="settings-header-right">
          {showSearch && (
            <div className="settings-search">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
          )}
          
          <div className="settings-actions">
            {showSaveButton && !readOnly && (
              <button
                className={`save-btn ${isDirty ? 'dirty' : ''}`}
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved ✓'}
              </button>
            )}
            
            {showResetButton && !readOnly && (
              <button
                className="reset-btn"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset to Defaults'}
              </button>
            )}
            
            {renderActions && renderActions({
              isDirty,
              isSaving,
              isResetting,
              onSave: handleSave,
              onReset: handleReset,
            })}
          </div>
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {isDirty && (
        <div className="unsaved-indicator">
          <span className="unsaved-icon">⚠️</span>
          <span>You have unsaved changes</span>
          <button className="save-now-btn" onClick={handleSave}>
            Save Now
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="settings-content">
        {/* Navigation */}
        <div className={`settings-nav settings-nav-${layout}`}>
          {layout === 'sidebar' && (
            <div className="settings-sidebar">
              {filteredSections.map(section => (
                <button
                  key={section}
                  className={`sidebar-item ${activeSection === section ? 'active' : ''}`}
                  onClick={() => handleTabChange(section)}
                >
                  {showSectionIcons && (
                    <span className="sidebar-icon">{sectionIcons[section] || '📋'}</span>
                  )}
                  <span className="sidebar-label">{sectionLabels[section] || section}</span>
                  {isDirty && activeSection !== section && (
                    <span className="sidebar-dirty">●</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {layout === 'tabs' && (
            <div className="settings-tabs">
              {filteredSections.map(section => (
                <button
                  key={section}
                  className={`tab-item ${activeSection === section ? 'active' : ''}`}
                  onClick={() => handleTabChange(section)}
                >
                  {showSectionIcons && (
                    <span className="tab-icon">{sectionIcons[section] || '📋'}</span>
                  )}
                  <span className="tab-label">{sectionLabels[section] || section}</span>
                  {isDirty && activeSection !== section && (
                    <span className="tab-dirty">●</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {layout === 'cards' && (
            <div className="settings-cards">
              {filteredSections.map(section => (
                <div
                  key={section}
                  className={`card-item ${activeSection === section ? 'active' : ''}`}
                  onClick={() => handleTabChange(section)}
                >
                  {showSectionIcons && (
                    <div className="card-icon">{sectionIcons[section] || '📋'}</div>
                  )}
                  <div className="card-content">
                    <h4 className="card-title">{sectionLabels[section] || section}</h4>
                    {isDirty && activeSection !== section && (
                      <span className="card-dirty">Modified</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="settings-panel">
          {renderCustomSection && renderCustomSection({
            section: activeSection,
            data: currentSettings,
            isActive: true,
            onChange: (key, value) => handleSettingChange(activeSection, key, value),
            errors: validationErrors[activeSection] || {},
            isDirty,
            readOnly,
          })}
          
          {!renderCustomSection && renderSectionContent(activeSection)}
          
          {children && (
            <div className="settings-children">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <span className="settings-version">
          Version {settingsState.general?.appVersion || '1.0.0'}
        </span>
        <span className="settings-last-saved">
          {isDirty ? 'Changes pending' : 'All changes saved'}
        </span>
      </div>
    </div>
  );
};

// Sub-components for modular usage

// Setting Toggle Component
export const SettingToggle = ({ 
  label, 
  value, 
  onChange, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`setting-toggle-wrapper ${className}`}>
      <label className="toggle-label">{label}</label>
      <div className="toggle-control">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            {...props}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-status">{value ? 'On' : 'Off'}</span>
      </div>
    </div>
  );
};

// Setting Select Component
export const SettingSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`setting-select-wrapper ${className}`}>
      <label className="select-label">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        {...props}
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
};

// Setting Input Component
export const SettingInput = ({ 
  label, 
  value, 
  type = 'text', 
  onChange, 
  placeholder = '',
  disabled = false,
  error = '',
  className = '',
  ...props 
}) => {
  return (
    <div className={`setting-input-wrapper ${className}`}>
      <label className="input-label">{label}</label>
      <div className="input-control">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={error ? 'error' : ''}
          {...props}
        />
        {error && <span className="input-error">{error}</span>}
      </div>
    </div>
  );
};

// Setting Range Component
export const SettingRange = ({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  step = 1, 
  onChange,
  disabled = false,
  showValue = true,
  className = '',
  ...props 
}) => {
  return (
    <div className={`setting-range-wrapper ${className}`}>
      <div className="range-header">
        <label className="range-label">{label}</label>
        {showValue && <span className="range-value">{value}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        {...props}
      />
    </div>
  );
};

// Setting Color Picker
export const SettingColor = ({ 
  label, 
  value, 
  onChange, 
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`setting-color-wrapper ${className}`}>
      <label className="color-label">{label}</label>
      <div className="color-control">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          {...props}
        />
        <span className="color-hex">{value}</span>
      </div>
    </div>
  );
};

export default Settings;