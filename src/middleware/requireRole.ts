import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";


export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Authentication Required.",
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};
