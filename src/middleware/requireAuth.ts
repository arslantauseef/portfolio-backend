import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

type AuthPayload = {
  id: string;
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
    return res.status(401).json({
      message: "JWT_SECRET is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;

    if (
      decoded.id !== "string" ||
      !["Administrator", "Moderator", "User"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Token & JWT_SECRETS don't match.",
      });
    }

    req.auth = {
      userId: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.warn("Internal server error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
}
