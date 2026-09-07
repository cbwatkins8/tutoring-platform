// Server-side session tokens: real HS256 JWTs, signed and verified.
//
// The previous scheme base64-encoded a JSON blob. Base64 is encoding, not
// signing -- anyone could mint {"role":"tutor"} in a browser console and get
// full access to every student's records. These tokens carry a signature the
// server checks, so a forged or edited payload is rejected.
//
// Uses node's built-in crypto: no new dependency, nothing to npm install.

import crypto from 'crypto';

export interface SessionPayload {
  userId: number;
  email: string;
  role: 'parent' | 'tutor' | 'admin' | 'student';
  version: number;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'civil_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    // Fail loudly rather than silently signing with a weak or absent key.
    throw new Error(
      'JWT_SECRET is missing or too short (needs 32+ chars). ' +
        'Add it to .env.local. Generate one with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
    );
  }

  return secret;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const issuedAt = Math.floor(Date.now() / 1000);

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({ ...payload, iat: issuedAt, exp: issuedAt + ttlSeconds })
  );

  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

/**
 * Returns the payload only if the signature is valid and the token has not
 * expired. Returns null for anything else -- never throws on bad input.
 */
export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;

  let expected: string;
  try {
    expected = sign(`${header}.${body}`);
  } catch {
    // Misconfigured secret: refuse every token rather than accepting any.
    return null;
  }

  const given = Buffer.from(signature);
  const want = Buffer.from(expected);

  // Constant-time compare so the signature can't be guessed byte by byte.
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (
    typeof payload.userId !== 'number' ||
    typeof payload.email !== 'string' ||
    typeof payload.version !== 'number' ||
    !payload.role
  ) return null;

  return payload;
}

/** Pulls and verifies the bearer token from a request's Authorization header. */
export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const encoded = cookies
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.slice(SESSION_COOKIE_NAME.length + 1);

    if (encoded) {
      try {
        const session = verifySessionToken(decodeURIComponent(encoded));
        if (session) return session;
      } catch {
        return null;
      }
    }
  }

  // Compatibility for the local API test suite and non-browser clients.
  // Browser login never exposes the bearer token.
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return verifySessionToken(header.slice(7));
}
