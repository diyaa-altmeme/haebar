import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "data_entry"]),
  isActive: z.boolean().default(true)
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "manager", "data_entry"]).optional(),
  isActive: z.boolean().optional()
});

export async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    res.json({ data: users });
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

export async function createUser(req, res) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", details: parsed.error.flatten() });

  const { name, email, password, role, isActive } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive
      }
    });

    res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ message: "Failed to create user: " + e.message });
  }
}

export async function updateUser(req, res) {
  const { id } = req.params;
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input", details: parsed.error.flatten() });

  const data = parsed.data;
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ message: "Failed to update user" });
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  try {
    // Check if user is deleting themselves
    if (req.user.id === id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (e) {
    res.status(500).json({ message: "Failed to delete user" });
  }
}
