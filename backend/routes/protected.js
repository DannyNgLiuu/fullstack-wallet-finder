// backend/routes/protected.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/protected', verifyToken, (req, res) => {
  try {
    console.log('Protected route accessed by user:', req.user.id);
    
    // Send back minimal user info needed by the frontend
    res.json({
      message: 'Access granted to protected route',
      user: {
        id: req.user.id,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Protected route error:', error);
    res.status(500).json({ 
      message: 'Server error in protected route',
      error: error.message 
    });
  }
});

export default router;
