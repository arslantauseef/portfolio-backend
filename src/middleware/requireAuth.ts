import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

type AuthPayload = {
  sub: string;
  role: "Administrator" | "Moderator" | "User";
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({
      message: "Token expired",
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      message: "JWT_SECRET is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;

    if (
      typeof decoded.sub !== "string" ||
      !["Administrator", "Moderator", "User"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Token & JWT_SECRETS don't match.",
      });
    }

    req.auth = {
      userId: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or Expired token",
      error: error,
    });
  }
}
