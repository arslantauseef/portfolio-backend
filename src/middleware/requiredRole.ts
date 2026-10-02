import type { Request, Response, NextFunction } from "express";
import type { AdminRole, AuthenticateRequest } from "./requiredAuth.js";

export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticateRequest;

    if (!authReq.auth) {
      res.status(401).json({ message: "Authentication is required." });
      return;
    }

    if (!allowedRoles.includes(authReq.auth.role)) {
      res.status(403).json({ message: "You do not have permission." });
      return;
    }

    next();
  };
}