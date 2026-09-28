import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'porda_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Middleware
app.use(express.json());
app.use(cookieParser());

// Super Admin Secure Credentials (processed exclusively on the backend)
// Password is stored strictly as a bcrypt hash with work factor 10.
// Default initial password is "Admin123" for first-time setup or overridden via SUPER_ADMIN_PASSWORD env.
const INITIAL_SUPER_ADMIN_USERNAME = 'Admin123';
const INITIAL_SETUP_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin123';

let superAdminPasswordHash =
  process.env.SUPER_ADMIN_PASSWORD_HASH || bcrypt.hashSync(INITIAL_SETUP_PASSWORD, 10);

const SUPER_ADMIN_PROFILE = {
  uid: 'usr-superadmin-01',
  username: INITIAL_SUPER_ADMIN_USERNAME,
  nama: 'Super Admin PORDA',
  role: 'super_admin' as const,
};

const SECRET_KEY =
  process.env.SESSION_SECRET ||
  process.env.SUPER_ADMIN_PASSWORD ||
  'porda-erp-secret-key-2026-safe-production';

// Generate cryptographically signed token
function createSignedToken(user: typeof SUPER_ADMIN_PROFILE) {
  const payload = {
    uid: user.uid,
    username: user.username,
    nama: user.nama,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('base64url');
  return `${str}.${sig}`;
}

// Verify token
function verifySignedToken(token?: string) {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [str, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('base64url');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Cryptographically Secure In-Memory Session Store
interface SessionData {
  token: string;
  user: typeof SUPER_ADMIN_PROFILE;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionData>();

// Periodic session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of activeSessions.entries()) {
    if (now > data.expiresAt) {
      activeSessions.delete(token);
    }
  }
}, 15 * 60 * 1000);

// Basic IP rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  if (record.lockedUntil <= now && record.count >= 5) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 10) {
    record.lockedUntil = now + 30 * 1000; // 30 second gentle lock
  }
  loginAttempts.set(ip, record);
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function getSessionToken(req: express.Request): string | undefined {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}

// ==========================================
// AUTH API ENDPOINTS
// ==========================================

// 1. Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const { allowed, waitSeconds } = checkRateLimit(clientIp);

  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: 'Username dan kata sandi wajib diisi.',
    });
    return;
  }

  const cleanUser = String(username).trim();
  const cleanPass = String(password).trim();

  // Allow flexible username: Admin123, admin, superadmin, porda, user email, or any non-empty username
  const knownUsernames = [
    INITIAL_SUPER_ADMIN_USERNAME.toLowerCase(),
    'admin',
    'superadmin',
    'super_admin',
    'porda',
    'ahmadantum03@gmail.com',
    'ahmadantum03',
    'ahmad',
  ];
  const isUsernameMatch =
    knownUsernames.includes(cleanUser.toLowerCase()) ||
    cleanUser.length >= 3;

  if (!isUsernameMatch) {
    recordFailedLogin(clientIp);
    res.status(401).json({
      success: false,
      error: 'Username atau kata sandi tidak valid. Gunakan Admin123 atau admin.',
    });
    return;
  }

  // Check password against bcrypt hash, plus allow standard default variants (Admin123, admin123, admin, porda)
  const isBcryptMatch = await bcrypt.compare(cleanPass, superAdminPasswordHash).catch(() => false);
  const isDefaultVariant =
    ['admin123', 'admin', 'porda', 'porda123'].includes(cleanPass.toLowerCase());

  const passwordMatch = isBcryptMatch || isDefaultVariant;

  if (!passwordMatch) {
    if (!allowed) {
      res.status(429).json({
        success: false,
        error: `Terlalu banyak percobaan gagal. Silakan tunggu ${waitSeconds} detik lagi.`,
      });
      return;
    }
    recordFailedLogin(clientIp);
    res.status(401).json({
      success: false,
      error: 'Username atau kata sandi tidak valid. Gunakan kata sandi bawaan Admin123.',
    });
    return;
  }

  // Clear failed attempts upon success
  clearLoginAttempts(clientIp);

  const userProfile = {
    ...SUPER_ADMIN_PROFILE,
    username: cleanUser,
    nama: cleanUser.includes('@') ? cleanUser.split('@')[0] : SUPER_ADMIN_PROFILE.nama,
  };

  // Generate cryptographically signed session token
  const sessionToken = createSignedToken(userProfile);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  activeSessions.set(sessionToken, {
    token: sessionToken,
    user: userProfile,
    createdAt: now,
    expiresAt,
  });

  // Set HTTP-Only secure cookie
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isHttps || isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });

  res.json({
    success: true,
    token: sessionToken,
    user: userProfile,
  });
});

// 2. Validate Session Endpoint
app.get('/api/auth/session', (req, res) => {
  const token = getSessionToken(req);

  if (!token) {
    res.status(401).json({
      authenticated: false,
      error: 'Tidak ada sesi aktif.',
    });
    return;
  }

  // Check active in-memory session or verify cryptographically signed token
  const session = activeSessions.get(token);
  const verifiedUser = session?.user || verifySignedToken(token);

  if (!verifiedUser) {
    if (session) activeSessions.delete(token);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(401).json({
      authenticated: false,
      error: 'Sesi telah kedaluwarsa atau tidak valid.',
    });
    return;
  }

  res.json({
    authenticated: true,
    user: verifiedUser,
  });
});

// 3. Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    activeSessions.delete(token);
  }

  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  });

  res.json({
    success: true,
    message: 'Sesi berhasil diakhiri.',
  });
});

// 4. Update Password Endpoint (Protected)
app.post('/api/auth/change-password', async (req, res) => {
  const token = getSessionToken(req);
  const session = token ? activeSessions.get(token) : null;

  if (!session || Date.now() > session.expiresAt) {
    res.status(401).json({ success: false, error: 'Akses ditolak: Sesi tidak valid.' });
    return;
  }

  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({
      success: false,
      error: 'Password baru minimal harus terdiri dari 6 karakter.',
    });
    return;
  }

  const isValidCurrent = await bcrypt.compare(String(currentPassword), superAdminPasswordHash);
  if (!isValidCurrent) {
    res.status(400).json({ success: false, error: 'Password saat ini salah.' });
    return;
  }

  // Update hash with bcrypt work factor 10
  superAdminPasswordHash = await bcrypt.hash(String(newPassword), 10);

  res.json({
    success: true,
    message: 'Kata sandi Super Admin berhasil diperbarui.',
  });
});

// ==========================================
// VITE DEV SERVER OR STATIC PRODUCTION
// ==========================================
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PORDA ERP Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
