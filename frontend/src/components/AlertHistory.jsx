import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, AlertOctagon, Info, Search, Filter,
  CheckCircle2, X, Eye, Clock, Camera, Shield, ChevronDown,
  RefreshCw, Download
} from 'lucide-react';
import { useAlerts, ALERT_ICONS, SEVERITY_RANK } from '../hooks/useAlerts';

// ── Severity styling ─────────────────────────────────────────────────────────
const SEVERITY_STYLE = {
  critical: {
    badge: 'border-red-500 text-red-400 bg-red-500/10',
    row:   'border-l-red-500',
    icon:  <AlertOctagon className="w-3.5 h-3.5" />,
    dot:   'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
  },
  high: {
    badge: 'border-orange-400 text-orange-400 bg-orange-400/10',
    row:   'border-l-orange-400',
    icon:  <AlertTriangle className="w-3.5 h-3.5" />,
    dot:   'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]',
  },
  medium: {
    badge: 'border-yellow-400 text-yellow-400 bg-yellow-400/10',
    row:   'border-l-yellow-400',
    icon:  <AlertTriangle className="w-3.5 h-3.5" />,
    dot:   'bg-yellow-400',
  },
  low: {
    badge: 'border-indigo-400 text-indigo-400 bg-indigo-400/10',
    row:   'border-l-indigo-400',
    icon:  <Info className="w-3.5 h-3.5" />,
    dot:   'bg-indigo-400',
  },
};

const ALL_TYPES = [
  'Person Detected', 'Multiple People Detected', 'No Person Detected',
  'Unauthorized Person Detected', 'Intrusion in Restricted Area', 'Entry During Off-Hours',
  'Exit Through Restricted Zone', 'Loitering Detected', 'Running Detected',
  'Person Following Another Person', 'Frequent Entry/Exit', 'Person Fell Down',
  'Violence/Fight Detected', 'Person in Dangerous Zone', 'Unknown Person Detected',
  'Known Person Identified', 'Blacklisted Person Detected', 'Missing Person Found',
  'Person Carrying Suspicious Object', 'Object Left Behind',
];

// ── Normalise alert from backend or localStorage format ───────────────────────
const norm = (a) => ({
  id:        a._id   || a.id,
  type:      a.detectionType || a.type || 'Unknown',
  camera:    a.cameraName    || a.camera || 'Unknown Camera',
  level:     a.threatLevel   || a.level  || 'low',
  timestamp: a.timestamp,
  status:    a.status || 'PENDING',
  person:    a.person  || 'Unknown',
  details:   a.details || '',
  imageUrl:  a.imageUrl || '',
});

// ── Snapshot Modal ────────────────────────────────────────────────────────────
const SnapshotModal = ({ alert, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#0f1117] border border-[#1e2530] rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2530]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ALERT_ICONS[alert.type] || '🚨'}</span>
          <div>
            <h3 className="font-bold text-white text-sm">{alert.type}</h3>
            <p className="text-xs text-gray-500">{alert.camera}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Snapshot */}
      <div className="bg-black min-h-[240px] flex items-center justify-center">
        {alert.imageUrl ? (
          <img
            src={alert.imageUrl.startsWith('data:') ? alert.imageUrl : `http://localhost:5000/${alert.imageUrl}`}
            alt="Alert snapshot"
            className="max-h-80 w-full object-contain"
          />
        ) : (
          <div className="text-center text-gray-600 py-16">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No snapshot available</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
        {[
          ['Person',     alert.person],
          ['Severity',   alert.level?.toUpperCase()],
          ['Timestamp',  new Date(alert.timestamp).toLocaleString()],
          ['Details',    alert.details || '—'],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <p className="text-white font-medium">{val}</p>
          </div>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AlertHistory = () => {
  const { alerts: rawAlerts, loading, fetchAlerts, resolveAlert, dismissAlert } = useAlerts();

  const [search,         setSearch]         = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [typeFilter,     setTypeFilter]      = useState('all');
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [selectedAlert,  setSelectedAlert]  = useState(null);

  const alerts = useMemo(() => rawAlerts.map(norm), [rawAlerts]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return alerts.filter(a => {
      const matchSearch = !term ||
        a.camera.toLowerCase().includes(term) ||
        a.type.toLowerCase().includes(term)   ||
        String(a.id).includes(term);
      const matchSev    = severityFilter === 'all' || a.level === severityFilter;
      const matchStatus = statusFilter   === 'all' || a.status === statusFilter;
      const matchType   = typeFilter     === 'all' || a.type   === typeFilter;
      return matchSearch && matchSev && matchStatus && matchType;
    });
  }, [alerts, search, severityFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total:    alerts.length,
    pending:  alerts.filter(a => a.status === 'PENDING').length,
    critical: alerts.filter(a => a.level  === 'critical').length,
    today:    alerts.filter(a => new Date(a.timestamp) >= new Date(new Date().setHours(0,0,0,0))).length,
  }), [alerts]);

  const hasFilters = severityFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['ID','Type','Camera','Severity','Status','Timestamp','Person']];
    filtered.forEach(a =>
      rows.push([a.id, a.type, a.camera, a.level, a.status, a.timestamp, a.person])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'alerts.csv'; link.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-full pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">Alert Center</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered surveillance event log — real-time & historical</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f1117] border border-[#1e2530] rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#0f1117] border border-[#1e2530] rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts',    value: stats.total,    color: 'text-white',          dot: 'bg-indigo-400' },
          { label: 'Pending',         value: stats.pending,  color: 'text-orange-400',      dot: 'bg-orange-400' },
          { label: 'Critical Today',  value: stats.critical, color: 'text-red-400',         dot: 'bg-red-500' },
          { label: 'Today',           value: stats.today,    color: 'text-emerald-400',     dot: 'bg-emerald-400' },
        ].map(({ label, value, color, dot }) => (
          <div key={label} className="bg-[#0f1117] border border-[#1e2530] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by type, camera, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#1e2530] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-gray-600 transition-colors"
          />
        </div>

        {/* Filter toggle */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              hasFilters
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                : 'bg-[#0f1117] border-[#1e2530] text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">ON</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-12 w-72 bg-[#0f1117] border border-[#1e2530] rounded-xl shadow-2xl z-50 p-5 space-y-4"
              >
                {[
                  { label: 'Severity', state: severityFilter, set: setSeverityFilter,
                    opts: [['all','All Severities'],['critical','Critical'],['high','High'],['medium','Medium'],['low','Low']] },
                  { label: 'Status', state: statusFilter,   set: setStatusFilter,
                    opts: [['all','All Statuses'],['PENDING','Pending'],['RESOLVED','Resolved'],['DISMISSED','Dismissed']] },
                  { label: 'Alert Type', state: typeFilter, set: setTypeFilter,
                    opts: [['all','All Types'], ...ALL_TYPES.map(t => [t, t])] },
                ].map(({ label, state, set, opts }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
                    <select
                      value={state}
                      onChange={e => set(e.target.value)}
                      className="w-full bg-[#090c12] border border-[#1e2530] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    >
                      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
                <button
                  onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); setTypeFilter('all'); setFilterOpen(false); }}
                  className="w-full py-2 bg-[#1e2530] hover:bg-[#252d3a] text-sm font-semibold text-white rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0d12] border border-[#1e2530] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#1e2530] bg-[#0f1117]">
                {['Type', 'Camera', 'Severity', 'Person', 'Timestamp', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-600 text-sm">Loading alerts…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Shield className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                    <p className="text-gray-500 text-sm">No alerts match your criteria.</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((alert, idx) => {
                    const sev = SEVERITY_STYLE[alert.level] || SEVERITY_STYLE.low;
                    const isPending = alert.status === 'PENDING';
                    return (
                      <motion.tr
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: Math.min(idx * 0.025, 0.3) }}
                        className={`border-b border-[#1e2530]/50 border-l-2 ${sev.row} hover:bg-white/[0.02] transition-colors`}
                      >
                        {/* Type */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">{ALERT_ICONS[alert.type] || '🚨'}</span>
                            <span className="text-sm font-semibold text-white leading-tight">{alert.type}</span>
                          </div>
                          {alert.details && (
                            <p className="text-xs text-gray-600 mt-0.5 ml-7">{alert.details}</p>
                          )}
                        </td>

                        {/* Camera */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                            <Camera className="w-3.5 h-3.5" />
                            {alert.camera}
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border ${sev.badge}`}>
                            {sev.icon}
                            {alert.level?.toUpperCase()}
                          </span>
                        </td>

                        {/* Person */}
                        <td className="px-5 py-4 text-sm text-gray-400">{alert.person}</td>

                        {/* Timestamp */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs font-mono">
                            <Clock className="w-3 h-3" />
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold tracking-wider ${isPending ? 'text-orange-400' : 'text-gray-500'}`}>
                            {isPending && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${sev.dot}`} />}
                            {alert.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="text-indigo-400 hover:text-indigo-300 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isPending && (
                              <button
                                onClick={() => resolveAlert(alert.id)}
                                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                title="Mark Resolved"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => dismissAlert(alert.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#1e2530] text-xs text-gray-600">
            Showing {filtered.length} of {alerts.length} alerts
          </div>
        )}
      </div>

      {/* ── Snapshot Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAlert && (
          <SnapshotModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AlertHistory;
