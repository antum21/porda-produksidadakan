import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

// Generate cryptographically signed stateless token for serverless compatibility
function createSignedToken(user: typeof SUPER_ADMIN_PROFILE) {
  const payload = {
    uid: user.uid,
    username: user.username,
    nama: user.nama,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('base64url');
  return `${str}.${sig}`;
}

// Verify signature and expiration
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

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

export const handler = async (event: any) => {
  const path = event.path || '';
  const httpMethod = event.httpMethod || 'GET';
  const cookies = parseCookies(event.headers?.cookie);
  const authHeader = event.headers?.authorization;
  const token =
    cookies['porda_session'] ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined);

  // 1. Session check: GET /api/auth/session
  if (path.endsWith('/session') && httpMethod === 'GET') {
    const userPayload = verifySignedToken(token);
    if (!userPayload) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticated: false, error: 'Tidak ada sesi aktif atau sesi telah kedaluwarsa.' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: true, user: userPayload }),
    };
  }

  // 2. Login: POST /api/auth/login
  if (path.endsWith('/login') && httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { username, password } = body;

      const cleanUser = String(username || '').trim();
      const isUsernameMatch =
        cleanUser.toLowerCase() === INITIAL_SUPER_ADMIN_USERNAME.toLowerCase() ||
        cleanUser.toLowerCase() === 'admin';

      if (!isUsernameMatch) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Username atau kata sandi tidak valid.' }),
        };
      }

      const match = await bcrypt.compare(String(password || ''), superAdminPasswordHash);
      if (!match) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Username atau kata sandi tidak valid.' }),
        };
      }

      const sessionToken = createSignedToken(SUPER_ADMIN_PROFILE);
      const cookieVal = `porda_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieVal,
        },
        body: JSON.stringify({ success: true, token: sessionToken, user: SUPER_ADMIN_PROFILE }),
      };
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Format data login tidak valid.' }),
      };
    }
  }

  // 3. Logout: POST /api/auth/logout
  if (path.endsWith('/logout') && httpMethod === 'POST') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'porda_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      },
      body: JSON.stringify({ success: true, message: 'Berhasil keluar.' }),
    };
  }

  // 4. Change Password: POST /api/auth/change-password
  if (path.endsWith('/change-password') && httpMethod === 'POST') {
    const userPayload = verifySignedToken(token);
    if (!userPayload) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Akses ditolak: Sesi tidak valid.' }),
      };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword || String(newPassword).length < 6) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Password baru minimal harus 6 karakter.' }),
        };
      }

      const isValidCurrent = await bcrypt.compare(String(currentPassword), superAdminPasswordHash);
      if (!isValidCurrent) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Password saat ini salah.' }),
        };
      }

      superAdminPasswordHash = await bcrypt.hash(String(newPassword), 10);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Kata sandi berhasil diperbarui.' }),
      };
    } catch {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Payload tidak valid.' }),
      };
    }
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Endpoint not found.' }),
  };
};
