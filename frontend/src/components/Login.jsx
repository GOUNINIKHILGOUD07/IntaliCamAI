import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Lock, Mail, User, Eye, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../utils/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState('auth'); // auth, otp, forgot, reset
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (!isLogin) {
        // Sign Up
        await apiRequest('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });
        setIsLogin(true);
        setMessage('Account created! Please sign in.');
      } else {
        // Normal Login (Direct)
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });
        
        login(data.user, data.token);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          otp: otp
        })
      });
      
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email })
      });
      setStep('reset');
      setMessage('Reset code sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          token: resetToken,
          newPassword: newPassword
        })
      });
      setStep('auth');
      setIsLogin(true);
      setMessage('Password reset successfully! Please log in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex text-text-main font-sans">
      
      {/* Left Pane - Branding & Info */}
      <div className="hidden lg:flex w-1/2 bg-[#090b14] relative overflow-hidden flex-col justify-center p-16">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#2a1b5c]/30 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="absolute top-12 left-16 flex items-center gap-4">
          <div className="p-3 bg-dark-800 rounded-xl border border-dark-700/50 shadow-lg">
            <Shield className="text-primary w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IntalicamAI</h1>
            <p className="text-sm text-text-muted">Smart Surveillance System</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl mt-12 pb-12">
          <h2 className="text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            AI-Powered<br /><span className="text-primary">Enterprise Security</span>
          </h2>
          <p className="text-xl text-text-muted mb-8 leading-relaxed max-w-lg">
             Intelligent threat detection and real-time monitoring tailored for modern security needs.
          </p>
          <ul className="space-y-4 text-text-muted">
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> Simplified secure login</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> Real-time activity alerts</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-primary" /> Advanced person/weapon detection</li>
          </ul>
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#030408]">
        <div className="w-full max-w-md">
          
          <AnimatePresence mode="wait">
            {step === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10">
                   <h2 className="text-3xl font-bold tracking-tight mb-2">
                     {isLogin ? 'Welcome back' : 'Create account'}
                   </h2>
                   <p className="text-text-muted">
                     {isLogin ? 'Sign in to access your dashboard' : 'Join the IntalicamAI platform'}
                   </p>
                </div>

                {message && <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg mb-6 text-sm">{message}</div>}
                {error && <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg mb-6 text-sm flex items-center gap-2"><Shield className="w-4 h-4"/> {error}</div>}

                <form onSubmit={handleInitialSubmit} className="space-y-5">
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                        <input
                          type="text"
                          className="input-field pl-[42px] bg-transparent border-dark-700"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div>
                     <label className="block text-sm font-medium text-text-muted mb-2">Email Address</label>
                     <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                        <input
                          type="email"
                          className="input-field pl-[42px] bg-transparent border-dark-700"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-2">
                       <label className="block text-sm font-medium text-text-muted">Password</label>
                       {isLogin && (
                         <button type="button" onClick={() => setStep('forgot')} className="text-primary text-sm font-medium">
                           Forgot password?
                         </button>
                       )}
                     </div>
                     <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 w-[18px] h-[18px] text-dark-600" />
                        <input
                          type={showPassword ? "text" : "password"}
                          className="input-field pl-[42px] pr-10 bg-transparent border-dark-700"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                        <Eye onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 w-[18px] h-[18px] text-dark-600 cursor-pointer" />
                     </div>
                  </div>

                  {!isLogin && (
                    <div>
                       <label className="block text-sm font-medium text-text-muted mb-2">Confirm Password</label>
                       <input
                         type="password"
                         className="input-field bg-transparent border-dark-700"
                         value={formData.confirmPassword}
                         onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                         required
                       />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-primary w-full py-3.5 mt-8"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Continue' : 'Create account')} <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </form>

                <div className="mt-8 text-center text-sm text-text-muted">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-2 text-primary font-semibold"
                  >
                    {isLogin ? 'Create account' : 'Sign in'}
                  </button>
                </div>
              </motion.div>
            )}



            {step === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10">
                   <h2 className="text-3xl font-bold tracking-tight mb-2">Forgot Password</h2>
                   <p className="text-text-muted">Enter your email and we'll send you a reset code.</p>
                </div>

                {error && <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg mb-6">{error}</div>}

                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Email Address</label>
                    <input
                      type="email"
                      className="input-field bg-transparent border-dark-700"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>

                  <button onClick={() => setStep('auth')} className="w-full text-sm text-text-muted py-2">
                    Back to Login
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-10">
                   <h2 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h2>
                   <p className="text-text-muted">Enter the code from your email and your new password.</p>
                </div>

                {message && <div className="p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg mb-6">{message}</div>}
                {error && <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg mb-6">{error}</div>}

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">Reset Code</label>
                    <input
                      type="text"
                      className="input-field bg-transparent border-dark-700 text-center font-bold tracking-widest"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">New Password</label>
                    <input
                      type="password"
                      className="input-field bg-transparent border-dark-700"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
                    {loading ? 'Resetting...' : 'Update Password'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

    </div>
  );
};

export default Login;

