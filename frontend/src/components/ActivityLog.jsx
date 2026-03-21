import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Eye, ShieldAlert, Calendar, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const defaultLogs = [
  { id: 'LOG-001', date: '1/15/2024', time: '14:32:45', camera: 'Camera 3 - Lobby', type: 'Intrusion Detected', confidence: 94, status: 'Escalated' },
  { id: 'LOG-002', date: '1/15/2024', time: '13:15:22', camera: 'Camera 1 - Front Gate', type: 'Unknown Person', confidence: 87, status: 'Verified' },
  { id: 'LOG-003', date: '1/15/2024', time: '11:45:10', camera: 'Camera 5 - Parking B', type: 'Night Movement', confidence: 72, status: 'Dismissed' },
  { id: 'LOG-004', date: '1/15/2024', time: '09:30:55', camera: 'Camera 7 - Server Room', type: 'Unauthorized Access', confidence: 89, status: 'Verified' },
  { id: 'LOG-005', date: '1/14/2024', time: '22:15:33', camera: 'Camera 9 - Loading Dock', type: 'Night Movement', confidence: 65, status: 'Detected' },
  { id: 'LOG-006', date: '1/14/2024', time: '18:45:20', camera: 'Camera 2 - Parking Lot A', type: 'Unknown Person', confidence: 78, status: 'Dismissed' },
  { id: 'LOG-007', date: '1/14/2024', time: '15:20:11', camera: 'Camera 4 - Warehouse', type: 'Intrusion Detected', confidence: 92, status: 'Escalated' },
  { id: 'LOG-008', date: '1/14/2024', time: '12:10:05', camera: 'Camera 10 - Roof Access', type: 'Unauthorized Access', confidence: 81, status: 'Verified' },
];

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Sync with frontend "database" in local storage
    const storedLogs = localStorage.getItem('intalicam_activity_logs');
    if (!storedLogs) {
      localStorage.setItem('intalicam_activity_logs', JSON.stringify(defaultLogs));
      setLogs(defaultLogs);
    } else {
      setLogs(JSON.parse(storedLogs));
    }
    
    // Polling simulation for active updates from other tabs
    const interval = setInterval(() => {
        const fresh = localStorage.getItem('intalicam_activity_logs');
        if (fresh) setLogs(JSON.parse(fresh));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => 
    log.camera.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
      total: logs.length,
      verified: logs.filter(l => l.status === 'Verified').length,
      escalated: logs.filter(l => l.status === 'Escalated').length,
      avgConfidence: logs.length ? Math.round(logs.reduce((acc, curr) => acc + curr.confidence, 0) / logs.length) : 0
  };

  const getStatusStyle = (status) => {
      switch(status) {
          case 'Escalated': return 'border-danger/40 text-danger bg-danger/5';
          case 'Verified': return 'border-safe/40 text-safe bg-safe/5';
          case 'Detected': return 'border-primary/40 text-primary bg-primary/5';
          case 'Dismissed': return 'border-dark-600 text-text-muted bg-dark-700/30';
          default: return 'border-dark-600 text-text-muted';
      }
  };
  
  const getConfidenceColor = (conf) => {
      if (conf >= 85) return 'bg-safe';
      if (conf >= 70) return 'bg-accent';
      return 'bg-danger';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity History</h1>
          <p className="text-text-muted mt-1">Complete log of all detected activities and system events</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-dark-600 bg-transparent hover:bg-dark-800 text-text-main rounded-lg transition-colors text-sm font-medium">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel p-5 flex items-center justify-between">
              <div>
                  <p className="text-sm text-text-muted mb-1 font-medium">Total Events</p>
                  <h3 className="text-3xl font-bold text-white">{stats.total}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-dark-700/50 border border-dark-600 flex items-center justify-center text-primary">
                  <Filter className="w-5 h-5" />
              </div>
          </div>
          
          <div className="panel p-5 flex items-center justify-between">
              <div>
                  <p className="text-sm text-text-muted mb-1 font-medium">Verified</p>
                  <h3 className="text-3xl font-bold text-white">{stats.verified}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-dark-700/50 border border-dark-600 flex items-center justify-center text-safe">
                  <Eye className="w-5 h-5" />
              </div>
          </div>

          <div className="panel p-5 flex items-center justify-between">
              <div>
                  <p className="text-sm text-text-muted mb-1 font-medium">Escalated</p>
                  <h3 className="text-3xl font-bold text-white">{stats.escalated}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-dark-700/50 border border-dark-600 flex items-center justify-center text-danger">
                  <ShieldAlert className="w-5 h-5" />
              </div>
          </div>

          <div className="panel p-5 flex items-center justify-between">
              <div>
                  <p className="text-sm text-text-muted mb-1 font-medium">Avg Confidence</p>
                  <h3 className="text-3xl font-bold text-white">{stats.avgConfidence}%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-dark-700/50 border border-dark-600 flex items-center justify-center text-primary">
                  <Calendar className="w-5 h-5" />
              </div>
          </div>
      </div>

      <div className="panel p-0 bg-transparent border-0 md:bg-dark-800 md:border md:border-dark-700 md:px-0 md:pt-2 overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row items-center gap-4 px-6 py-4 border-b border-dark-700/60">
          <div className="relative flex-1 w-full relative">
            <Search className="absolute left-0 top-1.5 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search activity logs..." 
              className="w-full bg-transparent border-none outline-none pl-8 py-1 text-sm text-white placeholder:text-dark-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="hidden lg:block w-px h-6 bg-dark-700 mx-2"></div>
          
          <div className="flex w-full lg:w-auto items-center gap-6 text-sm text-text-muted overflow-x-auto whitespace-nowrap">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <Calendar className="w-4 h-4" /> All Dates <span className="text-[10px] ml-1 opacity-50">▼</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> All Cameras <span className="text-[10px] ml-1 opacity-50">▼</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors text-primary border-b border-primary pb-px">
                  <Filter className="w-4 h-4" /> All Types <span className="text-[10px] ml-1">▼</span>
              </div>
          </div>
        </div>

        {/* Table layout */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="py-4 pl-6 text-[13px] font-semibold text-text-muted w-24">ID</th>
                <th className="py-4 text-[13px] font-semibold text-text-muted w-40">Date & Time</th>
                <th className="py-4 text-[13px] font-semibold text-text-muted">Camera</th>
                <th className="py-4 text-[13px] font-semibold text-text-muted text-center w-56">Activity Type</th>
                <th className="py-4 text-[13px] font-semibold text-text-muted w-32">Confidence</th>
                <th className="py-4 text-[13px] font-semibold text-text-muted w-32">Status</th>
                <th className="py-4 pr-6 text-[13px] font-semibold text-text-muted text-right w-20">Actions</th>
              </tr>
            </thead>
            <AnimatePresence>
              <motion.tbody className="text-sm border-t border-transparent">
                {filteredLogs.map((log, index) => (
                  <motion.tr 
                    key={log.id} 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-dark-700/30 hover:bg-dark-700/10 transition-colors"
                  >
                    <td className="py-3.5 pl-6 font-mono text-text-muted font-bold text-xs">{log.id}</td>
                    
                    <td className="py-3.5 flex flex-col justify-center">
                        <span className="text-white font-medium text-xs tracking-wide">{log.date}</span>
                        <span className="text-dark-600 font-mono text-[11px]">{log.time}</span>
                    </td>
                    
                    <td className="py-3.5 text-text-main font-medium text-sm">{log.camera}</td>
                    
                    <td className="py-3.5 text-center">
                        <span className="inline-flex py-1 px-3 border border-primary/40 rounded-md text-[11px] font-bold tracking-wide text-primary">
                            {log.type}
                        </span>
                    </td>
                    
                    <td className="py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                                <div className={`h-full ${getConfidenceColor(log.confidence)}`} style={{width: `${log.confidence}%`}}></div>
                            </div>
                            <span className="text-text-muted text-xs font-semibold">{log.confidence}%</span>
                        </div>
                    </td>
                    
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border \${getStatusStyle(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    
                    <td className="py-3.5 pr-6 text-right">
                      <button className="text-dark-600 hover:text-white transition-colors p-1.5 rounded-md hover:bg-dark-700">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </AnimatePresence>
          </table>
          
          {filteredLogs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500 text-sm"
            >
              No activities found matching your criteria.
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityLog;
