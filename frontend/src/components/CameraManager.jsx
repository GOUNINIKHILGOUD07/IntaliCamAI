import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Camera as CameraIcon, RefreshCw, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';

const STREAM_BASE = 'http://localhost:8000';

const validateSource = (src) => {
  const trimmed = src.trim();
  if (/^\d+$/.test(trimmed)) return true;
  if (trimmed.startsWith('rtsp://') || trimmed.startsWith('rtsps://')) return true;
  return false;
};

const EMPTY_CAM = { name: '', location: '', sourceUrl: '' };

const CameraManager = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);

  // Modal state — mode: null | 'add' | 'edit'
  const [modalMode, setModalMode] = useState(null);
  const [editingCamera, setEditingCamera] = useState(null); // full camera object when editing
  const [formData, setFormData] = useState(EMPTY_CAM);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const openAdd = () => {
    setFormData(EMPTY_CAM);
    setValidationError('');
    setModalMode('add');
  };

  const openEdit = (cam) => {
    setEditingCamera(cam);
    setFormData({ name: cam.name, location: cam.location, sourceUrl: cam.sourceUrl });
    setValidationError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingCamera(null);
    setFormData(EMPTY_CAM);
    setValidationError('');
  };

  const fetchCameras = useCallback(async () => {
    try {
      const res = await fetch(`${STREAM_BASE}/cameras`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCameras(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      const saved = localStorage.getItem('intalicam_cameras');
      if (saved) setCameras(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 5000);
    return () => clearInterval(interval);
  }, [fetchCameras]);

  useEffect(() => {
    if (cameras.length > 0) localStorage.setItem('intalicam_cameras', JSON.stringify(cameras));
  }, [cameras]);

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!validateSource(formData.sourceUrl)) {
      setValidationError('Enter a valid RTSP URL (rtsp://...) or a webcam index (e.g. 0)');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add') {
        const res = await fetch(`${STREAM_BASE}/add-camera`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add camera');
        setCameras(prev => [...prev, data]);
        showToast('success', `Camera "${data.name}" added!`);
      } else {
        const res = await fetch(`${STREAM_BASE}/cameras/${editingCamera.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update camera');
        setCameras(prev => prev.map(c => c.id === data.id ? data : c));
        showToast('success', `Camera "${data.name}" updated!`);
      }
      closeModal();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove "${name}" from the network?`)) return;
    try {
      const res = await fetch(`${STREAM_BASE}/cameras/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove camera');
      setCameras(prev => prev.filter(c => c.id !== id));
      showToast('success', `"${name}" removed.`);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-500/20 border border-green-500/40 text-green-300'
            : 'bg-red-500/20 border border-red-500/40 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Device Management</h1>
          <p className="text-gray-400 mt-1">Add, edit, or remove cameras from your surveillance network.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCameras} className="p-2 text-gray-400 hover:text-white bg-dark-800 border border-dark-700 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-5 h-5" /> Add Camera
          </button>
        </div>
      </div>

      {/* Backend offline banner */}
      {!backendOnline && !loading && (
        <div className="flex items-start gap-3 px-5 py-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-sm">
          <WifiOff className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Streaming backend not running</p>
            <p className="mt-1 font-mono text-xs bg-black/30 px-2 py-1 rounded inline-block">python streaming-backend/app.py</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Loading cameras…
        </div>
      )}

      {/* Empty state */}
      {!loading && cameras.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-4">
          <CameraIcon className="w-16 h-16 opacity-20" />
          <p className="text-lg font-medium text-gray-400">No cameras yet</p>
          <p className="text-sm text-gray-600">Click <strong>Add Camera</strong> to get started.</p>
        </div>
      )}

      {/* Camera grid */}
      {!loading && cameras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map(cam => (
            <div key={cam.id} className="glass-panel p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-dark-700 rounded-xl text-primary">
                    <CameraIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{cam.name}</h3>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${cam.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                      {cam.status || 'offline'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* Edit button */}
                  <button
                    onClick={() => openEdit(cam)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                    title="Edit camera"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(cam.id, cam.name)}
                    className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remove camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Location</span>
                  <p className="text-gray-300 font-medium mt-0.5">{cam.location || '–'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Source URL</span>
                  <p className="text-gray-300 font-mono text-xs truncate bg-dark-900 px-3 py-1.5 rounded-md mt-1 border border-dark-700">{cam.sourceUrl}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</span>
                  <p className="text-gray-300 font-medium mt-0.5">{cam.type || 'IP Camera'}</p>
                </div>
              </div>

              {/* Inline preview thumbnail */}
              <div className="mt-4 pt-4 border-t border-dark-700">
                <img
                  src={`${STREAM_BASE}/stream/${cam.id}`}
                  alt={`Preview ${cam.name}`}
                  className="w-full aspect-video object-cover rounded-lg bg-black"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              {modalMode === 'add' ? 'Add New Camera' : `Edit — ${editingCamera?.name}`}
            </h2>
            <p className="text-gray-400 text-sm mb-6 border-b border-dark-700 pb-4">
              {modalMode === 'add' ? 'Enter an RTSP URL or a webcam device index.' : 'Update the camera details below.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Front Door"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Main Entrance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Source URL <span className="text-gray-600 font-normal">(RTSP URL or webcam index)</span>
                </label>
                <input
                  type="text"
                  required
                  className={`input-field font-mono text-sm ${validationError ? 'border-danger focus:border-danger' : ''}`}
                  value={formData.sourceUrl}
                  onChange={e => { setFormData({ ...formData, sourceUrl: e.target.value }); setValidationError(''); }}
                  placeholder="rtsp://192.168.1.10:8080/h264_ulaw.sdp"
                />
                {validationError && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {validationError}
                  </p>
                )}
                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                  <p>📱 <strong>Android (IP Webcam app):</strong> <code className="bg-dark-900 px-1 rounded">rtsp://&lt;phone-ip&gt;:8080/h264_ulaw.sdp</code></p>
                  <p>💻 <strong>Local webcam:</strong> <code className="bg-dark-900 px-1 rounded">0</code></p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 px-4 bg-dark-900 border border-dark-700 text-white rounded-lg hover:bg-dark-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : (modalMode === 'add' ? 'Save Camera' : 'Update Camera')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManager;
