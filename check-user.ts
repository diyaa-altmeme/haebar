import { prisma } from "./lib/db/prisma";

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@haebar.local" }
    });
    console.log("User found:", user ? "Yes" : "No");
    if (user) {
      console.log("User details:", { id: user.id, email: user.email, isActive: user.isActive });
    }
  } catch (error) {
    console.error("Error checking user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
