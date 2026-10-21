import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import { pool } from "../../../database/pool/pool.js";

export const patchUsersRouter = Router();

patchUsersRouter.patch(
  "/patchusers/:id",
  requireAuth,
  requireRole("Administrator"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body ?? {};
      const result = await pool.query(
        `
        UPDATE users
        SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        updated_at = NOW()
        WHERE id = $4 
        RETURNING id, name, email, role, updated_at
        `,
        [name, email, role, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      return res.status(200).json({
        message: "User updated successfully.",
        data: result.rows[0],
      });
      
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error.",
      });
    }
  },
);
