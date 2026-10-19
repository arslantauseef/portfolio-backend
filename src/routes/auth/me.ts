import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { pool } from "../../database/pool/pool.js";

export const meRouter = Router();

meRouter.get("/me", requireAuth, async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const result = await pool.query(
      `
    SELECT
        id,
        name,
        email,
        role
    FROM users
    WHERE id = $1
    `,
      [req.auth.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Authenticated Successfully.",
      data: result.rows[0],
    });
    
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error.",
    });
  }
});
