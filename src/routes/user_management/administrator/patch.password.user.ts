import { Router } from "express";
import { pool } from "../../../database/pool/pool.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import * as argon from "argon2";

export const changePasswordRouter = Router();

changePasswordRouter.patch(
  "/:id/changepassword",
  requireAuth,
  requireRole("Administrator"),
  async (req, res) => {
    const { id } = req.params;
    const { password } = req.body ?? {};

    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user id.",
      });
    }

    if (typeof id !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Client request is bad.",
      });
    }

    if (id === "" || password.trim() === "") {
      return res.status(400).json({
        message: "Client request is bad.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const fetchOldPassword = await client.query(
        `
        SELECT
        id,
        hashed_password
        FROM users
        WHERE id = $1
        `,
        [userId],
      );

      if (fetchOldPassword.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: "Resource not found",
        });
      }

      const oldHashedPassword = fetchOldPassword.rows[0].hashed_password;

      const passwordMatches = await argon.verify(oldHashedPassword, password);

      if (passwordMatches) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Password was matching.",
        });
      }
      const newHashedPassword = await argon.hash(password);

      const result = await client.query(
        `
        UPDATE users
        SET
        hashed_password = $1,
        updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, email, role, updated_at
        `,
        [newHashedPassword, userId],
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          message: "User not found.",
        });
      }
      await client.query(
        `
        DELETE FROM refresh_token
        WHERE user_id = $1
        `,
        [userId],
      );
      await client.query("COMMIT");

      return res.status(200).json({
        message: "Password has been reset.",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      return res.status(500).json({
        message: "Internal Server Error",
      });
    } finally {
      client.release();
    }
  },
);
