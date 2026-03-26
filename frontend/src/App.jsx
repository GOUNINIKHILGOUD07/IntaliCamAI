import React, { useContext } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { 
  Shield, LayoutDashboard, Video, AlertTriangle, 
  History, Settings, User, LogOut, Search, Bell, Activity, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlerts } from './hooks/useAlerts';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LiveMonitor from './components/LiveMonitor';
import AlertHistory from './components/AlertHistory';
import AlertCenter from './components/AlertCenter';
import CameraManager from './components/CameraManager';
import UserProfile from './components/UserProfile';
import SettingsView from './components/Settings';
import ActivityLog from './components/ActivityLog';

// Boot theme initialization to prevent flickers
try {
  const initSet = localStorage.getItem('intalicam_settings');
  if (!initSet || JSON.parse(initSet).theme !== 'light') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch (e) {
  document.documentElement.classList.add('dark');
}

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center text-text-muted bg-dark-900">Loading initial state...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const NavigationParams = [
  { path: '/', name: 'Dashboard', icon: LayoutDashboard },
  { path: '/monitor', name: 'Live Cameras', icon: Video },
  { path: '/alerts', name: 'Live Alerts', icon: ShieldAlert, hasDynamicBadge: true },
  { path: '/history', name: 'Alert History', icon: AlertTriangle },
  { path: '/activity', name: 'Activity Log', icon: History },
  { path: '/cameras', name: 'Camera Management', icon: Settings },
  { path: '/profile', name: 'Profile', icon: User },
  { path: '/settings', name: 'Settings', icon: Settings },
];

const Sidebar = ({ unreadAlerts }) => {
  const { logout } = useContext(AuthContext);
  const location = useLocation();

  return (
    <div className="w-64 bg-dark-900 border-r border-dark-700 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 bg-dark-800 rounded-lg border border-dark-700">
          <Shield className="text-primary w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text-main leading-tight">IntalicamAI</h1>
          <p className="text-[11px] text-text-muted">Smart Surveillance</p>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {NavigationParams.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/history' && location.pathname === '/history');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                isActive ? 'bg-dark-800 text-primary border border-dark-700' : 'text-text-muted hover:text-text-main hover:bg-dark-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-main'}`} />
                <span className={`text-sm font-medium ${isActive ? 'text-text-main' : ''}`}>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {item.hasDynamicBadge && unreadAlerts > 0 && (
                <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                  {unreadAlerts}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 mt-auto space-y-4">
        {/* System Status */}
        <div className="panel p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="dot-live"></div>
            <span className="text-xs text-text-muted font-medium">System Status</span>
          </div>
          <span className="text-safe text-sm font-semibold">All Systems Operational</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full text-left text-text-muted hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Topbar = ({ unreadAlerts }) => {
  const { user } = useContext(AuthContext);
  const [avatar, setAvatar] = React.useState(localStorage.getItem(`avatar_${user?.email}`) || null);

  React.useEffect(() => {
    const updateAvatar = () => setAvatar(localStorage.getItem(`avatar_${user?.email}`) || null);
    window.addEventListener('avatar-updated', updateAvatar);
    return () => window.removeEventListener('avatar-updated', updateAvatar);
  }, [user]);

  const name = user?.name || 'John Doe';
  const role = user?.role || 'Admin';

  const getInitials = (fullName) => {
    return fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-dark-700 bg-dark-900 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="flex items-center bg-dark-800 border border-dark-700 rounded-lg px-3 w-96 focus-within:border-primary transition-colors">
        <Search className="w-4 h-4 text-text-muted" />
        <input 
          type="text" 
          placeholder="Search cameras, alerts, activity..." 
          className="bg-transparent border-none outline-none text-sm text-text-main px-3 py-2 w-full placeholder:text-dark-600"
        />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-6">
        <div className="badge-live">
          <div className="dot-live"></div> LIVE
        </div>

        <button className="relative text-text-muted hover:text-text-main transition-colors">
          <Bell className="w-5 h-5" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white border-2 border-dark-900">
              {unreadAlerts}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-dark-700 pl-6 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm border border-primary/30 shadow-inner overflow-hidden">
            {avatar ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" /> : getInitials(name)}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-text-main leading-none">{name}</p>
            <p className="text-xs text-text-muted mt-1 leading-none">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Page Transition Wrapper
const PageWrapper = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
         {children}
      </motion.div>
    </AnimatePresence>
  )
}

const Layout = ({ children }) => {
  // Use the centralised real-time alert hook for the unread count
  const { pendingCount: unreadAlerts } = useAlerts();

  return (
    <div className="flex bg-dark-900 min-h-screen">
      <Sidebar unreadAlerts={unreadAlerts} />
      <div className="flex-1 ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar unreadAlerts={unreadAlerts} />
        <main className="flex-1 p-8">
          <PageWrapper>
            {children}
          </PageWrapper>
        </main>
      </div>
    </div>
  );
};

// Placeholder for new routes
const PlaceholderView = ({ title }) => (
  <div className="panel p-12 text-center text-text-muted flex flex-col items-center justify-center h-64">
    <Activity className="w-12 h-12 mb-4 opacity-20" />
    <h2 className="text-xl font-medium text-text-main">{title}</h2>
    <p className="mt-2 text-sm">This module is under construction.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitor" element={<LiveMonitor />} />
              <Route path="/alerts" element={<AlertCenter />} />
              <Route path="/history" element={<AlertHistory />} />
              <Route path="/cameras" element={<CameraManager />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default App;
