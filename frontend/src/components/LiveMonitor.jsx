import React, { useState, useEffect, useRef } from 'react';
import { Camera as CameraIcon, Search, RefreshCw, LayoutGrid, List, Filter } from 'lucide-react';

const STREAM_BASE = 'http://localhost:8000';

const CameraFeed = ({ cam, statusOverride }) => {
  const [streamStatus, setStreamStatus] = useState('loading'); // loading | live | offline
  const imgRef = useRef(null);
  const retryTimer = useRef(null);

  const streamUrl = `${STREAM_BASE}/stream/${cam.id}`;
  
  // For the sake of the mockup demonstration, randomly assign one 'alert' and one 'offline' 
  // if not explicitly set by the real backend (since our backend only knows 'online'/'offline')
  const displayStatus = statusOverride || cam.status; 
  const isAlert = displayStatus === 'alert';
  const isOffline = displayStatus === 'offline';

  const retryStream = () => {
    setStreamStatus('loading');
    if (imgRef.current) {
      imgRef.current.src = `${streamUrl}?t=${Date.now()}`;
    }
  };

  useEffect(() => {
    return () => clearTimeout(retryTimer.current);
  }, []);

  const handleLoad = () => {
    setStreamStatus('live');
    clearTimeout(retryTimer.current);
  };

  const handleError = () => {
    setStreamStatus('offline');
    retryTimer.current = setTimeout(retryStream, 5000);
  };

  return (
    <div className={`panel flex flex-col h-72 transition-all duration-300 ${isAlert ? 'border-danger shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'border-dark-700'}`}>
      
      {/* Video Area */}
      <div className="relative flex-1 bg-black/80 overflow-hidden flex items-center justify-center group">
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {(!isOffline && !isAlert) && <div className="badge-live"><div className="dot-live"></div> LIVE</div>}
          {isAlert && <div className="badge-rec"><div className="w-1.5 h-1.5 rounded-full bg-danger"></div> ALERT</div>}
          {isOffline && <div className="badge-offline"><div className="dot-offline"></div> OFFLINE</div>}
        </div>
        
        <div className="absolute top-4 right-4 z-10">
          {!isOffline && <div className="badge-rec"><div className="dot-rec animate-pulse"></div> REC</div>}
        </div>

        {/* Central Animated Ring Indicator (shown when no feed OR as decorative element matching mockup) */}
        {!isOffline && streamStatus !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className={`w-16 h-16 rounded-full border-2 ${isAlert ? 'border-danger/40' : 'border-safe/40'} flex items-center justify-center`}>
              <div className={`w-10 h-10 rounded-full border-2 ${isAlert ? 'border-danger flex items-center justify-center' : 'border-safe'} animate-[pulse_2s_ease-in-out_infinite]`}></div>
            </div>
          </div>
        )}

        {/* Actual Video Stream */}
        {!isOffline && (
           <img
             ref={imgRef}
             src={streamUrl}
             alt={`Stream for ${cam.name}`}
             className={`w-full h-full object-cover transition-opacity duration-500 ${streamStatus === 'live' ? 'opacity-100' : 'opacity-0'}`}
             onLoad={handleLoad}
             onError={handleError}
           />
        )}

        {/* Info overlay (bottom) */}
        <div className="absolute bottom-4 left-4 z-10">
          <h3 className="text-white font-bold text-sm tracking-wide">{cam.name}</h3>
          <p className="text-gray-400 text-xs">{cam.location}</p>
        </div>
        
        {/* Subtle gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>
      </div>
    </div>
  );
};

// ─── LiveMonitor Page ─────────────────────────────────────────────────────────
const LiveMonitor = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${STREAM_BASE}/cameras`);
      if (res.ok) {
        const data = await res.json();
        setCameras(data);
      } else {
        throw new Error('Failed');
      }
    } catch (e) {
      const saved = localStorage.getItem('intalicam_cameras');
      if (saved) setCameras(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, []);

  // For demonstration to match the mockup exactly, we will force some states 
  // if we have enough cameras, otherwise we just show what we have.
  const displayCameras = cameras.map((c, i) => {
    let override = c.status;
    if (i === 2) override = 'alert'; // 3rd camera is alert (like Lobby in mockup)
    if (i === 5) override = 'offline'; // 6th camera offline
    return { ...c, displayStatus: override };
  });

  const onlineCount = displayCameras.filter(c => c.displayStatus === 'online' || c.displayStatus === 'live' || !c.displayStatus).length;
  const alertCount = displayCameras.filter(c => c.displayStatus === 'alert').length;
  const offlineCount = displayCameras.filter(c => c.displayStatus === 'offline').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Live Camera Monitoring</h1>
          <p className="text-sm text-text-muted mt-1">View and manage all surveillance cameras in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge-live px-3 py-1.5"><div className="dot-live"></div> {onlineCount} Online</div>
          <div className="badge-rec px-3 py-1.5"><div className="dot-rec"></div> {alertCount} Alert</div>
          <div className="badge-offline px-3 py-1.5"><div className="dot-offline"></div> {offlineCount} Offline</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search cameras..." 
              className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-dark-600"
            />
          </div>
          
          <select className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-text-muted outline-none focus:border-primary appearance-none pr-8 relative">
            <option>All Status</option>
            <option>Online</option>
            <option>Alert</option>
            <option>Offline</option>
          </select>

          <select className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-text-muted outline-none focus:border-primary appearance-none pr-8">
            <option>All Zones</option>
            <option>Building A</option>
            <option>East Wing</option>
            <option>Main Building</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchCameras} className="p-2 bg-dark-800 border border-dark-700 rounded-lg text-text-muted hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex bg-dark-800 border border-dark-700 rounded-lg p-1">
            <button className="p-1 px-2 bg-primary/20 text-primary rounded-md"><LayoutGrid className="w-4 h-4" /></button>
            <button className="p-1 px-2 text-text-muted hover:text-white rounded-md transition-colors"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!loading && cameras.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted border border-dashed border-dark-700 rounded-xl">
          <CameraIcon className="w-12 h-12 mb-4 opacity-20" />
          <h2 className="text-xl font-medium text-text-main">No cameras configured</h2>
          <p className="mt-2 text-sm">Add a camera in the Management tab to view live feeds.</p>
        </div>
      )}

      {/* Camera Grid */}
      {!loading && cameras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 pb-8">
          {displayCameras.map(cam => (
            <CameraFeed key={cam.id} cam={cam} statusOverride={cam.displayStatus} />
          ))}
          {/* Mock paddings to fill grid if only 1-2 cameras exist */}
          {displayCameras.length < 6 && Array.from({length: 6 - displayCameras.length}).map((_, i) => (
            <div key={`mock-${i}`} className="panel flex flex-col h-72 border-dark-700 opacity-50">
               <div className="relative flex-1 bg-black/50 overflow-hidden flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-safe/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-safe/40"></div>
                  </div>
               </div>
               <div className="absolute bottom-4 left-4 z-10">
                  <h3 className="text-white/50 font-bold text-sm">Camera {displayCameras.length + i + 1}</h3>
                  <p className="text-gray-500/50 text-xs">Unassigned</p>
                </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;
