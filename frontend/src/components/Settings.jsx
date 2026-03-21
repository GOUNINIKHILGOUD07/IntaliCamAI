import React, { useState, useEffect } from 'react';
import { Monitor, Bell, Activity, Shield, RefreshCcw, Save, Sun, Moon } from 'lucide-react';

const defaultSettings = {
  theme: 'dark',
  autoRefresh: true,
  refreshInterval: '30',
  showConfidence: true,
  compactMode: false,

  alertNotifications: true,
  emailAlerts: true,
  smsAlerts: false,
  soundAlerts: true,
  desktopNotifications: true,

  sensitivity: 70,
  threshold: 'medium',
  nightVision: true,
  motionDetection: true,

  twoFactor: false,
  sessionTimeout: '30',
  ipWhitelist: false,
};

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('intalicam_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Real-time theme application
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem('intalicam_settings', JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    // Don't use alert to avoid disruption if they already see it working!
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to their defaults?')) {
      setSettings(defaultSettings);
      localStorage.setItem('intalicam_settings', JSON.stringify(defaultSettings));
      alert('Settings reset to system defaults.');
    }
  };

  // Toggle Switch Component
  const Toggle = ({ checked, onChange }) => (
    <div 
      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-primary' : 'bg-dark-700'}`}
      onClick={onChange}
    >
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );

  return (
    <div className="max-w-5xl space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-text-muted mt-1">Configure your surveillance system preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Reset to Default
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 btn-primary py-2 px-5 text-sm"
          >
            <Save className="w-4 h-4" /> {isSaved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
      
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Display Settings */}
          <div className="panel p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-dark-700 flex items-center gap-3">
              <Monitor className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Display Settings</h2>
            </div>
            
            <div className="divide-y divide-dark-700/50">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Theme</h3>
                  <p className="text-xs text-text-muted mt-0.5">Choose your preferred color scheme</p>
                </div>
                <div className="flex items-center bg-dark-800 border border-dark-700 rounded-lg p-1">
                  <button 
                    onClick={() => handleChange('theme', 'light')}
                    className={`p-1.5 rounded-md transition-colors ${settings.theme === 'light' ? 'bg-dark-600 text-white' : 'text-text-muted hover:text-white'}`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleChange('theme', 'dark')}
                    className={`p-1.5 rounded-md transition-colors ${settings.theme === 'dark' ? 'bg-primary text-white' : 'text-text-muted hover:text-white'}`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Auto Refresh</h3>
                  <p className="text-xs text-text-muted mt-0.5">Automatically refresh camera feeds</p>
                </div>
                <Toggle checked={settings.autoRefresh} onChange={() => handleToggle('autoRefresh')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Refresh Interval</h3>
                  <p className="text-xs text-text-muted mt-0.5">How often to refresh data</p>
                </div>
                <select 
                  className="bg-dark-800 border border-dark-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                  value={settings.refreshInterval}
                  onChange={(e) => handleChange('refreshInterval', e.target.value)}
                >
                  <option value="15">15 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                </select>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Show Confidence Scores</h3>
                  <p className="text-xs text-text-muted mt-0.5">Display AI confidence in detections</p>
                </div>
                <Toggle checked={settings.showConfidence} onChange={() => handleToggle('showConfidence')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Compact Mode</h3>
                  <p className="text-xs text-text-muted mt-0.5">Use smaller UI elements</p>
                </div>
                <Toggle checked={settings.compactMode} onChange={() => handleToggle('compactMode')} />
              </div>
            </div>
          </div>

          {/* Detection Settings */}
          <div className="panel p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-dark-700 flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Detection Settings</h2>
            </div>
            
            <div className="divide-y divide-dark-700/50">
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Camera Sensitivity Level</h3>
                  <span className="text-sm font-semibold text-primary">{settings.sensitivity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  className="w-full accent-primary h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                  value={settings.sensitivity}
                  onChange={(e) => handleChange('sensitivity', parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[11px] text-text-muted font-medium mt-2">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Detection Threshold</h3>
                  <p className="text-xs text-text-muted mt-0.5">Minimum confidence level to trigger alerts</p>
                </div>
                <select 
                  className="bg-dark-800 border border-dark-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                  value={settings.threshold}
                  onChange={(e) => handleChange('threshold', e.target.value)}
                >
                  <option value="low">Low (50%)</option>
                  <option value="medium">Medium (70%)</option>
                  <option value="high">High (90%)</option>
                </select>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Night Vision Mode</h3>
                  <p className="text-xs text-text-muted mt-0.5">Enhanced detection in low-light conditions</p>
                </div>
                <Toggle checked={settings.nightVision} onChange={() => handleToggle('nightVision')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Motion Detection</h3>
                  <p className="text-xs text-text-muted mt-0.5">Detect movement in camera feeds</p>
                </div>
                <Toggle checked={settings.motionDetection} onChange={() => handleToggle('motionDetection')} />
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Notification Settings */}
          <div className="panel p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-dark-700 flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Notification Settings</h2>
            </div>
            
            <div className="divide-y divide-dark-700/50">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Alert Notifications</h3>
                  <p className="text-xs text-text-muted mt-0.5">Receive notifications for suspicious activities</p>
                </div>
                <Toggle checked={settings.alertNotifications} onChange={() => handleToggle('alertNotifications')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="pt-0.5 text-text-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Email Alerts</h3>
                    <p className="text-xs text-text-muted mt-0.5">Send alerts to your email address</p>
                  </div>
                </div>
                <Toggle checked={settings.emailAlerts} onChange={() => handleToggle('emailAlerts')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="pt-0.5 text-text-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">SMS Alerts</h3>
                    <p className="text-xs text-text-muted mt-0.5">Send alerts via SMS to your phone</p>
                  </div>
                </div>
                <Toggle checked={settings.smsAlerts} onChange={() => handleToggle('smsAlerts')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="pt-0.5 text-text-muted"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Sound Alerts</h3>
                    <p className="text-xs text-text-muted mt-0.5">Play sound when alerts are triggered</p>
                  </div>
                </div>
                <Toggle checked={settings.soundAlerts} onChange={() => handleToggle('soundAlerts')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="pt-0.5 text-text-muted"><Monitor className="w-[18px] h-[18px]" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Desktop Notifications</h3>
                    <p className="text-xs text-text-muted mt-0.5">Show browser notifications</p>
                  </div>
                </div>
                <Toggle checked={settings.desktopNotifications} onChange={() => handleToggle('desktopNotifications')} />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="panel p-0 overflow-hidden">
            <div className="px-6 py-5 border-b border-dark-700 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Security Settings</h2>
            </div>
            
            <div className="divide-y divide-dark-700/50">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
                  <p className="text-xs text-text-muted mt-0.5">Add extra security to your account</p>
                </div>
                <Toggle checked={settings.twoFactor} onChange={() => handleToggle('twoFactor')} />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Session Timeout</h3>
                  <p className="text-xs text-text-muted mt-0.5">Auto logout after inactivity</p>
                </div>
                <select 
                  className="bg-dark-800 border border-dark-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">IP Whitelist</h3>
                  <p className="text-xs text-text-muted mt-0.5">Restrict access to specific IP addresses</p>
                </div>
                <Toggle checked={settings.ipWhitelist} onChange={() => handleToggle('ipWhitelist')} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;
