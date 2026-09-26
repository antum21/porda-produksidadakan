import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const INITIAL_SUPER_ADMIN_USERNAME = 'Admin123';
const INITIAL_SETUP_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin123';
const superAdminPasswordHash =
  process.env.SUPER_ADMIN_PASSWORD_HASH || bcrypt.hashSync(INITIAL_SETUP_PASSWORD, 10);

const SUPER_ADMIN_PROFILE = {
  uid: 'usr-superadmin-01',
  username: INITIAL_SUPER_ADMIN_USERNAME,
  nama: 'Super Admin PORDA',
  role: 'super_admin',
};

// In-memory sessions (for serverless container lifetime)
const activeSessions = new Map<string, { token: string; user: any; expiresAt: number }>();

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
  const token = cookies['porda_session'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined);

  // 1. Session check: GET /api/auth/session
  if (path.endsWith('/session') && httpMethod === 'GET') {
    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticated: false, error: 'Tidak ada sesi aktif.' }),
      };
    }
    const session = activeSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticated: false, error: 'Sesi kedaluwarsa.' }),
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: true, user: session.user }),
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

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      activeSessions.set(sessionToken, {
        token: sessionToken,
        user: SUPER_ADMIN_PROFILE,
        expiresAt,
      });

      const cookieVal = `porda_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieVal,
        },
        body: JSON.stringify({ success: true, token: sessionToken, user: SUPER_ADMIN_PROFILE }),
      };
    } catch (e: any) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Invalid payload.' }),
      };
    }
  }

  // 3. Logout: POST /api/auth/logout
  if (path.endsWith('/logout') && httpMethod === 'POST') {
    if (token) activeSessions.delete(token);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'porda_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      },
      body: JSON.stringify({ success: true, message: 'Berhasil keluar.' }),
    };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Endpoint not found.' }),
  };
};
