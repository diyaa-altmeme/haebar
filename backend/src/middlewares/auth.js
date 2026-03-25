import { z } from "zod";
import { verifyAccessToken } from "../lib/jwt.js";

const authHeaderSchema = z.object({
  authorization: z.string().min(1)
});

export function requireAuth(requiredRoles = []) {
  return async function authMiddleware(req, res, next) {
    try {
      const parsed = authHeaderSchema.safeParse({
        authorization: req.headers.authorization
      });
      if (!parsed.success) return res.status(401).json({ message: "Missing Authorization header" });

      const header = req.headers.authorization;
      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Invalid Authorization format" });
      }

      const decoded = verifyAccessToken(token);
      const user = {
        id: decoded.sub,
        role: decoded.role
      };

      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = user;
      return next();
    } catch (e) {
      return res.status(401).json({ message: "Invalid/expired token" });
    }
  };
}

