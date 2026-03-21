import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cameras = ['Main Entrance', 'Back Alley', 'Server Room', 'Parking Lot', 'Lobby', 'Storage Area'];
const anomalyTypes = ['Person Detected', 'Motion Detected', 'Unauthorized Access', 'Vehicle Detected', 'Perimeter Breach', 'Loitering Detected'];
const levels = ['low', 'medium', 'high', 'critical'];

const AlertHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alerts, setAlerts] = useState([]);
  
  const refreshAlerts = () => {
     const arr = JSON.parse(localStorage.getItem('intalicam_alerts')) || [];
     setAlerts(arr);
  };

  useEffect(() => {
    refreshAlerts();
    window.addEventListener('alerts-updated', refreshAlerts);
    return () => window.removeEventListener('alerts-updated', refreshAlerts);
  }, []);

  const handleResolve = (id) => {
      const updated = alerts.map(a => 
          a.id === id ? { ...a, status: 'RESOLVED' } : a
      );
      setAlerts(updated);
      localStorage.setItem('intalicam_alerts', JSON.stringify(updated));
      window.dispatchEvent(new Event('alerts-updated'));
  };

  const filteredAlerts = alerts.filter(alert => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = alert.camera.toLowerCase().includes(term) ||
                          alert.type.toLowerCase().includes(term) ||
                          alert.id.toString().includes(term);
    const matchesSeverity = severityFilter === 'all' || alert.level === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityData = (level) => {
    switch(level) {
      case 'critical': return { icon: <AlertOctagon className="w-4 h-4" />, style: 'text-[#dc2626] border-[#dc2626]' };
      case 'high': return { icon: <AlertTriangle className="w-4 h-4" />, style: 'text-[#eab308] border-[#eab308]' };
      case 'medium': return { icon: <AlertTriangle className="w-4 h-4" />, style: 'text-[#eab308] border-[#eab308]' };
      default: return { icon: <Info className="w-4 h-4" />, style: 'text-[#6366f1] border-[#6366f1]' };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-text-muted mt-1">Review real-time AI security events and history.</p>
        </div>
      </div>

      <div className="panel p-0 bg-transparent border-0 md:bg-dark-800 md:border md:border-dark-700 md:p-6 overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by ID, camera or alert type..." 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-4 py-3 pl-10 text-white focus:outline-none focus:border-primary placeholder:text-dark-600 transition-colors" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setFilterOpen(!filterOpen)} 
              className="flex items-center gap-2 px-6 py-3 bg-dark-900 border border-dark-700 rounded-lg text-text-muted hover:text-white hover:bg-dark-800 font-medium transition-colors"
            >
              <Filter className="w-4 h-4" /> Filter
              {(severityFilter !== 'all' || statusFilter !== 'all') && (
                <div className="w-2 h-2 rounded-full bg-primary mt-0.5 ml-1" />
              )}
            </button>
            
            <AnimatePresence>
              {filterOpen && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 10 }}
                   className="absolute right-0 top-14 w-64 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl z-50 p-4"
                >
                   <div className="mb-4">
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Severity</label>
                      <select 
                         value={severityFilter} 
                         onChange={(e) => setSeverityFilter(e.target.value)} 
                         className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      >
                          <option value="all">All Severities</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                      </select>
                   </div>
                   <div className="mb-5">
                      <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Status</label>
                      <select 
                         value={statusFilter} 
                         onChange={(e) => setStatusFilter(e.target.value)} 
                         className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                      >
                          <option value="all">All Statuses</option>
                          <option value="PENDING">Pending</option>
                          <option value="RESOLVED">Resolved</option>
                      </select>
                   </div>
                   <button 
                      onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); setFilterOpen(false); }} 
                      className="w-full py-2 bg-dark-700 hover:bg-dark-600 text-sm font-semibold text-white rounded-lg transition-colors border border-dark-600"
                   >
                      Clear Filters & Close
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Real-time Status Indicator hidden in tool bar usually, let's keep it simple */}

        {/* Table layout matching the user's mockup */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="pb-4 pl-4 text-sm font-semibold text-text-muted">Alert ID</th>
                <th className="pb-4 text-sm font-semibold text-text-muted">Severity</th>
                <th className="pb-4 text-sm font-semibold text-text-muted">Detection Type</th>
                <th className="pb-4 text-sm font-semibold text-text-muted">Camera Source</th>
                <th className="pb-4 text-sm font-semibold text-text-muted">Date & Time</th>
                <th className="pb-4 text-sm font-semibold text-text-muted">Status</th>
                <th className="pb-4 text-sm font-semibold text-text-muted tracking-wider">Action</th>
              </tr>
            </thead>
            <AnimatePresence>
              <motion.tbody className="text-sm border-t border-transparent">
                <tr className="h-4"></tr> {/* Spacing row */}
                {filteredAlerts.map((alert, index) => {
                  const severity = getSeverityData(alert.level);
                  return (
                    <motion.tr 
                      key={alert.id} 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-dark-700/30 hover:bg-dark-700/10 transition-colors"
                    >
                      {/* Alert ID */}
                      <td className="py-5 pl-4 font-mono text-dark-600 font-medium">#{alert.id}</td>
                      
                      {/* Severity Pill */}
                      <td className="py-5">
                        <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border bg-transparent \${severity.style}`}>
                          {severity.icon}
                          {alert.level.toUpperCase()}
                        </span>
                      </td>
                      
                      {/* Detection Type */}
                      <td className="py-5 font-bold text-white tracking-wide">{alert.type}</td>
                      
                      {/* Camera Source */}
                      <td className="py-5 text-text-muted font-medium">{alert.camera}</td>
                      
                      {/* Date & Time */}
                      <td className="py-5 text-dark-600 font-mono text-xs font-semibold">{alert.timestamp}</td>
                      
                      {/* Status */}
                      <td className="py-5">
                        <span className={`font-bold text-xs tracking-wider \${alert.status === 'PENDING' ? 'text-white' : 'text-text-muted'}`}>
                          {alert.status}
                        </span>
                      </td>
                      
                      {/* Action */}
                      <td className="py-5">
                        <button 
                          onClick={() => handleResolve(alert.id)}
                          className="text-primary hover:text-primary-hover font-bold text-sm transition-colors"
                        >
                          {alert.status === 'PENDING' ? 'Mark Resolved' : 'View Details'}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </motion.tbody>
            </AnimatePresence>
          </table>
          
          {filteredAlerts.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500"
            >
              No alerts found matching your criteria.
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AlertHistory;
