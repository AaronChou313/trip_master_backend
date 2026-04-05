const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tripmaster_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (error, user) => {
    if (error) {
      console.error('JWT verification failed:', error);
      return res.status(403).json({ error: 'Invalid access token' });
    }

    req.user = user;
    return next();
  });
}

module.exports = {
  authenticateToken
};
