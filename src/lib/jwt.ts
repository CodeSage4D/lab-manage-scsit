import { createHmac, timingSafeEqual } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "scsit-suas-labos-super-secret-key-2026";

export interface SessionUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  designation: string; // User designation (e.g. IT Admin, Lab Assistant)
  role: string;        // Map user design to roles: Director Admin, IT Admin, Lab Assistant
}

/**
 * Generate a cryptographically signed session token.
 */
export function signToken(payload: SessionUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
    })
  ).toString("base64url");

  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a signed session token. Returns the payload or null if invalid or expired.
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");

    // Timing-safe comparison to prevent side-channel timing analysis attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Token has expired
    }
    return payload as SessionUser;
  } catch (e) {
    return null;
  }
}
