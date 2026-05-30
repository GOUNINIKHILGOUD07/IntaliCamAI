import React, { useState, useEffect } from 'react';
import { Film, Download, Clock, HardDrive } from 'lucide-react';

const STREAM_BASE = import.meta.env.VITE_STREAM_BASE || 'http://localhost:8000';

const Recordings = () => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${STREAM_BASE}/recordings`)
      .then(r => r.json())
      .then(data => {
        setRecordings(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const formatSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (filename) => {
    // Expected format: {camID}_{YYYYMMDD}_{HHMMSS}.mp4
    const match = filename.match(/_(\d{8})_(\d{6})\.mp4/);
    if (!match) return filename;
    
    // Parse YYYYMMDD and HHMMSS
    const datePart = match[1];
    const timePart = match[2];
    
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const hour = timePart.substring(0, 2);
    const minute = timePart.substring(2, 4);
    const second = timePart.substring(4, 6);
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Saved Recordings</h1>
          <p className="text-sm text-text-muted mt-1">Review and manage your camera footage archives</p>
        </div>
        <div className="badge-offline px-4 py-1.5 shadow-[0_0_15px_rgba(99,102,241,0.2)] bg-primary/20 text-primary border border-primary/30">
          <Film className="w-4 h-4 mr-2" /> Storage Active
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-500">Loading recordings...</div>
      ) : recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-4">
          <Film className="w-16 h-16 opacity-20" />
          <p className="text-lg font-medium text-gray-400">No recordings yet</p>
          <p className="text-sm text-gray-600">Start recording from the dashboard or live monitor to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recordings.map((rec) => (
            <div key={rec.filename} className="panel flex flex-col border-dark-700 bg-dark-900 overflow-hidden">
               <div className="w-full aspect-video bg-black flex items-center justify-center relative group p-2">
                 <video 
                   controls 
                   src={`${STREAM_BASE}/recordings/${rec.filename}`}
                   className="max-h-full w-full object-contain rounded border border-dark-700/50"
                 ></video>
               </div>
               
               <div className="p-4 bg-dark-800 border-t border-dark-700">
                 <h4 className="text-sm font-bold text-text-main truncate" title={rec.filename}>{rec.filename}</h4>
                 
                 <div className="flex justify-between items-center mt-3">
                   <div className="flex gap-4">
                     <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDate(rec.filename)}</span>
                     <span className="text-xs text-text-muted flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {formatSize(rec.size)}</span>
                   </div>
                   <div className="flex gap-2">
                     <a href={`${STREAM_BASE}/recordings/${rec.filename}`} download className="p-1.5 text-gray-400 hover:text-white bg-dark-700 hover:bg-primary/50 border border-dark-600 transition-colors rounded">
                        <Download className="w-4 h-4" />
                     </a>
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recordings;
