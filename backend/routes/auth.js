import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

import { sendEmail } from '../utils/email.js';

import { findUserByEmail, addUser } from '../utils/jsonDb.js';

const router = express.Router();

// Register a new user
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    // Check if user exists
    let existingUser;
    if (isDbConnected) {
      existingUser = await User.findOne({ email });
    } else {
      existingUser = findUserByEmail(email);
    }
    
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    let user;
    if (isDbConnected) {
      user = new User({ name, email, password: hashedPassword });
      await user.save();
    } else {
      console.log('[AUTH] DB Down: Saving user to local JSON storage');
      user = addUser({ name, email, password: hashedPassword, role: 'Admin' });
    }

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login (Normal flow without OTP)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    // Check user
    let user;
    if (isDbConnected) {
      user = await User.findOne({ email });
    } else {
      user = findUserByEmail(email);
    }

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Create JWT
    const token = jwt.sign(
      { id: user._id || user.id, role: user.role || 'User' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'User'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: user ? 'User not found' : 'Email sent if user exists' });

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    await sendEmail(
      user.email,
      'Password Reset Code - IntaliCamAI',
      `Your password reset code is: ${resetToken}`,
      `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
          <h2 style="color: #ef4444;">IntaliCam Security</h2>
          <p>You requested a password reset. Use the code below:</p>
          <h1 style="letter-spacing: 5px; color: #1e293b;">${resetToken}</h1>
          <p style="color: #64748b; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    );

    res.json({ message: 'Reset code sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({ 
      email, 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
