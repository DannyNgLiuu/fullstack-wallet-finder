import express from 'express';
import jwt from 'jsonwebtoken';
import TokenScanner from '../services/tokenScanner.js';
import { findIntersections } from '../utils/intersectionFinder.js';

const router = express.Router();

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

router.post('/scan', authenticateToken, async (req, res) => {
  const { tokens, timePeriod } = req.body;  // Get timePeriod from request body
  
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid tokens array provided' 
    });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const scanner = new TokenScanner(3);  // Remove default time period
  
  const progressCallback = (update) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  };

  try {
    progressCallback({
      type: 'started',
      message: `Starting scan of ${tokens.length} tokens with parallel processing`,
      totalTokens: tokens.length,
      timestamp: new Date().toISOString()
    });

    // Pass timePeriod to scanTokens
    const results = await scanner.scanTokens(tokens, progressCallback, timePeriod);
    
    // Find intersections
    const intersections = findIntersections(results);
    
    progressCallback({
      type: 'complete',
      results: intersections,
      summary: {
        totalTokens: tokens.length,
        totalUniqueWallets: results.reduce((sum, r) => sum + r.wallets.length, 0),
        intersectedWallets: intersections.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }
  
  res.end();
});

export default router;