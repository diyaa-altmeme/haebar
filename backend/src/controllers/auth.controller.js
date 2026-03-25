import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { createOpaqueToken, sha256Hex } from "../lib/tokens.js";
import { signAccessToken, verifyRefreshToken } from "../lib/jwt.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export async function login(req, res, _next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });

    const refreshTokenPlain = createOpaqueToken(32);
    const tokenHash = sha256Hex(refreshTokenPlain);

    const refreshTtlSec = Number(process.env.REFRESH_TOKEN_TTL_SEC || 2592000);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + refreshTtlSec * 1000);

    // Store only hash in DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    return res.json({
      data: {
        accessToken,
        refreshToken: refreshTokenPlain,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      }
    });
  } catch (e) {
    console.error("Login Error:", e);
    return res.status(500).json({ message: "Login failed: " + e.message });
  }
}

export async function refresh(req, res, _next) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const { refreshToken } = parsed.data;
  // Basic format check (JWT-like token is not mandatory; we validate via DB hash)
  // If user rotated refresh tokens, the previous token should be revoked in DB.
  try {
    try {
      verifyRefreshToken(refreshToken);
    } catch (innerError) {
      console.warn("Refresh token is not valid JWT format or expired, continuing with DB verification (opaque token mode)", innerError.message);
    }

    const tokenHash = sha256Hex(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash }
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      return res.status(401).json({ message: "Invalid/expired refresh token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: stored.userId }
    });
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid credentials" });

    // Rotate refresh token for security
    const refreshTtlSec = Number(process.env.REFRESH_TOKEN_TTL_SEC || 2592000);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + refreshTtlSec * 1000);
    const newRefreshPlain = createOpaqueToken(32);
    const newHash = sha256Hex(newRefreshPlain);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now }
      });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newHash,
          expiresAt: newExpiresAt
        }
      });
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role });

    return res.json({
      accessToken,
      refreshToken: newRefreshPlain
    });
  } catch (_e) {
    return res.status(500).json({ message: "Refresh failed due to server/database error" });
  }
}

export async function logout(req, res, _next) {
  const parsed = z.object({ refreshToken: z.string().min(20).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    const authUser = req.user;
    if (!authUser?.id) {
      // Still allow logout by refresh token without access token.
    }

    if (!parsed.data.refreshToken) {
      return res.status(200).json({ message: "Logged out" });
    }

    const tokenHash = sha256Hex(parsed.data.refreshToken);
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return res.status(200).json({ message: "Logged out" });
  } catch (_e) {
    return res.status(500).json({ message: "Logout failed due to server/database error" });
  }
}

