/**
 * useAlerts.js — Custom hook for real-time alerts via Socket.io + REST polling.
 * Provides unified alert state for any component that imports it.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const WS_URL   = import.meta.env.VITE_WS_URL  || 'http://localhost:5000';

// Severity ordering for sorting/filtering
export const SEVERITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };

export const ALERT_ICONS = {
  'Person Detected':                  '🚶',
  'Multiple People Detected':         '👥',
  'No Person Detected':               '🏜️',
  'Unauthorized Person Detected':     '🚫',
  'Intrusion in Restricted Area':     '⚠️',
  'Entry During Off-Hours':           '🌙',
  'Exit Through Restricted Zone':     '🚪',
  'Loitering Detected':               '⏳',
  'Running Detected':                 '🏃',
  'Person Following Another Person':  '👤➡️👤',
  'Frequent Entry/Exit':              '🔄',
  'Person Fell Down':                 '🆘',
  'Violence/Fight Detected':          '🥊',
  'Person in Dangerous Zone':         '☢️',
  'Unknown Person Detected':          '❓',
  'Known Person Identified':          '✅',
  'Blacklisted Person Detected':      '🔴',
  'Missing Person Found':             '🔍',
  'Person Carrying Suspicious Object':'💼',
  'Object Left Behind':               '📦',
};

export function useAlerts() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const socketRef = useRef(null);
  const tokenRef  = useRef(localStorage.getItem('intalicam_token'));

  // ── Fetch from backend ──────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts?limit=100`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Backend returns { alerts, pagination } or raw array (fallback)
      const list = Array.isArray(data) ? data : (data.alerts || []);
      setAlerts(list);
      setError(null);
    } catch (err) {
      // Fallback to localStorage if backend is not running
      const stored = JSON.parse(localStorage.getItem('intalicam_alerts') || '[]');
      setAlerts(stored);
      setError(null);  // Don't show error — graceful degradation
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket.io real-time push ────────────────────────────────────────
  useEffect(() => {
    fetchAlerts();

    // Dynamically import socket.io-client (optional — won't crash if missing)
    let cleanup = () => {};
    import('socket.io-client').then(({ io }) => {
      const socket = io(WS_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => console.log('[WS] Connected to alert stream'));
      socket.on('new_alert', (alert) => {
        setAlerts(prev => {
          // Avoid duplicates
          if (prev.some(a => a._id === alert._id)) return prev;
          const updated = [alert, ...prev].slice(0, 200);
          // Persist to localStorage as fallback
          localStorage.setItem('intalicam_alerts',
            JSON.stringify(updated.slice(0, 50).map(a => ({
              id:        a._id || a.id,
              camera:    a.cameraName || a.camera,
              type:      a.detectionType || a.type,
              level:     a.threatLevel   || a.level,
              timestamp: a.timestamp,
              status:    a.status || 'PENDING',
            })))
          );
          window.dispatchEvent(new Event('alerts-updated'));
          return updated;
        });
      });
      socket.on('disconnect', () => console.log('[WS] Disconnected'));

      cleanup = () => socket.disconnect();
    }).catch(() => {
      // socket.io-client not installed: fall back to polling
      const interval = setInterval(fetchAlerts, 8000);
      cleanup = () => clearInterval(interval);
    });

    return cleanup;
  }, [fetchAlerts]);

  // ── Resolve alert ───────────────────────────────────────────────────
  const resolveAlert = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a =>
          (a._id || a.id) === id ? { ...a, status: 'RESOLVED' } : a
        ));
        window.dispatchEvent(new Event('alerts-updated'));
      }
    } catch {
      // Optimistic update even if offline
      setAlerts(prev => prev.map(a =>
        (a._id || a.id) === id ? { ...a, status: 'RESOLVED' } : a
      ));
    }
  }, []);

  // ── Dismiss alert ───────────────────────────────────────────────────
  const dismissAlert = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/alerts/${id}/dismiss`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
    } catch { /* offline */ }
    setAlerts(prev => prev.filter(a => (a._id || a.id) !== id));
    window.dispatchEvent(new Event('alerts-updated'));
  }, []);

  const pendingCount = alerts.filter(a => a.status === 'PENDING').length;

  return { alerts, loading, error, pendingCount, fetchAlerts, resolveAlert, dismissAlert };
}
