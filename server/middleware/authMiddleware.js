import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Cache to store verified users to avoid redundant DB queries on concurrent requests
const userCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

// Periodic cleanup of expired cache entries to prevent memory leaks
let cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of userCache.entries()) {
    if (cached.expiresAt < now) {
      userCache.delete(key);
    }
  }
}, 60 * 1000);

if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref(); // Ensure this timer doesn't keep the process alive in tests
}

// Export for test cache clearing
export const clearAuthCache = () => {
  userCache.clear();
};

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check cache first
    const now = Date.now();
    const cached = userCache.get(decoded.id);

    if (cached && cached.expiresAt > now) {
      req.user = cached.user;
    } else {
      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      // Save to cache
      userCache.set(decoded.id, {
        user,
        expiresAt: now + CACHE_TTL
      });
    }

    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Not authorized' });
  }
};

