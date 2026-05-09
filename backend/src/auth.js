const jwt = require('jsonwebtoken');
const { query } = require('./db');

const cookieName = 'deals_token';

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, status: user.status },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    shop: user.shop || null
  };
}

async function getUserById(id) {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.role, u.status,
            s.shop_name, s.owner_phone, s.address, s.city, s.latitude, s.longitude, s.google_maps_url,
            s.logo_url, s.cover_url, s.timings, s.monthly_limit
       FROM users u
       LEFT JOIN shop_profiles s ON s.user_id = u.id
      WHERE u.id = ?`,
    [id]
  );
  const user = rows[0];
  if (!user) return null;
  user.shop = user.shop_name
    ? {
        shopName: user.shop_name,
        ownerPhone: user.owner_phone,
        address: user.address,
        city: user.city,
        latitude: user.latitude,
        longitude: user.longitude,
        googleMapsUrl: user.google_maps_url,
        logoUrl: user.logo_url,
        coverUrl: user.cover_url,
        timings: user.timings,
        monthlyLimit: user.monthly_limit
      }
    : null;
  return user;
}

async function authenticate(req, _res, next) {
  const token = req.cookies[cookieName] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = await getUserById(payload.id);
  } catch (_error) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Please sign in first.' });
  if (req.user.status !== 'active') return res.status(403).json({ message: 'Your account is not active.' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Please sign in first.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have access.' });
    if (req.user.status !== 'active') return res.status(403).json({ message: 'Your account is not active.' });
    next();
  };
}

module.exports = { authenticate, cookieName, publicUser, requireAuth, requireRole, signToken };
