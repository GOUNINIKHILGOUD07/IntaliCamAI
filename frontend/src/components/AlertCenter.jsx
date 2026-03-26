import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Bell, BellOff, AlertOctagon, AlertTriangle,
  Info, Camera, Clock, Eye, CheckCircle2, X, Activity,
  Zap, TrendingUp
} from 'lucide-react';
import { useAlerts, ALERT_ICONS, SEVERITY_RANK } from '../hooks/useAlerts';

// ─── Severity palette ──────────────────────────────────────────────────────────
const SEV = {
  critical: {
    card:   'border-red-500/60 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.08)]',
    badge:  'bg-red-500/20 text-red-400 border-red-500/40',
    icon:   <AlertOctagon className="w-4 h-4" />,
    pulse:  'bg-red-500',
    glow:   '0 0 24px rgba(239,68,68,0.35)',
    title:  'text-red-400',
  },
  high: {
    card:   'border-orange-400/50 bg-orange-400/5',
    badge:  'bg-orange-400/20 text-orange-300 border-orange-400/40',
    icon:   <AlertTriangle className="w-4 h-4" />,
    pulse:  'bg-orange-400',
    glow:   '',
    title:  'text-orange-300',
  },
  medium: {
    card:   'border-yellow-400/40 bg-yellow-400/5',
    badge:  'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
    icon:   <AlertTriangle className="w-4 h-4" />,
    pulse:  'bg-yellow-400',
    glow:   '',
    title:  'text-yellow-300',
  },
  low: {
    card:   'border-[#1e2530] bg-[#0f1117]',
    badge:  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon:   <Info className="w-4 h-4" />,
    pulse:  'bg-indigo-400',
    glow:   '',
    title:  'text-white',
  },
};

const norm = (a) => ({
  id:        a._id           || a.id,
  type:      a.detectionType || a.type      || 'Unknown',
  camera:    a.cameraName    || a.camera    || 'Unknown Camera',
  level:     a.threatLevel   || a.level     || 'low',
  timestamp: a.timestamp,
  status:    a.status        || 'PENDING',
  person:    a.person        || 'Unknown',
  details:   a.details       || '',
  imageUrl:  a.imageUrl      || '',
});

// ── Live alert toast card ─────────────────────────────────────────────────────
const AlertCard = ({ alert, onResolve, onDismiss, onView, isNew }) => {
  const s = SEV[alert.level] || SEV.low;
  const timeStr = alert.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString()
    : 'now';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={alert.level === 'critical' ? { boxShadow: s.glow } : {}}
      className={`relative border rounded-xl p-4 ${s.card} ${isNew ? 'ring-1 ring-white/10' : ''}`}
    >
      {/* Live pulse for pending critical/high */}
      {alert.status === 'PENDING' && (alert.level === 'critical' || alert.level === 'high') && (
        <span className={`absolute top-3 right-3 flex h-2.5 w-2.5`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${s.pulse}`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${s.pulse}`} />
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Emoji Icon */}
        <div className="text-2xl leading-none mt-0.5 shrink-0">
          {ALERT_ICONS[alert.type] || '🚨'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide ${s.badge}`}>
              {s.icon}
              {alert.level?.toUpperCase()}
            </span>
            {alert.status === 'RESOLVED' && (
              <span className="text-[10px] text-emerald-500 font-bold">✓ RESOLVED</span>
            )}
          </div>
          <h3 className={`font-bold text-sm leading-tight ${s.title}`}>{alert.type}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{alert.camera}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeStr}</span>
          </div>
          {alert.details && (
            <p className="text-xs text-gray-600 mt-1 truncate">{alert.details}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5">
        <button onClick={() => onView(alert)} className="text-indigo-400 hover:text-indigo-300 transition-colors p-1" title="View">
          <Eye className="w-3.5 h-3.5" />
        </button>
        {alert.status === 'PENDING' && (
          <button onClick={() => onResolve(alert.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors p-1" title="Resolve">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onDismiss(alert.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1" title="Dismiss">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ── Stat chip ─────────────────────────────────────────────────────────────────
const StatChip = ({ icon: Icon, label, value, color }) => (
  <div className="bg-[#0f1117] border border-[#1e2530] rounded-xl px-4 py-3 flex items-center gap-3">
    <div className={`p-2 rounded-lg bg-opacity-10 ${color} bg-current`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div>
      <p className="text-xs text-gray-500 leading-none mb-1">{label}</p>
      <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
    </div>
  </div>
);

// ── Main AlertCenter ──────────────────────────────────────────────────────────
const AlertCenter = () => {
  const { alerts: rawAlerts, loading, pendingCount, resolveAlert, dismissAlert } = useAlerts();

  const [levelFilter,  setLevelFilter]  = useState('all');
  const [muteSound,    setMuteSound]    = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [newIds,       setNewIds]       = useState(new Set());

  const alerts = useMemo(() => rawAlerts.map(norm), [rawAlerts]);

  // Apply filter
  const displayed = useMemo(() => {
    return alerts
      .filter(a => levelFilter === 'all' || a.level === levelFilter)
      .sort((a, b) =>
        (SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level]) ||
        (new Date(b.timestamp) - new Date(a.timestamp))
      )
      .slice(0, 60);
  }, [alerts, levelFilter]);

  const stats = useMemo(() => ({
    total:    alerts.length,
    pending:  pendingCount,
    critical: alerts.filter(a => a.level === 'critical').length,
    high:     alerts.filter(a => a.level === 'high').length,
  }), [alerts, pendingCount]);

  // ── Type breakdown ─────────────────────────────────────────────────────
  const typeBreakdown = useMemo(() => {
    const map = {};
    alerts.forEach(a => { map[a.type] = (map[a.type] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [alerts]);

  const maxTypeCount = typeBreakdown[0]?.[1] || 1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Live Alert Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time AI surveillance events from all cameras</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuteSound(m => !m)}
            className={`p-2 rounded-lg border transition-colors ${
              muteSound
                ? 'border-gray-700 text-gray-600'
                : 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10'
            }`}
            title={muteSound ? 'Unmute' : 'Mute alerts'}
          >
            {muteSound ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Level filter pills */}
          <div className="flex gap-1.5 bg-[#0f1117] border border-[#1e2530] rounded-lg p-1">
            {['all','critical','high','medium','low'].map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors capitalize ${
                  levelFilter === l
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat chips ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatChip icon={Activity}      label="Total Alerts"   value={stats.total}    color="text-indigo-400" />
        <StatChip icon={Bell}          label="Pending"        value={stats.pending}  color="text-orange-400" />
        <StatChip icon={AlertOctagon}  label="Critical"       value={stats.critical} color="text-red-400"    />
        <StatChip icon={AlertTriangle} label="High Severity"  value={stats.high}     color="text-orange-300" />
      </div>

      {/* ── Main content: feed + breakdown ────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Live Alert Feed */}
        <div className="xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Live Feed
            </h2>
            <span className="text-xs text-gray-600">{displayed.length} events</span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-600">
              <Activity className="w-8 h-8 mx-auto mb-3 animate-pulse" />
              <p className="text-sm">Loading alerts…</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 bg-[#0f1117] border border-[#1e2530] rounded-2xl">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-gray-700" />
              <p className="text-gray-500 font-medium">No alerts at this level</p>
              <p className="text-xs text-gray-700 mt-1">System monitoring all cameras</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1e2530]">
              <AnimatePresence initial={false}>
                {displayed.map(a => (
                  <AlertCard
                    key={a.id}
                    alert={a}
                    isNew={newIds.has(a.id)}
                    onResolve={resolveAlert}
                    onDismiss={dismissAlert}
                    onView={setSelectedAlert}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right sidebar: breakdown */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Alert Breakdown
          </h2>

          <div className="bg-[#0f1117] border border-[#1e2530] rounded-2xl p-5 space-y-4">
            {typeBreakdown.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-8">No data yet</p>
            ) : typeBreakdown.map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <span>{ALERT_ICONS[type] || '🚨'}</span>
                    <span className="truncate max-w-[150px]">{type}</span>
                  </span>
                  <span className="text-xs font-bold text-white ml-2">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-[#1e2530] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxTypeCount) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Severity pie-like summary */}
          <div className="bg-[#0f1117] border border-[#1e2530] rounded-2xl p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Severity Distribution</h3>
            <div className="space-y-3">
              {[
                { level: 'critical', color: 'bg-red-500',    label: 'Critical' },
                { level: 'high',     color: 'bg-orange-400', label: 'High' },
                { level: 'medium',   color: 'bg-yellow-400', label: 'Medium' },
                { level: 'low',      color: 'bg-indigo-400', label: 'Low' },
              ].map(({ level, color, label }) => {
                const count = alerts.filter(a => a.level === level).length;
                const pct   = alerts.length ? Math.round((count / alerts.length) * 100) : 0;
                return (
                  <div key={level} className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                    <span className="text-xs text-gray-400 w-16">{label}</span>
                    <div className="flex-1 h-1 bg-[#1e2530] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full ${color} rounded-full`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0f1117] border border-[#1e2530] rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2530]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ALERT_ICONS[selectedAlert.type] || '🚨'}</span>
                  <div>
                    <h3 className="font-bold text-white">{selectedAlert.type}</h3>
                    <p className="text-xs text-gray-500">{selectedAlert.camera}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedAlert.imageUrl ? (
                <div className="bg-black">
                  <img
                    src={selectedAlert.imageUrl.startsWith('data:')
                      ? selectedAlert.imageUrl
                      : `http://localhost:5000/${selectedAlert.imageUrl}`}
                    alt="Snapshot"
                    className="w-full max-h-72 object-contain"
                  />
                </div>
              ) : (
                <div className="bg-black/50 h-36 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-gray-700" />
                </div>
              )}
              <div className="p-6 grid grid-cols-2 gap-4 text-sm">
                {[
                  ['Severity',  selectedAlert.level?.toUpperCase()],
                  ['Person',    selectedAlert.person],
                  ['Time',      selectedAlert.timestamp ? new Date(selectedAlert.timestamp).toLocaleString() : '—'],
                  ['Details',   selectedAlert.details || '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-gray-500 text-xs mb-1">{l}</p>
                    <p className="text-white font-semibold">{v}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AlertCenter;
