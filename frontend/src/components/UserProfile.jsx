import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Camera as CameraIcon, Lock, Eye, Upload, Video, X } from 'lucide-react';

const UserProfile = () => {
  const { user, login } = useContext(AuthContext);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  
  const [avatar, setAvatar] = useState(localStorage.getItem(`avatar_${user?.email}`) || null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  
  // Webcam state
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const name = isEditing ? formData.name : (user?.name || 'Admin User');
  const email = user?.email || 'name@company.com';
  const phone = isEditing ? formData.phone : (user?.phone || 'Not provided');
  const role = user?.role || 'Administrator';

  const getInitials = (fullName) => {
    return fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleSaveProfile = () => {
    // Save to AuthContext/localStorage
    const savedUsersStr = localStorage.getItem('intalicam_registered_users');
    let savedUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
    
    // Update local DB
    savedUsers = savedUsers.map(u => {
      if (u.email === user.email) {
        return { ...u, name: formData.name, phone: formData.phone };
      }
      return u;
    });
    localStorage.setItem('intalicam_registered_users', JSON.stringify(savedUsers));
    
    // Update active context user
    const updatedUser = { ...user, name: formData.name, phone: formData.phone };
    login(updatedUser, localStorage.getItem('token') || 'mock-jwt-token-123'); // retains session
    
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        alert("New passwords do not match.");
        return;
    }
    
    // Find and update password in local DB
    const savedUsersStr = localStorage.getItem('intalicam_registered_users');
    let savedUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
    
    const dbUser = savedUsers.find(u => u.email === user.email);
    if (dbUser && dbUser.password !== passwords.current) {
        alert("Current password is incorrect!");
        return;
    }

    savedUsers = savedUsers.map(u => {
      if (u.email === user.email) return { ...u, password: passwords.new };
      return u;
    });
    localStorage.setItem('intalicam_registered_users', JSON.stringify(savedUsers));

    alert("Password updated successfully!");
    setPasswords({ current: '', new: '', confirm: '' });
  };

  // ---------------- PHOTO UPLOAD & WEBCAM LOGIC ---------------- //

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setAvatar(base64);
        localStorage.setItem(`avatar_${user?.email}`, base64);
        window.dispatchEvent(new Event('avatar-updated'));
        setPhotoModalOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startWebcam = async () => {
    setWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Could not access webcam. Please ensure permissions are granted.");
      setWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg');
      
      setAvatar(base64);
      localStorage.setItem(`avatar_${user?.email}`, base64);
      window.dispatchEvent(new Event('avatar-updated'));
      
      stopWebcam();
      setPhotoModalOpen(false);
    }
  };

  // Cleanup webcam if modal closes
  useEffect(() => {
    if (!photoModalOpen) {
      stopWebcam();
    }
  }, [photoModalOpen]);


  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">User Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your account information and security settings</p>
      </div>

      {/* Profile Info Card */}
      <div className="panel p-6 flex flex-col md:flex-row items-start gap-8 relative">
        
        {isEditing ? (
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-dark-700 hover:text-white text-sm font-medium text-text-muted rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={handleSaveProfile} className="btn-primary py-2 px-4 shadow-lg text-sm">
              Save Changes
            </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="absolute top-6 right-6 px-4 py-2 border border-dark-700 bg-dark-800 hover:bg-dark-700 text-sm font-medium text-white rounded-lg transition-colors">
            Edit Profile
          </button>
        )}

        <div className="flex flex-col items-center gap-4 shrink-0">
          {/* Avatar */}
          <div 
            className="w-28 h-28 rounded-full bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary relative overflow-hidden group cursor-pointer"
            onClick={() => setPhotoModalOpen(true)}
          >
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
            ) : (
              <span className="text-3xl font-bold group-hover:opacity-0 transition-opacity">{getInitials(name)}</span>
            )}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <CameraIcon className="w-8 h-8 text-white/80" />
            </div>
          </div>
          <button 
            onClick={() => setPhotoModalOpen(true)}
            className="flex items-center gap-2 text-xs font-medium text-text-main bg-dark-800 border border-dark-700 hover:bg-dark-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CameraIcon className="w-3.5 h-3.5" /> Change Photo
          </button>
        </div>

        <div className="flex-1 w-full pt-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium tracking-wide">
              <Shield className="w-3.5 h-3.5" /> {role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Full Name</p>
              {isEditing ? (
                <input 
                  className="input-field mt-1 w-full" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              ) : (
                <p className="text-sm text-white font-medium break-all">{name}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Email Address</p>
              <p className="text-sm text-white font-medium opacity-70 cursor-not-allowed" title="Email cannot be changed">{email}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Phone Number</p>
              {isEditing ? (
                <input 
                  className="input-field mt-1 w-full" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              ) : (
                <p className="text-sm text-white font-medium">{phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Department</p>
              <p className="text-sm text-white font-medium">Security Operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Actions Card */}
      <div className="panel p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
           <Lock className="w-5 h-5 text-primary" /> Change Password
        </h3>
        
        <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-600" />
              <input
                type={showPassword.current ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-dark-600"
                value={passwords.current}
                onChange={e => setPasswords({...passwords, current: e.target.value})}
                required
              />
              <Eye 
                className="absolute right-3 top-2.5 w-4 h-4 text-dark-600 cursor-pointer hover:text-white transition-colors"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-600" />
              <input
                type={showPassword.new ? "text" : "password"}
                placeholder="Enter new password"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-dark-600"
                value={passwords.new}
                onChange={e => setPasswords({...passwords, new: e.target.value})}
                required
              />
              <Eye 
                className="absolute right-3 top-2.5 w-4 h-4 text-dark-600 cursor-pointer hover:text-white transition-colors"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-600" />
              <input
                type={showPassword.confirm ? "text" : "password"}
                placeholder="Confirm new password"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-10 py-2.5 text-sm text-white focus:border-primary outline-none transition-colors placeholder:text-dark-600"
                value={passwords.confirm}
                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                required
              />
              <Eye 
                className="absolute right-3 top-2.5 w-4 h-4 text-dark-600 cursor-pointer hover:text-white transition-colors"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 mt-2 shadow-lg shadow-primary/20">
            Update Password
          </button>
        </form>
      </div>

      {/* Photo Modals */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel max-w-lg w-full p-6 relative">
            <button onClick={() => setPhotoModalOpen(false)} className="absolute top-4 right-4 text-dark-600 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">Update Profile Photo</h3>

            {!webcamActive ? (
              <div className="grid grid-cols-2 gap-4">
                <label className="border-2 border-dashed border-dark-600 hover:border-primary rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-dark-800/50">
                  <Upload className="w-8 h-8 text-primary mb-3" />
                  <span className="text-sm font-medium text-white">Upload Image</span>
                  <span className="text-xs text-text-muted mt-1">From file explorer</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                
                <button onClick={startWebcam} className="border-2 border-dashed border-dark-600 hover:border-primary rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-dark-800/50">
                  <Video className="w-8 h-8 text-primary mb-3" />
                  <span className="text-sm font-medium text-white">Take Photo</span>
                  <span className="text-xs text-text-muted mt-1">Using webcam</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black rounded-xl overflow-hidden aspect-video relative">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-4">
                  <button onClick={stopWebcam} className="flex-1 py-3 bg-dark-800 hover:bg-dark-700 font-medium text-white rounded-lg">Cancel</button>
                  <button onClick={capturePhoto} className="flex-1 btn-primary py-3">Capture Photo</button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            
            {avatar && !webcamActive && (
              <div className="mt-6 pt-6 border-t border-dark-700 flex justify-center">
                <button onClick={() => { setAvatar(null); localStorage.removeItem(`avatar_${user?.email}`); window.dispatchEvent(new Event('avatar-updated')); setPhotoModalOpen(false); }} className="text-danger text-sm hover:underline">
                  Remove current photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default UserProfile;
