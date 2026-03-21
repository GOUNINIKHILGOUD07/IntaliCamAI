import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Lock, Mail, User, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const savedUsersStr = localStorage.getItem('intalicam_registered_users');
    let savedUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
    
    const userIndex = savedUsers.findIndex(u => u.email === resetEmail);
    if (userIndex === -1) {
      alert("No account found with this email!");
      return;
    }
    
    savedUsers[userIndex].password = resetPassword;
    localStorage.setItem('intalicam_registered_users', JSON.stringify(savedUsers));
    
    alert("Password reset successfully! You can now log in.");
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Signup validation
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Bypassing the actual backend API for now since MongoDB is not present locally
    // Emulating a real database using localStorage so users persist and login actually works
    setTimeout(() => {
      setLoading(false);
      
      const savedUsersStr = localStorage.getItem('intalicam_registered_users');
      const savedUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];

      if (!isLogin) {
        // Handle Registration
        const exists = savedUsers.find(u => u.email === formData.email);
        if (exists) {
          setError('An account with this email already exists.');
          return;
        }

        const newUser = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password, // MOCK: storing plaintext locally just for UI demonstration
          role: 'Admin'
        };

        savedUsers.push(newUser);
        localStorage.setItem('intalicam_registered_users', JSON.stringify(savedUsers));
        
        setIsLogin(true);
        setFormData({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
        alert('Account created successfully! Please sign in with your new credentials.');
      } else {
        // Handle Login
        const user = savedUsers.find(u => u.email === formData.email && u.password === formData.password);
        if (!user) {
          setError('Invalid email or password. Please try again or create an account first.');
          return;
        }

        // Record this real-time login event in the Activity Logs
        const existingLogsStr = localStorage.getItem('intalicam_activity_logs');
        let existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [
          { id: 'LOG-001', date: '1/15/2024', time: '14:32:45', camera: 'Camera 3 - Lobby', type: 'Intrusion Detected', confidence: 94, status: 'Escalated' },
          { id: 'LOG-002', date: '1/15/2024', time: '13:15:22', camera: 'Camera 1 - Front Gate', type: 'Unknown Person', confidence: 87, status: 'Verified' },
          { id: 'LOG-003', date: '1/15/2024', time: '11:45:10', camera: 'Camera 5 - Parking B', type: 'Night Movement', confidence: 72, status: 'Dismissed' }
        ];

        const now = new Date();
        const newLogId = existingLogs.length > 0 
          ? `LOG-${String(parseInt(existingLogs[0].id.split('-')[1]) + 1).padStart(3, '0')}`
          : 'LOG-001';

        const newLoginEvent = {
          id: newLogId,
          date: `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`,
          time: now.toTimeString().split(' ')[0],
          camera: 'System Auth Node',
          type: 'Secure Login',
          confidence: 100,
          status: 'Verified'
        };

        localStorage.setItem('intalicam_activity_logs', JSON.stringify([newLoginEvent, ...existingLogs]));

        login({ name: user.name, email: user.email, role: user.role }, 'mock-jwt-token-123');
        navigate('/');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex text-text-main font-sans">
      
      {/* Left Pane - Branding & Info (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[#090b14] relative overflow-hidden flex-col justify-center p-16">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#2a1b5c]/30 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Branding Header */}
        <div className="absolute top-12 left-16 flex items-center gap-4">
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700/50 shadow-lg">
            <Shield className="text-primary w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IntalicamAI</h1>
            <p className="text-sm text-text-muted">Smart Surveillance System</p>
          </div>
        </div>

        {/* Main Marketing Copy */}
        <div className="relative z-10 max-w-xl mt-12 pb-12 border-b border-dark-700/50">
          <h2 className="text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            {isLogin ? (
              <>AI-Powered<br /><span className="text-primary">Security Monitoring</span></>
            ) : (
              <>Start Protecting<br /><span className="text-primary pr-2">Your Premises Today</span></>
            )}
          </h2>
          <p className="text-xl text-text-muted mb-8 leading-relaxed max-w-lg pr-4">
            {isLogin 
              ? "Protect your premises with intelligent camera surveillance. Real-time threat detection powered by advanced AI algorithms." 
              : "Join thousands of businesses using AI-powered surveillance to keep their properties safe around the clock."}
          </p>

          {isLogin ? (
            <ul className="space-y-4 text-text-muted">
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary/70" /> Real-time suspicious activity detection</li>
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary/70" /> Instant alert notifications</li>
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary/70" /> 24/7 automated monitoring</li>
              <li className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary/70" /> Multi-camera management</li>
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-6 mt-12">
               <div className="panel p-6 bg-dark-800/40 border-dark-700/50 hover:border-primary/50 transition-colors">
                 <h4 className="text-primary text-3xl font-bold">10K+</h4>
                 <p className="text-sm text-text-muted mt-1">Active Users</p>
               </div>
               <div className="panel p-6 bg-dark-800/40 border-dark-700/50 hover:border-primary/50 transition-colors">
                 <h4 className="text-primary text-3xl font-bold">50K+</h4>
                 <p className="text-sm text-text-muted mt-1">Cameras Connected</p>
               </div>
               <div className="panel p-6 bg-dark-800/40 border-dark-700/50 hover:border-primary/50 transition-colors">
                 <h4 className="text-primary text-3xl font-bold">99.9%</h4>
                 <p className="text-sm text-text-muted mt-1">Uptime</p>
               </div>
               <div className="panel p-6 bg-dark-800/40 border-dark-700/50 hover:border-primary/50 transition-colors">
                 <h4 className="text-primary text-3xl font-bold">1M+</h4>
                 <p className="text-sm text-text-muted mt-1">Threats Detected</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#030408]">
        <div className="w-full max-w-md">
          
          <div className="mb-10 text-center lg:text-left">
             <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
               <div className="p-2 bg-dark-800 rounded-lg border border-dark-700/50">
                 <Shield className="text-primary w-6 h-6" />
               </div>
               <div className="text-left">
                 <h1 className="text-xl font-bold tracking-tight">IntalicamAI</h1>
               </div>
             </div>
             
             <h2 className="text-3xl font-bold tracking-tight mb-2">
               {isLogin ? 'Welcome back' : 'Create your account'}
             </h2>
             <p className="text-text-muted">
               {isLogin ? 'Sign in to access your surveillance dashboard' : 'Get started with IntalicamAI surveillance platform'}
             </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2 overflow-hidden"
              >
                <Shield className="w-4 h-4 shrink-0" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Signup Fields */}
            {!isLogin && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="input-field pl-[42px] bg-transparent border-dark-700"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-dark-600 text-sm">📞</span>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      className="input-field pl-[42px] bg-transparent border-dark-700"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Field */}
            <div>
               <label className="block text-sm font-medium text-text-muted mb-2">Email Address</label>
               <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="input-field pl-[42px] bg-transparent border-dark-700"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
               </div>
            </div>

            {/* Password Field */}
            <div>
               <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-medium text-text-muted">Password</label>
                 {isLogin && <button type="button" onClick={() => setForgotPasswordOpen(true)} className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">Forgot password?</button>}
               </div>
               <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                    className="input-field pl-[42px] pr-10 bg-transparent border-dark-700"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Eye onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 w-[18px] h-[18px] text-dark-600 cursor-pointer hover:text-text-muted transition-colors" />
               </div>
            </div>

            {/* Confirm Password (Signup only) */}
            {!isLogin && (
              <div>
                 <label className="block text-sm font-medium text-text-muted mb-2">Confirm Password</label>
                 <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="input-field pl-[42px] pr-10 bg-transparent border-dark-700"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                    <Eye onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-3.5 w-[18px] h-[18px] text-dark-600 cursor-pointer hover:text-text-muted transition-colors" />
                 </div>
              </div>
            )}

            {/* Remember Me / Terms */}
            {isLogin ? (
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" className="rounded w-4 h-4 bg-dark-800 border-dark-600 checked:bg-primary" />
                <span className="text-sm text-text-muted">Remember me for 30 days</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4 text-sm text-text-muted">
                <input type="checkbox" required className="rounded w-4 h-4 bg-dark-800 border-dark-600 checked:bg-primary" />
                <span>I agree to the <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> and <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span></span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full py-3.5 mt-8 font-semibold tracking-wide"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create account')} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-text-muted">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', phone: '', email: '', password: '', confirmPassword: '' });
                setError('');
              }}
              className="ml-2 text-primary hover:text-primary-hover font-semibold transition-colors"
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </div>

          {/* Secure Connection Badge */}
          {isLogin && (
            <div className="mt-12 p-4 border border-dark-700/50 rounded-xl bg-dark-800/30 flex items-center gap-4">
               <Lock className="w-5 h-5 text-text-muted" />
               <div>
                  <p className="text-sm font-medium text-text-main">Secure Connection</p>
                  <p className="text-xs text-text-muted">Your connection is encrypted with 256-bit SSL</p>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel max-w-sm w-full p-6 relative">
            <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
            <p className="text-sm text-text-muted mb-6">Enter your registered email and a new password.</p>
            
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-dark-600" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition-colors"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-600" />
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition-colors"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-dark-700">
                <button type="button" onClick={() => setForgotPasswordOpen(false)} className="flex-1 py-2 bg-dark-800 hover:bg-dark-700 font-medium text-white rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2 text-sm">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
