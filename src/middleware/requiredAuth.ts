import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AdminRole = "Administrator" | "Moderator";
export type AuthenticateRequest = Request & {
  auth: {
    adminId: string;
    role: AdminRole;
  };
};

export function requiredAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticateRequest;
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  const bearerToken = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;

  const token = bearerToken ?? cookieToken;

  if (!token) {
    res.status(401).json({
      message: "Authentication token is required.",
    });
    return;
  }
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(401).json({
      message: "Authentication is not configured.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      (decoded.role !== "Administrator" && decoded.role !== "Moderator")
    ) {
      res.status(401).json({
        message: "Invalid authentication token.",
      });
      return;
    }
    authReq.auth = {
      adminId: decoded.sub,
      role: decoded.role,
    };
    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}
