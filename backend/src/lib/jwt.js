import jwt from "jsonwebtoken";

export function signAccessToken(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("Missing JWT_ACCESS_SECRET in environment");
  const ttl = Number(process.env.ACCESS_TOKEN_TTL_SEC || 900);
  return jwt.sign(payload, secret, { expiresIn: ttl });
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("Missing JWT_ACCESS_SECRET in environment");
  return jwt.verify(token, secret);
}

export function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("Missing JWT_REFRESH_SECRET in environment");
  return jwt.verify(token, secret);
}

