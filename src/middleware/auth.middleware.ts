import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import dotenv from "dotenv";

dotenv.config();

interface AuthRequest extends Request {
  user?: { userId?: number; companyId?: number; type: "user" | "apikey", role?: "superadmin" | "admin" | "user" | "service" };
}

const JWT_SECRET = process.env.JWT_SECRET || "change_me";

export default async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.header("authorization");
    const apiKeyHeader = req.header("x-api-key");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        // payload deve conter userId, empresaId (opcional), role
        req.user = {
          userId: payload.userId,
          companyId: payload.companyId,
          type: "user",
          role: payload.role || "user"
        };
        return next();
      } catch (err) {
        console.log(err)
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    if (apiKeyHeader) {
      const found = await prisma.apiKey.findUnique({ where: { key: apiKeyHeader } });
      if (!found || !found.active) return res.status(401).json({ error: "Invalid API key" });
      req.user = {
        companyId: found.companyId,
        type: "apikey",
        role: "service"
      };
      return next();
    }
    console.log( 'aquii')
    return res.status(401).json({ error: "Unauthorized" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
