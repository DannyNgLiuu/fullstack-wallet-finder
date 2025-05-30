import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    console.log('Verifying token...');
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('No authorization header found');
      return res.status(401).json({ message: 'No authorization header' });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization format');
      return res.status(401).json({ message: 'Invalid authorization format' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified for user:', decoded.id);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error in auth middleware' });
  }
};
