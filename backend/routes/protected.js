// backend/routes/protected.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user,
  });
});

export default router;
