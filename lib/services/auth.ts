import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken, sha256Hex } from "@/lib/auth/tokens";

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    throw createAuthError("بيانات الدخول غير صحيحة.", 401);
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    throw createAuthError("بيانات الدخول غير صحيحة.", 401);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  } as const;
}

export async function issueRefreshToken(userId: string) {
  const refreshTokenPlain = createOpaqueToken(32);
  const tokenHash = sha256Hex(refreshTokenPlain);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return refreshTokenPlain;
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = sha256Hex(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw createAuthError("جلسة التحديث غير صالحة أو منتهية.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId }
  });

  if (!user || !user.isActive) {
    throw createAuthError("المستخدم غير متاح.", 401);
  }

  const now = new Date();
  const newRefreshTokenPlain = createOpaqueToken(32);
  const newHash = sha256Hex(newRefreshTokenPlain);
  const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    refreshToken: newRefreshTokenPlain
  };
}

export async function revokeRefreshToken(refreshToken: string | null | undefined) {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: sha256Hex(refreshToken),
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

function createAuthError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
