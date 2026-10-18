import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";

export const testRouter = Router();

const array: UserRole[] = ["Administrator", "Moderator"];

testRouter.get(
  "/test-route",
  requireAuth,
  requireRole(...array),
  (req, res) => {
    return res.status(200).json({
      message: `You're ${array}`,
    });
  },
);
