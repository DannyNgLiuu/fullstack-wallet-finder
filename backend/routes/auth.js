// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Access control configuration
const getAccessControl = () => {
  const isAccessControlEnabled = process.env.ENABLE_ACCESS_CONTROL === 'true';
  const allowedUsers = isAccessControlEnabled && process.env.ALLOWED_USERS 
    ? process.env.ALLOWED_USERS.split(',').map(email => email.trim().toLowerCase())
    : [];

  console.log('Access Control Status:', {
    isEnabled: isAccessControlEnabled,
    allowedUsers: allowedUsers
  });
  
  return { isAccessControlEnabled, allowedUsers };
};

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { isAccessControlEnabled, allowedUsers } = getAccessControl();
    
    // Check if email is in allowed users list when access control is enabled
    if (isAccessControlEnabled && !allowedUsers.includes(email.toLowerCase())) {
      console.log('Registration denied for:', email.toLowerCase());
      console.log('Allowed users:', allowedUsers);
      return res.status(403).json({ message: 'Registration not allowed' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ email, passwordHash });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { isAccessControlEnabled, allowedUsers } = getAccessControl();

    // Debug logging for email comparison
    console.log('Login attempt:', {
      attemptEmail: email.toLowerCase(),
      isEnabled: isAccessControlEnabled,
      allowedUsers: allowedUsers,
      isAllowed: allowedUsers.includes(email.toLowerCase())
    });

    // Check if email is in allowed users list when access control is enabled
    if (isAccessControlEnabled && !allowedUsers.includes(email.toLowerCase())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({ token, user: { email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;
