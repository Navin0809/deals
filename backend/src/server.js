require('dotenv').config();

const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const { pool, query } = require('./db');
const { authenticate, cookieName, publicUser, requireAuth, requireRole, signToken } = require('./auth');
const { findArea, hyderabadAreas, parseCoordinatesFromMapsUrl, resolveShopLocation } = require('./areas');
const { categorySchema, dealSchema, limitSchema, loginSchema, registerSchema, shopProfileSchema, validate } = require('./validators');

const app = express();
const port = Number(process.env.PORT || 4000);
const monthlyDealLimit = 3;
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-')}`)
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads are allowed.'));
    cb(null, true);
  }
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const frontendOrigin = process.env.FRONTEND_ORIGIN;
app.use(cors({
  origin: frontendOrigin
    ? (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === frontendOrigin) return callback(null, true);
        try {
          const allowedUrl = new URL(frontendOrigin);
          const requestUrl = new URL(origin);
          if (allowedUrl.hostname === 'localhost' && requestUrl.port === allowedUrl.port) {
            return callback(null, true);
          }
        } catch (_error) {
          // ignore invalid origin parsing
        }
        callback(new Error('CORS policy does not allow access from the specified Origin.'));
      }
    : true,
  credentials: true
}));
app.use('/uploads', express.static(uploadDir));
app.use(authenticate);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function ensureSchema() {
  try {
    await query('ALTER TABLE shop_profiles ADD COLUMN area VARCHAR(100) NULL AFTER city');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }
  await query("UPDATE shop_profiles SET city = 'Hyderabad' WHERE city IS NULL OR city = ''");
  await query("UPDATE shop_profiles SET area = 'Jubilee Hills' WHERE area IS NULL OR area = ''");
}

function milesExpression(lat, lng) {
  return `(
    3959 * ACOS(
      LEAST(1, COS(RADIANS(${Number(lat)})) * COS(RADIANS(s.latitude)) *
      COS(RADIANS(s.longitude) - RADIANS(${Number(lng)})) +
      SIN(RADIANS(${Number(lat)})) * SIN(RADIANS(s.latitude)))
    )
  )`;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'deals' }));

app.get('/api/me', (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/locations/areas', (_req, res) => res.json({ areas: hyderabadAreas }));

app.post('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 }), validate(registerSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  if (data.role === 'shop_owner') {
    const required = ['shopName', 'ownerPhone', 'address', 'area'];
    const missing = required.filter((field) => data[field] === undefined || data[field] === '');
    if (missing.length) return res.status(400).json({ message: 'Shop owner registration needs shop and location details.' });
  }

  const hash = await bcrypt.hash(data.password, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const status = data.role === 'shop_owner' ? 'pending' : 'active';
    const [result] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.email.toLowerCase(), hash, data.role, status]
    );
    if (data.role === 'shop_owner') {
      const location = resolveShopLocation({ area: data.area, googleMapsUrl: data.googleMapsUrl });
      await conn.execute(
        `INSERT INTO shop_profiles
         (user_id, shop_name, owner_phone, address, city, area, latitude, longitude, google_maps_url, timings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          data.shopName,
          data.ownerPhone,
          data.address,
          'Hyderabad',
          data.area,
          location.latitude,
          location.longitude,
          data.googleMapsUrl || null,
          null
        ]
      );
    }
    await conn.commit();
    const user = await query('SELECT id, name, email, role, status FROM users WHERE id = ?', [result.insertId]);
    const token = signToken(user[0]);
    res.cookie(cookieName, token, cookieOptions());
    res.status(201).json({ user: publicUser(user[0]) });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That email is already registered.' });
    throw error;
  } finally {
    conn.release();
  }
}));

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), validate(loginSchema), asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM users WHERE email = ?', [req.body.email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const token = signToken(user);
  res.cookie(cookieName, token, cookieOptions());
  res.json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(cookieName, cookieOptions());
  res.json({ ok: true });
});

app.post('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 }), asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase();
  if (!email.includes('@')) return res.status(400).json({ message: 'Enter a valid email.' });
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query(
    'UPDATE users SET reset_token_hash = ?, reset_token_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE email = ?',
    [tokenHash, email]
  );
  res.json({
    ok: true,
    message: 'If that email exists, a reset link will be sent.',
    devResetToken: process.env.NODE_ENV === 'production' ? undefined : token
  });
}));

app.post('/api/auth/reset-password', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10 }), asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) return res.status(400).json({ message: 'Invalid reset request.' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    `UPDATE users
        SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL
      WHERE reset_token_hash = ? AND reset_token_expires_at > NOW()`,
    [hash, tokenHash]
  );
  if (!result.affectedRows) return res.status(400).json({ message: 'Reset link expired or invalid.' });
  res.json({ ok: true });
}));

app.post('/api/auth/verify-email', requireAuth, asyncHandler(async (req, res) => {
  await query('UPDATE users SET email_verified = TRUE WHERE id = ?', [req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/categories', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT id, name, icon FROM categories ORDER BY name');
  res.json({ categories: rows });
}));

app.post('/api/uploads', requireAuth, upload.single('image'), (req, res) => {
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/deals', asyncHandler(async (req, res) => {
  const { categoryId, city, area, lat, lng, best, sort = 'latest', page = 1, limit = 12 } = req.query;
  const conditions = ['d.status = "active"', 'u.status = "active"'];
  const params = [];
  const pageSize = Math.min(Number(limit) || 12, 30);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;
  if (categoryId) {
    conditions.push('d.category_id = ?');
    params.push(Number(categoryId));
  }
  if (city) {
    conditions.push('s.city LIKE ?');
    params.push(`%${city}%`);
  }
  if (area) {
    conditions.push('s.area = ?');
    params.push(area);
  }
  if (best === 'true') conditions.push('d.is_best = TRUE');

  let distanceSql = 'NULL AS distance_miles';
  let having = '';
  if (lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    const distance = milesExpression(lat, lng);
    distanceSql = `${distance} AS distance_miles`;
  }
  const orderBy = {
    latest: 'd.created_at DESC',
    expiring: 'd.deal_expires_at ASC',
    popular: 'd.popularity_score DESC, d.created_at DESC',
    nearby: 'd.is_best DESC, distance_miles IS NULL, distance_miles ASC, d.created_at DESC'
  }[sort] || 'd.is_best DESC, distance_miles IS NULL, distance_miles ASC, d.created_at DESC';

  const rows = await query(
    `SELECT d.id, d.title, d.description, d.coupon_code, d.discount_label, d.regular_price, d.deal_price, d.is_best,
            d.popularity_score, d.deal_expires_at, d.coupon_expires_at, d.shop_timings, d.terms, d.image_url, d.created_at,
            c.id AS category_id, c.name AS category_name, c.icon AS category_icon,
            s.shop_name, s.owner_phone, s.address, s.city, s.area,
            COALESCE(d.latitude, s.latitude) AS latitude,
            COALESCE(d.longitude, s.longitude) AS longitude,
            COALESCE(d.google_maps_url, s.google_maps_url) AS google_maps_url,
            ${distanceSql}
       FROM deals d
       JOIN users u ON u.id = d.shop_owner_id
       JOIN shop_profiles s ON s.user_id = u.id
       JOIN categories c ON c.id = d.category_id
      WHERE ${conditions.join(' AND ')}
      ${having}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json({ deals: rows, page: Number(page), hasMore: rows.length === pageSize });
}));

app.post('/api/deals/:id/redeem', requireAuth, asyncHandler(async (req, res) => {
  const rows = await query('SELECT coupon_code FROM deals WHERE id = ? AND status = "active"', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Deal not found.' });
  await query(
    'INSERT INTO redemptions (deal_id, user_id, redeemed_code, ip_address) VALUES (?, ?, ?, ?)',
    [req.params.id, req.user.id, rows[0].coupon_code, req.ip]
  );
  await query('UPDATE deals SET popularity_score = popularity_score + 1 WHERE id = ?', [req.params.id]);
  res.status(201).json({ ok: true });
}));

app.get('/api/owner/deals', requireRole('shop_owner'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT d.*, c.name AS category_name
       FROM deals d
       JOIN categories c ON c.id = d.category_id
      WHERE d.shop_owner_id = ?
      ORDER BY d.created_at DESC`,
    [req.user.id]
  );
  const [{ postedThisMonth }] = await query(
    `SELECT COUNT(*) AS postedThisMonth
       FROM deals
      WHERE shop_owner_id = ?
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND MONTH(created_at) = MONTH(CURRENT_DATE())`,
    [req.user.id]
  );
  const [shop] = await query('SELECT shop_name, owner_phone, address, city, area, latitude, longitude, google_maps_url, timings, monthly_limit FROM shop_profiles WHERE user_id = ?', [req.user.id]);
  res.json({ deals: rows, shop, postedThisMonth, monthlyLimit: shop?.monthly_limit ?? monthlyDealLimit });
}));

app.patch('/api/owner/shop', requireRole('shop_owner'), validate(shopProfileSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const location = resolveShopLocation({ area: data.area, googleMapsUrl: data.googleMapsUrl });
  await query(
    `UPDATE shop_profiles
        SET shop_name = ?, owner_phone = ?, address = ?, city = 'Hyderabad', area = ?,
            latitude = ?, longitude = ?, google_maps_url = ?, timings = ?
      WHERE user_id = ?`,
    [
      data.shopName,
      data.ownerPhone,
      data.address,
      data.area,
      location.latitude,
      location.longitude,
      data.googleMapsUrl || null,
      data.timings || null,
      req.user.id
    ]
  );
  res.json({ ok: true });
}));

app.post('/api/owner/deals', requireRole('shop_owner'), validate(dealSchema), asyncHandler(async (req, res) => {
  const [{ count }] = await query(
    `SELECT COUNT(*) AS count
       FROM deals
      WHERE shop_owner_id = ?
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
        AND MONTH(created_at) = MONTH(CURRENT_DATE())`,
    [req.user.id]
  );
  const [{ monthly_limit: ownerLimit }] = await query('SELECT monthly_limit FROM shop_profiles WHERE user_id = ?', [req.user.id]);
  const allowedLimit = ownerLimit ?? monthlyDealLimit;
  if (count >= allowedLimit) {
    return res.status(429).json({ message: `Free shop owners can post ${allowedLimit} deals per month.` });
  }

  const data = req.body;
  const expiresAt = data.dealExpiresAt || defaultDealExpiry();
  const [shop] = await query('SELECT latitude, longitude, google_maps_url FROM shop_profiles WHERE user_id = ?', [req.user.id]);
  const dealLocation = parseCoordinatesFromMapsUrl(data.googleMapsUrl) || {
    latitude: data.latitude ?? shop.latitude,
    longitude: data.longitude ?? shop.longitude
  };
  const result = await query(
    `INSERT INTO deals
     (shop_owner_id, category_id, title, description, coupon_code, discount_label, regular_price, deal_price, is_best,
      deal_expires_at, coupon_expires_at, shop_timings, latitude, longitude, google_maps_url, terms, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      data.categoryId,
      data.title,
      data.description,
      data.couponCode,
      data.discountLabel || null,
      data.regularPrice ?? null,
      data.dealPrice ?? null,
      data.isBest,
      toMysqlDate(expiresAt),
      toMysqlDate(data.couponExpiresAt || expiresAt),
      data.shopTimings || null,
      dealLocation.latitude,
      dealLocation.longitude,
      data.googleMapsUrl || shop.google_maps_url || null,
      data.terms || null,
      data.imageUrl || null
    ]
  );
  res.status(201).json({ id: result.insertId });
}));

app.put('/api/owner/deals/:id', requireRole('shop_owner'), validate(dealSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  const expiresAt = data.dealExpiresAt || defaultDealExpiry();
  const [shop] = await query('SELECT latitude, longitude, google_maps_url FROM shop_profiles WHERE user_id = ?', [req.user.id]);
  const dealLocation = parseCoordinatesFromMapsUrl(data.googleMapsUrl) || {
    latitude: data.latitude ?? shop.latitude,
    longitude: data.longitude ?? shop.longitude
  };
  const result = await query(
    `UPDATE deals
        SET category_id = ?, title = ?, description = ?, coupon_code = ?, discount_label = ?,
            regular_price = ?, deal_price = ?, is_best = ?, deal_expires_at = ?,
            coupon_expires_at = ?, shop_timings = ?, latitude = ?, longitude = ?,
            google_maps_url = ?, terms = ?, image_url = ?, status = 'active'
      WHERE id = ? AND shop_owner_id = ?`,
    [
      data.categoryId,
      data.title,
      data.description,
      data.couponCode,
      data.discountLabel || null,
      data.regularPrice ?? null,
      data.dealPrice ?? null,
      data.isBest,
      toMysqlDate(expiresAt),
      toMysqlDate(data.couponExpiresAt || expiresAt),
      data.shopTimings || null,
      dealLocation.latitude,
      dealLocation.longitude,
      data.googleMapsUrl || shop.google_maps_url || null,
      data.terms || null,
      data.imageUrl || null,
      req.params.id,
      req.user.id
    ]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Deal not found.' });
  res.json({ ok: true });
}));

app.delete('/api/owner/deals/:id', requireRole('shop_owner'), asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM deals WHERE id = ? AND shop_owner_id = ?', [req.params.id, req.user.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Deal not found.' });
  res.json({ ok: true });
}));

app.patch('/api/owner/deals/:id/status', requireRole('shop_owner'), asyncHandler(async (req, res) => {
  const status = ['active', 'draft', 'expired'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: 'Invalid status.' });
  await query('UPDATE deals SET status = ? WHERE id = ? AND shop_owner_id = ?', [status, req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/analytics', requireRole('admin'), asyncHandler(async (_req, res) => {
  const users = await query('SELECT role, status, COUNT(*) AS total FROM users GROUP BY role, status');
  const dealStats = await query('SELECT status, COUNT(*) AS total FROM deals GROUP BY status');
  const [redemptions] = await query('SELECT COUNT(*) AS total FROM redemptions');
  const topCategories = await query(
    `SELECT c.name, COUNT(d.id) AS total
       FROM categories c
       LEFT JOIN deals d ON d.category_id = c.id
      GROUP BY c.id
      ORDER BY total DESC
      LIMIT 8`
  );
  res.json({ users, dealStats, redemptions: redemptions.total, topCategories });
}));

app.get('/api/admin/users', requireRole('admin'), asyncHandler(async (_req, res) => {
  const rows = await query('SELECT id, name, email, role, status, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 300');
  res.json({ users: rows });
}));

app.patch('/api/admin/users/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const status = ['pending', 'active', 'suspended'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: 'Invalid status.' });
  await query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/shop-owners', requireRole('admin'), asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.status, u.created_at,
            s.shop_name, s.owner_phone, s.address, s.city, s.area, s.latitude, s.longitude, s.google_maps_url, s.monthly_limit,
            COUNT(d.id) AS deal_count
       FROM users u
       LEFT JOIN shop_profiles s ON s.user_id = u.id
       LEFT JOIN deals d ON d.shop_owner_id = u.id
      WHERE u.role = 'shop_owner'
      GROUP BY u.id
      ORDER BY FIELD(u.status, 'pending', 'active', 'suspended'), u.created_at DESC`
  );
  res.json({ shopOwners: rows });
}));

app.patch('/api/admin/shop-owners/:id/limit', requireRole('admin'), validate(limitSchema), asyncHandler(async (req, res) => {
  await query('UPDATE shop_profiles SET monthly_limit = ? WHERE user_id = ?', [req.body.monthlyLimit, req.params.id]);
  res.json({ ok: true });
}));

app.patch('/api/admin/shop-owners/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const status = ['pending', 'active', 'suspended'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: 'Invalid status.' });
  await query('UPDATE users SET status = ? WHERE id = ? AND role = "shop_owner"', [status, req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/deals', requireRole('admin'), asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT d.id, d.title, d.coupon_code, d.status, d.is_best, d.created_at, c.name AS category_name,
            u.name AS owner_name, u.email AS owner_email, s.shop_name, s.city
       FROM deals d
       JOIN users u ON u.id = d.shop_owner_id
       JOIN shop_profiles s ON s.user_id = u.id
       JOIN categories c ON c.id = d.category_id
      ORDER BY d.created_at DESC
      LIMIT 200`
  );
  res.json({ deals: rows });
}));

app.patch('/api/admin/deals/:id/status', requireRole('admin'), asyncHandler(async (req, res) => {
  const status = ['active', 'draft', 'expired', 'blocked'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: 'Invalid status.' });
  await query('UPDATE deals SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ ok: true });
}));

app.post('/api/admin/categories', requireRole('admin'), validate(categorySchema), asyncHandler(async (req, res) => {
  const result = await query('INSERT INTO categories (name, icon) VALUES (?, ?)', [req.body.name, req.body.icon]);
  res.status(201).json({ id: result.insertId });
}));

app.patch('/api/admin/categories/:id', requireRole('admin'), validate(categorySchema), asyncHandler(async (req, res) => {
  await query('UPDATE categories SET name = ?, icon = ? WHERE id = ?', [req.body.name, req.body.icon, req.params.id]);
  res.json({ ok: true });
}));

app.delete('/api/admin/categories/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function toMysqlDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function defaultDealExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`deals API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to prepare database schema', error);
    process.exit(1);
  });
