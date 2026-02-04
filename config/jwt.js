const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'ecologiq-secret-key-2026', {
    expiresIn: '7d',
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'ecologiq-secret-key-2026');
  } catch (error) {
    throw error;
  }
};

// ⭐ ADD THIS MISSING FUNCTION:
const refreshAccessToken = (oldToken) => {
  try {
    const decoded = verifyToken(oldToken);
    return generateAccessToken({
      userId: decoded.userId,
      role: decoded.role,
    });
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = { 
  generateAccessToken, 
  verifyToken, 
  refreshAccessToken  // ⭐ NOW EXPORTED
};
