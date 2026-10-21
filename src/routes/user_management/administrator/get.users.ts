import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import { pool } from "../../../database/pool/pool.js";

export const getUsersRouter = Router();

getUsersRouter.get(
  "/getusers",
  requireAuth,
  requireRole("Administrator", "Moderator"),
  async (_req, res) => {
    try {
      const fetchUsersRecord = await pool.query(`
            SELECT
                id,
                name,
                email,
                role
            FROM users
            ORDER BY created_at DESC
            `);

      if (fetchUsersRecord.rows.length === 0) {
        return res.status(401).json({
          message: "Database issue",
        });
      }

      return res.status(200).json({
        message: "Retrieved",
        data: fetchUsersRecord.rows,
      });

    } catch (error) {
        return res.status(500).json({
            message: "Internal Server Error..."
        })
    }
  },
);
