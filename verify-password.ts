import bcrypt from "bcryptjs";
import { prisma } from "./lib/db/prisma";

async function verifyPassword() {
  const email = "admin@haebar.local";
  const password = "Admin12345!";
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log("User not found");
      return;
    }
    
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("Password match:", ok ? "Yes" : "No");
  } catch (error) {
    console.error("Error verifying password:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPassword();
